-- Espace « admin municipal » limité à SA mairie : lecture (résumé, utilisateurs, journal) + identité.
-- Garde dédiée _garde_am : super-admin (règles existantes) OU admin_mairie ACTIF de la commune demandée.
-- Aucune écriture sur comptes/rôles/sauvegardes/maintenance/modules/sécurité n'est ouverte.
begin;
create or replace function public._garde_am(p_commune text)
returns void language plpgsql stable security definer set search_path = ''
as $$
begin
  if public.is_super_admin() then perform public._garde(p_commune); return; end if;
  if private.my_role()='admin_mairie'
     and p_commune is not distinct from (select p.commune_id::text from public.profiles p where p.id=(select auth.uid()) and coalesce(p.actif,false)) then
    return;
  end if;
  raise exception 'Accès refusé : administrateur de cette mairie requis' using errcode='42501';
end $$;
revoke all on function public._garde_am(text) from public, anon;

create or replace function public.am_resume(p_commune text) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare t text; n bigint; vol jsonb:='{}'::jsonb; u jsonb;
begin
  perform public._garde_am(p_commune);
  foreach t in array array['demandes','courrier','deliberations','actes','projets','publications','rdv','reunions'] loop
    if to_regclass('public.'||t) is not null and exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='commune_id') then
      execute format('select count(*) from public.%I where commune_id::text=$1',t) into n using p_commune;
      vol:=vol||jsonb_build_object(t,n);
    end if;
  end loop;
  select jsonb_build_object('users_total',count(*),'users_actifs',count(*) filter (where p.actif is not false)) into u from public.profiles p where p.commune_id::text=p_commune;
  return u||jsonb_build_object('volumes',vol);
end $$;

create or replace function public.am_utilisateurs(p_commune text) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public._garde_am(p_commune);
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
    select p.id,u.email,coalesce(p.nom,u.raw_user_meta_data->>'nom') nom,p.role::text role,p.service,p.actif,u.last_sign_in_at,u.created_at
    from public.profiles p join auth.users u on u.id=p.id where p.commune_id::text=p_commune) x),'[]'::jsonb);
end $$;

create or replace function public.am_journal(p_commune text) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public._garde_am(p_commune);
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
    select j.id,j.email,j.action,j.cible,j.created_at from public.journal_audit j where j.commune_id=p_commune order by j.created_at desc limit 200) x),'[]'::jsonb);
end $$;

revoke all on function public.am_resume(text), public.am_utilisateurs(text), public.am_journal(text) from public, anon;
grant execute on function public.am_resume(text), public.am_utilisateurs(text), public.am_journal(text) to authenticated;

-- Identité de la mairie (nom, slogan, devise, coordonnées) : même corps, garde élargie à l'admin municipal.
do $$
declare d text;
begin
  d:=pg_get_functiondef('public.sa_enregistrer_identite(text,jsonb)'::regprocedure);
  if position('public._garde(p_commune)' in d)>0 then
    execute replace(d,'public._garde(p_commune)','public._garde_am(p_commune)');
  end if;
end $$;
commit;
