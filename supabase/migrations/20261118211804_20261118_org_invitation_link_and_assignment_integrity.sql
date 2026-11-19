create or replace function public.org_sa_lier_compte(p_commune text,p_personnel uuid,p_user uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
 c uuid:=public.org_gest(p_commune); old_user uuid; person_active boolean;
 profile_commune uuid; profile_role text; profile_active boolean; invite_pending boolean; linked_personnel uuid;
begin
 select user_id,actif into old_user,person_active from public.personnel where id=p_personnel and commune_id=c for update;
 if not found then raise exception 'Fiche introuvable dans cette commune'; end if;
 if p_user is not null then
  if not person_active then raise exception 'Une fiche inactive ne peut pas recevoir de compte'; end if;
  select p.commune_id,p.role::text,p.actif,coalesce(u.raw_user_meta_data->>'invite_pending','false')='true'
    into profile_commune,profile_role,profile_active,invite_pending
  from public.profiles p join auth.users u on u.id=p.id where p.id=p_user for key share of p;
  if not found or profile_commune is distinct from c or (not coalesce(profile_active,false) and not invite_pending) then
    raise exception 'Compte inexistant, inactif ou hors de cette commune';
  end if;
  if profile_role='super_admin' or exists(select 1 from public.platform_admins where user_id=p_user) then
    raise exception 'Un compte administrateur ne peut pas être lié à une fiche RH';
  end if;
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
  from public.org_agent_affectations a where oa.commune_id=c and oa.user_id=p_user and a.commune_id=c and a.personnel_id=p_personnel and oa.poste_code=a.poste_code and oa.debut=a.debut;
  insert into public.org_affectations(commune_id,user_id,poste_code,service_code,debut,fin,actif,created_by)
  select c,p_user,a.poste_code,(select s.code from public.services s where s.id=a.service_id and s.commune_id=c),a.debut,a.fin,(a.fin is null or a.fin>=current_date),auth.uid()
  from public.org_agent_affectations a where a.commune_id=c and a.personnel_id=p_personnel
   and not exists(select 1 from public.org_affectations oa where oa.commune_id=c and oa.user_id=p_user and oa.poste_code=a.poste_code and oa.debut=a.debut);
 end if;
 perform public.org_log(c,'org_agent_lien_compte',p_personnel::text,jsonb_build_object('user',p_user,'invite_inactif_accepte',p_user is not null and not coalesce(profile_active,false)));
end
$$;

create or replace function public.org_sa_lier_adjoint_compte(p_commune text,p_adjoint uuid,p_user uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
 c uuid:=public.org_gest(p_commune); old_user uuid; adjoint_active boolean;
 profile_commune uuid; profile_role text; profile_active boolean; invite_pending boolean; linked_adjoint uuid;
begin
 select user_id,actif into old_user,adjoint_active from public.adjoints where id=p_adjoint and commune_id=c for update;
 if not found then raise exception 'Adjoint introuvable dans cette commune'; end if;
 if p_user is not null then
  if not adjoint_active then raise exception 'Un adjoint inactif ne peut pas recevoir de compte'; end if;
  select p.commune_id,p.role::text,p.actif,coalesce(u.raw_user_meta_data->>'invite_pending','false')='true'
   into profile_commune,profile_role,profile_active,invite_pending
  from public.profiles p join auth.users u on u.id=p.id where p.id=p_user for key share of p;
  if not found or profile_commune is distinct from c or profile_role<>'adjoint'
     or (not coalesce(profile_active,false) and not invite_pending) then
    raise exception 'Le compte doit être un compte adjoint de cette commune, actif ou en attente d’invitation';
  end if;
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
  from public.org_agent_affectations a where oa.commune_id=c and oa.user_id=p_user and a.commune_id=c and a.adjoint_id=p_adjoint and oa.poste_code=a.poste_code and oa.debut=a.debut;
  insert into public.org_affectations(commune_id,user_id,poste_code,service_code,debut,fin,actif,created_by)
  select c,p_user,a.poste_code,(select s.code from public.services s where s.id=a.service_id and s.commune_id=c),a.debut,a.fin,(a.fin is null or a.fin>=current_date),auth.uid()
  from public.org_agent_affectations a where a.commune_id=c and a.adjoint_id=p_adjoint
   and not exists(select 1 from public.org_affectations oa where oa.commune_id=c and oa.user_id=p_user and oa.poste_code=a.poste_code and oa.debut=a.debut);
 end if;
 perform public.org_log(c,'org_adjoint_lien_compte',p_adjoint::text,jsonb_build_object('user',p_user,'invite_inactif_accepte',p_user is not null and not coalesce(profile_active,false)));
end
$$;

create or replace function public.org_sa_affecter(
 p_commune text,p_personnel uuid,p_adjoint uuid,p_poste text,p_service text,p_debut date,p_fin date,p_motif text
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare c uuid:=public.org_gest(p_commune); sid uuid; r uuid; linked_user uuid; start_date date:=coalesce(p_debut,current_date);
begin
 if (p_personnel is null)=(p_adjoint is null) then raise exception 'Indiquez une personne du personnel ou un adjoint'; end if;
 if p_fin is not null and p_fin<start_date then raise exception 'La date de fin précède la date de début'; end if;
 if p_personnel is not null then select user_id into linked_user from public.personnel where id=p_personnel and commune_id=c and actif for key share; if not found then raise exception 'Personnel introuvable ou inactif dans cette commune'; end if; end if;
 if p_adjoint is not null then select user_id into linked_user from public.adjoints where id=p_adjoint and commune_id=c and actif for key share; if not found then raise exception 'Adjoint introuvable ou inactif dans cette commune'; end if; end if;
 perform 1 from public.org_postes where commune_id=c and code=p_poste and actif for key share;
 if not found then raise exception 'Poste introuvable ou inactif'; end if;
 if p_service is not null then select id into sid from public.services where commune_id=c and code=p_service and actif for key share; if sid is null then raise exception 'Service introuvable ou inactif'; end if; end if;
 if exists(
  select 1 from public.org_agent_affectations a
  where a.commune_id=c and a.poste_code=p_poste
   and ((p_personnel is not null and a.personnel_id=p_personnel) or (p_adjoint is not null and a.adjoint_id=p_adjoint))
   and daterange(a.debut,coalesce(a.fin,'infinity'::date),'[]') && daterange(start_date,coalesce(p_fin,'infinity'::date),'[]')
 ) then raise exception 'Cette personne occupe déjà ce poste sur une période qui se chevauche'; end if;
 insert into public.org_agent_affectations(commune_id,personnel_id,adjoint_id,poste_code,service_id,debut,fin,motif)
 values(c,p_personnel,p_adjoint,p_poste,sid,start_date,p_fin,p_motif) returning id into r;
 if linked_user is not null and exists(select 1 from public.profiles where id=linked_user and coalesce(actif,true)) then
  update public.org_affectations set service_code=p_service,fin=p_fin,actif=(p_fin is null or p_fin>=current_date)
  where commune_id=c and user_id=linked_user and poste_code=p_poste and debut=start_date;
  if not found then insert into public.org_affectations(commune_id,user_id,poste_code,service_code,debut,fin,actif,created_by)
   values(c,linked_user,p_poste,p_service,start_date,p_fin,(p_fin is null or p_fin>=current_date),auth.uid()); end if;
 end if;
 perform public.org_log(c,'org_agent_affecter',p_poste,jsonb_build_object('id',r));
 return r;
end
$$;

revoke all on function public.org_sa_lier_compte(text,uuid,uuid) from public,anon;
revoke all on function public.org_sa_lier_adjoint_compte(text,uuid,uuid) from public,anon;
grant execute on function public.org_sa_lier_compte(text,uuid,uuid) to authenticated;
grant execute on function public.org_sa_lier_adjoint_compte(text,uuid,uuid) to authenticated;