-- LOT 11 : Gouvernance municipale (sessions du Conseil, présences, votes, traçabilité des délibérations et actes)
-- Vérification faite sur le catalogue de production (docs/database/PRODUCTION_SCHEMA_CATALOG_2026-11-19.json) :
--   * deliberations, sessions_conseil et actes EXISTENT : elles ne sont pas recréées, seulement complétées (ADD COLUMN IF NOT EXISTS).
--   * conseillers (id, commune_id, prenom, nom, fonction, contact, actif) EXISTE déjà et joue le rôle de « conseillers_municipaux » ;
--     session_presences (session_id, conseiller_id, present) EXISTE déjà et joue le rôle de « presences_sessions ».
--     Créer des doublons scinderait les données utilisées par l'application (js/core.js, js/actions.js) : on complète donc
--     ces deux tables (colonnes statut et statut_presence) au lieu de créer conseillers_municipaux et presences_sessions.
--   * Colonnes déjà présentes, donc non rajoutées : deliberations.transmise_le, actes.date_transmission, sessions_conseil.transmission_le.
--   * Seule table réellement manquante : votes_deliberations (créée ci-dessous).
-- Isolation : chaque commune ne voit et ne modifie que ses propres données (private.my_commune()).
-- Migration idempotente : peut être rejouée sans erreur.

-- 1) Clés composites (id, commune_id) : permettent de garantir par clé étrangère qu'un vote ne relie
--    qu'une délibération et un conseiller de la MÊME commune. id étant déjà clé primaire, aucune donnée n'est rejetée.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'deliberations_id_commune_uq' and conrelid = 'public.deliberations'::regclass) then
    alter table public.deliberations add constraint deliberations_id_commune_uq unique (id, commune_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'conseillers_id_commune_uq' and conrelid = 'public.conseillers'::regclass) then
    alter table public.conseillers add constraint conseillers_id_commune_uq unique (id, commune_id);
  end if;
end $$;

-- 2) Conseillers municipaux : statut du mandat (table existante public.conseillers)
alter table public.conseillers
  add column if not exists statut text not null default 'titulaire';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'conseillers_statut_chk' and conrelid = 'public.conseillers'::regclass) then
    alter table public.conseillers add constraint conseillers_statut_chk
      check (statut in ('titulaire','suppleant','demissionnaire','ancien'));
  end if;
end $$;

-- Les conseillers déjà désactivés (actif = false) deviennent « ancien »
update public.conseillers set statut = 'ancien' where actif = false and statut = 'titulaire';

-- 3) Présences aux sessions : statut détaillé (table existante public.session_presences, qui garde son booléen present)
alter table public.session_presences
  add column if not exists statut_presence text;

update public.session_presences
   set statut_presence = case when present then 'present' else 'absent' end
 where statut_presence is null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'session_presences_statut_presence_chk' and conrelid = 'public.session_presences'::regclass) then
    alter table public.session_presences add constraint session_presences_statut_presence_chk
      check (statut_presence in ('present','absent','excuse','procuration'));
  end if;
end $$;

-- Cohérence entre l'ancien booléen present (écrit par l'application actuelle) et le nouveau statut_presence :
-- une écriture sur l'un met l'autre à jour (present = true uniquement si statut_presence = 'present').
create or replace function private.session_presences_sync() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.statut_presence is null then
    new.statut_presence := case when new.present then 'present' else 'absent' end;
  elsif tg_op = 'INSERT' or new.statut_presence is distinct from old.statut_presence then
    new.present := (new.statut_presence = 'present');
  elsif new.present is distinct from old.present then
    new.statut_presence := case when new.present then 'present' else 'absent' end;
  end if;
  return new;
end $$;

drop trigger if exists sync_statut_presence on public.session_presences;
create trigger sync_statut_presence before insert or update on public.session_presences
  for each row execute function private.session_presences_sync();

-- 4) Votes des conseillers sur les délibérations (nouvelle table)
create table if not exists public.votes_deliberations(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null default private.my_commune() references public.communes(id) on delete cascade,
  deliberation_id uuid not null,
  conseiller_id uuid not null,
  vote text not null check (vote in ('pour','contre','abstention')),
  date_vote timestamptz not null default now(),
  unique (deliberation_id, conseiller_id),
  foreign key (deliberation_id, commune_id) references public.deliberations(id, commune_id) on delete cascade,
  foreign key (conseiller_id, commune_id) references public.conseillers(id, commune_id)
);

create index if not exists votes_deliberations_commune_idx on public.votes_deliberations(commune_id);
create index if not exists votes_deliberations_conseiller_idx on public.votes_deliberations(conseiller_id);

