create or replace function public.org_sa_roles(p_commune text)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare c uuid := public.org_gest(p_commune);
begin
  return jsonb_build_object(
    'roles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code',r.code,'nom',r.nom,'famille',r.famille,
        'description',r.description,'systeme',r.systeme,'actif',r.actif
      ) order by r.systeme desc,r.nom)
      from public.org_roles r where r.commune_id=c
    ),'[]'::jsonb),
    'droits', coalesce((
      select jsonb_agg(jsonb_build_object(
        'role_code',d.role_code,'module',d.module,'action',d.action
      ) order by d.role_code,d.module,d.action)
      from public.org_role_droits d where d.commune_id=c
    ),'[]'::jsonb)
  );
end
$$;

create or replace function public.org_sa_role_save(
  p_commune text,p_code text,p_nom text,p_desc text,p_actif boolean default true
) returns void language plpgsql security definer set search_path = ''
as $$
declare c uuid:=public.org_gest(p_commune); platform_admin boolean:=coalesce(private.is_platform_admin(),false); existing_systeme boolean;
begin
  if not platform_admin and not public.is_super_admin() and not public.org_droit('org','administrer') then raise exception 'Accès refusé'; end if;
  if p_code is null or p_code !~ '^[a-z][a-z0-9_]{1,40}$' or p_code='maire' then raise exception 'Code de rôle invalide ou protégé'; end if;
  if length(trim(coalesce(p_nom,'')))<2 then raise exception 'Nom du rôle obligatoire'; end if;
  select systeme into existing_systeme from public.org_roles where commune_id=c and code=p_code for update;
  if coalesce(existing_systeme,false) then raise exception 'Un rôle système ne peut pas être modifié ici'; end if;
  if p_actif is false and exists(select 1 from public.org_postes where commune_id=c and role_code=p_code and actif) then
    raise exception 'Réaffectez d’abord les postes actifs avant de désactiver ce rôle';
  end if;
  insert into public.org_roles(commune_id,code,nom,description,systeme,actif)
  values(c,p_code,trim(p_nom),p_desc,false,coalesce(p_actif,true))
  on conflict(commune_id,code) do update set nom=excluded.nom,description=excluded.description,actif=excluded.actif;
  perform public.org_log(c,'org_role_save',p_code,jsonb_build_object('nom',p_nom,'actif',p_actif));
end
$$;

create or replace function public.org_sa_role_droit_set(
  p_commune text,p_role text,p_module text,p_action text,p_on boolean
) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  c uuid := public.org_gest(p_commune);
  platform_admin boolean := coalesce(private.is_platform_admin(),false);
  modules text[] := array['cabinet','instr','rapports','cin','cout','actes','dossiers','archives','conseil','citoyens','pub','med','budget','marches','regie','personnel','conges','paie','remun','projets','territoire','patrimoine','civil','params','deleg','org'];
  actions text[] := array['consulter','creer','modifier','supprimer','valider','rejeter','signer','exporter','imprimer','partager','administrer'];
begin
  if not platform_admin and not public.is_super_admin() and not public.org_droit('org','administrer') then raise exception 'Accès refusé'; end if;
  if p_role='maire' or not exists(
    select 1 from public.org_roles r where r.commune_id=c and r.code=p_role and r.actif
  ) then raise exception 'Rôle invalide ou protégé'; end if;
  if not (p_module=any(modules)) or not (p_action=any(actions)) then raise exception 'Module ou action invalide'; end if;
  if p_on then
    if not platform_admin and not public.is_super_admin() and not public.org_droit_propre((select auth.uid()),p_module,p_action) then
      raise exception 'Vous ne pouvez accorder que les droits que vous détenez';
    end if;
    insert into public.org_role_droits(commune_id,role_code,module,action)
    values(c,p_role,p_module,p_action) on conflict do nothing;
  else
    delete from public.org_role_droits
    where commune_id=c and role_code=p_role and module=p_module and action=p_action;
  end if;
  perform public.org_log(c,'org_role_droit',p_role,
    jsonb_build_object('module',p_module,'action',p_action,'accorde',p_on));
end
$$;

