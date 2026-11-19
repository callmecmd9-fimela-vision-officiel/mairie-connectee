
CREATE OR REPLACE FUNCTION public.sa_restaurer(p_commune text,p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  s public.sauvegardes;
  t text;
  item jsonb;
  done jsonb := '[]'::jsonb;
BEGIN
  PERFORM public._garde(p_commune);

  SELECT * INTO s
  FROM public.sauvegardes
  WHERE id=p_id AND commune_id=p_commune
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sauvegarde introuvable';
  END IF;

  IF jsonb_typeof(s.contenu)<>'object' THEN
    RAISE EXCEPTION 'Contenu de sauvegarde invalide';
  END IF;

  -- Contrôle préalable intégral : aucune ligne d'une autre commune ne doit
  -- pouvoir être réinjectée depuis un contenu de sauvegarde altéré.
  FOREACH t IN ARRAY ARRAY['indicateurs','parametres_systeme','permissions_roles'] LOOP
    IF s.contenu ? t THEN
      IF jsonb_typeof(s.contenu->t)<>'array' THEN
        RAISE EXCEPTION 'Format de sauvegarde invalide pour %',t;
      END IF;

      FOR item IN SELECT value FROM jsonb_array_elements(s.contenu->t) AS e(value) LOOP
        IF jsonb_typeof(item)<>'object'
           OR item->>'commune_id' IS DISTINCT FROM p_commune THEN
          RAISE EXCEPTION 'Ligne de sauvegarde hors périmètre communal dans %',t;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- Point de restauration préalable conservé dans la même transaction.
  PERFORM public.sa_creer_sauvegarde(
    p_commune,
    'Avant restauration ' || to_char(now(),'DD/MM/YYYY HH24:MI'),
    'automatique'
  );

  FOREACH t IN ARRAY ARRAY['indicateurs','parametres_systeme','permissions_roles'] LOOP
    IF s.contenu ? t AND to_regclass('public.'||t) IS NOT NULL THEN
      EXECUTE format('DELETE FROM public.%I WHERE commune_id::text=$1',t)
      USING p_commune;

      EXECUTE format(
        'INSERT INTO public.%I SELECT * FROM jsonb_populate_recordset(null::public.%I,$1)',
        t,t
      )
      USING s.contenu->t;

      done:=done||to_jsonb(t);
    END IF;
  END LOOP;

  PERFORM public._audit(
    p_commune,'backup_restore',p_id::text,
    jsonb_build_object('tables',done)
  );

  RETURN jsonb_build_object('restaurees',done);
END
$function$;

CREATE OR REPLACE FUNCTION public.sa_revoquer_sessions(
  p_commune text,
  p_user uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  u uuid;
BEGIN
  PERFORM public._garde(p_commune);

  IF p_user IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id=p_user
      AND p.commune_id::text=p_commune
      AND p.role::text<>'super_admin'
      AND NOT EXISTS (
        SELECT 1 FROM public.platform_admins pa WHERE pa.user_id=p.id
      )
  ) THEN
    RAISE EXCEPTION 'Utilisateur introuvable dans cette commune ou compte protégé';
  END IF;

  FOR u IN
    SELECT p.id
    FROM public.profiles p
    WHERE p.commune_id::text=p_commune
      AND p.role::text<>'super_admin'
      AND NOT EXISTS (
        SELECT 1 FROM public.platform_admins pa WHERE pa.user_id=p.id
      )
      AND (p_user IS NULL OR p.id=p_user)
    ORDER BY p.id
    FOR UPDATE OF p
  LOOP
    PERFORM public._revoquer_sessions(u);
  END LOOP;

  PERFORM public._audit(
    p_commune,'sessions_revoke',coalesce(p_user::text,'tous'),NULL
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.sa_supprimer_sauvegarde(
  p_commune text,
  p_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  n integer;
BEGIN
  PERFORM public._garde(p_commune);

  DELETE FROM public.sauvegardes
  WHERE id=p_id AND commune_id=p_commune;

  GET DIAGNOSTICS n=ROW_COUNT;

  IF n=0 THEN
    RAISE EXCEPTION 'Sauvegarde introuvable dans cette commune';
  END IF;

  PERFORM public._audit(p_commune,'backup_delete',p_id::text,NULL);
END
$function$;
