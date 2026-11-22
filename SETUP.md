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

## Administrateurs municipaux (rôle `admin_mairie`)
Voir `docs/ROLES_ET_PERMISSIONS.md`. Interface Super Admin → Gestion des utilisateurs → *Administrateurs municipaux* : créer/rattacher un compte existant (commune facultative), affecter, activer, suspendre. Ne jamais saisir ni transmettre de mot de passe. Variables d'Edge Functions : `.env.example` (jamais de valeur réelle dans le dépôt). Tests Postgres : base jetable uniquement.

## Nouvelle commune
Espace `/saas` > Gestion des mairies > Nouvelle mairie. Puis, dans `/mairie` : Paramètres (identité, images), Citoyens > Démarches, Rendez-vous (jours/heures), Administration > Lien citoyen (couleur, blason, bannière, affiche QR).

## Contrôles après déploiement
- Lancer `tests/isolation_test.sql` → « ISOLATION OK ».
- `_headers` : `manifest-src 'self' blob:`, `img-src` avec le domaine Supabase.
- Ouvrir `/?c=slug` sur mobile : bannière, services, rendez-vous, suivi.
- Catalogue configurable : migration 20261124_catalogue.sql (ordre : après lot7).

## Session 2026-11-21 (MAJ3)
- Appliquées en production : security_null_mfa_guards, ia_usage_atomic_reservations (historique cohérent). Non appliquées : 20261120100000 (répétition requise) et suppression de l index doublon communes_slug_uq (proposée dans supabase/proposed/, accord requis). bright-worker : inerte, suppression soumise à accord.
- Edge Functions déployées = sources du dépôt (saas-admin v3, sa-admin v15, admin-comptes v10, bright-worker v4, purge-pieces v2, ia-texte v9).
- Décision : toute suppression de ressource et toute migration fonctionnelle de production restent soumises à autorisation explicite ; ZIP de référence : SAAS_MUNICIPAL_MAJ4.zip.

## Sauvegarde et publication (MAJ17)
- Sauvegarde chiffrée : créer les secrets GitHub `SUPABASE_DB_URL` et `BACKUP_PASSPHRASE` (voir `docs/SAUVEGARDE.md`).
- Publication : seuls les fichiers listés en liste blanche dans `.assetsignore` sont servis ; tout nouveau fichier public (page, dossier) doit y être ajouté, et `tests/assets-ignore.test.js` mis à jour.
