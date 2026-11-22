-- Doublon remplacé par trg_org_provisionner_commune (copie du modèle Fimela, repli org_seed).
-- (Source : supabase_migrations.schema_migrations, version 20261121130836, relevée en lecture seule le 2026-11-22.)
drop trigger if exists trg_org_seed_commune on public.communes;
drop function if exists public.org_seed_nouvelle_commune();
