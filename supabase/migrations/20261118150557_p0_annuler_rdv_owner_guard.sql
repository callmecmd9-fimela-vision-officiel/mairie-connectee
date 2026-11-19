
CREATE OR REPLACE FUNCTION public.annuler_rdv(p_commune text, p_numero text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE r record;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT x.id, x.commune_id, x.numero, x.nom, x.service
    INTO r
  FROM public.rdv_demandes x
  JOIN public.communes c ON c.id = x.commune_id
  WHERE c.slug = p_commune
    AND x.numero = upper(trim(p_numero))
    AND x.citoyen_id = auth.uid()
    AND x.statut IN ('demandee', 'confirmee')
    AND coalesce(x.date_confirmee, x.date_souhaitee) >= current_date
  FOR UPDATE OF x;

  IF r.id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.rdv_demandes
  SET statut = 'annulee', annule_le = now()
  WHERE id = r.id;

  BEGIN
    INSERT INTO public.notifications(user_id, commune_id, titre, corps)
    SELECT p.id, r.commune_id,
           'Rendez-vous annulé ' || r.numero,
           r.nom || ' a annulé son rendez-vous (' || r.service || ').'
    FROM public.profiles p
    WHERE p.commune_id = r.commune_id
      AND p.role IN ('maire', 'cabinet', 'secretariat');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.annuler_rdv(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.annuler_rdv(text, text) TO authenticated;
