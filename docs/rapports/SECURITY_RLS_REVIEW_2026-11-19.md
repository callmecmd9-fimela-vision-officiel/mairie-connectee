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


## Addendum de précision — surcharge paie et appelant résiduel (19 novembre 2026, 05:25 UTC)

La relecture complète des surcharges et des appelants corrige la formulation du constat précédent et localise le défaut avec davantage de précision.

### Deux surcharges distinctes observées en production
1. `private.paie_garde(text[])` — ancienne surcharge, vulnérable à la logique `NULL` décrite ci-dessus :
   `if c is null or (select private.my_role()) <> all (p_roles) or not private.hors_maintenance() then ...`
2. `private.paie_garde(text[], text)` — surcharge plus récente, déjà durcie :
   elle affecte `r := private.my_role()` puis rejette explicitement `r is null`, et vérifie soit le rôle listé, soit le droit organisationnel correspondant.

### Appelants vérifiés
Le catalogue PostgreSQL a été interrogé pour identifier toutes les fonctions contenant un appel à `paie_garde(`. Parmi les opérations métier du module paie :
- `paie_generer`, `paie_maj_ligne`, `paie_ordonnancer`, `paie_retour_brouillon` et `paie_valider` appellent la surcharge récente à deux paramètres.
- **`paie_payer` est le seul appelant métier qui utilise encore la surcharge historique à un paramètre**, avec `array['maire','finances']`.
- `paie_payer` est `SECURITY DEFINER` et son droit EXECUTE est accordé à `authenticated`.
- Les deux surcharges internes ne sont pas directement exécutables par `authenticated` ; le risque provient de leur invocation depuis la RPC privilégiée `paie_payer`.

### Portée de la correction à préparer
La correction la plus ciblée à étudier est de faire appeler à `paie_payer` la surcharge déjà durcie à deux paramètres, avec la liste de rôles métier inchangée (`maire`, `finances`) et une action cohérente (`payer`). La suppression de l'ancienne surcharge ne devra être envisagée qu'après vérification exhaustive de ses références et de ses dépendances. Ne pas remplacer la logique par un accès `super_admin` implicite : cette opération doit rester soumise à la séparation des rôles métier.

Le catalogue ne montre actuellement aucune ligne de droit organisationnel `paie` dans `org_role_droits` ; les rôles explicites de la liste restent donc la voie d'autorisation observée. Cette donnée doit être recontrôlée dans la migration corrective et la recette.

### Contrôles croisés et limites
- Un profil super-admin actif rattaché à une commune active hors maintenance et une paie au statut `ordonnance` sont présents au moment de la lecture. Aucun identifiant nominatif ni montant n'est reproduit ici.
- Aucune exécution de `paie_payer`, aucun test de JWT de production et aucune mutation de donnée n'ont été effectués.
- Les autres triggers qui utilisent des contrôles permissifs de type `r is not null and r not in (...)` ont été repérés sur les tables actes, courrier, délégations, demandes, dossiers, instructions et sessions du conseil. Pour les tables examinées, les politiques RLS restrictives imposent également une session non anonyme, une commune et, selon les tables, `private.can(...)`. Le contrôle trigger ne doit donc pas être déclaré exploitable isolément : il faut vérifier les politiques complètes et les éventuels chemins service-role avant de conclure.
- Les six Edge Functions versionnées dans la branche ont été parcourues pour rechercher des mutations directes de ces tables ; aucun appel correspondant n'a été repéré dans ces six sources. Cela ne couvre pas les clés service-role externes, scripts d'exploitation ou intégrations non versionnées.

### Migration et traçabilité
Le catalogue Supabase expose 81 versions appliquées, dont notamment `20261115183608` (paie initiale), `20261117213250` (droits/postes paie), `20261117213634` (écritures droits/postes), `20261118083148` (audit des lignes paie) et `20261118083150` (séparation des tâches). Les sources SQL originales de ces versions n'ont pas encore été retrouvées et comparées octet par octet dans le dépôt. Le nom et la présence d'une version dans l'historique ne suffisent pas à reconstituer son contenu.


