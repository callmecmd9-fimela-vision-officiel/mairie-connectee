// npm test : lance tous les tests JS (mêmes fichiers que la CI) et affiche chaque échec.
// Un test qui affiche "SKIP:" (ex. jsdom absent) n'est PAS un succès : il est signalé et fait échouer la CI.
const { spawnSync } = require("node:child_process"), fs = require("node:fs"), path = require("node:path");
const root = path.join(__dirname, "..");
const files = [...fs.readdirSync(path.join(root, "tests")).filter(f => f.endsWith(".test.js")).sort().map(f => "tests/" + f), "js/smoke.js", "js/bandeau.test.js"].filter(f => fs.existsSync(path.join(root, f)));
const color = process.stdout.isTTY && !process.env.NO_COLOR;
const yellow = s => (color ? `\x1b[33m${s}\x1b[0m` : s);
let passed = 0, failed = 0, skipped = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [f], { cwd: root, encoding: "utf8" });
  const out = (r.stdout || "") + (r.stderr || "") + (r.error ? "\n" + r.error.message : "");
  if (r.status !== 0) { failed++; console.log("FAIL", f); console.log(out.split("\n").slice(-8).join("\n")); }
  else if (out.includes("SKIP:")) {
    skipped++;
    console.log(yellow("SKIP"), f);
    console.log(out.split("\n").filter(l => l.includes("SKIP:")).map(l => "  " + yellow(l.trim())).join("\n"));
  } else { passed++; console.log("PASS", f); }
}
console.log(`${passed} réussi(s), ${failed} échec(s), ${skipped} ignoré(s) (SKIP) sur ${files.length} fichiers`);
if (skipped) console.error(yellow("ERREUR: Des tests ont été ignorés (SKIP). Installez les dépendances."));
process.exit(failed || skipped ? 1 : 0);
