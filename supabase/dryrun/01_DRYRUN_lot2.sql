-- ============================================================================
-- 01_DRYRUN_lot2.sql — LOT 2 (D/E/F) : 20261207 + 20261208 + 20261209
-- DRY-RUN : applique, teste (règles métier), rejoue (idempotence), puis ANNULE TOUT.
-- Le script se termine par une EXCEPTION volontaire contenant le rapport => aucun COMMIT possible.
-- Lecture du résultat : message d'erreur « DRYRUN GO » ou « DRYRUN NO-GO ». Ensuite exécuter seul :  ROLLBACK;
-- Ordre : jeu de données HISTORIQUE (schéma avant migration) -> migrations -> tests -> rejeu -> rapport.
-- Les tests « API » passent en rôle authenticated (JWT du maire) : le rôle postgres de l'éditeur contourne les gardes d'immutabilité.
-- ============================================================================
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '180s';
SET LOCAL client_min_messages = warning;

create temp table dryrun_report(
  n bigint generated always as identity,
  etape text, test text, attendu text, obtenu text, verdict text);
create temp table dr_cons(i int primary key, id uuid not null);

create function pg_temp.dr_set(k text, v text) returns void language sql as $f$
  select set_config('dr.' || k, v, true)
$f$;

-- Exécute p_sql (en postgres ou en maire/authenticated) et compare le SQLSTATE obtenu à p_attendu ('00000' = succès).
create function pg_temp.dr_t(p_etape text, p_test text, p_sql text, p_attendu text, p_role text default 'postgres')
returns void language plpgsql as $f$
declare v_state text := '00000'; v_msg text := '';
begin
  execute 'set constraints all immediate';   -- les contraintes différées doivent se déclencher (un ROLLBACK ne les exécute jamais)
  if p_role = 'maire' then
    perform set_config('request.jwt.claims', json_build_object('sub', current_setting('dr.maire'), 'role', 'authenticated', 'aal', 'aal1', 'is_anonymous', false)::text, true);
    perform set_config('request.jwt.claim.sub', current_setting('dr.maire'), true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    execute 'set local role authenticated';
  else
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claim.role', '', true);
  end if;
  begin
    execute p_sql;
  exception when others then
    v_state := sqlstate; v_msg := sqlerrm;
  end;
  execute 'reset role';
  insert into pg_temp.dryrun_report(etape, test, attendu, obtenu, verdict)
  values (p_etape, p_test || case when p_role = 'maire' then ' [rôle authenticated/maire]' else '' end, p_attendu,
          v_state || case when v_msg <> '' then ' — ' || left(v_msg, 170) else '' end,
          case when v_state = p_attendu then 'OK' else 'ECHEC' end);
end $f$;

-- Vérifie une expression booléenne (évaluée en postgres).
create function pg_temp.dr_a(p_etape text, p_test text, p_expr text)
returns void language plpgsql as $f$
declare v_ok boolean := false; v_msg text := '';
begin
  begin
    execute 'select coalesce((' || p_expr || '), false)' into v_ok;
  exception when others then
    v_ok := false; v_msg := ' — ' || sqlstate || ' ' || left(sqlerrm, 170);
  end;
  insert into pg_temp.dryrun_report(etape, test, attendu, obtenu, verdict)
  values (p_etape, p_test, 'vrai', case when v_ok then 'vrai' else 'faux' end || v_msg, case when v_ok then 'OK' else 'ECHEC' end);
end $f$;

create function pg_temp.dr_i(p_etape text, p_test text, p_val text)
returns void language sql as $f$
  insert into pg_temp.dryrun_report(etape, test, attendu, obtenu, verdict) values (p_etape, p_test, 'info', p_val, 'INFO')
$f$;

-- ---------------------------------------------------------------------------
-- Contexte : un maire actif réel (lecture seule : son identité sert au JWT simulé ; son profil n'est jamais modifié)
-- ---------------------------------------------------------------------------
do $ctx$
declare v_c uuid; v_m uuid;
begin
  select p.commune_id, p.id into v_c, v_m
    from public.profiles p join public.communes c on c.id = p.commune_id
   where p.role = 'maire' and coalesce(p.actif, true) and c.statut = 'actif'
   order by p.created_at limit 1;
  if v_m is null then
    raise exception 'DRYRUN IMPOSSIBLE : aucun profil maire actif (commune active).';
  end if;
  if exists (select 1 from public.budgets where commune_id = v_c and annee between 2093 and 2098) then
    raise exception 'DRYRUN IMPOSSIBLE : années 2093-2098 déjà utilisées dans la commune de test.';
  end if;
  perform pg_temp.dr_set('commune', v_c::text);
  perform pg_temp.dr_set('maire', v_m::text);
end $ctx$;

-- ---------------------------------------------------------------------------
-- JEU HISTORIQUE (schéma AVANT migration) : ces lignes simulent la production existante.
-- ---------------------------------------------------------------------------
do $seed$
declare
  v_c uuid := current_setting('dr.commune')::uuid;
  v_r int; v_k int; j int;
  v_id uuid; v_l uuid; v_s1 uuid; v_s2 uuid; v_s3 uuid; v_c1 uuid;
begin
  -- Budgets : voté SANS DOB, approuvé SANS DOB/tutelle, brouillon, second voté sans DOB
  insert into public.budgets(commune_id, annee, statut) values (v_c, 2098, 'vote')     returning id into v_id; perform pg_temp.dr_set('b_vote',  v_id::text);
  insert into public.budgets(commune_id, annee, statut) values (v_c, 2097, 'approuve') returning id into v_id; perform pg_temp.dr_set('b_appr',  v_id::text);
  insert into public.budgets(commune_id, annee, statut) values (v_c, 2096, 'brouillon') returning id into v_id; perform pg_temp.dr_set('b_brou', v_id::text);
  insert into public.budgets(commune_id, annee, statut) values (v_c, 2095, 'vote')     returning id into v_id; perform pg_temp.dr_set('b_vote2', v_id::text);

  insert into public.budget_lignes(commune_id, budget_id, chapitre, article, type_recette_depense, montant_prevu)
  values (v_c, current_setting('dr.b_brou')::uuid, 'DR1', 'DR1', 'depense', 1000) returning id into v_l;
  perform pg_temp.dr_set('ligne', v_l::text);

  -- Engagements historiques : engagé, liquidé, payé (sans circuit ordonnateur/comptable)
  insert into public.engagements(commune_id, budget_ligne_id, montant, statut) values (v_c, v_l, 100, 'engage') returning id into v_id; perform pg_temp.dr_set('e_eng',  v_id::text);
  insert into public.engagements(commune_id, budget_ligne_id, montant, statut) values (v_c, v_l, 100, 'liquide') returning id into v_id; perform pg_temp.dr_set('e_liq',  v_id::text);
  insert into public.engagements(commune_id, budget_ligne_id, montant, statut) values (v_c, v_l, 100, 'paye')    returning id into v_id; perform pg_temp.dr_set('e_paye', v_id::text);

  -- Conseil : r titulaires réels + k fictifs (k >= 2r+3 : le quorum du test ne dépend jamais des données réelles)
  select count(*) into v_r from public.conseillers where commune_id = v_c and coalesce(actif, true) and statut = 'titulaire';
  v_k := greatest(2 * v_r + 3, 6);
  for j in 1..v_k loop
    insert into public.conseillers(commune_id, prenom, nom, actif, statut) values (v_c, 'DR', 'Test' || j, true, 'titulaire') returning id into v_id;
    insert into pg_temp.dr_cons values (j, v_id);
    if j <= 6 then perform pg_temp.dr_set('c' || j, v_id::text); end if;
  end loop;
  v_c1 := current_setting('dr.c1')::uuid;

  -- Session SANS quorum : 1 présent sur k ; session AVEC quorum : tous présents ; session au délai de convocation non conforme (1 jour)
  insert into public.sessions_conseil(commune_id, numero, jour, convocation_le, statut) values (v_c, 'DR-S1', current_date + 10, current_date + 5, 'prevue') returning id into v_s1; perform pg_temp.dr_set('s_noq', v_s1::text);
  insert into public.sessions_conseil(commune_id, numero, jour, convocation_le, statut) values (v_c, 'DR-S2', current_date + 10, current_date + 5, 'prevue') returning id into v_s2; perform pg_temp.dr_set('s_quo', v_s2::text);
  insert into public.sessions_conseil(commune_id, numero, jour, convocation_le, statut) values (v_c, 'DR-S3', current_date + 10, current_date + 9, 'prevue') returning id into v_s3; perform pg_temp.dr_set('s_leg', v_s3::text);
  insert into public.session_presences(session_id, conseiller_id, present) select v_s1, dc.id, (dc.i = 1) from pg_temp.dr_cons dc;
  insert into public.session_presences(session_id, conseiller_id, present) select v_s2, dc.id, true from pg_temp.dr_cons dc;

  -- Délibérations « projet » : rattachée à la session sans quorum, à la session avec quorum, hors session ; un vote « pour » chacune
  insert into public.deliberations(commune_id, numero, objet, jour, statut, session_id) values (v_c, 'DR-D1', 'Test sans quorum',  current_date, 'projet', v_s1) returning id into v_id; perform pg_temp.dr_set('d_noq', v_id::text);
  insert into public.votes_deliberations(commune_id, deliberation_id, conseiller_id, vote) values (v_c, v_id, v_c1, 'pour');
  insert into public.deliberations(commune_id, numero, objet, jour, statut, session_id) values (v_c, 'DR-D2', 'Test avec quorum',  current_date, 'projet', v_s2) returning id into v_id; perform pg_temp.dr_set('d_quo', v_id::text);
  insert into public.votes_deliberations(commune_id, deliberation_id, conseiller_id, vote) values (v_c, v_id, v_c1, 'pour');
  insert into public.deliberations(commune_id, numero, objet, jour, statut, session_id) values (v_c, 'DR-D3', 'Test hors session', current_date, 'projet', null) returning id into v_id; perform pg_temp.dr_set('d_hs', v_id::text);
  insert into public.votes_deliberations(commune_id, deliberation_id, conseiller_id, vote) values (v_c, v_id, v_c1, 'pour');

  -- Marchés : AO ouvert lancé, « Autre », gré à gré
  insert into public.marches(commune_id, numero, objet, mode, statut) values (v_c, 'DR-M1', 'Test AO',    'Appel d''offres ouvert', 'lance')       returning id into v_id; perform pg_temp.dr_set('m_ao',    v_id::text);
  insert into public.marches(commune_id, numero, objet, mode, statut) values (v_c, 'DR-M2', 'Test autre', 'Autre',                  'preparation') returning id into v_id; perform pg_temp.dr_set('m_autre', v_id::text);
  insert into public.marches(commune_id, numero, objet, mode, statut) values (v_c, 'DR-M3', 'Test gré',   'Gré à gré',              'preparation') returning id into v_id; perform pg_temp.dr_set('m_gre',   v_id::text);

  -- Contribuables : entreprise sans identifiant ; entreprise avec identifiant de forme NINEA
  insert into public.contribuables(commune_id, nom, type, identifiant_fiscal) values (v_c, 'DR Entreprise sans NINEA', 'entreprise', null)         returning id into v_id; perform pg_temp.dr_set('c_ent1', v_id::text);
  insert into public.contribuables(commune_id, nom, type, identifiant_fiscal) values (v_c, 'DR Entreprise avec IDF',   'entreprise', 'dr-1234567') returning id into v_id; perform pg_temp.dr_set('c_ent2', v_id::text);
end $seed$;

-- ---------------------------------------------------------------------------
-- MIGRATIONS (texte identique aux fichiers supabase/proposed/), exécutées deux fois : application puis rejeu
-- ---------------------------------------------------------------------------
create temp table dr_mig on commit drop as select
$m207$-- LOT D : Budget (DOB, tutelle) et Conseil municipal (quorum, procurations, délai de convocation).
-- ÉTAT : PROPOSÉE, NON APPLIQUÉE. Idempotente. À appliquer après 20261202000300 (gouvernance) et 20261202000900 (machines d'états).
-- Aucune politique RLS existante n'est modifiée. Les contraintes CHECK sont créées NOT VALID : elles s'appliquent aux nouvelles écritures
-- sans rejeter l'historique ; après régularisation des anciennes lignes : alter table … validate constraint ….
-- Tables existantes, non recréées : budgets, sessions_conseil, session_presences, deliberations, conseillers.
-- Parcours budgétaire : dob -> brouillon -> vote -> approuve -> cloture (sans saut, sans retour).
-- Rappel : le trigger existant trg_budgets_garde_immuable rend un budget voté / approuvé immuable pour les rôles API ;
-- la transmission à la tutelle et la décision de la tutelle passent donc par des RPC SECURITY DEFINER (propriétaire postgres).

-- ======================================================================================================
-- 1) BUDGETS : DOB + transmission à la tutelle
-- ======================================================================================================
alter table public.budgets
  add column if not exists date_dob date,
  add column if not exists pv_dob_url text,
  add column if not exists date_transmission_tutelle date,
  add column if not exists preuve_transmission_url text,
  add column if not exists statut_tutelle text;

-- Nouveau jeu de statuts (l'ancien CHECK, nommé par défaut budgets_statut_check, est remplacé)
do $$ declare c record; begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.budgets'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%statut%' and pg_get_constraintdef(oid) ilike '%brouillon%'
       and conname not in ('budgets_statut_chk','budgets_dob_avant_vote_chk','budgets_tutelle_avant_approbation_chk')
  loop
    execute format('alter table public.budgets drop constraint %I', c.conname);
  end loop;
  if not exists (select 1 from pg_constraint where conname = 'budgets_statut_chk' and conrelid = 'public.budgets'::regclass) then
    alter table public.budgets add constraint budgets_statut_chk
      check (statut in ('dob','brouillon','vote','approuve','cloture'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'budgets_statut_tutelle_chk' and conrelid = 'public.budgets'::regclass) then
    alter table public.budgets add constraint budgets_statut_tutelle_chk
      check (statut_tutelle is null or statut_tutelle in ('en_attente','approuve','rejete'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'budgets_pv_dob_url_chk' and conrelid = 'public.budgets'::regclass) then
    alter table public.budgets add constraint budgets_pv_dob_url_chk
      check (pv_dob_url is null or char_length(btrim(pv_dob_url)) between 1 and 500);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'budgets_preuve_tutelle_url_chk' and conrelid = 'public.budgets'::regclass) then
    alter table public.budgets add constraint budgets_preuve_tutelle_url_chk
      check (preuve_transmission_url is null or char_length(btrim(preuve_transmission_url)) between 1 and 500);
  end if;
  -- Un budget ne peut être voté (ni approuvé, ni clôturé) sans DOB renseigné : date et procès-verbal
  if not exists (select 1 from pg_constraint where conname = 'budgets_dob_avant_vote_chk' and conrelid = 'public.budgets'::regclass) then
    alter table public.budgets add constraint budgets_dob_avant_vote_chk
      check (statut in ('dob','brouillon') or (date_dob is not null and nullif(btrim(pv_dob_url), '') is not null)) not valid;
  end if;
  -- Le passage à « approuvé » exige la preuve de transmission à la tutelle ET l'approbation de la tutelle
  if not exists (select 1 from pg_constraint where conname = 'budgets_tutelle_avant_approbation_chk' and conrelid = 'public.budgets'::regclass) then
    alter table public.budgets add constraint budgets_tutelle_avant_approbation_chk
      check (statut not in ('approuve','cloture')
             or (date_transmission_tutelle is not null and nullif(btrim(preuve_transmission_url), '') is not null and statut_tutelle = 'approuve')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'budgets_transmission_apres_dob_chk' and conrelid = 'public.budgets'::regclass) then
    alter table public.budgets add constraint budgets_transmission_apres_dob_chk
      check (date_transmission_tutelle is null or date_dob is null or date_transmission_tutelle >= date_dob) not valid;
  end if;
end $$;

-- Un nouveau budget commence au Débat d'Orientation Budgétaire
alter table public.budgets alter column statut set default 'dob';

-- Parcours strict (sans saut ni retour) ; ne remplace pas trg_budgets_garde_immuable (qui continue de s'appliquer).
create or replace function private.budgets_workflow()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_ordre text[] := array['dob','brouillon','vote','approuve','cloture'];
  v_old int;
  v_new int;
begin
  if tg_op = 'INSERT' then
    if new.statut not in ('dob','brouillon') then
      raise exception 'Un budget est créé à l''étape « dob » (ou « brouillon »), pas au statut « % ».', new.statut using errcode = '55000';
    end if;
    return new;
  end if;

  if new.statut is not distinct from old.statut then
    return new;
  end if;

  v_old := array_position(v_ordre, old.statut);
  v_new := array_position(v_ordre, new.statut);
  if v_old is null or v_new is null or v_new <> v_old + 1 then
    raise exception 'Transition budgétaire interdite : « % » -> « % » (les étapes se suivent : dob, brouillon, vote, approuve, cloture).', old.statut, new.statut
      using errcode = '55000';
  end if;

  if new.statut = 'vote' and (new.date_dob is null or nullif(btrim(new.pv_dob_url), '') is null) then
    raise exception 'Vote impossible : le Débat d''Orientation Budgétaire (date et procès-verbal) n''est pas renseigné.' using errcode = '23514';
  end if;

  if new.statut = 'approuve' then
    if new.date_transmission_tutelle is null or nullif(btrim(new.preuve_transmission_url), '') is null then
      raise exception 'Approbation impossible : la preuve de transmission à la tutelle n''est pas enregistrée.' using errcode = '23514';
    end if;
    if new.statut_tutelle is distinct from 'approuve' then
      raise exception 'Approbation impossible : la tutelle n''a pas approuvé le budget (statut tutelle : %).', coalesce(new.statut_tutelle, 'non transmis') using errcode = '23514';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_budgets_workflow on public.budgets;
create trigger trg_budgets_workflow
  before insert or update on public.budgets
  for each row execute function private.budgets_workflow();

-- RPC : transmission du budget voté à la tutelle (maire, finances). Enregistre la date et la preuve.
create or replace function public.budget_transmettre_tutelle(p_budget uuid, p_date date, p_preuve_url text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_commune uuid := (select private.my_commune());
  v_b public.budgets%rowtype;
  v_preuve text := nullif(btrim(p_preuve_url), '');
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;
  if coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
     or v_commune is null or (select private.my_role()) not in ('maire','finances') then
    raise exception 'Accès refusé : seuls le maire et les finances peuvent transmettre le budget à la tutelle.' using errcode = '42501';
  end if;
  if not (select private.hors_maintenance()) then
    raise exception 'Plateforme en maintenance.' using errcode = '55000';
  end if;
  select * into v_b from public.budgets where id = p_budget and commune_id = v_commune for update;
  if not found then
    raise exception 'Budget introuvable.' using errcode = 'P0002';
  end if;
  if v_b.statut <> 'vote' then
    raise exception 'La transmission à la tutelle n''est possible qu''au statut « voté » (statut actuel : %).', v_b.statut using errcode = '55000';
  end if;
  if p_date is null or v_preuve is null then
    raise exception 'La date et la preuve de transmission sont obligatoires.' using errcode = '22023';
  end if;
  if p_date > current_date then
    raise exception 'La date de transmission ne peut pas être dans le futur.' using errcode = '22023';
  end if;
  if v_b.date_dob is not null and p_date < v_b.date_dob then
    raise exception 'La transmission ne peut pas précéder le Débat d''Orientation Budgétaire.' using errcode = '22023';
  end if;
  update public.budgets
     set date_transmission_tutelle = p_date, preuve_transmission_url = v_preuve, statut_tutelle = 'en_attente'
   where id = v_b.id;
  return jsonb_build_object('budget_id', v_b.id, 'statut', v_b.statut, 'statut_tutelle', 'en_attente', 'date_transmission_tutelle', p_date);
end $$;

-- RPC : décision de la tutelle. « approuve » fait passer le budget de « vote » à « approuve » (preuve de transmission exigée) ;
-- « rejete » le laisse au statut « vote » avec statut_tutelle = 'rejete'.
create or replace function public.budget_decider_tutelle(p_budget uuid, p_decision text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_commune uuid := (select private.my_commune());
  v_b public.budgets%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;
  if coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
     or v_commune is null or (select private.my_role()) not in ('maire','finances') then
    raise exception 'Accès refusé : seuls le maire et les finances peuvent enregistrer la décision de la tutelle.' using errcode = '42501';
  end if;
  if not (select private.hors_maintenance()) then
    raise exception 'Plateforme en maintenance.' using errcode = '55000';
  end if;
  if p_decision is null or p_decision not in ('approuve','rejete') then
    raise exception 'Décision invalide : « approuve » ou « rejete ».' using errcode = '22023';
  end if;
  select * into v_b from public.budgets where id = p_budget and commune_id = v_commune for update;
  if not found then
    raise exception 'Budget introuvable.' using errcode = 'P0002';
  end if;
  if v_b.statut <> 'vote' then
    raise exception 'La décision de la tutelle ne s''enregistre qu''au statut « voté » (statut actuel : %).', v_b.statut using errcode = '55000';
  end if;
  if v_b.date_transmission_tutelle is null or nullif(btrim(v_b.preuve_transmission_url), '') is null then
    raise exception 'Décision impossible : la preuve de transmission à la tutelle n''est pas enregistrée.' using errcode = '23514';
  end if;
  if p_decision = 'approuve' then
    update public.budgets set statut_tutelle = 'approuve', statut = 'approuve' where id = v_b.id;
  else
    update public.budgets set statut_tutelle = 'rejete' where id = v_b.id;
  end if;
  return jsonb_build_object('budget_id', v_b.id, 'statut', case when p_decision = 'approuve' then 'approuve' else v_b.statut end, 'statut_tutelle', p_decision);
end $$;

alter function public.budget_transmettre_tutelle(uuid, date, text) owner to postgres;
alter function public.budget_decider_tutelle(uuid, text) owner to postgres;
revoke all on function public.budget_transmettre_tutelle(uuid, date, text) from public, anon;
revoke all on function public.budget_decider_tutelle(uuid, text) from public, anon;
grant execute on function public.budget_transmettre_tutelle(uuid, date, text) to authenticated;
grant execute on function public.budget_decider_tutelle(uuid, text) to authenticated;

-- ======================================================================================================
-- 2) CONSEIL : délai de convocation (3 jours minimum avant la séance)
-- ======================================================================================================
do $$ begin
  -- Une session déjà tenue (statut tenue / pv_redige / archivee) n'est plus concernée : son historique reste modifiable.
  if not exists (select 1 from pg_constraint where conname = 'sessions_conseil_delai_convocation_chk' and conrelid = 'public.sessions_conseil'::regclass) then
    alter table public.sessions_conseil add constraint sessions_conseil_delai_convocation_chk
      check (convocation_le is null or statut in ('tenue','pv_redige','archivee') or (jour - convocation_le::date) >= 3) not valid;
  end if;
end $$;

-- ======================================================================================================
-- 3) CONSEIL : procurations (un élu ne détient qu'une seule procuration)
-- ======================================================================================================
alter table public.session_presences
  add column if not exists mandataire_id uuid references public.conseillers(id) on delete restrict;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'session_presences_procuration_chk' and conrelid = 'public.session_presences'::regclass) then
    alter table public.session_presences add constraint session_presences_procuration_chk
      check ((statut_presence = 'procuration') = (mandataire_id is not null)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'session_presences_pas_auto_procuration_chk' and conrelid = 'public.session_presences'::regclass) then
    alter table public.session_presences add constraint session_presences_pas_auto_procuration_chk
      check (mandataire_id is distinct from conseiller_id);
  end if;
end $$;

-- Un mandataire ne peut recevoir qu'UNE procuration par session
create unique index if not exists session_presences_une_procuration_uq
  on public.session_presences(session_id, mandataire_id) where mandataire_id is not null;
create index if not exists session_presences_mandataire_idx on public.session_presences(mandataire_id) where mandataire_id is not null;

-- Contrôle différé (fin de transaction, donc après un upsert groupé) : même commune, mandataire présent et en exercice
create or replace function private.session_presences_procuration_garde()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_commune uuid;
  v_cmandant uuid;
  v_cmandataire uuid;
begin
  if new.mandataire_id is null then
    return null;
  end if;
  select commune_id into v_commune from public.sessions_conseil where id = new.session_id;
  select commune_id into v_cmandant from public.conseillers where id = new.conseiller_id;
  select commune_id into v_cmandataire from public.conseillers where id = new.mandataire_id;
  if v_commune is null or v_cmandant is distinct from v_commune or v_cmandataire is distinct from v_commune then
    raise exception 'Procuration refusée : mandant et mandataire doivent être des conseillers de la commune de la session.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.session_presences p
      join public.conseillers c on c.id = p.conseiller_id
     where p.session_id = new.session_id and p.conseiller_id = new.mandataire_id
       and p.statut_presence = 'present' and coalesce(c.actif, true) and c.statut = 'titulaire'
  ) then
    raise exception 'Procuration refusée : le mandataire doit être un conseiller en exercice présent à la session.' using errcode = '23514';
  end if;
  return null;
end $$;

revoke all on function private.session_presences_procuration_garde() from public, anon, authenticated;

drop trigger if exists session_presences_procuration on public.session_presences;
create constraint trigger session_presences_procuration
  after insert or update of statut_presence, mandataire_id on public.session_presences
  deferrable initially deferred
  for each row execute function private.session_presences_procuration_garde();

-- ======================================================================================================
-- 4) CONSEIL : quorum = majorité des membres en exercice PRÉSENTS (les procurations comptent pour le vote, pas pour le quorum)
-- ======================================================================================================
create or replace function private.quorum_session(p_session uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_commune uuid;
  v_membres int;
  v_requis int;
  v_presents int;
begin
  select commune_id into v_commune from public.sessions_conseil where id = p_session;
  if v_commune is null then
    return null;
  end if;
  select count(*) into v_membres
    from public.conseillers c
   where c.commune_id = v_commune and coalesce(c.actif, true) and c.statut = 'titulaire';
  v_requis := case when v_membres > 0 then v_membres / 2 + 1 else 0 end;
  select count(*) into v_presents
    from public.session_presences p
    join public.conseillers c on c.id = p.conseiller_id
   where p.session_id = p_session and p.statut_presence = 'present'
     and c.commune_id = v_commune and coalesce(c.actif, true) and c.statut = 'titulaire';
  return jsonb_build_object('membres', v_membres, 'requis', v_requis, 'presents', v_presents,
                            'atteint', v_membres > 0 and v_presents >= v_requis);
end $$;
revoke all on function private.quorum_session(uuid) from public, anon, authenticated;

-- Garde : une délibération rattachée à une session ne peut être adoptée / rejetée (clôture du vote, RPC cloturer_deliberation incluse)
-- que si le quorum de la session est atteint. Délibération hors session : non concernée (aucune présence à comparer).
create or replace function private.deliberations_garde_quorum()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  q jsonb;
begin
  if new.session_id is null or new.statut not in ('adoptee','rejetee') or new.statut is not distinct from old.statut then
    return new;
  end if;
  q := private.quorum_session(new.session_id);
  if q is null or not coalesce((q ->> 'atteint')::boolean, false) then
    raise exception 'Quorum non atteint : % présent(s) sur % membres en exercice (minimum %) ; la délibération ne peut pas être tranchée.',
      coalesce(q ->> 'presents', '0'), coalesce(q ->> 'membres', '0'), coalesce(q ->> 'requis', '0')
      using errcode = '55000';
  end if;
  return new;
end $$;
revoke all on function private.deliberations_garde_quorum() from public, anon, authenticated;

drop trigger if exists trg_deliberations_garde_quorum on public.deliberations;
create trigger trg_deliberations_garde_quorum
  before update of statut on public.deliberations
  for each row execute function private.deliberations_garde_quorum();
$m207$::text as m207,
$m208$-- LOT E : Marchés publics (mode de passation en enum, références de l'appel) et Fiscalité / Trésor
-- (NINEA, circuit ordonnateur -> comptable public, quittance du Trésor).
-- ÉTAT : PROPOSÉE, NON APPLIQUÉE. Idempotente. À appliquer après 20261202000200 (marchés), 20261203000200 (fiscalité) et 20261207.
-- Aucune politique RLS existante n'est modifiée. Contraintes CHECK créées NOT VALID (nouvelles écritures contrôlées, historique conservé).
-- Tables existantes, non recréées : marches, contribuables, paiements_taxes, engagements.

-- ======================================================================================================
-- 1) MARCHÉS : mode de passation -> enum PostgreSQL
-- ======================================================================================================
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where n.nspname = 'public' and t.typname = 'mode_passation_marche') then
    create type public.mode_passation_marche as enum ('appel_offres_ouvert','appel_offres_restreint','consultation','gre_a_gre');
  end if;
end $$;

do $$ declare c record; begin
  if (select data_type from information_schema.columns
       where table_schema = 'public' and table_name = 'marches' and column_name = 'mode') = 'text' then
    -- La valeur « Autre » n'a pas d'équivalent : elle est conservée dans les observations avant conversion.
    update public.marches
       set observations = left(coalesce(observations || E'\n', '') || '[Mode de passation d''origine : Autre]', 3000)
     where mode = 'Autre';
    -- Ancien CHECK sur le texte libre
    for c in
      select conname from pg_constraint
       where conrelid = 'public.marches'::regclass and contype = 'c'
         and (conname = 'marches_mode_check' or pg_get_constraintdef(oid) ~* '^check \(+mode[ =)]')
    loop
      execute format('alter table public.marches drop constraint %I', c.conname);
    end loop;
    alter table public.marches alter column mode type public.mode_passation_marche
      using (case mode
               when 'Appel d''offres ouvert' then 'appel_offres_ouvert'
               when 'Appel d''offres restreint' then 'appel_offres_restreint'
               when 'Demande de renseignements et de prix' then 'consultation'
               when 'Gré à gré' then 'gre_a_gre'
               else null
             end)::public.mode_passation_marche;
  end if;
end $$;

alter table public.marches
  add column if not exists seuil_passation numeric(15,2),
  add column if not exists ref_publication_appel text,
  add column if not exists ref_attribution_appel text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'marches_seuil_passation_chk' and conrelid = 'public.marches'::regclass) then
    alter table public.marches add constraint marches_seuil_passation_chk check (seuil_passation is null or seuil_passation >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'marches_ref_appel_chk' and conrelid = 'public.marches'::regclass) then
    alter table public.marches add constraint marches_ref_appel_chk
      check ((ref_publication_appel is null or char_length(btrim(ref_publication_appel)) between 1 and 120)
         and (ref_attribution_appel is null or char_length(btrim(ref_attribution_appel)) between 1 and 120));
  end if;
  -- Appel d'offres : référence de publication dès le lancement, référence d'attribution dès l'attribution
  if not exists (select 1 from pg_constraint where conname = 'marches_appel_publication_chk' and conrelid = 'public.marches'::regclass) then
    alter table public.marches add constraint marches_appel_publication_chk
      check (mode is null or mode not in ('appel_offres_ouvert','appel_offres_restreint')
             or statut in ('preparation','annule') or nullif(btrim(ref_publication_appel), '') is not null) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'marches_appel_attribution_chk' and conrelid = 'public.marches'::regclass) then
    alter table public.marches add constraint marches_appel_attribution_chk
      check (mode is null or mode not in ('appel_offres_ouvert','appel_offres_restreint')
             or statut not in ('attribue','approuve','en_cours','receptionne') or nullif(btrim(ref_attribution_appel), '') is not null) not valid;
  end if;
end $$;

-- ======================================================================================================
-- 2) FISCALITÉ : NINEA des contribuables (unique par commune)
-- ======================================================================================================
alter table public.contribuables add column if not exists ninea text;

