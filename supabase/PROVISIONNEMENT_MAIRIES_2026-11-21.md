# Provisionnement des mairies et administrateurs — relevé Production du 2026-11-21

Projet : `fimela-vision-officiel` (aiqegpijisspankpkwfj). Relevé en lecture seule ; **aucune écriture effectuée**.

## État constaté
| Mairie | Existe ? | Action |
|---|---|---|
| Diofior | Oui (`commune-de-diofior`, maire diomyoussou@gmail.com) | Conserver — rien à créer |
| Fimela | Oui (`fimela`) | Conserver |
| Joal | Non | À créer (slug `joal`) |
| Fatick | Non | À créer (slug `fatick`) |
| Djirnda | Non | À créer (slug `djirnda`) |

| E-mail | Compte Auth | Profil actuel | Cible |
|---|---|---|---|
| admindiofior@gmail.com | existe, confirmé | citoyen, sans commune | admin_mairie → Diofior |
| adminjoal@gmail.com | existe, confirmé | citoyen, sans commune | admin_mairie → Joal |
| adminfatick@gmail.com | existe, confirmé | citoyen, sans commune | admin_mairie → Fatick |
| admindjirnda@gmail.com | existe, confirmé | citoyen, sans commune | admin_mairie → Djirnda |

Aucun compte à créer, aucun doublon possible. Offres actives : essentiel, professionnel, premium.

## Pourquoi rien n'a été écrit
Toutes les fonctions de provisionnement (`saas_preparer_admin_mairie`, `saas_affecter_admin_mairie`,
`saas_creer_commune`, `admin_attribuer`) sont gardées par `private.pgarde` : session administrateur
plateforme **avec MFA AAL2** obligatoire. Le contourner (SQL direct, usurpation de JWT) violerait la
consigne « ne jamais contourner l'authentification ». À exécuter depuis le Super Admin (session MFA).

## Procédure (session plateforme AAL2, console Super Admin ou RPC authentifiée)
Ordre imposé : rôle → vérification → affectation.

1. Diofior : `select public.saas_preparer_admin_mairie('admindiofior@gmail.com');`
   Vérifier : `public.saas_admins_mairie()` → ligne avec statut `en_attente`.
   Puis : `select public.saas_affecter_admin_mairie('admindiofior@gmail.com','commune-de-diofior');`
2. Joal / Fatick / Djirnda (mairie absente) :
   a. `saas_preparer_admin_mairie('<email>')` (rôle admin_mairie, inactif, sans commune)
   b. Vérifier via `saas_admins_mairie()` (statut `en_attente`)
   c. Super Admin → « Créer une mairie » (nom, slug, offre, e-mail existant). L'Edge Function `saas-admin`
      réutilise le compte existant (`invitation: compte_existant`), crée la commune et affecte l'admin.
      Slugs : `joal`, `fatick`, `djirnda`.
3. Les profils restent **inactifs** : activation séparée (Edge Function `sa-admin`, action « activer »).
4. Contrôle final : `saas_admins_mairie()` doit montrer 4 lignes, chacune avec sa commune ; `communes` = 5 lignes, sans doublon de slug.

Aucune réinitialisation de mot de passe, aucune suppression, aucun changement d'e-mail.

## Mise à jour — état réel après création via le Super Admin (10:14)
Joal, Fatick, Djirnda créées avec leurs administrateurs (admin_mairie, affecté, inactif). Reste admindiofior@gmail.com → Diofior.
Ajout `js/saas.js` (saas.html v=20261121.1) : panneau « Affecter un administrateur à une mairie existante » (onglet Mairies).
Il enchaîne, avec la session MFA du super admin : saas_preparer_admin_mairie → vérification via saas_admins_mairie → saas_affecter_admin_mairie.

## État final constaté (Production, 11:06)
- 5 communes : Diofior, Djirnda, Fatick, Joal, Fimela (aucun doublon).
- 4 administrateurs `admin_mairie`, affectés : admindiofior→Diofior, adminjoal→Joal, adminfatick→Fatick, admindjirnda→Djirnda. Tous INACTIFS par conception.
- Message « Ce compte n’a pas encore accès à l’espace mairie » = compte inactif : il disparaît après activation.
- Migration appliquée : `saas_modifier_commune` (06). Super Admin : panneaux « Affecter un administrateur », « Administrateurs municipaux » (Activer/Désactiver via sa-admin, e-mail confirmé requis) et bouton « Modifier » (nom, domaine).
- Déploiement minimal du site : saas.html, js/saas.js (v=20261121.3), css/saas.css.

## Archivage et suppression (migration 20261121110000 — à appliquer avec accord)
- Archiver : mairie « resilie » (accès bloqué par les garde-fous existants) + marqueur `archive_le`, motif obligatoire, réversible (Restaurer). Aucune donnée supprimée.
- Supprimer : réservé aux mairies ARCHIVÉES, slug re-saisi, et totalement vides (seuls abonnement, indicateurs, compteurs auto et admin_mairie tolérés). Le compte admin_mairie est libéré (citoyen), jamais supprimé. Journalisé dans platform_audit.
- Pas d'archivage/suppression de compte : utiliser Désactiver (conserve l'historique).
- Site : saas.html + js/saas.js (v=20261121.4) + css/saas.css.

## Espace admin municipal (migration 20261121120000 + js/admin-mairie.js)
Cause du menu réduit : le menu complet (10 entrées) est celui du rôle super_admin (plateforme, MFA). Un admin_mairie n'avait que Accueil + Administration.
Nouveau menu admin_mairie, limité à SA mairie : Tableau de bord, Utilisateurs de la mairie (consultation), Paramètres de la mairie (identité/coordonnées),
Journal d'audit, puis Accueil et Administration (organigramme et droits, services et équipes, délégations).
Exclus volontairement : sauvegardes, maintenance, sécurité globale, modules, création/activation de comptes.
Garde serveur : public._garde_am (admin_mairie actif de la commune demandée, ou super-admin existant). Testée : lecture d'une autre mairie refusée.
Déploiement site : mairie.html, js/core.js, js/admin-mairie.js (+ saas.html, js/saas.js, css/saas.css déjà livrés).
