
CREATE OR REPLACE FUNCTION private.org_service_ok()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.service_code IS NOT NULL
     AND (TG_OP='INSERT' OR NEW.service_code IS DISTINCT FROM OLD.service_code) THEN
    IF NOT EXISTS(
      SELECT 1
      FROM public.services s
      WHERE s.commune_id=NEW.commune_id
        AND s.code=NEW.service_code
        AND coalesce(s.actif,true)
    ) THEN
      RAISE EXCEPTION 'Service inconnu ou inactif : %',NEW.service_code;
    END IF;
  END IF;
  RETURN NEW;
END
$function$;
