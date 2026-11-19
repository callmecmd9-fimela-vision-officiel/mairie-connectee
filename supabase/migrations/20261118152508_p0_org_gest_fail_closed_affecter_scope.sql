
CREATE OR REPLACE FUNCTION public.org_gest(p_slug text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  c uuid;
BEGIN
  SELECT id INTO c
  FROM public.communes
  WHERE slug=p_slug;

  IF c IS NULL THEN
    RAISE EXCEPTION 'Commune introuvable';
  END IF;

  IF auth.uid() IS NULL
     OR NOT coalesce(
       private.is_platform_admin()
       OR (
         private.my_role() IN ('maire','super_admin')
         AND private.my_commune()=c
       ),
       false
     ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  RETURN c;
END
$function$;

CREATE OR REPLACE FUNCTION public.org_sa_affecter(
  p_commune text,
  p_personnel uuid,
  p_adjoint uuid,
  p_poste text,
  p_service text,
  p_debut date,
  p_fin date,
  p_motif text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  c uuid := public.org_gest(p_commune);
  sid uuid;
  r uuid;
BEGIN
  IF (p_personnel IS NULL)=(p_adjoint IS NULL) THEN
    RAISE EXCEPTION 'Indiquez une personne du personnel ou un adjoint';
  END IF;

  IF p_personnel IS NOT NULL THEN
    PERFORM 1
    FROM public.personnel pe
    WHERE pe.id=p_personnel
      AND pe.commune_id=c
    FOR KEY SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Personnel introuvable dans cette commune';
    END IF;
  END IF;

  IF p_adjoint IS NOT NULL THEN
    PERFORM 1
    FROM public.adjoints ad
    WHERE ad.id=p_adjoint
      AND ad.commune_id=c
    FOR KEY SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Adjoint introuvable dans cette commune';
    END IF;
  END IF;

  PERFORM 1
  FROM public.org_postes op
  WHERE op.commune_id=c
    AND op.code=p_poste
    AND op.actif
  FOR KEY SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Poste introuvable ou inactif';
  END IF;

  IF p_service IS NOT NULL THEN
    SELECT s.id INTO sid
    FROM public.services s
    WHERE s.commune_id=c
      AND s.code=p_service
    FOR KEY SHARE;

    IF sid IS NULL THEN
      RAISE EXCEPTION 'Service introuvable';
    END IF;
  END IF;

  INSERT INTO public.org_agent_affectations(
    commune_id,personnel_id,adjoint_id,poste_code,
    service_id,debut,fin,motif
  )
  VALUES(
    c,p_personnel,p_adjoint,p_poste,sid,
    coalesce(p_debut,current_date),p_fin,p_motif
  )
  RETURNING id INTO r;

  PERFORM public.org_log(
    c,'org_agent_affecter',p_poste,jsonb_build_object('id',r)
  );

  RETURN r;
END
$function$;
