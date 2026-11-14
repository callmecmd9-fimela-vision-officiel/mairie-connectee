# PROJECT_MASTER — Mairie Connectée (Mairie de Fimela)

## Architecture
- Hébergement statique (Cloudflare Pages) + Supabase (Auth, Postgres/RLS, Storage, Edge Functions). PWA, sans build.
- `index.html` + `js/citoyen.js` : application citoyens (scope `/`).
- `mairie.html` : espace du personnel (scope `/mairie`, `noindex`). Modules JS chargés dans l'ordre :
  `core` → `adjoints` → `secretariat` → `superadmin` → `actions`.
- `sw.js` : réseau d'abord, cache de secours (installable Android). `_headers` : CSP sans `unsafe-inline` en `script-src`.
- Les scripts partagent la portée globale : toute nouvelle constante de premier niveau doit être unique (collision = `SyntaxError`).

## Rôles
`maire, adjoint, cabinet, secretariat, finances, rh, etat_civil, technique, agent` + `super_admin` (+ `citoyen`).
Chaque rôle a une interface : maire (`V.dash`…), adjoint (`ANAV`), secrétariat (`SNAV`), **super_admin (`SANAV`, `js/superadmin.js`)**.

## Interface Super Administrateur
Vues : `sa_dash`, `sa_users`, `sa_params`, `sa_roles`, `sa_sec`, `sa_bak`, `sa_audit`, `sa_mods`, `sa_rep`, `sa_maint`.
- Boutons : attribut `data-sa` (gestionnaires `SAC` dans `superadmin.js`) ; navigation : `data-a="go"` existant.
- Toute écriture passe par le serveur : RPC `sa_*` (SECURITY DEFINER, garde `is_super_admin()`) ou Edge Function `sa-admin` (clé service_role).
- Réglages lus par tous les rôles au login (`loadSys`) : `maintenance`, `modules`, `idle_min`, `mdp_min`, surcharges `permissions_roles`.

## Base de données (migration `supabase/migrations/20261114_super_admin.sql`)
Tables ajoutées : `parametres_systeme`, `permissions_roles`, `journal_audit`, `sauvegardes`, `incidents` (`commune_id` en `text`).
Colonnes ajoutées : `profiles.nom/service/actif`, `indicateurs.contact_email/site_web/horaires`.
Fonctions : `is_super_admin`, `sa_stats`, `sa_utilisateurs`, `sa_set_param`, `sa_set_permission`, `sa_reset_permissions`,
`sa_enregistrer_identite`, `sa_set_image`, `sa_creer_sauvegarde`, `sa_restaurer`, `sa_supprimer_sauvegarde`,
`sa_revoquer_sessions`, `sa_incident_creer`, `sa_incident_maj`, `sa_audit`.

## Déploiement
1. SQL Editor : exécuter la migration. 2. `supabase functions deploy sa-admin` (variable facultative `ALLOWED_ORIGIN`).
3. Pousser les fichiers statiques. 4. Vérifier `get_advisors` (RLS) dans Supabase.
5. Créer/vérifier un compte `profiles.role = 'super_admin'`.

## Limites connues
- Permissions et modules masquent les écrans côté interface ; l'accès aux données reste régi par les RLS existantes.
- Un compte désactivé/supprimé garde son jeton d'accès jusqu'à expiration (≤ 1 h) ; ses sessions et refresh tokens sont supprimés immédiatement.
- Politique de mot de passe Supabase (complexité, MFA) : à régler dans le tableau de bord Supabase.
