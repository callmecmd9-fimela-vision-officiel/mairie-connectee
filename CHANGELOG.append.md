
## Lot 7 — Informations et accessibilité (portail citoyen)
- Base : `20261123_lot7_infos.sql` — `publications.categorie` (actualité/communiqué/avis/événement), `projets.public` (défaut false), RPC `projets_publics(slug)`, `actualites` renvoie la catégorie.
- Citoyen : section « Travaux et projets », badge de catégorie, « Envoi en cours… », lien « Aller au contenu », `h1` par écran.
- Mairie : type de publication ; bouton « Visible citoyens / Masqué » sur chaque projet.
- Tests : `tests/citoyen-info.test.js` (5). Tous OK + smoke.

## Lot 8 — Audit sécurité et tests
- Audit statique des 6 migrations + `index.ts` : toutes les RPC publiques résolvent la commune par slug côté serveur ; RLS personnel filtrée par `profiles.commune_id` ; droits anon retirés sur les tables internes ; `creer_rdv` réservé aux connectés (anonyme + captcha).
- `tests/isolation_test.sql` (à lancer dans Supabase) : accès croisés commune/commune.
