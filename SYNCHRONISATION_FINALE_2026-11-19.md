# Synchronisation consolidée — 19 novembre 2026

## Périmètre vérifié
L'archive `Fimela_Vision_Mairie_Connectee_complet_2026-11-19.zip` a été extraite et inventoriée : 150 entrées dans l'archive principale, 8 ZIP imbriqués et 28 fichiers SQL distincts après dédoublonnage.

## Réconciliation avec cette branche
- `js/org-e.js` et `js/org-f.js` sont identiques aux fichiers de l'archive (SHA Git blob identiques).
- `index.html` est identique.
- `20261118_org_sa_roles.sql` est identique.
- `js/org.js`, `js/saas.js`, `js/superadmin.js`, `mairie.html`, `saas.html` et `.assetsignore` diffèrent. Ils n'ont pas été remplacés automatiquement : une différence de contenu exige une revue fonctionnelle avant toute substitution. Les correctifs propres à cette branche doivent être préservés.
- Les scripts de patch, fichiers `patched/`, sauvegardes et archives imbriquées restent des sources de traçabilité, pas des fichiers applicatifs à déployer.

## Validation locale reproductible
- 17/17 fichiers `tests/*.test.js` : réussis.
- 4 suites complémentaires (`tests/smoke.js`, `js/smoke.js`, `js/bandeau.test.js`, `sw-csp.test.js`) : réussies.
- 26 fichiers JavaScript dans `js/` : `node --check` réussi.
- `enhance.test.js` : non exécuté localement, dépendance `jsdom` absente. Le workflow CI installe cette dépendance.
- L'ancien doublon `js/org-d.test.js` échoue sur 3 assertions alors que la suite maintenue `tests/org-d.test.js` réussit. Ce doublon est signalé et n'est pas compté dans les 21 suites validées.

Ces tests sont principalement unitaires, simulés ou statiques. Ils ne remplacent pas une recette navigateur réelle ni des tests RLS/RPC contre une base isolée.

## Migrations et production
- Les 28 SQL de l'archive ne constituent pas l'historique canonique des 81 migrations enregistrées dans Supabase.
- Plusieurs scripts portent une date postérieure au 19 novembre 2026.
- Aucun SQL n'a été exécuté, aucune donnée Supabase modifiée, aucun secret changé et aucun déploiement Cloudflare/Supabase effectué.
- Ne pas rejouer ces scripts avant réconciliation des versions, checksums, dépendances et état réel du schéma.

## État GitHub
- PR #1 : https://github.com/callmecmd9-fimela-vision-officiel/mairie-connectee/pull/1
- Branche : `chore/ci-regression-tests`.
- PR maintenue en brouillon ; `main` n'est pas modifiée.
- Détail des constats : `ARCHIVE_RECONCILIATION_2026-11-19.md`.
