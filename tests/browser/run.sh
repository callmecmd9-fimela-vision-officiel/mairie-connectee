#!/usr/bin/env bash
# Lance, sur une base PostgreSQL JETABLE, le test d'intégration SQL (59 assertions) puis le test navigateur
# Super Admin / Admin mairie. Aucune connexion à Supabase ni à la production.
# Prérequis : Node 20+, Playwright + Chromium, `npm i pg` (voir package.json), PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE.
# Sans Docker : cluster local éphémère, socket Unix uniquement (aucun port réseau) :
#   D=$(mktemp -d); chown postgres "$D"; su postgres -c "initdb -D $D/data -A trust -U postgres && pg_ctl -D $D/data -o \"-c listen_addresses='' -k $D\" -w start"
#   export PGHOST=$D PGPORT=5432 PGUSER=postgres PGPASSWORD=x PGDATABASE=postgres
set -euo pipefail
: "${PGHOST:?}" "${PGPORT:?}" "${PGUSER:?}" "${PGPASSWORD:?}" "${PGDATABASE:?}"
case "$PGDATABASE" in *prod*|*production*) echo "REFUS : base de production"; exit 2;; esac
case "$PGHOST" in *supabase*|*pooler*) echo "REFUS : hôte Supabase"; exit 2;; esac
cd "$(cd "$(dirname "$0")" && pwd)/../.."
export PGSSLMODE=disable
bash tests/postgres/roles-admin-mairie-integration.sh
psql -X -v ON_ERROR_STOP=1 -q -f tests/browser/seed.sql
node tests/browser/mairie-roles-ui.test.js