## Revue complémentaire des fonctions SECURITY DEFINER — point de durcissement à vérifier

Le triage du catalogue des fonctions SECURITY DEFINER exécutables par `authenticated` a identifié un helper qui mérite une vérification dédiée :

- `private.nb_pieces(p_uid text)` est `SECURITY DEFINER`, utilise un `search_path` vide, et retourne le nombre d'objets du bucket Storage `pieces` appartenant à l'identifiant fourni.
- Les rôles `authenticated` disposent actuellement de `USAGE` sur le schéma `private` et de `EXECUTE` sur cette fonction.
- Aucun appelant SQL externe à cette fonction n'a été retrouvé.
- L'état de configuration PostgREST (`pgrst.db_schemas`) n'est pas lisible via les paramètres SQL interrogés ; l'exposition effective du schéma `private` par l'API n'est donc pas établie.

**Qualification :** exposition potentielle de métadonnée (un compte authentifié pourrait apprendre un nombre de fichiers pour un identifiant fourni) uniquement si le schéma est exposé à l'API. Pas de preuve d'accès aux fichiers, à leurs noms ou à leur contenu. Pas de preuve que la fonction est appelable via l'API publique actuelle.

**Action recommandée après vérification de l'exposition API :** si `private` n'a pas besoin d'être exposé, le maintenir hors des schémas PostgREST exposés ; examiner ensuite si `EXECUTE` sur `private.nb_pieces(text)` doit être retiré à `authenticated`, après vérification des usages hors base (Edge Functions, scripts et clients). Aucun changement d'ACL ou de configuration n'a été appliqué.


## Nouveau constat — garde MFA AAL1 dans `public.lier_adjoint` (19 novembre 2026, 05:34 UTC)

**Sévérité : élevée — chemin d'escalade de rôle plausible et configuration prérequise présente ; aucun appel de mutation exécuté.**

La fonction `public.lier_adjoint(p_adjoint uuid,p_email text)` est `SECURITY DEFINER`, exécutable par `authenticated` et non exécutable par `anon`. Son contrôle initial est :

```sql
IF NOT (
  private.is_platform_admin()
  OR private.my_role() IN ('maire','super_admin')
) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
```

`private.my_role()` renvoie `NULL` pour un profil `super_admin` en AAL1. Si `private.is_platform_admin()` est faux, l'expression devient `NOT (FALSE OR NULL)`, donc `NULL`. Un `IF NULL` PL/pgSQL n'exécute pas la branche de refus.

Le contrôle suivant vérifie que l'adjoint demandé appartient à la commune de l'appelant, sauf administrateur plateforme. Il ne rétablit pas le contrôle AAL2 : pour un profil super-admin actif rattaché à cette même commune, `private.my_commune()` retourne cette commune et le contrôle passe.

### Présence du prérequis en production
Lecture agrégée du catalogue et des profils :
- 1 profil `super_admin` actif ;
- 1 profil `super_admin` actif rattaché à une commune ;
- ce profil n'a pas d'entrée active correspondante dans `platform_admins`.

Aucun identifiant de compte, adresse e-mail ou identifiant de commune n'est reproduit.

### Impact potentiel
Après franchissement de la garde, la fonction recherche un compte par e-mail, refuse seulement les profils déjà rattachés à une autre commune et les rôles `maire`/`super_admin`, puis crée ou remplace le profil cible par le rôle `adjoint` et lie l'enregistrement adjoint. Un jeton AAL1 du profil super-admin communal identifié pourrait donc potentiellement attribuer le rôle adjoint à un compte de sa commune, sans satisfaire AAL2. Cela constitue un risque d'escalade de privilèges et de modification non autorisée des affectations RH/organisationnelles.

