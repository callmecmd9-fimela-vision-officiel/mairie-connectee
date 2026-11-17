
## Lot D — délégations dans les menus, traçabilité, Mon poste (2026-11-17)
- `js/org-d.js` (nouveau, additif) : droits reçus par délégation visibles dans les menus ; chargement des tables sensibles pour un poste habilité (RLS inchangée) ; `org_tracer` à l'ouverture des écrans personnel, congés, paie, rémunérations, marchés (1 ligne / 15 min / utilisateur / écran) ; écrans « Mon poste », « Mes délégations » (non-maires), « Consultations sensibles » (maire).
- `20261127_lot_d.sql` : `org_tracer` durcie (search_path, anon révoqué, longueurs bornées), index du journal. Appliquée en base.
- `patch-orgd.js` : ajoute la balise org-d.js dans mairie.html (idempotent, .bak).
