
CREATE OR REPLACE FUNCTION private.purge_anonymes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  n integer;
BEGIN
  DELETE FROM auth.users AS u
  WHERE u.is_anonymous
    AND u.created_at < now() - interval '2 days'

    -- Préserver l'identité si un dossier utilise encore une référence faible
    -- ou si le citoyen doit encore pouvoir déposer des pièces.
    AND NOT EXISTS (
      SELECT 1
      FROM public.demandes d
      WHERE d.citoyen_id=u.id
        AND (
          d.numero !~ '^[A-Z0-9]{3}-[0-9]{4}-[0-9A-F]{32}$'
          OR d.statut='en_attente_pieces'
        )
    )

    -- Les rendez-vous restent rattachés à leur titulaire jusqu'à traitement.
    AND NOT EXISTS (
      SELECT 1 FROM public.rdv_demandes r WHERE r.citoyen_id=u.id
    )

    -- Ne pas supprimer une identité qui porte encore des données citoyennes,
    -- des messages, des notifications ou un profil.
    AND NOT EXISTS (
      SELECT 1 FROM public.citoyens c WHERE c.user_id=u.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.citoyen_notifications cn WHERE cn.user_id=u.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.messages m WHERE m.de=u.id OR m.a=u.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id=u.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.platform_admins pa WHERE pa.user_id=u.id
    );

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END
$function$;
