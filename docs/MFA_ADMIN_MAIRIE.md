# Double authentification des admins municipaux

- **Modèle de rôles** : `super_admin` est un administrateur **de sa propre commune** (isolation RLS `isolation_commune` + garde `_garde` : « autre commune » refusé). Le rôle réellement global est `platform_admins` (console `/saas`), à ne jamais attribuer à un admin de mairie.
- **Interface « Administration Système »** : les admins de mairie reçoivent le rôle `super_admin` de LEUR commune (appliqué en production le 2026-11-23 aux comptes de Fimela, Joal, Fatick, Diofior et Djirnda).
- **Front (`js/core.js`)** : le super admin **et** tout compte `admin_mairie` doivent configurer puis valider une application d'authentification (TOTP) à la connexion.
- **Serveur** : `is_super_admin()` exige déjà aal2 pour les fonctions `sa_*`. `supabase/proposed/20261123_admin_mairie_mfa_serveur.sql` fait de même pour les fonctions `am_*` d'un `admin_mairie` (à appliquer seulement si ce rôle reste utilisé).
- **Futurs admins** : un déclencheur sur `profiles` (`20261123120000_admin_mairie_actif_vers_admin_commune.sql`) donne le rôle `super_admin` de leur commune aux comptes `admin_mairie` dès leur activation avec une commune. Les comptes en attente restent `admin_mairie` (invitation et activation inchangées) ; la double authentification est exigée dès la première connexion.
- **À tester à la main** : créer puis activer un admin de test depuis la console `/saas`, vérifier son rôle, l'enrôlement TOTP et l'accès à sa seule commune.
