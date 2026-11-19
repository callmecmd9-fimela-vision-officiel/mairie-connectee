const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20261119090000_ia_usage_atomic_reservations.sql"), "utf8").toLowerCase();
const handler = fs.readFileSync(path.join(root, "supabase/functions/ia-texte/index.ts"), "utf8");

function body(name) {
  const start = migration.indexOf(`create or replace function public.${name.toLowerCase()}`);
  assert.notEqual(start, -1, `RPC absente : ${name}`);
  const end = migration.indexOf("$function$;", start);
  assert.notEqual(end, -1, `fin RPC absente : ${name}`);
  return migration.slice(start, end);
}

const reserve = body("ia_usage_reserver");
assert.match(reserve, /security\s+definer/);
assert.match(reserve, /set\s+search_path\s+to\s+''/);
assert.match(reserve, /pg_advisory_xact_lock/);
assert.match(reserve, /n\s*=\s*n\s*\+\s*1/);
assert.match(reserve, /n\s*<\s*p_limite/);
assert.match(reserve, /expires_at\s*<=\s*pg_catalog\.now\(\)/);
assert.match(reserve, /return\s+null/);

const finalize = body("ia_usage_finaliser");
assert.match(finalize, /security\s+definer/);
assert.match(finalize, /set\s+search_path\s+to\s+''/);
assert.match(finalize, /pg_advisory_xact_lock/);
assert.match(finalize, /for\s+update/);
assert.match(finalize, /if\s+not\s+p_succes\s+then/);
assert.match(finalize, /greatest\(n\s*-\s*1,\s*0\)/);
assert.match(finalize, /delete\s+from\s+private\.ia_usage_reservations/);

assert.match(migration, /enable\s+row\s+level\s+security/);
assert.match(migration, /revoke\s+all\s+on\s+table\s+private\.ia_usage_reservations\s+from\s+public,\s*anon,\s*authenticated,\s*service_role/);
assert.match(migration, /revoke\s+all\s+on\s+function\s+public\.ia_usage_reserver[\s\S]*?from\s+public,\s*anon,\s*authenticated/);
assert.match(migration, /grant\s+execute\s+on\s+function\s+public\.ia_usage_reserver[\s\S]*?to\s+service_role/);
assert.match(migration.trimEnd(), /commit;$/);

const reserveCall = handler.indexOf('admin.rpc("ia_usage_reserver"');
const providerCall = handler.indexOf('await fetch("https://api.anthropic.com/v1/messages"');
const finalizeCall = handler.indexOf('admin.rpc("ia_usage_finaliser"');
assert.ok(reserveCall > -1 && providerCall > reserveCall, "la réservation doit précéder l'appel fournisseur");
assert.ok(finalizeCall > reserveCall, "la réservation doit être finalisée après création");
assert.match(handler, /p_limite:\s*LIMITE_JOUR/);
assert.match(handler, /p_succes:\s*success/);
assert.match(handler, /AbortSignal\.timeout\(120_000\)/);
assert.doesNotMatch(handler, /from\("ia_usage"\)\.select\("n"\)/);
assert.doesNotMatch(handler, /from\("ia_usage"\)[\s\S]{0,120}upsert\(/);

console.log("OK  réservation IA atomique : verrou transactionnel et plafond concurrent");
console.log("OK  finalisation : succès conservé, échec libéré, expiration des réservations");
console.log("OK  RPC privées à service_role et consommateur Edge Function synchronisé");
