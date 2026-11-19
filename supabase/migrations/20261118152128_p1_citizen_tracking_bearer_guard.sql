
CREATE OR REPLACE FUNCTION public.suivre_demande(p_commune text, p_numero text)
RETURNS TABLE(
  type text,
  statut text,
  service text,
  reponse text,
  cree timestamp with time zone,
  historique jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    d.type,
    d.statut,
    d.service,
    CASE
      WHEN d.statut IN (
        'traitee','redirigee','rejetee','en_attente_pieces',
        'cloturee','acceptee','pret_a_retirer'
      ) THEN d.reponse
    END,
    d.created_at,
    coalesce((
      SELECT jsonb_agg(
        jsonb_build_object('statut',h.statut,'date',h.created_at)
        ORDER BY h.created_at
      )
      FROM public.demande_historique h
      WHERE h.demande_id=d.id
    ),'[]'::jsonb)
  FROM public.demandes d
  JOIN public.communes c ON c.id=d.commune_id
  WHERE c.slug=p_commune
    AND d.numero=upper(trim(p_numero))
    AND (
      upper(trim(p_numero)) ~ '^[A-Z0-9]{3}-[0-9]{4}-[0-9A-F]{32}$'
      OR (auth.uid() IS NOT NULL AND d.citoyen_id=auth.uid())
    )
$function$;

CREATE OR REPLACE FUNCTION public.suivre_demandes(p_commune text, p_numeros text[])
RETURNS TABLE(
  numero text,
  type text,
  statut text,
  cree timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT d.numero,d.type,d.statut,d.created_at
  FROM public.demandes d
  JOIN public.communes c ON c.id=d.commune_id
  WHERE c.slug=p_commune
    AND d.numero IN (
      SELECT upper(trim(x))
      FROM unnest(p_numeros[1:30]) AS u(x)
    )
    AND (
      d.numero ~ '^[A-Z0-9]{3}-[0-9]{4}-[0-9A-F]{32}$'
      OR (auth.uid() IS NOT NULL AND d.citoyen_id=auth.uid())
    )
  ORDER BY d.created_at DESC
$function$;

CREATE OR REPLACE FUNCTION public.completer_demande(p_commune text, p_numero text, p_pieces text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE c record; d record;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF p_pieces IS NULL OR cardinality(p_pieces)<1 OR cardinality(p_pieces)>3 THEN
    RETURN false;
  END IF;

  IF (SELECT count(DISTINCT x) FROM unnest(p_pieces) AS u(x))<>cardinality(p_pieces) THEN
    RETURN false;
  END IF;

  SELECT id INTO c
  FROM public.communes
  WHERE slug=p_commune AND statut IN ('essai','actif');

  IF c.id IS NULL THEN
    RETURN false;
  END IF;

  SELECT id,pieces INTO d
  FROM public.demandes
  WHERE commune_id=c.id
    AND numero=upper(trim(p_numero))
    AND statut='en_attente_pieces'
    AND (
      upper(trim(p_numero)) ~ '^[A-Z0-9]{3}-[0-9]{4}-[0-9A-F]{32}$'
      OR citoyen_id=auth.uid()
    )
  FOR UPDATE;

  IF d.id IS NULL
     OR cardinality(coalesce(d.pieces,'{}'::text[]))+cardinality(p_pieces)>12
     OR coalesce(d.pieces,'{}'::text[]) && p_pieces THEN
    RETURN false;
  END IF;

  IF EXISTS(
    SELECT 1
    FROM unnest(p_pieces) AS f(path)
    WHERE f.path IS NULL
      OR f.path !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$'
      OR split_part(f.path,'/',1)<>c.id::text
      OR NOT EXISTS(
        SELECT 1
        FROM storage.objects o
        WHERE o.bucket_id='pieces'
          AND o.name=f.path
          AND o.owner_id=auth.uid()::text
      )
  ) THEN
    RETURN false;
  END IF;

  UPDATE public.demandes
  SET pieces=coalesce(pieces,'{}'::text[])||p_pieces,
      statut='en_cours'
  WHERE id=d.id;

  RETURN true;
END;
$function$;
