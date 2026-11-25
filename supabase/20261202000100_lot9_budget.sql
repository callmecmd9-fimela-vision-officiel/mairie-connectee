-- LOT 9 : Budget communal (régime financier des collectivités territoriales, décret n° 2023-2161)
-- Cycle : budget annuel (brouillon -> voté -> approuvé -> clôturé), lignes par chapitre/article
-- (recettes et dépenses, prévu / réalisé) et engagements de dépenses rattachés à une ligne.
-- Isolation : chaque commune ne voit et ne modifie que ses propres données (private.my_commune()).
-- Note : budget_lignes porte aussi commune_id (en plus des colonnes demandées) afin que la RLS, l'audit
-- et l'index fonctionnent comme sur les autres tables ; la cohérence est garantie par des clés étrangères composites.

create table public.budgets(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null default private.my_commune() references public.communes(id),
  annee integer not null check (annee between 2000 and 2100),
  statut text not null default 'brouillon' check (statut in ('brouillon','vote','approuve','cloture')),
  date_creation timestamptz not null default now(),
  unique (commune_id, annee),
  unique (id, commune_id)
);

create table public.budget_lignes(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null default private.my_commune() references public.communes(id),
  budget_id uuid not null,
  chapitre text not null check (length(btrim(chapitre)) between 1 and 20),
  article text not null check (length(btrim(article)) between 1 and 20),
  type_recette_depense text not null check (type_recette_depense in ('recette','depense')),
  montant_prevu numeric(15,2) not null default 0 check (montant_prevu >= 0),
  montant_realise numeric(15,2) not null default 0 check (montant_realise >= 0),
  foreign key (budget_id, commune_id) references public.budgets(id, commune_id) on delete cascade,
  unique (budget_id, type_recette_depense, chapitre, article),
  unique (id, commune_id)
);

create table public.engagements(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null default private.my_commune() references public.communes(id),
  budget_ligne_id uuid not null,
  montant numeric(15,2) not null check (montant > 0),
  statut text not null default 'engage' check (statut in ('engage','liquide','ordonnance','paye','annule')),
  date_engagement date not null default current_date,
  foreign key (budget_ligne_id, commune_id) references public.budget_lignes(id, commune_id)
);

create index on public.budgets(commune_id);
create index on public.budget_lignes(commune_id);
create index on public.budget_lignes(budget_id);
create index on public.engagements(commune_id);
create index on public.engagements(budget_ligne_id);

alter table public.budgets enable row level security;
alter table public.budget_lignes enable row level security;
alter table public.engagements enable row level security;

revoke all on public.budgets, public.budget_lignes, public.engagements from anon;
-- Un engagement n'est jamais supprimé (traçabilité comptable) : on l'annule en changeant son statut.
revoke delete on public.engagements from authenticated;

-- Lecture : maire, adjoint, finances, de la commune uniquement
create policy budgets_lecture on public.budgets for select to authenticated
  using ((select private.my_role()) in ('maire','adjoint','finances') and commune_id=(select private.my_commune()));
create policy budget_lignes_lecture on public.budget_lignes for select to authenticated
  using ((select private.my_role()) in ('maire','adjoint','finances') and commune_id=(select private.my_commune()));
create policy engagements_lecture on public.engagements for select to authenticated
  using ((select private.my_role()) in ('maire','adjoint','finances') and commune_id=(select private.my_commune()));

-- Écriture : maire et finances, de la commune uniquement
create policy budgets_creation on public.budgets for insert to authenticated
  with check ((select private.my_role()) in ('maire','finances') and commune_id=(select private.my_commune()));
create policy budgets_modification on public.budgets for update to authenticated
  using ((select private.my_role()) in ('maire','finances') and commune_id=(select private.my_commune()))
  with check ((select private.my_role()) in ('maire','finances') and commune_id=(select private.my_commune()));
create policy budgets_suppression on public.budgets for delete to authenticated
  using ((select private.my_role()) in ('maire','finances') and commune_id=(select private.my_commune()) and statut='brouillon');

create policy budget_lignes_creation on public.budget_lignes for insert to authenticated
  with check ((select private.my_role()) in ('maire','finances') and commune_id=(select private.my_commune()));
create policy budget_lignes_modification on public.budget_lignes for update to authenticated
  using ((select private.my_role()) in ('maire','finances') and commune_id=(select private.my_commune()))
  with check ((select private.my_role()) in ('maire','finances') and commune_id=(select private.my_commune()));
create policy budget_lignes_suppression on public.budget_lignes for delete to authenticated
  using ((select private.my_role()) in ('maire','finances') and commune_id=(select private.my_commune())
    and exists (select 1 from public.budgets b where b.id=budget_id and b.commune_id=budget_lignes.commune_id and b.statut='brouillon'));

create policy engagements_creation on public.engagements for insert to authenticated
  with check ((select private.my_role()) in ('maire','finances') and commune_id=(select private.my_commune()));
create policy engagements_modification on public.engagements for update to authenticated
  using ((select private.my_role()) in ('maire','finances') and commune_id=(select private.my_commune()))
  with check ((select private.my_role()) in ('maire','finances') and commune_id=(select private.my_commune()));

-- Garde-fous communs aux autres tables : comptes anonymes bloqués, maintenance serveur, super_admin sans écriture, audit
do $$ declare t text; begin
  foreach t in array array['budgets','budget_lignes','engagements'] loop
    execute format('create policy bloque_anonymes_%s on public.%I as restrictive for all to authenticated using (coalesce(((select auth.jwt()) ->> ''is_anonymous'')::boolean,false)=false) with check (coalesce(((select auth.jwt()) ->> ''is_anonymous'')::boolean,false)=false)', t, t);
    execute format('create policy maintenance_serveur on public.%I as restrictive for all to authenticated using ((select private.hors_maintenance())) with check ((select private.hors_maintenance()))', t);
    execute format('create policy sa_no_insert on public.%I as restrictive for insert to authenticated with check (not public.is_super_admin())', t);
    execute format('create policy sa_no_update on public.%I as restrictive for update to authenticated using (not public.is_super_admin()) with check (not public.is_super_admin())', t);
    execute format('create policy sa_no_delete on public.%I as restrictive for delete to authenticated using (not public.is_super_admin())', t);
    execute format('create trigger audit_%s after insert or update or delete on public.%I for each row execute function private.audit()', t, t);
  end loop;
end $$;
