# Rapport d'audit final — rôles et permissions (2026-11-20)

## Périmètre et méthode
Audit du dépôt (84 fichiers de migrations, 6 Edge Functions, interfaces JS), du catalogue de production du 2026-11-19 et, en **lecture seule (SELECT)**, de l'état réel de la production (communes, comptes cibles, version de migrations). Aucune écriture, aucune migration, aucun déploiement, aucun test dans la production.

## État de production constaté (2026-11-20)
- 2 communes seulement : `commune-de-diofior` (admin principal actuel = compte `maire`) et `fimela`. **Joal, Fatick, Djirnda n'existent pas.**
- Comptes `admindiofior@`, `adminjoal@`, `adminfatick@`, `admindjirnda@gmail.com` : existent dans Auth, e-mail confirmé, rôle `citoyen`, sans commune, aucun admin plateforme.
- 81 migrations appliquées (dernière `20261118230324`) ; `20261119070000` et `20261119090000` du dépôt **non appliquées**.
- Contrainte `profiles_role_check` : 11 rôles, sans `admin_mairie`.

## Constats
| # | Constat | Gravité | Traitement |
|---|---|---|---|
| 1 | Pas de rôle `admin_mairie` : l'admin municipal = `maire` (tous droits, `org_gest`, `org_droit_propre`=true, `saas_creer_commune` créait un `maire`) | Élevée (hiérarchie non conforme) | Rôle + séparation (migration proposée) |
| 2 | Une fois `admin_mairie` créé, `lier_adjoint` pouvait l'écraser | Élevée | Cible `admin_mairie` interdite |
| 3 | Un admin pouvait s'affecter un poste / recevoir ou déléguer `org.*` → auto-élévation | Élevée | Triggers `garde_org_*` |
| 4 | Pas de garde sur auto-modification de rôle/commune dans `profiles` (protégé seulement par RLS) | Moyenne (défense en profondeur) | Trigger `garde_profil_roles` |
| 5 | `saas-admin` supprimait le compte Auth en cas d'échec de création de commune → dangereux pour un compte existant | Élevée pour la réutilisation de comptes | Suppression seulement si le compte vient d'être invité |
| 6 | Dossier `docs/` (catalogue de schéma de production) servi comme asset public par wrangler | Moyenne | `docs/` et `.env.example` ajoutés à `.assetsignore` |
| 7 | `profiles`: politique `isolation_commune` vérifiée **restrictive** → écriture limitée au Super Admin ; pas de fuite | — (OK) | Aucun |
| 8 | Journalisation des changements de rôle partielle | Faible | `profil_role_change` + `platform_audit` |
Non traité (hors périmètre) : fonction doublon `bright-worker`, index doublon `communes_slug`, secrets Turnstile/ALLOWED_ORIGIN (voir TASKS).

## Corrections livrées (dans le ZIP, non déployées)
Migration `20261120100000_roles_admin_mairie_separation.sql` ; Edge Functions `sa-admin`, `saas-admin` ; `js/core.js`, `js/org.js`, `js/org-f.js`, `js/superadmin.js`, `mairie.html` ; `.assetsignore`, `.env.example` ; tests et documentation (voir CHANGELOG).

## Tests
| Test | Résultat |
|---|---|
| 27 tests Node existants + nouveau `roles-admin-mairie.test.js` (46 contrôles statiques/front) | **PASS** (voir `test-results/RESULTATS_TESTS_2026-11-20.txt`) |
| `tests/enhance.test.js` | **ÉCHEC préexistant** : module `jsdom` absent hors CI |
| Syntaxe TypeScript des 2 Edge Functions | OK (transpilation ; pas d'exécution Deno) |
| **`tests/postgres/roles-admin-mairie-integration.sh`** (59 assertions : statuts, escalades, isolation A/B, RLS, journal) | **PASS 59/59** (reprise 2026-11-20, PostgreSQL 16.15 jetable, 2 lancements consécutifs ; schéma simulé par stubs, voir D-R11) |
| Test navigateur (Chromium/Playwright) Super Admin + `admin_mairie`/maire/agent : `bash tests/browser/run.sh` | **PASS 53/53** (reprise 2026-11-20 ; SQL réel sur base jetable, Edge `sa-admin` émulée ; contrôle par mutation : 5 échecs détectés quand l'isolation est cassée) |
| Les quatre communes | Non testables : Joal/Fatick/Djirnda n'existent pas ; isolation testée par scénario A/B (script Postgres exécuté + test navigateur) |

## Risques résiduels
1. La migration SQL a été exécutée **uniquement sur schéma simulé (stubs)** : 59/59 assertions OK, mais jamais sur le vrai schéma de production (les 85 migrations ne se rejouent pas depuis zéro : le socle de tables n'est pas versionné, voir `docs/database/SCHEMA_RECONSTRUCTION_RUNBOOK.md`). Une répétition sur un clone du schéma de production reste à faire avant application.
2. Le maire perd l'écriture `org` dès la migration ; sans `admin_mairie` actif, seul le Super Admin administre l'organigramme (Diofior inclus).
3. Les gardes ne s'appliquent qu'aux nouvelles écritures : d'éventuels droits `org.*` déjà accordés à des postes subsistent (requête de contrôle dans TASKS).
4. Le script Postgres simule le schéma Supabase par des stubs : il valide la logique, pas la parité exacte avec la production (à compléter par une répétition sur copie de schéma avec `docs/database/SCHEMA_RECONSTRUCTION_RUNBOOK.md`).
5. `admin_principal` reste utilisé par `reinit_mdp_admin` ; non modifié pour Diofior (décision D-R7).
6. Dépendance d'ordre : `20261119070000` (en attente) redéfinit `lier_adjoint`, que la nouvelle migration redéfinit ensuite — appliquer dans l'ordre.
