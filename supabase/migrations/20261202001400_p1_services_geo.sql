-- P1 Services territoriaux (2026-11-25) : géolocalisation des infrastructures et lien facultatif avec une ligne budgétaire.
-- Colonnes facultatives ; les politiques RLS du lot 13 s'appliquent inchangées. Idempotente : peut être rejouée sans erreur.
-- Dépend de public.budget_lignes (lot 9, unique (id, commune_id)).
alter table public.territoire_infrastructures add column if not exists latitude numeric(9,6);
alter table public.territoire_infrastructures add column if not exists longitude numeric(9,6);
alter table public.territoire_infrastructures add column if not exists budget_ligne_id uuid;
alter table public.territoire_actions add column if not exists budget_ligne_id uuid;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'territoire_infrastructures_geo_check' and conrelid = 'public.territoire_infrastructures'::regclass) then
    alter table public.territoire_infrastructures add constraint territoire_infrastructures_geo_check
      check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180));
  end if;
  -- FK composite (même commune que la ligne) ; si la ligne est supprimée, seul le lien est effacé (commune_id reste renseigné : PostgreSQL 15+)
  if not exists (select 1 from pg_constraint where conname = 'territoire_infrastructures_budget_ligne_fk' and conrelid = 'public.territoire_infrastructures'::regclass) then
    alter table public.territoire_infrastructures add constraint territoire_infrastructures_budget_ligne_fk
      foreign key (budget_ligne_id, commune_id) references public.budget_lignes(id, commune_id) on delete set null (budget_ligne_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'territoire_actions_budget_ligne_fk' and conrelid = 'public.territoire_actions'::regclass) then
    alter table public.territoire_actions add constraint territoire_actions_budget_ligne_fk
      foreign key (budget_ligne_id, commune_id) references public.budget_lignes(id, commune_id) on delete set null (budget_ligne_id);
  end if;
end $$;

create index if not exists territoire_infrastructures_ligne_idx on public.territoire_infrastructures(budget_ligne_id) where budget_ligne_id is not null;
create index if not exists territoire_actions_ligne_idx on public.territoire_actions(budget_ligne_id) where budget_ligne_id is not null;
