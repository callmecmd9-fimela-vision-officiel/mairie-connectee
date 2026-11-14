# TASKS

## Terminé
- [x] Service worker installable (fetch réseau d'abord, repli cache).
- [x] CI corrigée (`if`, `[skip ci]`, `concurrency`) — peut être supprimée.
- [x] CSP durcie : scripts externalisés (`pwa-init`, `guard`, `citoyen`, modules mairie).
- [x] Icônes `maskable` séparées, MIME `.webmanifest`.
- [x] Interface Super Admin : tableau de bord, utilisateurs, rôles/permissions, paramètres, sécurité, audit, sauvegardes, modules, rapports, maintenance.
- [x] Migration SQL + Edge Function `sa-admin`.
- [x] Tests automatisés simulés (107 contrôles) : rendu, boutons, appels serveur, non-régression des 5 rôles.

- [x] Migrations SQL appliquées au projet `aiqegpijisspankpkwfj` (2026-11-14) et testées en transaction annulée : stats, utilisateurs, paramètres, permissions, identité, sauvegarde/restauration, incidents, audit, blocage des actes (INSERT refusé au super_admin), refus des non-super_admin et des anonymes.
- [x] Audit de sécurité Supabase relu : aucune alerte critique ajoutée par la migration.

## À faire par l'exploitant
- [ ] Déployer la fonction Edge `sa-admin` (`supabase functions deploy sa-admin`) : sans elle, créer/modifier/désactiver/supprimer un compte et le diagnostic « Fonction sa-admin » échouent.
- [ ] Pousser les fichiers statiques sur GitHub (`js/`, `css/`, `mairie.html`).
- [ ] Activer « Leaked password protection » (Supabase > Authentication) : alerte préexistante.
- [ ] `public.journal_consultation` : fixer `search_path` (alerte préexistante).
- [ ] Vérifier que la clé exposée côté client est la clé publique (`sb_publishable_…`) uniquement.
- [ ] Désactiver ou supprimer l'ancienne fonction `admin-comptes` une fois `sa-admin` validée.
- [ ] Passer `_headers` en nonce/hash pour `style-src` (aujourd'hui `unsafe-inline`).
- [ ] Authentification renforcée (MFA TOTP) pour `super_admin`.

## Idées
- Restauration depuis un fichier JSON importé ; planification de sauvegardes (pg_cron).
