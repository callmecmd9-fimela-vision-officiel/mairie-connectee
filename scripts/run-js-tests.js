// npm test : lance tous les tests JS (mêmes fichiers que la CI) et affiche chaque échec.
const { spawnSync } = require("node:child_process"), fs = require("node:fs"), path = require("node:path");
const root = path.join(__dirname, "..");
const files = [...fs.readdirSync(path.join(root, "tests")).filter(f => f.endsWith(".test.js")).sort().map(f => "tests/" + f), "js/smoke.js", "js/bandeau.test.js"].filter(f => fs.existsSync(path.join(root, f)));
let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [f], { cwd: root, encoding: "utf8" });
  if (r.status === 0) console.log("PASS", f);
  else { failed++; console.log("FAIL", f); console.log((r.stdout + r.stderr).split("\n").slice(-8).join("\n")); }
}
console.log(failed ? `${failed} échec(s) sur ${files.length}` : `${files.length} fichiers de test : tout est vert`);
process.exit(failed ? 1 : 0);
