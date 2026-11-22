/* Interface unique filtrée par rôle : chaque poste a des modules, une phrase d'accueil et aucun module non couvert côté serveur. */
const assert = require("assert"), fs = require("fs");
const src = fs.readFileSync(__dirname + "/../js/core.js", "utf8");
const grab = n => { const i = src.indexOf("const " + n + " = "); let d = 0, j = src.indexOf("{", i), k = j; for (; k < src.length; k++) { if (src[k] == "{") d++; if (src[k] == "}") { d--; if (!d) break; } } return eval("(" + src.slice(j, k + 1) + ")"); };
const RP = grab("RP"), RSUB = grab("RSUB");
for (const r of ["cabinet", "finances", "rh", "etat_civil", "technique", "agent"]) {
  assert.ok(Object.keys(RP).some(k => RP[k].includes(r)), "aucun module pour " + r);
  assert.ok(RSUB[r], "phrase d'accueil absente pour " + r);
}
assert.ok(!RP.territoire.includes("cabinet"), "cabinet : pas de lecture patrimoine côté serveur");
console.log("PASS roles-interface");