### Correctif ciblé à préparer — ne pas exécuter en production
Remplacer le contrôle par une condition fail-closed, en capturant les valeurs une fois :
```sql
DECLARE
  v_platform_admin boolean := coalesce(private.is_platform_admin(), false);
  v_role text := private.my_role();
BEGIN
  IF NOT v_platform_admin
     AND v_role IS DISTINCT FROM 'maire'
     AND v_role IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE='42501';
  END IF;
  -- Pour super_admin, imposer en plus explicitement AAL2.
  IF v_role = 'super_admin'
     AND coalesce((SELECT auth.jwt()->>'aal'),'') <> 'aal2'
     AND NOT v_platform_admin THEN
    RAISE EXCEPTION 'MFA AAL2 requise' USING ERRCODE='42501';
  END IF;
```
La correction définitive devra être adaptée aux règles d'autorisation réelles (en particulier le traitement des administrateurs plateforme) et à la sémantique voulue de `is_super_admin()`. Ne pas copier ce fragment sans revue SQL complète.

### Tests requis avant toute livraison
1. Super-admin communal AAL1 : refus 42501, sans changement de profil ni de lien adjoint.
2. Super-admin AAL2 : autorisation uniquement dans le périmètre prévu.
3. Maire AAL1 : comportement métier conservé dans sa commune.
4. Agent/citoyen AAL1, utilisateur sans profil et profil inactif : refus.
5. Cible d'une autre commune, cible maire/super_admin et identifiant adjoint inexistant : refus sans mutation.
6. Vérifier l'audit et les contraintes d'unicité/liaison après chaque scénario dans une branche Supabase de recette.

### Mesures prises et dépendances
Aucune fonction n'a été appelée en mode mutation ; aucun rôle, profil ou lien adjoint n'a été modifié. Aucun SQL, ACL ou déploiement n'a été exécuté. Les sources historiques des migrations restent non réconciliées : aucune migration corrective ne doit être créée/appliquée en production avant récupération et comparaison des sources canoniques.


## État du correctif SQL ciblé — 19 novembre 2026, 06:52 UTC

Les définitions actives des fonctions ont été relues directement dans le catalogue PostgreSQL (pg_get_functiondef) afin de préparer un correctif aligné sur le code déployé, sans reconstruire les migrations historiques.

- Migration préparée dans la branche : `supabase/migrations/20261119070000_security_null_mfa_guards.sql`.
- `private.paie_garde(text[])` rejette explicitement le rôle NULL, un tableau de rôles NULL/vide, une comparaison `ANY` indéterminée et un état de maintenance NULL/faux. La surcharge à deux arguments n'est pas modifiée. Le rôle autorisé par `paie_payer` reste limité à `maire` et `finances`.
- `public.lier_adjoint(uuid,text)` conserve les trois voies d'autorisation prévues (administrateur plateforme, maire communal, super-administrateur AAL2) mais transforme les valeurs NULL en refus explicite. Le contrôle de portée intercommunale reste réservé à l'administrateur plateforme. Les vérifications d'e-mail, de commune, de rôle cible, l'upsert du profil et la liaison adjoint sont conservés.
- Aucun `GRANT`/`REVOKE`, changement de table, donnée, rôle ou profil n'est inclus dans la migration.
- Test statique ajouté : `tests/security-null-guards.test.js`. Il contrôle les gardes fail-closed, les voies d'autorisation conservées, la portée communale et l'absence de modification d'ACL.
- Workflow GitHub #94 : **succès** sur le commit `72df073b2749952bbce6f94583984aa778f5678c` ; suite JavaScript complète et vérification Deno des six Edge Functions réussies.

**Limite de validation :** le test SQL est statique ; aucun test transactionnel AAL1/AAL2 sur une base isolée n'a été possible sans branche Supabase payante. La migration est préparée sur la branche GitHub uniquement et **n'a pas été exécutée**. Elle ne doit pas être appliquée à la production avant une revue finale et une stratégie de recette compatible avec le plan gratuit.


## Audit complémentaire des RPC exposées, RLS et purge Storage — 19 novembre 2026, 07:05 UTC

### RPC SECURITY DEFINER accessibles sans session
Le Security Advisor recense 12 fonctions `public` exécutables par `anon`. Revue du code déployé pour les 12 entrées : ce sont des points de consultation publique à périmètre limité (résolution de commune par slug/hôte, identité et coordonnées publiques, démarches actives, actualités publiées, horaires/planning, créneaux futurs, projets explicitement publics et suivi par numéro de dossier). Les définitions examinées utilisent toutes `SET search_path TO ''` et ne permettent pas d'écriture.

