# Correspondance dépôt ↔ historique de production (relevé en lecture seule le 2026-11-22, projet aiqegpijisspankpkwfj)
Toutes les migrations du dépôt sont **appliquées en production** (le ZIP MAJ16 les croyait en attente). Ne rien rejouer.

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

Les instructions des migrations appliquées ont été compactées par l'outil d'application (tailles différentes) : ne pas comparer octet par octet.

## Edge Functions en production (relevé 2026-11-22)
admin-comptes v10, bright-worker v4 (inerte, conservé), ia-texte v9, purge-pieces v2 (`verify_jwt=false`, secret vérifié par RPC), **sa-admin v16**, **saas-admin v4**. `push-send` et `sms-dispatch` : non déployées. Les sources du dépôt de `sa-admin` et `saas-admin` portent les mêmes marqueurs fonctionnels que les versions déployées (admin_mairie, `affecter_admin_mairie`, `saas_preparer_admin_mairie`, `org_sync_user_affectations`).
