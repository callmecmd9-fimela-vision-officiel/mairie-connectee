// Mode clair / sombre : feuilles générées à jour, câblage des trois espaces, comportement du bouton, aucun style en ligne.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");
const R = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(R, f), "utf8");

// 1) Les feuilles sombres correspondent aux feuilles claires (régénérer : node scripts/gen-dark-theme.js)
const gen = spawnSync(process.execPath, [path.join(R, "scripts/gen-dark-theme.js"), "--check"], { encoding: "utf8" });
assert.equal(gen.status, 0, "css/*-dark.css obsolètes : lancer `node scripts/gen-dark-theme.js`\n" + gen.stderr);

// 2) Câblage : script dans <head> avant les feuilles, feuille sombre après la feuille claire
for (const [html, light, dark] of [
  ["index.html", "/css/citoyen.css", "/css/citoyen-dark.css"],
  ["mairie.html", "/css/mairie.css", "/css/mairie-dark.css"],
  ["saas.html", "/css/saas.css", "/css/saas-dark.css"]
]) {
  const s = read(html), i = s.indexOf("/js/theme.js"), a = s.indexOf(light), b = s.indexOf(dark), c = s.indexOf("/css/theme.css");
  assert.ok(i > 0 && a > 0 && b > 0 && c > 0, `${html} : thème incomplet`);
  assert.ok(i < a, `${html} : theme.js doit précéder les feuilles (pas de flash)`);
  assert.ok(b > a && c > b, `${html} : feuille sombre après la feuille claire`);
  assert.ok(i < s.indexOf("</head>"), `${html} : theme.js dans <head>`);
}
assert.ok(read("saas.html").indexOf("/css/mairie-dark.css") > 0, "saas.html charge aussi mairie.css : sa version sombre est requise");

// 3) Comportement du module (DOM minimal)
function run(stored, systemDark) {
  const store = stored ? { "mc-theme": stored } : {}, attrs = {}, nodes = {};
  const mk = tag => ({ tag, children: [], attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, appendChild(c) { this.children.push(c); return c; }, addEventListener(t, f) { this.on = f; }, set textContent(v) { this.children = []; } });
  const document = {
    readyState: "complete", body: mk("body"), documentElement: { setAttribute: (k, v) => (attrs[k] = v), getAttribute: k => attrs[k] },
    getElementById: id => nodes[id] || null, createElement: t => mk(t), createElementNS: (n, t) => mk(t), addEventListener() {}
  };
  document.body.appendChild = c => { if (c.id) nodes[c.id] = c; return c; };
  const sb = { document, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => (store[k] = v) }, matchMedia: () => ({ matches: !!systemDark, addEventListener() {} }), addEventListener() {} };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(read("js/theme.js"), sb);
  return { attrs, store, btn: nodes["mc-theme-btn"], T: sb.McTheme };
}
let t = run(null, true);
assert.equal(t.attrs["data-theme"], "dark", "sans choix : suit le réglage du système (sombre)");
t = run(null, false);
assert.equal(t.attrs["data-theme"], "light", "sans choix : suit le réglage du système (clair)");
t = run("dark", false);
assert.equal(t.attrs["data-theme"], "dark", "le choix mémorisé l'emporte sur le système");
assert.equal(t.btn.attrs["aria-pressed"], "true");
t.btn.on();
assert.equal(t.attrs["data-theme"], "light", "le bouton bascule");
assert.equal(t.store["mc-theme"], "light", "le choix est mémorisé");
t.btn.on();
assert.equal(t.store["mc-theme"], "dark");
t = run("n'importe quoi", false);
assert.equal(t.attrs["data-theme"], "light", "valeur mémorisée invalide ignorée");

// 4) CSP : aucun style en ligne, aucune écriture HTML dynamique
assert.doesNotMatch(read("js/theme.js"), /innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|setAttribute\(\s*["']style/);

// 5) Lisibilité : le sombre ne laisse aucun fond clair codé en dur dans les feuilles générées
for (const f of ["css/citoyen-dark.css", "css/mairie-dark.css", "css/saas-dark.css"]) {
  const blancs = read(f).split("\n").filter(l => /background:(#fff|#ffffff|white)[;}]/i.test(l) && !l.includes(".a3.y .ar") && !l.includes(".sx-sw input::after")); /* flèche blanche sur la carte jaune et bouton du commutateur : voulus */
  assert.deepEqual(blancs, [], `${f} : fond blanc résiduel`);
}
console.log("OK   thème clair/sombre (feuilles à jour, câblage, bascule, mémorisation, CSP)");