Le suivi de dossier (`suivre_demande`, `suivre_demandes`) fonctionne comme un accès par secret porteur : le numéro est généré dans `creer_demande` avec `gen_random_uuid()` sans tirets (128 bits aléatoires), et le format est contrôlé par expression régulière. Les fonctions retournent un sous-ensemble de données de suivi, pas les pièces jointes ni les coordonnées du demandeur. La fonction batch borne l'entrée à 30 numéros. Aucun défaut exploitable confirmé dans ce contrôle statique ; conserver une surveillance des abus et des réponses contenant des données personnelles dans `reponse`.

### RPC SECURITY DEFINER authentifiées
Le conseiller recense 89 fonctions `SECURITY DEFINER` exécutables par `authenticated`. Ce nombre ne constitue pas 89 vulnérabilités : ces fonctions servent de couche métier/RPC et plusieurs appliquent des contrôles d'identité, de rôle, de commune et/ou AAL2. Exemples examinés :
- `admin_attribuer` vérifie `private.is_platform_admin()` (qui exige AAL2 et une entrée plateforme active), limite la liste de rôles, bloque les comptes plateforme/super-admin et interdit un transfert communal implicite.
- `admin_utilisateurs` limite la lecture des comptes à `private.is_platform_admin()`.
- `is_super_admin` exige un profil super-admin actif avec JWT AAL2 ou un administrateur plateforme validé AAL2.
- `_garde(p_commune)` exige `is_super_admin()` et vérifie le périmètre communal, sauf administrateur plateforme.
- Les fonctions privées de contrôle utilisent `search_path` vide.

Aucun `REVOKE EXECUTE` global n'a été appliqué : il casserait des appels métiers légitimes et les contrôles doivent être qualifiés fonction par fonction. Les ACL doivent rester minimales au niveau de chaque signature, et les fonctions internes ne doivent pas être rendues publiques par défaut.

### Accès direct anonyme aux tables
Inspection des privilèges effectifs sur toutes les tables `public` : le rôle SQL `anon` ne dispose que de `SELECT` sur `public.communes`; aucun droit direct `INSERT`, `UPDATE` ou `DELETE` n'a été trouvé pour `anon`. La table `communes` a RLS activé et ses politiques ciblent `authenticated`, sans politique `anon` : le privilège SQL seul ne donne donc pas accès aux lignes via le rôle `anon`.

