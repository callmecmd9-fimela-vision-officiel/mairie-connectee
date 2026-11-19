# Audit initial — Mairie Connectée
Date : 2026-11-19
Branche de travail : `fix/security-audit-2026-11-19`
Base de départ : `main` — `a11b53565168cad3bc081b5838ea4638447d6a0e`

## Périmètre et méthode
- Lecture du dépôt GitHub privé, de l'arborescence, des fichiers d'architecture, des modules d'authentification et de permissions, des migrations SQL présentes et des tests.
- Inspection en lecture seule du projet Supabase `fimela-vision-officiel`.
- Consultation des Security / Performance Advisors et des catalogues PostgreSQL.
- Aucune modification de `main`, aucune migration exécutée, aucune donnée ni configuration Supabase modifiée, aucun déploiement effectué.

## Architecture constatée
- Front statique HTML/CSS/JavaScript, sans chaîne de build visible, servi via Cloudflare Workers Assets.
- Trois espaces : citoyen (`/`), mairie (`/mairie`) et plateforme (`/saas`).
- Supabase assure Postgres, Auth, RLS, Storage et Edge Functions.
- Le dépôt `main` contient 114 entrées au SHA de référence.
- Le projet Supabase est actif ; PostgreSQL 17.
- 67 tables du schéma `public` inspectées : RLS activé sur 67/67, aucune table publique sans RLS détectée.

## Authentification et permissions
- L'espace mairie vérifie l'utilisateur avec `auth.getUser()`, charge le profil communal, contrôle le rôle et la commune, puis charge les données.
- Le portail citoyen utilise `signInAnonymously()` avec jeton CAPTCHA pour certaines opérations. Les politiques RLS doivent donc distinguer un utilisateur Auth anonyme d'un utilisateur authentifié nominatif.
- L'espace SaaS applique un contrôle MFA TOTP côté client et des contrôles côté serveur ; les RPC d'administration doivent rester l'autorité.
- Échantillon de fonctions SECURITY DEFINER examiné : `admin_attribuer` vérifie l'identité administrateur plateforme et le périmètre communal ; `org_affecter` vérifie le droit d'administration et le périmètre de la commune ; `org_gest` vérifie le maire de la commune ou l'administrateur plateforme. Ces échantillons ne remplacent pas la revue exhaustive des fonctions.

## Supabase / RLS — constats initiaux
- Historique Supabase : 81 migrations enregistrées.
- Fichiers SQL versionnés dans cette branche : 15. L'écart entre l'historique appliqué et les fichiers présents impose de réconcilier les migrations sources avant toute évolution SQL.
- Security Advisors : 12 fonctions SECURITY DEFINER exécutables par `anon`, 89 exécutables par `authenticated`, 70 alertes de politiques avec rôle `authenticated` dans un projet qui autorise les sessions Auth anonymes, et protection contre les mots de passe compromis désactivée.
- Performance Advisors : 56 alertes de politiques permissives multiples, 7 clés étrangères sans index, 20 index signalés inutilisés et 1 index dupliqué.
- Ces alertes sont des signaux de revue, pas la preuve automatique d'une fuite. Les politiques permissives se combinent par OR ; chaque combinaison doit être évaluée sur les tables sensibles.
- Les RPC SECURITY DEFINER exposées à `anon` observées sont des fonctions de portail public / lecture / suivi. Il faut confirmer leur contrat et leurs champs de sortie avant de conserver ou retirer les privilèges.
- Des politiques de blocage explicite des utilisateurs Auth anonymes existent déjà sur plusieurs tables sensibles (profils, personnel, congés, paie, rémunérations, documents, etc.). Les politiques restantes doivent être examinées individuellement, sans désactiver le parcours citoyen anonyme par inadvertance.

## Tests et intégration GitHub
- Une PR brouillon existe déjà : [PR #1](https://github.com/callmecmd9-fimela-vision-officiel/mairie-connectee/pull/1), branche `chore/ci-regression-tests`, cible `main`.
- Le dernier workflow observé sur cette branche est le run #32, terminé avec succès sur le SHA `ea582d011217ac3c5f215926f8eea15b09752ae6`.
- La PR ajoute les modules `js/org-e.js` et `js/org-f.js`, leurs tests, et un workflow Node 24. Elle n'est pas fusionnée.
- `main` reste inchangée. La PR #1 doit rester brouillon jusqu'à la réconciliation des sources SQL et à la revue complète.

## Décisions de sécurité
1. Ne pas exécuter de migration SQL depuis les fichiers du dépôt tant que leur correspondance avec l'historique Supabase n'est pas prouvée.
2. Ne pas modifier les rôles, politiques RLS, fonctions SECURITY DEFINER, paramètres Auth ou buckets en production pendant l'audit.
3. Traiter les alertes de politiques permissives et d'accès anonyme comme des revues prioritaires, en conservant les parcours citoyens nécessaires.
4. Effectuer les correctifs applicatifs sur une branche dédiée, avec tests et PR ; aucune fusion automatique dans `main`.

## Suite de l'audit
- Revue exhaustive des fonctions SECURITY DEFINER, de leurs ACL, de leur `search_path` et de leurs contrôles d'identité / commune / MFA.
- Revue des politiques RLS des tables sensibles et de l'effet OR des politiques permissives.
- Réconciliation des migrations SQL présentes dans le dépôt avec les sources exactes et l'historique Supabase.
- Vérification des Edge Functions, Storage policies, workflows et chemins de déploiement.
- Correctifs ciblés, tests de non-régression, revue de PR et validation avant fusion.
