
CREATE UNIQUE INDEX IF NOT EXISTS factures_commune_periode_active_uq
ON public.factures(commune_id,periode)
WHERE statut <> 'annulee' AND periode IS NOT NULL;

CREATE OR REPLACE FUNCTION public.saas_facture_creer(
  p_commune uuid,
  p_periode text,
  p_montant integer DEFAULT NULL,
  p_echeance date DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  a public.abonnements;
  m integer;
  n text;
BEGIN
  PERFORM private.pgarde(ARRAY['proprietaire','admin','finance']);

  IF p_commune IS NULL THEN
    RAISE EXCEPTION 'Commune obligatoire';
  END IF;

  IF p_periode IS NULL OR p_periode !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Période invalide (AAAA-MM)';
  END IF;

  -- Sérialise la création pour une même commune et une même période.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_commune::text || ':' || p_periode,0)
  );

  SELECT * INTO a
  FROM public.abonnements
  WHERE commune_id=p_commune
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aucun abonnement pour cette mairie';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.factures
    WHERE commune_id=p_commune
      AND periode=p_periode
      AND statut<>'annulee'
  ) THEN
    RAISE EXCEPTION 'Une facture existe déjà pour cette période';
  END IF;

  m:=coalesce(p_montant,private.prix_abo(a));

  IF m IS NULL OR m<=0 THEN
    RAISE EXCEPTION 'Montant nul ou invalide : renseignez un montant positif';
  END IF;

  n:='FAC-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.facture_seq')::text,5,'0');

  INSERT INTO public.factures(commune_id,numero,periode,montant,echeance)
  VALUES (p_commune,n,p_periode,m,coalesce(p_echeance,current_date+15));

  PERFORM private.paudit(
    'facture_creer',p_commune,
    jsonb_build_object('numero',n,'montant',m)
  );

  RETURN n;
END
$function$;

CREATE OR REPLACE FUNCTION public.saas_paiement_enreg(
  p_facture uuid,
  p_montant integer,
  p_mode text,
  p_reference text,
  p_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  f public.factures;
  paid integer;
  date_paiement date;
  ref text;
BEGIN
  PERFORM private.pgarde(ARRAY['proprietaire','admin','finance']);

  IF p_facture IS NULL THEN
    RAISE EXCEPTION 'Facture obligatoire';
  END IF;

  IF p_mode IS NULL OR p_mode NOT IN ('wave','orange_money','virement','especes','autre') THEN
    RAISE EXCEPTION 'Mode de paiement invalide';
  END IF;

  date_paiement:=coalesce(p_date,current_date);
  IF date_paiement>current_date THEN
    RAISE EXCEPTION 'La date du paiement ne peut pas être future';
  END IF;

  ref:=nullif(trim(p_reference),'');
  IF ref IS NOT NULL AND char_length(ref)>200 THEN
    RAISE EXCEPTION 'Référence de paiement trop longue (200 caractères maximum)';
  END IF;

  SELECT * INTO f
  FROM public.factures
  WHERE id=p_facture
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Facture introuvable';
  END IF;

  IF f.statut NOT IN ('emise','impayee') THEN
    RAISE EXCEPTION 'Seules les factures émises ou impayées peuvent recevoir un paiement';
  END IF;

  SELECT coalesce(sum(montant),0) INTO paid
  FROM public.paiements
  WHERE facture_id=p_facture;

  IF p_montant IS NULL OR p_montant<=0 OR p_montant>f.montant-paid THEN
    RAISE EXCEPTION 'Montant invalide (reste à payer : % FCFA)',f.montant-paid;
  END IF;

  INSERT INTO public.paiements(
    facture_id,commune_id,montant,mode,reference,recu_le,saisi_par
  )
  VALUES (
    p_facture,f.commune_id,p_montant,p_mode,ref,date_paiement,(SELECT auth.uid())
  );

  IF paid+p_montant>=f.montant THEN
    UPDATE public.factures SET statut='payee' WHERE id=p_facture;

    UPDATE public.abonnements
    SET statut=CASE WHEN statut IN ('essai','impaye') THEN 'actif' ELSE statut END,
        prochaine_echeance=(
          greatest(coalesce(prochaine_echeance,current_date),current_date)
          + interval '1 month'
        )::date
    WHERE commune_id=f.commune_id
      AND statut NOT IN ('suspendu','resilie');

    UPDATE public.communes
    SET statut='actif'
    WHERE id=f.commune_id AND statut='essai';
  END IF;

  PERFORM private.paudit(
    'paiement',f.commune_id,
    jsonb_build_object('numero',f.numero,'montant',p_montant,'mode',p_mode)
  );
END
$function$;
