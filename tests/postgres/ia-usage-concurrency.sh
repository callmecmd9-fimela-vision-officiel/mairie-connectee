#!/usr/bin/env bash
set -euo pipefail

: "${PGHOST:?}" "${PGPORT:?}" "${PGUSER:?}" "${PGPASSWORD:?}" "${PGDATABASE:?}"
export PGSSLMODE=disable
psql=(psql -X -v ON_ERROR_STOP=1 -Atq)

"${psql[@]}" <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema if not exists private;
create table public.ia_usage (
  user_id uuid not null,
  jour date not null,
  n integer not null default 0,
  primary key (user_id, jour)
);
SQL

"${psql[@]}" -f supabase/migrations/20261119090000_ia_usage_atomic_reservations.sql

user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
jour='2026-11-19'
limit=7
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# 32 connexions PostgreSQL concurrentes se disputent exactement 7 unités.
for i in $(seq 1 32); do
  (
    "${psql[@]}" -c "select coalesce(public.ia_usage_reserver('$user_id', '$jour', $limit)::text, 'DENIED')" >"$tmp/$i"
  ) &
done
wait

granted="$(grep -hvc '^DENIED$' "$tmp"/* | awk '{s+=$1} END {print s+0}')"
denied="$(grep -hc '^DENIED$' "$tmp"/* | awk '{s+=$1} END {print s+0}')"
[[ "$granted" -eq "$limit" ]] || { echo "FAIL: granted=$granted expected=$limit"; exit 1; }
[[ "$denied" -eq 25 ]] || { echo "FAIL: denied=$denied expected=25"; exit 1; }

# Échec fournisseur : libération idempotente et possibilité de réutiliser une unité.
reservation=""
for result_file in "$tmp"/*; do
  candidate="$(cat "$result_file")"
  if [[ "$candidate" != "DENIED" && -n "$candidate" ]]; then reservation="$candidate"; break; fi
done
[[ -n "$reservation" && "$reservation" != "DENIED" ]]
"${psql[@]}" -c "select public.ia_usage_finaliser('$reservation', false)" >/dev/null
"${psql[@]}" -c "select public.ia_usage_finaliser('$reservation', false)" | grep -qx 'f'
retry="$("${psql[@]}" -c "select coalesce(public.ia_usage_reserver('$user_id', '$jour', $limit)::text, 'DENIED')")"
[[ "$retry" != "DENIED" && -n "$retry" ]]

count="$("${psql[@]}" -c "select n from public.ia_usage where user_id='$user_id' and jour='$jour'")"
[[ "$count" -eq "$limit" ]] || { echo "FAIL: final counter=$count expected=$limit"; exit 1; }

# Succès fournisseur : le quota reste consommé après finalisation.
"${psql[@]}" -c "select public.ia_usage_finaliser('$retry', true)" | grep -qx 't'
"${psql[@]}" -c "select public.ia_usage_finaliser('$retry', true)" | grep -qx 'f'
count="$("${psql[@]}" -c "select n from public.ia_usage where user_id='$user_id' and jour='$jour'")"
[[ "$count" -eq "$limit" ]] || { echo "FAIL: successful usage was not retained (n=$count)"; exit 1; }

echo "PASS: 32 concurrent reservations, strict cap=$limit, idempotent failure release, successful finalization."
