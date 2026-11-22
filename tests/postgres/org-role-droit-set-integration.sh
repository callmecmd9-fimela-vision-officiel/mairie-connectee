#!/usr/bin/env bash
# Test PostgreSQL du correctif 20261121090000 (org_role_droit_set pour admin_mairie). Base JETABLE uniquement.
# Rejoue d'abord tests/postgres/roles-admin-mairie-integration.sh (schéma simulé + migration 20261120100000), puis applique le correctif.
set -euo pipefail
: "${PGHOST:?}" "${PGPORT:?}" "${PGUSER:?}" "${PGDATABASE:?}"; export PGSSLMODE=disable PGPASSWORD="${PGPASSWORD:-x}"
HERE="$(cd "$(dirname "$0")" && pwd)"
bash "$HERE/roles-admin-mairie-integration.sh" >/dev/null
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
-- Définitions réelles de production (lecture seule 2026-11-21) : org_droit_user (20261118210521), org_droit, org_log
create or replace function public.org_droit_user(u uuid,m text,a text) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(exists(select 1 from public.profiles p where p.id=u and coalesce(p.actif,true)) and (public.org_droit_propre(u,m,a)
   or exists(select 1 from public.org_delegations_droits d where d.a_user=u and d.module=m and d.action=a and d.revoque_le is null and now() between d.debut and d.fin
     and d.commune_id=(select p.commune_id from public.profiles p where p.id=u and coalesce(p.actif,true)) and public.org_droit_propre(d.de_user,m,a))),false) $$;
create or replace function public.org_droit(m text,a text) returns boolean language sql stable security definer set search_path='' as $$ select coalesce(public.org_droit_user((select auth.uid()),m,a),false) $$;
create or replace function public.org_log(c uuid,act text,cible text,det jsonb) returns void language sql security definer set search_path='' as $$
  insert into public.journal_audit(commune_id,user_id,email,action,cible,detail) values (c::text,auth.uid(),(select email from auth.users where id=auth.uid()),act,cible,det) $$;
-- Fonction AVANT correctif (identique à la production)
create or replace function public.org_role_droit_set(p_role text,p_module text,p_action text,p_on boolean) returns void language plpgsql security definer set search_path to '' as $f$
DECLARE c uuid:=public.org_commune(); u uuid:=(SELECT auth.uid());
BEGIN
  IF NOT public.org_droit('org','administrer') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF p_role='maire' OR NOT EXISTS(SELECT 1 FROM public.org_roles WHERE commune_id=c AND code=p_role) THEN RAISE EXCEPTION 'Rôle invalide'; END IF;
  IF p_on THEN IF NOT public.org_droit_propre(u,p_module,p_action) THEN RAISE EXCEPTION 'Vous ne pouvez accorder que les droits que vous détenez'; END IF;
    INSERT INTO public.org_role_droits(commune_id,role_code,module,action) VALUES(c,p_role,p_module,p_action) ON CONFLICT DO NOTHING;
  ELSE DELETE FROM public.org_role_droits WHERE commune_id=c AND role_code=p_role AND module=p_module AND action=p_action; END IF;
  PERFORM public.org_log(c,'org_role_droit',p_role,jsonb_build_object('module',p_module,'action',p_action,'accorde',p_on));
END $f$;
grant usage on schema test to public; grant execute on all functions in schema test to public;
grant usage on schema private to public;
do $t$ begin
  perform test.as_user(3);
  perform test.fails($q$select public.org_role_droit_set('secretaire','personnel','modifier',true)$q$,'AVANT correctif : anomalie reproduite (admin_mairie refusé)');
  perform test.as_system();
end $t$;
SQL
psql -X -v ON_ERROR_STOP=1 -q -f "$HERE/../../supabase/migrations/20261121090000_org_role_droit_set_admin_mairie.sql"
# rejouable (idempotent)
psql -X -v ON_ERROR_STOP=1 -q -f "$HERE/../../supabase/migrations/20261121090000_org_role_droit_set_admin_mairie.sql"
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
do $t$ declare A uuid:='aaaaaaaa-0000-0000-0000-00000000000a'; begin
  perform test.as_user(3);
  perform public.org_role_droit_set('secretaire','personnel','modifier',true);
  perform test.ok(exists(select 1 from public.org_role_droits where commune_id=A and role_code='secretaire' and module='personnel' and action='modifier'),'APRÈS : admin_mairie accorde un droit métier à un rôle de sa commune');
  perform public.org_role_droit_set('secretaire','personnel','modifier',true);
  perform test.ok((select count(*) from public.org_role_droits where role_code='secretaire' and module='personnel' and action='modifier')=1,'accord répété sans doublon fonctionnel (ON CONFLICT)');
  perform test.ok(exists(select 1 from public.journal_audit where action='org_role_droit' and (detail->>'accorde')='true'),'accord journalisé');
  perform test.fails($q$select public.org_role_droit_set('secretaire','org','administrer',true)$q$,'admin_mairie : org.administrer reste interdit (trigger)');
  perform test.fails($q$select public.org_role_droit_set('secretaire','org','modifier',true)$q$,'admin_mairie : org.modifier reste interdit');
  perform public.org_role_droit_set('secretaire','org','consulter',true);
  perform test.ok(true,'admin_mairie : org.consulter accordable');
  perform test.fails($q$select public.org_role_droit_set('maire','personnel','consulter',true)$q$,'rôle maire intouchable');
  perform test.fails($q$select public.org_role_droit_set('inexistant','personnel','consulter',true)$q$,'rôle inexistant refusé');
  perform test.fails($q$select public.org_role_droit_set('secretaire','','consulter',true)$q$,'module vide refusé');
  perform public.org_role_droit_set('secretaire','personnel','modifier',false);
  perform test.ok(not exists(select 1 from public.org_role_droits where role_code='secretaire' and module='personnel' and action='modifier'),'retrait du droit');
  -- isolation : l'admin B ne touche pas les rôles de A (rôle inexistant dans B)
  perform test.as_user(4);
  perform test.fails($q$select public.org_role_droit_set('secretaire','personnel','consulter',true)$q$,'admin B : rôle de A introuvable (isolation)');
  perform test.as_user(2);
  perform test.fails($q$select public.org_role_droit_set('secretaire','personnel','consulter',true)$q$,'maire : pas d''administration des droits');
  perform test.as_user(5);
  perform test.fails($q$select public.org_role_droit_set('secretaire','personnel','consulter',true)$q$,'agent : refusé');
  perform test.as_system();
  perform test.ok(not exists(select 1 from public.org_role_droits where commune_id='bbbbbbbb-0000-0000-0000-00000000000b'),'aucune fuite vers B');
  raise notice 'TOUS LES TESTS ORG_ROLE_DROIT_SET : OK';
end $t$;
SQL
echo "PASS: org-role-droit-set-integration"
