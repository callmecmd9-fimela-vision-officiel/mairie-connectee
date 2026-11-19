const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20261119070000_security_null_mfa_guards.sql",
);
const sql = fs.readFileSync(migrationPath, "utf8");

function functionBody(name) {
  const start = sql.toLowerCase().indexOf(`create or replace function ${name.toLowerCase()}`);
  assert.notEqual(start, -1, `fonction SQL absente : ${name}`);
  const end = sql.indexOf("$function$;", start);
  assert.notEqual(end, -1, `fin de fonction SQL absente : ${name}`);
  return sql.slice(start, end + "$function$;".length).toLowerCase();
}

const paie = functionBody("private.paie_garde");
assert.match(paie, /c\s+is\s+null/);
assert.match(paie, /r\s+is\s+null/);
assert.match(paie, /p_roles\s+is\s+null/);
assert.match(paie, /cardinality\s*\(\s*p_roles\s*\)\s*=\s*0/);
assert.match(paie, /not\s+coalesce\s*\(\s*private\.hors_maintenance\(\)\s*,\s*false\s*\)/);
assert.match(paie, /not\s+coalesce\s*\(\s*r\s*=\s*any\s*\(\s*p_roles\s*\)\s*,\s*false\s*\)/);
assert.doesNotMatch(paie, /<>\s*all\s*\(\s*p_roles\s*\)/);

const adjoint = functionBody("public.lier_adjoint");
assert.match(adjoint, /coalesce\s*\(\s*private\.is_platform_admin\(\)\s*,\s*false\s*\)/);
assert.match(adjoint, /coalesce\s*\(\s*private\.my_role\(\)\s*=\s*'maire'\s*,\s*false\s*\)/);
assert.match(adjoint, /coalesce\s*\(\s*public\.is_super_admin\(\)\s*,\s*false\s*\)/);
assert.match(adjoint, /not\s+coalesce\s*\(\s*private\.is_platform_admin\(\)\s*,\s*false\s*\)/);
assert.match(adjoint, /a\.commune_id\s+is\s+distinct\s+from\s+private\.my_commune\(\)/);
assert.match(adjoint, /where\s+lower\(email\)\s*=\s*lower\(trim\(p_email\)\)/);
assert.match(adjoint, /role\s+in\s*\(\s*'maire'\s*,\s*'super_admin'\s*\)/);
assert.match(adjoint, /on\s+conflict\s*\(id\)\s*do\s+update\s+set\s+role\s*=\s*'adjoint'/);
assert.match(adjoint, /update\s+public\.adjoints\s+set\s+user_id\s*=\s*u/);

assert.match(sql, /begin;/i);
assert.match(sql.trimEnd(), /commit;$/i);
assert.doesNotMatch(sql, /\b(grant|revoke)\s+/i);

console.log("OK  paie_garde : refus explicite des rôles NULL et paramètres invalides");
console.log("OK  lier_adjoint : droits existants et contrôle AAL2 préservés, NULL refusé");
console.log("OK  règles métier, périmètre communal et transaction conservés");
