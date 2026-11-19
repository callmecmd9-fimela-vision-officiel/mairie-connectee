CREATE OR REPLACE FUNCTION public.admin_attribuer(
  p_email text,
  p_role text,
  p_slug text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  u uuid;
  c uuid;
BEGIN
  IF NOT private.is_platform_admin() THEN
    RAISE EXCEPTION 'Accès plateforme refusé : MFA AAL2 requise';
  END IF;

  IF p_role NOT IN (
    'maire','adjoint','cabinet','secretariat','finances',
    'rh','etat_civil','technique','agent','citoyen'
  ) THEN
    RAISE EXCEPTION 'Rôle invalide';
  END IF;

  SELECT id INTO u
  FROM auth.users
  WHERE lower(email) = lower(trim(p_email))
    AND NOT is_anonymous
  FOR UPDATE;

  IF u IS NULL THEN
    RAISE EXCEPTION 'Utilisateur introuvable : un compte nominatif doit d’abord être créé';
  END IF;

  -- L'identité propriétaire/administrateur de plateforme reste distincte
  -- des identités municipales, quel que soit le rôle demandé.
  PERFORM 1
  FROM public.platform_admins
  WHERE user_id=u
  FOR KEY SHARE;

  IF FOUND THEN
    RAISE EXCEPTION 'Un compte administrateur plateforme ne peut pas recevoir de rôle municipal';
  END IF;

  SELECT id INTO c
  FROM public.communes
  WHERE slug = lower(trim(p_slug));

  IF c IS NULL THEN
    RAISE EXCEPTION 'Commune inconnue';
  END IF;

  -- Ne jamais écraser un profil super_admin.
  PERFORM 1
  FROM public.profiles
  WHERE id=u AND role::text='super_admin'
  FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION 'Un profil super_admin ne peut pas être modifié par cette opération';
  END IF;

  INSERT INTO public.profiles(id,role,commune_id)
  VALUES (u,p_role,c)
  ON CONFLICT (id)
  DO UPDATE SET role=EXCLUDED.role, commune_id=EXCLUDED.commune_id
  WHERE public.profiles.role::text <> 'super_admin';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attribution du rôle impossible';
  END IF;
END
$function$;