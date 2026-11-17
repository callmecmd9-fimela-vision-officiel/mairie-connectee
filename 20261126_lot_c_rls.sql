-- Lot C : RLS sensibles via org_droit + traçabilité. ADDITIF UNIQUEMENT (OR), aucune policy existante supprimée.
create table if not exists acces_sensibles(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null,
  user_id uuid not null,
  module text not null,
  cible text,
  created_at timestamptz not null default now()
);
alter table acces_sensibles enable row level security;

drop policy if exists acces_sensibles_select on acces_sensibles;
create policy acces_sensibles_select on acces_sensibles for select
  using (commune_id = org_commune() and (select role from profiles where id=auth.uid()) in ('maire','super_admin'));

drop policy if exists acces_sensibles_insert on acces_sensibles;
create policy acces_sensibles_insert on acces_sensibles for insert
  with check (commune_id = org_commune() and user_id = auth.uid());

create or replace function org_tracer(p_module text, p_cible text default null)
returns void language sql security definer as $$
  insert into acces_sensibles(commune_id,user_id,module,cible) values (org_commune(), auth.uid(), p_module, p_cible);
$$;

-- Personnel / congés
drop policy if exists personnel_org_select on personnel;
create policy personnel_org_select on personnel for select
  using (commune_id = org_commune() and org_droit('personnel','consulter'));

drop policy if exists conges_org_select on conges;
create policy conges_org_select on conges for select
  using (commune_id = org_commune() and org_droit('conges','consulter'));

drop policy if exists conges_droits_org_select on conges_droits;
create policy conges_droits_org_select on conges_droits for select
  using (commune_id = org_commune() and org_droit('conges','consulter'));

-- Rémunérations / paie
drop policy if exists remun_org_select on remunerations;
create policy remun_org_select on remunerations for select
  using (commune_id = org_commune() and org_droit('remun','consulter'));

drop policy if exists paies_org_select on paies;
create policy paies_org_select on paies for select
  using (commune_id = org_commune() and org_droit('paie','consulter'));

drop policy if exists paie_lignes_org_select on paie_lignes;
create policy paie_lignes_org_select on paie_lignes for select
  using (exists(select 1 from paies p where p.id=paie_lignes.paie_id and p.commune_id=org_commune())
         and org_droit('paie','consulter'));

-- Marchés publics
drop policy if exists marches_org_select on marches;
create policy marches_org_select on marches for select
  using (commune_id = org_commune() and org_droit('marches','consulter'));

-- Archives : non-confidentiel seulement via org_droit ; le confidentiel reste sur la policy historique (inchangée)
drop policy if exists documents_org_select on documents;
create policy documents_org_select on documents for select
  using (commune_id = org_commune() and org_droit('archives','consulter') and confidentialite <> 'confidentiel');