create or replace function public.org_sa_agent_save(
  p_commune text,p_id uuid,p_prenom text,p_nom text,p_fonction text,p_service text,
  p_contrat text,p_tel text,p_email text,p_matricule text,p_obs text,p_actif boolean
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare c uuid:=public.org_gest(p_commune); sid uuid; sn text; r uuid; linked_user uuid; linked_role text;
begin
  if length(trim(coalesce(p_prenom,'')))<1 or length(trim(coalesce(p_nom,'')))<1 then raise exception 'Prénom et nom obligatoires'; end if;
  if p_service is not null then select id,nom into sid,sn from public.services where commune_id=c and code=p_service and actif; if sid is null then raise exception 'Service introuvable ou inactif'; end if; end if;
  if p_id is null then
    insert into public.personnel(commune_id,prenom,nom,fonction,service,service_id,type_contrat,telephone,email,matricule,observations,actif)
    values(c,trim(p_prenom),trim(p_nom),p_fonction,sn,sid,coalesce(p_contrat,'Permanent'),p_tel,p_email,p_matricule,p_obs,coalesce(p_actif,true)) returning id into r;
  else
    update public.personnel set prenom=trim(p_prenom),nom=trim(p_nom),fonction=p_fonction,service=sn,service_id=sid,
      type_contrat=coalesce(p_contrat,type_contrat),telephone=p_tel,email=p_email,matricule=p_matricule,observations=p_obs,
      actif=coalesce(p_actif,actif),date_sortie=case when p_actif is false then coalesce(date_sortie,current_date) when p_actif is true then null else date_sortie end
    where id=p_id and commune_id=c returning id,user_id into r,linked_user;
    if r is null then raise exception 'Fiche introuvable'; end if;
  end if;
  if p_actif is false then
    if linked_user is not null then
      select role::text into linked_role from public.profiles where id=linked_user;
      if linked_role in ('maire','adjoint','super_admin') or exists(select 1 from public.platform_admins where user_id=linked_user and actif) then
        raise exception 'Ce compte exerce une fonction protégée ; procédez à son remplacement selon la procédure de la commune';
      end if;
    end if;
    update public.org_agent_affectations set fin=current_date where commune_id=c and personnel_id=r and debut<=current_date and (fin is null or fin>=current_date);
    if linked_user is not null then
      update public.org_affectations oa set fin=case when oa.debut<=current_date then current_date else oa.fin end,actif=false
      where oa.commune_id=c and oa.user_id=linked_user and oa.actif
        and exists(select 1 from public.org_agent_affectations a where a.commune_id=c and a.personnel_id=r and a.poste_code=oa.poste_code and a.debut=oa.debut);
      update public.profiles set actif=false where id=linked_user;
    end if;
  end if;
  perform public.org_log(c,'org_agent_save',r::text,jsonb_build_object('actif',p_actif));
  return r;
end
$$;

create or replace function public.org_sa_lier_compte(p_commune text,p_personnel uuid,p_user uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare c uuid:=public.org_gest(p_commune); old_user uuid; person_active boolean; profile_commune uuid; profile_role text; linked_personnel uuid;
begin
  select user_id,actif into old_user,person_active from public.personnel where id=p_personnel and commune_id=c for update;
  if not found then raise exception 'Fiche introuvable dans cette commune'; end if;
  if p_user is not null then
    if not person_active then raise exception 'Une fiche inactive ne peut pas recevoir de compte'; end if;
    select commune_id,role::text into profile_commune,profile_role from public.profiles where id=p_user and coalesce(actif,true) for key share;
    if not found or profile_commune is distinct from c then raise exception 'Compte inexistant, inactif ou hors de cette commune'; end if;
    if profile_role='super_admin' or exists(select 1 from public.platform_admins where user_id=p_user) then raise exception 'Un compte administrateur ne peut pas être lié à une fiche RH'; end if;
    select id into linked_personnel from public.personnel where user_id=p_user and id<>p_personnel for update;
    if found then raise exception 'Ce compte est déjà lié à une autre fiche du personnel'; end if;
  end if;
  update public.personnel set user_id=p_user where id=p_personnel and commune_id=c;
  if old_user is not null and old_user is distinct from p_user then
    update public.org_affectations oa set fin=case when oa.debut<=current_date then current_date else oa.fin end,actif=false
    where oa.commune_id=c and oa.user_id=old_user and oa.actif
      and exists(select 1 from public.org_agent_affectations a where a.commune_id=c and a.personnel_id=p_personnel and a.poste_code=oa.poste_code and a.debut=oa.debut);
  end if;
  if p_user is not null then
    update public.org_affectations oa set service_code=(select s.code from public.services s where s.id=a.service_id and s.commune_id=c),fin=a.fin,actif=(a.fin is null or a.fin>=current_date)
    from public.org_agent_affectations a
    where oa.commune_id=c and oa.user_id=p_user and a.commune_id=c and a.personnel_id=p_personnel and oa.poste_code=a.poste_code and oa.debut=a.debut;
    insert into public.org_affectations(commune_id,user_id,poste_code,service_code,debut,fin,actif,created_by)
    select c,p_user,a.poste_code,(select s.code from public.services s where s.id=a.service_id and s.commune_id=c),a.debut,a.fin,(a.fin is null or a.fin>=current_date),auth.uid()
    from public.org_agent_affectations a
    where a.commune_id=c and a.personnel_id=p_personnel
      and not exists(select 1 from public.org_affectations oa where oa.commune_id=c and oa.user_id=p_user and oa.poste_code=a.poste_code and oa.debut=a.debut);
  end if;
  perform public.org_log(c,'org_agent_lien_compte',p_personnel::text,jsonb_build_object('user',p_user));
end
$$;

create or replace function public.org_sa_lier_adjoint_compte(p_commune text,p_adjoint uuid,p_user uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare c uuid:=public.org_gest(p_commune); old_user uuid; adjoint_active boolean; profile_commune uuid; profile_role text; linked_adjoint uuid;
begin
  select user_id,actif into old_user,adjoint_active from public.adjoints where id=p_adjoint and commune_id=c for update;
  if not found then raise exception 'Adjoint introuvable dans cette commune'; end if;
  if p_user is not null then
    if not adjoint_active then raise exception 'Un adjoint inactif ne peut pas recevoir de compte'; end if;
    select commune_id,role::text into profile_commune,profile_role from public.profiles where id=p_user and coalesce(actif,true) for key share;
    if not found or profile_commune is distinct from c or profile_role<>'adjoint' then raise exception 'Le compte doit être actif, rattaché à cette commune et avoir le rôle adjoint'; end if;
    if exists(select 1 from public.platform_admins where user_id=p_user) then raise exception 'Compte plateforme interdit'; end if;
    if exists(select 1 from public.personnel where user_id=p_user) then raise exception 'Compte déjà lié à une fiche du personnel'; end if;
    select id into linked_adjoint from public.adjoints where user_id=p_user and id<>p_adjoint for update;
    if found then raise exception 'Ce compte est déjà lié à un autre adjoint'; end if;
  end if;
  update public.adjoints set user_id=p_user where id=p_adjoint and commune_id=c;
  if old_user is not null and old_user is distinct from p_user then
    update public.org_affectations oa set fin=case when oa.debut<=current_date then current_date else oa.fin end,actif=false
    where oa.commune_id=c and oa.user_id=old_user and oa.actif
      and exists(select 1 from public.org_agent_affectations a where a.commune_id=c and a.adjoint_id=p_adjoint and a.poste_code=oa.poste_code and a.debut=oa.debut);
  end if;
  if p_user is not null then
    update public.org_affectations oa set service_code=(select s.code from public.services s where s.id=a.service_id and s.commune_id=c),fin=a.fin,actif=(a.fin is null or a.fin>=current_date)
    from public.org_agent_affectations a
    where oa.commune_id=c and oa.user_id=p_user and a.commune_id=c and a.adjoint_id=p_adjoint and oa.poste_code=a.poste_code and oa.debut=a.debut;
    insert into public.org_affectations(commune_id,user_id,poste_code,service_code,debut,fin,actif,created_by)
    select c,p_user,a.poste_code,(select s.code from public.services s where s.id=a.service_id and s.commune_id=c),a.debut,a.fin,(a.fin is null or a.fin>=current_date),auth.uid()
    from public.org_agent_affectations a
    where a.commune_id=c and a.adjoint_id=p_adjoint
      and not exists(select 1 from public.org_affectations oa where oa.commune_id=c and oa.user_id=p_user and oa.poste_code=a.poste_code and oa.debut=a.debut);
  end if;
  perform public.org_log(c,'org_adjoint_lien_compte',p_adjoint::text,jsonb_build_object('user',p_user));
end
$$;

revoke all on function public.org_sa_roles(text) from public,anon;
revoke all on function public.org_sa_role_save(text,text,text,text,boolean) from public,anon;
revoke all on function public.org_sa_role_droit_set(text,text,text,text,boolean) from public,anon;
revoke all on function public.org_sa_agent_save(text,uuid,text,text,text,text,text,text,text,text,text,boolean) from public,anon;
revoke all on function public.org_sa_lier_adjoint_compte(text,uuid,uuid) from public,anon;
grant execute on function public.org_sa_roles(text) to authenticated;
grant execute on function public.org_sa_role_save(text,text,text,text,boolean) to authenticated;
grant execute on function public.org_sa_role_droit_set(text,text,text,text,boolean) to authenticated;
grant execute on function public.org_sa_agent_save(text,uuid,text,text,text,text,text,text,text,text,text,boolean) to authenticated;
grant execute on function public.org_sa_lier_adjoint_compte(text,uuid,uuid) to authenticated;