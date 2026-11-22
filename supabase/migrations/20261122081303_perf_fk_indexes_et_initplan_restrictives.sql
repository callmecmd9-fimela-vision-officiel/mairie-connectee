-- Performance sans changement de comportement : 7 index de clés étrangères + évaluation unique de auth.jwt() dans 2 policies RESTRICTIVE.
-- Appliquée en production le 2026-11-22 (version 20261122081303) avec accord explicite. Vérifiée : 7 index et 2 policies présents.
-- Retour arrière : drop index if exists <les 7 index ci-dessous> ; alter policy ... using/with check (coalesce((auth.jwt() ->> 'is_anonymous')::boolean,false) = false).
create index if not exists org_affectations_poste_fk_idx on public.org_affectations (commune_id, poste_code);
create index if not exists org_delegations_droits_commune_idx on public.org_delegations_droits (commune_id);
create index if not exists org_delegations_droits_de_user_idx on public.org_delegations_droits (de_user);
create index if not exists org_postes_role_fk_idx on public.org_postes (commune_id, role_code);
create index if not exists personnel_fusionne_dans_idx on public.personnel (fusionne_dans);
create index if not exists personnel_service_id_idx on public.personnel (service_id);
create index if not exists services_parent_id_idx on public.services (parent_id);

alter policy bloque_anonymes_paiements on public.paiements
  using ((select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) = false)
  with check ((select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) = false);
alter policy bloque_anonymes_org_roles on public.org_roles
  using ((select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) = false)
  with check ((select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) = false);