-- Reprise de l'identifiant fiscal existant lorsqu'il a la forme d'un NINEA (un seul contribuable par valeur et par commune)
with c as (
  select id, upper(regexp_replace(identifiant_fiscal, '[\s.\-]', '', 'g')) as v,
         row_number() over (partition by commune_id, upper(regexp_replace(identifiant_fiscal, '[\s.\-]', '', 'g')) order by created_at, id) as rn
    from public.contribuables
   where ninea is null and identifiant_fiscal is not null
     and upper(regexp_replace(identifiant_fiscal, '[\s.\-]', '', 'g')) ~ '^[0-9A-Z]{7,12}$'
)
update public.contribuables t set ninea = c.v from c where c.id = t.id and c.rn = 1;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'contribuables_ninea_format_chk' and conrelid = 'public.contribuables'::regclass) then
    alter table public.contribuables add constraint contribuables_ninea_format_chk
      check (ninea is null or ninea ~ '^[0-9A-Z]{7,12}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'contribuables_entreprise_ninea_chk' and conrelid = 'public.contribuables'::regclass) then
    alter table public.contribuables add constraint contribuables_entreprise_ninea_chk
      check (type <> 'entreprise' or ninea is not null) not valid;
  end if;
end $$;
create unique index if not exists contribuables_ninea_uidx on public.contribuables(commune_id, ninea) where ninea is not null;

-- ======================================================================================================
-- 3) FISCALITÉ : recettes encaissées -> versement / quittance du Trésor (comptable public)
-- ======================================================================================================
alter table public.paiements_taxes
  add column if not exists statut_tresor text not null default 'a_verser',
  add column if not exists ref_quittance_tresor text,
  add column if not exists date_versement_tresor date;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'paiements_taxes_statut_tresor_chk' and conrelid = 'public.paiements_taxes'::regclass) then
    alter table public.paiements_taxes add constraint paiements_taxes_statut_tresor_chk
      check (statut_tresor in ('a_verser','verse','rapproche'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'paiements_taxes_quittance_tresor_chk' and conrelid = 'public.paiements_taxes'::regclass) then
    alter table public.paiements_taxes add constraint paiements_taxes_quittance_tresor_chk
      check ((statut_tresor = 'a_verser' or nullif(btrim(ref_quittance_tresor), '') is not null)
         and (ref_quittance_tresor is null or char_length(btrim(ref_quittance_tresor)) between 1 and 80));
  end if;
end $$;
create unique index if not exists paiements_taxes_quittance_tresor_uidx
  on public.paiements_taxes(commune_id, ref_quittance_tresor) where ref_quittance_tresor is not null;

-- UPDATE direct fermé par 20261202000700 : l'enregistrement de la quittance du Trésor passe par une RPC (rôle « finances » = côté comptable public).
create or replace function public.enregistrer_quittance_tresor(p_paiement_id uuid, p_statut text, p_ref text, p_date date default current_date)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_commune uuid := (select private.my_commune());
  v_p public.paiements_taxes%rowtype;
  v_ref text := nullif(btrim(p_ref), '');
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;
  if coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
     or v_commune is null or (select private.my_role()) is distinct from 'finances' then
    raise exception 'Accès refusé : la quittance du Trésor est enregistrée par le service des finances (comptable public), pas par l''ordonnateur.' using errcode = '42501';
  end if;
  if not (select private.hors_maintenance()) then
    raise exception 'Plateforme en maintenance.' using errcode = '55000';
  end if;
  if p_statut is null or p_statut not in ('a_verser','verse','rapproche') then
    raise exception 'Statut Trésor invalide.' using errcode = '22023';
  end if;
  if p_statut <> 'a_verser' and v_ref is null then
    raise exception 'La référence de quittance du Trésor est obligatoire.' using errcode = '22023';
  end if;
  select * into v_p from public.paiements_taxes where id = p_paiement_id and commune_id = v_commune for update;
  if not found then
    raise exception 'Paiement introuvable.' using errcode = 'P0002';
  end if;
  if v_p.statut is distinct from 'paye' then
    raise exception 'Seul un paiement encaissé (statut « payé ») peut être versé au Trésor (statut actuel : %).', v_p.statut using errcode = '55000';
  end if;
  begin
    update public.paiements_taxes
       set statut_tresor = p_statut,
           ref_quittance_tresor = case when p_statut = 'a_verser' then null else v_ref end,
           date_versement_tresor = case when p_statut = 'a_verser' then null else coalesce(p_date, current_date) end
     where id = v_p.id;
  exception when unique_violation then
    raise exception 'Cette quittance du Trésor est déjà rattachée à un autre paiement.' using errcode = '23505';
  end;
  return jsonb_build_object('paiement_id', v_p.id, 'statut_tresor', p_statut, 'ref_quittance_tresor', v_ref);
end $$;
alter function public.enregistrer_quittance_tresor(uuid, text, text, date) owner to postgres;
revoke all on function public.enregistrer_quittance_tresor(uuid, text, text, date) from public, anon;
grant execute on function public.enregistrer_quittance_tresor(uuid, text, text, date) to authenticated;

-- ======================================================================================================
-- 4) DÉPENSES : séparation ordonnateur (Maire) / comptable public (Receveur municipal, Trésor)
--    engage -> liquide -> ordonnance (Maire uniquement) -> paye (finances = comptable public, jamais l'ordonnateur) ; annule avant paiement.
-- ======================================================================================================
alter table public.engagements
  add column if not exists ordonnateur_id uuid references auth.users(id) on delete set null,
  add column if not exists date_ordonnancement date,
  add column if not exists comptable_public text,
  add column if not exists statut_tresor text,
  add column if not exists ref_quittance_tresor text,
  add column if not exists date_paiement_tresor date;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'engagements_statut_tresor_chk' and conrelid = 'public.engagements'::regclass) then
    alter table public.engagements add constraint engagements_statut_tresor_chk
      check (statut_tresor is null or statut_tresor in ('a_payer','paye','rejete'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'engagements_champs_tresor_chk' and conrelid = 'public.engagements'::regclass) then
    alter table public.engagements add constraint engagements_champs_tresor_chk
      check ((comptable_public is null or char_length(btrim(comptable_public)) between 1 and 150)
         and (ref_quittance_tresor is null or char_length(btrim(ref_quittance_tresor)) between 1 and 80));
  end if;
  -- Un engagement ordonnancé porte son ordonnateur ; un engagement payé porte le comptable public et la quittance du Trésor
  if not exists (select 1 from pg_constraint where conname = 'engagements_ordonnancement_chk' and conrelid = 'public.engagements'::regclass) then
    alter table public.engagements add constraint engagements_ordonnancement_chk
      check (statut not in ('ordonnance','paye') or (ordonnateur_id is not null and date_ordonnancement is not null)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'engagements_paiement_tresor_chk' and conrelid = 'public.engagements'::regclass) then
    alter table public.engagements add constraint engagements_paiement_tresor_chk
      check (statut <> 'paye' or (nullif(btrim(comptable_public), '') is not null and statut_tresor = 'paye'
             and nullif(btrim(ref_quittance_tresor), '') is not null and date_paiement_tresor is not null)) not valid;
  end if;
end $$;

create or replace function private.engagements_circuit()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_role text := (select private.my_role());
  v_ok boolean;
begin
  if tg_op = 'INSERT' then
    if new.statut <> 'engage' then
      raise exception 'Un engagement est créé au statut « engagé ».' using errcode = '55000';
    end if;
    return new;
  end if;

  if new.statut is not distinct from old.statut then
    -- Hors transition, les champs du circuit sont figés (traçabilité comptable)
    if v_uid is not null and (
         (new.ordonnateur_id, new.date_ordonnancement, new.comptable_public, new.statut_tresor, new.ref_quittance_tresor, new.date_paiement_tresor)
         is distinct from
         (old.ordonnateur_id, old.date_ordonnancement, old.comptable_public, old.statut_tresor, old.ref_quittance_tresor, old.date_paiement_tresor)) then
      raise exception 'Les champs d''ordonnancement et de paiement ne se modifient que par changement de statut.' using errcode = '55000';
    end if;
    return new;
  end if;

  v_ok := (old.statut = 'engage' and new.statut in ('liquide','annule'))
       or (old.statut = 'liquide' and new.statut in ('ordonnance','annule'))
       or (old.statut = 'ordonnance' and new.statut in ('paye','annule'));
  if not v_ok then
    raise exception 'Transition de dépense interdite : « % » -> « % » (engagé, liquidé, ordonnancé, payé ; annulation possible avant paiement).', old.statut, new.statut
      using errcode = '55000';
  end if;

  if new.statut = 'ordonnance' then
    if v_uid is not null and v_role is distinct from 'maire' then
      raise exception 'Seul l''ordonnateur (le Maire) peut ordonnancer une dépense.' using errcode = '42501';
    end if;
    new.ordonnateur_id := coalesce(v_uid, new.ordonnateur_id);
    new.date_ordonnancement := coalesce(new.date_ordonnancement, current_date);
    new.statut_tresor := 'a_payer';
  elsif new.statut = 'paye' then
    if v_uid is not null then
      if v_role = 'maire' then
        raise exception 'Le paiement relève du comptable public : l''ordonnateur ne peut pas l''enregistrer.' using errcode = '42501';
      end if;
      if old.ordonnateur_id is not null and old.ordonnateur_id = v_uid then
        raise exception 'L''ordonnateur ne peut pas enregistrer le paiement qu''il a ordonnancé.' using errcode = '42501';
      end if;
    end if;
    if nullif(btrim(new.comptable_public), '') is null or nullif(btrim(new.ref_quittance_tresor), '') is null or new.date_paiement_tresor is null then
      raise exception 'Paiement : comptable public, quittance du Trésor et date de paiement obligatoires.' using errcode = '23514';
    end if;
    new.statut_tresor := 'paye';
  end if;
  return new;
end $$;
revoke all on function private.engagements_circuit() from public, anon, authenticated;

drop trigger if exists trg_engagements_circuit on public.engagements;
create trigger trg_engagements_circuit
  before insert or update on public.engagements
  for each row execute function private.engagements_circuit();
$m208$::text as m208,
$m209$-- LOT F : Urbanisme — permis de construire (workflow d'instruction strict, délai d'instruction de 3 mois, silence de l'administration).
-- ÉTAT : PROPOSÉE, NON APPLIQUÉE. Idempotente. Nouvelle table : public.permis_construire (la démarche générique « Autorisation d'urbanisme »
-- du catalogue citoyen reste le point d'entrée du citoyen ; l'instruction communale se fait ici).
-- Workflow : depot -> instruction_services_techniques -> avis_commission -> decision_maire -> delivrance (sans saut, sans retour).
-- Un refus du Maire reste enregistré à l'étape decision_maire (decision_maire = 'refuse') : le dossier n'est pas délivré.
-- Isolation : private.my_commune() ; mêmes garde-fous que les autres tables (anonymes, maintenance, super_admin sans écriture, audit).

create table if not exists public.permis_construire(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null default private.my_commune() references public.communes(id) on delete cascade,
  numero text not null check (char_length(btrim(numero)) between 1 and 60),
  demandeur text not null check (char_length(btrim(demandeur)) between 1 and 200),
  telephone text check (telephone is null or char_length(telephone) <= 30),
  parcelle text check (parcelle is null or char_length(parcelle) <= 200),
  objet text not null check (char_length(btrim(objet)) between 1 and 300),
  statut text not null default 'depot'
    check (statut in ('depot','instruction_services_techniques','avis_commission','decision_maire','delivrance')),
  date_depot date not null default current_date,
  date_limite_instruction date not null,
  date_instruction date,
  avis_services_techniques text check (avis_services_techniques is null or avis_services_techniques in ('favorable','defavorable','reserves')),
  date_avis_commission date,
  avis_commission text check (avis_commission is null or avis_commission in ('favorable','defavorable','reserves')),
  date_decision date,
  decision_maire text check (decision_maire is null or decision_maire in ('accorde','refuse')),
  date_delivrance date,
  numero_permis text check (numero_permis is null or char_length(btrim(numero_permis)) between 1 and 60),
  silence_constate_le date,
  observations text check (observations is null or char_length(observations) <= 3000),
  created_at timestamptz not null default now(),
  unique (id, commune_id),
  unique (commune_id, numero),
  check (date_limite_instruction >= date_depot),
  -- Pas d'étape sans les précédentes (valable pour tous les rôles, y compris postgres)
  check (statut = 'depot' or date_instruction is not null),
  check (statut in ('depot','instruction_services_techniques') or avis_services_techniques is not null),
  check (statut in ('depot','instruction_services_techniques','avis_commission')
         or (avis_commission is not null and date_avis_commission is not null)),
  check (decision_maire is null or (statut in ('decision_maire','delivrance') and date_decision is not null)),
  check (statut <> 'delivrance'
         or (decision_maire = 'accorde' and date_delivrance is not null and nullif(btrim(numero_permis), '') is not null))
);

create index if not exists permis_construire_commune_idx on public.permis_construire(commune_id, date_depot desc);
create index if not exists permis_construire_limite_idx on public.permis_construire(commune_id, date_limite_instruction) where statut <> 'delivrance';

-- Délai d'instruction : date_depot + 3 mois (calculé par le serveur, non modifiable) ; ordre des étapes ; rôles
create or replace function private.permis_construire_workflow()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_ordre text[] := array['depot','instruction_services_techniques','avis_commission','decision_maire','delivrance'];
  v_old int;
  v_new int;
  v_role text := (select private.my_role());
  v_uid uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    if new.statut <> 'depot' then
      raise exception 'Un dossier de permis naît à l''étape « depot ».' using errcode = '55000';
    end if;
    new.date_limite_instruction := (new.date_depot + interval '3 months')::date;
    return new;
  end if;

  if new.date_depot is distinct from old.date_depot or new.date_limite_instruction is distinct from old.date_limite_instruction then
    raise exception 'La date de dépôt et la date limite d''instruction (dépôt + 3 mois) ne sont pas modifiables.' using errcode = '55000';
  end if;

  if old.statut = 'delivrance' then
    raise exception 'Permis délivré : dossier clos, aucune modification.' using errcode = '55000';
  end if;

  v_old := array_position(v_ordre, old.statut);
  v_new := array_position(v_ordre, new.statut);
  if new.statut is distinct from old.statut and (v_new is null or v_new <> v_old + 1) then
    raise exception 'Étape interdite : « % » -> « % » (les étapes se suivent sans saut ni retour).', old.statut, new.statut using errcode = '55000';
  end if;

  -- La décision (accord / refus) est prise par le Maire seul ; la délivrance par le Maire ou le secrétariat
  if v_uid is not null then
    if (new.decision_maire is distinct from old.decision_maire or new.date_decision is distinct from old.date_decision)
       and v_role is distinct from 'maire' then
      raise exception 'Seul le Maire peut enregistrer la décision sur un permis de construire.' using errcode = '42501';
    end if;
    if new.statut = 'delivrance' and old.statut <> 'delivrance' and v_role not in ('maire','secretariat') then
      raise exception 'La délivrance du permis est réservée au Maire et au secrétariat.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.permis_construire_workflow() from public, anon, authenticated;

drop trigger if exists trg_permis_construire_workflow on public.permis_construire;
create trigger trg_permis_construire_workflow
  before insert or update on public.permis_construire
  for each row execute function private.permis_construire_workflow();

-- Silence de l'administration : marque les dossiers dont le délai d'instruction est dépassé sans décision (alerte côté application).
create or replace function public.constater_silences_permis()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_commune uuid := (select private.my_commune());
  v_n integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;
  if coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
     or v_commune is null or (select private.my_role()) not in ('maire','secretariat') then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  update public.permis_construire
     set silence_constate_le = current_date
   where commune_id = v_commune and silence_constate_le is null
     and statut <> 'delivrance' and decision_maire is null
     and date_limite_instruction < current_date;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
alter function public.constater_silences_permis() owner to postgres;
revoke all on function public.constater_silences_permis() from public, anon;
grant execute on function public.constater_silences_permis() to authenticated;

-- RLS : lecture maire / adjoint / secrétariat ; écriture maire / secrétariat ; aucune suppression (traçabilité)
alter table public.permis_construire enable row level security;
revoke all on public.permis_construire from public, anon, authenticated;
grant select, insert, update on public.permis_construire to authenticated;

drop policy if exists permis_construire_lecture on public.permis_construire;
create policy permis_construire_lecture on public.permis_construire for select to authenticated
  using ((select private.my_role()) in ('maire','adjoint','secretariat') and commune_id = (select private.my_commune()));
drop policy if exists permis_construire_creation on public.permis_construire;
create policy permis_construire_creation on public.permis_construire for insert to authenticated
  with check ((select private.my_role()) in ('maire','secretariat') and commune_id = (select private.my_commune()));
drop policy if exists permis_construire_modification on public.permis_construire;
create policy permis_construire_modification on public.permis_construire for update to authenticated
  using ((select private.my_role()) in ('maire','secretariat') and commune_id = (select private.my_commune()))
  with check ((select private.my_role()) in ('maire','secretariat') and commune_id = (select private.my_commune()));

drop policy if exists isolation_commune on public.permis_construire;
create policy isolation_commune on public.permis_construire as restrictive for all to authenticated
  using (commune_id = (select private.my_commune())) with check (commune_id = (select private.my_commune()));
drop policy if exists bloque_anonymes_permis_construire on public.permis_construire;
create policy bloque_anonymes_permis_construire on public.permis_construire as restrictive for all to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
  with check (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);
drop policy if exists maintenance_serveur on public.permis_construire;
create policy maintenance_serveur on public.permis_construire as restrictive for all to authenticated
  using ((select private.hors_maintenance())) with check ((select private.hors_maintenance()));
drop policy if exists sa_no_insert on public.permis_construire;
create policy sa_no_insert on public.permis_construire as restrictive for insert to authenticated
  with check (not public.is_super_admin());
drop policy if exists sa_no_update on public.permis_construire;
create policy sa_no_update on public.permis_construire as restrictive for update to authenticated
  using (not public.is_super_admin()) with check (not public.is_super_admin());

drop trigger if exists audit_permis_construire on public.permis_construire;
create trigger audit_permis_construire after insert or update or delete on public.permis_construire
  for each row execute function private.audit();
$m209$::text as m209;

create function pg_temp.dr_run_mig() returns void language plpgsql as $f$
begin
  execute (select m207 || E'\n' || m208 || E'\n' || m209 from pg_temp.dr_mig);
end $f$;

select pg_temp.dr_run_mig();
select pg_temp.dr_a('MIGRATION', 'Application des 3 migrations sur la base + jeu historique (1re passe)', 'true');

-- ---------------------------------------------------------------------------
-- TESTS DES RÈGLES MÉTIER (après application des 3 migrations)
-- ---------------------------------------------------------------------------
do $t_struct$
begin
  perform pg_temp.dr_a('STRUCT', 'Types : marches.mode converti en enum', $q$ (select pg_typeof(mode)::text from public.marches where id = current_setting('dr.m_ao')::uuid) like '%mode_passation_marche' $q$);
  perform pg_temp.dr_a('STRUCT', '10 contraintes NOT VALID présentes et non validées', $q$ (select count(*) from pg_constraint where not convalidated and conname = any(array['budgets_dob_avant_vote_chk','budgets_tutelle_avant_approbation_chk','budgets_transmission_apres_dob_chk','sessions_conseil_delai_convocation_chk','session_presences_procuration_chk','marches_appel_publication_chk','marches_appel_attribution_chk','contribuables_entreprise_ninea_chk','engagements_ordonnancement_chk','engagements_paiement_tresor_chk'])) = 10 $q$);
  perform pg_temp.dr_a('STRUCT', '12 contraintes validées présentes', $q$ (select count(*) from pg_constraint where convalidated and conname = any(array['budgets_statut_chk','budgets_statut_tutelle_chk','budgets_pv_dob_url_chk','budgets_preuve_tutelle_url_chk','session_presences_pas_auto_procuration_chk','marches_seuil_passation_chk','marches_ref_appel_chk','contribuables_ninea_format_chk','paiements_taxes_statut_tresor_chk','paiements_taxes_quittance_tresor_chk','engagements_statut_tresor_chk','engagements_champs_tresor_chk'])) = 12 $q$);
  perform pg_temp.dr_a('STRUCT', 'Ancien CHECK budgets_statut_check supprimé', $q$ not exists (select 1 from pg_constraint where conrelid = 'public.budgets'::regclass and conname = 'budgets_statut_check') $q$);
  perform pg_temp.dr_a('STRUCT', '5 triggers du lot créés', $q$ (select count(*) from pg_trigger where not tgisinternal and tgname = any(array['trg_budgets_workflow','session_presences_procuration','trg_deliberations_garde_quorum','trg_engagements_circuit','trg_permis_construire_workflow'])) = 5 $q$);
  perform pg_temp.dr_a('STRUCT', 'RPC : EXECUTE authenticated oui / anon non', $q$ has_function_privilege('authenticated','public.budget_transmettre_tutelle(uuid,date,text)','execute') and has_function_privilege('authenticated','public.budget_decider_tutelle(uuid,text)','execute') and has_function_privilege('authenticated','public.enregistrer_quittance_tresor(uuid,text,text,date)','execute') and has_function_privilege('authenticated','public.constater_silences_permis()','execute') and not has_function_privilege('anon','public.budget_transmettre_tutelle(uuid,date,text)','execute') and not has_function_privilege('anon','public.budget_decider_tutelle(uuid,text)','execute') and not has_function_privilege('anon','public.enregistrer_quittance_tresor(uuid,text,text,date)','execute') and not has_function_privilege('anon','public.constater_silences_permis()','execute') $q$);
  perform pg_temp.dr_a('STRUCT', 'RPC SECURITY DEFINER : propriétaire postgres', $q$ (select bool_and(pg_get_userbyid(proowner) = 'postgres' and prosecdef) from pg_proc where oid = any(array['public.budget_transmettre_tutelle(uuid,date,text)'::regprocedure,'public.budget_decider_tutelle(uuid,text)'::regprocedure,'public.enregistrer_quittance_tresor(uuid,text,text,date)'::regprocedure,'public.constater_silences_permis()'::regprocedure])) $q$);
  perform pg_temp.dr_a('STRUCT', 'Fonctions private.* du lot : EXECUTE refusé à authenticated/anon', $q$ not has_function_privilege('authenticated','private.quorum_session(uuid)','execute') and not has_function_privilege('anon','private.quorum_session(uuid)','execute') and not has_function_privilege('authenticated','private.deliberations_garde_quorum()','execute') and not has_function_privilege('authenticated','private.session_presences_procuration_garde()','execute') $q$);
  perform pg_temp.dr_a('STRUCT', 'permis_construire : RLS active, anon sans accès', $q$ (select relrowsecurity from pg_class where oid = 'public.permis_construire'::regclass) and not has_table_privilege('anon','public.permis_construire','select') $q$);
  perform pg_temp.dr_a('STRUCT', 'paiements_taxes : aucune ligne existante hors statut_tresor=a_verser', $q$ (select count(*) from public.paiements_taxes where statut_tresor is distinct from 'a_verser') = 0 $q$);
  perform pg_temp.dr_i('STRUCT', 'Ordre d''exécution des triggers BEFORE sur budgets (alphabétique)', (select string_agg(tgname, ' > ' order by tgname) from pg_trigger where tgrelid = 'public.budgets'::regclass and not tgisinternal and (tgtype & 2) = 2));
end $t_struct$;

-- ===== LOT D — BUDGET : DOB, immutabilité, tutelle =====
do $t_budget$
begin
  perform pg_temp.dr_t('D-budget', 'B01 budget HISTORIQUE voté sans DOB : toute écriture est refusée (CHECK NOT VALID)',
    $q$ update public.budgets set statut_tutelle = 'en_attente' where id = current_setting('dr.b_vote')::uuid $q$, '23514');
  perform pg_temp.dr_t('D-budget', 'B02 régularisation du DOB (date + PV) sur le budget voté historique',
    $q$ update public.budgets set date_dob = current_date - 30, pv_dob_url = 'dr/pv-dob.pdf' where id = current_setting('dr.b_vote')::uuid $q$, '00000');
  perform pg_temp.dr_t('D-budget', 'B03 IMMUTABILITÉ conservée : un budget voté n''est pas modifiable en UPDATE direct',
    $q$ update public.budgets set statut_tutelle = 'approuve' where id = current_setting('dr.b_vote')::uuid $q$, '23514', 'maire');
  perform pg_temp.dr_t('D-budget', 'B04 transmission tutelle antérieure au DOB refusée',
    $q$ select public.budget_transmettre_tutelle(current_setting('dr.b_vote')::uuid, current_date - 60, 'dr/preuve.pdf') $q$, '22023', 'maire');
  perform pg_temp.dr_t('D-budget', 'B05 transmission tutelle datée dans le futur refusée',
    $q$ select public.budget_transmettre_tutelle(current_setting('dr.b_vote')::uuid, current_date + 5, 'dr/preuve.pdf') $q$, '22023', 'maire');
  perform pg_temp.dr_t('D-budget', 'B06 transmission sans preuve refusée',
    $q$ select public.budget_transmettre_tutelle(current_setting('dr.b_vote')::uuid, current_date - 1, null) $q$, '22023', 'maire');
  perform pg_temp.dr_t('D-budget', 'B07 transmission valide (RPC SECURITY DEFINER traverse le garde d''immutabilité)',
    $q$ select public.budget_transmettre_tutelle(current_setting('dr.b_vote')::uuid, current_date - 1, 'dr/preuve.pdf') $q$, '00000', 'maire');
  perform pg_temp.dr_a('D-budget', 'B08 état après transmission : statut=vote, statut_tutelle=en_attente',
    $q$ (select statut = 'vote' and statut_tutelle = 'en_attente' and date_transmission_tutelle = current_date - 1 from public.budgets where id = current_setting('dr.b_vote')::uuid) $q$);
  perform pg_temp.dr_t('D-budget', 'B09 décision de tutelle invalide refusée',
    $q$ select public.budget_decider_tutelle(current_setting('dr.b_vote')::uuid, 'peut-etre') $q$, '22023', 'maire');
  perform pg_temp.dr_t('D-budget', 'B10 décision de tutelle « approuve » (vote -> approuve)',
    $q$ select public.budget_decider_tutelle(current_setting('dr.b_vote')::uuid, 'approuve') $q$, '00000', 'maire');
  perform pg_temp.dr_a('D-budget', 'B11 état final : statut=approuve, statut_tutelle=approuve',
    $q$ (select statut = 'approuve' and statut_tutelle = 'approuve' from public.budgets where id = current_setting('dr.b_vote')::uuid) $q$);
  perform pg_temp.dr_t('D-budget', 'B12 budget HISTORIQUE voté sans DOB : transmission tutelle impossible',
    $q$ select public.budget_transmettre_tutelle(current_setting('dr.b_vote2')::uuid, current_date - 1, 'dr/preuve.pdf') $q$, '23514', 'maire');
  perform pg_temp.dr_t('D-budget', 'B13 décision de tutelle sans preuve de transmission refusée',
    $q$ select public.budget_decider_tutelle(current_setting('dr.b_vote2')::uuid, 'approuve') $q$, '23514', 'maire');
  perform pg_temp.dr_t('D-budget', 'B14 brouillon -> vote SANS DOB refusé',
    $q$ update public.budgets set statut = 'vote' where id = current_setting('dr.b_brou')::uuid $q$, '23514');
  perform pg_temp.dr_t('D-budget', 'B15 saut d''étape brouillon -> approuve refusé',
    $q$ update public.budgets set statut = 'approuve' where id = current_setting('dr.b_brou')::uuid $q$, '55000');
  perform pg_temp.dr_t('D-budget', 'B16 retour arrière approuve -> vote refusé',
    $q$ update public.budgets set statut = 'vote' where id = current_setting('dr.b_appr')::uuid $q$, '55000');
  perform pg_temp.dr_t('D-budget', 'B17 création directe au statut « vote » refusée',
    $q$ insert into public.budgets(commune_id, annee, statut) values (current_setting('dr.commune')::uuid, 2093, 'vote') $q$, '55000');
  perform pg_temp.dr_t('D-budget', 'B18 création sans statut explicite',
    $q$ insert into public.budgets(commune_id, annee) values (current_setting('dr.commune')::uuid, 2094) $q$, '00000');
  perform pg_temp.dr_a('D-budget', 'B18b statut par défaut = dob',
    $q$ (select statut = 'dob' from public.budgets where commune_id = current_setting('dr.commune')::uuid and annee = 2094) $q$);
  perform pg_temp.dr_t('D-budget', 'B19 dob -> brouillon avec DOB renseigné',
    $q$ update public.budgets set date_dob = current_date - 10, pv_dob_url = 'dr/pv.pdf', statut = 'brouillon' where commune_id = current_setting('dr.commune')::uuid and annee = 2094 $q$, '00000');
  perform pg_temp.dr_t('D-budget', 'B20 brouillon -> vote avec DOB',
    $q$ update public.budgets set statut = 'vote' where commune_id = current_setting('dr.commune')::uuid and annee = 2094 $q$, '00000');
  perform pg_temp.dr_t('D-budget', 'B21 vote -> approuve SANS tutelle refusé',
    $q$ update public.budgets set statut = 'approuve' where commune_id = current_setting('dr.commune')::uuid and annee = 2094 $q$, '23514');
  perform pg_temp.dr_t('D-budget', 'B22 budget HISTORIQUE approuvé sans DOB/tutelle : UPDATE partiel refusé',
    $q$ update public.budgets set pv_dob_url = 'dr/x.pdf' where id = current_setting('dr.b_appr')::uuid $q$, '23514');
  perform pg_temp.dr_t('D-budget', 'B23 régularisation complète (un seul UPDATE) du budget approuvé historique',
    $q$ update public.budgets set date_dob = current_date - 90, pv_dob_url = 'dr/pv.pdf', date_transmission_tutelle = current_date - 60, preuve_transmission_url = 'dr/preuve.pdf', statut_tutelle = 'approuve' where id = current_setting('dr.b_appr')::uuid $q$, '00000');
end $t_budget$;

-- ===== LOT D — CONSEIL : quorum, convocation, procurations =====
do $t_conseil$
begin
  perform pg_temp.dr_a('D-conseil', 'Q01 session SANS quorum : 1 présent, quorum non atteint',
    $q$ (private.quorum_session(current_setting('dr.s_noq')::uuid) ->> 'atteint')::boolean = false and (private.quorum_session(current_setting('dr.s_noq')::uuid) ->> 'presents')::int = 1 $q$);
  perform pg_temp.dr_a('D-conseil', 'Q02 session AVEC quorum : quorum atteint',
    $q$ (private.quorum_session(current_setting('dr.s_quo')::uuid) ->> 'atteint')::boolean = true $q$);
  perform pg_temp.dr_t('D-conseil', 'Q03 délibération adoptée SANS quorum (UPDATE) refusée',
    $q$ update public.deliberations set statut = 'adoptee' where id = current_setting('dr.d_noq')::uuid $q$, '55000');
  perform pg_temp.dr_t('D-conseil', 'Q04 délibération rejetée SANS quorum (UPDATE) refusée',
    $q$ update public.deliberations set statut = 'rejetee' where id = current_setting('dr.d_noq')::uuid $q$, '55000');
  perform pg_temp.dr_t('D-conseil', 'Q05 RPC cloturer_deliberation SANS quorum refusée',
    $q$ select public.cloturer_deliberation(current_setting('dr.d_noq')::uuid) $q$, '55000', 'maire');
  perform pg_temp.dr_t('D-conseil', 'Q06 RPC cloturer_deliberation AVEC quorum acceptée',
    $q$ select public.cloturer_deliberation(current_setting('dr.d_quo')::uuid) $q$, '00000', 'maire');
  perform pg_temp.dr_a('D-conseil', 'Q06b délibération avec quorum : statut adoptee',
    $q$ (select statut = 'adoptee' from public.deliberations where id = current_setting('dr.d_quo')::uuid) $q$);
  perform pg_temp.dr_a('D-conseil', 'Q06c délibération sans quorum : toujours « projet »',
    $q$ (select statut = 'projet' from public.deliberations where id = current_setting('dr.d_noq')::uuid) $q$);
  perform pg_temp.dr_t('D-conseil', 'Q07 délibération HORS session non concernée par le quorum',
    $q$ select public.cloturer_deliberation(current_setting('dr.d_hs')::uuid) $q$, '00000', 'maire');
  perform pg_temp.dr_t('D-conseil', 'Q08 convocation à 2 jours (< 3) refusée',
    $q$ insert into public.sessions_conseil(commune_id, numero, jour, convocation_le, statut) values (current_setting('dr.commune')::uuid, 'DR-S9', current_date + 10, current_date + 8, 'prevue') $q$, '23514');
  perform pg_temp.dr_t('D-conseil', 'Q09 convocation à 3 jours acceptée',
    $q$ insert into public.sessions_conseil(commune_id, numero, jour, convocation_le, statut) values (current_setting('dr.commune')::uuid, 'DR-S10', current_date + 10, current_date + 7, 'prevue') $q$, '00000');
  perform pg_temp.dr_t('D-conseil', 'Q10 session déjà tenue : délai non contrôlé (historique)',
    $q$ insert into public.sessions_conseil(commune_id, numero, jour, convocation_le, statut) values (current_setting('dr.commune')::uuid, 'DR-S11', current_date - 1, current_date - 2, 'tenue') $q$, '00000');
  perform pg_temp.dr_t('D-conseil', 'Q11 session HISTORIQUE non conforme (convocation 1 jour) : UPDATE refusé',
    $q$ update public.sessions_conseil set lieu = 'Salle DR' where id = current_setting('dr.s_leg')::uuid $q$, '23514');
  perform pg_temp.dr_t('D-conseil', 'Q12 régularisation de la date de convocation',
    $q$ update public.sessions_conseil set convocation_le = current_date + 5 where id = current_setting('dr.s_leg')::uuid $q$, '00000');
end $t_conseil$;

do $mk$
declare v_c uuid := current_setting('dr.commune')::uuid; v_id uuid;
begin
  insert into public.sessions_conseil(commune_id, numero, jour, convocation_le, statut) values (v_c, 'DR-SP1', current_date + 20, current_date + 10, 'prevue') returning id into v_id; perform pg_temp.dr_set('s_proc',  v_id::text);
  insert into public.sessions_conseil(commune_id, numero, jour, convocation_le, statut) values (v_c, 'DR-SP2', current_date + 20, current_date + 10, 'prevue') returning id into v_id; perform pg_temp.dr_set('s_proc2', v_id::text);
end $mk$;

do $t_proc$
begin
  perform pg_temp.dr_t('D-conseil', 'P01 procuration valide (mandataire présent et titulaire)',
    $q$ insert into public.session_presences(session_id, conseiller_id, present, statut_presence, mandataire_id) values
         (current_setting('dr.s_proc')::uuid, current_setting('dr.c1')::uuid, true,  'present',     null),
         (current_setting('dr.s_proc')::uuid, current_setting('dr.c2')::uuid, false, 'procuration', current_setting('dr.c1')::uuid) $q$, '00000');
  perform pg_temp.dr_t('D-conseil', 'P02 deuxième procuration au même mandataire refusée',
    $q$ insert into public.session_presences(session_id, conseiller_id, present, statut_presence, mandataire_id) values
         (current_setting('dr.s_proc')::uuid, current_setting('dr.c3')::uuid, false, 'procuration', current_setting('dr.c1')::uuid) $q$, '23505');
  perform pg_temp.dr_t('D-conseil', 'P03 auto-procuration refusée',
    $q$ insert into public.session_presences(session_id, conseiller_id, present, statut_presence, mandataire_id) values
         (current_setting('dr.s_proc')::uuid, current_setting('dr.c4')::uuid, false, 'procuration', current_setting('dr.c4')::uuid) $q$, '23514');
  perform pg_temp.dr_t('D-conseil', 'P04 procuration sans mandataire refusée',
    $q$ insert into public.session_presences(session_id, conseiller_id, present, statut_presence, mandataire_id) values
         (current_setting('dr.s_proc')::uuid, current_setting('dr.c5')::uuid, false, 'procuration', null) $q$, '23514');
  perform pg_temp.dr_t('D-conseil', 'P05 mandataire ABSENT refusé (contrainte différée forcée en IMMEDIATE)',
    $q$ insert into public.session_presences(session_id, conseiller_id, present, statut_presence, mandataire_id) values
         (current_setting('dr.s_proc2')::uuid, current_setting('dr.c1')::uuid, false, 'absent',      null),
         (current_setting('dr.s_proc2')::uuid, current_setting('dr.c2')::uuid, false, 'procuration', current_setting('dr.c1')::uuid) $q$, '23514');
  perform pg_temp.dr_a('D-conseil', 'P06 la procuration ne compte PAS pour le quorum (1 présent, 1 procuration => presents = 1)',
    $q$ (private.quorum_session(current_setting('dr.s_proc')::uuid) ->> 'presents')::int = 1 $q$);
end $t_proc$;

-- ===== LOT E — MARCHÉS, FISCALITÉ, DÉPENSES =====
do $t_e$
begin
  perform pg_temp.dr_a('E-marches', 'M01 conversion : AO ouvert / gré à gré convertis, « Autre » -> NULL + mention en observations',
    $q$ (select mode::text = 'appel_offres_ouvert' from public.marches where id = current_setting('dr.m_ao')::uuid)
        and (select mode::text = 'gre_a_gre' from public.marches where id = current_setting('dr.m_gre')::uuid)
        and (select mode is null and observations like '%Autre%' from public.marches where id = current_setting('dr.m_autre')::uuid) $q$);
  perform pg_temp.dr_t('E-marches', 'M02 AO lancé HISTORIQUE sans référence de publication : UPDATE refusé',
    $q$ update public.marches set observations = 'dr' where id = current_setting('dr.m_ao')::uuid $q$, '23514');
  perform pg_temp.dr_t('E-marches', 'M03 référence de publication renseignée',
    $q$ update public.marches set ref_publication_appel = 'AO-DR-001' where id = current_setting('dr.m_ao')::uuid $q$, '00000');
  perform pg_temp.dr_t('E-marches', 'M04 attribution d''un AO sans référence d''attribution refusée',
    $q$ update public.marches set statut = 'attribue' where id = current_setting('dr.m_ao')::uuid $q$, '23514');
  perform pg_temp.dr_t('E-marches', 'M05 attribution avec référence acceptée',
    $q$ update public.marches set statut = 'attribue', ref_attribution_appel = 'ATT-DR-001' where id = current_setting('dr.m_ao')::uuid $q$, '00000');
  perform pg_temp.dr_t('E-marches', 'M06 gré à gré : aucune référence d''appel exigée',
    $q$ update public.marches set statut = 'attribue' where id = current_setting('dr.m_gre')::uuid $q$, '00000');
  perform pg_temp.dr_t('E-marches', 'M07 seuil de passation négatif refusé',
    $q$ update public.marches set seuil_passation = -1 where id = current_setting('dr.m_gre')::uuid $q$, '23514');

  perform pg_temp.dr_a('E-fiscalité', 'F01 reprise NINEA depuis l''identifiant fiscal (normalisé)',
    $q$ (select ninea = 'DR1234567' from public.contribuables where id = current_setting('dr.c_ent2')::uuid) $q$);
  perform pg_temp.dr_t('E-fiscalité', 'F02 entreprise HISTORIQUE sans NINEA : UPDATE refusé',
    $q$ update public.contribuables set nom = nom where id = current_setting('dr.c_ent1')::uuid $q$, '23514');
  perform pg_temp.dr_t('E-fiscalité', 'F03 régularisation du NINEA',
    $q$ update public.contribuables set ninea = 'DR7654321' where id = current_setting('dr.c_ent1')::uuid $q$, '00000');
  perform pg_temp.dr_t('E-fiscalité', 'F04 nouvelle entreprise sans NINEA refusée',
    $q$ insert into public.contribuables(commune_id, nom, type) values (current_setting('dr.commune')::uuid, 'DR X', 'entreprise') $q$, '23514');
  perform pg_temp.dr_t('E-fiscalité', 'F05 NINEA mal formé refusé',
    $q$ insert into public.contribuables(commune_id, nom, type, ninea) values (current_setting('dr.commune')::uuid, 'DR Y', 'particulier', 'ab-1') $q$, '23514');
  perform pg_temp.dr_t('E-fiscalité', 'F06 NINEA en doublon dans la commune refusé',
    $q$ insert into public.contribuables(commune_id, nom, type, ninea) values (current_setting('dr.commune')::uuid, 'DR Z', 'entreprise', 'DR1234567') $q$, '23505');
  perform pg_temp.dr_t('E-fiscalité', 'F07 quittance du Trésor : refusée au maire (réservée aux finances)',
    $q$ select public.enregistrer_quittance_tresor(gen_random_uuid(), 'verse', 'Q-DR-1') $q$, '42501', 'maire');

  perform pg_temp.dr_t('E-dépenses', 'G01 engagement HISTORIQUE payé sans circuit : UPDATE refusé',
    $q$ update public.engagements set montant = montant where id = current_setting('dr.e_paye')::uuid $q$, '23514');
  perform pg_temp.dr_t('E-dépenses', 'G02 saut engagé -> payé refusé',
    $q$ update public.engagements set statut = 'paye' where id = current_setting('dr.e_eng')::uuid $q$, '55000');
  perform pg_temp.dr_t('E-dépenses', 'G03 le Maire ordonnance (liquidé -> ordonnancé)',
    $q$ update public.engagements set statut = 'ordonnance' where id = current_setting('dr.e_liq')::uuid $q$, '00000', 'maire');
  perform pg_temp.dr_a('E-dépenses', 'G04 ordonnateur = maire, statut_tresor = a_payer',
    $q$ (select ordonnateur_id = current_setting('dr.maire')::uuid and statut_tresor = 'a_payer' and date_ordonnancement is not null from public.engagements where id = current_setting('dr.e_liq')::uuid) $q$);
  perform pg_temp.dr_t('E-dépenses', 'G05 le Maire ne peut PAS enregistrer le paiement (séparation ordonnateur/comptable)',
    $q$ update public.engagements set statut = 'paye', comptable_public = 'Receveur DR', ref_quittance_tresor = 'Q-DR-1', date_paiement_tresor = current_date where id = current_setting('dr.e_liq')::uuid $q$, '42501', 'maire');
  perform pg_temp.dr_t('E-dépenses', 'G06 champs du circuit figés hors changement de statut',
    $q$ update public.engagements set comptable_public = 'X' where id = current_setting('dr.e_liq')::uuid $q$, '55000', 'maire');
  perform pg_temp.dr_t('E-dépenses', 'G07 paiement par le comptable (simulé hors rôle API) avec quittance',
    $q$ update public.engagements set statut = 'paye', comptable_public = 'Receveur DR', ref_quittance_tresor = 'Q-DR-1', date_paiement_tresor = current_date where id = current_setting('dr.e_liq')::uuid $q$, '00000');
  perform pg_temp.dr_t('E-dépenses', 'G08 création directe d''un engagement « payé » refusée',
    $q$ insert into public.engagements(commune_id, budget_ligne_id, montant, statut) values (current_setting('dr.commune')::uuid, current_setting('dr.ligne')::uuid, 50, 'paye') $q$, '55000');
end $t_e$;

-- ===== LOT F — URBANISME =====
do $t_f$
begin
  perform pg_temp.dr_t('F-urbanisme', 'U01 dépôt d''un permis',
    $q$ insert into public.permis_construire(commune_id, numero, demandeur, objet, date_depot) values (current_setting('dr.commune')::uuid, 'DR-PC-1', 'DR Demandeur', 'Maison', date '2026-11-30') $q$, '00000');
  perform pg_temp.dr_a('F-urbanisme', 'U02 délai d''instruction calculé = dépôt + 3 mois (30/11/2026 -> 28/02/2027)',
    $q$ (select date_limite_instruction = date '2027-02-28' from public.permis_construire where commune_id = current_setting('dr.commune')::uuid and numero = 'DR-PC-1') $q$);
  perform pg_temp.dr_t('F-urbanisme', 'U03 date limite non modifiable',
    $q$ update public.permis_construire set date_limite_instruction = date '2030-01-01' where commune_id = current_setting('dr.commune')::uuid and numero = 'DR-PC-1' $q$, '55000');
  perform pg_temp.dr_t('F-urbanisme', 'U04 saut d''étape depot -> avis_commission refusé',
    $q$ update public.permis_construire set statut = 'avis_commission' where commune_id = current_setting('dr.commune')::uuid and numero = 'DR-PC-1' $q$, '55000');
  perform pg_temp.dr_t('F-urbanisme', 'U05 étape suivante sans date d''instruction refusée (CHECK)',
    $q$ update public.permis_construire set statut = 'instruction_services_techniques' where commune_id = current_setting('dr.commune')::uuid and numero = 'DR-PC-1' $q$, '23514');
  perform pg_temp.dr_t('F-urbanisme', 'U06 étape suivante avec date d''instruction',
    $q$ update public.permis_construire set statut = 'instruction_services_techniques', date_instruction = current_date where commune_id = current_setting('dr.commune')::uuid and numero = 'DR-PC-1' $q$, '00000');
  perform pg_temp.dr_t('F-urbanisme', 'U07 retour arrière refusé',
    $q$ update public.permis_construire set statut = 'depot' where commune_id = current_setting('dr.commune')::uuid and numero = 'DR-PC-1' $q$, '55000');
  perform pg_temp.dr_t('F-urbanisme', 'U08 délivrance sans passer par la commission et la décision refusée',
    $q$ update public.permis_construire set statut = 'delivrance' where commune_id = current_setting('dr.commune')::uuid and numero = 'DR-PC-1' $q$, '55000');
  perform pg_temp.dr_t('F-urbanisme', 'U09 le Maire crée un dossier (RLS + triggers + audit)',
    $q$ insert into public.permis_construire(commune_id, numero, demandeur, objet) values (current_setting('dr.commune')::uuid, 'DR-PC-2', 'DR Demandeur 2', 'Clôture') $q$, '00000', 'maire');
  perform pg_temp.dr_t('F-urbanisme', 'U10 décision « accordé » posée à l''étape dépôt refusée (CHECK)',
    $q$ update public.permis_construire set decision_maire = 'accorde', date_decision = current_date where commune_id = current_setting('dr.commune')::uuid and numero = 'DR-PC-2' $q$, '23514', 'maire');
  perform pg_temp.dr_t('F-urbanisme', 'U11 RPC constater_silences_permis exécutable par le Maire',
    $q$ select public.constater_silences_permis() $q$, '00000', 'maire');
end $t_f$;

-- ---------------------------------------------------------------------------
-- IDEMPOTENCE : rejeu intégral des 3 migrations sur la base déjà migrée
-- ---------------------------------------------------------------------------
do $t_idem$
begin
  perform pg_temp.dr_t('IDEMP', 'Rejeu des migrations 20261207 + 20261208 + 20261209 (2e passe, aucune erreur attendue)', $q$ select pg_temp.dr_run_mig() $q$, '00000');
  perform pg_temp.dr_a('IDEMP', 'Après rejeu : toujours 10 NOT VALID et 12 validées', $q$ (select count(*) from pg_constraint where not convalidated and conname = any(array['budgets_dob_avant_vote_chk','budgets_tutelle_avant_approbation_chk','budgets_transmission_apres_dob_chk','sessions_conseil_delai_convocation_chk','session_presences_procuration_chk','marches_appel_publication_chk','marches_appel_attribution_chk','contribuables_entreprise_ninea_chk','engagements_ordonnancement_chk','engagements_paiement_tresor_chk'])) = 10
      and (select count(*) from pg_constraint where convalidated and conname = any(array['budgets_statut_chk','budgets_statut_tutelle_chk','budgets_pv_dob_url_chk','budgets_preuve_tutelle_url_chk','session_presences_pas_auto_procuration_chk','marches_seuil_passation_chk','marches_ref_appel_chk','contribuables_ninea_format_chk','paiements_taxes_statut_tresor_chk','paiements_taxes_quittance_tresor_chk','engagements_statut_tresor_chk','engagements_champs_tresor_chk'])) = 12 $q$);
  perform pg_temp.dr_a('IDEMP', 'Après rejeu : 5 triggers du lot, un seul exemplaire chacun', $q$ (select count(*) from pg_trigger where not tgisinternal and tgname = any(array['trg_budgets_workflow','session_presences_procuration','trg_deliberations_garde_quorum','trg_engagements_circuit','trg_permis_construire_workflow'])) = 5 $q$);
  perform pg_temp.dr_t('IDEMP', 'Après rejeu : règle quorum toujours active', $q$ update public.deliberations set statut = 'adoptee' where id = current_setting('dr.d_noq')::uuid $q$, '55000');
end $t_idem$;

-- ---------------------------------------------------------------------------
-- RAPPORT (exception volontaire => la transaction ne peut pas être validée)
-- ---------------------------------------------------------------------------
do $rep$
declare v_fail int; v_total int; v_txt text;
begin
  select count(*) filter (where verdict = 'ECHEC'), count(*) filter (where verdict in ('OK','ECHEC'))
    into v_fail, v_total from pg_temp.dryrun_report;
  select string_agg(format('%s [%s] %s | attendu=%s | obtenu=%s', lpad(n::text, 3, '0'), verdict, etape || ' · ' || test, attendu, obtenu), E'\n' order by n)
    into v_txt from pg_temp.dryrun_report;
  raise exception E'DRYRUN % — % vérifications, % échec(s). TOUT EST ANNULÉ.\n%',
    case when v_fail = 0 then 'GO' else 'NO-GO' end, v_total, v_fail, v_txt;
end $rep$;

ROLLBACK;
