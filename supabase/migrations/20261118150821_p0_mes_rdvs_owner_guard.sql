
CREATE OR REPLACE FUNCTION public.mes_rdvs(p_commune text, p_numeros text[])
RETURNS TABLE(
  numero text,
  service text,
  statut text,
  date_souhaitee date,
  heure_souhaitee time without time zone,
  date_confirmee date,
  heure_confirmee time without time zone,
  reponse text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    r.numero,
    r.service,
    r.statut,
    r.date_souhaitee,
    r.heure_souhaitee,
    r.date_confirmee,
    r.heure_confirmee,
    r.reponse,
    r.created_at
  FROM public.rdv_demandes r
  JOIN public.communes c ON c.id = r.commune_id
  WHERE c.slug = p_commune
    AND auth.uid() IS NOT NULL
    AND r.citoyen_id = auth.uid()
  ORDER BY r.created_at DESC
  LIMIT 50
$function$;

REVOKE ALL ON FUNCTION public.mes_rdvs(text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mes_rdvs(text, text[]) TO authenticated;
