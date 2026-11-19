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

  PERFORM 1
  FROM public.profiles
  WHERE id=u AND role::text='super_admin'
  FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION 'Un profil super_admin ne peut pas être modifié par cette opération';
  END IF;

  -- Un transfert intercommunal doit passer par une procédure dédiée
  -- qui met aussi à jour l'administrateur principal et l'audit des deux communes.
  PERFORM 1
  FROM public.profiles
  WHERE id=u AND commune_id IS NOT NULL AND commune_id <> c
  FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION 'Compte déjà affecté à une autre commune : transfert explicite requis';
  END IF;

  INSERT INTO public.profiles(id,role,commune_id)
  VALUES (u,p_role,c)
  ON CONFLICT (id)
  DO UPDATE SET role=EXCLUDED.role, commune_id=EXCLUDED.commune_id
  WHERE public.profiles.role::text <> 'super_admin'
    AND (public.profiles.commune_id IS NULL OR public.profiles.commune_id=c);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attribution du rôle impossible';
  END IF;
END
$function$;