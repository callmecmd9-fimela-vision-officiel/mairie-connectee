# Correspondance dépôt ↔ historique de production (relevé en lecture seule, 2026-11-21)
| Fichier du dépôt | Version en production | État |
|---|---|---|
| 20261119070000_security_null_mfa_guards.sql | 20261120225404 (+ 20261121054301, même nom) | appliquée |
| 20261119090000_ia_usage_atomic_reservations.sql | 20261120225413 | appliquée |
| proposed/20261121_drop_duplicate_communes_slug_index.sql | 20261121070621 | appliquée |
| 20261120100000_roles_admin_mairie_separation.sql | 20261121071218 | appliquée |
| 20261121090000_org_role_droit_set_admin_mairie.sql | — | **à appliquer** (accord requis) |
| 20261121091000_org_kpi_v2.sql | — | **à appliquer** (accord requis) |
| 20261121100000_saas_modifier_commune.sql | saas_modifier_commune (2026-11-21) | **appliquée** le 2026-11-21 (accord reçu) |
| 20261121110000_saas_archiver_supprimer_commune.sql | — | **à appliquer** (accord requis) |
| proposed/20261121_push_notifications.sql, _sms_outbox.sql, _sms_triggers.sql | — | staging puis accord |
Les instructions des migrations appliquées ont été compactées par l'outil d'application (tailles différentes) : ne pas comparer octet par octet. Ne rejouer aucune ligne « appliquée ».
Ordre d'application restant : 20261121090000 → 20261121091000.
Fichiers prêts à appliquer : `supabase/production-ready/01…05` (même ordre ; 01–02 = migrations/, 03–05 = proposed/). Commandes : `DEPLOIEMENT_COMMANDES.md`.
