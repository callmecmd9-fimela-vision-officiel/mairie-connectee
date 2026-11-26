-- LOT 15 : Fiscalité locale et domaine public (contribuables, taxes, rôles d'imposition, occupations).
-- Prérequis : paiements_taxes (garde de référence + RPC verifier_quittance) et 20261202001800 (table quittances, numérotation QUIT-YYYY-NNNNNN).
-- Isolation : private.my_commune() ; les clés étrangères composites (id, commune_id) interdisent tout lien entre communes.
-- roles_imposition porte commune_id (RLS) ; ses écritures passent uniquement par les RPC.
-- montant_base = montant d'UNE période ; le rôle annuel vaut montant_base × (mensuel 12, trimestriel 4, annuel 1).
-- PROPOSÉE, non appliquée en production. Idempotente.

-- 1) Tables
create table if not exists public.contribuables(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null default private.my_commune() references public.communes(id) on delete cascade,
  nom text not null check (char_length(btrim(nom)) between 1 and 120),
  prenom text check (char_length(prenom) <= 120),
  telephone text check (char_length(telephone) <= 30),
  adresse text check (char_length(adresse) <= 300),
  type text not null default 'particulier' check (type in ('particulier','entreprise')),
  identifiant_fiscal text check (char_length(identifiant_fiscal) <= 40),
  created_at timestamptz not null default now(),
  unique (id, commune_id)
);
create unique index if not exists contribuables_idf_uidx on public.contribuables(commune_id, identifiant_fiscal) where identifiant_fiscal is not null;

create table if not exists public.taxes_locales(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null default private.my_commune() references public.communes(id) on delete cascade,
  libelle text not null check (char_length(btrim(libelle)) between 1 and 150),
  type text not null check (type in ('marche','domaine_public','patente','autres')),
  montant_base numeric(15,2) not null check (montant_base > 0),
  periodicite text not null check (periodicite in ('mensuel','trimestriel','annuel')),
  created_at timestamptz not null default now(),
  unique (id, commune_id)
);

create table if not exists public.roles_imposition(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null default private.my_commune() references public.communes(id) on delete cascade,
  contribuable_id uuid not null,
  taxe_id uuid not null,
  annee integer not null check (annee between 2000 and 2100),
  montant_du numeric(15,2) not null check (montant_du > 0),
  statut text not null default 'emise' check (statut in ('emise','payee','annulee')),
  created_at timestamptz not null default now(),
  foreign key (contribuable_id, commune_id) references public.contribuables(id, commune_id),
  foreign key (taxe_id, commune_id) references public.taxes_locales(id, commune_id)
);
create unique index if not exists roles_imposition_unique_actif on public.roles_imposition(contribuable_id, taxe_id, annee) where statut <> 'annulee';

create table if not exists public.occupations_domaine_public(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null default private.my_commune() references public.communes(id) on delete cascade,
  contribuable_id uuid not null,
  emplacement text not null check (char_length(btrim(emplacement)) between 1 and 200),
  type_occupation text not null check (type_occupation in ('etal','terrasse','enseigne')),
  date_debut date not null,
  date_fin date,
  montant_mensuel numeric(15,2) not null default 0 check (montant_mensuel >= 0),
  statut text not null default 'active' check (statut in ('active','suspendue','terminee')),
  created_at timestamptz not null default now(),
  check (date_fin is null or date_fin >= date_debut),
  foreign key (contribuable_id, commune_id) references public.contribuables(id, commune_id)
);

create index if not exists contribuables_commune_idx on public.contribuables(commune_id, nom);
create index if not exists taxes_locales_commune_idx on public.taxes_locales(commune_id);
create index if not exists roles_imposition_commune_idx on public.roles_imposition(commune_id, annee);
create index if not exists roles_imposition_taxe_idx on public.roles_imposition(taxe_id);
create index if not exists occupations_dp_commune_idx on public.occupations_domaine_public(commune_id, date_fin);
create index if not exists occupations_dp_contribuable_idx on public.occupations_domaine_public(contribuable_id);

