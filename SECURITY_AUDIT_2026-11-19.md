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

## Constat complémentaire — Edge Functions
- Six Edge Functions sont déployées et actives dans Supabase.
- Aucune source `supabase/functions/*` n'était versionnée dans `main` au moment de l'audit : l'état déployé n'était donc pas reproductible depuis le dépôt.
- La fonction active `ia-texte` (version 9, `verify_jwt=true`) utilise la clé service-role et autorise le rôle `super_admin` sur la seule base de `profiles.role`. Elle ne vérifie pas le niveau AAL2.
- Or, la fonction SQL actuelle `public.is_super_admin()` exige explicitement `auth.jwt()->>'aal' = 'aal2'`, et `private.is_platform_admin()` vérifie également AAL2. `ia-texte` contourne donc cette règle côté Edge Function pour les sessions super-admin AAL1.
- Aucun appel à `ia-texte` n'a été trouvé dans les fichiers JavaScript actuellement versionnés. L'endpoint reste néanmoins actif ; il ne faut pas le considérer comme inoffensif sans vérifier les éventuels clients externes.
- Correctif préparé sur `chore/ci-regression-tests` : contrôle du JWT avec le client appelant, refus des utilisateurs anonymes/inactifs, appel obligatoire à `public.is_super_admin()` pour le rôle `super_admin`, et vérification du périmètre communal pour les rôles municipaux.
- Un test de non-régression couvre les cas AAL1/AAL2, utilisateur anonyme, profil inactif, rôle non autorisé et accès intercommunal. Le correctif n'a pas été déployé sur Supabase.


## RLS et Storage — revue ciblée complémentaire
- Les 56 alertes `multiple_permissive_policies` ne constituent pas automatiquement des contournements : sur les tables sensibles échantillonnées, plusieurs politiques sont explicitement `RESTRICTIVE` et imposent notamment l'isolation par commune, le blocage des sessions anonymes, le mode maintenance et les règles de confidentialité. Il faut néanmoins vérifier les 56 combinaisons et leurs droits SQL effectifs.
- Les 70 alertes liées aux sessions anonymes reflètent le fait que le portail utilise `signInAnonymously()` : plusieurs tables sensibles possèdent une politique restrictive `is_anonymous = false`; d'autres politiques reposent sur un profil nominatif, une commune ou un rôle et doivent être validées table par table.
- 152 fonctions `SECURITY DEFINER` existent dans les schémas `public` et `private` ; les 152 ont `search_path = ''`. Cela réduit le risque de détournement du search_path mais ne remplace pas la revue des ACL et des contrôles d'autorisation.
- Les cinq buckets Storage observés (`adjoints`, `archives`, `identite`, `medias`, `pieces`) sont tous privés. Les politiques observées limitent les accès par rôle et commune ; le dépôt de pièces impose notamment propriétaire, commune ouverte, chemin UUID et plafond de trois pièces. La lecture anonyme du bucket `identite` est limitée aux noms de fichiers publics autorisés (blason et bannières).
- Les alertes de performance sont : 7 clés étrangères sans index, 20 index signalés inutilisés et 1 index dupliqué. Aucune suppression/création d'index n'a été exécutée ; l'impact doit être évalué avec les requêtes et volumes réels.
- La protection Supabase contre les mots de passe compromis est désactivée. Son activation est à planifier séparément, après évaluation de l'impact utilisateur et de la configuration Auth.


## Edge Functions — autres contrôles
- `saas-admin` et `sa-admin` exigent un JWT valide et passent par les RPC de contrôle plateforme/MFA avant les opérations privilégiées.
- `purge-pieces` est configurée avec `verify_jwt=false`, mais exige un secret partagé dans l'en-tête ; sa RPC `pieces_orphelines` vérifie ce secret via Vault et n'est pas exécutable par `anon` ou `authenticated`. Ce modèle reste sensible à la protection/rotation du secret.
- `bright-worker` et `admin-comptes` sont encore déployées actives, mais répondent HTTP 410 avec une indication de migration vers les fonctions actuelles ; leur retrait contrôlé pourra être étudié après vérification des appels externes.
- Le correctif `ia-texte` est versionné dans la PR #1, avec tests Node et contrôle Deno réussis. Il reste à déployer séparément après validation, car le code Supabase actuellement actif n'a pas été remplacé.
- Les sources des cinq autres Edge Functions actives restent à intégrer au dépôt pour obtenir une traçabilité complète des versions déployées.


## Authentification MFA — écart d'interface corrigé sur la branche de travail
- La console `/saas` possédait déjà un parcours TOTP, mais la console super-administrateur intégrée à `/mairie` ne lançait pas de défi MFA après le mot de passe.
- Les fonctions SQL et RLS imposaient déjà AAL2 aux opérations sensibles. L'écart observé était donc une incohérence du parcours d'authentification et un défaut d'accès à la console, pas une preuve de contournement des contrôles serveur.
- Correctif préparé sur `chore/ci-regression-tests` : contrôle AAL2 avant ouverture de la console, défi TOTP pour un facteur vérifié, enrôlement TOTP intégré si aucun facteur vérifié n'existe, vérification du code, et refus des profils inactifs.
- Les rôles municipaux standards conservent leur parcours habituel ; le contrôle MFA plateforme concerne le rôle `super_admin`.
- Tests dédiés ajoutés. La correction n'est pas encore déployée sur Supabase ni fusionnée dans `main`.


## Cloudflare Workers Assets — point de publication
- Le Worker sert les assets depuis la racine du dépôt (`wrangler.jsonc`, `assets.directory = "./"`).
- La branche principale contenait un `.assetsignore` minimal et un doublon mal nommé avec un espace initial. La branche de correction remplace le fichier reconnu par une liste d'exclusions complète, ajoute `supabase/`, `.github/`, `*.mjs` et `*.lock`, puis supprime le fichier mal nommé.
- Cette mesure évite de publier les sources Edge Functions, les métadonnées CI et les artefacts de test comme fichiers statiques au prochain déploiement. Elle n'a pas encore été déployée.
