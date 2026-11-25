-- LOT 10 : Marchés publics (Code des marchés publics, décret n° 2022-2295)
-- Plan de passation annuel, rattachement des marchés au plan, avenants et ordres de service.
-- ATTENTION : la table public.marches EXISTE DÉJÀ (migration 20261115072440, utilisée par js/maire.js :
-- numero, objet, mode, montant, attributaire, service, statut, dates, observations). Elle n'est donc PAS recréée :
-- on la complète (plan_id, reference, type_marche), sans toucher à ses colonnes, statuts ni politiques RLS actuels.
-- Isolation : chaque commune ne voit et ne modifie que ses propres données (private.my_commune()).
-- marches_avenants et ordres_service portent aussi commune_id (en plus des colonnes demandées) ; la cohérence
-- avec le marché parent est garantie par des clés étrangères composites (marche_id, commune_id).

-- 1) Plan de passation
create table public.plan_passation(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null default private.my_commune() references public.communes(id),
  annee integer not null check (annee between 2000 and 2100),
  objet text not null check (char_length(btrim(objet)) between 1 and 300),
  budget_estime numeric(15,2) not null default 0 check (budget_estime >= 0),
  statut text not null default 'brouillon' check (statut in ('brouillon','approuve','en_cours','realise','annule')),
  created_at timestamptz not null default now(),
  unique (id, commune_id)
);

-- 2) Complément de la table existante public.marches
alter table public.marches
  add column if not exists plan_id uuid,
  add column if not exists reference text,
  add column if not exists type_marche text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'marches_id_commune_uq' and conrelid = 'public.marches'::regclass) then
    alter table public.marches add constraint marches_id_commune_uq unique (id, commune_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'marches_plan_fk' and conrelid = 'public.marches'::regclass) then
    alter table public.marches add constraint marches_plan_fk foreign key (plan_id, commune_id) references public.plan_passation(id, commune_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'marches_type_marche_chk' and conrelid = 'public.marches'::regclass) then
    alter table public.marches add constraint marches_type_marche_chk
      check (type_marche is null or type_marche in ('travaux','fournitures','services','prestations_intellectuelles'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'marches_reference_chk' and conrelid = 'public.marches'::regclass) then
    alter table public.marches add constraint marches_reference_chk check (reference is null or char_length(reference) <= 60);
  end if;
end $$;

-- La référence reprend le numéro déjà saisi dans l'application ; unique par commune lorsqu'elle est renseignée
update public.marches set reference = numero where reference is null and numero is not null;
create unique index if not exists marches_commune_reference_uq on public.marches(commune_id, reference) where reference is not null;
create index if not exists marches_plan_idx on public.marches(plan_id);

-- 3) Avenants
create table public.marches_avenants(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null default private.my_commune() references public.communes(id),
  marche_id uuid not null,
  montant_supplementaire numeric(15,2) not null default 0,
  motif text not null check (char_length(btrim(motif)) between 1 and 1000),
  date_signature date not null default current_date,
  foreign key (marche_id, commune_id) references public.marches(id, commune_id)
);

-- 4) Ordres de service
create table public.ordres_service(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null default private.my_commune() references public.communes(id),
  marche_id uuid not null,
  objet text not null check (char_length(btrim(objet)) between 1 and 300),
  date_emission date not null default current_date,
  date_execution_prevue date,
  statut text not null default 'emis' check (statut in ('emis','notifie','execute','annule')),
  foreign key (marche_id, commune_id) references public.marches(id, commune_id),
  check (date_execution_prevue is null or date_execution_prevue >= date_emission)
);

create index on public.plan_passation(commune_id);
create index on public.marches_avenants(commune_id);
create index on public.marches_avenants(marche_id);
create index on public.ordres_service(commune_id);
create index on public.ordres_service(marche_id);

