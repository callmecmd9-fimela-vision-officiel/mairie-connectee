# Politique de mot de passe

## Règles
- Renouvellement obligatoire **tous les 30 jours** (espaces mairie et SaaS ; le portail citoyen se connecte par code SMS, sans mot de passe).
- **Alerte à J-7** : bandeau « votre mot de passe expire dans N jours », avec « Modifier maintenant » / « Plus tard » (masqué pour la session).
- **Après 30 jours** : à la connexion suivante, un écran bloquant impose le changement (ou la déconnexion).
- **À tout moment** : bouton « Mon mot de passe » (menu, à côté de « Déconnexion ») ouvre le formulaire de changement.
- Saisie : 10 caractères minimum, au moins une lettre et un chiffre, double saisie identique ; le nouveau mot de passe doit différer de l'ancien (contrôlé par Supabase Auth).
- Comptes protégés par MFA : la vérification n'a lieu qu'une fois le code MFA validé.

## Fonctionnement
| Élément | Rôle |
|---|---|
| `public.user_password_policy` | Date du dernier changement par compte. Aucun accès direct (RLS sans politique, droits retirés). |
| Déclencheurs sur `auth.users` | Mettent la date à jour à la création du compte et à chaque changement réel de l'empreinte du mot de passe (changement volontaire, lien de réinitialisation, invitation acceptée). Le navigateur ne peut pas la falsifier. |
| `mdp_politique_statut()` | Renvoie à l'utilisateur connecté `jours_ecoules`, `jours_restants`, `alerte`, `expire`. |
| `sa_mdp_statuts()` | Réservée au super-administrateur : état de renouvellement de tous les comptes. |
| `js/mdp-policy.js` | Affiche l'alerte, l'écran de changement imposé et le formulaire ; inactif si la migration n'est pas appliquée. |

## Visibilité du super-administrateur
**Les mots de passe ne sont lisibles par personne** : Supabase Auth ne conserve qu'une empreinte bcrypt irréversible, et les stocker en clair exposerait tous les comptes en cas de fuite. Pour un mot de passe oublié, le super-administrateur déclenche une **réinitialisation** (bouton « Mot de passe » de l'espace super-admin, Edge Function `sa-admin`) : l'utilisateur reçoit un lien sécurisé et choisit lui-même un nouveau mot de passe.

## Mise en production
1. Migration `20261123090000_politique_mot_de_passe_30_jours.sql` : **appliquée en production le 2026-11-22** (testée au préalable dans une transaction annulée).
2. Les comptes existants démarrent avec une échéance de 30 jours à partir de l'application (aucun blocage immédiat).
3. Déployer le front (`mairie.html`, `saas.html`, `js/mdp-policy.js`).

## Limite connue
L'obligation est appliquée par l'application (écran bloquant). Une garde côté serveur (refus des fonctions sensibles tant que le mot de passe est expiré) peut être ajoutée dans un second temps ; Supabase ne permet pas de refuser une connexion par SQL.
