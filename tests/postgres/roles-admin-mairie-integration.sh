#!/usr/bin/env bash
# Test d'intégration PostgreSQL des rôles admin_mairie / maire / plateforme.
# À exécuter sur une base JETABLE (jamais la production). Exemple :
#   docker run --rm -d --name pgtest -e POSTGRES_PASSWORD=pw -p 54329:5432 postgres:17
#   PGHOST=localhost PGPORT=54329 PGUSER=postgres PGPASSWORD=pw PGDATABASE=postgres \
#     bash tests/postgres/roles-admin-mairie-integration.sh
# Rejouable (schéma public recréé à chaque lancement). La base reçoit un schéma minimal simulé (stubs) puis la migration réelle
# supabase/migrations/20261120100000_roles_admin_mairie_separation.sql.
set -euo pipefail
: "${PGHOST:?}" "${PGPORT:?}" "${PGUSER:?}" "${PGPASSWORD:?}" "${PGDATABASE:?}"
export PGSSLMODE=disable
HERE="$(cd "$(dirname "$0")" && pwd)"
MIG="$HERE/../../supabase/migrations/20261120100000_roles_admin_mairie_separation.sql"
[ -f "$MIG" ] || { echo "migration introuvable"; exit 2; }
case "${PGDATABASE}" in *prod*|*production*) echo "REFUS : base de production"; exit 2;; esac

# Garde-fou : refuse toute base contenant des utilisateurs Auth qui ne sont pas des données de test.
if [ "$(psql -X -At -c "select to_regclass('auth.users') is not null")" = "t" ] && [ "$(psql -X -At -c "select count(*) from auth.users where email not like '%@example.test'")" != "0" ]; then
  echo "REFUS : la base contient des utilisateurs Auth réels"; exit 2; fi
# Rejouable : on repart d'un schéma public vierge (base jetable uniquement).
psql -X -v ON_ERROR_STOP=1 -q -c "drop schema if exists public cascade; create schema public; grant usage on schema public to anon, authenticated, service_role;" 2>/dev/null || psql -X -v ON_ERROR_STOP=1 -q -c "drop schema if exists public cascade; create schema public;"

psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
drop schema if exists test cascade; drop schema if exists private cascade; drop schema if exists auth cascade;
drop table if exists public.org_delegations_droits, public.org_affectations, public.org_role_droits, public.org_roles,
  public.org_postes, public.permissions_utilisateurs, public.adjoints, public.abonnements, public.indicateurs,
  public.plans, public.platform_audit, public.platform_admins, public.journal_audit, public.profiles, public.communes cascade;
