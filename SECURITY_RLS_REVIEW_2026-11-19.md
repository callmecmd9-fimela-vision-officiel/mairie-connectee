# Revue ciblée RLS et RPC — 19 novembre 2026

## Environnement et limites
Revue en lecture seule du projet Supabase de production. Aucun SQL DDL/DML, aucune modification de politique, aucun changement d'ACL, aucune révocation de fonction, aucun déploiement.

## Synthèse RLS
- 67 tables dans le schéma `public`, RLS activé sur 67/67.
- Une revue manuelle antérieure avait échantillonné 12 groupes table/opération. L'advisor Supabase relancé le 19 novembre recense 56 occurrences de politiques permissives multiples ; ce nombre est plus large que l'échantillon manuel. PostgreSQL combine les politiques permissives par OR ; les politiques restrictives s'appliquent ensuite par AND.
- La revue des 12 groupes montre des contrôles distincts et cohérents sur l'échantillon : rôles séparés (adjoint/secrétariat), délégation vérifiée par `org_droit`, commune portée par la ligne ou contrôlée par `private.my_commune()`, propriétaire `auth.uid()`, confidentialité du courrier et des documents, et références métier pour l'historique. Cela ne prouve pas l'absence de défaut dans toutes les politiques ; les 56 alertes advisor restent à clôturer individuellement.
- Les groupes sensibles `paies` et `paie_lignes` sont limités à la commune et à des rôles RH/maire/finances ou à un droit explicite `org_droit('paie','consulter')`. La validation métier de la délégation paie reste un contrôle requis avant de conclure.
- Les tables `documents`, `courrier`, `instructions` et `ops_historique` ont des règles complémentaires de commune, rôle, confidentialité ou rattachement. Les politiques restrictives `bloque_anonymes`, `isolation_commune` et `maintenance_serveur` sont présentes sur plusieurs tables opérationnelles.
- Les tables `platform_admins` autorisent la lecture de sa propre ligne et celle du rôle plateforme validé par `private.is_platform_admin()`.

## RPC SECURITY DEFINER exécutables par anon
Douze RPC publiques SECURITY DEFINER sont exécutables par `anon` (recomptage SQL du 19 novembre 2026) :
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

## Vérification de correspondance des sources SQL
- Sur la branche PR, 16 fichiers `.sql` sont présents à la racine.
- La comparaison stricte des noms de fichiers avec les 81 noms de migrations enregistrés ne donne qu'une correspondance exacte (`20261118_org_sa_roles.sql` ↔ `20261118_org_sa_roles`).
- Une différence de nom ne prouve pas qu'une migration n'a jamais été appliquée : certaines sources peuvent être des fragments, des lots ou des scripts d'isolation. Elle prouve en revanche que le dépôt ne fournit pas une correspondance canonique exploitable entre fichiers et historique Supabase.
- Les fichiers datés après le 19 novembre 2026 sont des sources futures/proposées au regard de la date de cet audit ; ils ne doivent pas être exécutés sans plan de migration explicite.

## Traçabilité des Edge Functions — état de la PR
- Les six fonctions déployées ont maintenant une source dans `supabase/functions/<slug>/index.ts`.
- Sources récupérées depuis Supabase : `saas-admin` v3, `sa-admin` v15, `purge-pieces` v2, `bright-worker` v4 et `admin-comptes` v10. `ia-texte` v9 a été repris puis durci (AAL2, profil actif, commune et CORS).
- `supabase/config.toml` conserve les paramètres JWT observés : `verify_jwt=false` uniquement pour `purge-pieces` (secret Vault vérifié côté RPC), et `true` pour les cinq autres fonctions.
- Le workflow CI vérifie désormais chaque `index.ts` avec `deno check`, et un test contrôle la présence des six sources et les six paramètres `verify_jwt`.
- Les versions source sont synchronisées dans Git ; elles ne sont pas encore déployées. Les secrets restent exclusivement dans les secrets Supabase et ne sont pas copiés dans le dépôt.

## Durcissement final de `ia-texte`
- Le contrôle d'accès refuse désormais les communes dont le statut n'est ni `essai` ni `actif`, y compris pour un super-administrateur.
- Les erreurs de lecture ou d'écriture de `ia_usage` entraînent maintenant un refus (HTTP 503) au lieu de laisser le contrôle de quota échouer silencieusement.
- La limite reste non atomique en cas de requêtes concurrentes. Elle ne peut être rendue atomique proprement qu'avec une RPC/migration versionnée, à différer jusqu'à la réconciliation des 81 migrations.
- Les tests couvrent désormais le statut de commune et vérifient la présence des protections CORS et quota fail-closed.


