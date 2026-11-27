-- LOT C : interopérabilité LGEC / ANEC. Idempotent. Aucune API ANEC n'est supposée : export fichier (jsonb) uniquement.
-- APPLIQUÉ en production (projet aiqegpijisspankpkwfj) le 2026-11-27 via apply_migration « export_lgec_registre_ec » ; testé avant par dry-run annulé (signature, rectification, export, audit, doublon, unicité).
-- Vérifié sur la base de production (2026-11-27) : actes_mentions_marginales(acte_id, type_mention, juridiction, jugement_*, motif, avant, apres, created_at), audit_log(commune_id,user_id,action,table_name,row_id).
-- Hypothèse : le format de l'identifiant national n'est pas figé ici (contrôle générique : 1 à 64 caractères A-Z a-z 0-9 / . _ -).

-- 1. Identifiant national (unique par commune quand renseigné). Aucun GRANT colonne : alimenté par import serveur, jamais modifiable depuis l'interface (acte signé = figé).
alter table public.actes_etat_civil add column if not exists identifiant_national text;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='actes_ec_idnat_format' and conrelid='public.actes_etat_civil'::regclass) then
  alter table public.actes_etat_civil add constraint actes_ec_idnat_format check(identifiant_national is null or identifiant_national ~ '^[A-Za-z0-9/._-]{1,64}$');
 end if;
end $$;
create unique index if not exists actes_ec_idnat_uidx on public.actes_etat_civil(commune_id,identifiant_national) where identifiant_national is not null;

-- 2. Export du registre : maire / adjoint / état civil de la commune ; actes SIGNÉS uniquement ; chaque appel est journalisé (audit_log).
create or replace function public.export_registre_ec(p_annee integer, p_type text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_cid uuid; v_com text; v_actes jsonb; v_nb integer; v_ns integer;
begin
 if v_uid is null then raise exception 'Session requise'; end if;
 select p.commune_id into v_cid from public.profiles p where p.id=v_uid and p.role in('maire','adjoint','etat_civil');
 if v_cid is null then raise exception 'Accès refusé'; end if;
 if p_annee is null or p_annee not between 1800 and 2200 then raise exception 'Année invalide'; end if;
 if p_type is not null and p_type not in('naissance','mariage','deces') then raise exception 'Type d''acte invalide'; end if;
 select c.nom into v_com from public.communes c where c.id=v_cid;
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',a.id,'identifiant_national',a.identifiant_national,'type_acte',a.type_acte,'numero_acte',a.numero_acte,'annee_acte',a.annee_acte,
   'mode_inscription',a.mode_inscription,'date_declaration',a.date_declaration,'declarant',a.declarant,
   'juridiction',a.juridiction,'jugement_numero',a.jugement_numero,'jugement_date',a.jugement_date,
   'date_evenement',a.date_evenement,'lieu_evenement',a.lieu_evenement,'nom',a.nom,'prenom',a.prenom,'sexe',a.sexe,
   'date_naissance',a.date_naissance,'lieu_naissance',a.lieu_naissance,'profession',a.profession,'pere_nom',a.pere_nom,'mere_nom',a.mere_nom,
   'conjoint_nom',a.conjoint_nom,'conjoint_prenom',a.conjoint_prenom,'conjoint_date_naissance',a.conjoint_date_naissance,
   'conjoint_pere_nom',a.conjoint_pere_nom,'conjoint_mere_nom',a.conjoint_mere_nom,'officier_etat_civil',a.officier_etat_civil,
   'observations',a.observations,'signe_le',a.signe_le,'signature_reprise',a.signature_reprise,
   'mentions_marginales',(select coalesce(jsonb_agg(jsonb_build_object('type_mention',m.type_mention,'juridiction',m.juridiction,'jugement_numero',m.jugement_numero,'jugement_date',m.jugement_date,'motif',m.motif,'avant',m.avant,'apres',m.apres,'date',m.created_at) order by m.created_at),'[]'::jsonb) from public.actes_mentions_marginales m where m.acte_id=a.id)
  ) order by a.type_acte,a.numero_acte),'[]'::jsonb),count(*)
  into v_actes,v_nb
  from public.actes_etat_civil a where a.commune_id=v_cid and a.annee_acte=p_annee and (p_type is null or a.type_acte=p_type) and a.signe_le is not null;
 select count(*) into v_ns from public.actes_etat_civil a where a.commune_id=v_cid and a.annee_acte=p_annee and (p_type is null or a.type_acte=p_type) and a.signe_le is null;
 insert into public.audit_log(commune_id,user_id,action,table_name) values(v_cid,v_uid,'export_registre_ec:'||p_annee||':'||coalesce(p_type,'tous')||':'||v_nb,'actes_etat_civil');
 return jsonb_build_object('format','registre-ec-export','version','1','commune',v_com,'annee',p_annee,'type',coalesce(p_type,'tous'),
   'genere_le',now(),'nb_actes',v_nb,'nb_non_signes_exclus',v_ns,'actes',v_actes);
end $$;
revoke all on function public.export_registre_ec(integer,text) from public,anon;
grant execute on function public.export_registre_ec(integer,text) to authenticated;
