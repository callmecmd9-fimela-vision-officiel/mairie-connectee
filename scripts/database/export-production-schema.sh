#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Read-only schema export for the Fimela Vision production project.
# This script never applies migrations, writes SQL to the database, or exports rows.

readonly PROJECT_REF="aiqegpijisspankpkwfj"
readonly PROJECT_NAME="fimela-vision-officiel"
readonly OUTPUT_DIR="database-private"

fail() { printf 'ERREUR: %s\n' "$*" >&2; exit 1; }

command -v supabase >/dev/null 2>&1 || fail "Supabase CLI absent. Installe et authentifie Supabase CLI v3."
command -v bash >/dev/null 2>&1 || fail "Bash est requis."
command -v docker >/dev/null 2>&1 || fail "Docker CLI absent. supabase db dump utilise un conteneur pg_dump."
docker info >/dev/null 2>&1 || fail "Docker Engine indisponible. Lance Docker sur un poste compatible avant l'export."

version="$(supabase --version 2>/dev/null | head -n 1 || true)"
[[ "$version" =~ ^[[:space:]]*3\.[0-9]+\.[0-9]+ ]] || fail "Supabase CLI v3 requis (version détectée: ${version:-inconnue}). Ne pas exécuter avec CLI v2 sans adapter et vérifier les options."

if [[ ! -f "supabase/config.toml" ]]; then
  fail "Lance ce script depuis la racine du dépôt mairie-connectee (supabase/config.toml introuvable)."
fi

configured_ref="$(sed -nE 's/^[[:space:]]*project_id[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' supabase/config.toml | head -n 1)"
[[ "$configured_ref" == "$PROJECT_REF" ]] || fail "Le project_id de supabase/config.toml ne correspond pas à la production attendue."
[[ "$PROJECT_NAME" == "fimela-vision-officiel" ]] || fail "Garde-fou projet invalide."

mkdir -p "$OUTPUT_DIR"
chmod 700 "$OUTPUT_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="$OUTPUT_DIR/production-schema-$stamp.sql"
[[ ! -e "$output" ]] || fail "Le fichier existe déjà: $output"

tmp="$(mktemp "$OUTPUT_DIR/.schema-export.XXXXXX")"
trap 'rm -f "$tmp"' EXIT

printf 'Cible vérifiée : %s (%s)\n' "$PROJECT_NAME" "$PROJECT_REF"
printf 'Export demandé : schéma uniquement, sans lignes métier ni migration appliquée.\n'
printf 'Authentification Supabase requise. Aucune commande de modification ne sera lancée.\n'

# Supabase CLI v3 uses --remote=<ref>; db dump is schema-only by default.
# Do not add --data-only, --role-only, --yes, db push, or migration commands here.
supabase db dump --remote="$PROJECT_REF" --file="$tmp"

[[ -s "$tmp" ]] || fail "Le dump est vide."
grep -q '^-- PostgreSQL database dump' "$tmp" || fail "En-tête pg_dump absent: export non reconnu."
if grep -Eq '^(COPY .* FROM stdin;|INSERT INTO )' "$tmp"; then
  fail "Des instructions d'insertion de données ont été détectées. Export refusé."
fi

if command -v sha256sum >/dev/null 2>&1; then
  digest="$(sha256sum "$tmp" | awk '{print $1}')"
elif command -v shasum >/dev/null 2>&1; then
  digest="$(shasum -a 256 "$tmp" | awk '{print $1}')"
else
  fail "sha256sum ou shasum requis pour vérifier l'intégrité."
fi

chmod 600 "$tmp"
mv "$tmp" "$output"
trap - EXIT
printf '%s  %s\n' "$digest" "$(basename "$output")" > "$output.sha256"
chmod 600 "$output.sha256"

printf '\nExport terminé.\nFichier : %s\nSHA-256 : %s\n' "$output" "$digest"
printf 'Le dump reste local et ignoré par Git. Ne le restaure pas directement en production.\n'