do $r$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
end $r$;
create extension if not exists pgcrypto;
create schema private; create schema auth; create schema test;
create table auth.users(id uuid primary key,email text unique,is_anonymous boolean not null default false,email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
create table public.communes(id uuid primary key default gen_random_uuid(),nom text,slug text unique,statut text,sous_domaine text,admin_principal uuid);
create table public.profiles(id uuid primary key,role text not null default 'citoyen',commune_id uuid,nom text,actif boolean default true,service text);
alter table public.profiles add constraint profiles_role_check check (role = any (array['super_admin','maire','adjoint','cabinet','secretariat','finances','rh','etat_civil','technique','agent','citoyen']));
create table public.platform_admins(user_id uuid primary key,email text,actif boolean not null default true,niveau text default 'proprietaire');
create table public.platform_audit(id bigserial primary key,admin_id uuid,email text,action text not null,commune_id uuid,detail jsonb,created_at timestamptz not null default now());
create table public.journal_audit(id bigserial primary key,commune_id text,user_id uuid,email text,action text,cible text,detail jsonb,created_at timestamptz default now());
create table public.plans(code text primary key,actif boolean default true);
create table public.indicateurs(commune_id uuid);
create table public.abonnements(commune_id uuid,plan_code text,statut text,fin_essai date,prochaine_echeance date);
create table public.adjoints(id uuid primary key default gen_random_uuid(),commune_id uuid,user_id uuid);
create table public.permissions_utilisateurs(commune_id text,user_id uuid,cle text,autorise boolean);
create table public.org_roles(commune_id uuid,code text,actif boolean default true);
create table public.org_postes(commune_id uuid,code text,actif boolean default true,role_code text);
create table public.org_role_droits(commune_id uuid,role_code text,module text,action text,primary key(commune_id,role_code,module,action));
create table public.org_affectations(id uuid primary key default gen_random_uuid(),commune_id uuid,user_id uuid,poste_code text,service_code text,debut date default current_date,fin date,actif boolean default true);
create table public.org_delegations_droits(id uuid primary key default gen_random_uuid(),commune_id uuid,de_user uuid,a_user uuid,module text,action text,debut date,fin date,motif text,revoque_le timestamptz);
create function private.my_commune() returns uuid language sql stable security definer set search_path='' as $$ select commune_id from public.profiles where id=auth.uid() $$;
create function private.my_role() returns text language sql stable security definer set search_path='' as $$ select role from public.profiles where id=auth.uid() and coalesce(actif,true) $$;
create function private.is_platform_admin(p text[] default null) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.platform_admins where user_id=auth.uid() and actif) $$;
create function public.is_super_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='super_admin' and coalesce(actif,true)) or private.is_platform_admin() $$;
create function private.pgarde(p text[] default null) returns void language plpgsql stable security definer set search_path='' as $$ begin if not private.is_platform_admin(p) then raise exception 'Accès plateforme refusé'; end if; end $$;
create function private.paudit(p_action text,p_commune uuid,p_detail jsonb default null) returns void language plpgsql security definer set search_path='' as $$ begin insert into public.platform_audit(admin_id,email,action,commune_id,detail) select a.user_id,a.email,p_action,p_commune,p_detail from public.platform_admins a where a.user_id=auth.uid(); end $$;
create function public.org_commune() returns uuid language sql stable security definer set search_path='' as $$ select private.my_commune() $$;
alter table public.profiles enable row level security;
create policy profiles_self on public.profiles for select to authenticated using (id=auth.uid());
create policy profiles_lecture on public.profiles for select to authenticated using (private.my_role() in ('maire','cabinet') and commune_id=private.my_commune());
-- Pire cas volontaire : écriture ouverte côté RLS pour prouver que les TRIGGERS protègent seuls.
create policy test_ecriture_ouverte on public.profiles for insert to authenticated with check (true);
create policy test_maj_ouverte on public.profiles for update to authenticated using (true) with check (true);
create policy isolation_commune on public.profiles as restrictive for all to authenticated using (id=auth.uid() or commune_id=private.my_commune()) with check (id=auth.uid() or commune_id=private.my_commune());
grant usage on schema auth,private,public,test to authenticated;
grant all on all tables in schema public to authenticated; grant select on auth.users to authenticated;
grant execute on all functions in schema private to authenticated; grant execute on all functions in schema auth to authenticated;
SQL

psql -X -v ON_ERROR_STOP=1 -q -f "$MIG"
psql -X -v ON_ERROR_STOP=1 -q -c "grant execute on all functions in schema private to authenticated; grant execute on all functions in schema public to authenticated;"

psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
create function test.uid(n int) returns uuid language sql immutable as $$ select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid $$;
create function test.as_user(n int) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub',test.uid(n)::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  set local role authenticated; end $$;
create function test.as_system() returns void language plpgsql as $$ begin
  reset role; perform set_config('request.jwt.claim.sub','',true); perform set_config('request.jwt.claim.role','',true); end $$;
create function test.ok(c boolean,label text) returns void language plpgsql as $$ begin
  if c is not true then raise exception 'ECHEC : %',label; end if; raise notice 'OK   %',label; end $$;
create function test.fails(q text,label text) returns void language plpgsql as $$ begin
  begin execute q; exception when others then raise notice 'OK   % (refusé : %)',label,left(sqlerrm,70); return; end;
  raise exception 'ECHEC : % devait être refusé',label; end $$;
grant execute on all functions in schema test to authenticated;

-- Jeu de données (utilisateurs 1..9 ; communes A et B)
insert into public.communes(id,nom,slug,statut) values
 ('aaaaaaaa-0000-0000-0000-00000000000a','Commune A','commune-a','actif'),
 ('bbbbbbbb-0000-0000-0000-00000000000b','Commune B','commune-b','actif');
