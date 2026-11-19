create or replace function private.org_service_ok() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.service_code is not null and (tg_op='INSERT' or new.service_code is distinct from old.service_code) then
  if not exists(select 1 from public.services s where s.commune_id=new.commune_id and s.code=new.service_code and coalesce(s.actif,true)) then
   raise exception 'Service inconnu ou inactif : %', new.service_code; end if; end if;
 return new; end $$;
revoke all on function private.org_service_ok() from public, anon, authenticated;
drop trigger if exists org_postes_service_ok on public.org_postes;
create trigger org_postes_service_ok before insert or update on public.org_postes for each row execute function private.org_service_ok();
drop trigger if exists org_aff_service_ok on public.org_affectations;
create trigger org_aff_service_ok before insert or update on public.org_affectations for each row execute function private.org_service_ok();
create or replace function public.org_service_save(p_code text,p_nom text,p_type text,p_parent text,p_responsable text,p_description text,p_actif boolean default true)
returns void language plpgsql security definer set search_path=public as $$
declare c uuid:=org_commune(); x text:=p_parent; n int:=0; pid uuid;
begin if c is null or not org_droit('org','administrer') then raise exception 'Accès refusé'; end if;
 if p_code !~ '^[a-z][a-z0-9_]{1,60}$' then raise exception 'Code invalide (minuscules, chiffres, _)'; end if;
 if length(trim(coalesce(p_nom,'')))<2 then raise exception 'Le nom est obligatoire'; end if;
 if p_parent is not null then
  select id into pid from services where commune_id=c and code=p_parent; if pid is null then raise exception 'Service parent introuvable'; end if;
  while x is not null and n<30 loop if x=p_code then raise exception 'Lien hiérarchique circulaire'; end if; select p2.code into x from services s join services p2 on p2.id=s.parent_id where s.commune_id=c and s.code=x; n:=n+1; end loop; end if;
 insert into services(commune_id,code,nom,type,parent_id,responsable,description,actif) values(c,p_code,trim(p_nom),coalesce(p_type,'service'),pid,nullif(trim(p_responsable),''),nullif(trim(p_description),''),coalesce(p_actif,true))
 on conflict(commune_id,code) do update set nom=excluded.nom,type=excluded.type,parent_id=excluded.parent_id,responsable=excluded.responsable,description=excluded.description,actif=excluded.actif;
 perform org_log(c,'org_service_save',p_code,jsonb_build_object('parent',p_parent,'actif',p_actif)); end $$;
create or replace function public.org_kpi() returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare c uuid:=org_commune(); r jsonb:='{}'; 
begin if c is null then return r; end if;
 r:=jsonb_build_object(
 'instr',(select count(*) from instructions where commune_id=c and statut in ('nouvelle','affectee','prise_en_charge','en_cours','en_attente')),
 'cin',(select count(*) from courrier where commune_id=c and statut in ('recu','a_traiter','a_repondre','a_signer','urgent','affecte','en_cours')),
 'actes',(select count(*) from actes where commune_id=c and statut in ('brouillon','preparation','validation')),
 'dossiers',(select count(*) from dossiers where commune_id=c and statut in ('ouvert','en_cours','en_attente')),
 'citoyens',(select count(*) from demandes where commune_id=c and statut in ('nouvelle','orientee','en_cours')),
 'marches',(select count(*) from marches where commune_id=c and statut in ('preparation','lance','evaluation','attribue','approuve','en_cours')),
 'projets',(select count(*) from projets where commune_id=c and statut in ('programme','en_cours','en_attente','en_retard')),
 'projets_retard',(select count(*) from projets where commune_id=c and statut='en_retard'),
 'conges',(select count(*) from conges where commune_id=c and statut='demande'),
 'paie',(select count(*) from paies where commune_id=c and statut in ('brouillon','valide')),
 'personnel',(select count(*) from personnel where commune_id=c and coalesce(actif,true)));
 return r; end $$;
revoke all on function public.org_service_save(text,text,text,text,text,text,boolean) from public, anon;
grant execute on function public.org_service_save(text,text,text,text,text,text,boolean) to authenticated;
revoke all on function public.org_kpi() from public, anon;
grant execute on function public.org_kpi() to authenticated;