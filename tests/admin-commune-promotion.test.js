// Promotion automatique des admins de mairie activés en super_admin de leur commune (jamais global).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sql = fs.readFileSync(path.join(__dirname, "..", "supabase/migrations/20261123120000_admin_mairie_actif_vers_admin_commune.sql"), "utf8").replace(/--.*$/gm, "");
assert.match(sql, /new\.role::text = 'admin_mairie' and coalesce\(new\.actif, false\) and new\.commune_id is not null/);
assert.match(sql, /new\.role := 'super_admin'/);
assert.match(sql, /set search_path = ''/);
assert.match(sql, /revoke all on function private\._admin_mairie_actif_vers_admin_commune\(\) from public, anon, authenticated/);
assert.doesNotMatch(sql, /platform_admins/, "aucun accès plateforme (global) n'est accordé");
console.log("OK   promotion admin_mairie activé -> super_admin de sa commune (déclencheur borné)");
