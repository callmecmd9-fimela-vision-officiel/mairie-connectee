-- P0/P1 : machines à états verrouillées côté base (les RLS seules ne suffisent pas).
-- Tables couvertes : votes_deliberations, deliberations, budgets, marches.
--
-- Principes :
--   * Les triggers sont BEFORE ROW, en SECURITY INVOKER avec search_path vide (aucune dépendance au schéma courant).
--   * Échappatoire prévue pour les futures RPC de transition : une fonction SECURITY DEFINER dont le propriétaire est
--     `postgres` (ou `supabase_admin`) s'exécute avec current_user = propriétaire, et passe donc les gardes de
--     deliberations / budgets / marches. Les rôles API (anon, authenticated, service_role) ne passent JAMAIS.
--   * Migration ré-exécutable : CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS avant chaque CREATE TRIGGER.
--
-- Version 20261202000900 : placée APRÈS 20261202000800 (dernière version enregistrée dans l'historique Supabase) pour ne pas
-- être refusée comme migration « hors ordre », et APRÈS les lots 9 et 11 qui créent budgets et votes_deliberations.
-- ÉTAT : PROPOSÉE, NON APPLIQUÉE en production (voir supabase/PRODUCTION_VERSION_MAP.md).
-- IMPACT FRONT à traiter avant application : js/deliberations.js et js/actions.js insèrent des délibérations directement
-- en « adoptee » (valeur par défaut de la colonne) ; ces écrans seront refusés tant qu'une RPC de vote n'existe pas.

-- ============================================================================
-- 1) votes_deliberations : vote possible uniquement tant que la délibération est « projet »,
--    par un conseiller actif de la même commune
-- ============================================================================
create or replace function private.votes_deliberations_garde()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_statut  text;
  v_actif   boolean;
  v_commune uuid;
begin
  -- a) La délibération parente (ligne existante) doit encore être au statut « projet »
  if tg_op in ('UPDATE', 'DELETE') then
    select d.statut into v_statut
      from public.deliberations d
     where d.id = old.deliberation_id
       and d.commune_id = old.commune_id
       for share;
    if not found then
      -- Suppression en cascade : la délibération vient d'être supprimée, le vote la suit.
      if tg_op = 'DELETE' then
        return old;
      end if;
      raise exception 'Délibération % introuvable ou inaccessible : vote non modifiable.', old.deliberation_id
        using errcode = '55000';
    end if;
    if v_statut is distinct from 'projet' then
      raise exception 'Vote non modifiable : la délibération % est au statut "%" (seul le statut "projet" l''autorise).',
        old.deliberation_id, v_statut
        using errcode = '55000';
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    -- b) Un vote ne change jamais de délibération ni de commune
    if tg_op = 'UPDATE'
       and (new.deliberation_id is distinct from old.deliberation_id
            or new.commune_id is distinct from old.commune_id) then
      raise exception 'Un vote ne peut pas être rattaché à une autre délibération ou commune.'
        using errcode = '23514';
    end if;

    -- c) Un nouveau vote exige aussi une délibération « projet » de la même commune
    if tg_op = 'INSERT' then
      select d.statut into v_statut
        from public.deliberations d
       where d.id = new.deliberation_id
         and d.commune_id = new.commune_id
         for share;
      if not found then
        raise exception 'Délibération % introuvable dans la commune du vote.', new.deliberation_id
          using errcode = '23503';
      end if;
      if v_statut is distinct from 'projet' then
        raise exception 'Vote refusé : la délibération % est au statut "%" (seul le statut "projet" l''autorise).',
          new.deliberation_id, v_statut
          using errcode = '55000';
      end if;
    end if;

    -- d) Le conseiller doit exister, être actif et appartenir à la même commune
    select c.actif, c.commune_id into v_actif, v_commune
      from public.conseillers c
     where c.id = new.conseiller_id
       for share;
    if not found then
      raise exception 'Conseiller % introuvable.', new.conseiller_id
        using errcode = '23503';
    end if;
    if v_commune is distinct from new.commune_id then
      raise exception 'Le conseiller % n''appartient pas à la commune du vote.', new.conseiller_id
        using errcode = '23514';
    end if;
    if v_actif is distinct from true then
      raise exception 'Le conseiller % n''est pas actif : il ne peut pas voter.', new.conseiller_id
        using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$$;