insert into auth.users(id,email,email_confirmed_at) select test.uid(n),'u'||n||'@example.test',now() from generate_series(1,9) n;
insert into public.platform_admins(user_id,email) values (test.uid(1),'u1@example.test');
insert into public.plans values ('essentiel',true);
insert into public.profiles(id,role,commune_id,actif) values
 (test.uid(1),'super_admin',null,true),
 (test.uid(2),'maire','aaaaaaaa-0000-0000-0000-00000000000a',true),
 (test.uid(5),'agent','aaaaaaaa-0000-0000-0000-00000000000a',true),
 (test.uid(6),'citoyen',null,true),(test.uid(7),'citoyen',null,true),(test.uid(8),'citoyen',null,true),
 (test.uid(9),'maire','bbbbbbbb-0000-0000-0000-00000000000b',true);
-- admins municipaux créés côté système (service_role) : statut dérivé par trigger
insert into public.profiles(id,role,commune_id,actif) values
 (test.uid(3),'admin_mairie','aaaaaaaa-0000-0000-0000-00000000000a',true),
 (test.uid(4),'admin_mairie','bbbbbbbb-0000-0000-0000-00000000000b',true);
insert into public.adjoints(id,commune_id) values ('cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-00000000000a');
insert into public.org_roles values ('aaaaaaaa-0000-0000-0000-00000000000a','secretaire',true);
insert into public.org_postes values ('aaaaaaaa-0000-0000-0000-00000000000a','sec1',true,'secretaire');

do $t$ declare A uuid:='aaaaaaaa-0000-0000-0000-00000000000a'; B uuid:='bbbbbbbb-0000-0000-0000-00000000000b'; r record; begin
 -- 1. Statuts
 perform test.ok((select statut_admin from public.profiles where id=test.uid(3))='actif','admin avec commune + actif => statut actif');
 -- 2. Préparation anticipée (plateforme)
 perform test.as_user(1);
 perform test.ok(public.saas_preparer_admin_mairie('u6@example.test','Admin Diofior')=test.uid(6),'plateforme prépare un compte existant');
 perform test.as_system();
 select * into r from public.profiles where id=test.uid(6);
 perform test.ok(r.role='admin_mairie' and r.commune_id is null and r.actif=false and r.statut_admin='en_attente','compte préparé = en_attente, inactif, sans commune');
 perform test.ok((select count(*) from auth.users where lower(email)='u6@example.test')=1,'aucun doublon Auth');
 perform test.ok(not private.is_commune_admin(A) ,'système: is_commune_admin neutre');
 perform test.as_user(6);
 perform test.ok(private.is_commune_admin(A) is false and private.is_commune_admin(B) is false,'en_attente : aucun droit de commune');
 perform test.ok(public.org_droit_propre(test.uid(6),'org','administrer') is false,'en_attente : aucun droit org');
 perform test.fails($q$select public.org_gest('commune-a')$q$,'en_attente : org_gest refusé');
 perform test.as_system();
 -- 3. Idempotence + refus d'un compte déjà privilégié
 perform test.as_user(1);
 perform test.ok(public.saas_preparer_admin_mairie('u6@example.test')=test.uid(6),'préparation idempotente');
 perform test.fails($q$select public.saas_preparer_admin_mairie('u2@example.test')$q$,'compte maire non convertible');
 perform test.fails($q$select public.saas_preparer_admin_mairie('u1@example.test')$q$,'compte plateforme non convertible');
 perform test.fails($q$select public.saas_preparer_admin_mairie('inconnu@example.test')$q$,'compte inexistant refusé (pas de création)');
 -- 4. Affectation
 perform test.ok(public.saas_affecter_admin_mairie('u6@example.test','commune-a')=test.uid(6),'affectation à la commune A');
 perform test.as_system();
 perform test.ok((select statut_admin||actif::text from public.profiles where id=test.uid(6))='affectefalse','affecté mais toujours inactif');
 perform test.as_user(6);
 perform test.ok(private.is_commune_admin(A) is false,'affecté inactif : aucun droit');
 perform test.as_system();
 -- 5. Activation / suspension (service_role simulé)
 update public.profiles set actif=true where id=test.uid(6);
 perform test.ok((select statut_admin from public.profiles where id=test.uid(6))='actif','activation => actif');
 perform test.as_user(6);
 perform test.ok(private.is_commune_admin(A) and not private.is_commune_admin(B),'actif : droits limités à SA commune');
 perform test.ok(public.org_droit_propre(test.uid(6),'org','administrer'),'actif : droit org.administrer');
 perform test.ok(not public.org_droit_propre(test.uid(6),'personnel','consulter'),'actif : aucun droit métier');
 perform test.ok(public.org_gest('commune-a')=A,'org_gest sa commune');
 perform test.fails($q$select public.org_gest('commune-b')$q$,'org_gest autre commune refusé');
 perform test.as_system();
 update public.profiles set actif=false where id=test.uid(6);
 perform test.ok((select statut_admin from public.profiles where id=test.uid(6))='suspendu','désactivation => suspendu');
 perform test.as_user(6); perform test.ok(not private.is_commune_admin(A),'suspendu : aucun droit'); perform test.as_system();
 -- 6. Invariant : actif sans commune impossible
 update public.profiles set commune_id=null,actif=true where id=test.uid(6);
 perform test.ok((select actif from public.profiles where id=test.uid(6))=false,'actif sans commune forcé à inactif');
 update public.profiles set commune_id=A,actif=true where id=test.uid(6);
 -- 7. Création directe + refus transfert actif
 perform test.as_user(1);
 perform test.ok(public.saas_affecter_admin_mairie('u7@example.test','commune-b')=test.uid(7),'affectation directe citoyen => admin B');
 perform test.fails($q$select public.saas_affecter_admin_mairie('u3@example.test','commune-b')$q$,'transfert d''un admin actif refusé');
 perform test.as_system();