-- 5) Traçabilité sur les tables existantes
alter table public.deliberations
  add column if not exists publiee_le date,
  add column if not exists rendue_executoire_le date,
  add column if not exists statut_execution text;

alter table public.actes
  add column if not exists publie_le date,
  add column if not exists statut_execution text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'deliberations_statut_execution_chk' and conrelid = 'public.deliberations'::regclass) then
    alter table public.deliberations add constraint deliberations_statut_execution_chk
      check (statut_execution is null or statut_execution in ('a_executer','en_cours','executee','suspendue','annulee'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'actes_statut_execution_chk' and conrelid = 'public.actes'::regclass) then
    alter table public.actes add constraint actes_statut_execution_chk
      check (statut_execution is null or statut_execution in ('a_executer','en_cours','executee','suspendue','annulee'));
  end if;
end $$;

-- 6) RLS de votes_deliberations (mêmes rôles que deliberations : maire, cabinet, secrétariat ; adjoint en lecture)
alter table public.votes_deliberations enable row level security;
revoke all on public.votes_deliberations from anon;

drop policy if exists votes_deliberations_lecture on public.votes_deliberations;
create policy votes_deliberations_lecture on public.votes_deliberations for select to authenticated
  using (
    ((select private.can('{maire,cabinet,secretariat}'::text[])) or (select private.my_role()) = 'adjoint')
    and commune_id = (select private.my_commune())
  );

drop policy if exists votes_deliberations_creation on public.votes_deliberations;
create policy votes_deliberations_creation on public.votes_deliberations for insert to authenticated
  with check ((select private.can('{maire,cabinet,secretariat}'::text[])) and commune_id = (select private.my_commune()));

drop policy if exists votes_deliberations_modification on public.votes_deliberations;
create policy votes_deliberations_modification on public.votes_deliberations for update to authenticated
  using ((select private.can('{maire,cabinet,secretariat}'::text[])) and commune_id = (select private.my_commune()))
  with check ((select private.can('{maire,cabinet,secretariat}'::text[])) and commune_id = (select private.my_commune()));

-- Un vote ne peut être retiré que tant que la délibération est encore à l'état de projet (traçabilité)
drop policy if exists votes_deliberations_suppression on public.votes_deliberations;
create policy votes_deliberations_suppression on public.votes_deliberations for delete to authenticated
  using (
    (select private.can('{maire,cabinet,secretariat}'::text[]))
    and commune_id = (select private.my_commune())
    and exists (
      select 1 from public.deliberations d
       where d.id = votes_deliberations.deliberation_id and d.commune_id = votes_deliberations.commune_id and d.statut = 'projet'
    )
  );

-- Garde-fous communs aux autres tables : isolation stricte, comptes anonymes bloqués, maintenance serveur, super_admin sans écriture, audit
drop policy if exists isolation_commune on public.votes_deliberations;
create policy isolation_commune on public.votes_deliberations as restrictive for all to authenticated
  using (commune_id = (select private.my_commune())) with check (commune_id = (select private.my_commune()));

drop policy if exists bloque_anonymes_votes_deliberations on public.votes_deliberations;
create policy bloque_anonymes_votes_deliberations on public.votes_deliberations as restrictive for all to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
  with check (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

drop policy if exists maintenance_serveur on public.votes_deliberations;
create policy maintenance_serveur on public.votes_deliberations as restrictive for all to authenticated
  using ((select private.hors_maintenance())) with check ((select private.hors_maintenance()));

drop policy if exists sa_no_insert on public.votes_deliberations;
create policy sa_no_insert on public.votes_deliberations as restrictive for insert to authenticated
  with check (not public.is_super_admin());
drop policy if exists sa_no_update on public.votes_deliberations;
create policy sa_no_update on public.votes_deliberations as restrictive for update to authenticated
  using (not public.is_super_admin()) with check (not public.is_super_admin());
drop policy if exists sa_no_delete on public.votes_deliberations;
create policy sa_no_delete on public.votes_deliberations as restrictive for delete to authenticated
  using (not public.is_super_admin());

drop trigger if exists audit_votes_deliberations on public.votes_deliberations;
create trigger audit_votes_deliberations after insert or update or delete on public.votes_deliberations
  for each row execute function private.audit();

-- Les tables conseillers, session_presences, deliberations, actes et sessions_conseil gardent leurs politiques RLS actuelles
-- (isolation_commune, gestion maire/cabinet/secrétariat, restrictives anonymes/maintenance/super_admin) : inchangées.
