// MFA obligatoire pour admin_mairie (front) ; garde serveur proposée exigeant aal2 ; pas d'élévation en super_admin.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const core = read("js/core.js");
assert.match(core, /\(p\.role === "super_admin" \|\| p\.role === "admin_mairie"\) && !\(await exigerMfaSuperAdmin\(\)\)/);
const prop = read("supabase/proposed/20261123_admin_mairie_mfa_serveur.sql");
assert.match(prop, /auth\.jwt\(\)->>'aal'\),''\)='aal2'/);
assert.match(prop, /NE PAS APPLIQUER/);
console.log("OK   MFA admin municipal (front obligatoire, garde serveur aal2 proposée)");
