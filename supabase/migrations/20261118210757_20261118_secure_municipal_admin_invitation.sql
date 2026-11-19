create or replace function public.saas_creer_commune(
  p_nom text,p_slug text,p_plan text,p_essai_jours integer,p_admin uuid,p_admin_nom text
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare cid uuid; s text:=lower(trim(p_slug));
begin
  perform private.pgarde(array['proprietaire','admin']);
  if coalesce(trim(p_nom),'')='' then raise exception 'Nom obligatoire'; end if;
  if s !~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' then raise exception 'Identifiant invalide (3 à 40 caractères : a-z, 0-9, tiret)'; end if;
  if s=any(array['www','app','saas','admin','api','mairie','citoyen','mail','static','cdn','support']) then raise exception 'Identifiant réservé'; end if;
  if not exists(select 1 from public.plans where code=p_plan and actif) then raise exception 'Offre inconnue'; end if;
  if coalesce(p_essai_jours,0)<0 or coalesce(p_essai_jours,0)>90 then raise exception 'Essai : 0 à 90 jours'; end if;
  if p_admin is null or not exists(select 1 from auth.users where id=p_admin) then raise exception 'Compte administrateur municipal introuvable'; end if;
  perform 1 from public.platform_admins where user_id=p_admin for key share;
  if found then raise exception 'Un compte administrateur plateforme ne peut pas être administrateur municipal'; end if;
  perform 1 from public.profiles where id=p_admin for update;
  if found and exists(select 1 from public.profiles where id=p_admin and (commune_id is not null or coalesce(role::text,'citoyen')<>'citoyen')) then
    raise exception 'Ce compte possède déjà une affectation municipale ou un rôle privilégié';
  end if;
  insert into public.communes(nom,slug,statut,sous_domaine,admin_principal)
  values(trim(p_nom),s,case when coalesce(p_essai_jours,0)>0 then 'essai' else 'actif' end,s,p_admin)
  returning id into cid;
  insert into public.profiles(id,role,commune_id,nom,actif)
  values(p_admin,'maire',cid,p_admin_nom,false)
  on conflict(id) do update set role='maire',commune_id=excluded.commune_id,nom=excluded.nom,actif=false
  where public.profiles.role='citoyen' and public.profiles.commune_id is null;
  if not found then raise exception 'Impossible d’affecter le compte comme maire'; end if;
  insert into public.indicateurs(commune_id)
  select cid where not exists(select 1 from public.indicateurs where commune_id=cid);
  insert into public.abonnements(commune_id,plan_code,statut,fin_essai,prochaine_echeance)
  values(cid,p_plan,case when coalesce(p_essai_jours,0)>0 then 'essai' else 'actif' end,
    case when p_essai_jours>0 then current_date+p_essai_jours end,current_date+coalesce(nullif(p_essai_jours,0),30));
  perform private.paudit('commune_creer',cid,jsonb_build_object('nom',p_nom,'slug',s,'plan',p_plan,'essai',p_essai_jours,'admin_inactif',true));
  return cid;
end
$$;