/* Moteur de recherche (js/recherche.js) : accents, synonymes, fautes de frappe, mots vides. */
const assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const ctx = { window: {}, document: { addEventListener() {}, getElementById: () => null, querySelector: () => null } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/recherche.js"), "utf8"), ctx);
const { search, entry } = ctx.window.MCRecherche;
const idx = [
  entry("Pages", "Congés et absences", "Administration", "conges"),
  entry("Pages", "Paie du personnel", "Finances", "paie"),
  entry("Pages", "État civil", "Administration", "civil"),
  entry("Dossiers", "Awa Ndiaye", "Demande · DM-0042", "extrait de naissance")
];
const first = q => (search(idx, q)[0] || {}).title;
assert.equal(first("conges"), "Congés et absences");
assert.equal(first("où trouver les vacances"), "Congés et absences");
assert.equal(first("salaire"), "Paie du personnel");
assert.equal(first("mariage"), "État civil");
assert.equal(first("ndiyae"), "Awa Ndiaye");
assert.equal(first("0042"), "Awa Ndiaye");
assert.equal(search(idx, "zzzzzz").length, 0);
console.log("PASS: recherche");
