# Catalogue du schéma Supabase — 19 novembre 2026

> Instantané de catalogue en lecture seule de la base de production. Il décrit l'état courant après les migrations enregistrées, pas le schéma initial antérieur à la première migration. Aucune donnée métier ni secret n'est exporté. **Ne pas exécuter ce document comme migration.**

## Source et méthode

- Projet : `aiqegpijisspankpkwfj` (`fimela-vision-officiel`)
- PostgreSQL : 17.11
- Historique Supabase : 81 migrations, de `20261114184306` à `20261118230324`.
- Sources : catalogues PostgreSQL (`information_schema`, `pg_catalog`, `pg_policies`, `pg_indexes`) et API de métadonnées Supabase.
- Contrôle complémentaire en lecture seule effectué le 19 novembre 2026 via la connexion Supabase : présence confirmée des trois tables fondamentales ci-dessous.
- Périmètre des métriques de contrôle : schémas applicatifs `public` et `private`, sauf indication contraire.

## Inventaire du schéma applicatif

| Élément | Nombre vérifié |
|---|---:|
| Tables `public` | 67 |
| Contraintes `public/private` | 419 |
| Index `public/private` | 165 |
| Policies RLS `public/private` | 305 |
| Triggers non internes `public/private` | 72 |
| Fonctions `public/private` | 158 |
| Vues / vues matérialisées `public/private` | 0 |
| Types enum `public/private` | 0 |
| Migrations enregistrées | 81 |

Les chiffres de contraintes, index, policies, triggers et fonctions sont issus d'une requête de contrôle exécutée directement sur les catalogues PostgreSQL. Ils ne doivent pas être confondus avec des décomptes incluant les schémas gérés par Supabase (`auth`, `storage`, `realtime`, `extensions`, etc.).

## Tables fondamentales observées

### `public.communes`

12 colonnes : `id uuid` (PK, `gen_random_uuid()`), `slug text` (unique, contrainte de format), `nom text`, `compteur integer` (défaut 0), `created_at timestamptz` (défaut `now()`), `cpt_instr integer` (0), `cpt_projet integer` (0), `statut text` (`'actif'`), `suspendu_motif text`, `sous_domaine text`, `domaine_perso text`, `admin_principal uuid`. RLS activé. Les clés étrangères entrantes relient notamment les données métier et les profils à la commune.

### `public.profiles`

7 colonnes : `id uuid` (PK et FK vers `auth.users(id)`), `commune_id uuid` (nullable, FK vers `public.communes(id)`), `role text` (défaut `'citoyen'`, contrainte sur les rôles applicatifs), `nom text`, `created_at timestamptz` (défaut `now()`), `service text`, `actif boolean` (défaut `true`). RLS activé.

### `public.indicateurs`

24 colonnes : `commune_id uuid` (clé de rattachement), `population integer` (0), `croissance numeric` (0), `villages integer` (0), `menages integer` (0), `agents integer` (0), `budget_annuel bigint` (0), `slogan text`, `devise text`, `blason text`, `photo_maire text`, `bandeau text`, `centre_lat double precision`, `centre_lng double precision`, `zoom integer` (11), `contact_tel text`, `contact_adresse text`, `contact_email text`, `site_web text`, `horaires text`, `departement text`, `region text`, `pays text`, `couleur text`.

## Limites et sécurité

- Ce catalogue est un instantané de métadonnées post-migrations ; ce n'est pas un dump SQL restaurable.
- Les 81 migrations historiques ont été récupérées et comparées à l'historique Supabase. La première migration suppose toutefois l'existence préalable de `public.profiles` et `public.indicateurs`.
- Le catalogue ne contient ni lignes métier, ni utilisateurs Auth, ni objets Storage, ni secrets ou paramètres sensibles du projet.
- Il ne constitue pas un baseline initial canonique et ne permet pas, à lui seul, de rejouer les migrations depuis une base vide.
- Une restauration doit être générée séparément puis testée sur une base isolée avant toute utilisation.
- Aucune migration, donnée, policy ou configuration de production n'a été modifiée pendant ces contrôles.