## Actualisation de l'audit — 19 novembre 2026, 05:10 UTC

Cette actualisation s'appuie sur une nouvelle lecture des catalogues PostgreSQL, des définitions de fonctions et des politiques actuellement déployées. Elle ne modifie pas la base.

### Comptages confirmés
- Tables publiques avec RLS : **67/67**.
- Fonctions `SECURITY DEFINER` dans les schémas `public` et `private` : **152**.
- Fonctions `SECURITY DEFINER` du schéma `public` exécutables par `anon` : **12**.
- Fonctions `SECURITY DEFINER` du schéma `public` exécutables par `authenticated` : **89**.
- Les 152 fonctions observées ont `search_path = ''`.
- Comptes Auth anonymes présents : **3** ; comptes anonymes possédant une ligne `public.profiles` : **0**.

### Contrôle des comptes anonymes et des droits organisationnels
Le trigger `private.nouvel_utilisateur()` sur `auth.users` retourne immédiatement lorsque `new.is_anonymous` est vrai ; il ne crée donc pas de profil pour ces comptes. La fonction `public.org_commune()` ne renvoie une commune qu'à partir d'un profil actif. Les politiques de lecture des tables organisationnelles `org_affectations`, `org_agent_affectations`, `org_postes`, `org_role_droits` et `org_roles` sont bornées par cette commune. `org_roles` dispose en plus d'une politique restrictive explicite qui bloque les sessions anonymes.
Ce constat réduit le risque signalé par l'advisor pour ces tables, mais ne remplace pas un test HTTP/RLS avec un vrai jeton de session anonyme dans un environnement de recette.

### RPC publiques anon — inventaire vérifié
Les 12 fonctions sont : `actualites`, `commune_par_hote`, `commune_par_slug`, `creneaux_rdv`, `demarches_commune`, `identite_commune`, `infos_commune`, `planning_rdv`, `portail_commune`, `projets_publics`, `suivre_demande` et `suivre_demandes`.
Les dix fonctions de portail limitent leurs résultats à une commune en essai/active et/ou à des contenus publiés/publics. Les deux fonctions de suivi exigent soit un numéro répondant au format de référence avec suffixe hexadécimal de 32 caractères, soit une correspondance avec `auth.uid()`. `suivre_demandes` borne le tableau à 30 numéros. Ces RPC doivent rester publiques tant que le portail citoyen en dépend ; leur contrat de non-divulgation doit être couvert par des tests dédiés.

### Fonctions d'administration et d'organisation inspectées
- `admin_attribuer` exige `private.is_platform_admin()` (qui impose AAL2), refuse les rôles hors liste, les utilisateurs anonymes, les comptes administrateurs plateforme, les profils `super_admin` et les transferts intercommunaux implicites.
- `admin_utilisateurs` ne renvoie les comptes que si `private.is_platform_admin()` est vrai.
- `is_super_admin()` vérifie un profil actif `super_admin` avec AAL2 ou un administrateur plateforme validé.
- `org_affecter` exige `org_droit('org','administrer')`, vérifie le profil cible actif dans la même commune, refuse un profil `super_admin`, valide le poste actif et le service communal, puis contrôle que l'appelant peut accorder le rôle cible.
- `org_deleguer` vérifie que le bénéficiaire est actif dans la même commune, n'est ni `super_admin` ni `citoyen`, interdit l'auto-délégation, borne la durée à un an et exige que le délégant détienne lui-même le droit délégué.
- `org_droit_user` s'appuie sur un profil actif et sur les droits propres ou une délégation active, non révoquée, de la même commune.

### Politiques RH et paie inspectées
Pour `paies`, `paie_lignes` et `remunerations`, les politiques restrictives imposent l'isolation par commune, le refus des sessions anonymes et le mode hors maintenance. Les politiques permissives de lecture combinent les rôles historiques (maire/RH/finances selon la table) et les droits organisationnels explicites `org_droit(...,'consulter')`. Le cumul par OR est donc présent, mais les contraintes restrictives s'appliquent ensuite par AND. Aucun accès intercommunal n'a été démontré dans ces définitions ; la recette métier doit néanmoins tester chaque rôle et chaque délégation sur des comptes réels de deux communes distinctes.

