const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rules = fs.readFileSync(path.join(__dirname, "..", ".assetsignore"), "utf8")
  .split(/\r?\n/).map(x => x.trim()).filter(Boolean);

for (const rule of [".github/", "supabase/", "*.mjs", "*.ts", "tests", ".assetsignore"]) {
  assert.ok(rules.includes(rule), `règle d’exclusion manquante : ${rule}`);
}

assert.equal(fs.existsSync(path.join(__dirname, "..", " .assetsignore")), false,
  "le fichier .assetsignore mal nommé avec un espace initial ne doit pas subsister");

console.log("OK   sources Supabase, métadonnées CI et modules serveur exclus des assets Worker");
