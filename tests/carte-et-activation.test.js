// Portail citoyen : lien « Voir sur la carte » (Google Maps uniquement) ; sa-admin : l'activation confirme l'e-mail au lieu de l'refuser.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const src = read("js/citoyen.js");
const re = src.match(/const MAPRE =\s*(\/.*\/i);/);
assert.ok(re, "MAPRE introuvable");
const MAPRE = eval(re[1]);
for (const u of [
  "https://maps.app.goo.gl/7kX5Ch5zFZ5H1U1T8",
  "https://maps.app.goo.gl/DqTq6rMjyBhAbHFs5",
  "https://maps.app.goo.gl/L4HXXoNB4GNfF7YC6",
  "https://maps.app.goo.gl/RLkS1hjiC1mbxN968",
  "https://maps.app.goo.gl/4rELRzTs89n9tBfA8",
  "https://maps.app.goo.gl/Ney1hA6reL4LQgJ98",
  "https://www.google.com/maps/place/Fimela/@14.13,-16.66,15z",
  "https://goo.gl/maps/abc123"
])
  assert.equal((u.match(MAPRE) || [])[0], u, u);
for (const u of [
  "http://maps.app.goo.gl/x",
  "https://evil.example/maps/x",
  "javascript:alert(1)",
  "https://google.com.evil.example/maps/x",
  "Place de la mairie"
])
  assert.equal(MAPRE.test(u), false, u);
assert.match(src, /target="_blank" rel="noopener noreferrer"/);
assert.match(src, /Voir sur la carte/);
const sa = read("supabase/functions/sa-admin/index.ts");
assert.doesNotMatch(sa, /fail\("L’invitation doit être acceptée/);
assert.match(sa, /email_confirm:true/);
assert.match(sa, /email_confirme_par_admin:true/);
assert.doesNotMatch(read("js/superadmin.js"), /E-mail non confirm/);
console.log("OK   carte citoyen (liens Google Maps, 6 communes) et activation d'un e-mail non confirmé");
// LOT B : carte multi-commune (COMMUNES_GEO) : centre, zoom, maxBounds, recentrage, menu des localités, bbox à l'envoi.
const vm = require("node:vm");
const geoSrc = read("js/communes-geo.js"), lib = read("js/carte3d.js");
function carte(slugActif, o) {
  const st = { opts: null, ctrls: [], fly: null, fit: null }, noop = () => {};
  class Map { constructor(x) { st.opts = x; st.m = this; } addControl(c, pos) { st.ctrls.push([c, pos]); } on(e, f) { if (e == "load") setTimeout(f, 0); } getStyle() { return { layers: [] }; }
    addLayer() {} addSource() {} getSource() {} queryRenderedFeatures() { return []; } getCanvas() { return { style: {} }; } remove() {}
    flyTo(x) { st.fly = x; } fitBounds(b, x) { st.fit = [b, x]; } jumpTo() {} easeTo() {} }
  const ctx = { document: { querySelector: () => ({ content: "pk.abc.def" }), createElement: () => ({ appendChild() {}, addEventListener() {}, setAttribute() {}, style: {} }), head: { appendChild() {} } }, setTimeout, Promise, isFinite, Math };
  ctx.window = ctx; ctx.mapboxgl = { Map, NavigationControl: class {}, LngLatBounds: class { extend() {} }, Popup: class {} };
  ctx.slug = () => slugActif;
  vm.createContext(ctx); vm.runInContext(geoSrc + ";" + lib + ";this.mapbox3d=mapbox3d;this.G=COMMUNES_GEO;", ctx);
  const h = ctx.mapbox3d({ innerHTML: "", isConnected: true }, o || { pts: [] });
  return new Promise(r => setTimeout(() => r({ ctx, st, h }), 20));
}
(async () => {
  for (const sl of ["fimela", "fatick"]) {
    const { ctx, st, h } = await carte(sl), g = ctx.G[sl], [[s, w], [n, e]] = g.maxBounds;
    assert.deepEqual([...st.opts.center], [g.center[1], g.center[0]], sl + " : centre [lng,lat] issu de COMMUNES_GEO");
    assert.equal(st.opts.zoom, g.zoom, sl + " : zoom"); assert.deepEqual(JSON.parse(JSON.stringify(st.opts.maxBounds)), [[w, s], [e, n]], sl + " : maxBounds [[ouest,sud],[est,nord]]");
    const rc = st.ctrls.find(c => c[1] == "top-left"); assert.ok(rc, sl + " : contrôle « Recentrer sur ma commune »");
    h.recentrer(); assert.deepEqual(JSON.parse(JSON.stringify(st.fit[0])), [[w, s], [e, n]], sl + " : fitBounds(maxBounds)");
    const l = g.localites[0]; h.goto(l.lat, l.lng, 16); assert.deepEqual([...st.fly.center], [l.lng, l.lat]); assert.equal(st.fly.zoom, 16);
  }
  assert.deepEqual([...(await carte("fimela")).st.opts.center], [-16.659, 14.133]); assert.deepEqual([...(await carte("fatick")).st.opts.center], [-16.416, 14.316]);
  const adm = await carte("fimela", { centre: [-16.5, 14.1], zoom: 9, pts: [] }); assert.deepEqual([...adm.st.opts.center], [-16.5, 14.1], "centre configuré par la mairie prioritaire"); assert.equal(adm.st.opts.zoom, 9);
  const inc = await carte("inconnue"); assert.equal(inc.st.opts.maxBounds, undefined, "commune inconnue : pas de limites"); assert.equal(inc.st.ctrls.filter(c => c[1] == "top-left").length, 0);
  // Portail citoyen : sigGeo / sigDansBbox extraits de citoyen.js.
  const cz = vm.createContext({ sigSlug: () => "fatick" }); vm.runInContext(geoSrc, cz);
  vm.runInContext(src.match(/function sigGeo\(\)[\s\S]*?\n}\n/)[0] + src.match(/function sigDansBbox[^\n]*\n/)[0] + ";this.sigGeo=sigGeo;this.sigDansBbox=sigDansBbox;", cz);
  const gf = cz.sigGeo(); assert.deepEqual([...gf.centre], [-16.416, 14.316]); assert.equal(gf.localites.length, 5);
  assert.equal(cz.sigDansBbox(14.316, -16.416, gf.bbox), true); assert.equal(cz.sigDansBbox(14.9, -16.416, gf.bbox), false); assert.equal(cz.sigDansBbox(14.316, -15.9, gf.bbox), false);
  assert.match(src, /Vous êtes hors du périmètre de la commune, voulez-vous continuer \?/); assert.match(src, /window\.confirm\(/);
  assert.match(src, /Aller à un village\/quartier/); assert.match(read("js/signalements.js"), /Aller à un village\/quartier/); assert.match(read("js/signalements.js"), /goto\(l\.lat, l\.lng, 16\)/);
  assert.match(lib, /Recentrer sur ma commune/);
  console.log("OK   carte multi-commune LOT B (Fimela, Fatick : centre, zoom, maxBounds, recentrage, localités, bbox)");
})().catch(e => { console.error(e); process.exit(1); });

