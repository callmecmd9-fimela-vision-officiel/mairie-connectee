# DECISIONS

| # | Décision | Raison |
|---|---|---|
| D1 | Le super_admin a une interface dédiée (`SANAV`) et n'accède plus aux écrans du maire. | Séparation administration technique / pouvoirs de la mairie. |
| D2 | Politiques RLS **RESTRICTIVE** interdisant INSERT/UPDATE/DELETE au super_admin sur `actes, deliberations, sessions_conseil, archives, delegations, courrier`. | Exigence : ne jamais modifier décisions et actes officiels. Garantie serveur, pas seulement visuelle. |
| D3 | Restauration limitée à `indicateurs, parametres_systeme, permissions_roles`. Sauvegarde automatique avant restauration. | Une restauration complète écraserait des actes officiels. |
| D4 | Opérations sur comptes via Edge Function `sa-admin` (service_role), jamais depuis le navigateur. | La clé service_role ne doit pas sortir du serveur ; contrôle du rôle appelant côté serveur. |
| D5 | Gardes : pas d'auto-suppression/désactivation, pas de modification d'un autre super_admin, pas de création de super_admin par l'interface. | Éviter verrouillage et escalade de privilèges. |
| D6 | Fonctions SQL `SECURITY DEFINER`, `search_path=''`, `execute` retiré à `public/anon`. | Pas d'appel anonyme ; pas de détournement de schéma. |
| D7 | `commune_id` en `text` dans les nouvelles tables. | Indépendant du type de `communes.id` (non vérifiable sans accès base). |
| D8 | Journal d'audit en lecture seule (aucune politique d'écriture/suppression client). | Intégrité de la traçabilité. |
| D9 | Boutons du module : `data-sa` + gestionnaire unique ; aucun bouton sans action (testé). | Consigne « aucun bouton fictif ». |
| D10 | Mode maintenance et modules appliqués à la connexion ; déconnexion automatique après inactivité (60 min par défaut). | Contrôle sans modifier les autres interfaces. |
| D12 | Les sauvegardes excluent `messages` (correspondance privée) et les courriers `confidentiel = true`. | Le super_admin ne doit pas obtenir par la sauvegarde ce qu'il ne peut pas lire. |
| D13 | Politiques `bloque_anonymes_*` sur les 5 nouvelles tables ; `_garde()` non exécutable directement. | Cohérence avec les tables existantes ; surface d'appel minimale. |
| D11 | Ancien écran « Comptes et communes » du maire conservé mais sans effet pour le super_admin ; `admin-comptes` non modifiée. | Ne pas dégrader l'existant. |