END $t$;

do $t$ declare A uuid:='aaaaaaaa-0000-0000-0000-00000000000a'; B uuid:='bbbbbbbb-0000-0000-0000-00000000000b'; begin
 -- 8. Droits du maire
 perform test.as_user(2);
 perform test.ok(not public.org_droit_propre(test.uid(2),'org','administrer'),'maire : plus d''administration org');
 perform test.ok(public.org_droit_propre(test.uid(2),'actes','signer'),'maire : conserve signature/validation');
 perform test.ok(public.org_droit_propre(test.uid(2),'org','consulter'),'maire : consultation org conservée');
 perform test.fails($q$select public.org_gest('commune-a')$q$,'maire : org_gest refusé');
 perform test.fails($q$select public.saas_preparer_admin_mairie('u8@example.test')$q$,'maire : ne peut pas préparer un admin');
 perform test.fails($q$select public.admin_attribuer('u8@example.test','admin_mairie','commune-a')$q$,'maire : admin_attribuer refusé');
 perform test.as_system();
 -- 9. Anti-élévation admin municipal
 perform test.as_user(3);
 perform test.fails($q$update public.profiles set role='maire' where id=test.uid(3)$q$,'admin : auto-changement de rôle');
 perform test.fails($q$update public.profiles set commune_id='bbbbbbbb-0000-0000-0000-00000000000b' where id=test.uid(3)$q$,'admin : auto-changement de commune');
 perform test.fails($q$update public.profiles set actif=false where id=test.uid(3)$q$,'admin : auto-suspension/activation');
 perform test.fails($q$update public.profiles set role='admin_mairie' where id=test.uid(5)$q$,'admin : ne crée pas d''admin');
 perform test.fails($q$insert into public.profiles(id,role,commune_id) values (test.uid(10),'admin_mairie','aaaaaaaa-0000-0000-0000-00000000000a')$q$,'admin : insertion d''un admin');
 perform test.fails($q$insert into public.org_affectations(commune_id,user_id,poste_code) values ('aaaaaaaa-0000-0000-0000-00000000000a',test.uid(3),'sec1')$q$,'admin : auto-affectation à un poste');
 perform test.fails($q$insert into public.org_role_droits values ('aaaaaaaa-0000-0000-0000-00000000000a','secretaire','org','administrer')$q$,'admin : octroi org.administrer à un rôle');
 perform test.fails($q$insert into public.org_delegations_droits(commune_id,de_user,a_user,module,action) values ('aaaaaaaa-0000-0000-0000-00000000000a',test.uid(3),test.uid(5),'org','administrer')$q$,'admin : délégation org.administrer');
 perform test.fails($q$select public.lier_adjoint('cccccccc-0000-0000-0000-000000000001','u3@example.test')$q$,'admin : lier_adjoint ne peut pas écraser un admin_mairie');
 perform test.as_system();
 -- Opérations légitimes de l'admin municipal
 perform test.as_user(3);
 insert into public.org_role_droits values ('aaaaaaaa-0000-0000-0000-00000000000a','secretaire','personnel','consulter');
 perform test.ok(true,'admin : droit métier consultable accordé à un rôle');
 insert into public.org_affectations(commune_id,user_id,poste_code) values ('aaaaaaaa-0000-0000-0000-00000000000a',test.uid(5),'sec1');
 perform test.ok(true,'admin : affecte un agent de sa commune');
 perform test.as_system();
 -- 10. Le maire ne peut pas élever un admin ni lui-même
 perform test.as_user(2);
 perform test.fails($q$update public.profiles set role='admin_mairie' where id=test.uid(5)$q$,'maire : ne crée pas d''admin');
 perform test.fails($q$update public.profiles set role='super_admin' where id=test.uid(2)$q$,'maire : auto-élévation super_admin');
 perform test.fails($q$update public.profiles set role='secretariat' where id=test.uid(3)$q$,'maire : ne rétrograde pas un admin');
 perform test.fails($q$select public.lier_adjoint('cccccccc-0000-0000-0000-000000000001','u3@example.test')$q$,'maire : lier_adjoint ne peut pas écraser un admin_mairie');
 perform test.fails($q$insert into public.org_delegations_droits(commune_id,de_user,a_user,module,action) values ('aaaaaaaa-0000-0000-0000-00000000000a',test.uid(2),test.uid(3),'actes','signer')$q$,'maire : délégation à un admin_mairie');
 perform test.fails($q$insert into public.org_affectations(commune_id,user_id,poste_code) values ('aaaaaaaa-0000-0000-0000-00000000000a',test.uid(3),'sec1')$q$,'maire : affectation d''un admin à un poste');
 perform test.as_system();
