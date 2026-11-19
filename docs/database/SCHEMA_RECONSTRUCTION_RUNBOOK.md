# Reconstruction contrôlée du schéma Supabase

## Décision technique

Le catalogue PostgreSQL enregistré dans [PRODUCTION_SCHEMA_CATALOG_2026-11-19.json](./PRODUCTION_SCHEMA_CATALOG_2026-11-19.json) est un instantané détaillé de la base après les migrations. Il n'est **pas** un dump SQL restaurable : un catalogue n'est pas un substitut à la sortie de `pg_dump`.

La voie de référence est un export natif `pg_dump` en mode schéma uniquement, via Supabase CLI. Il préserve les définitions SQL réelles et l'ordre de dépendances, au lieu de reconstruire les objets à partir d'hypothèses.

## Projet source vérifié

- Projet : `fimela-vision-officiel`
- Project ref : `aiqegpijisspankpkwfj`
- PostgreSQL : `17.11.0.018`
- Cible de l'export : projet de production, lecture seule.

## Export protégé depuis le dépôt

Depuis la racine du dépôt, avec Supabase CLI v3 installé et authentifié, lie d'abord le checkout au projet attendu (opération de configuration locale uniquement) :

```bash
supabase login
supabase link --project-ref=aiqegpijisspankpkwfj
bash scripts/database/export-production-schema.sh
```

Lors de `supabase link`, le mot de passe de base peut être laissé vide si la CLI le permet. Le script vérifie ensuite que `.temp/project-ref` correspond exactement au projet de production avant tout export.

Le script :
1. vérifie la version majeure de la CLI et le `project_id` local ;
2. fixe explicitement la cible au project ref de production connu ;
3. lance uniquement `supabase db dump --remote=<project-ref> --file=<fichier>` ;
4. vérifie l'en-tête PostgreSQL et refuse un fichier vide ou contenant des instructions de chargement de lignes ;
5. calcule un SHA-256 ;
6. écrit le dump dans `database-private/`, répertoire ignoré par Git et protégé en permissions locales.

Le script n'exécute ni `db push`, ni `migration`, ni `apply_migration`, ni requête DDL. Il ne modifie pas la base source. Le dump et son empreinte ne sont pas ajoutés au dépôt automatiquement.

## Pourquoi un dump natif est nécessaire

Le catalogue existant répertorie les tables, colonnes, contraintes, index, policies, triggers, fonctions, vues et types. Il ne constitue cependant pas un script DDL complet et autonome. Une restauration fidèle doit également préserver, entre autres, les séquences, les propriétés exactes des fonctions, les privilèges, les paramètres de sécurité, les dépendances d'extensions et les objets de schéma non couverts par une extraction manuelle.

Supabase CLI utilise `pg_dump` et exclut les schémas gérés par Supabase et les schémas créés par les extensions. Le dump par défaut ne contient pas les lignes de données ni les rôles personnalisés. Voir la [référence officielle `supabase db dump`](https://supabase.com/docs/reference/cli/supabase-db-dump) et le [guide de migration CLI v3](https://supabase.com/docs/guides/local-development/cli/migrating-to-v3).

## Contrôles après export

Avant de transformer le dump en baseline :

- conserver le fichier et son SHA-256 hors du dépôt ;
- inspecter les schémas et extensions attendus ;
- comparer les objets avec le catalogue JSON et les 81 migrations historiques ;
- identifier les objets Supabase gérés et les dépendances externes ;
- restaurer exclusivement sur une base locale/jetable compatible PostgreSQL 17 ;
- exécuter les tests de régression, les tests RLS et les tests de concurrence ;
- comparer le schéma restauré au catalogue de référence.

## Interdictions

- Ne jamais exécuter le dump sur la base de production.
- Ne jamais utiliser `supabase db reset --remote` sur la production.
- Ne jamais appliquer les migrations historiques sur la production pour « tester » le baseline.
- Ne pas intégrer le dump brut dans Git : il peut révéler des détails internes de fonctions, politiques et architecture.
- Ne pas considérer l'export de schéma comme une sauvegarde des données, des utilisateurs Auth, des fichiers Storage, des secrets ou des paramètres du projet.

## Statut

- [x] Catalogue de production récupéré en lecture seule.
- [x] Historique des migrations documenté.
- [x] Script d'export natif et protégé ajouté au dépôt.
- [ ] Export natif `pg_dump` obtenu depuis un environnement disposant de Supabase CLI v3 et de l'accès au projet.
- [ ] Baseline dérivée du dump et revue.
- [ ] Restauration à blanc sur PostgreSQL 17 isolé.
- [ ] Validation fonctionnelle/RLS complète.

La baseline ne sera générée qu'après réception et validation du dump natif. Aucune structure manquante ne sera inventée.
