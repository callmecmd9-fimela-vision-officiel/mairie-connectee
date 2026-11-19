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
