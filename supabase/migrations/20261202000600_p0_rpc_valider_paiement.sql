-- P0 : validation des paiements en espèces côté serveur (RPC) — audit P0, point 1.
--
-- Problème : la politique ptx_staff_upd (en production) laisse maire, finances, secretariat et agent
-- passer directement un paiement de `en_attente` à `paye` par l'API, sans contrôle de la source.
-- Cette migration ajoute le chemin sûr : public.valider_paiement_especes(p_id, p_motif).
--
-- Règles appliquées par la fonction (SECURITY DEFINER, search_path vide) :
--   * utilisateur authentifié, non anonyme, plateforme hors maintenance ;
--   * rôle exactement `finances` (rôle de comptable du projet ; private.can() n'est volontairement pas utilisé :
--     il laisse passer super_admin, admin de plateforme et adjoints délégués, ce qui ne convient pas ici) ;
--   * le paiement appartient à la commune de l'utilisateur ;
--   * statut actuel `en_attente` ET source `guichet` ;
--   * motif obligatoire (5 à 500 caractères).
-- Piste d'audit : table dédiée public.paiements_validations (auteur, rôle, date, motif, référence, montant)
-- + ligne dans public.audit_log (action 'VALIDER_ESPECES'). Toute condition non remplie lève une exception explicite.
--
-- Le trigger existant trg_ptx_garde continue de s'appliquer : il fige montant/référence/commune et met à jour
-- demandes.statut_paiement lors du passage à `paye`.
--
-- APPLIQUÉE en production le 2026-11-25 (SQL direct, projet fimela-vision-officiel) : étape 1 (table + RPC) puis étape 2
-- (fermeture de la faille), après déploiement de js/taxes.js appelant la RPC. Le fichier est idempotent : le rejouer
-- via `supabase db push` est sans effet. Version inscrite dans l'historique Supabase le 2026-11-25.
-- Version 20261202000600 : placée APRÈS 20261202000500 (dernière version enregistrée) pour ne pas être refusée
-- comme migration « hors ordre ».

-- ============================================================================
-- 1) Table de traçabilité des validations (nouvelle, en ajout seul)
-- ============================================================================
create table if not exists public.paiements_validations(
  id bigint generated always as identity primary key,
  commune_id uuid not null references public.communes(id) on delete cascade,
  -- Pas de clé étrangère sur paiement_id : la preuve de validation doit survivre à une éventuelle suppression du paiement.
  paiement_id uuid not null,
  reference_paiement text,
  montant numeric,
  motif text not null check (char_length(btrim(motif)) between 5 and 500),
  valide_par uuid not null,
  role_valideur text not null,
  valide_le timestamptz not null default now()
);

create index if not exists paiements_validations_commune_idx on public.paiements_validations(commune_id, valide_le desc);
create index if not exists paiements_validations_paiement_idx on public.paiements_validations(paiement_id);

alter table public.paiements_validations enable row level security;

-- Lecture seule pour le personnel financier de la commune ; aucune écriture directe (seule la RPC écrit).
revoke all on public.paiements_validations from anon, authenticated;
grant select on public.paiements_validations to authenticated;

drop policy if exists paiements_validations_lecture on public.paiements_validations;
create policy paiements_validations_lecture on public.paiements_validations for select to authenticated
  using ((select private.my_role()) in ('maire','adjoint','finances') and commune_id = (select private.my_commune()));

