
CREATE OR REPLACE FUNCTION public.org_aa_check()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE pc uuid;
BEGIN
  IF NEW.personnel_id IS NOT NULL THEN
    SELECT commune_id INTO pc FROM public.personnel WHERE id=NEW.personnel_id;
  ELSE
    SELECT commune_id INTO pc FROM public.adjoints WHERE id=NEW.adjoint_id;
  END IF;

  IF pc IS DISTINCT FROM NEW.commune_id THEN
    RAISE EXCEPTION 'Personne d''une autre commune';
  END IF;

  IF NEW.service_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.services
       WHERE id=NEW.service_id AND commune_id=NEW.commune_id
     ) THEN
    RAISE EXCEPTION 'Service d''une autre commune';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.org_agent_affectations o
    WHERE o.id IS DISTINCT FROM NEW.id
      AND o.commune_id=NEW.commune_id
      AND o.poste_code=NEW.poste_code
      AND o.personnel_id IS NOT DISTINCT FROM NEW.personnel_id
      AND o.adjoint_id IS NOT DISTINCT FROM NEW.adjoint_id
      AND daterange(o.debut,coalesce(o.fin,'infinity'::date),'[]')
          && daterange(NEW.debut,coalesce(NEW.fin,'infinity'::date),'[]')
  ) THEN
    RAISE EXCEPTION 'Affectation contradictoire : cette personne occupe déjà ce poste sur la période';
  END IF;

  RETURN NEW;
END
$function$;

CREATE OR REPLACE FUNCTION public.org_log(c uuid, act text, cible text, det jsonb)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  INSERT INTO public.journal_audit(commune_id,user_id,email,action,cible,detail)
  VALUES (
    c::text,
    auth.uid(),
    (SELECT email FROM auth.users WHERE id=auth.uid()),
    act,cible,det
  )
$function$;

CREATE OR REPLACE FUNCTION public.org_sa_lier_compte(
  p_commune text,p_personnel uuid,p_user uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  c uuid := public.org_gest(p_commune);
  profile_commune uuid;
  profile_role text;
  linked_personnel uuid;
BEGIN
  PERFORM 1
  FROM public.personnel
  WHERE id=p_personnel AND commune_id=c
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fiche introuvable dans cette commune';
  END IF;

  IF p_user IS NOT NULL THEN
    SELECT commune_id,role::text
      INTO profile_commune,profile_role
    FROM public.profiles
    WHERE id=p_user
    FOR KEY SHARE;

    IF NOT FOUND OR profile_commune IS DISTINCT FROM c THEN
      RAISE EXCEPTION 'Compte inexistant dans cette commune';
    END IF;

    IF profile_role='super_admin'
       OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id=p_user) THEN
      RAISE EXCEPTION 'Un compte administrateur ne peut pas être lié à une fiche RH';
    END IF;

    SELECT id INTO linked_personnel
    FROM public.personnel
    WHERE user_id=p_user AND id<>p_personnel
    FOR UPDATE;

    IF FOUND THEN
      RAISE EXCEPTION 'Ce compte est déjà lié à une autre fiche du personnel';
    END IF;
  END IF;

  UPDATE public.personnel
  SET user_id=p_user
  WHERE id=p_personnel AND commune_id=c;

  PERFORM public.org_log(c,'org_agent_lien_compte',p_personnel::text,
    jsonb_build_object('user',p_user));
END
$function$;

CREATE OR REPLACE FUNCTION public.org_sa_fusionner(
  p_commune text,p_garde uuid,p_absorbe uuid,p_confirme boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  c uuid := public.org_gest(p_commune);
  garde_user uuid;
  absorbe_user uuid;
  n integer;
BEGIN
  IF p_confirme IS NOT TRUE THEN
    RAISE EXCEPTION 'Fusion non confirmée : vérifiez que les deux fiches sont la même personne';
  END IF;

  IF p_garde=p_absorbe THEN
    RAISE EXCEPTION 'Fiches identiques';
  END IF;

  -- Verrouille les deux fiches dans un ordre stable pour éviter les courses concurrentes.
  PERFORM 1
  FROM public.personnel
  WHERE id IN (p_garde,p_absorbe) AND commune_id=c
  ORDER BY id
  FOR UPDATE;

  SELECT count(*) INTO n
  FROM public.personnel
  WHERE id IN (p_garde,p_absorbe)
    AND commune_id=c
    AND fusionne_dans IS NULL;

  IF n<>2 THEN
    RAISE EXCEPTION 'Fiches introuvables ou déjà fusionnées';
  END IF;

  SELECT user_id INTO garde_user
  FROM public.personnel WHERE id=p_garde AND commune_id=c;

  SELECT user_id INTO absorbe_user
  FROM public.personnel WHERE id=p_absorbe AND commune_id=c;

  IF garde_user IS NOT NULL AND absorbe_user IS NOT NULL
     AND garde_user<>absorbe_user THEN
    RAISE EXCEPTION 'Les deux fiches sont liées à des comptes différents : arbitrage manuel requis';
  END IF;

  IF EXISTS (SELECT 1 FROM public.remunerations WHERE personnel_id=p_absorbe)
     OR EXISTS (SELECT 1 FROM public.conges WHERE personnel_id=p_absorbe)
     OR EXISTS (SELECT 1 FROM public.conges_droits WHERE personnel_id=p_absorbe)
     OR EXISTS (SELECT 1 FROM public.paie_lignes WHERE personnel_id=p_absorbe) THEN
    RAISE EXCEPTION 'La fiche à absorber a des données RH (paie, congés, rémunération) : fusion manuelle requise';
  END IF;

  UPDATE public.personnel
  SET user_id=NULL
  WHERE id=p_absorbe AND commune_id=c;

  UPDATE public.personnel
  SET user_id=coalesce(user_id,absorbe_user)
  WHERE id=p_garde AND commune_id=c;

  UPDATE public.org_agent_affectations
  SET personnel_id=p_garde
  WHERE personnel_id=p_absorbe AND commune_id=c;

  UPDATE public.personnel
  SET actif=false,
      date_sortie=coalesce(date_sortie,current_date),
      fusionne_dans=p_garde
  WHERE id=p_absorbe AND commune_id=c;

  PERFORM public.org_log(c,'org_agent_fusion',p_absorbe::text,
    jsonb_build_object('vers',p_garde));
END
$function$;
