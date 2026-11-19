# Revue ciblée RLS et RPC — 19 novembre 2026

## Environnement et limites
Revue en lecture seule du projet Supabase de production. Aucun SQL DDL/DML, aucune modification de politique, aucun changement d'ACL, aucune révocation de fonction, aucun déploiement.

## Synthèse RLS
- 67 tables dans le schéma `public`, RLS activé sur 67/67.
- 12 combinaisons table/opération comportent plus d'une politique permissive. PostgreSQL combine les politiques permissives par OR ; les politiques restrictives s'appliquent ensuite par AND.
- La revue des 12 groupes montre des contrôles distincts et cohérents sur l'échantillon : rôles séparés (adjoint/secrétariat), délégation vérifiée par `org_droit`, commune portée par la ligne ou contrôlée par `private.my_commune()`, propriétaire `auth.uid()`, confidentialité du courrier et des documents, et références métier pour l'historique. Cela ne prouve pas l'absence de défaut dans toutes les politiques ; les 56 alertes advisor restent à clôturer individuellement.
- Les groupes sensibles `paies` et `paie_lignes` sont limités à la commune et à des rôles RH/maire/finances ou à un droit explicite `org_droit('paie','consulter')`. La validation métier de la délégation paie reste un contrôle requis avant de conclure.
- Les tables `documents`, `courrier`, `instructions` et `ops_historique` ont des règles complémentaires de commune, rôle, confidentialité ou rattachement. Les politiques restrictives `bloque_anonymes`, `isolation_commune` et `maintenance_serveur` sont présentes sur plusieurs tables opérationnelles.
- Les tables `platform_admins` autorisent la lecture de sa propre ligne et celle du rôle plateforme validé par `private.is_platform_admin()`.

## RPC SECURITY DEFINER exécutables par anon
Treize RPC publiques SECURITY DEFINER sont exécutables par `anon` :
- Lecture publique de contenu et de configuration : `actualites`, `commune_par_hote`, `commune_par_slug`, `demarches_commune`, `identite_commune`, `infos_commune`, `portail_commune`, `projets_publics`, `planning_rdv`, `creneaux_rdv`.
- Suivi citoyen : `suivre_demande` et `suivre_demandes`.

Les dix premières fonctions retournent des informations de portail public et limitent les résultats aux communes actives/en essai ou aux publications publiques. Les deux fonctions de suivi ne retournent les informations d'une demande que pour un numéro au format strict comportant un suffixe hexadécimal de 32 caractères, ou pour la demande appartenant à `auth.uid()`. `suivre_demandes` borne en outre la liste à 30 numéros. Ce contrat doit rester couvert par des tests d'entropie/non-divulgation et de limitation d'entrée ; ne pas retirer globalement les droits anon, car cela casserait le portail citoyen.

## SECURITY DEFINER
- 152 fonctions SECURITY DEFINER observées dans `public` et `private`.
- Les 152 configurent `search_path = ''`.
- Le search_path vide est une bonne mesure de durcissement, mais ne remplace pas la vérification fonction par fonction de l'identité, du périmètre de commune, des droits d'exécution et de l'absence de paramètres contrôlés permettant un accès transversal.
- Les fonctions d'administration observées délèguent plusieurs contrôles à `private.pgarde`, `private.can`, `private.is_platform_admin` et aux fonctions `org_*`. La prochaine passe doit vérifier les appels et les rôles permis pour chaque RPC privilégiée.

## Historique des migrations
- Supabase rapporte 81 migrations appliquées.
- Le dépôt contient 15 fichiers SQL à la racine, avec des noms de lots fonctionnels qui ne correspondent pas à la liste des 81 versions enregistrées.
- Il n'est donc pas possible de traiter ces 15 fichiers comme un historique complet et rejouable. Ne pas les rejouer, les renommer ou créer des migrations de remplacement sans les 81 sources originales et une comparaison de schéma.
- Prochaine étape : récupérer les fichiers sources historiques depuis l'environnement d'origine/archives, puis comparer les checksums, le contenu et l'ordre aux versions enregistrées avant toute migration.

