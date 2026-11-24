#!/bin/sh
# À lancer à la racine d'un clone de mairie-connectee, après avoir décompressé cette archive dessus.
set -e
git add supabase/proposed/20261124_paiements_taxes_portail_fiscal.sql supabase/proposed/20261124_signalements_back_office_mairie.sql supabase/proposed/20261125_demarches_paiements_quittances.sql
git commit -m "chore(supabase): ajouter les 3 scripts SQL proposés absents du dépôt (paiements, signalements, démarches/quittances)"
git push origin main
