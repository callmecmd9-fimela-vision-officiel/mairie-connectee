BEGIN;
ALTER TABLE public.demandes DROP CONSTRAINT demandes_pieces_check;
ALTER TABLE public.demandes ADD CONSTRAINT demandes_pieces_check CHECK (cardinality(pieces) <= 12);
DROP POLICY IF EXISTS pieces_depot ON storage.objects;
CREATE POLICY pieces_depot ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 bucket_id='pieces'
 AND owner_id=(SELECT auth.uid())::text
 AND private.commune_ouverte((storage.foldername(name))[1])
 AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 AND name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$'
 AND (SELECT private.nb_pieces((SELECT auth.uid())::text)) < 3
);
CREATE OR REPLACE FUNCTION public.creer_demande(
 p_commune text,p_type text,p_nom text,p_message text,p_objet text DEFAULT NULL::text,
 p_contact text DEFAULT NULL::text,p_pieces text[] DEFAULT '{}'::text[],p_demarche uuid DEFAULT NULL::uuid
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE c public.communes; n text; sv text; dm public.demarches; v_pieces text[]:=coalesce(p_pieces,'{}'::text[]);
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Session citoyenne requise'; END IF;
 IF char_length(trim(coalesce(p_nom,''))) NOT BETWEEN 1 AND 120 OR char_length(trim(coalesce(p_message,''))) NOT BETWEEN 1 AND 2000 OR char_length(coalesce(p_objet,''))>200 OR char_length(coalesce(p_contact,''))>40 OR cardinality(v_pieces)>3 THEN RAISE EXCEPTION 'Demande invalide'; END IF;
 IF (SELECT count(DISTINCT x) FROM unnest(v_pieces) AS u(x))<>cardinality(v_pieces) THEN RAISE EXCEPTION 'Pièces invalides'; END IF;
 UPDATE public.communes SET compteur=compteur+1 WHERE slug=p_commune AND statut IN ('essai','actif') RETURNING * INTO c;
 IF c.id IS NULL THEN RAISE EXCEPTION 'Commune inconnue'; END IF;
 IF p_demarche IS NOT NULL THEN SELECT * INTO dm FROM public.demarches WHERE id=p_demarche AND commune_id=c.id AND statut='actif'; IF dm.id IS NULL THEN RAISE EXCEPTION 'Démarche invalide'; END IF; p_type:=dm.type; END IF;
 IF p_type NOT IN ('État civil','Audience','Aide sociale','Travaux publics','Urbanisme','Environnement','Éducation','Sport et culture','Commerce','Agriculture et pêche','Réclamations','Associations') THEN RAISE EXCEPTION 'Demande invalide'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(v_pieces) AS f(path) WHERE f.path IS NULL OR f.path !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$' OR split_part(f.path,'/',1)<>c.id::text OR NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='pieces' AND o.name=f.path AND o.owner_id=auth.uid()::text)) THEN RAISE EXCEPTION 'Pièce invalide ou inaccessible'; END IF;
 sv:=coalesce(dm.service,CASE p_type WHEN 'État civil' THEN 'etat_civil' WHEN 'Travaux publics' THEN 'technique' WHEN 'Urbanisme' THEN 'technique' WHEN 'Environnement' THEN 'technique' ELSE 'secretariat' END);
 n:=upper(left(c.slug,3))||'-'||lpad(c.compteur::text,4,'0')||'-'||upper(replace(gen_random_uuid()::text,'-',''));
 INSERT INTO public.demandes(commune_id,numero,type,nom,message,objet,contact,pieces,service,citoyen_id) VALUES(c.id,n,p_type,trim(p_nom),trim(p_message),nullif(trim(coalesce(p_objet,'')),''),nullif(trim(coalesce(p_contact,'')),''),v_pieces,sv,auth.uid());
 RETURN n;
END;$function$;
CREATE OR REPLACE FUNCTION public.completer_demande(p_commune text,p_numero text,p_pieces text[])
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE c record; d record;
BEGIN
 IF auth.uid() IS NULL THEN RETURN false; END IF;
 IF p_pieces IS NULL OR cardinality(p_pieces)<1 OR cardinality(p_pieces)>3 THEN RETURN false; END IF;
 IF (SELECT count(DISTINCT x) FROM unnest(p_pieces) AS u(x))<>cardinality(p_pieces) THEN RETURN false; END IF;
 SELECT id INTO c FROM public.communes WHERE slug=p_commune AND statut IN ('essai','actif');
 IF c.id IS NULL THEN RETURN false; END IF;
 SELECT id,pieces INTO d FROM public.demandes WHERE commune_id=c.id AND numero=upper(trim(p_numero)) AND statut='en_attente_pieces' FOR UPDATE;
 IF d.id IS NULL OR cardinality(coalesce(d.pieces,'{}'::text[]))+cardinality(p_pieces)>12 OR coalesce(d.pieces,'{}'::text[]) && p_pieces THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM unnest(p_pieces) AS f(path) WHERE f.path IS NULL OR f.path !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$' OR split_part(f.path,'/',1)<>c.id::text OR NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='pieces' AND o.name=f.path AND o.owner_id=auth.uid()::text)) THEN RETURN false; END IF;
 UPDATE public.demandes SET pieces=coalesce(pieces,'{}'::text[])||p_pieces,statut='en_cours' WHERE id=d.id;
 RETURN true;
END;$function$;
CREATE OR REPLACE FUNCTION public.annuler_rdv(p_commune text,p_numero text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE r record;
BEGIN
 IF auth.uid() IS NULL THEN RETURN false; END IF;
 SELECT x.id,x.commune_id,x.numero,x.nom,x.service INTO r FROM public.rdv_demandes x JOIN public.communes c ON c.id=x.commune_id WHERE c.slug=p_commune AND x.numero=upper(trim(p_numero)) AND x.statut IN ('demandee','confirmee') AND coalesce(x.date_confirmee,x.date_souhaitee)>=current_date FOR UPDATE OF x;
 IF r.id IS NULL THEN RETURN false; END IF;
 UPDATE public.rdv_demandes SET statut='annulee',annule_le=now() WHERE id=r.id;
 BEGIN INSERT INTO public.notifications(user_id,commune_id,titre,corps) SELECT p.id,r.commune_id,'Rendez-vous annulé '||r.numero,r.nom||' a annulé son rendez-vous ('||r.service||').' FROM public.profiles p WHERE p.commune_id=r.commune_id AND p.role IN ('maire','cabinet','secretariat'); EXCEPTION WHEN OTHERS THEN NULL; END;
 RETURN true;
END;$function$;
CREATE OR REPLACE FUNCTION public.creer_rdv(p_commune text,p_service text,p_nom text,p_contact text,p_motif text,p_date date,p_heure time DEFAULT NULL::time)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE c record;n text;u uuid:=auth.uid();pl boolean;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'session'; END IF;
 SELECT id INTO c FROM public.communes WHERE slug=p_commune AND statut IN ('essai','actif');
 IF c.id IS NULL THEN RAISE EXCEPTION 'commune'; END IF;
 IF p_date IS NULL OR p_date<=current_date OR p_date>current_date+90 THEN RAISE EXCEPTION 'date'; END IF;
 IF (SELECT count(*) FROM public.rdv_demandes WHERE citoyen_id=u AND statut='demandee')>=3 THEN RAISE EXCEPTION 'limite'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.rdv_planning WHERE commune_id=c.id AND actif) INTO pl;
 IF pl THEN
  IF p_heure IS NULL OR NOT EXISTS(SELECT 1 FROM public.rdv_slots(c.id,p_date) s WHERE s.heure=p_heure) THEN RAISE EXCEPTION 'creneau'; END IF;
  IF EXISTS(SELECT 1 FROM public.rdv_demandes r WHERE r.commune_id=c.id AND r.service=p_service AND r.statut='confirmee' AND r.date_confirmee=p_date AND r.heure_confirmee=p_heure) THEN RAISE EXCEPTION 'creneau'; END IF;
 END IF;
 n:='RDV-'||upper(replace(gen_random_uuid()::text,'-',''));
 INSERT INTO public.rdv_demandes(commune_id,citoyen_id,numero,service,nom,contact,motif,date_souhaitee,heure_souhaitee) VALUES(c.id,u,n,p_service,trim(p_nom),nullif(trim(coalesce(p_contact,'')),''),trim(p_motif),p_date,case when pl then p_heure end);
 RETURN n;
END;$function$;
REVOKE EXECUTE ON FUNCTION public.creer_demande(text,text,text,text,text,text,text[],uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.creer_demande(text,text,text,text,text,text,text[],uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.completer_demande(text,text,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.completer_demande(text,text,text[]) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.annuler_rdv(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.annuler_rdv(text,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.creer_rdv(text,text,text,text,text,date,time) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.creer_rdv(text,text,text,text,text,date,time) TO authenticated;
COMMIT;