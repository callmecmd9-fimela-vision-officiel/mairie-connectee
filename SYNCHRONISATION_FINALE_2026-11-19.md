# Synchronisation consolidée — 19 novembre 2026

> **Mise à jour 2026-11-19 (après nettoyage)** : les scripts `patch-*.js`, les variantes `patched/` et les copies racine périmées de `core.js`, `citoyen.js`, etc. ne sont plus conservés dans l'arbre de travail (commits `57a9265`, `ccf33b3`, retrouvables via git). Le fichier racine `20261118_org_sa_roles.sql` a été retiré : sa version de référence est `supabase/migrations/20261118230324_20261118_org_sa_roles.sql`. Les modules des lots E/F sont présents sur la branche `chore/ci-regression-tests` (PR #1), et `enhance.test.js` passe en CI avec jsdom. Le build Cloudflare est corrigé par l'ajout de `"previews": {}` à `wrangler.jsonc` (commit `5445064`).


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


## 7. Contrats interface / Edge Functions — correctifs du 19 novembre
La revue des fichiers divergents a mis en évidence des incompatibilités réelles entre les commandes émises par les interfaces et les actions effectivement acceptées par les Edge Functions versionnées.

### Administration SaaS — création d'une mairie
- L'interface demandait et générait un mot de passe temporaire, puis envoyait un champ `password`.
- `saas-admin` ignore ce champ et utilise `inviteUserByEmail`, puis crée le profil inactif.
- L'interface annonçait donc un mot de passe qui n'était ni créé ni transmis.
- Correction : suppression du faux champ mot de passe ; libellé et confirmation alignés sur l'invitation e-mail et le compte inactif.
- Cache de `saas.js` versionné ; test `tests/saas-invitation.test.js`.

### Administration mairie — comptes utilisateurs
- L'interface envoyait `action: "creer"` avec un mot de passe ; `sa-admin` accepte `action: "inviter"` et crée un compte inactif via invitation.
- L'interface envoyait un mot de passe en clair pour `reinit_mdp` ; la fonction exige `captchaToken` et déclenche un e-mail de réinitialisation.
- L'interface proposait une suppression que le serveur refuse explicitement afin de préserver l'historique.
- Corrections : invitation sans mot de passe, réinitialisation par e-mail avec Turnstile, retrait du bouton de suppression non supporté.
- Cache de `superadmin.js` versionné ; test `tests/superadmin-edge-contract.test.js`.

### Validation
- Workflow GitHub #78 : succès sur le commit `1dda47b65bcd7aecd9ca5ff6cd6ce93126012311`.
- Suite de tests JavaScript : succès.
- Vérification Deno des six Edge Functions : succès.
- Aucun changement de source Edge Function déployée, aucune migration et aucun déploiement.


## 8. Chargement des droits de poste — pagination et échec fermé
- Le chargement des droits `org_role_droits` ne lisait auparavant qu'un maximum de 2 000 lignes.
- La fonction `orgMine()` utilise maintenant une pagination par blocs de 1 000, vérifie les erreurs de lecture des affectations, postes et droits, et n'expose aucun droit si le chargement échoue ou dépasse la borne de sécurité.
- La logique de délégations reçues du module Lot D reste inchangée.
- Test ajouté : `tests/org-permissions-loader.test.js` (pagination multi-pages, erreur de lecture, absence d'affectation).
- Workflow GitHub #81 : succès sur le commit `6832b03788c5dc5ccfb4ff9cd8811b97f52c07e4` ; suite JavaScript et contrôle Deno réussis.
