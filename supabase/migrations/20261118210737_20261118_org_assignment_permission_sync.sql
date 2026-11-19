create or replace function public.org_sa_affecter(
  p_commune text,p_personnel uuid,p_adjoint uuid,p_poste text,p_service text,p_debut date,p_fin date,p_motif text
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare c uuid:=public.org_gest(p_commune); sid uuid; r uuid; linked_user uuid; start_date date:=coalesce(p_debut,current_date);
begin
  if (p_personnel is null)=(p_adjoint is null) then raise exception 'Indiquez une personne du personnel ou un adjoint'; end if;
  if p_personnel is not null then select user_id into linked_user from public.personnel where id=p_personnel and commune_id=c and actif for key share; if not found then raise exception 'Personnel introuvable ou inactif dans cette commune'; end if; end if;
  if p_adjoint is not null then select user_id into linked_user from public.adjoints where id=p_adjoint and commune_id=c and actif for key share; if not found then raise exception 'Adjoint introuvable ou inactif dans cette commune'; end if; end if;
  perform 1 from public.org_postes where commune_id=c and code=p_poste and actif for key share;
  if not found then raise exception 'Poste introuvable ou inactif'; end if;
  if p_service is not null then select id into sid from public.services where commune_id=c and code=p_service and actif for key share; if sid is null then raise exception 'Service introuvable ou inactif'; end if; end if;
  insert into public.org_agent_affectations(commune_id,personnel_id,adjoint_id,poste_code,service_id,debut,fin,motif)
  values(c,p_personnel,p_adjoint,p_poste,sid,start_date,p_fin,p_motif) returning id into r;
  if linked_user is not null and exists(select 1 from public.profiles where id=linked_user and coalesce(actif,true)) then
    update public.org_affectations set service_code=p_service,fin=p_fin,actif=(p_fin is null or p_fin>=current_date)
    where commune_id=c and user_id=linked_user and poste_code=p_poste and debut=start_date;
    if not found then
      insert into public.org_affectations(commune_id,user_id,poste_code,service_code,debut,fin,actif,created_by)
      values(c,linked_user,p_poste,p_service,start_date,p_fin,(p_fin is null or p_fin>=current_date),auth.uid());
    end if;
  end if;
  perform public.org_log(c,'org_agent_affecter',p_poste,jsonb_build_object('id',r));
  return r;
end
$$;

create or replace function public.org_sa_affectation_fin(p_commune text,p_id uuid,p_fin date)
returns void language plpgsql security definer set search_path = ''
as $$
declare c uuid:=public.org_gest(p_commune); a record; linked_user uuid; ending date:=coalesce(p_fin,current_date);
begin
  select * into a from public.org_agent_affectations where id=p_id and commune_id=c for update;
  if not found then raise exception 'Affectation introuvable'; end if;
  if a.personnel_id is not null then select user_id into linked_user from public.personnel where id=a.personnel_id and commune_id=c; end if;
  if a.adjoint_id is not null then select user_id into linked_user from public.adjoints where id=a.adjoint_id and commune_id=c; end if;
  update public.org_agent_affectations set fin=ending where id=p_id and commune_id=c;
  if linked_user is not null then update public.org_affectations set fin=ending,actif=(ending>=current_date)
    where commune_id=c and user_id=linked_user and poste_code=a.poste_code and debut=a.debut; end if;
  perform public.org_log(c,'org_agent_affectation_fin',p_id::text,NULL);
end
$$;

create or replace function public.org_sync_user_affectations(p_user uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare c uuid;
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'Service role requis'; end if;
  select commune_id into c from public.profiles where id=p_user and coalesce(actif,true);
  if c is null then raise exception 'Compte actif introuvable'; end if;
  if exists(select 1 from public.personnel where user_id=p_user and commune_id=c and actif) then
    update public.org_affectations oa set service_code=(select s.code from public.services s where s.id=a.service_id and s.commune_id=c),fin=a.fin,actif=(a.fin is null or a.fin>=current_date)
    from public.org_agent_affectations a join public.personnel pe on pe.id=a.personnel_id
    where oa.commune_id=c and oa.user_id=p_user and a.commune_id=c and pe.commune_id=c and pe.user_id=p_user and pe.actif and oa.poste_code=a.poste_code and oa.debut=a.debut;
    insert into public.org_affectations(commune_id,user_id,poste_code,service_code,debut,fin,actif,created_by)
    select c,p_user,a.poste_code,(select s.code from public.services s where s.id=a.service_id and s.commune_id=c),a.debut,a.fin,(a.fin is null or a.fin>=current_date),null
    from public.org_agent_affectations a join public.personnel pe on pe.id=a.personnel_id
    where a.commune_id=c and pe.commune_id=c and pe.user_id=p_user and pe.actif
      and not exists(select 1 from public.org_affectations oa where oa.commune_id=c and oa.user_id=p_user and oa.poste_code=a.poste_code and oa.debut=a.debut);
  end if;
  if exists(select 1 from public.adjoints where user_id=p_user and commune_id=c and actif) then
    update public.org_affectations oa set service_code=(select s.code from public.services s where s.id=a.service_id and s.commune_id=c),fin=a.fin,actif=(a.fin is null or a.fin>=current_date)
    from public.org_agent_affectations a join public.adjoints ad on ad.id=a.adjoint_id
    where oa.commune_id=c and oa.user_id=p_user and a.commune_id=c and ad.commune_id=c and ad.user_id=p_user and ad.actif and oa.poste_code=a.poste_code and oa.debut=a.debut;
    insert into public.org_affectations(commune_id,user_id,poste_code,service_code,debut,fin,actif,created_by)
    select c,p_user,a.poste_code,(select s.code from public.services s where s.id=a.service_id and s.commune_id=c),a.debut,a.fin,(a.fin is null or a.fin>=current_date),null
    from public.org_agent_affectations a join public.adjoints ad on ad.id=a.adjoint_id
    where a.commune_id=c and ad.commune_id=c and ad.user_id=p_user and ad.actif
      and not exists(select 1 from public.org_affectations oa where oa.commune_id=c and oa.user_id=p_user and oa.poste_code=a.poste_code and oa.debut=a.debut);
  end if;
end
$$;

revoke all on function public.org_sync_user_affectations(uuid) from public,anon,authenticated;
grant execute on function public.org_sync_user_affectations(uuid) to service_role;