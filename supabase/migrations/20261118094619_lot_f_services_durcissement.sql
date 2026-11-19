drop function if exists public.org_service_save(text,text,text,text,text,text,boolean);
create or replace function public.org_service_save(p_code text,p_nom text,p_type text,p_parent text,p_responsable text,p_description text,p_actif boolean default true,p_ordre integer default null,p_effectif integer default null)
returns void language plpgsql security definer set search_path to 'public' as $$
declare c uuid:=org_commune(); x text:=p_parent; n int:=0; pid uuid; sid uuid; cur boolean;
begin if c is null or not org_droit('org','administrer') then raise exception 'Accès refusé'; end if;
 if p_code !~ '^[a-z][a-z0-9_]{1,60}$' then raise exception 'Code invalide (minuscules, chiffres, _)'; end if;
 if length(trim(coalesce(p_nom,'')))<2 then raise exception 'Le nom est obligatoire'; end if;
 if p_ordre is not null and p_ordre<0 then raise exception 'Ordre invalide'; end if;
 if p_effectif is not null and p_effectif<0 then raise exception 'Effectif invalide'; end if;
 if p_parent is not null then
  select id into pid from services where commune_id=c and code=p_parent; if pid is null then raise exception 'Service parent introuvable'; end if;
  while x is not null and n<30 loop if x=p_code then raise exception 'Lien hiérarchique circulaire'; end if; select p2.code into x from services s join services p2 on p2.id=s.parent_id where s.commune_id=c and s.code=x; n:=n+1; end loop; end if;
 select id,actif into sid,cur from services where commune_id=c and code=p_code;
 if sid is not null and coalesce(cur,true) and not coalesce(p_actif,true) then
  if exists(select 1 from org_postes where commune_id=c and service_code=p_code and coalesce(actif,true))
   or exists(select 1 from org_affectations where commune_id=c and service_code=p_code and coalesce(actif,true))
   or exists(select 1 from services where commune_id=c and parent_id=sid and coalesce(actif,true))
  then raise exception 'Service utilisé (postes, agents ou sous-services actifs) : désactivation refusée'; end if; end if;
 insert into services(commune_id,code,nom,type,parent_id,responsable,description,actif,ordre,effectif) values(c,p_code,trim(p_nom),coalesce(p_type,'service'),pid,nullif(trim(p_responsable),''),nullif(trim(p_description),''),coalesce(p_actif,true),coalesce(p_ordre,0),p_effectif)
 on conflict(commune_id,code) do update set nom=excluded.nom,type=excluded.type,parent_id=excluded.parent_id,responsable=excluded.responsable,description=excluded.description,actif=excluded.actif,ordre=coalesce(p_ordre,services.ordre),effectif=coalesce(p_effectif,services.effectif);
 perform org_log(c,'org_service_save',p_code,jsonb_build_object('parent',p_parent,'actif',p_actif)); end $$;
revoke all on function public.org_service_save(text,text,text,text,text,text,boolean,integer,integer) from public,anon;
grant execute on function public.org_service_save(text,text,text,text,text,text,boolean,integer,integer) to authenticated;
drop policy if exists services_ecriture on public.services;
revoke insert,update,delete on public.services from authenticated,anon;