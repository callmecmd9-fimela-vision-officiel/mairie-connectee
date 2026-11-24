#!/bin/sh
# À lancer à la racine d'un clone de mairie-connectee après avoir copié ces fichiers dessus.
set -e
git add index.html css/citoyen.css js/citoyen.js
git commit -m "feat(citoyen): paiement en deux gros boutons (Wave/Orange Money simulés), retrait de « Payer mes taxes », bouton Signaler à gauche"
git push origin main
