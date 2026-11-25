# Correspondance dépôt ↔ historique de production (relevé en lecture seule le 2026-11-22, projet aiqegpijisspankpkwfj)
Les migrations du dépôt sont **appliquées en production** (le ZIP MAJ16 les croyait en attente), à l'exception de la ligne marquée « PROPOSÉE » en bas du tableau (relevé complété le 2026-11-25). Ne rien rejouer.

| Fichier du dépôt | Version en production | État |
|---|---|---|
| 20261119070000_security_null_mfa_guards.sql | 20261120225404 (+ 20261121054301, même nom) | appliquée |
| 20261119090000_ia_usage_atomic_reservations.sql | 20261120225413 | appliquée |
| proposed/20261121_drop_duplicate_communes_slug_index.sql | 20261121070621 | appliquée |
| 20261120100000_roles_admin_mairie_separation.sql | 20261121071218 | appliquée |
| 20261121090000_org_role_droit_set_admin_mairie.sql | 20261121075006 | appliquée |
| 20261121091000_org_kpi_v2.sql | 20261121075015 | appliquée |
| 20261121100000_saas_modifier_commune.sql | 20261121102045 | appliquée |
| 20261121110000_saas_archiver_supprimer_commune.sql | 20261121111607 | appliquée |
| 20261121120000_admin_mairie_perimetre.sql | 20261121191340 | appliquée |
| 20261121130228_org_modele_toutes_mairies.sql | 20261121130228 | appliquée (récupérée de la production le 2026-11-22, absente du ZIP MAJ16) |
| 20261121130836_nettoyage_doublon_trigger_org_seed.sql | 20261121130836 | appliquée (idem) |
| proposed/20261121_push_notifications.sql | 20261121130610 | appliquée (code d'envoi non déployé : `push-send` absent) |
| proposed/20261121_sms_outbox.sql | 20261121130621 | appliquée (SMS inactifs par commune) |
| proposed/20261121_sms_triggers.sql | 20261121130628 | appliquée |
| 20261122081303_perf_fk_indexes_et_initplan_restrictives.sql | 20261122081303 | **appliquée le 2026-11-22** (7 index de clés étrangères, 2 policies RESTRICTIVE en `(select auth.jwt())`) |
| 20261123090000_politique_mot_de_passe_30_jours.sql | 20261122214824 | **appliquée le 2026-11-22** après test en transaction annulée (17 comptes suivis, RLS active, `anon` sans accès ; `js/mdp-policy.js` à déployer pour activer l'alerte) |
| 20261123120000_admin_mairie_actif_vers_admin_commune.sql | 20261123084211 | **appliquée le 2026-11-23** (déclencheur : admin_mairie activé avec commune → super_admin de sa commune ; testé en transaction annulée) |
| proposed/20261123_agent_photo_badge.sql | 20261123125215 | **appliquée le 2026-11-23** (colonne `personnel.photo`, bucket privé `agents-photos` + 4 politiques, RPC `org_sa_agent_photo_set`, `org_sa_organigramme` expose la photo ; vérifiée : `anon` sans accès) |
| 20261202000000_communes_geo.sql | 20261202000000 | **appliquée** (objets vérifiés en lecture seule le 2026-11-25 : colonnes géographiques, `communes_geo_chk` ; 5 communes sur 6 renseignées) ; inscrite a posteriori dans l'historique |
| 20261202000100_lot9_budget.sql | 20261202000100 | **appliquée** (tables `budgets`, `budget_lignes`, `engagements`, RLS et politiques vérifiées) ; inscrite a posteriori |
| 20261202000200_lot10_marches.sql | 20261202000200 | **appliquée** (`plan_passation`, `marches_avenants`, `ordres_service`, colonnes `marches.plan_id/reference/type_marche`) ; inscrite a posteriori |
| 20261202000300_lot11_gouvernance.sql | 20261202000300 | **appliquée** (`votes_deliberations`, statuts conseillers/présences, trigger `sync_statut_presence`) ; inscrite a posteriori |
| 20261202000400_lot12_patrimoine.sql | 20261202000400 | **appliquée** (`patrimoine_biens`, `patrimoine_entretiens`, `patrimoine_inventaires`) ; inscrite a posteriori |
| 20261202000500_lot13_services_territoriaux.sql | 20261202000500 | **appliquée** (`territoire_infrastructures`, `territoire_actions`) ; inscrite a posteriori |
| 20261202000600_p0_rpc_valider_paiement.sql | — | **appliquée le 2026-11-25 en SQL direct** (RPC `valider_paiement_especes` + table `paiements_validations` + étape 2 : politique `ptx_staff_upd` supprimée et droit UPDATE direct retiré à `authenticated`). Version non encore inscrite dans l'historique : `supabase migration repair --status applied 20261202000600`. |
| 20261202000700_p0_rls_paiements.sql | — | **appliquée le 2026-11-25 en SQL direct** (garde-fou : politique restrictive `ptx_update_interdit_api`, retrait des droits UPDATE niveau colonne, contrôle final). Version non inscrite dans l'historique : `supabase migration repair --status applied 20261202000700`. |

Les instructions des migrations appliquées ont été compactées par l'outil d'application (tailles différentes) : ne pas comparer octet par octet.

## Edge Functions en production (relevé 2026-11-22)
admin-comptes v10, bright-worker v4 (inerte, conservé), ia-texte v9, purge-pieces v2 (`verify_jwt=false`, secret vérifié par RPC), **sa-admin v17** (activation : e-mail confirmé par le super admin), **saas-admin v4**. `push-send` et `sms-dispatch` : non déployées. Les sources du dépôt de `sa-admin` et `saas-admin` portent les mêmes marqueurs fonctionnels que les versions déployées (admin_mairie, `affecter_admin_mairie`, `saas_preparer_admin_mairie`, `org_sync_user_affectations`).
