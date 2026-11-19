# SETUP

> **Mise à jour 2026-11-19** : les scripts SQL numérotés de la racine (`20261114_…` à `20261127_…`), `patch-org.js`, `patch-orgd.js`, `js/patch-core.js`, `js/patch-lot4.js`, `js/lot4.block.js`, `js/core_patched.js` et `patched/` ont été retirés du dépôt (commits `57a9265`, `ccf33b3` ; ils restent consultables dans l'historique git). Les migrations de référence sont dans `supabase/migrations/` (voir `recovered-history-manifest.json`) ; toutes les consignes « copier / appliquer / déployer » ci-dessous sont **historiques** : le code est déployé et les migrations sont appliquées en base. Les fichiers `*.append.md` ont été consolidés dans `CHANGELOG.md`, `DECISIONS.md` et `TASKS.md`.


## Déploiement
1. Copier les fichiers à la racine du dépôt (JS dans `js/`, CSS dans `css/`, icônes PNG, `qr.js` dans `js/`).
2. Appliquer les migrations SQL dans l'ordre (voir PROJECT_MASTER.md).
3. `wrangler deploy` (assets = racine ; `.assetsignore` exclut tests, *.md, *.sql, *.ts).
4. Vider le cache / réinstaller la PWA une fois (SW `mc-v9`).

## Supabase
- Auth : connexions anonymes activées (avec captcha Turnstile), inscriptions e-mail publiques désactivées, MFA TOTP pour les comptes plateforme.
- SMS : fournisseur non choisi → connexion par téléphone indisponible, dépôt sans compte actif.
- Edge Functions : `saas-admin` (secrets ALLOWED_ORIGIN, SITE_URL), `sa-admin`, `ia-texte`, purge des pièces orphelines (`x-purge-secret`, vault).
- Buckets : `pieces`, `medias`, `adjoints`, `archives` (privés) ; `identite` (public, 300 Ko).

## Cloudflare
- Turnstile : ajouter le domaine du Worker aux domaines autorisés.
- Sous-domaine par commune : DNS wildcard + route (la base résout déjà `sous_domaine` / `domaine_perso`).

## Nouvelle commune
Espace `/saas` > Gestion des mairies > Nouvelle mairie. Puis, dans `/mairie` : Paramètres (identité, images), Citoyens > Démarches, Rendez-vous (jours/heures), Administration > Lien citoyen (couleur, blason, bannière, affiche QR).

## Contrôles après déploiement
- Lancer `tests/isolation_test.sql` → « ISOLATION OK ».
- `_headers` : `manifest-src 'self' blob:`, `img-src` avec le domaine Supabase.
- Ouvrir `/?c=slug` sur mobile : bannière, services, rendez-vous, suivi.
- Catalogue configurable : migration 20261124_catalogue.sql (ordre : après lot7).
