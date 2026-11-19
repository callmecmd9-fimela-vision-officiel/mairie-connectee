-- Lot F2 : RPC de gestion organigramme/personnel (super_admin ou maire de la commune ; commune résolue par slug)
create or replace function public.org_gest(p_slug text) returns uuid language plpgsql stable security definer set search_path=public,pg_temp as $$
declare c uuid;
begin select id into c from communes where slug=p_slug;
 if c is null then raise exception 'Commune introuvable'; end if;
 if not (public.is_super_admin() or (private.my_role()='maire' and private.my_commune()=c)) then raise exception 'Accès refusé'; end if;
 return c; end $$;

create or replace function public.org_sa_service_save(p_commune text,p_code text,p_nom text,p_type text,p_parent text,p_responsable text,p_ordre int,p_actif boolean)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare c uuid:=public.org_gest(p_commune); pid uuid; sid uuid; x uuid; n int:=0;
begin
 if length(trim(coalesce(p_nom,'')))<2 then raise exception 'Nom obligatoire'; end if;
 if p_parent is not null then select id into pid from services where commune_id=c and code=p_parent; if pid is null then raise exception 'Service parent introuvable'; end if; end if;
 select id into sid from services where commune_id=c and code=p_code;
 x:=pid; while x is not null and n<30 loop if x=sid then raise exception 'Lien hiérarchique circulaire'; end if; select parent_id into x from services where id=x; n:=n+1; end loop;
 insert into services(commune_id,code,nom,type,parent_id,responsable,ordre,actif) values(c,p_code,trim(p_nom),coalesce(p_type,'service'),pid,p_responsable,coalesce(p_ordre,0),coalesce(p_actif,true))
 on conflict(commune_id,code) do update set nom=excluded.nom,type=excluded.type,parent_id=excluded.parent_id,responsable=excluded.responsable,ordre=excluded.ordre,actif=excluded.actif
 returning id into sid;
 perform public.org_log(c,'org_service_save',p_code,jsonb_build_object('type',p_type,'actif',p_actif));
 return sid; end $$;

