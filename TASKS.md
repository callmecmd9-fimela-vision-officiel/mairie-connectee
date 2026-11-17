## Fait (2026-11-16 — porte d'entrée citoyenne)
- Lien/QR par commune, mémorisation, manifest par commune, blason/couleur/slogan, hors-ligne, panneau « Lien citoyen » (Administration). Voir CHANGELOG.md.
- Sécurité base : droits anon retirés sur 12 tables, policy citoyens_own optimisée. Advisors sécurité : seuls restent les avertissements voulus (RPC publiques, connexions anonymes) + mots de passe compromis (plan Pro).
## À faire — action utilisateur
- Copier dans le dépôt : `citoyen.js`, `demarches.js`, `manifest-citoyen.webmanifest`, **`qr.js` dans /js/** ; lancer `node patch-core.js js/core.js` ; déployer ; vider le cache/réinstaller la PWA une fois.
- `_headers` (non fourni) : vérifier `manifest-src 'self' blob:` et `img-src` incluant `https://aiqegpijisspankpkwfj.supabase.co`.
- Espace mairie > Administration > Lien citoyen : choisir la couleur, publier le blason, imprimer l'affiche QR (par commune).
- Turnstile : ajouter mairie-connectee.callmecmd9-916.workers.dev aux domaines autorisés.
- saas-admin : secrets ALLOWED_ORIGIN et SITE_URL = https://mairie-connectee.callmecmd9-916.workers.dev.
- Sous-domaine par commune : DNS wildcard + route Cloudflare (la base résout déjà `sous_domaine`/`domaine_perso`).
- Auth : mots de passe compromis (plan Pro) ; inscriptions e-mail publiques désactivées ; limite de connexions anonymes basse.
## À décider (accord requis, non appliqué)
- Index doublon `communes_slug_key` / `communes_slug_uq` : supprimer l'un des deux.
- Fonction « bright-worker » (doublon de saas-admin) : supprimer.
- supabase/20261114_super_admin.sql périmé : remplacer par un export ou retirer.
- 33 « multiple permissive policies » : fusionner si une commune grossit.
## Plus tard
- Icônes PNG 192/512 générées par commune (le blason publié est en webp, non « maskable »).
- Chargement `load()` en deux temps ; compteurs serveur > 10 000 lignes/table ; notifications push ; pagination page 0 sans tri par id.
## Fait (audits précédents)
- Audit 3 : numéro de suivi non devinable, commune fermée refusée, droits retirés, enhance.js, citoyen_id FK ON DELETE SET NULL.
- Audit 2 : fuite `communes`, pièces, SW hors-ligne, CSP, .assetsignore. Correctif actualisation KO (SW mc-v9).

## Lot 3 fait (navigation et catégories)
- À copier : `citoyen.js`, `tests/citoyen-nav.test.js`.
- Reste lot 5 : formulaires d'état civil (n° d'acte + année + nom, ou téléversement), statuts « acceptée » et « prêt à retirer » (migration SQL + libellés + notifications).
- Reste lot 6 : table `rdv_demandes` validée par le personnel ; page Suivi avec explication simple de chaque statut.
- Reste : la mairie doit saisir ses vraies démarches (Citoyens > Démarches) ; wolof/sereer : textes à fournir et valider.

## Lot 5 fait (extrait d'acte guidé, statuts retrait)
- À copier : `citoyen.js`, `core.js`, `actions.js`, `20261120_lot5_statuts_retrait.sql` (déjà en base), `tests/*`. Vider le cache/PWA une fois.
- Reste lot 6 : table `rdv_demandes` validée par le personnel + écran Rendez-vous citoyen (`creer_demande` refuse encore les types « Rendez-vous avec le Maire / Signalement / Autre demande » alors que la contrainte les autorise).
- Reste : SMS (fournisseur non choisi : connexion par téléphone indisponible, le dépôt sans compte reste actif) ; la mairie doit saisir ses démarches (Citoyens > Démarches).

## Lot 6 fait (rendez-vous)
- À faire : appliquer `20261121_lot6_rdv.sql` (Supabase), copier `citoyen.js`, `demarches.js`, `index.html`, `tests/citoyen-rdv.test.js` ; déployer ; vider le cache/PWA.
- À tester en vrai : isolation commune/commune et citoyen/citoyen sur `rdv_demandes`/`mes_rdvs` (non exécutable ici).
- Reste lot 7 (actualités, infos pratiques, accessibilité), lot 8 (tests/sécurité/doc). SMS : fournisseur non choisi.

## Lot 6 bis fait (créneaux + annulation)
- À faire : appliquer `20261122_lot6bis_creneaux.sql` (Supabase, après le lot 6) ; copier `citoyen.js`, `demarches.js`, `index.html`, `mairie.html`, `tests/*` ; déployer ; vider le cache/PWA.
- À vérifier en vrai : (1) colonnes de la table `notifications` (la notification d'annulation au personnel est protégée par un bloc d'exception : si le format diffère, l'annulation marche mais sans notification) ; (2) isolation commune/commune et citoyen/citoyen sur `creneaux_rdv`, `annuler_rdv`, `rdv_planning` ; (3) la migration échoue si des doublons « confirmé » existent déjà (index unique).
- Reste lot 7 (actualités, infos pratiques, accessibilité), lot 8 (tests/sécurité/doc). SMS : fournisseur non choisi.

## Lot 7 / 8 — à faire
- Appliquer `20261123_lot7_infos.sql` ; copier citoyen.js, core.js, actions.js, index.html ; tests ; déployer ; vider cache/PWA.
- Lancer `isolation_test.sql` dans Supabase : doit afficher « ISOLATION OK ».
- Supprimer `core_patched.js` (obsolète). Vérifier le nom `.assetsignore` (sans espace ni underscore).
- Publier les projets à afficher : espace mairie > Projets > « Visible citoyens ».
- Reste : fournisseur SMS ; saisie des vraies démarches ; wolof/sereer (textes à valider) ; installer jsdom pour `enhance.test.js`.

## Lots catalogue — à faire
- Appliquer `20261124_catalogue.sql` puis `isolation_catalogue.sql` ; déployer citoyen.js, demarches.js, index.html, mairie.html ; vider cache/PWA.
- Fimela : valider juridiquement puis activer les 24 prestations inactives ; saisir pièces, frais, délais, retrait.
- Tester sur Android réel (dialogue, clavier, défilement).
