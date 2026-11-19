# PROJECT_MASTER — Mairie Connectée (Fimela Vision)

> **Mise à jour 2026-11-19** : les scripts SQL numérotés de la racine (`20261114_…` à `20261127_…`), `patch-org.js`, `patch-orgd.js`, `js/patch-core.js`, `js/patch-lot4.js`, `js/lot4.block.js`, `js/core_patched.js` et `patched/` ont été retirés du dépôt (commits `57a9265`, `ccf33b3` ; ils restent consultables dans l'historique git). Les migrations de référence sont dans `supabase/migrations/` (voir `recovered-history-manifest.json`) ; toutes les consignes « copier / appliquer / déployer » ci-dessous sont **historiques** : le code est déployé et les migrations sont appliquées en base. Les fichiers `*.append.md` ont été consolidés dans `CHANGELOG.md`, `DECISIONS.md` et `TASKS.md`.


SaaS municipal multi-communes. Front statique (HTML/JS sans build) sur Cloudflare Workers (assets) + Supabase (Postgres/RLS, Auth, Storage, Edge Functions).

## Applications
| Chemin | Fichier | Public |
|---|---|---|
| `/` | index.html + js/citoyen.js | Citoyens (`/?c=slug`) |
| `/mairie` | mairie.html + core, adjoints, secretariat, superadmin, maire, demarches, actions | Personnel communal |
| `/saas` | saas.html + js/saas.js | Plateforme (MFA obligatoire) |

## Principes non négociables
- Commune = identifiée par **slug côté serveur** (RPC security definer). Jamais d'id de commune venant du navigateur.
- Données citoyen : numéros de suivi non devinables ; compte = lecture de ses seules données.
- RLS personnel filtrée par `profiles.commune_id` ; droits `anon` retirés sur les tables internes.
- Rien d'inventé : coordonnées, actualités, projets, créneaux viennent de la base.
- Retrait en mairie : jamais de téléchargement d'extrait officiel.

## Modules citoyens (état)
Lot 1-8 faits : accueil/identité, navigation, espace citoyen (SMS indisponible : dépôt sans compte actif), extrait guidé, rendez-vous (créneaux, annulation), infos (actualités par catégorie, projets publiés), accessibilité de base.

## Base (migrations dans l'ordre)
20261116_audit3 → 20261117_demarches_statuts → 20261119_citoyen_prenom → 20261120_lot5_statuts_retrait → 20261121_lot6_rdv → 20261122_lot6bis_creneaux → 20261123_lot7_infos → 20261124_catalogue

## Tests
`node tests/<nom>.test.js` pour chaque fichier ; `node tests/smoke.js` ; `enhance.test.js` exige `npm i jsdom` ; `tests/isolation_test.sql` à lancer dans Supabase.

## Documents liés
CHANGELOG.md, DECISIONS.md, TASKS.md, SETUP.md