END $t$;

do $t$ declare A uuid:='aaaaaaaa-0000-0000-0000-00000000000a'; n int; begin
 -- 11. Isolation entre communes (RLS profils + helpers)
 perform test.as_user(3);
 select count(*) into n from public.profiles where commune_id='bbbbbbbb-0000-0000-0000-00000000000b';
 perform test.ok(n=0,'RLS : admin A ne voit aucun profil de B');
 select count(*) into n from public.profiles where commune_id=A;
 perform test.ok(n>=3,'RLS : admin A voit les profils de A');
 perform test.as_user(4);
 select count(*) into n from public.profiles where commune_id=A;
 perform test.ok(n=0,'RLS : admin B ne voit aucun profil de A');
 perform test.fails($q$select public.org_gest('commune-a')$q$,'admin B : org_gest sur A refusé');
 perform test.as_system();
 -- 12. Plateforme : création de commune avec admin « en attente » existant
 perform test.as_user(1);
 perform public.saas_creer_commune('Commune Joal','commune-joal','essentiel',0,test.uid(8),'Admin Joal');
 perform test.as_system();
 perform test.ok((select statut_admin||actif::text from public.profiles where id=test.uid(8))='affectefalse','saas_creer_commune : admin rattaché, inactif');
 perform test.ok((select role from public.profiles where id=test.uid(8))='admin_mairie','saas_creer_commune : rôle admin_mairie (pas maire)');
 -- 13. Journalisation
 perform test.ok((select count(*) from public.journal_audit where action='profil_role_change')>=3,'journal : changements de rôle tracés');
 perform test.ok((select count(*) from public.platform_audit where action like 'admin_mairie_%')>=2,'audit plateforme : préparation/affectation tracées');
 -- 14. Aucun compte non plateforme ne peut appeler les RPC plateforme
 perform test.as_user(5);
 perform test.fails($q$select public.saas_admins_mairie()$q$,'agent : liste des admins refusée');
 perform test.fails($q$select public.saas_compte_par_email('u1@example.test')$q$,'agent : recherche de compte refusée');
 perform test.as_system();
 raise notice 'TOUS LES TESTS POSTGRES ROLES : OK';
END $t$;
SQL
echo "PASS: roles-admin-mairie-integration"
