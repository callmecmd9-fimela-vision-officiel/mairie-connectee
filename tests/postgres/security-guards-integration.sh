#!/usr/bin/env bash
set -euo pipefail
: "${PGHOST:?}" "${PGPORT:?}" "${PGUSER:?}" "${PGPASSWORD:?}" "${PGDATABASE:?}"
export PGSSLMODE=disable
psql -X -v ON_ERROR_STOP=1 <<'SQL'
do $roles$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end
$roles$;
create schema if not exists private;
create schema if not exists auth;

create table if not exists public.ia_usage (
  user_id uuid not null,
  jour date not null,
  n integer not null default 0,
  primary key (user_id, jour)
);

create table public.adjoints (
  id uuid primary key,
  commune_id uuid not null,
  user_id uuid
);
create table public.profiles (
  id uuid primary key,
  role text not null,
  commune_id uuid
);
create table auth.users (
  id uuid primary key,
  email text unique
);

create function private.my_commune() returns uuid
language sql stable set search_path = ''
as $$ select nullif(current_setting('test.commune', true), '')::uuid $$;

create function private.my_role() returns text
language sql stable set search_path = ''
as $$ select current_setting('request.jwt.claims', true)::jsonb ->> 'app_role' $$;

create function private.hors_maintenance() returns boolean
language sql stable set search_path = ''
as $$ select coalesce(nullif(current_setting('test.hors_maintenance', true), '')::boolean, true) $$;

create function private.is_platform_admin() returns boolean
language sql stable set search_path = ''
as $$ select coalesce(nullif(current_setting('test.platform_admin', true), '')::boolean, false) $$;

create function public.is_super_admin() returns boolean
language sql stable set search_path = ''
as $$
  select coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'app_role' = 'super_admin'
    and current_setting('request.jwt.claims', true)::jsonb ->> 'aal' = 'aal2',
    false
  )
$$;
SQL

psql -X -v ON_ERROR_STOP=1 -f supabase/migrations/20261119070000_security_null_mfa_guards.sql

psql -X -v ON_ERROR_STOP=1 <<'SQL'
-- paie_garde : les valeurs NULL/vides et la maintenance doivent échouer fermées.
do $$
declare v uuid;
begin
  perform set_config('test.commune', '11111111-1111-4111-8111-111111111111', false);
  perform set_config('test.hors_maintenance', 'true', false);
  perform set_config('request.jwt.claims', '{"app_role":null,"aal":"aal1"}', false);
  begin perform private.paie_garde(array['maire']); raise exception 'NULL role unexpectedly allowed'; exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claims', '{"app_role":"maire","aal":"aal1"}', false);
  perform set_config('test.commune', '', false);
  begin perform private.paie_garde(array['maire']); raise exception 'NULL commune unexpectedly allowed'; exception when insufficient_privilege then null; end;

  perform set_config('test.commune', '11111111-1111-4111-8111-111111111111', false);
  begin perform private.paie_garde(null); raise exception 'NULL roles unexpectedly allowed'; exception when insufficient_privilege then null; end;
  begin perform private.paie_garde(array[]::text[]); raise exception 'empty roles unexpectedly allowed'; exception when insufficient_privilege then null; end;
  begin perform private.paie_garde(array['finances']); raise exception 'wrong role unexpectedly allowed'; exception when insufficient_privilege then null; end;

  perform set_config('test.hors_maintenance', 'false', false);
  begin perform private.paie_garde(array['maire']); raise exception 'maintenance unexpectedly allowed'; exception when insufficient_privilege then null; end;

  perform set_config('test.hors_maintenance', 'true', false);
  v := private.paie_garde(array['maire']);
  if v <> '11111111-1111-4111-8111-111111111111'::uuid then raise exception 'valid mayor scope mismatch'; end if;
end $$;

-- Données de test isolées pour lier_adjoint.
insert into public.adjoints(id, commune_id) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222');
insert into auth.users(id,email) values
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','adjoint@example.test'),
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','maire@example.test'),
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','other@example.test');
insert into public.profiles(id,role,commune_id) values
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','maire','11111111-1111-4111-8111-111111111111');

do $$
begin
  perform set_config('test.platform_admin', 'false', false);
  perform set_config('test.commune', '11111111-1111-4111-8111-111111111111', false);
  perform set_config('request.jwt.claims', '{"app_role":"adjoint","aal":"aal1"}', false);
  begin perform public.lier_adjoint('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','adjoint@example.test'); raise exception 'unauthorized caller unexpectedly allowed'; exception when others then if sqlerrm = 'unauthorized caller unexpectedly allowed' then raise; end if; end;

  -- Maire : liaison dans sa commune conservée.
  perform set_config('request.jwt.claims', '{"app_role":"maire","aal":"aal1"}', false);
  perform public.lier_adjoint('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','adjoint@example.test');
  if (select user_id from public.adjoints where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid then raise exception 'mayor link failed'; end if;

  -- Maire : aucune liaison dans une autre commune.
  begin perform public.lier_adjoint('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','other@example.test'); raise exception 'cross-commune link unexpectedly allowed'; exception when others then if sqlerrm = 'cross-commune link unexpectedly allowed' then raise; end if; end;

  -- Super-admin : AAL1 refusé, AAL2 autorisé.
  perform set_config('request.jwt.claims', '{"app_role":"super_admin","aal":"aal1"}', false);
  begin perform public.lier_adjoint('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','other@example.test'); raise exception 'AAL1 super-admin unexpectedly allowed'; exception when others then if sqlerrm = 'AAL1 super-admin unexpectedly allowed' then raise; end if; end;
  perform set_config('request.jwt.claims', '{"app_role":"super_admin","aal":"aal2"}', false);
  -- Un super-admin AAL2 franchit le garde d'identité, mais reste dans le périmètre
  -- de sa commune si private.my_commune() en fournit une.
  perform set_config('test.commune', '22222222-2222-4222-8222-222222222222', false);
  perform public.lier_adjoint('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','other@example.test');

  -- Administrateur plateforme : exception de périmètre conservée.
  perform set_config('test.platform_admin', 'true', false);
  perform set_config('test.commune', '11111111-1111-4111-8111-111111111111', false);
  perform set_config('request.jwt.claims', '{"app_role":"platform_admin","aal":"aal1"}', false);
  perform public.lier_adjoint('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','adjoint@example.test');

  -- Compte cible avec rôle maire/super_admin ou autre commune : refus.
  insert into public.profiles(id,role,commune_id) values
   ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','maire','11111111-1111-4111-8111-111111111111');
  begin perform public.lier_adjoint('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','maire@example.test'); raise exception 'privileged target role unexpectedly allowed'; exception when others then if sqlerrm = 'privileged target role unexpectedly allowed' then raise; end if; end;
end $$;

select 'PASS: paie NULL/maintenance guards and adjoint authorization, commune isolation, AAL2, platform exception';
SQL
