
CREATE OR REPLACE FUNCTION public.org_affectation_fin(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE c uuid:=public.org_commune();
BEGIN
  IF NOT public.org_droit('org','administrer') THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  UPDATE public.org_affectations
  SET actif=false,fin=least(coalesce(fin,current_date),current_date)
  WHERE id=p_id AND commune_id=c;

  IF NOT FOUND THEN RAISE EXCEPTION 'Affectation introuvable'; END IF;
  PERFORM public.org_log(c,'org_affectation_fin',p_id::text,NULL);
END
$function$;

CREATE OR REPLACE FUNCTION public.org_affecter(
  p_user uuid,p_poste text,p_service text DEFAULT NULL,
  p_debut date DEFAULT NULL,p_fin date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  c uuid:=public.org_commune();
  did uuid;
  d date:=coalesce(p_debut,current_date);
  role_cible text;
BEGIN
  IF NOT public.org_droit('org','administrer') THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  PERFORM 1 FROM public.profiles
  WHERE id=p_user AND commune_id=c AND role::text<>'super_admin'
  FOR KEY SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Utilisateur invalide'; END IF;

  SELECT role_code INTO role_cible
  FROM public.org_postes
  WHERE commune_id=c AND code=p_poste AND actif;
  IF NOT FOUND THEN RAISE EXCEPTION 'Poste invalide'; END IF;

  IF p_service IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM public.services WHERE commune_id=c AND code=p_service
  ) THEN
    RAISE EXCEPTION 'Service invalide';
  END IF;

  IF NOT public.org_peut_accorder(role_cible) THEN
    RAISE EXCEPTION 'Vous ne pouvez affecter qu''à un poste dont les droits vous appartiennent';
  END IF;

  IF p_fin IS NOT NULL AND p_fin<d THEN
    RAISE EXCEPTION 'Période invalide';
  END IF;

  INSERT INTO public.org_affectations(
    commune_id,user_id,poste_code,service_code,debut,fin,created_by
  )
  VALUES(c,p_user,p_poste,p_service,d,p_fin,(SELECT auth.uid()))
  RETURNING id INTO did;

  PERFORM public.org_log(
    c,'org_affecter',p_user::text,
    jsonb_build_object('poste',p_poste,'debut',d,'fin',p_fin)
  );
  RETURN did;
END
$function$;

CREATE OR REPLACE FUNCTION public.org_deleguer(
  p_a uuid,p_module text,p_action text,p_debut timestamptz,
  p_fin timestamptz,p_motif text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  c uuid:=public.org_commune();
  u uuid:=(SELECT auth.uid());
  t record;
  did uuid;
  d timestamptz:=coalesce(p_debut,now());
BEGIN
  IF c IS NULL OR u IS NULL THEN RAISE EXCEPTION 'Accès refusé'; END IF;

  IF p_action NOT IN (
    'consulter','creer','modifier','supprimer','valider','rejeter',
    'signer','exporter','imprimer','partager','administrer'
  ) THEN
    RAISE EXCEPTION 'Action inconnue';
  END IF;

  SELECT role,commune_id INTO t
  FROM public.profiles
  WHERE id=p_a AND coalesce(actif,true)
  FOR KEY SHARE;

  IF NOT FOUND OR t.commune_id IS DISTINCT FROM c
     OR t.role IN ('super_admin','citoyen') THEN
    RAISE EXCEPTION 'Bénéficiaire invalide';
  END IF;

  IF p_a=u THEN RAISE EXCEPTION 'Délégation à soi-même impossible'; END IF;
  IF p_fin IS NULL OR p_fin<=d OR p_fin>d+interval '1 year' THEN
    RAISE EXCEPTION 'Période invalide (1 an maximum)';
  END IF;
  IF NOT public.org_droit_propre(u,p_module,p_action) THEN
    RAISE EXCEPTION 'Vous ne pouvez déléguer que les droits que vous détenez';
  END IF;

  INSERT INTO public.org_delegations_droits(
    commune_id,de_user,a_user,module,action,debut,fin,motif
  )
  VALUES(c,u,p_a,p_module,p_action,d,p_fin,p_motif)
  RETURNING id INTO did;

  PERFORM public.org_log(
    c,'org_deleguer',p_a::text,
    jsonb_build_object('module',p_module,'action',p_action,'debut',d,'fin',p_fin)
  );
  RETURN did;
END
$function$;

CREATE OR REPLACE FUNCTION public.org_init()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE c uuid;
BEGIN
  IF NOT public.org_droit('org','administrer') THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  c:=public.org_commune();
  PERFORM public.org_seed(c);
  PERFORM public.org_log(c,'org_init',NULL,NULL);
END
$function$;

CREATE OR REPLACE FUNCTION public.org_poste_save(
  p_code text,p_nom text,p_famille text,p_role text,
  p_parent text,p_service text,p_actif boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  c uuid:=public.org_commune();
  x text:=p_parent;
  n integer:=0;
BEGIN
  IF NOT public.org_droit('org','administrer') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.org_roles WHERE commune_id=c AND code=p_role AND actif
  ) THEN RAISE EXCEPTION 'Rôle invalide'; END IF;
  IF NOT public.org_peut_accorder(p_role) THEN
    RAISE EXCEPTION 'Vous ne pouvez utiliser qu''un rôle dont les droits vous appartiennent';
  END IF;
  IF p_parent IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM public.org_postes WHERE commune_id=c AND code=p_parent
  ) THEN RAISE EXCEPTION 'Poste supérieur introuvable'; END IF;

  WHILE x IS NOT NULL AND n<30 LOOP
    IF x=p_code THEN RAISE EXCEPTION 'Lien hiérarchique circulaire'; END IF;
    SELECT parent_code INTO x
    FROM public.org_postes WHERE commune_id=c AND code=x;
    n:=n+1;
  END LOOP;

  INSERT INTO public.org_postes(
    commune_id,code,nom,famille,role_code,parent_code,service_code,actif
  )
  VALUES(c,p_code,trim(p_nom),p_famille,p_role,p_parent,p_service,coalesce(p_actif,true))
  ON CONFLICT(commune_id,code) DO UPDATE
  SET nom=excluded.nom,famille=excluded.famille,role_code=excluded.role_code,
      parent_code=excluded.parent_code,service_code=excluded.service_code,
      actif=excluded.actif;

  PERFORM public.org_log(
    c,'org_poste_save',p_code,
    jsonb_build_object('role',p_role,'parent',p_parent,'actif',p_actif)
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.org_revoquer(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  c uuid:=public.org_commune();
  u uuid:=(SELECT auth.uid());
  n integer;
BEGIN
  UPDATE public.org_delegations_droits
  SET revoque_le=now(),revoque_par=u
  WHERE id=p_id AND commune_id=c AND revoque_le IS NULL
    AND (de_user=u OR public.org_droit('org','administrer'));

  GET DIAGNOSTICS n=ROW_COUNT;
  IF n=0 THEN RAISE EXCEPTION 'Délégation introuvable ou accès refusé'; END IF;
  PERFORM public.org_log(c,'org_revoquer',p_id::text,NULL);
END
$function$;

CREATE OR REPLACE FUNCTION public.org_role_droit_set(
  p_role text,p_module text,p_action text,p_on boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE c uuid:=public.org_commune(); u uuid:=(SELECT auth.uid());
BEGIN
  IF NOT public.org_droit('org','administrer') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF p_role='maire' OR NOT EXISTS(
    SELECT 1 FROM public.org_roles WHERE commune_id=c AND code=p_role
  ) THEN RAISE EXCEPTION 'Rôle invalide'; END IF;

  IF p_on THEN
    IF NOT public.org_droit_propre(u,p_module,p_action) THEN
      RAISE EXCEPTION 'Vous ne pouvez accorder que les droits que vous détenez';
    END IF;
    INSERT INTO public.org_role_droits(commune_id,role_code,module,action)
    VALUES(c,p_role,p_module,p_action)
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.org_role_droits
    WHERE commune_id=c AND role_code=p_role AND module=p_module AND action=p_action;
  END IF;

  PERFORM public.org_log(
    c,'org_role_droit',p_role,
    jsonb_build_object('module',p_module,'action',p_action,'accorde',p_on)
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.org_role_save(
  p_code text,p_nom text,p_desc text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE c uuid:=public.org_commune();
BEGIN
  IF NOT public.org_droit('org','administrer') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF p_code='maire' THEN RAISE EXCEPTION 'Rôle protégé'; END IF;
  IF coalesce(trim(p_nom),'')='' THEN RAISE EXCEPTION 'Nom obligatoire'; END IF;

  INSERT INTO public.org_roles(commune_id,code,nom,description)
  VALUES(c,p_code,trim(p_nom),p_desc)
  ON CONFLICT(commune_id,code) DO UPDATE
  SET nom=excluded.nom,description=excluded.description;

  PERFORM public.org_log(c,'org_role_save',p_code,jsonb_build_object('nom',p_nom));
END
$function$;

CREATE OR REPLACE FUNCTION public.org_service_save(
  p_code text,p_nom text,p_type text,p_parent text,p_responsable text,
  p_description text,p_actif boolean DEFAULT true,
  p_ordre integer DEFAULT NULL,p_effectif integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  c uuid:=public.org_commune();
  x text:=p_parent;
  n integer:=0;
  pid uuid;
  sid uuid;
  cur boolean;
BEGIN
  IF c IS NULL OR NOT public.org_droit('org','administrer') THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  IF p_code IS NULL OR p_code !~ '^[a-z][a-z0-9_]{1,60}$' THEN
    RAISE EXCEPTION 'Code invalide (minuscules, chiffres, _)';
  END IF;
  IF length(trim(coalesce(p_nom,'')))<2 THEN RAISE EXCEPTION 'Le nom est obligatoire'; END IF;
  IF p_ordre IS NOT NULL AND p_ordre<0 THEN RAISE EXCEPTION 'Ordre invalide'; END IF;
  IF p_effectif IS NOT NULL AND p_effectif<0 THEN RAISE EXCEPTION 'Effectif invalide'; END IF;

  IF p_parent IS NOT NULL THEN
    SELECT id INTO pid FROM public.services WHERE commune_id=c AND code=p_parent;
    IF pid IS NULL THEN RAISE EXCEPTION 'Service parent introuvable'; END IF;

    WHILE x IS NOT NULL AND n<30 LOOP
      IF x=p_code THEN RAISE EXCEPTION 'Lien hiérarchique circulaire'; END IF;
      SELECT p2.code INTO x
      FROM public.services s
      JOIN public.services p2 ON p2.id=s.parent_id
      WHERE s.commune_id=c AND s.code=x;
      n:=n+1;
    END LOOP;
  END IF;

  SELECT id,actif INTO sid,cur
  FROM public.services WHERE commune_id=c AND code=p_code;

  IF sid IS NOT NULL AND coalesce(cur,true) AND NOT coalesce(p_actif,true) THEN
    IF EXISTS(
      SELECT 1 FROM public.org_postes
      WHERE commune_id=c AND service_code=p_code AND coalesce(actif,true)
    ) OR EXISTS(
      SELECT 1 FROM public.org_affectations
      WHERE commune_id=c AND service_code=p_code AND coalesce(actif,true)
    ) OR EXISTS(
      SELECT 1 FROM public.services
      WHERE commune_id=c AND parent_id=sid AND coalesce(actif,true)
    ) THEN
      RAISE EXCEPTION 'Service utilisé (postes, agents ou sous-services actifs) : désactivation refusée';
    END IF;
  END IF;

  INSERT INTO public.services(
    commune_id,code,nom,type,parent_id,responsable,description,
    actif,ordre,effectif
  )
  VALUES(
    c,p_code,trim(p_nom),coalesce(p_type,'service'),pid,
    nullif(trim(p_responsable),''),nullif(trim(p_description),''),
    coalesce(p_actif,true),coalesce(p_ordre,0),p_effectif
  )
  ON CONFLICT(commune_id,code) DO UPDATE
  SET nom=excluded.nom,type=excluded.type,parent_id=excluded.parent_id,
      responsable=excluded.responsable,description=excluded.description,
      actif=excluded.actif,ordre=coalesce(p_ordre,public.services.ordre),
      effectif=coalesce(p_effectif,public.services.effectif);

  PERFORM public.org_log(
    c,'org_service_save',p_code,
    jsonb_build_object('parent',p_parent,'actif',p_actif)
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.org_tracer(p_module text,p_cible text DEFAULT NULL)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  INSERT INTO public.acces_sensibles(commune_id,user_id,module,cible)
  SELECT public.org_commune(),(SELECT auth.uid()),left(p_module,40),left(p_cible,200)
  WHERE public.org_commune() IS NOT NULL AND (SELECT auth.uid()) IS NOT NULL
$function$;

CREATE OR REPLACE FUNCTION public.org_seed(p uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  r record;
  acts text[];
  m text;
  a text;
  ac text;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('maire','Maire','Direction municipale',ARRAY[]::text[],'none',false,NULL),
    ('adjoint','Adjoint au maire','Direction municipale',ARRAY[]::text[],'none',false,'maire'),
    ('secretaire_municipal','Secrétaire municipal','Administration générale',ARRAY['cin','cout','actes','conseil','dossiers','archives','instr','rapports','citoyens'],'resp',false,'maire'),
    ('secretariat','Secrétariat','Administration générale',ARRAY['cin','cout','dossiers','archives','instr','conseil'],'oper',false,'secretaire_municipal'),
    ('conseiller_municipal','Conseiller municipal','Gouvernance municipale',ARRAY['conseil','rapports','projets'],'lect',false,'maire'),
    ('resp_finances','Responsable finances','Services financiers',ARRAY['budget','rapports'],'resp',true,'maire'),
    ('resp_marches','Responsable commande publique et marchés','Services financiers',ARRAY['marches'],'resp',true,'resp_finances'),
    ('regie','Régie municipale','Services financiers',ARRAY['regie'],'oper',false,'resp_finances'),
    ('resp_rh','Responsable RH','Ressources humaines',ARRAY['personnel','conges','rapports'],'resp',false,'secretaire_municipal'),
    ('agent_rh','Agent RH','Ressources humaines',ARRAY['personnel','conges'],'agent',false,'resp_rh'),
    ('resp_etat_civil','Responsable état civil','Services spécialisés',ARRAY['civil','citoyens','archives'],'resp',true,'secretaire_municipal'),
    ('resp_technique','Responsable des services techniques','Services spécialisés',ARRAY['projets','territoire','patrimoine'],'resp',true,'secretaire_municipal'),
    ('resp_urbanisme','Responsable urbanisme et foncier','Services spécialisés',ARRAY['territoire','dossiers','citoyens'],'resp',true,'secretaire_municipal'),
    ('resp_juridique','Responsable juridique','Services spécialisés',ARRAY['actes','dossiers','conseil','archives'],'resp',true,'secretaire_municipal'),
    ('resp_archives','Responsable archives et documentation','Services spécialisés',ARRAY['archives','dossiers'],'resp',true,'secretaire_municipal'),
    ('resp_communication','Responsable communication','Services spécialisés',ARRAY['pub','med'],'resp',true,'secretaire_municipal'),
    ('resp_dev_social','Responsable développement local et social','Services spécialisés',ARRAY['projets','citoyens'],'resp',true,'secretaire_municipal'),
    ('resp_hygiene','Responsable hygiène et assainissement','Services spécialisés',ARRAY['projets','territoire','citoyens'],'resp',true,'secretaire_municipal'),
    ('resp_environnement','Responsable environnement et cadre de vie','Services spécialisés',ARRAY['projets','territoire'],'resp',true,'secretaire_municipal'),
    ('resp_voirie','Responsable voirie et infrastructures','Services spécialisés',ARRAY['projets','territoire','patrimoine'],'resp',true,'secretaire_municipal'),
    ('resp_education','Responsable éducation et affaires scolaires','Services spécialisés',ARRAY['projets','citoyens'],'resp',true,'secretaire_municipal'),
    ('resp_sante_social','Responsable santé et action sociale','Services spécialisés',ARRAY['citoyens','projets'],'resp',true,'secretaire_municipal'),
    ('resp_cooperation','Responsable coopération et partenariats','Services spécialisés',ARRAY['projets','rapports'],'resp',true,'secretaire_municipal'),
    ('personnel_cabinet','Personnel du cabinet','Cabinet du maire',ARRAY['cabinet','instr','rapports'],'oper',false,'maire'),
    ('agent_polyvalent','Agent municipal polyvalent','Agents municipaux',ARRAY['dossiers','instr'],'agent',false,'secretaire_municipal')
  ) v(code,nom,fam,mods,niv,ag,par)
  LOOP
    INSERT INTO public.org_roles(commune_id,code,nom,famille,systeme)
    VALUES(p,r.code,r.nom,r.fam,true) ON CONFLICT DO NOTHING;

    INSERT INTO public.org_postes(commune_id,code,nom,famille,role_code,parent_code,systeme)
    VALUES(p,r.code,r.nom,r.fam,r.code,r.par,true) ON CONFLICT DO NOTHING;

    acts:=CASE r.niv
      WHEN 'resp' THEN ARRAY['consulter','creer','modifier','valider','rejeter','exporter','imprimer','partager']
      WHEN 'oper' THEN ARRAY['consulter','creer','modifier','imprimer']
      WHEN 'agent' THEN ARRAY['consulter','creer','imprimer']
      WHEN 'lect' THEN ARRAY['consulter','imprimer']
      ELSE ARRAY[]::text[]
    END;

    FOREACH m IN ARRAY r.mods LOOP
      FOREACH a IN ARRAY acts LOOP
        INSERT INTO public.org_role_droits(commune_id,role_code,module,action)
        VALUES(p,r.code,m,a) ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;

    IF r.ag THEN
      ac:='agent_'||regexp_replace(r.code,'^resp_','');
      INSERT INTO public.org_roles(commune_id,code,nom,famille,systeme)
      VALUES(p,ac,replace(r.nom,'Responsable ','Agent '),r.fam,true)
      ON CONFLICT DO NOTHING;

      INSERT INTO public.org_postes(commune_id,code,nom,famille,role_code,parent_code,systeme)
      VALUES(p,ac,replace(r.nom,'Responsable ','Agent '),r.fam,ac,r.code,true)
      ON CONFLICT DO NOTHING;

      FOREACH m IN ARRAY r.mods LOOP
        FOREACH a IN ARRAY ARRAY['consulter','creer','imprimer'] LOOP
          INSERT INTO public.org_role_droits(commune_id,role_code,module,action)
          VALUES(p,ac,m,a) ON CONFLICT DO NOTHING;
        END LOOP;
      END LOOP;
    END IF;
  END LOOP;
END
$function$;
