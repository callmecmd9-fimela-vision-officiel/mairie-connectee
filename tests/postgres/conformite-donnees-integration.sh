#!/usr/bin/env bash
# Conformité données personnelles : isolation entre communes (consentements, export), suppression / anonymisation, purge.
set -euo pipefail
: "${PGHOST:?}" "${PGPORT:?}" "${PGUSER:?}" "${PGPASSWORD:?}" "${PGDATABASE:?}"
export PGSSLMODE=disable
psql -X -v ON_ERROR_STOP=1 <<'SQL'
do $roles$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end
$roles$;
drop schema if exists public cascade; drop schema if exists private cascade; drop schema if exists auth cascade;
create schema public; create schema private; create schema auth;
grant usage on schema public, private, auth to anon, authenticated;

create table auth.users(id uuid primary key, email text, phone text, created_at timestamptz not null default now());
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
grant execute on function auth.jwt(), auth.uid() to anon, authenticated;

create table public.communes(id uuid primary key, slug text unique not null);
create table public.profiles(id uuid primary key, role text not null, commune_id uuid, actif boolean not null default true);
create function private.my_commune() returns uuid language sql stable security definer set search_path = ''
  as $$ select p.commune_id from public.profiles p where p.id = (select auth.uid()) and coalesce(p.actif, true) $$;
create function private.my_role() returns text language sql stable security definer set search_path = ''
  as $$ select p.role::text from public.profiles p where p.id = (select auth.uid()) and coalesce(p.actif, true) $$;
grant execute on function private.my_commune(), private.my_role() to authenticated;

create table public.citoyens(user_id uuid primary key references auth.users(id) on delete cascade, nom text, prenom text, village text);
create table public.citoyen_notifications(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  commune_id uuid references public.communes(id) on delete cascade, demande_id uuid, titre text not null, corps text, lu boolean not null default false,
  created_at timestamptz not null default now());
create table public.demandes(id uuid primary key default gen_random_uuid(), commune_id uuid not null references public.communes(id), numero text not null,
  num_suivi text, type text, nom text not null, message text, objet text, contact text, pieces text[] not null default '{}', statut text not null default 'nouvelle',
  citoyen_id uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz);
create table public.suivi_tokens(id uuid primary key default gen_random_uuid(), demande_id uuid not null references public.demandes(id) on delete cascade, telephone_hash text not null);
grant select on public.demandes, public.citoyens, public.citoyen_notifications to authenticated;
SQL

# La migration est rejouée deux fois : elle doit être idempotente.
psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/20261211000100_conformite_donnees_personnelles.sql
psql -X -v ON_ERROR_STOP=1 -q -f supabase/migrations/20261211000100_conformite_donnees_personnelles.sql

psql -X -v ON_ERROR_STOP=1 <<'SQL'
insert into public.communes(id, slug) values ('aaaaaaaa-0000-4000-8000-00000000000a', 'com-a'), ('bbbbbbbb-0000-4000-8000-00000000000b', 'com-b');
insert into auth.users(id, email, phone) values
 ('a1a1a1a1-0000-4000-8000-000000000001', 'a1@example.test', '+221770000001'),
 ('a2a2a2a2-0000-4000-8000-000000000002', 'a2@example.test', '+221770000002'),
 ('b1b1b1b1-0000-4000-8000-000000000003', 'b1@example.test', '+221770000003'),
 ('ae0e0e0e-0000-4000-8000-000000000004', 'maire-a@example.test', null),
 ('be0e0e0e-0000-4000-8000-000000000005', 'maire-b@example.test', null);
insert into public.profiles(id, role, commune_id) values
 ('ae0e0e0e-0000-4000-8000-000000000004', 'maire', 'aaaaaaaa-0000-4000-8000-00000000000a'),
 ('be0e0e0e-0000-4000-8000-000000000005', 'maire', 'bbbbbbbb-0000-4000-8000-00000000000b');
