# DECISIONS

- **Pas de liste de communes côté citoyen** (fuite audit 2) : résolution par lien/QR, mémorisation, sous-domaine ; saisie de code masquée dans un `<details>`.
- **Manifest dynamique côté client (blob)** plutôt qu'un Worker : aucun changement de déploiement. Si la CSP bloque `blob:` en `manifest-src`, repli automatique sur le manifest statique.
- **Blason public** : bucket `identite` dédié (public, 300 Ko, images seulement) ; le bucket `medias` reste privé. Publication par bouton (copie), pas de duplication automatique.
- **Couleur** : refusée côté citoyen si trop claire (texte blanc illisible).
- **QR hébergé** (`/js/qr.js`) : pas de CDN, compatible CSP `script-src 'self'`.
- **Droits anon retirés** sur 12 tables internes : défense en profondeur ; seules les RPC publiques restent exécutables par anon.
- **Non fait volontairement** : chargement de `core.js load()` en deux temps (risque de régression sur les vues qui lisent adjoints/projets) ; fusion des policies permissives ; suppression de l'index doublon et de `bright-worker` (accord requis).
- **Non audités** (absents des docs du Project) : `index.html`, `mairie.html`, `_headers`, CSS citoyen, `supabase.js` côté fichiers HTML.
