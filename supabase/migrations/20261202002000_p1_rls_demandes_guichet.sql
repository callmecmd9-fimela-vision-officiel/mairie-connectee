-- P1 Guichet : lecture des demandes de toute la commune pour finances, secretariat, agent et maire — APPLIQUÉE en production (2026-11-26).
-- Constat (catalogue de production du 2026-11-19, policies de public.demandes) :
--   * demandes_personnel  PERMISSIVE ALL  to authenticated : private.can(maire, adjoint, cabinet, secretariat, agent, etat_civil, technique, finances, rh)
--       AND commune = private.my_commune() (ou super_admin)
--       AND ( rôle in (maire, adjoint, cabinet, secretariat, agent, super_admin) OR demandes.service = rôle OR (rôle = etat_civil AND type = 'État civil') ).
--     => `finances` ne voit que les demandes dont service = 'finances' : la Caisse (statut a_payer) lui est vide.
--        maire / secretariat / agent voient déjà toutes les demandes de leur commune ; ils sont repris ici pour que la règle « guichet » soit explicite et durable.
--   * demandes_citoyen (SELECT, citoyen_id = auth.uid()) ; RESTRICTIVE : isolation_commune, bloque_anonymes_demandes, maintenance_serveur.
-- demandes_personnel n'est ni supprimée ni modifiée. Les politiques PERMISSIVE se combinent en OR ; les RESTRICTIVE (commune, anonymes, maintenance)
-- s'appliquent en AND et sont compatibles avec ce SELECT (même commune, utilisateur non anonyme, hors maintenance) : aucune ne le bloque.
-- Écriture inchangée : cette politique est SELECT uniquement (l'encaissement et le retrait passent par les RPC SECURITY DEFINER).
-- Condition de commune : private.my_commune() (profiles.commune_id de auth.uid(), SECURITY DEFINER) au lieu d'un sous-select direct sur profiles,
-- pour éviter toute récursion de RLS ; même convention que les autres politiques du dépôt.
-- Idempotente : peut être rejouée sans erreur.

drop policy if exists demandes_guichet on public.demandes;
create policy demandes_guichet on public.demandes
  for select to authenticated
  using (
    (select private.my_role()) in ('finances', 'secretariat', 'agent', 'maire')
    and commune_id = (select private.my_commune())
  );

-- Contrôle après application (à lancer en SQL) :
--   select polname, polcmd, polpermissive from pg_policy where polrelid = 'public.demandes'::regclass order by 1;
--   -- attendu : demandes_guichet (r, permissive) ; demandes_personnel (*) inchangée.
-- NB : aucune politique n'est posée sur demande_historique (déjà couverte par hist_lecture) ; demandes_historique n'existe pas.
