-- Photo d'identité de l'agent + badge (administrateur de mairie).
-- Additif et idempotent. APPLIQUÉ en production le 2026-11-23 (version 20261123125215) ; voir docs/BADGE_AGENT.md.
-- Le front reste fonctionnel sans cette migration (l'envoi de photo affiche un message clair, le badge s'imprime sans photo).
begin;

-- 1. Colonne photo (chemin Storage, jamais une URL) -------------------------------------------------
alter table public.personnel add column if not exists photo text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='personnel_photo_chk') then
    alter table public.personnel add constraint personnel_photo_chk
      check (photo is null or (char_length(photo)<=200 and photo ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg)$'));
  end if;
end $$;

-- 2. Bucket privé, images seules, 1 Mo ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('agents-photos','agents-photos',false,1048576,array['image/webp','image/jpeg'])
on conflict (id) do update set public=false, file_size_limit=1048576, allowed_mime_types=array['image/webp','image/jpeg'];

-- 3. Qui peut lire / écrire les photos d'une commune -------------------------------------------------
-- Écriture : admin de la mairie (admin_mairie ou admin de commune), strictement dans SA commune, ou plateforme.
-- Lecture  : idem + maire et RH de la commune.
create or replace function private.peut_photos_agents(p_commune uuid, p_ecrire boolean)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(private.is_platform_admin(),false) or coalesce((
    select coalesce(p.actif,true) and p.commune_id=p_commune
           and p.role::text = any (case when p_ecrire then array['admin_mairie','super_admin']
                                        else array['admin_mairie','super_admin','maire','rh'] end)
    from public.profiles p where p.id=(select auth.uid())
  ),false)
$$;
revoke all on function private.peut_photos_agents(uuid,boolean) from public, anon;
grant execute on function private.peut_photos_agents(uuid,boolean) to authenticated;

drop policy if exists agents_photos_select on storage.objects;
drop policy if exists agents_photos_insert on storage.objects;
drop policy if exists agents_photos_update on storage.objects;
drop policy if exists agents_photos_delete on storage.objects;
create policy agents_photos_select on storage.objects for select to authenticated
  using (bucket_id='agents-photos' and exists (select 1 from public.communes c
    where c.id::text=(storage.foldername(name))[1] and private.peut_photos_agents(c.id,false)));
create policy agents_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id='agents-photos' and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg)$'
    and exists (select 1 from public.communes c
    where c.id::text=(storage.foldername(name))[1] and private.peut_photos_agents(c.id,true)));
create policy agents_photos_update on storage.objects for update to authenticated
  using (bucket_id='agents-photos' and exists (select 1 from public.communes c
    where c.id::text=(storage.foldername(name))[1] and private.peut_photos_agents(c.id,true)))
  with check (bucket_id='agents-photos' and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg)$'
    and exists (select 1 from public.communes c
    where c.id::text=(storage.foldername(name))[1] and private.peut_photos_agents(c.id,true)));
create policy agents_photos_delete on storage.objects for delete to authenticated
  using (bucket_id='agents-photos' and exists (select 1 from public.communes c
    where c.id::text=(storage.foldername(name))[1] and private.peut_photos_agents(c.id,true)));

-- 4. RPC : enregistrer (ou retirer) la photo d'un agent de SA commune ---------------------------------
create or replace function public.org_sa_agent_photo_set(p_commune text, p_id uuid, p_photo text)
returns void language plpgsql security definer set search_path = ''
as $$
declare c uuid:=public.org_gest(p_commune); r uuid;
begin
  if p_photo is not null and p_photo !~ ('^'||c::text||'/[0-9a-f-]{36}\.(webp|jpg)$') then
    raise exception 'Chemin de photo invalide';
  end if;
  update public.personnel set photo=p_photo where id=p_id and commune_id=c returning id into r;
  if r is null then raise exception 'Fiche introuvable'; end if;
  perform public.org_log(c,'org_agent_photo',r::text,jsonb_build_object('photo',p_photo is not null));
end
$$;
revoke all on function public.org_sa_agent_photo_set(text,uuid,text) from public, anon;
grant execute on function public.org_sa_agent_photo_set(text,uuid,text) to authenticated;

