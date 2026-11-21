# Guide de reprise — nouvelle session Claude

## Contexte en 10 lignes
Projet « Mairie Connectée » (Fimela Vision) : PWA multi-communes, JS vanilla sans build, Cloudflare Workers (assets) + Supabase (Free). Interfaces : `/` citoyens, `/mairie` personnel (+ Super Admin), `/saas` plateforme (MFA). Projet Supabase de production : `aiqegpijisspankpkwfj`.
Règles de l'utilisateur : français, réponses courtes ; **jamais** d'écriture, migration ou déploiement en production sans accord explicite ; **jamais** de test d'expérimentation en production (même transaction annulée) ; Diofior pour les tests, jamais Fimela ; ne rien supprimer sans accord ; livrer les fichiers modifiés avec leur chemin ; tenir CHANGELOG, DECISIONS, TASKS à jour.

## Où en est-on (2026-11-20, après reprise)
Séparation des rôles **codée, testée statiquement, en SQL sur PostgreSQL jetable (59/59) et en navigateur (53/53)** — sur schéma simulé et Edge émulée (voir `docs/ROLES_ET_PERMISSIONS.md` §7 et D-R11). **Rien n'est appliqué en production.** Voir aussi `AUDIT_ROLES_2026-11-20.md`, `DECISIONS.md` (D-R1…D-R12), `TASKS.md`, `test-results/RESULTATS_TESTS_2026-11-20_REPRISE.txt`.

## Premières actions
1. `for t in tests/*.test.js js/*.test.js js/smoke.js; do node $t; done` — attendu tout PASS (`enhance.test.js` exige `jsdom` : `npm i jsdom`).
2. Tests base + navigateur (base JETABLE) : `bash tests/browser/run.sh` (PG* en variables ; Docker `postgres:17` ou cluster local, cf. en-tête du script ; `npm i pg playwright`).
3. Restant avant mise en production : répétition de `20261120100000` sur un **clone du schéma réel** (les 85 migrations ne se rejouent pas depuis zéro), test des Edge Functions `sa-admin`/`saas-admin` en staging, puis **accord explicite** de l'utilisateur et ordre de `docs/ROLES_ET_PERMISSIONS.md` §5.

## Carte des fichiers touchés
SQL `supabase/migrations/20261120100000_*` · Edge `supabase/functions/sa-admin`, `saas-admin` · Front `js/core.js`, `js/org.js` (+`orgCan`, onglets, bouton Modifier réservé admin), `js/org-f.js`, `js/superadmin.js` (panneau *Administrateurs municipaux*), `mairie.html` (`?v=20261120.1`, `org.js?v=20261120.2`) · Tests `tests/roles-admin-mairie.test.js`, `tests/postgres/roles-admin-mairie-integration.sh`, `tests/browser/*`.
Contraintes de tests : `tests/migration-history-integrity.test.js` liste explicitement les migrations en attente (3) ; `saas-invitation` et `superadmin-edge-contract` fixent les versions `?v=` de core/secretariat/actions ; tout nouveau fichier SQL de migration doit être déclaré dans le premier.

## État de production (lecture seule, 2026-11-20 — à revérifier)
Communes : `commune-de-diofior`, `fimela`. Comptes `admindiofior@`, `adminjoal@`, `adminfatick@`, `admindjirnda@gmail.com` : Auth existants, confirmés, rôle `citoyen`, sans commune. 81 migrations appliquées (dernière `20261118230324`) ; 3 en attente : `20261119070000`, `20261119090000`, `20261120100000`.

## À ne pas faire
Rejouer `supabase/20261114_super_admin.sql` (périmé) · supprimer données/fonctions/policies sans accord · désigner automatiquement le maire de Diofior comme admin principal · créer/modifier des mots de passe · déployer sans accord.

## Session 2026-11-21 (MAJ3)
- Appliquées en production : security_null_mfa_guards, ia_usage_atomic_reservations (historique cohérent). Non appliquées : 20261120100000 (répétition requise) et suppression de l index doublon communes_slug_uq (proposée dans supabase/proposed/, accord requis). bright-worker : inerte, suppression soumise à accord.
- Edge Functions déployées = sources du dépôt (saas-admin v3, sa-admin v15, admin-comptes v10, bright-worker v4, purge-pieces v2, ia-texte v9).
- Décision : toute suppression de ressource et toute migration fonctionnelle de production restent soumises à autorisation explicite ; ZIP de référence : SAAS_MUNICIPAL_MAJ4.zip.

## Session 2026-11-21 (MAJ5)
Base : sauvegarde MAJ4 (MAJ5.zip non reçu). Ajouts : `js/icons.js`, `js/i18n.js`, `icon-defaut-*`, `push-send`, `sms-dispatch`, `supabase/proposed/20261121_{push_notifications,sms_outbox}.sql`, docs PUSH/SMS/I18N, tests `pwa-icons-push`, `sms-architecture`, `i18n`. Suite : `for t in tests/*.test.js js/*.test.js js/smoke.js; do node $t; done` (enhance : `npm i jsdom`). ZIP de référence : SAAS_MUNICIPAL_MAJ5.zip.

## Session 2026-11-21 (MAJ6)
Base : MAJ5.zip. Production en lecture seule. Voir CHANGELOG « MAJ6 », `supabase/PRODUCTION_VERSION_MAP.md`, `test-results/RESULTATS_TESTS_2026-11-21_MAJ6.txt`. Suite complète : `for t in tests/*.test.js js/*.test.js js/smoke.js; do node $t; done` (npm i jsdom) ; PostgreSQL jetable : `tests/postgres/{roles-admin-mairie,org-role-droit-set,notifications-sms,org-kpi}-integration.sh` ; navigateur : `tests/browser/run.sh`. ZIP de référence : SAAS_MUNICIPAL_MAJ6.zip.