-- 2) RLS
do $$
declare t text; ecr text;
begin
  foreach t in array array['contribuables','taxes_locales','roles_imposition','occupations_domaine_public'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_lecture', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select private.my_role()) in (''maire'',''adjoint'',''finances'',''secretariat'') and commune_id = (select private.my_commune()))', t || '_lecture', t);

    -- Écriture directe (aucune sur roles_imposition ; aucune suppression)
    ecr := case t when 'taxes_locales' then '''maire'',''finances''' when 'roles_imposition' then null else '''maire'',''secretariat''' end;
    execute format('drop policy if exists %I on public.%I', t || '_creation', t);
    execute format('drop policy if exists %I on public.%I', t || '_modification', t);
    if ecr is not null then
      execute format('grant insert, update on public.%I to authenticated', t);
      execute format('create policy %I on public.%I for insert to authenticated with check ((select private.my_role()) in (%s) and commune_id = (select private.my_commune()))', t || '_creation', t, ecr);
      execute format('create policy %I on public.%I for update to authenticated using ((select private.my_role()) in (%s) and commune_id = (select private.my_commune())) with check ((select private.my_role()) in (%s) and commune_id = (select private.my_commune()))', t || '_modification', t, ecr, ecr);
    end if;

    execute format('drop policy if exists isolation_commune on public.%I', t);
    execute format('create policy isolation_commune on public.%I as restrictive for all to authenticated using (commune_id = (select private.my_commune())) with check (commune_id = (select private.my_commune()))', t);
    execute format('drop policy if exists bloque_anonymes_%s on public.%I', t, t);
    execute format('create policy bloque_anonymes_%s on public.%I as restrictive for all to authenticated using (coalesce(((select auth.jwt()) ->> ''is_anonymous'')::boolean,false)=false) with check (coalesce(((select auth.jwt()) ->> ''is_anonymous'')::boolean,false)=false)', t, t);
    execute format('drop policy if exists maintenance_serveur on public.%I', t);
    execute format('create policy maintenance_serveur on public.%I as restrictive for all to authenticated using ((select private.hors_maintenance())) with check ((select private.hors_maintenance()))', t);
    execute format('drop policy if exists sa_no_insert on public.%I', t);
    execute format('create policy sa_no_insert on public.%I as restrictive for insert to authenticated with check (not public.is_super_admin())', t);
    execute format('drop policy if exists sa_no_update on public.%I', t);
    execute format('create policy sa_no_update on public.%I as restrictive for update to authenticated using (not public.is_super_admin()) with check (not public.is_super_admin())', t);
    execute format('drop trigger if exists audit_%s on public.%I', t, t);
    execute format('create trigger audit_%s after insert or update or delete on public.%I for each row execute function private.audit()', t, t);
  end loop;
end $$;

-- 3) Quittances : une quittance porte soit sur une demande, soit sur un rôle d'imposition
alter table public.quittances alter column demande_id drop not null;
alter table public.quittances add column if not exists role_id uuid references public.roles_imposition(id) on delete restrict;
create unique index if not exists quittances_role_uidx on public.quittances(role_id) where role_id is not null;
alter table public.quittances drop constraint if exists quittances_objet_check;
alter table public.quittances add constraint quittances_objet_check check (num_nonnulls(demande_id, role_id) = 1);

