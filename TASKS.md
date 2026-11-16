## Fait (correctif actualisation KO)
- CSP connect-src 'self', SW mc-v7 avec auto-test, tests/sw-csp.test.js.
## À vérifier chez l'utilisateur
- Après déploiement : ouvrir /, /mairie, /saas, actualiser 3 fois ; PWA : ouvrir, fermer, rouvrir. Si une PWA reste blanche : la désinstaller/réinstaller une fois.

## Fait (audit 3)
- Numéro de suivi non devinable, commune fermée refusée, droits inutiles retirés, enhance.js (double-envoi, focus, hors-ligne), tests/enhance.test.js.
- Correction : `demandes.citoyen_id` a bien une FK vers auth.users, en ON DELETE SET NULL (la purge des anonymes ne supprime aucune demande).
## À décider (accord requis, non appliqué)
- Index doublon `communes_slug_key` / `communes_slug_uq` : supprimer l'un des deux.
- Fonction « bright-worker » (doublon de saas-admin) : supprimer.
- Périmé : supabase/20261114_super_admin.sql à remplacer par un export de la base ou à retirer du dépôt.
- 33 avertissements « multiple permissive policies » (performance, négligeable à ce volume) : fusionner si une commune grossit.
## À faire (action utilisateur)
- Turnstile : ajouter mairie-connectee.callmecmd9-916.workers.dev aux domaines autorisés.
- saas-admin : secrets ALLOWED_ORIGIN et SITE_URL = https://mairie-connectee.callmecmd9-916.workers.dev (tant qu'ils manquent, la création de mairie répond « Origine refusée »).
- Auth : mots de passe compromis (plan Pro) ; vérifier que les inscriptions publiques par e-mail sont désactivées (comptes créés par l'administration) et que la limite de connexions anonymes est basse.
## Plus tard
- Compteurs serveur si une commune dépasse 10 000 lignes/table (chargement paginé actuel : 10 000 max).
- Login plus rapide : charger d'abord les tables de l'accueil, le reste en arrière-plan (core.js `load`).
- Notifications push (VAPID + edge function) : non faites.
- Pagination core.js : page 0 sans tri par id (ex-aequo possibles au-delà de 1000 lignes, tables sans tri uniquement).

## Fait (audit 2)
- Fuite `communes` corrigée, dépôt de pièces re-testé, SW hors-ligne, CSP, .assetsignore, tests/smoke.js.
## Fait
- Retrait liste communes (citoyen.js) ; soldes de congés ; guard.js CSP ; CSS mobile.
- Edge saas-admin déployée (v1, identique au fichier fourni).
