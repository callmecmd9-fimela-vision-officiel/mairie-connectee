-- P1 Patrimoine (2026-11-25) : géolocalisation des biens communaux (latitude / longitude, WGS84).
-- Colonnes facultatives ; les politiques RLS existantes de patrimoine_biens (lot 12) s'appliquent inchangées.
-- Idempotente : peut être rejouée sans erreur.
alter table public.patrimoine_biens add column if not exists latitude numeric(9,6);
alter table public.patrimoine_biens add column if not exists longitude numeric(9,6);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'patrimoine_biens_geo_check' and conrelid = 'public.patrimoine_biens'::regclass) then
    alter table public.patrimoine_biens add constraint patrimoine_biens_geo_check
      check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180));
  end if;
end $$;
