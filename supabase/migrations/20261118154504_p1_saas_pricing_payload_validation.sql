
CREATE OR REPLACE FUNCTION public.saas_abo_maj(
  p_commune uuid,
  p_plan text,
  p_statut text,
  p_prix_perso integer,
  p_fin_essai date,
  p_echeance date,
  p_options jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  o jsonb;
  total_options bigint := 0;
BEGIN
  PERFORM private.pgarde(ARRAY['proprietaire','admin','finance']);

  IF p_commune IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.communes WHERE id=p_commune
  ) THEN
    RAISE EXCEPTION 'Mairie introuvable';
  END IF;

  IF p_plan IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.plans WHERE code=p_plan
  ) THEN
    RAISE EXCEPTION 'Offre inconnue';
  END IF;

  IF p_statut IS NULL OR p_statut NOT IN ('essai','actif','impaye','suspendu','resilie') THEN
    RAISE EXCEPTION 'Statut invalide';
  END IF;

  IF p_prix_perso IS NOT NULL AND p_prix_perso<0 THEN
    RAISE EXCEPTION 'Prix invalide';
  END IF;

  p_options:=coalesce(p_options,'[]'::jsonb);

  IF jsonb_typeof(p_options)<>'array' THEN
    RAISE EXCEPTION 'Options invalides : un tableau est requis';
  END IF;

  IF jsonb_array_length(p_options)>20 THEN
    RAISE EXCEPTION '20 options maximum par abonnement';
  END IF;

  FOR o IN SELECT value FROM jsonb_array_elements(p_options) AS x(value) LOOP
    IF jsonb_typeof(o)<>'object'
       OR coalesce(trim(o->>'nom'),'')=''
       OR char_length(trim(o->>'nom'))>100
       OR coalesce(o->>'prix','') !~ '^[0-9]{1,9}$' THEN
      RAISE EXCEPTION 'Option invalide : nom (100 caractères max) et prix entier requis';
    END IF;

    total_options:=total_options+(o->>'prix')::bigint;
    IF total_options>2147483647 THEN
      RAISE EXCEPTION 'Le total des options dépasse le montant maximal autorisé';
    END IF;
  END LOOP;

  INSERT INTO public.abonnements(
    commune_id,plan_code,statut,fin_essai,prochaine_echeance,prix_perso,options
  )
  VALUES (
    p_commune,p_plan,p_statut,p_fin_essai,p_echeance,p_prix_perso,p_options
  )
  ON CONFLICT (commune_id) DO UPDATE
  SET plan_code=excluded.plan_code,
      statut=excluded.statut,
      fin_essai=excluded.fin_essai,
      prochaine_echeance=excluded.prochaine_echeance,
      prix_perso=excluded.prix_perso,
      options=excluded.options;

  PERFORM private.paudit(
    'abo_maj',p_commune,
    jsonb_build_object(
      'plan',p_plan,'statut',p_statut,
      'prix_perso',p_prix_perso,'options_count',jsonb_array_length(p_options)
    )
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.saas_plan_maj(
  p_code text,
  p_nom text,
  p_prix integer,
  p_actif boolean,
  p_ordre integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  PERFORM private.pgarde(ARRAY['proprietaire','admin']);

  IF p_code IS NULL OR p_code !~ '^[a-z0-9_]{2,30}$' THEN
    RAISE EXCEPTION 'Code invalide (a-z, 0-9, _)';
  END IF;

  IF coalesce(trim(p_nom),'')=''
     OR char_length(trim(p_nom))>120
     OR p_prix IS NULL
     OR p_prix<0 THEN
    RAISE EXCEPTION 'Nom (120 caractères max) et prix entier valide requis';
  END IF;

  INSERT INTO public.plans(code,nom,prix_mensuel,actif,ordre)
  VALUES (p_code,trim(p_nom),p_prix,coalesce(p_actif,true),coalesce(p_ordre,0))
  ON CONFLICT (code) DO UPDATE
  SET nom=excluded.nom,
      prix_mensuel=excluded.prix_mensuel,
      actif=excluded.actif,
      ordre=excluded.ordre;

  PERFORM private.paudit(
    'plan_maj',NULL,
    jsonb_build_object('code',p_code,'prix',p_prix,'actif',p_actif)
  );
END
$function$;