insert into public.citoyens(user_id, nom, prenom) values ('a1a1a1a1-0000-4000-8000-000000000001', 'Diop', 'Awa'), ('b1b1b1b1-0000-4000-8000-000000000003', 'Fall', 'Omar');
insert into public.demandes(id, commune_id, numero, num_suivi, nom, contact, pieces, statut, citoyen_id, message, created_at, updated_at) values
 ('d0000001-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'A-001', 'FIM-2026-000001', 'Awa Diop', '771111111', '{a/p1.pdf}', 'cloturee', 'a1a1a1a1-0000-4000-8000-000000000001', 'm1', now(), now()),
 ('d0000002-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-00000000000a', 'A-002', 'FIM-2026-000002', 'Awa Diop', '771111111', '{a/p2.pdf}', 'en_cours', 'a1a1a1a1-0000-4000-8000-000000000001', 'm2', now(), now()),
 ('d0000003-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-00000000000a', 'A-003', 'FIM-2026-000003', 'Autre A', '772222222', '{}', 'cloturee', 'a2a2a2a2-0000-4000-8000-000000000002', 'm3', now(), now()),
 ('d0000004-0000-4000-8000-000000000004', 'bbbbbbbb-0000-4000-8000-00000000000b', 'B-001', 'FIM-2026-000004', 'Omar Fall', '773333333', '{b/p1.pdf}', 'cloturee', 'b1b1b1b1-0000-4000-8000-000000000003', 'm4', now(), now());
insert into public.suivi_tokens(demande_id, telephone_hash) values
 ('d0000001-0000-4000-8000-000000000001', repeat('a', 64)), ('d0000002-0000-4000-8000-000000000002', repeat('b', 64)), ('d0000004-0000-4000-8000-000000000004', repeat('c', 64));
insert into public.citoyen_notifications(user_id, commune_id, titre) values
 ('a1a1a1a1-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'N-A1'),
 ('b1b1b1b1-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-00000000000b', 'N-B1');

-- Chaque citoyen enregistre un consentement dans SA commune.
select set_config('request.jwt.claims', '{"sub":"a1a1a1a1-0000-4000-8000-000000000001","role":"authenticated"}', false);
set role authenticated;
select public.enregistrer_consentement('com-a', 'depot_demande', 'v1', true);
select public.enregistrer_consentement('com-a', 'depot_demande', 'v1', false);
do $$ begin
  begin perform public.enregistrer_consentement('com-inconnue', 'depot_demande', 'v1', true); raise exception 'commune inconnue acceptée';
  exception when sqlstate '22023' then null; end;
  begin insert into public.consentements(commune_id, user_id, finalite, version_texte, accorde) values ('aaaaaaaa-0000-4000-8000-00000000000a', auth.uid(), 'x', 'v1', true); raise exception 'insertion directe autorisée';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims', '{"sub":"b1b1b1b1-0000-4000-8000-000000000003","role":"authenticated"}', false);
set role authenticated;
select public.enregistrer_consentement('com-b', 'depot_demande', 'v1', true);
reset role;
select set_config('request.jwt.claims', '{"sub":"a2a2a2a2-0000-4000-8000-000000000002","role":"authenticated"}', false);
set role authenticated;
select public.enregistrer_consentement('com-a', 'depot_demande', 'v1', true);
reset role;

-- ISOLATION : un citoyen ne voit que ses consentements ; le maire d'une commune ne voit que ceux de sa commune.
do $$
declare n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"a1a1a1a1-0000-4000-8000-000000000001","role":"authenticated"}', false);
  set local role authenticated;
  select count(*) into n from public.consentements; if n <> 2 then raise exception 'citoyen A1 : % consentements visibles (attendu 2)', n; end if;
  select count(*) into n from public.consentements where user_id <> auth.uid(); if n <> 0 then raise exception 'FUITE : consentement d''un autre utilisateur'; end if;
  reset role;

  perform set_config('request.jwt.claims', '{"sub":"ae0e0e0e-0000-4000-8000-000000000004","role":"authenticated"}', false);
  set local role authenticated;
  select count(*) into n from public.consentements where commune_id = 'aaaaaaaa-0000-4000-8000-00000000000a'; if n <> 3 then raise exception 'maire A : % consentements de sa commune (attendu 3)', n; end if;
  select count(*) into n from public.consentements where commune_id <> 'aaaaaaaa-0000-4000-8000-00000000000a'; if n <> 0 then raise exception 'FUITE inter-communes : le maire A voit % consentements d''une autre commune', n; end if;
  reset role;

  perform set_config('request.jwt.claims', '{"sub":"be0e0e0e-0000-4000-8000-000000000005","role":"authenticated"}', false);
  set local role authenticated;
  select count(*) into n from public.consentements; if n <> 1 then raise exception 'maire B : % consentements (attendu 1)', n; end if;
  reset role;

  -- Sans identité (anon) : aucun accès.
  perform set_config('request.jwt.claims', '{"role":"anon"}', false);
  set local role anon;
  begin perform 1 from public.consentements; raise exception 'FUITE : anon lit consentements'; exception when insufficient_privilege then null; end;
  reset role;
end $$;

-- durees_conservation : lecture seule pour l'API.
do $$
declare n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"a1a1a1a1-0000-4000-8000-000000000001","role":"authenticated"}', false);
  set local role authenticated;
  select count(*) into n from public.durees_conservation; if n < 3 then raise exception 'durees_conservation illisible'; end if;
  begin insert into public.durees_conservation values ('x', 1); raise exception 'écriture durees_conservation autorisée'; exception when insufficient_privilege then null; end;
  reset role;
end $$;

