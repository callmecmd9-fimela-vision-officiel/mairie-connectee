CREATE OR REPLACE FUNCTION public.saas_creer_commune(
  p_nom text,
  p_slug text,
  p_plan text,
  p_essai_jours integer,
  p_admin uuid,
  p_admin_nom text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  cid uuid;
  s text := lower(trim(p_slug));
BEGIN
  PERFORM private.pgarde(ARRAY['proprietaire','admin']);

  IF coalesce(trim(p_nom),'') = '' THEN
    RAISE EXCEPTION 'Nom obligatoire';
  END IF;
  IF s !~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' THEN
    RAISE EXCEPTION 'Identifiant invalide (3 à 40 caractères : a-z, 0-9, tiret)';
  END IF;
  IF s = ANY(ARRAY['www','app','saas','admin','api','mairie','citoyen','mail','static','cdn','support']) THEN
    RAISE EXCEPTION 'Identifiant réservé';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.plans WHERE code=p_plan AND actif) THEN
    RAISE EXCEPTION 'Offre inconnue';
  END IF;
  IF coalesce(p_essai_jours,0) < 0 OR coalesce(p_essai_jours,0) > 90 THEN
    RAISE EXCEPTION 'Essai : 0 à 90 jours';
  END IF;

  IF p_admin IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id=p_admin) THEN
    RAISE EXCEPTION 'Compte administrateur municipal introuvable';
  END IF;

  -- Ne jamais convertir une identité plateforme en identité municipale.
  PERFORM 1 FROM public.platform_admins
  WHERE user_id=p_admin
  FOR KEY SHARE;
  IF FOUND THEN
    RAISE EXCEPTION 'Un compte administrateur plateforme ne peut pas être administrateur municipal';
  END IF;

  -- Un compte déjà affecté à une mairie ou doté d'un rôle privilégié ne peut
  -- pas être réaffecté implicitement lors de la création d'une commune.
  PERFORM 1 FROM public.profiles
  WHERE id=p_admin
  FOR UPDATE;
  IF FOUND AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id=p_admin
      AND (commune_id IS NOT NULL OR coalesce(role::text,'citoyen') <> 'citoyen')
  ) THEN
    RAISE EXCEPTION 'Ce compte possède déjà une affectation municipale ou un rôle privilégié';
  END IF;

  INSERT INTO public.communes(nom,slug,statut,sous_domaine,admin_principal)
  VALUES (
    trim(p_nom),s,
    CASE WHEN coalesce(p_essai_jours,0)>0 THEN 'essai' ELSE 'actif' END,
    s,p_admin
  )
  RETURNING id INTO cid;

  INSERT INTO public.profiles(id,role,commune_id,nom,actif)
  VALUES (p_admin,'maire',cid,p_admin_nom,true)
  ON CONFLICT (id)
  DO UPDATE SET role='maire',commune_id=excluded.commune_id,nom=excluded.nom,actif=true
  WHERE public.profiles.role='citoyen'
    AND public.profiles.commune_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Impossible d’affecter le compte comme maire';
  END IF;

  INSERT INTO public.indicateurs(commune_id)
  SELECT cid
  WHERE NOT EXISTS (SELECT 1 FROM public.indicateurs WHERE commune_id=cid);

  INSERT INTO public.abonnements(commune_id,plan_code,statut,fin_essai,prochaine_echeance)
  VALUES (
    cid,p_plan,
    CASE WHEN coalesce(p_essai_jours,0)>0 THEN 'essai' ELSE 'actif' END,
    CASE WHEN p_essai_jours>0 THEN current_date+p_essai_jours END,
    current_date+coalesce(nullif(p_essai_jours,0),30)
  );

  PERFORM private.paudit(
    'commune_creer',cid,
    jsonb_build_object('nom',p_nom,'slug',s,'plan',p_plan,'essai',p_essai_jours)
  );
  RETURN cid;
END
$function$;