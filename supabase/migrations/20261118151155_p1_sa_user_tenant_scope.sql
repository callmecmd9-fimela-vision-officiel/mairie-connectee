
CREATE OR REPLACE FUNCTION public.sa_stats(p_commune text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  r jsonb;
  t text;
  n bigint;
  vol jsonb := '{}'::jsonb;
BEGIN
  PERFORM public._garde(p_commune);

  FOREACH t IN ARRAY ARRAY[
    'demandes','courrier','deliberations','actes','projets',
    'publications','medias','rdv','reunions'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema='public'
           AND table_name=t
           AND column_name='commune_id'
       ) THEN
      EXECUTE format(
        'SELECT count(*) FROM public.%I WHERE commune_id::text = $1',
        t
      ) INTO n USING p_commune;
      vol := vol || jsonb_build_object(t,n);
    END IF;
  END LOOP;

  SELECT jsonb_build_object(
    'users_total', (
      SELECT count(*) FROM public.profiles p
      WHERE p.commune_id::text = p_commune
    ),
    'users_actifs', (
      SELECT count(*) FROM public.profiles p
      WHERE p.commune_id::text = p_commune AND p.actif
    ),
    'users_30j', (
      SELECT count(*)
      FROM public.profiles p
      JOIN auth.users u ON u.id=p.id
      WHERE p.commune_id::text = p_commune
        AND u.created_at > now() - interval '30 days'
    ),
    'par_role', (
      SELECT coalesce(jsonb_object_agg(role,c),'{}'::jsonb)
      FROM (
        SELECT p.role::text AS role,count(*) c
        FROM public.profiles p
        WHERE p.commune_id::text = p_commune
        GROUP BY 1
      ) x
    ),
    'derniere_sauvegarde', (
      SELECT max(created_at) FROM public.sauvegardes
      WHERE commune_id = p_commune
    ),
    'nb_sauvegardes', (
      SELECT count(*) FROM public.sauvegardes
      WHERE commune_id = p_commune
    ),
    'incidents_ouverts', (
      SELECT count(*) FROM public.incidents
      WHERE commune_id = p_commune AND statut <> 'resolu'
    ),
    'audit_24h', (
      SELECT count(*) FROM public.journal_audit
      WHERE commune_id = p_commune
        AND created_at > now() - interval '24 hours'
    ),
    'taille_db', pg_database_size(current_database()),
    'volumes', vol
  ) INTO r;

  RETURN r;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sa_utilisateurs(p_commune text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  PERFORM public._garde(p_commune);

  RETURN coalesce((
    SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC)
    FROM (
      SELECT
        p.id,
        u.email,
        coalesce(p.nom,u.raw_user_meta_data->>'nom') AS nom,
        p.role::text AS role,
        p.service,
        p.actif,
        c.nom AS commune,
        p.commune_id::text AS commune_id,
        u.created_at,
        u.last_sign_in_at,
        (
          SELECT count(*) FROM auth.sessions s
          WHERE s.user_id=p.id
        ) AS sessions
      FROM public.profiles p
      JOIN auth.users u ON u.id=p.id
      LEFT JOIN public.communes c ON c.id=p.commune_id
      WHERE p.commune_id::text = p_commune
    ) x
  ), '[]'::jsonb);
END;
$function$;