Le Security Advisor signale de nombreuses politiques `TO authenticated` comme potentiellement accessibles aux utilisateurs authentifiés anonymes. Sur les tables sensibles vérifiées (profils, personnel, rémunérations, paies, lignes de paie, paiements, rôles d'organisation), les politiques restrictives `bloque_anonymes_*` vérifient le claim JWT `is_anonymous=false`; les autres politiques exigent également un profil, une commune ou un rôle/droit métier. `org_roles` a aussi une barrière restrictive dédiée. Les avertissements restants doivent être examinés table par table avant toute modification : le rôle Postgres `authenticated` inclut techniquement les sessions anonymes Supabase.

### Edge Function `purge-pieces`
La fonction active est configurée `verify_jwt=false`, mais son code refuse toute requête autre que POST sans en-tête `x-purge-secret`, puis appelle `public.pieces_orphelines(p_secret)`. Cette RPC `SECURITY DEFINER` a un `search_path` vide et n'est exécutable que par `service_role`/`postgres`; elle compare le secret à Vault avant de retourner au plus 200 objets du bucket privé `pieces` âgés de plus de 24 h et non référencés par `demandes.pieces`. La suppression est effectuée ensuite avec la clé service-role. Aucun accès anonyme à la RPC ou au bucket n'a été trouvé dans les privilèges inspectés.

**Point de vigilance opérationnel :** l'endpoint est volontairement sans JWT et dépend entièrement du secret Vault transmis par l'appelant planifié. Maintenir ce secret hors du dépôt, le faire tourner en cas de suspicion, et conserver la limite de méthode/secret. Ne pas changer `verify_jwt` sans adapter le mécanisme de planification.

### Décision
Aucun défaut supplémentaire exploitable n'a été confirmé dans ce lot. Aucun changement de permissions, RLS, fonction ou donnée de production n'a été effectué. Les alertes Advisor de fonctions SECURITY DEFINER et d'accès anonyme sont des indicateurs de surface d'attaque, pas des preuves individuelles de vulnérabilité. Le durcissement doit être ciblé et testé afin de ne pas interrompre le portail citoyen, les workflows métier ou les tâches planifiées.


## Audit complémentaire RLS Storage et sessions anonymes — 19 novembre 2026, 07:20 UTC

Cette passe est fondée sur une lecture des catalogues PostgreSQL (pg_policies, privilèges et définitions des helpers). Aucun objet Storage, fichier citoyen, profil ou contenu de demande n'a été téléchargé ; aucune politique ni donnée n'a été modifiée.

### Buckets Storage
Les cinq buckets observés (adjoints, archives, identite, medias, pieces) sont tous configurés **privés**. Les limites de taille et types MIME sont définis au niveau des buckets. Il n'existe donc pas d'accès public global par le seul paramètre public.

Exception fonctionnelle délimitée : la politique identite_published_assets_read autorise anon et authenticated à lire uniquement, dans le bucket privé identite, les chemins correspondant exactement à un UUID de commune suivi de blason.webp, bandeau.webp ou bandeau-m.webp. Cette règle correspond aux éléments d'identité destinés au portail public ; elle n'autorise ni la lecture générale du bucket ni les autres fichiers d'identité.

### Contrôles d'accès par bucket
- adjoints : dépôt/lecture limités à l'adjoint actif dans sa commune et son dossier ; gestion maire bornée à sa commune. Les règles de suppression contrôlent aussi le propriétaire pour l'adjoint.
- archives : accès par commune et rôles/droits ; le cabinet est exclu du sous-dossier confidentiel. Les politiques restrictives interdisent les mutations super-admin sur ce bucket.
- identite : dépôt, lecture, modification et suppression réservés aux profils communaux maire/cabinet/secrétariat, avec commune issue du profil et chemin de stockage correspondant.
- medias : écriture réservée aux rôles maire/cabinet/secrétariat ; lecture aux rôles municipaux prévus ; le premier segment du chemin doit correspondre à la commune active de la session.
- pieces : dépôt limité au propriétaire auth.uid(), à une commune en essai/active, à un chemin UUID de commune + UUID de fichier, aux extensions PDF/JPG/PNG/WEBP et à moins de trois objets déjà détenus par l'utilisateur. La lecture est réservée aux rôles municipaux autorisés dans la commune du chemin.

### Sessions anonymes et dépôt de pièces citoyennes
La politique pieces_depot cible authenticated et ne bloque pas explicitement le claim is_anonymous. C'est une différence intentionnelle à vérifier avec le parcours citoyen : la RPC creer_demande exige une session Auth (auth.uid() non NULL), vérifie que chaque pièce appartient à l'utilisateur appelant, que le premier segment correspond à la commune sélectionnée, et refuse les pièces dupliquées ou les chemins hors format. Les tables de demandes, elles, ont une politique restrictive bloque_anonymes_demandes ; la création passe par la RPC contrôlée plutôt que par une insertion directe RLS.

La fonction private.nb_pieces(text) compte les objets du bucket pieces pour le propriétaire donné ; elle est utilisée par la politique de dépôt pour appliquer la limite de trois fichiers. Le plafond est toutefois fondé sur un comptage avant insertion et n'est pas atomique : des dépôts concurrents par le même utilisateur pourraient théoriquement dépasser temporairement la limite. Cela relève d'un risque de quota/abus de stockage, pas d'une lecture de pièces par un tiers. Ne pas ajouter une barrière anti-anonyme avant d'avoir confirmé le parcours produit : cela pourrait casser la soumission citoyenne sans compte permanent.

### Tables publiques sans barrière restrictive anti-anonyme explicite
L'inventaire a isolé les tables dont les politiques authenticated ne contiennent pas de règle restrictive is_anonymous=false : abonnements, acces_sensibles, acces_techniques, citoyen_notifications, citoyens, compteurs, demarches, factures, ia_usage, org_affectations, org_agent_affectations, org_delegations_droits, org_postes, org_role_droits, plans, platform_admins, platform_audit, rdv_demandes, rdv_planning, reunion_participants et session_presences.

Ce résultat est un inventaire de revue, **pas une liste de vulnérabilités**. Les prédicats observés reposent selon les tables sur l'identité exacte auth.uid(), l'existence d'un profil actif et d'un rôle métier, une commune issue du profil, un droit plateforme AAL2, un droit organisationnel, ou une politique restrictive de rattachement à une réunion/session. Exemples :
- org_commune() renvoie NULL sans profil actif ; les politiques des tables d'organisation qui l'utilisent ne peuvent donc pas sélectionner une commune pour une session anonyme sans profil.
- private.can(...) renvoie false si aucun profil correspondant à auth.uid() n'existe.
- ia_usage possède une politique de refus total (false).
- citoyens limite l'accès à la ligne du même user_id et son WITH CHECK bloque les écritures anonymes ; citoyen_notifications limite lecture et mise à jour au même user_id.
- Les règles rendez-vous vérifient l'existence d'un profil dans la commune avec un rôle maire/cabinet/secrétariat.

La revue doit encore confirmer les scénarios de cycle de vie d'un compte anonyme (création de demande, notification éventuelle, conversion en compte permanent) avec un JWT de recette. Aucun test de session réelle ni mutation n'a été effectué sur la production.

### Qualification et suites
- Aucun accès anonyme non autorisé aux objets privés n'a été démontré dans les politiques inspectées.
- Les cinq buckets sont privés ; les trois fichiers d'identité publics sont précisément filtrés par nom de chemin.
- Le dépôt citoyen anonyme est un chemin fonctionnel plausible et doit être conservé tant que le portail le requiert ; il faut plutôt ajouter une limitation atomique/rate-limit adaptée si les tests confirment un risque de dépassement.
- Le comptage nb_pieces reste un helper dont l'exposition PostgREST effective n'a pas été établie. Ne pas révoquer ses ACL avant d'avoir confirmé le schéma API exposé et les dépendances.
- Aucun changement RLS, Storage, ACL, bucket, fonction ou donnée de production n'a été appliqué.


## Écart confirmé entre Edge Function IA déployée et code de la branche — 19 novembre 2026

### Constat de production
La version active de la fonction Supabase `ia-texte` est la **version 9** (JWT verification activée). Son code déployé a été lu directement dans la configuration de la fonction. Cette version :
- authentifie le JWT via `auth.getUser(token)` ;
- lit uniquement `role,commune_id` dans `profiles`, sans exiger explicitement `actif=true` ;
- accepte le rôle `super_admin` sans appeler `is_super_admin()` ni vérifier AAL2 ;
- lit et incrémente le quota `ia_usage` sans traiter les erreurs de lecture/écriture comme des refus.

Le premier point est une faiblesse d'autorisation confirmée : un profil désactivé conservant un rôle éligible peut encore satisfaire le contrôle de rôle de cette version ; un profil super_admin n'est pas soumis à la vérification MFA AAL2 dans cette fonction. La portée dépend des autres contrôles Auth/RLS et du statut réel des comptes, mais l'Edge Function elle-même ne respecte pas la règle d'accès attendue.

### État du correctif dans le dépôt
La branche `chore/ci-regression-tests` contient déjà le correctif source :
- `supabase/functions/ia-texte/authz.mjs` refuse les sessions absentes ou anonymes ;
- exige un profil présent avec `actif === true` ;
- limite les rôles communaux à maire/cabinet/secrétariat ;
- impose `caller.rpc("is_super_admin") === true` pour `super_admin` (échec fermé si erreur) ;
- vérifie l'état de la commune (essai/actif) et le rattachement communal ;
- l'index traite les erreurs de lecture et d'écriture du quota en 503.

Le test `tests/ia-texte-auth.test.js` couvre notamment le profil inactif, le refus sans AAL2, l'erreur RPC MFA, le périmètre communal et les communes suspendues. Le workflow CI vérifie également le typage Deno de toutes les Edge Functions.

### Risque opérationnel de divergence
Le correctif source n'est **pas** le code actuellement actif : production tourne encore sur la version 9 historique. Il existe donc un écart dépôt/production à résoudre par un déploiement contrôlé de la fonction `ia-texte`, après validation CI et vérification des secrets/configurations. Aucun déploiement n'a été réalisé pendant cet audit, conformément à la règle de non-déploiement.

### Quota IA
Le contrôle actuel reste un schéma lecture-puis-upsert non atomique : deux requêtes simultanées peuvent lire le même compteur et toutes deux écrire la même valeur suivante. Cela peut sous-compter la consommation et dépasser la limite quotidienne de 30 en cas de concurrence. Une correction robuste requiert une primitive atomique côté base (RPC dédiée ou upsert/incrément transactionnel), tests de concurrence et adaptation du consommateur ; ne pas bricoler ce compteur dans l'Edge Function seule.

### Mesures immédiates et limites
- Priorité élevée : planifier le déploiement contrôlé du code déjà corrigé de `ia-texte` ; ne pas modifier les secrets ni les autres fonctions.
- Avant déploiement : vérifier les secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, la disponibilité de `is_super_admin()` pour le rôle appelant, le chemin `authz.mjs` inclus dans l'artefact, puis exécuter les tests de non-régression.
- Ne pas déployer par ce lot : aucune validation fonctionnelle en production ni procédure de rollback n'a été exécutée.


### Vérification complémentaire du compteur IA en production — 19 novembre 2026

Lecture du schéma PostgreSQL de production (sans mutation) :
- `public.ia_usage` possède les colonnes `user_id uuid NOT NULL`, `jour date NOT NULL`, `n integer NOT NULL DEFAULT 0`.
- La clé primaire est exactement `(user_id, jour)`.
- RLS est activé et la politique observée pour `anon` et `authenticated` refuse toutes les opérations (`USING false`, `WITH CHECK false`).
- Les privilèges directs de table observés sont limités à `postgres` et `service_role` ; aucun droit direct n'est accordé à `anon` ou `authenticated`.

Conséquence de conception : une RPC de consommation atomique doit rester réservée à `service_role` et conserver l'isolation actuelle. Un simple incrément atomique exécuté après l'appel au fournisseur empêcherait la perte de mises à jour, mais ne limiterait pas le nombre d'appels IA lancés simultanément. Pour préserver la règle métier « seules les générations réussies sont comptabilisées » tout en bloquant les dépassements sous concurrence, le mécanisme robuste doit réserver atomiquement une unité avant l'appel externe, puis libérer cette réservation de façon idempotente en cas d'échec. Cette conception nécessite un identifiant de réservation unique et des tests de concurrence/échec ; elle ne doit pas être remplacée par un incrément naïf qui facturerait les échecs.

La migration de durcissement des gardes paie/adjoint présente sur la branche n'apparaît pas dans l'historique de production consulté : la dernière version enregistrée est `20261118230324`. La migration reste donc non appliquée. Aucun schéma, ACL, compteur, donnée, secret ou fonction de production n'a été modifié lors de cette vérification.


## Correctif quota IA atomique préparé sur la branche — 19 novembre 2026

Le correctif est désormais implémenté dans la branche, sans application en production :

- Migration `20261119090000_ia_usage_atomic_reservations.sql` : table privée de réservations, verrou transactionnel par utilisateur/jour, incrément atomique conditionné à `n < limite`, expiration des réservations abandonnées après une heure.
- RPC `ia_usage_reserver` : réserve une unité avant l'appel au fournisseur ; renvoie NULL lorsque le plafond est atteint.
- RPC `ia_usage_finaliser` : conserve l'unité si la génération aboutit, ou la libère si le fournisseur échoue / renvoie un résultat vide. L'opération est protégée contre les doubles finalisations.
- Les deux RPC sont SECURITY DEFINER avec search_path vide ; EXECUTE est révoqué à PUBLIC, anon et authenticated, puis accordé uniquement à service_role. La table privée n'accorde aucun privilège direct aux rôles API.
- L'Edge Function n'effectue plus de lecture suivie d'un upsert non atomique ; elle réserve avant l'appel IA et finalise ensuite. Les appels fournisseur sont limités à 120 secondes.

### Limites et garanties

Le verrou et l'UPDATE conditionnel empêchent deux requêtes simultanées de consommer la même dernière unité. Les réservations expirées sont purgées lors de la prochaine tentative du même utilisateur et du même jour ; une panne brutale peut donc retenir temporairement une unité, mais ne permet pas de dépasser le plafond. Si la finalisation échoue, la fonction renvoie 503 et ne présente pas la génération comme validée.

Le test statique `tests/ia-texte-quota.test.js` vérifie la cohérence migration/consommateur, les privilèges, le verrou, le plafond et l'ordre réservation-appel-finalisation. Il ne remplace pas un test PostgreSQL concurrent réel ; celui-ci reste requis avant toute migration de production.

**État opérationnel :** migration et code uniquement sur la branche `chore/ci-regression-tests`. Aucune migration appliquée, aucun déploiement Edge Function, aucune modification de secret ou de donnée de production.


## Validation PostgreSQL réelle — concurrence, paie, MFA et liaison adjoints — 19 novembre 2026

Les validations ont été exécutées dans GitHub Actions sur une instance PostgreSQL éphémère **PostgreSQL 17.12**. Cette base est indépendante du projet Supabase de production et est détruite à la fin du job.

### Quota IA atomique — résultat réussi
- 32 sessions PostgreSQL concurrentes ont tenté de réserver une unité pour le même utilisateur et le même jour, avec une limite de 7.
- Résultat observé : **7 réservations accordées, 25 refusées** ; le plafond n'a pas été dépassé.
- La libération après échec du fournisseur a décrémenté le compteur et a été idempotente (deuxième finalisation refusée).
- Une finalisation réussie a conservé l'unité consommée ; une deuxième finalisation a été refusée.
- Test : `tests/postgres/ia-usage-concurrency.sh`.

### Gardes paie et autorisations adjoints — résultat réussi
- `private.paie_garde` : refus vérifié pour commune NULL, rôle NULL, tableau de rôles NULL/vide, rôle non autorisé et mode maintenance ; accès valide pour le rôle autorisé et une commune définie.
- `public.lier_adjoint` : refus d'un appelant non autorisé ; liaison maire limitée à sa commune ; refus du ciblage intercommunal par un maire ; super-admin AAL1 refusé ; super-admin AAL2 autorisé dans le périmètre communal fourni ; administrateur plateforme AAL1 refusé et exception intercommunale conservée pour plateforme AAL2 ; refus d'un compte cible ayant le rôle maire.
- Test : `tests/postgres/security-guards-integration.sh`.

### Contrôle de portée et limites
- Les migrations candidates sont exécutées sur une base PostgreSQL isolée, avec des tables et fonctions auxiliaires de test qui simulent les claims Auth et les helpers Supabase. Les fonctions métier corrigées sont celles de la migration candidate.
- Le test SQL vérifie les décisions des gardes et leur comportement transactionnel, mais ne remplace pas un test HTTP avec de vrais JWT Supabase, facteurs TOTP et comptes de recette. Le parcours MFA de l'interface reste couvert par `tests/mairie-mfa.test.js`.
- La définition de production de `private.my_role()`, `private.my_commune()`, `private.is_platform_admin()`, `public.is_super_admin()` et `public.lier_adjoint` a été relue en lecture seule pour confirmer les règles AAL2 et le périmètre communal. Aucun SQL de mutation n'a été exécuté sur la production.
- La migration quota et la migration paie/adjoints restent non appliquées en production ; aucune Edge Function n'a été déployée.

### CI
- Workflow PostgreSQL concurrency integration **#18** : succès.
- Workflow Regression tests **#114** : succès — suite JavaScript complète et vérification Deno des six Edge Functions.
- Commit de branche validé : `f626a3376934bf60e6e87d5cd4b7a85b4abdd34d`.
