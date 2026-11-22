# Audit des droits par rôle — 2026-11-22

Principe : **une seule interface**, chaque poste ne voit que ses modules ; la sécurité réelle est garantie côté base (RLS Supabase), pas par le masquage des menus.

## Résultats (production `aiqegpijisspankpkwfj`, lecture seule)
- 100 % des tables du schéma `public` ont la RLS activée et au moins une politique ; aucune politique permissive `true`.
- Rôle `anon` : accès refusé sur toutes les tables ; seules 12 fonctions publiques du portail citoyen sont exécutables (commune_par_slug, infos_commune, identite_commune, portail_commune, planning_rdv, creneaux_rdv, demarches_commune, actualites, projets_publics, suivre_demande(s), commune_par_hote).
- 163 politiques RESTRICTIVES (isolement par commune, hors maintenance, comptes anonymes exclus) + 146 permissives par rôle : le cloisonnement par commune ne dépend pas des rôles.
- Les 93 fonctions SECURITY DEFINER exécutables par `authenticated` appellent toutes une garde (`_garde`, `pgarde`, `paie_garde`, `org_gest`, `my_role`, `org_droit`…).
- Données sensibles : personnel / rémunérations / congés = maire + RH (+ délégations `org_droit`) ; budget / finances = maire + finances ; journaux d'audit = maire ; accès sensibles = maire / super_admin.

## Écart corrigé
- Le **cabinet** voyait le module « Territoire » dans l'interface alors que `patrimoine` ne l'autorise pas côté serveur : module retiré pour ce rôle (`RP.territoire`). Pour l'autoriser, il faudrait élargir la politique SELECT de `patrimoine` (décision métier).

## Points à traiter côté tableau de bord Supabase (non modifiables par SQL)
- Activer « Leaked password protection » (Auth > Providers > Email).
- 3 comptes anonymes existent (`auth.users.is_anonymous`) : aucune politique ne leur donne de droits métier (garde RESTRICTIVE `is_anonymous`), mais l'option « Allow anonymous sign-ins » peut être désactivée si le portail n'en a pas besoin.

## Observations
- « Rapports » : l'interface l'ouvre aussi au cabinet et aux finances, mais la table `rapports` (rapports enregistrés) est réservée au maire : ces rôles voient les statistiques, pas les rapports archivés.
- Aucun compte cabinet / technique / agent en base : ces postes n'ont pas été testés avec des données réelles.