-- 5. Organigramme : expose le chemin de la photo (aucun autre champ ajouté) ----------------------------
CREATE OR REPLACE FUNCTION public.org_sa_organigramme(p_commune text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE c uuid:=public.org_gest(p_commune);
BEGIN
  RETURN jsonb_build_object(
    'commune',(
      SELECT jsonb_build_object('id',id,'slug',slug,'nom',nom)
      FROM public.communes WHERE id=c
    ),
    'services',coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id',id,'code',code,'nom',nom,'type',type,'parent_id',parent_id,
        'responsable',responsable,'ordre',ordre,'actif',actif
      ) ORDER BY ordre,nom)
      FROM public.services WHERE commune_id=c
    ),'[]'::jsonb),
    'postes',coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'code',p.code,'nom',p.nom,'famille',p.famille,'role_code',p.role_code,
        'parent_code',p.parent_code,'service_code',p.service_code,
        'systeme',p.systeme,'actif',p.actif,
        'titulaires',(
          SELECT coalesce(jsonb_agg(s.t),'[]'::jsonb)
          FROM (
            SELECT jsonb_build_object(
              'type','agent','aff_id',a.id,'id',pe.id,
              'nom',pe.prenom||' '||pe.nom,'service_id',a.service_id,'debut',a.debut
            ) AS t
            FROM public.org_agent_affectations a
            JOIN public.personnel pe ON pe.id=a.personnel_id
            WHERE a.commune_id=c AND a.poste_code=p.code
              AND a.debut<=current_date AND (a.fin IS NULL OR a.fin>=current_date)
            UNION ALL
            SELECT jsonb_build_object(
              'type','adjoint','aff_id',a.id,'id',ad.id,
              'nom',ad.prenom||' '||ad.nom,'service_id',a.service_id,'debut',a.debut
            )
            FROM public.org_agent_affectations a
            JOIN public.adjoints ad ON ad.id=a.adjoint_id
            WHERE a.commune_id=c AND a.poste_code=p.code
              AND a.debut<=current_date AND (a.fin IS NULL OR a.fin>=current_date)
            UNION ALL
            SELECT jsonb_build_object(
              'type','compte','aff_id',oa.id,'id',oa.user_id,
              'nom',coalesce(pr.nom,'Compte'),'debut',oa.debut
            )
            FROM public.org_affectations oa
            JOIN public.profiles pr ON pr.id=oa.user_id
            WHERE oa.commune_id=c AND oa.poste_code=p.code AND oa.actif
              AND oa.debut<=current_date AND (oa.fin IS NULL OR oa.fin>=current_date)
          ) s
        )
      ) ORDER BY p.famille,p.nom)
      FROM public.org_postes p WHERE p.commune_id=c
    ),'[]'::jsonb),
    'agents',coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id',pe.id,'prenom',pe.prenom,'nom',pe.nom,'fonction',pe.fonction,
        'service_id',pe.service_id,'actif',pe.actif,'user_id',pe.user_id,
        'type_contrat',pe.type_contrat,'matricule',pe.matricule,'photo',pe.photo,
        'telephone',pe.telephone,'email',pe.email,'fusionne_dans',pe.fusionne_dans,
        'affectations',(
          SELECT coalesce(jsonb_agg(jsonb_build_object(
            'id',a.id,'poste_code',a.poste_code,'service_id',a.service_id,
            'debut',a.debut,'fin',a.fin,'motif',a.motif
          ) ORDER BY a.debut DESC),'[]'::jsonb)
          FROM public.org_agent_affectations a WHERE a.personnel_id=pe.id
        )
      ) ORDER BY pe.nom,pe.prenom)
      FROM public.personnel pe WHERE pe.commune_id=c
    ),'[]'::jsonb),
    'adjoints',coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id',ad.id,'prenom',ad.prenom,'nom',ad.nom,'rang',ad.rang,
        'fonction',ad.fonction,'user_id',ad.user_id,'actif',ad.actif,
        'affectations',(
          SELECT coalesce(jsonb_agg(jsonb_build_object(
            'id',a.id,'poste_code',a.poste_code,'service_id',a.service_id,
            'debut',a.debut,'fin',a.fin
          ) ORDER BY a.debut DESC),'[]'::jsonb)
          FROM public.org_agent_affectations a WHERE a.adjoint_id=ad.id
        )
      ) ORDER BY ad.rang)
      FROM public.adjoints ad WHERE ad.commune_id=c
    ),'[]'::jsonb),
    'comptes',coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id',pr.id,'nom',pr.nom,'role',pr.role,'actif',pr.actif,
        'email',(SELECT u.email FROM auth.users u WHERE u.id=pr.id)
      ) ORDER BY pr.nom)
      FROM public.profiles pr WHERE pr.commune_id=c
    ),'[]'::jsonb)
  );
END
$function$;

commit;
