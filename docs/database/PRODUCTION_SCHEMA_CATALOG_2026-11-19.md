# Catalogue du schéma Supabase — 19 novembre 2026

> Instantané de catalogue en lecture seule de la base de production. Il décrit l'état courant, pas le schéma historique initial. Aucune donnée métier ni secret n'est exporté. **Ne pas exécuter ce document comme migration.**

## Source et méthode

- Projet : `aiqegpijisspankpkwfj` (`fimela-vision-officiel`)
- PostgreSQL : PostgreSQL 17.11 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 15.2.0, 64-bit
- Capturé : 2026-11-19T16:16:02.439059+00:00
- Sources : catalogues PostgreSQL (`information_schema`, `pg_catalog`, `pg_policies`, `pg_indexes`).
- Historique : 81 migrations, de `20261114184306` à `20261118230324`.

## Inventaire

| Élément | Nombre |
|---|---:|
| tables | 67 |
| constraints | 419 |
| indexes | 165 |
| policies | 305 |
| triggers | 163 |
| functions | 158 |
| views | 0 |
| types | 0 |
| extensions | 7 |
| migrations | 81 |

## Tables fondamentales observées

### public.communes

Introuvable.

### public.profiles

Introuvable.

### public.indicateurs

Introuvable.

### public.demandes

Introuvable.

### public.publications

Introuvable.

## Limites et sécurité

- Ce snapshot reflète la base après les migrations. Il ne reconstitue pas exactement l'état précédant la première migration enregistrée.
- Il ne contient ni lignes métier, ni utilisateurs Auth, ni objets Storage, ni secrets/configurations du projet.
- Il sert de référence vérifiable et de base de comparaison. Une restauration doit être générée séparément et testée sur une base isolée.
- Aucune migration, donnée, policy ou configuration de production n'a été modifiée.
