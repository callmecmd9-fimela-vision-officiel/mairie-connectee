
CREATE OR REPLACE FUNCTION public.convoquer_reunion(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  r public.reunions;
BEGIN
  IF auth.uid() IS NULL
     OR NOT (
       private.is_platform_admin()
       OR coalesce(private.my_role() IN ('maire','secretariat','super_admin'), false)
     ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  SELECT * INTO r
  FROM public.reunions
  WHERE id = p_id;

  IF r.id IS NULL
     OR (
       r.commune_id IS DISTINCT FROM private.my_commune()
       AND NOT private.is_platform_admin()
     ) THEN
    RAISE EXCEPTION 'Réunion introuvable';
  END IF;

  UPDATE public.reunions
  SET convoquee = true
  WHERE id = p_id;

  INSERT INTO public.notifications(commune_id,user_id,titre,corps,lien)
  SELECT r.commune_id,a.user_id,'Convocation',
         r.objet || ' — ' || to_char(r.jour,'DD/MM/YYYY') || ' ' || to_char(r.heure,'HH24:MI'),
         'reun'
  FROM public.reunion_participants p
  JOIN public.adjoints a ON a.id = p.adjoint_id
  WHERE p.reunion_id = p_id
    AND a.user_id IS NOT NULL;

  PERFORM private.notifier_maires(r.commune_id,'Réunion convoquée',r.objet,'reun');
END;
$function$;

CREATE OR REPLACE FUNCTION public.relancer_instruction(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  i public.instructions;
BEGIN
  IF auth.uid() IS NULL
     OR NOT (
       private.is_platform_admin()
       OR coalesce(private.my_role() IN ('maire','secretariat','super_admin'), false)
     ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  SELECT * INTO i
  FROM public.instructions
  WHERE id = p_id;

  IF i.id IS NULL
     OR (
       i.commune_id IS DISTINCT FROM private.my_commune()
       AND NOT private.is_platform_admin()
     ) THEN
    RAISE EXCEPTION 'Instruction introuvable';
  END IF;

  IF i.adjoint_id IS NOT NULL THEN
    PERFORM private.notifier_adjoint(
      i.commune_id,i.adjoint_id,'Relance',
      i.reference || ' : ' || i.objet,'instr'
    );
  END IF;

  IF i.service IS NOT NULL AND i.service NOT IN ('externe','adjoint') THEN
    PERFORM private.notifier_role(
      i.commune_id,i.service,'Relance',
      i.reference || ' : ' || i.objet,'s_instr'
    );
  END IF;
END;
$function$;