-- 4) RPC : émission d'un rôle (finances uniquement ; le montant est calculé par le serveur)
create or replace function public.generer_role_imposition(p_contribuable_id uuid, p_taxe_id uuid, p_annee int)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_commune uuid := (select private.my_commune());
  v_t public.taxes_locales%rowtype;
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;
  if coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
     or v_commune is null or (select private.my_role()) is distinct from 'finances' then
    raise exception 'Accès refusé : seul le rôle « finances » peut générer un rôle d''imposition.' using errcode = '42501';
  end if;
  if not (select private.hors_maintenance()) then
    raise exception 'Plateforme en maintenance.' using errcode = '55000';
  end if;
  if p_annee is null or p_annee not between 2000 and 2100 then
    raise exception 'Année invalide.' using errcode = '22023';
  end if;
  perform 1 from public.contribuables where id = p_contribuable_id and commune_id = v_commune;
  if not found then
    raise exception 'Contribuable introuvable.' using errcode = 'P0002';
  end if;
  select * into v_t from public.taxes_locales where id = p_taxe_id and commune_id = v_commune;
  if not found then
    raise exception 'Taxe introuvable.' using errcode = 'P0002';
  end if;
  begin
    insert into public.roles_imposition(commune_id, contribuable_id, taxe_id, annee, montant_du)
    values (v_commune, p_contribuable_id, p_taxe_id, p_annee,
            v_t.montant_base * case v_t.periodicite when 'mensuel' then 12 when 'trimestriel' then 4 else 1 end)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Un rôle existe déjà pour ce contribuable, cette taxe et cette année.' using errcode = '23505';
  end;
  return v_id;
end $$;

-- 5) RPC : encaissement intégral au guichet, paiement tracé et quittance
create or replace function public.payer_role_imposition(p_role_id uuid, p_montant numeric)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_commune uuid := (select private.my_commune());
  v_r public.roles_imposition%rowtype;
  v_objet text;
  v_nom text;
  v_pid uuid;
  v_num text;
  v_ref text;
begin
  if v_uid is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;
  if coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
     or v_commune is null or (select private.my_role()) is distinct from 'finances' then
    raise exception 'Accès refusé : seul le rôle « finances » peut encaisser.' using errcode = '42501';
  end if;
  if not (select private.hors_maintenance()) then
    raise exception 'Plateforme en maintenance : encaissement impossible.' using errcode = '55000';
  end if;

  select * into v_r from public.roles_imposition where id = p_role_id for update;
  if not found or v_r.commune_id is distinct from v_commune then
    raise exception 'Rôle introuvable.' using errcode = 'P0002';
  end if;
  if v_r.statut is distinct from 'emise' then
    raise exception 'Encaissement refusé : le rôle n''est pas au statut « émis » (statut actuel : %).', v_r.statut using errcode = '55000';
  end if;
  if p_montant is null or p_montant <> v_r.montant_du then
    raise exception 'Le montant encaissé doit être égal au montant dû (%).', v_r.montant_du using errcode = '22023';
  end if;

  select left(t.libelle || ' ' || v_r.annee, 150) into v_objet from public.taxes_locales t where t.id = v_r.taxe_id;
  select left(btrim(coalesce(c.prenom, '') || ' ' || c.nom), 120) into v_nom from public.contribuables c where c.id = v_r.contribuable_id;

  insert into public.paiements_taxes(commune_id, type_taxe, montant, statut, nom, source, agent_id, ref_recu)
  values (v_commune, v_objet, p_montant, 'paye', v_nom, 'guichet', v_uid, 'ROLE-' || v_r.id)
  returning id, num_quittance, reference_paiement into v_pid, v_num, v_ref;
  update public.paiements_taxes set quittance_url = '/quittance?ref=' || v_ref where id = v_pid;

  insert into public.quittances(commune_id, role_id, paiement_id, num_quittance, montant, source, ref_recu, emise_par)
  values (v_commune, v_r.id, v_pid, v_num, p_montant, 'guichet', 'ROLE-' || v_r.id, v_uid);

  update public.roles_imposition set statut = 'payee' where id = v_r.id;

  return jsonb_build_object('num_quittance', v_num, 'reference_paiement', v_ref, 'quittance_url', '/quittance?ref=' || v_ref);
end $$;

revoke all on function public.generer_role_imposition(uuid, uuid, int) from public, anon;
grant execute on function public.generer_role_imposition(uuid, uuid, int) to authenticated;
revoke all on function public.payer_role_imposition(uuid, numeric) from public, anon;
grant execute on function public.payer_role_imposition(uuid, numeric) to authenticated;
