-- LOT D : Budget (DOB, tutelle) et Conseil municipal (quorum, procurations, délai de convocation).
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