## Conclusion de cette passe
Aucune faille RLS démontrée par les groupes échantillonnés, mais plusieurs zones nécessitent une validation métier plus profonde : délégations paie, fonctions de suivi citoyen, RPC d'administration, et cohérence des 81 migrations. Aucun correctif de politique n'est appliqué sans preuve d'un contournement reproductible et test de non-régression.

## Authentification MFA — constat et correction sur la branche
- La console SaaS `/saas` imposait déjà TOTP et AAL2, mais la console super-administrateur intégrée à `/mairie` ne réalisait pas le défi MFA après le mot de passe.
- Les contrôles SQL/RLS imposaient bien AAL2 aux opérations sensibles : le constat est donc un défaut de parcours et de cohérence entre l'interface et l'autorisation serveur, pas un contournement RLS démontré.
- Correction préparée dans cette branche : contrôle AAL2 après authentification, défi TOTP pour un facteur déjà vérifié, enrôlement TOTP intégré si aucun facteur vérifié n'existe, vérification du code avant d'ouvrir la console, et refus des profils inactifs.
- Les rôles municipaux ordinaires ne sont pas soumis au MFA plateforme ; le contrôle s'applique au rôle `super_admin`.
- Tests de non-régression dédiés : AAL1, AAL2, absence de facteur, facteur non vérifié antérieur, maire AAL1, profil inactif et syntaxe des modules d'authentification.
- Cette correction reste une modification de code source sur branche/PR. Elle n'a pas été déployée en production.


## Edge Function `ia-texte` — contrôles complémentaires
- La table `ia_usage` a une clé primaire unique `(user_id, jour)` et une politique RLS qui refuse toutes les opérations directes à `anon` et `authenticated`. La Edge Function utilise la clé service-role.
- La limite quotidienne est actuellement lue puis écrite par un `upsert` non atomique. Deux requêtes simultanées du même compte peuvent lire le même compteur et dépasser temporairement le plafond de 30. C'est un défaut de robustesse de quota, pas un accès aux données d'un autre utilisateur. Une future migration devra ajouter une opération atomique (verrou/UPSERT conditionnel) après réconciliation des sources historiques.
- Le prévol CORS de la fonction a été complété dans la branche avec `Access-Control-Allow-Methods: POST, OPTIONS` et `Access-Control-Max-Age`. Cette modification n'est pas encore déployée.
- Les sources Supabase ne seront déployées qu'après validation complète de la PR et plan de déploiement distinct.

## Portée des alertes RLS
- L'énumération PostgreSQL a recensé 12 groupes table/opération comportant plusieurs politiques permissives. Les 12 groupes ont été examinés ; les conditions combinent des rôles séparés, des droits `org_droit`, l'appartenance à la commune, la confidentialité ou le rattachement à l'utilisateur.
- Aucun contournement intercommunal ou accès paie non autorisé n'a été démontré dans ces 12 groupes lors de cette passe. Les règles métier de délégation paie et les 56 alertes advisor doivent rester suivies, mais il ne faut pas supprimer des politiques simplement pour faire disparaître les avertissements.


## Publication Cloudflare Workers Assets
- `wrangler.jsonc` définit le répertoire des assets à la racine (`./`). Le fichier `.assetsignore` est donc le contrôle d'exclusion des fichiers non destinés au navigateur.
- Le dépôt contenait un fichier mal nommé avec un espace initial (` .assetsignore`) ; Wrangler ne le traite pas comme le fichier d'exclusion attendu. Le vrai `.assetsignore` de `main` ne contenait que les exclusions minimales.
- Correction dans cette PR : le fichier reconnu `.assetsignore` contient désormais les exclusions des tests, sources SQL/TypeScript, archives, répertoires `.github/` et `supabase/`, fichiers `*.mjs` et fichiers de verrouillage. Le fichier mal nommé est supprimé.
- Un test vérifie les règles critiques et l'absence du fichier mal nommé. Aucun déploiement Workers n'a été effectué ; l'exclusion sera appliquée au prochain déploiement autorisé.
