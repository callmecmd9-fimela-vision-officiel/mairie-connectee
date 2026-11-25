// LOT A : socle géographique des communes. node tests/communes-geo.test.js
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
delete global.window; require("../js/communes-geo.js");
const G = global.COMMUNES_GEO;
assert.deepEqual(Object.keys(G).sort(), ["diofior", "djilass", "djirnda", "fatick", "fimela"]);
for (const [slug, c] of Object.entries(G)) {
  const [la, lo] = c.center, [[s, w], [n, e]] = c.maxBounds;
  assert.ok(s < la && la < n && w < lo && lo < e, slug + " : centre hors maxBounds");
  assert.ok(c.zoom >= 8 && c.zoom <= 18, slug + " : zoom");
  assert.ok(c.localites.length >= 2, slug + " : localités");
  for (const l of c.localites) assert.ok(l.lat > s && l.lat < n && l.lng > w && l.lng < e, `${slug}/${l.nom} hors emprise`);
}
assert.equal(G.get("commune-de-diofior").nom, "Diofior");
assert.equal(G.get("inconnu"), null);
assert.equal(G.fimela.localites.length, 6); assert.equal(G.djirnda.localites.length, 5);
const sql = read("supabase/migrations/20261202000000_communes_geo.sql");
for (const col of ["latitude", "longitude", "zoom_defaut", "bbox", "geojson_perimetre"]) assert.match(sql, new RegExp("add column if not exists " + col));
for (const [slug, c] of Object.entries(G)) assert.ok(sql.includes(`${c.center[0]}, ${c.center[1]}`), slug + " : centre absent du SQL");
for (const [f, next] of [["mairie.html", "carte3d.js"], ["index.html", "citoyen.js"], ["saas.html", "saas.js"]]) {
  const h = read(f), a = h.indexOf("communes-geo.js"), b = h.indexOf(next);
  assert.ok(a > -1 && a < b, f + " : communes-geo.js doit précéder " + next);
}
console.log("OK   communes-geo (5 communes, emprises, SQL cohérent, ordre des scripts)");