### Alertes advisors actuelles
- Sécurité : 12 RPC anon `SECURITY DEFINER`, 89 RPC `SECURITY DEFINER` exécutables par `authenticated`, alertes liées aux sessions anonymes et protection des mots de passe compromis désactivée.
- Performance : 56 occurrences de politiques permissives multiples, 7 clés étrangères sans index couvrant, 20 index signalés inutilisés, 1 index dupliqué sur `communes.slug`, et 2 politiques avec initplan Auth à optimiser.
- Les avertissements de fonctions `SECURITY DEFINER` ne prouvent pas à eux seuls une vulnérabilité : les fonctions privilégiées inspectées imposent des gardes métier/MFA. La revue des 89 fonctions reste toutefois à terminer individuellement.
- Aucun index n'a été supprimé/ajouté et aucune politique n'a été modifiée : ces opérations exigent une migration réconciliée et des tests de charge/non-régression.

### Statut de validation et limites
- Workflow GitHub #82 : **success** sur le commit `7c24ffd2d295cd3ae97edf9b9bf732d37f9161fa`.
- Les contrôles CI valident les tests JavaScript et le `deno check` des six Edge Functions ; ils ne constituent pas une recette RLS réelle.
- Aucun SQL DDL/DML, changement d'ACL, changement de politique, déploiement Supabase/Cloudflare ou fusion dans `main`.
- Les 81 migrations Supabase restent non réconciliées avec leurs sources historiques ; aucune migration ne doit être rejouée à ce stade.


## Constat bloquant — contrôle paie AAL1 (19 novembre 2026, 05:15 UTC)

**Sévérité : élevée — vulnérabilité potentielle confirmée par analyse statique du chemin d'exécution, non exploitée pendant l'audit.**

La surcharge `private.paie_garde(p_roles text[])` contient ce contrôle :
`if c is null or (select private.my_role()) <> all (p_roles) or not private.hors_maintenance() then raise ...`

Or `private.my_role()` renvoie volontairement `NULL` pour un profil `super_admin` lorsque le JWT est au niveau AAL1. En PL/pgSQL, une condition `IF` évaluée à `NULL` n'entre pas dans la branche `THEN`. Si le profil a une commune active et que la commune n'est pas en maintenance, `private.hors_maintenance()` vaut vrai : la condition complète peut donc rester `NULL` et la garde renvoie la commune au lieu de refuser.

Le chemin sensible est concret :
- `public.paie_payer(p_paie,p_date,p_ref)` est `SECURITY DEFINER` et exécutable par `authenticated`.
- Cette RPC appelle précisément la surcharge vulnérable avec `private.paie_garde(array['maire','finances'])`.
- Elle met ensuite à jour une paie ordonnancée en `paye`, sans contrôle de rôle supplémentaire.
- La base comporte actuellement un profil `super_admin` actif rattaché à une commune active, sans maintenance active ; une paie ordonnancée existe dans cette commune.

**Conclusion :** un jeton `super_admin` AAL1 pourrait appeler directement `paie_payer` et franchir le contrôle de rôle, sous les conditions ci-dessus. Aucun appel de ce type n'a été exécuté ni observé ; aucune paie n'a été modifiée pendant l'audit.

### Correction proposée — ne pas exécuter directement
La garde doit récupérer le rôle une seule fois et refuser explicitement `NULL` :
`declare c uuid := private.my_commune(); r text := private.my_role();`
puis :
`if c is null or r is null or not (r = any (p_roles)) or not private.hors_maintenance() then raise exception 'Accès refusé' using errcode='42501'; end if;`

Le refus explicite de `r is null` supprime l'ambiguïté SQL trois-valued logic. Il faut conserver les rôles autorisés `maire` et `finances` sans ouvrir le droit au rôle `super_admin`.

### Vérifications obligatoires avant déploiement
1. Retrouver la source SQL historique exacte de `private.paie_garde(text[])` et la migration qui l'a créée/modifiée ; elles ne sont pas actuellement réconciliées dans le dépôt.
2. Préparer une migration corrective versionnée uniquement après réconciliation des 81 migrations.
3. Tester avec des JWT réels : `super_admin` AAL1 refusé (42501), `super_admin` AAL2 refusé par cette garde de paiement, rôle `adjoint` refusé, `maire` et `finances` autorisés selon les règles métier et l'état de la paie.
4. Tester qu'une paie d'une autre commune reste inaccessible et que les statuts autres que `ordonnance` ne sont pas modifiés.
5. Vérifier les logs et l'audit métier après déploiement contrôlé.

**Mesure prise :** aucune modification SQL, aucun changement d'ACL, aucun déploiement et aucune donnée modifiée. Ce constat devient un bloqueur explicite avant fusion de la PR et avant toute validation de sécurité paie.