alter table public.plan_passation enable row level security;
alter table public.marches_avenants enable row level security;
alter table public.ordres_service enable row level security;
alter table public.marches enable row level security; -- déjà actif : sans effet, ses politiques existantes sont conservées

revoke all on public.plan_passation, public.marches_avenants, public.ordres_service from anon;
-- Avenants signés et ordres de service émis ne sont jamais supprimés (traçabilité) : on annule via le statut.
revoke delete on public.marches_avenants, public.ordres_service from authenticated;

-- Lecture : maire, adjoint, finances, secrétariat, de la commune uniquement
create policy plan_passation_lecture on public.plan_passation for select to authenticated
  using ((select private.my_role()) in ('maire','adjoint','finances','secretariat') and commune_id=(select private.my_commune()));
create policy marches_avenants_lecture on public.marches_avenants for select to authenticated
  using ((select private.my_role()) in ('maire','adjoint','finances','secretariat') and commune_id=(select private.my_commune()));
create policy ordres_service_lecture on public.ordres_service for select to authenticated
  using ((select private.my_role()) in ('maire','adjoint','finances','secretariat') and commune_id=(select private.my_commune()));

-- Écriture : maire et finances, de la commune uniquement
create policy plan_passation_creation on public.plan_passation for insert to authenticated
  with check ((select private.my_role()) in ('maire','finances') and commune_id=(select private.my_commune()));
create policy plan_passation_modification on public.plan_passation for update to authenticated
  using ((select private.my_role()) in ('maire','finances') and commune_id=(select private.my_commune()))
  with check ((select private.my_role()) in ('maire','finances') and commune_id=(select private.my_commune()));
create policy plan_passation_suppression on public.plan_passation for delete to authenticated
  using ((select private.my_role()) in ('maire','finances') and commune_id=(select private.my_commune()) and statut='brouillon');

create policy marches_avenants_creation on public.marches_avenants for insert to authenticated
  with check ((select private.my_role()) in ('maire','finances') and commune_id=(select private.my_commune()));
create policy marches_avenants_modification on public.marches_avenants for update to authenticated
  using ((select private.my_role()) in ('maire','finances') and commune_id=(select private.my_commune()))
  with check ((select private.my_role()) in ('maire','finances') and commune_id=(select private.my_commune()));

create policy ordres_service_creation on public.ordres_service for insert to authenticated
  with check ((select private.my_role()) in ('maire','finances') and commune_id=(select private.my_commune()));
create policy ordres_service_modification on public.ordres_service for update to authenticated
  using ((select private.my_role()) in ('maire','finances') and commune_id=(select private.my_commune()))
  with check ((select private.my_role()) in ('maire','finances') and commune_id=(select private.my_commune()));

-- Garde-fous communs aux autres tables : comptes anonymes bloqués, maintenance serveur, super_admin sans écriture, audit
do $$ declare t text; begin
  foreach t in array array['plan_passation','marches_avenants','ordres_service'] loop
    execute format('create policy bloque_anonymes_%s on public.%I as restrictive for all to authenticated using (coalesce(((select auth.jwt()) ->> ''is_anonymous'')::boolean,false)=false) with check (coalesce(((select auth.jwt()) ->> ''is_anonymous'')::boolean,false)=false)', t, t);
    execute format('create policy maintenance_serveur on public.%I as restrictive for all to authenticated using ((select private.hors_maintenance())) with check ((select private.hors_maintenance()))', t);
    execute format('create policy sa_no_insert on public.%I as restrictive for insert to authenticated with check (not public.is_super_admin())', t);
    execute format('create policy sa_no_update on public.%I as restrictive for update to authenticated using (not public.is_super_admin()) with check (not public.is_super_admin())', t);
    execute format('create policy sa_no_delete on public.%I as restrictive for delete to authenticated using (not public.is_super_admin())', t);
    execute format('create trigger audit_%s after insert or update or delete on public.%I for each row execute function private.audit()', t, t);
  end loop;
end $$;
