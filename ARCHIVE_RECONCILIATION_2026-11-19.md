# Réconciliation de l'archive complète — 19 novembre 2026

## 1. Inventaire
Archive analysée : `Fimela_Vision_Mairie_Connectee_complet_2026-11-19.zip`.

- 150 entrées dans l'archive principale.
- 8 archives ZIP imbriquées.
- 28 fichiers SQL distincts après dédoublonnage des archives imbriquées.
- Présence de sources applicatives, tests, documentation, patches historiques et scripts SQL de plusieurs lots.

## 2. Comparaison avec `chore/ci-regression-tests`

| Fichier | Résultat de comparaison |
|---|---|
| `js/org-e.js` | Identique (SHA Git blob) |
| `js/org-f.js` | Identique (SHA Git blob) |
| `index.html` | Identique (SHA Git blob) |
| `20261118_org_sa_roles.sql` | Identique (SHA Git blob) |
| `js/org.js` | Différent |
| `js/saas.js` | Différent |
| `js/superadmin.js` | Différent |
| `mairie.html` | Différent |
| `saas.html` | Différent |
| `.assetsignore` | Différent |

Les fichiers différents n'ont pas été écrasés. Les noms identiques ne garantissent pas une équivalence fonctionnelle ; chaque divergence doit être examinée avant substitution. Les versions déjà présentes dans la branche sont conservées afin de ne pas perdre les correctifs de sécurité, d'authentification, de permissions et de déploiement.

Les ZIP imbriqués, sauvegardes, scripts `patch-*.js` et variantes `patched/` sont conservés comme éléments de traçabilité. Ils ne sont pas ajoutés en bloc aux assets applicatifs.

## 3. Résultats de tests sur l'extraction de l'archive

Environnement local : Node.js v22.16.0.

- 17/17 fichiers `tests/*.test.js` : succès.
- `tests/smoke.js` : succès.
- `js/smoke.js` : succès.
- `js/bandeau.test.js` : succès.
- `sw-csp.test.js` : succès.
- 26 fichiers JavaScript dans `js/` : `node --check` sans erreur.
- `enhance.test.js` : non exécuté localement, car `jsdom` n'est pas installé dans l'environnement d'extraction. Le workflow CI installe cette dépendance.

### Anomalie de test héritée
Le fichier parallèle `js/org-d.test.js` échoue sur 3 assertions dans son ancien banc de test. La suite maintenue `tests/org-d.test.js` passe. Ne pas supprimer ni modifier le test hérité sans comparer son scénario à la suite maintenue ; il est signalé comme dette de test et n'est pas inclus dans les 21 suites réussies ci-dessus.

## 4. Migrations SQL : blocage maintenu
L'archive fournit 28 fichiers SQL distincts, pas les 81 sources canoniques correspondant à l'historique enregistré par Supabase. Certains fichiers sont datés après le 19 novembre 2026.

Conséquences :
- aucune exécution automatique ;
- aucun renommage destiné à faire correspondre artificiellement l'historique ;
- aucun remplacement de migration ;
- aucune modification de schéma de production.

Avant toute migration, il faut récupérer les sources historiques manquantes, rapprocher chaque version enregistrée de son fichier et de son checksum, puis comparer le schéma réel et les dépendances.

## 5. Limites de validation
Les suites exécutées sont unitaires, simulées ou statiques. Elles ne constituent pas une preuve de bon fonctionnement en navigateur réel, ni une validation RLS/RPC en environnement Supabase isolé, ni une recette multi-communes.

## 6. Actions réalisées et non réalisées
**Réalisé :** extraction, inventaire, comparaison de références, exécution des tests et contrôle syntaxique.

**Non réalisé :** remplacement en masse de fichiers, exécution SQL, changement de données ou secrets Supabase, déploiement Cloudflare/Supabase, fusion dans `main`.

La PR #1 reste en brouillon sur `chore/ci-regression-tests`.


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