create or replace function public.org_sa_poste_save(p_commune text,p_code text,p_nom text,p_famille text,p_role text,p_parent text,p_service text,p_actif boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare c uuid:=public.org_gest(p_commune); x text:=p_parent; n int:=0;
begin
 if p_code !~ '^[a-z][a-z0-9_]{1,40}$' then raise exception 'Code de poste invalide'; end if;
 if length(trim(coalesce(p_nom,'')))<2 then raise exception 'Intitulé obligatoire'; end if;
 if not exists(select 1 from org_roles where commune_id=c and code=p_role and actif) then raise exception 'Rôle invalide'; end if;
 if p_parent is not null and not exists(select 1 from org_postes where commune_id=c and code=p_parent) then raise exception 'Poste supérieur introuvable'; end if;
 if p_service is not null and not exists(select 1 from services where commune_id=c and code=p_service) then raise exception 'Service introuvable'; end if;
 while x is not null and n<30 loop if x=p_code then raise exception 'Lien hiérarchique circulaire'; end if; select parent_code into x from org_postes where commune_id=c and code=x; n:=n+1; end loop;
 insert into org_postes(commune_id,code,nom,famille,role_code,parent_code,service_code,actif) values(c,p_code,trim(p_nom),p_famille,p_role,p_parent,p_service,coalesce(p_actif,true))
 on conflict(commune_id,code) do update set nom=excluded.nom,famille=excluded.famille,role_code=excluded.role_code,parent_code=excluded.parent_code,service_code=excluded.service_code,actif=excluded.actif;
 perform public.org_log(c,'org_poste_save',p_code,jsonb_build_object('role',p_role,'parent',p_parent,'actif',p_actif)); end $$;

create or replace function public.org_sa_agent_save(p_commune text,p_id uuid,p_prenom text,p_nom text,p_fonction text,p_service text,p_contrat text,p_tel text,p_email text,p_matricule text,p_obs text,p_actif boolean)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare c uuid:=public.org_gest(p_commune); sid uuid; sn text; r uuid;
begin
 if length(trim(coalesce(p_prenom,'')))<1 or length(trim(coalesce(p_nom,'')))<1 then raise exception 'Prénom et nom obligatoires'; end if;
 if p_service is not null then select id,nom into sid,sn from services where commune_id=c and code=p_service; if sid is null then raise exception 'Service introuvable'; end if; end if;
 if p_id is null then
  insert into personnel(commune_id,prenom,nom,fonction,service,service_id,type_contrat,telephone,email,matricule,observations,actif)
  values(c,trim(p_prenom),trim(p_nom),p_fonction,sn,sid,coalesce(p_contrat,'Permanent'),p_tel,p_email,p_matricule,p_obs,coalesce(p_actif,true)) returning id into r;
 else
  update personnel set prenom=trim(p_prenom),nom=trim(p_nom),fonction=p_fonction,service=sn,service_id=sid,type_contrat=coalesce(p_contrat,type_contrat),telephone=p_tel,email=p_email,matricule=p_matricule,observations=p_obs,
   actif=coalesce(p_actif,actif),date_sortie=case when p_actif is false then coalesce(date_sortie,current_date) when p_actif is true then null else date_sortie end
  where id=p_id and commune_id=c returning id into r;
  if r is null then raise exception 'Fiche introuvable'; end if;
 end if;
 perform public.org_log(c,'org_agent_save',r::text,null); return r; end $$;

create or replace function public.org_sa_affecter(p_commune text,p_personnel uuid,p_adjoint uuid,p_poste text,p_service text,p_debut date,p_fin date,p_motif text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare c uuid:=public.org_gest(p_commune); sid uuid; r uuid;
begin
 if (p_personnel is null)=(p_adjoint is null) then raise exception 'Indiquez une personne du personnel ou un adjoint'; end if;
 if not exists(select 1 from org_postes where commune_id=c and code=p_poste and actif) then raise exception 'Poste introuvable ou inactif'; end if;
 if p_service is not null then select id into sid from services where commune_id=c and code=p_service; if sid is null then raise exception 'Service introuvable'; end if; end if;
 insert into org_agent_affectations(commune_id,personnel_id,adjoint_id,poste_code,service_id,debut,fin,motif) values(c,p_personnel,p_adjoint,p_poste,sid,coalesce(p_debut,current_date),p_fin,p_motif) returning id into r;
 perform public.org_log(c,'org_agent_affecter',p_poste,jsonb_build_object('id',r)); return r; end $$;

create or replace function public.org_sa_affectation_fin(p_commune text,p_id uuid,p_fin date)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare c uuid:=public.org_gest(p_commune);
begin update org_agent_affectations set fin=coalesce(p_fin,current_date) where id=p_id and commune_id=c;
 if not found then raise exception 'Affectation introuvable'; end if;
 perform public.org_log(c,'org_agent_affectation_fin',p_id::text,null); end $$;

create or replace function public.org_sa_lier_compte(p_commune text,p_personnel uuid,p_user uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare c uuid:=public.org_gest(p_commune);
begin
 if p_user is not null and not exists(select 1 from profiles where id=p_user and commune_id=c) then raise exception 'Compte inexistant dans cette commune'; end if;
 update personnel set user_id=p_user where id=p_personnel and commune_id=c;
 if not found then raise exception 'Fiche introuvable'; end if;
 perform public.org_log(c,'org_agent_lien_compte',p_personnel::text,jsonb_build_object('user',p_user)); end $$;

create or replace function public.org_sa_doublons(p_commune text)
returns table(a uuid,b uuid,nom_a text,nom_b text,raison text) language plpgsql stable security definer set search_path=public,pg_temp as $$
declare c uuid:=public.org_gest(p_commune);
begin return query
 select x.id,y.id,x.prenom||' '||x.nom,y.prenom||' '||y.nom,
  case when translate(lower(x.prenom||' '||x.nom),'àâäéèêëîïôöùûüç','aaaeeeeiioouuuc')=translate(lower(y.prenom||' '||y.nom),'àâäéèêëîïôöùûüç','aaaeeeeiioouuuc') then 'Même nom et prénom' else 'Même téléphone ou e-mail' end
 from personnel x join personnel y on x.commune_id=y.commune_id and x.id<y.id
 where x.commune_id=c and x.fusionne_dans is null and y.fusionne_dans is null
  and (translate(lower(x.prenom||' '||x.nom),'àâäéèêëîïôöùûüç','aaaeeeeiioouuuc')=translate(lower(y.prenom||' '||y.nom),'àâäéèêëîïôöùûüç','aaaeeeeiioouuuc')
   or (x.telephone is not null and x.telephone<>'' and x.telephone=y.telephone) or (x.email is not null and x.email<>'' and lower(x.email)=lower(y.email))); end $$;

create or replace function public.org_sa_fusionner(p_commune text,p_garde uuid,p_absorbe uuid,p_confirme boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare c uuid:=public.org_gest(p_commune); u uuid;
begin
 if p_confirme is not true then raise exception 'Fusion non confirmée : vérifiez que les deux fiches sont la même personne'; end if;
 if p_garde=p_absorbe then raise exception 'Fiches identiques'; end if;
 if (select count(*) from personnel where id in (p_garde,p_absorbe) and commune_id=c and fusionne_dans is null)<>2 then raise exception 'Fiches introuvables ou déjà fusionnées'; end if;
 if exists(select 1 from remunerations where personnel_id=p_absorbe) or exists(select 1 from conges where personnel_id=p_absorbe) or exists(select 1 from conges_droits where personnel_id=p_absorbe) or exists(select 1 from paie_lignes where personnel_id=p_absorbe)
  then raise exception 'La fiche à absorber a des données RH (paie, congés, rémunération) : fusion manuelle requise'; end if;
 select user_id into u from personnel where id=p_absorbe;
 update personnel set user_id=null where id=p_absorbe;
 update personnel set user_id=coalesce(user_id,u) where id=p_garde;
 update org_agent_affectations set personnel_id=p_garde where personnel_id=p_absorbe;
 update personnel set actif=false,date_sortie=coalesce(date_sortie,current_date),fusionne_dans=p_garde where id=p_absorbe;
 perform public.org_log(c,'org_agent_fusion',p_absorbe::text,jsonb_build_object('vers',p_garde)); end $$;

create or replace function public.org_sa_organigramme(p_commune text) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare c uuid:=public.org_gest(p_commune);
begin return jsonb_build_object(
 'commune',(select jsonb_build_object('id',id,'slug',slug,'nom',nom) from communes where id=c),
 'services',coalesce((select jsonb_agg(jsonb_build_object('id',id,'code',code,'nom',nom,'type',type,'parent_id',parent_id,'responsable',responsable,'ordre',ordre,'actif',actif) order by ordre,nom) from services where commune_id=c),'[]'::jsonb),
 'postes',coalesce((select jsonb_agg(jsonb_build_object('code',p.code,'nom',p.nom,'famille',p.famille,'role_code',p.role_code,'parent_code',p.parent_code,'service_code',p.service_code,'systeme',p.systeme,'actif',p.actif,
   'titulaires',(select coalesce(jsonb_agg(s.t),'[]'::jsonb) from (
     select jsonb_build_object('type','agent','aff_id',a.id,'id',pe.id,'nom',pe.prenom||' '||pe.nom,'service_id',a.service_id,'debut',a.debut) t from org_agent_affectations a join personnel pe on pe.id=a.personnel_id where a.commune_id=c and a.poste_code=p.code and a.debut<=current_date and (a.fin is null or a.fin>=current_date)
     union all select jsonb_build_object('type','adjoint','aff_id',a.id,'id',ad.id,'nom',ad.prenom||' '||ad.nom,'service_id',a.service_id,'debut',a.debut) from org_agent_affectations a join adjoints ad on ad.id=a.adjoint_id where a.commune_id=c and a.poste_code=p.code and a.debut<=current_date and (a.fin is null or a.fin>=current_date)
     union all select jsonb_build_object('type','compte','aff_id',oa.id,'id',oa.user_id,'nom',coalesce(pr.nom,'Compte'),'debut',oa.debut) from org_affectations oa join profiles pr on pr.id=oa.user_id where oa.commune_id=c and oa.poste_code=p.code and oa.actif and oa.debut<=current_date and (oa.fin is null or oa.fin>=current_date)) s))
   order by p.famille,p.nom) from org_postes p where p.commune_id=c),'[]'::jsonb),
 'agents',coalesce((select jsonb_agg(jsonb_build_object('id',pe.id,'prenom',pe.prenom,'nom',pe.nom,'fonction',pe.fonction,'service_id',pe.service_id,'actif',pe.actif,'user_id',pe.user_id,'type_contrat',pe.type_contrat,'matricule',pe.matricule,'telephone',pe.telephone,'email',pe.email,'fusionne_dans',pe.fusionne_dans,
   'affectations',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'poste_code',a.poste_code,'service_id',a.service_id,'debut',a.debut,'fin',a.fin,'motif',a.motif) order by a.debut desc),'[]'::jsonb) from org_agent_affectations a where a.personnel_id=pe.id)) order by pe.nom,pe.prenom) from personnel pe where pe.commune_id=c),'[]'::jsonb),
 'adjoints',coalesce((select jsonb_agg(jsonb_build_object('id',ad.id,'prenom',ad.prenom,'nom',ad.nom,'rang',ad.rang,'fonction',ad.fonction,'user_id',ad.user_id,'actif',ad.actif,
   'affectations',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'poste_code',a.poste_code,'service_id',a.service_id,'debut',a.debut,'fin',a.fin) order by a.debut desc),'[]'::jsonb) from org_agent_affectations a where a.adjoint_id=ad.id)) order by ad.rang) from adjoints ad where ad.commune_id=c),'[]'::jsonb),
 'comptes',coalesce((select jsonb_agg(jsonb_build_object('id',pr.id,'nom',pr.nom,'role',pr.role,'actif',pr.actif,'email',(select email from auth.users u where u.id=pr.id)) order by pr.nom) from profiles pr where pr.commune_id=c),'[]'::jsonb)); end $$;

do $$ declare f text; begin
 for f in select p.oid::regprocedure::text from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in ('org_gest','org_sa_service_save','org_sa_poste_save','org_sa_agent_save','org_sa_affecter','org_sa_affectation_fin','org_sa_lier_compte','org_sa_doublons','org_sa_fusionner','org_sa_organigramme') loop
  execute 'revoke all on function '||f||' from public, anon'; execute 'grant execute on function '||f||' to authenticated'; end loop; end $$;