drop trigger if exists trg_votes_deliberations_garde on public.votes_deliberations;
create trigger trg_votes_deliberations_garde
  before insert or update or delete on public.votes_deliberations
  for each row execute function private.votes_deliberations_garde();

-- ============================================================================
-- 2) deliberations : « adoptee » / « rejetee » ne résultent jamais d'une écriture directe
-- ============================================================================
create or replace function private.deliberations_garde_statut()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Échappatoire réservée aux futures RPC SECURITY DEFINER (propriétaire postgres) et aux opérations de maintenance.
  if current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.statut in ('adoptee', 'rejetee') then
      raise exception 'Création directe interdite au statut "%" : une délibération naît "projet", puis est adoptée ou rejetée à l''issue du vote.', new.statut
        using errcode = '55000';
    end if;
    return new;
  end if;

  -- UPDATE : le statut ne change que s'il est modifié
  if new.statut is distinct from old.statut then
    if new.statut in ('adoptee', 'rejetee') then
      raise exception 'Passage direct au statut "%" interdit : il doit résulter d''un processus de vote.', new.statut
        using errcode = '55000';
    end if;
    -- Une délibération déjà tranchée ne revient pas en arrière (sinon ses votes redeviendraient modifiables)
    if old.statut in ('adoptee', 'rejetee') then
      raise exception 'Délibération au statut "%" : statut définitif, retour à "%" interdit.', old.statut, new.statut
        using errcode = '55000';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists trg_deliberations_garde_statut on public.deliberations;
create trigger trg_deliberations_garde_statut
  before insert or update on public.deliberations
  for each row execute function private.deliberations_garde_statut();

-- ============================================================================
-- 3) budgets : immuable une fois voté / approuvé / clôturé
-- ============================================================================
create or replace function private.budgets_garde_immuable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if old.statut in ('vote', 'approuve', 'cloture') then
    raise exception 'Budget % (%) : statut "%" : budget immuable (seule une procédure de transition d''état peut le modifier).',
      old.annee, old.id, old.statut
      using errcode = '55000';
  end if;

  -- Pas de saut d'étape depuis le brouillon : brouillon -> vote uniquement
  if old.statut = 'brouillon'
     and new.statut is distinct from old.statut
     and new.statut is distinct from 'vote' then
    raise exception 'Transition budgétaire interdite : "brouillon" -> "%" (seul "vote" est possible).', new.statut
      using errcode = '55000';
  end if;
  return new;
end
$$;

drop trigger if exists trg_budgets_garde_immuable on public.budgets;
create trigger trg_budgets_garde_immuable
  before update on public.budgets
  for each row execute function private.budgets_garde_immuable();

-- ============================================================================
-- 4) marches : pas de création directe aux statuts avancés, pas de saut d'étape
--    Parcours : preparation -> lance -> evaluation -> attribue -> approuve -> en_cours -> receptionne (annule possible)
-- ============================================================================
create or replace function private.marches_garde_statut()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.statut in ('attribue', 'approuve', 'en_cours') then
      raise exception 'Création directe interdite au statut "%" : un marché est créé en amont (preparation, lance, evaluation).', new.statut
        using errcode = '55000';
    end if;
    return new;
  end if;

  -- UPDATE : on n'entre dans attribue / approuve / en_cours que depuis l'étape immédiatement précédente
  if new.statut is distinct from old.statut then
    if (new.statut = 'attribue' and old.statut is distinct from 'evaluation')
       or (new.statut = 'approuve' and old.statut is distinct from 'attribue')
       or (new.statut = 'en_cours' and old.statut is distinct from 'approuve') then
      raise exception 'Transition de marché interdite : "%" -> "%".', old.statut, new.statut
        using errcode = '55000';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists trg_marches_garde_statut on public.marches;
create trigger trg_marches_garde_statut
  before insert or update on public.marches
  for each row execute function private.marches_garde_statut();