drop policy if exists bloque_anonymes_paiements_validations on public.paiements_validations;
create policy bloque_anonymes_paiements_validations on public.paiements_validations as restrictive for all to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
  with check (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

-- ============================================================================
-- 2) RPC de validation
-- ============================================================================
create or replace function public.valider_paiement_especes(p_id uuid, p_motif text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_role text;
  v_commune uuid;
  v_motif text := nullif(btrim(coalesce(p_motif, '')), '');
  v_p public.paiements_taxes%rowtype;
  v_date timestamptz := now();
begin
  -- Identité
  if v_uid is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;
  if coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    raise exception 'Les comptes anonymes ne peuvent pas valider de paiement.' using errcode = '42501';
  end if;
  if not (select private.hors_maintenance()) then
    raise exception 'Plateforme en maintenance : validation impossible pour le moment.' using errcode = '55000';
  end if;

  -- Rôle : uniquement `finances` (my_role() renvoie null pour un compte inactif)
  v_role := (select private.my_role());
  v_commune := (select private.my_commune());
  if v_role is distinct from 'finances' or v_commune is null then
    raise exception 'Accès refusé : seul le rôle « finances » peut valider un paiement en espèces.' using errcode = '42501';
  end if;

  -- Paramètres
  if p_id is null then
    raise exception 'Identifiant de paiement obligatoire.' using errcode = '22023';
  end if;
  if v_motif is null or char_length(v_motif) < 5 or char_length(v_motif) > 500 then
    raise exception 'Motif obligatoire (5 à 500 caractères).' using errcode = '22023';
  end if;

  -- Verrou de ligne : deux validations simultanées ne peuvent pas passer toutes les deux
  select * into v_p from public.paiements_taxes where id = p_id for update;
  -- Même message si le paiement n'existe pas ou appartient à une autre commune (pas d'énumération entre communes)
  if not found or v_p.commune_id is distinct from v_commune then
    raise exception 'Paiement introuvable.' using errcode = 'P0002';
  end if;

  if v_p.statut is distinct from 'en_attente' then
    raise exception 'Validation refusée : le paiement n''est pas en attente (statut actuel : %).', v_p.statut using errcode = '22023';
  end if;
  if v_p.source is distinct from 'guichet' then
    raise exception 'Validation refusée : seul un paiement enregistré au guichet (espèces) peut être validé ici (source : %).', v_p.source using errcode = '22023';
  end if;

  -- quittance_url : même valeur que l'ancien update direct de js/taxes.js (renseignée une seule fois)
  update public.paiements_taxes
     set statut = 'paye', date_paiement = v_date,
         quittance_url = coalesce(quittance_url, '/quittance?ref=' || v_p.reference_paiement)
   where id = p_id and commune_id = v_commune and statut = 'en_attente' and source = 'guichet';
  if not found then
    raise exception 'Validation impossible : le paiement a été modifié entre-temps.' using errcode = '40001';
  end if;

  -- Piste d'audit
  insert into public.paiements_validations(commune_id, paiement_id, reference_paiement, montant, motif, valide_par, role_valideur, valide_le)
  values (v_commune, p_id, v_p.reference_paiement, v_p.montant, v_motif, v_uid, v_role, v_date);

  insert into public.audit_log(commune_id, user_id, action, table_name, row_id)
  values (v_commune, v_uid, 'VALIDER_ESPECES', 'paiements_taxes', p_id);

  return jsonb_build_object(
    'succes', true,
    'id', p_id,
    'reference_paiement', v_p.reference_paiement,
    'statut', 'paye',
    'date_paiement', v_date
  );
end
$$;

comment on function public.valider_paiement_especes(uuid, text) is
  'Valide un paiement en espèces (source guichet, statut en_attente) pour la commune de l''appelant ; rôle finances uniquement ; trace dans paiements_validations et audit_log.';

-- Exécutable uniquement par les utilisateurs connectés (les contrôles de rôle sont dans la fonction)
revoke all on function public.valider_paiement_especes(uuid, text) from public, anon;
grant execute on function public.valider_paiement_especes(uuid, text) to authenticated;

-- ============================================================================
-- 3) ÉTAPE 2 — fermeture de la faille (appliquée après déploiement de js/taxes.js appelant la RPC)
--    js/citoyen.js ne fait que lire paiements_taxes : aucun autre parcours n'écrit directement.
-- ============================================================================
drop policy if exists ptx_staff_upd on public.paiements_taxes;
revoke update on public.paiements_taxes from authenticated;
