
CREATE OR REPLACE FUNCTION public.creneaux_rdv(p_commune text,p_service text,p_date date)
RETURNS TABLE(heure time without time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT s.heure
  FROM public.communes c,
       LATERAL public.rdv_slots(c.id,p_date) s
  WHERE c.slug=p_commune
    AND c.statut IN ('essai','actif')
    AND p_date>current_date
    AND p_date<=current_date+90
    AND p_service IN ('secretariat','maire','etat_civil','technique','finances')
    AND NOT EXISTS(
      SELECT 1 FROM public.rdv_demandes r
      WHERE r.commune_id=c.id
        AND r.service=p_service
        AND r.statut='confirmee'
        AND r.date_confirmee=p_date
        AND r.heure_confirmee=s.heure
    )
  ORDER BY s.heure
$function$;

CREATE OR REPLACE FUNCTION public.planning_rdv(p_commune text)
RETURNS TABLE(
  actif boolean,jours integer[],heure_debut time without time zone,
  heure_fin time without time zone,pause_debut time without time zone,
  pause_fin time without time zone,duree_min integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT p.actif,p.jours,p.heure_debut,p.heure_fin,
         p.pause_debut,p.pause_fin,p.duree_min
  FROM public.rdv_planning p
  JOIN public.communes c ON c.id=p.commune_id
  WHERE c.slug=p_commune AND c.statut IN ('essai','actif')
$function$;

CREATE OR REPLACE FUNCTION public.mes_demandes_compte(p_commune text)
RETURNS TABLE(
  numero text,type text,statut text,created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT d.numero,d.type,d.statut::text,d.created_at
  FROM public.demandes d
  JOIN public.communes c ON c.id=d.commune_id
  WHERE c.slug=p_commune
    AND d.citoyen_id=(SELECT auth.uid())
  ORDER BY d.created_at DESC
  LIMIT 100
$function$;

CREATE OR REPLACE FUNCTION public.rdv_slots(p_commune uuid,p_date date)
RETURNS TABLE(heure time without time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT s.t::time
  FROM public.rdv_planning p,
       LATERAL generate_series(
         p_date::timestamp+p.heure_debut,
         p_date::timestamp+p.heure_fin-make_interval(mins=>p.duree_min),
         make_interval(mins=>p.duree_min)
       ) AS s(t)
  WHERE p.commune_id=p_commune
    AND p.actif
    AND extract(isodow FROM p_date)::integer=ANY(p.jours)
    AND (
      p.pause_debut IS NULL
      OR NOT (
        s.t::time<p.pause_fin
        AND s.t::time+make_interval(mins=>p.duree_min)>p.pause_debut
      )
    )
  ORDER BY 1
$function$;

CREATE OR REPLACE FUNCTION public.trg_notif_demande()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.citoyen_id IS NOT NULL
     AND EXISTS(
       SELECT 1 FROM public.citoyens WHERE user_id=NEW.citoyen_id
     ) THEN
    INSERT INTO public.citoyen_notifications(
      user_id,commune_id,demande_id,titre,corps
    )
    VALUES(
      NEW.citoyen_id,NEW.commune_id,NEW.id,'Demande '||NEW.numero,
      CASE NEW.statut::text
        WHEN 'orientee' THEN 'Votre demande a été transmise au service compétent.'
        WHEN 'en_cours' THEN 'Votre demande est en cours de traitement.'
        WHEN 'a_valider' THEN 'Votre demande est en cours de vérification.'
        WHEN 'en_attente_pieces' THEN 'Des informations complémentaires sont nécessaires. Ouvrez votre dossier.'
        WHEN 'acceptee' THEN 'Votre demande a été acceptée.'
        WHEN 'pret_a_retirer' THEN 'Votre document est prêt. Ouvrez votre dossier pour savoir où et quand le retirer.'
        WHEN 'traitee' THEN 'Votre demande a été traitée. Une réponse est disponible.'
        WHEN 'redirigee' THEN 'Votre demande a été orientée vers l’organisme compétent.'
        WHEN 'rejetee' THEN 'Votre demande a été rejetée. Consultez le motif.'
        WHEN 'cloturee' THEN 'Votre dossier est clôturé.'
        ELSE 'Le statut de votre demande a changé.'
      END
    );
  END IF;
  RETURN NEW;
END
$function$;

CREATE OR REPLACE FUNCTION public.trg_notif_rdv()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.citoyen_id IS NOT NULL
     AND NEW.statut IN ('confirmee','refusee')
     AND EXISTS(
       SELECT 1 FROM public.citoyens WHERE user_id=NEW.citoyen_id
     ) THEN
    INSERT INTO public.citoyen_notifications(user_id,commune_id,titre,corps)
    VALUES(
      NEW.citoyen_id,NEW.commune_id,'Rendez-vous '||NEW.numero,
      CASE NEW.statut
        WHEN 'confirmee' THEN
          'Votre rendez-vous est confirmé le '||
          to_char(NEW.date_confirmee,'DD/MM/YYYY')||
          ' à '||to_char(NEW.heure_confirmee,'HH24:MI')||'.'
        ELSE
          'Le service ne peut pas vous recevoir à la date demandée. Consultez sa réponse.'
      END
    );
  END IF;
  RETURN NEW;
END
$function$;