-- Export : uniquement les données du compte appelant.
do $$
declare j jsonb;
begin
  perform set_config('request.jwt.claims', '{"sub":"a1a1a1a1-0000-4000-8000-000000000001","role":"authenticated"}', false);
  set local role authenticated;
  j := public.exporter_mes_donnees();
  if jsonb_array_length(j -> 'demandes') <> 2 then raise exception 'export demandes : %', jsonb_array_length(j -> 'demandes'); end if;
  if jsonb_array_length(j -> 'notifications') <> 1 or j -> 'notifications' -> 0 ->> 'titre' <> 'N-A1' then raise exception 'export notifications'; end if;
  if j -> 'profil' ->> 'email' <> 'a1@example.test' or j -> 'profil' ->> 'nom' <> 'Diop' then raise exception 'export profil'; end if;
  if j::text like '%Omar%' or j::text like '%B-001%' or j::text like '%773333333%' then raise exception 'FUITE export : données d''un autre compte'; end if;
  reset role;
  -- Session anonyme refusée.
  perform set_config('request.jwt.claims', '{"sub":"a1a1a1a1-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":true}', false);
  set local role authenticated;
  begin perform public.exporter_mes_donnees(); raise exception 'export autorisé en session anonyme'; exception when insufficient_privilege then null; end;
  begin perform public.supprimer_mes_donnees(); raise exception 'suppression autorisée en session anonyme'; exception when insufficient_privilege then null; end;
  reset role;
end $$;

-- Suppression : anonymise les demandes clôturées, conserve numéros et statuts, supprime le compte ; ne touche ni A2 ni la commune B.
do $$
declare j jsonb; r record;
begin
  perform set_config('request.jwt.claims', '{"sub":"a1a1a1a1-0000-4000-8000-000000000001","role":"authenticated"}', false);
  set local role authenticated;
  j := public.supprimer_mes_donnees();
  reset role;
  if (j ->> 'demandes_anonymisees')::int <> 1 or (j ->> 'demandes_conservees_en_cours')::int <> 1 then raise exception 'résumé suppression : %', j; end if;
  select * into r from public.demandes where numero = 'A-001';
  if r.nom <> 'Anonymisé' or r.contact is not null or cardinality(r.pieces) <> 0 or r.citoyen_id is not null or r.statut <> 'cloturee' or r.num_suivi <> 'FIM-2026-000001' then raise exception 'A-001 mal anonymisée'; end if;
  select * into r from public.demandes where numero = 'A-002';
  if r.statut <> 'en_cours' or r.citoyen_id is not null or r.nom <> 'Awa Diop' then raise exception 'A-002 (en cours) mal conservée'; end if;
  if exists (select 1 from auth.users where id = 'a1a1a1a1-0000-4000-8000-000000000001') then raise exception 'compte non supprimé'; end if;
  if exists (select 1 from public.citoyens where user_id = 'a1a1a1a1-0000-4000-8000-000000000001') or exists (select 1 from public.citoyen_notifications where titre = 'N-A1')
     or exists (select 1 from public.consentements where user_id = 'a1a1a1a1-0000-4000-8000-000000000001') then raise exception 'données du compte non supprimées'; end if;
  if (select count(*) from public.consentements where user_id is null and commune_id = 'aaaaaaaa-0000-4000-8000-00000000000a') <> 2 then raise exception 'preuve de consentement non conservée sans identité'; end if;
  if exists (select 1 from public.suivi_tokens where demande_id = 'd0000001-0000-4000-8000-000000000001') then raise exception 'jeton de suivi de la demande clôturée conservé'; end if;
  select * into r from public.demandes where numero = 'A-003'; if r.nom <> 'Autre A' or r.contact is null then raise exception 'A-003 (autre citoyen) modifiée'; end if;
  select * into r from public.demandes where numero = 'B-001'; if r.nom <> 'Omar Fall' or r.contact is null or r.citoyen_id is null then raise exception 'B-001 (autre commune) modifiée'; end if;
end $$;

-- Purge : seule une demande clôturée plus ancienne que la durée est anonymisée ; notifications et consentements expirés supprimés.
update public.demandes set updated_at = now() - interval '61 months' where numero in ('A-003');
update public.demandes set updated_at = now() - interval '61 months', statut = 'en_cours' where numero = 'A-002';
insert into public.citoyen_notifications(user_id, commune_id, titre, created_at) values ('b1b1b1b1-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-00000000000b', 'N-vieille', now() - interval '13 months');
do $$
declare j jsonb; r record;
begin
  j := private.purge_donnees_expirees();
  select * into r from public.demandes where numero = 'A-003'; if r.nom <> 'Anonymisé' or r.contact is not null then raise exception 'purge : A-003 non anonymisée'; end if;
  select * into r from public.demandes where numero = 'A-002'; if r.nom = 'Anonymisé' then raise exception 'purge : demande en cours anonymisée'; end if;
  select * into r from public.demandes where numero = 'B-001'; if r.nom = 'Anonymisé' then raise exception 'purge : demande récente anonymisée'; end if;
  if exists (select 1 from public.citoyen_notifications where titre = 'N-vieille') or not exists (select 1 from public.citoyen_notifications where titre = 'N-B1') then raise exception 'purge notifications'; end if;
  if (private.purge_donnees_expirees() ->> 'demandes_anonymisees')::int <> 0 then raise exception 'purge non idempotente'; end if;
end $$;
select 'PASS: conformité données personnelles (isolation communes, export, suppression, purge)' as resultat;
SQL
