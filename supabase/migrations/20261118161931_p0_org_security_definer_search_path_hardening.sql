
CREATE OR REPLACE FUNCTION public.org_sa_affectation_fin(p_commune text,p_id uuid,p_fin date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE c uuid:=public.org_gest(p_commune);
BEGIN
  UPDATE public.org_agent_affectations
  SET fin=coalesce(p_fin,current_date)
  WHERE id=p_id AND commune_id=c;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Affectation introuvable';
  END IF;

  PERFORM public.org_log(c,'org_agent_affectation_fin',p_id::text,NULL);
END
$function$;

CREATE OR REPLACE FUNCTION public.org_sa_agent_save(
  p_commune text,p_id uuid,p_prenom text,p_nom text,p_fonction text,
  p_service text,p_contrat text,p_tel text,p_email text,p_matricule text,
  p_obs text,p_actif boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  c uuid:=public.org_gest(p_commune);
  sid uuid;
  sn text;
  r uuid;
BEGIN
  IF length(trim(coalesce(p_prenom,'')))<1
     OR length(trim(coalesce(p_nom,'')))<1 THEN
    RAISE EXCEPTION 'Prénom et nom obligatoires';
  END IF;

  IF p_service IS NOT NULL THEN
    SELECT id,nom INTO sid,sn
    FROM public.services
    WHERE commune_id=c AND code=p_service;

    IF sid IS NULL THEN
      RAISE EXCEPTION 'Service introuvable';
    END IF;
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.personnel(
      commune_id,prenom,nom,fonction,service,service_id,type_contrat,
      telephone,email,matricule,observations,actif
    )
    VALUES (
      c,trim(p_prenom),trim(p_nom),p_fonction,sn,sid,
      coalesce(p_contrat,'Permanent'),p_tel,p_email,p_matricule,p_obs,
      coalesce(p_actif,true)
    )
    RETURNING id INTO r;
  ELSE
    UPDATE public.personnel
    SET prenom=trim(p_prenom),
        nom=trim(p_nom),
        fonction=p_fonction,
        service=sn,
        service_id=sid,
        type_contrat=coalesce(p_contrat,type_contrat),
        telephone=p_tel,
        email=p_email,
        matricule=p_matricule,
        observations=p_obs,
        actif=coalesce(p_actif,actif),
        date_sortie=CASE
          WHEN p_actif IS FALSE THEN coalesce(date_sortie,current_date)
          WHEN p_actif IS TRUE THEN NULL
          ELSE date_sortie
        END
    WHERE id=p_id AND commune_id=c
    RETURNING id INTO r;

    IF r IS NULL THEN
      RAISE EXCEPTION 'Fiche introuvable';
    END IF;
  END IF;

  PERFORM public.org_log(c,'org_agent_save',r::text,NULL);
  RETURN r;
END
$function$;

CREATE OR REPLACE FUNCTION public.org_sa_doublons(p_commune text)
RETURNS TABLE(a uuid,b uuid,nom_a text,nom_b text,raison text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE c uuid:=public.org_gest(p_commune);
BEGIN
  RETURN QUERY
  SELECT
    x.id,y.id,x.prenom||' '||x.nom,y.prenom||' '||y.nom,
    CASE
      WHEN translate(lower(x.prenom||' '||x.nom),'àâäéèêëîïôöùûüç','aaaeeeeiioouuuc')
         = translate(lower(y.prenom||' '||y.nom),'àâäéèêëîïôöùûüç','aaaeeeeiioouuuc')
      THEN 'Même nom et prénom'
      ELSE 'Même téléphone ou e-mail'
    END
  FROM public.personnel x
  JOIN public.personnel y
    ON x.commune_id=y.commune_id AND x.id<y.id
  WHERE x.commune_id=c
    AND x.fusionne_dans IS NULL
    AND y.fusionne_dans IS NULL
    AND (
      translate(lower(x.prenom||' '||x.nom),'àâäéèêëîïôöùûüç','aaaeeeeiioouuuc')
        = translate(lower(y.prenom||' '||y.nom),'àâäéèêëîïôöùûüç','aaaeeeeiioouuuc')
      OR (x.telephone IS NOT NULL AND x.telephone<>'' AND x.telephone=y.telephone)
      OR (x.email IS NOT NULL AND x.email<>'' AND lower(x.email)=lower(y.email))
    );
END
$function$;

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
        'type_contrat',pe.type_contrat,'matricule',pe.matricule,
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

CREATE OR REPLACE FUNCTION public.org_sa_poste_save(
  p_commune text,p_code text,p_nom text,p_famille text,p_role text,
  p_parent text,p_service text,p_actif boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  c uuid:=public.org_gest(p_commune);
  x text:=p_parent;
  n integer:=0;
BEGIN
  IF p_code IS NULL OR p_code !~ '^[a-z][a-z0-9_]{1,40}$' THEN
    RAISE EXCEPTION 'Code de poste invalide';
  END IF;
  IF length(trim(coalesce(p_nom,'')))<2 THEN
    RAISE EXCEPTION 'Intitulé obligatoire';
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.org_roles
    WHERE commune_id=c AND code=p_role AND actif
  ) THEN
    RAISE EXCEPTION 'Rôle invalide';
  END IF;
  IF p_parent IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM public.org_postes WHERE commune_id=c AND code=p_parent
  ) THEN
    RAISE EXCEPTION 'Poste supérieur introuvable';
  END IF;
  IF p_service IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM public.services WHERE commune_id=c AND code=p_service
  ) THEN
    RAISE EXCEPTION 'Service introuvable';
  END IF;

  WHILE x IS NOT NULL AND n<30 LOOP
    IF x=p_code THEN RAISE EXCEPTION 'Lien hiérarchique circulaire'; END IF;
    SELECT parent_code INTO x
    FROM public.org_postes WHERE commune_id=c AND code=x;
    n:=n+1;
  END LOOP;

  INSERT INTO public.org_postes(
    commune_id,code,nom,famille,role_code,parent_code,service_code,actif
  )
  VALUES (
    c,p_code,trim(p_nom),p_famille,p_role,p_parent,p_service,coalesce(p_actif,true)
  )
  ON CONFLICT(commune_id,code) DO UPDATE
  SET nom=excluded.nom,famille=excluded.famille,role_code=excluded.role_code,
      parent_code=excluded.parent_code,service_code=excluded.service_code,
      actif=excluded.actif;

  PERFORM public.org_log(
    c,'org_poste_save',p_code,
    jsonb_build_object('role',p_role,'parent',p_parent,'actif',p_actif)
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.org_sa_service_save(
  p_commune text,p_code text,p_nom text,p_type text,p_parent text,
  p_responsable text,p_ordre integer,p_actif boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  c uuid:=public.org_gest(p_commune);
  pid uuid;
  sid uuid;
  x uuid;
  n integer:=0;
BEGIN
  IF length(trim(coalesce(p_nom,'')))<2 THEN
    RAISE EXCEPTION 'Nom obligatoire';
  END IF;

  IF p_parent IS NOT NULL THEN
    SELECT id INTO pid
    FROM public.services WHERE commune_id=c AND code=p_parent;
    IF pid IS NULL THEN RAISE EXCEPTION 'Service parent introuvable'; END IF;
  END IF;

  SELECT id INTO sid FROM public.services WHERE commune_id=c AND code=p_code;

  x:=pid;
  WHILE x IS NOT NULL AND n<30 LOOP
    IF x=sid THEN RAISE EXCEPTION 'Lien hiérarchique circulaire'; END IF;
    SELECT parent_id INTO x FROM public.services WHERE id=x;
    n:=n+1;
  END LOOP;

  INSERT INTO public.services(
    commune_id,code,nom,type,parent_id,responsable,ordre,actif
  )
  VALUES (
    c,p_code,trim(p_nom),coalesce(p_type,'service'),pid,p_responsable,
    coalesce(p_ordre,0),coalesce(p_actif,true)
  )
  ON CONFLICT(commune_id,code) DO UPDATE
  SET nom=excluded.nom,type=excluded.type,parent_id=excluded.parent_id,
      responsable=excluded.responsable,ordre=excluded.ordre,actif=excluded.actif
  RETURNING id INTO sid;

  PERFORM public.org_log(
    c,'org_service_save',p_code,
    jsonb_build_object('type',p_type,'actif',p_actif)
  );

  RETURN sid;
END
$function$;

CREATE OR REPLACE FUNCTION public.org_commune()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT p.commune_id
  FROM public.profiles p
  WHERE p.id=(SELECT auth.uid()) AND coalesce(p.actif,true)
$function$;

CREATE OR REPLACE FUNCTION public.org_droit_propre(u uuid,m text,a text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  p record;
  o boolean;
BEGIN
  SELECT role,commune_id INTO p
  FROM public.profiles
  WHERE id=u AND coalesce(actif,true);

  IF NOT FOUND THEN RETURN false; END IF;
  IF p.role IN ('super_admin','maire') THEN RETURN true; END IF;

  IF a='consulter' THEN
    SELECT autorise INTO o
    FROM public.permissions_utilisateurs
    WHERE commune_id=p.commune_id::text AND user_id=u AND cle=m;
    IF FOUND THEN RETURN o; END IF;
  END IF;

  RETURN EXISTS(
    SELECT 1
    FROM public.org_affectations f
    JOIN public.org_postes po
      ON po.commune_id=f.commune_id AND po.code=f.poste_code AND po.actif
    JOIN public.org_roles r
      ON r.commune_id=po.commune_id AND r.code=po.role_code AND r.actif
    JOIN public.org_role_droits d
      ON d.commune_id=r.commune_id AND d.role_code=r.code
    WHERE f.user_id=u AND f.commune_id=p.commune_id AND f.actif
      AND f.debut<=current_date AND (f.fin IS NULL OR f.fin>=current_date)
      AND d.module=m AND d.action=a
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.org_droit_user(u uuid,m text,a text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT coalesce(
    public.org_droit_propre(u,m,a)
    OR EXISTS(
      SELECT 1
      FROM public.org_delegations_droits d
      WHERE d.a_user=u AND d.module=m AND d.action=a
        AND d.revoque_le IS NULL AND now() BETWEEN d.debut AND d.fin
        AND d.commune_id=(
          SELECT p.commune_id FROM public.profiles p WHERE p.id=u
        )
        AND public.org_droit_propre(d.de_user,m,a)
    ),
    false
  )
$function$;

CREATE OR REPLACE FUNCTION public.org_droit(m text,a text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT coalesce(public.org_droit_user((SELECT auth.uid()),m,a),false)
$function$;

CREATE OR REPLACE FUNCTION public.org_peut_accorder(p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT coalesce(
    (
      SELECT p.role IN ('maire','super_admin')
      FROM public.profiles p
      WHERE p.id=(SELECT auth.uid())
    ),
    false
  )
  OR NOT EXISTS(
    SELECT 1
    FROM public.org_role_droits d
    WHERE d.commune_id=public.org_commune()
      AND d.role_code=p_role
      AND NOT public.org_droit_propre((SELECT auth.uid()),d.module,d.action)
  )
$function$;
