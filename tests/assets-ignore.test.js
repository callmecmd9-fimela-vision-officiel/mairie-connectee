const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rules = fs.readFileSync(path.join(__dirname, "..", ".assetsignore"), "utf8")
  .split(/\r?\n/).map(x => x.trim()).filter(Boolean);

for (const rule of [".github/", "supabase/", "*.mjs", "*.ts", "tests", ".assetsignore", "test-results/", "docs/", ".env.example", "database-private/"]) {
  assert.ok(rules.includes(rule), `règle d’exclusion manquante : ${rule}`);
}

assert.equal(fs.existsSync(path.join(__dirname, "..", " .assetsignore")), false,
  "le fichier .assetsignore mal nommé avec un espace initial ne doit pas subsister");

// Liste blanche (D-A1) : tout est exclu à la racine sauf ce qui est explicitement autorisé.
const iStar = rules.indexOf("/*");
assert.ok(iStar >= 0, "règle « /* » (exclusion par défaut) manquante");
const allowed = rules.slice(iStar + 1).filter(r => r.startsWith("!"));
assert.deepEqual(allowed.sort(), ["!/_headers", "!/confidentialite.html", "!/css/", "!/icon-*.png", "!/index.html", "!/js/", "!/mairie.html", "!/manifest-*.webmanifest", "!/saas.html", "!/sw.js"].sort(),
  "la liste blanche des fichiers publiés a changé : vérifier qu'aucun fichier sensible n'est ouvert");
for (const r of ["package.json", "package-lock.json"]) assert.ok(rules.includes(r), "règle d’exclusion manquante : " + r);

console.log("OK   sources Supabase, métadonnées CI et modules serveur exclus des assets Worker");
