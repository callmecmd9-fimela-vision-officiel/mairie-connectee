# CHANGELOG

## 2026-11-14 — Interface Super Administrateur
### Ajouté
- `js/superadmin.js` : 10 vues, 20+ actions serveur, diagnostic, exports CSV, déconnexion sur inactivité.
- `supabase/migrations/20261114_super_admin.sql`, `supabase/functions/sa-admin/index.ts`.
- Styles `.sa-*` dans `css/mairie.css`.
- Documentation : PROJECT_MASTER, TASKS, DECISIONS, CHANGELOG.
### Modifié (changements minimes, rétrocompatibles)
- `js/core.js` : `can()` (surcharges de permissions), `espV()` (modules), `okv/NAV` (nav super_admin), `profil()` (maintenance, modules, vue initiale `sa_dash`), `load()` (`saLoad`).
- `js/secretariat.js` : vue par défaut du super_admin.
- `mairie.html` : balise `superadmin.js`.
### Changement de comportement
- Le compte `super_admin` n'utilise plus l'interface du maire et ne peut plus écrire les actes officiels (D2). Utiliser un compte `maire` pour ces tâches.
### Base de données (appliquée le 2026-11-14)
- `20261114_super_admin.sql`, `20261114b_super_admin_durcissement.sql` : 5 tables, 18 fonctions, 15 politiques restrictives (actes, délibérations, sessions du conseil, délégations, courrier).
- Constat : `private.can()` autorisait déjà `super_admin` sur toutes les tables ; les politiques restrictives lui retirent l'écriture sur les actes officiels.
### Avant
- Service worker fonctionnel, CI corrigée, CSP sans `unsafe-inline` en `script-src`, icônes maskable, MIME manifest.
