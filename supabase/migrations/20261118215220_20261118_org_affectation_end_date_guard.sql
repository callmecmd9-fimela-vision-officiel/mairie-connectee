create or replace function public.org_sa_affectation_fin(p_commune text,p_id uuid,p_fin date)
returns void language plpgsql security definer set search_path = ''
as $$
declare c uuid:=public.org_gest(p_commune); a record; linked_user uuid; ending date:=coalesce(p_fin,current_date);
begin
 select * into a from public.org_agent_affectations where id=p_id and commune_id=c for update;
 if not found then raise exception 'Affectation introuvable'; end if;
 if ending<a.debut then raise exception 'La date de fin précède la date de début'; end if;
 if a.personnel_id is not null then select user_id into linked_user from public.personnel where id=a.personnel_id and commune_id=c; end if;
 if a.adjoint_id is not null then select user_id into linked_user from public.adjoints where id=a.adjoint_id and commune_id=c; end if;
 update public.org_agent_affectations set fin=ending where id=p_id and commune_id=c;
 if linked_user is not null then
  update public.org_affectations set fin=ending,actif=(ending>=current_date)
  where commune_id=c and user_id=linked_user and poste_code=a.poste_code and debut=a.debut;
 end if;
 perform public.org_log(c,'org_agent_affectation_fin',p_id::text,NULL);
end
$$;