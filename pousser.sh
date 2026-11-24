#!/bin/sh
# À lancer à la racine d'un clone de mairie-connectee après avoir copié ces fichiers dessus.
set -e
git add index.html css/citoyen.css js/citoyen.js js/core.js js/actions.js js/demarches.js supabase/proposed
git commit -m "feat: paiement Wave/Orange Money (simulé), circuits administratifs (pièces/rejet motivé), démarches types, signalement via RPC; scripts SQL proposés"
git push origin main
