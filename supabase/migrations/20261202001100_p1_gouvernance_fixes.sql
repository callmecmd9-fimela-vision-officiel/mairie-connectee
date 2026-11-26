-- P1 gouvernance : vote des conseillers (revue de la gouvernance).
-- Numéro 20261202001100 (et non 20261201000500) : la migration doit passer APRÈS 20261202000300 (crée votes_deliberations)
-- et APRÈS la dernière version enregistrée, sinon Supabase la refuse comme « hors ordre ».
-- ÉTAT : PROPOSÉE, NON APPLIQUÉE. Idempotente (ré-exécutable). Aucune donnée existante modifiée.
-- À appliquer AVANT ou avec 20261202000900 (triggers) : sans conflit, les deux se complètent.

-- 1) Lien conseiller -> compte de connexion --------------------------------------------------
alter table public.conseillers add column if not exists user_id uuid references auth.users(id);
create index if not exists conseillers_user_id_idx on public.conseillers(user_id);
-- un compte = une seule fiche de conseiller par commune
create unique index if not exists conseillers_commune_user_uq on public.conseillers(commune_id, user_id) where user_id is not null;

-- 2) Rôle « conseiller » dans profiles (contrainte CHECK existante : liste + 1) ----------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (
  role = any (array[
    'super_admin','maire','adjoint','cabinet','secretariat','finances',
    'rh','etat_civil','technique','agent','citoyen','admin_mairie','conseiller'
  ]::text[])
);

-- 3) Lecture des conseillers de sa commune : maire, adjoint, conseiller ------------------------
-- (politique permissive ADDITIVE : les politiques existantes de maire/cabinet/secrétariat et les politiques
--  restrictives isolation_commune / anonymes / maintenance / super_admin continuent de s'appliquer)
alter table public.conseillers enable row level security;
drop policy if exists conseillers_lecture_gouvernance on public.conseillers;
create policy conseillers_lecture_gouvernance on public.conseillers for select to authenticated
  using (
    (select private.my_role()) in ('maire', 'adjoint', 'conseiller')
    and commune_id = (select private.my_commune())
  );

-- 4) Lecture des sessions et délibérations par le conseiller (nécessaire pour voter) -----------
drop policy if exists deliberations_lecture_conseiller on public.deliberations;
create policy deliberations_lecture_conseiller on public.deliberations for select to authenticated
  using ((select private.my_role()) = 'conseiller' and commune_id = (select private.my_commune()));

drop policy if exists sessions_conseil_lecture_conseiller on public.sessions_conseil;
create policy sessions_conseil_lecture_conseiller on public.sessions_conseil for select to authenticated
  using ((select private.my_role()) = 'conseiller' and commune_id = (select private.my_commune()));

-- 5) votes_deliberations : lecture et insertion pour adjoint et conseiller ---------------------
drop policy if exists votes_deliberations_lecture on public.votes_deliberations;
create policy votes_deliberations_lecture on public.votes_deliberations for select to authenticated
  using (
    ((select private.can('{maire,cabinet,secretariat}'::text[])) or (select private.my_role()) in ('adjoint', 'conseiller'))
    and commune_id = (select private.my_commune())
  );

drop policy if exists votes_deliberations_creation on public.votes_deliberations;
create policy votes_deliberations_creation on public.votes_deliberations for insert to authenticated
  with check (
    commune_id = (select private.my_commune())
    and (
      -- maire, cabinet, secrétariat : comportement inchangé
      (select private.can('{maire,cabinet,secretariat}'::text[]))
      -- adjoint et conseiller : uniquement avec SA propre fiche (conseillers.user_id = compte connecté)
      or (
        (select private.my_role()) in ('adjoint', 'conseiller')
        and exists (
          select 1 from public.conseillers c
           where c.id = votes_deliberations.conseiller_id
             and c.commune_id = votes_deliberations.commune_id
             and c.user_id = (select auth.uid())
        )
      )
    )
  );
-- (le trigger 20261202000900 contrôle en plus : délibération au statut « projet » et conseiller actif)

-- 6) Realtime : votes_deliberations dans la publication (sans erreur si déjà présente) ----------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'votes_deliberations') then
    alter publication supabase_realtime add table public.votes_deliberations;
  end if;
exception when duplicate_object then null;
end $$;
