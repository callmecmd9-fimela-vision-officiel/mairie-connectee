#!/usr/bin/env bash
# Applique les migrations de supabase/production-ready/ UNE PAR UNE, dans l'ordre. NE RIEN LANCER sans autorisation du propriétaire.
# Usage : CONFIRM_PROD=oui SUPABASE_DB_URL='postgresql://…' bash scripts/deploy/apply-migrations.sh [--dry-run]
set -euo pipefail
cd "$(dirname "$0")/../.."
[ "${CONFIRM_PROD:-}" = "oui" ] || { echo "REFUS : CONFIRM_PROD=oui requis (aucune action sur la production sans autorisation)."; exit 2; }
: "${SUPABASE_DB_URL:?URL de connexion Postgres requise}"
for f in supabase/production-ready/0*.sql; do
  echo "→ $f"
  [ "${1:-}" = "--dry-run" ] && { echo "  (dry-run : non exécuté)"; continue; }
  psql "$SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f "$f"
done
echo "Terminé. Vérifier ensuite : supabase migration list"
