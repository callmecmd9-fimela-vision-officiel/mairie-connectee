#!/usr/bin/env bash
# Test PostgreSQL de 20261121091000_org_kpi_v2.sql (base JETABLE, tables métier simulées avec les colonnes de production).
set -euo pipefail
: "${PGHOST:?}" "${PGPORT:?}" "${PGUSER:?}" "${PGDATABASE:?}"; export PGSSLMODE=disable PGPASSWORD="${PGPASSWORD:-x}"
HERE="$(cd "$(dirname "$0")" && pwd)"
bash "$HERE/roles-admin-mairie-integration.sh" >/dev/null
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
grant usage on schema test to public; grant execute on all functions in schema test to public; grant usage on schema private to public;
create table public.services(id uuid primary key default gen_random_uuid(),commune_id uuid,code text,actif boolean default true);
alter table public.org_postes add column if not exists nom text;
do $$ declare t text; begin foreach t in array array['instructions','courrier','actes','dossiers','marches','projets','conges','paies','personnel'] loop
 execute format('create table public.%I(id uuid primary key default gen_random_uuid(),commune_id uuid,statut text,actif boolean default true)',t); end loop; end $$;
create table public.demandes(id uuid primary key default gen_random_uuid(),commune_id uuid,statut text,created_at timestamptz default now());
create table public.rdv_demandes(id uuid primary key default gen_random_uuid(),commune_id uuid,statut text);
do $$ declare t text; begin foreach t in array array['instructions','courrier','actes','dossiers','marches','projets','conges','paies','personnel','demandes','rdv_demandes','services'] loop
 execute format('grant select on public.%I to authenticated',t);
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy s on public.%I for select to authenticated using (commune_id=(select private.my_commune()) and (select private.my_role()) <> ''admin_mairie'')',t); end loop; end $$;
grant select on public.org_postes,public.org_affectations,public.org_roles,public.profiles to authenticated;
create or replace function public.org_commune() returns uuid language sql stable security definer set search_path='' as $$ select p.commune_id from public.profiles p where p.id=(select auth.uid()) and coalesce(p.actif,true) $$;
SQL
psql -X -v ON_ERROR_STOP=1 -q -f "$HERE/../../supabase/migrations/20261121091000_org_kpi_v2.sql" -f "$HERE/../../supabase/migrations/20261121091000_org_kpi_v2.sql"
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
do $t$ declare A uuid:='aaaaaaaa-0000-0000-0000-00000000000a'; B uuid:='bbbbbbbb-0000-0000-0000-00000000000b'; k jsonb; begin
 insert into public.demandes(commune_id,statut,created_at) values (A,'nouvelle',now()-interval '20 days'),(A,'pret_a_retirer',now()),(A,'a_valider',now()),(A,'cloturee',now()),(A,'rejetee',now()),(B,'nouvelle',now());
 insert into public.rdv_demandes(commune_id,statut) values (A,'demandee'),(A,'confirmee'),(B,'demandee');
 insert into public.projets(commune_id,statut) values (A,'en_retard'),(A,'en_cours'),(B,'en_retard');
 insert into public.services(commune_id,code) values (A,'s1'),(A,'s2'),(B,'s9');
 insert into public.org_postes(commune_id,code,actif) values (A,'p1',true),(B,'p9',true);
 perform test.as_user(2); set local role authenticated; k:=public.org_kpi(); reset role;
 perform test.ok((k->>'citoyens')::int=3,'maire : demandes ouvertes = 3 (nouvelle, pret_a_retirer, a_valider ; closes exclues)');
 perform test.ok((k->>'demandes_anciennes')::int=1,'maire : 1 demande ouverte > 15 jours');
 perform test.ok((k->>'rdv')::int=1,'maire : 1 RDV à confirmer');
 perform test.ok((k->>'projets_retard')::int=1 and (k->>'projets')::int=2,'maire : projets (isolation commune)');
 perform test.ok(k->>'profil'='metier','maire : profil métier');
 perform test.as_user(3); set local role authenticated; k:=public.org_kpi(); reset role;
 perform test.ok(k->>'profil'='admin_mairie','admin_mairie : profil identifié');
 perform test.ok(k->'citoyens'='null'::jsonb and k->'projets'='null'::jsonb and k->'personnel'='null'::jsonb,'admin_mairie : indicateurs métier = null (pas 0 trompeur)');
 perform test.ok((k->>'services')::int=2 and (k->>'postes')::int=2,'admin_mairie : structure de SA commune fournie malgré RLS métier');
 perform test.as_user(4); set local role authenticated; k:=public.org_kpi(); reset role;
 perform test.ok((k->>'services')::int=1 and (k->>'postes')::int=1,'admin B : compte seulement sa commune');
 perform test.as_user(9); set local role authenticated; k:=public.org_kpi(); reset role;
 perform test.ok((k->>'citoyens')::int=1 and (k->>'projets_retard')::int=1,'maire B : aucune fuite de A');
 perform test.as_user(5); set local role authenticated;
 begin perform private.org_kpi_structure('bbbbbbbb-0000-0000-0000-00000000000b'); exception when others then null; end;
 k:=private.org_kpi_structure('bbbbbbbb-0000-0000-0000-00000000000b'); reset role;
 perform test.ok(k='{}'::jsonb,'helper : commune étrangère => {} (aucune fuite)');
 begin set local role anon; perform public.org_kpi(); raise exception 'ECHEC anon'; exception when insufficient_privilege then null; end; reset role;
 perform test.ok(true,'anon : org_kpi refusé');
 raise notice 'TOUS LES TESTS ORG_KPI : OK';
end $t$;
SQL
echo "PASS: org-kpi-integration"
