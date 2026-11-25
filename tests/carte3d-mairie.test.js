// Cartes 3D de l'espace mairie (Mapbox GL JS) : plus de Leaflet, pastilles par statut, clustering, jeton, CSP. node tests/carte3d-mairie.test.js
const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm"), path = require("node:path");
const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const lib = read("js/carte3d.js"), html = read("mairie.html"), core = read("js/core.js"), sg = read("js/signalements.js");
assert.doesNotMatch(html, /leaflet/i, "mairie.html référence encore Leaflet");
for (const [n, s] of [["core.js", core], ["signalements.js", sg], ["carte3d.js", lib]]) assert.doesNotMatch(s, /\bL\.(map|tileLayer|circleMarker)\b|window\.L\b/, n);
assert.match(html, /<meta name="mc-mapbox" content="pk\./); assert.match(html, /carte3d\.js\?v=.*core\.js/s, "carte3d.js doit précéder core.js");
assert.match(lib, /pitch: 45/); assert.match(lib, /streets-v12/); assert.match(lib, /fill-extrusion/); assert.match(lib, /cluster: true/);
assert.match(core, /mapbox3d\(el/); assert.match(sg, /mapbox3d\(el/);
// Comportement : sans jeton → message ; avec jeton → carte, couches, points valides seulement, clic grappe/point.
function run(token) {
  const out = { layers: [], src: null, popups: 0, eased: 0, el: { innerHTML: "", isConnected: true } }, h = {};
  class Map { constructor(o) { this.o = o; Map.last = this; } addControl() {} on(e, a, b) { if (typeof a == "function") { h[e] = a; if (e == "load") setTimeout(a, 0); } }
    getStyle() { return { layers: [] } } addLayer(l) { out.layers.push(l.id) } addSource(i, o) { out.src = o; this.s = { getClusterExpansionZoom: (id, cb) => cb(null, 14) } }
    getSource() { return this.s } queryRenderedFeatures() { return Map.hit ? [Map.hit] : [] } easeTo() { out.eased++ } fitBounds(b, o) { out.fit = o } jumpTo(o) { out.jump = o } getCanvas() { return { style: {} } } remove() { out.removed = 1 } }
  const ctx = { document: { querySelector: () => ({ content: token }), createElement: () => ({ appendChild() {} }), head: { appendChild() {} } }, setTimeout, Promise, isFinite, Math };
  ctx.window = ctx; ctx.mapboxgl = { Map, NavigationControl: class {}, LngLatBounds: class { extend() {} }, Popup: class { setLngLat() { return this } setDOMContent() { return this } addTo() { out.popups++; return this } } };
  vm.createContext(ctx); vm.runInContext(lib + ";this.mapbox3d=mapbox3d;", ctx);
  return { ctx, out, h, Map };
}
(async () => {
  let t = run(""); t.ctx.mapbox3d(t.out.el, { centre: [0, 0], pts: [] }); await new Promise(r => setTimeout(r, 10));
  assert.match(t.out.el.innerHTML, /indisponible/); assert.equal(t.out.layers.length, 0);
  t = run("sk.secret"); t.ctx.mapbox3d(t.out.el, { centre: [0, 0], pts: [] }); await new Promise(r => setTimeout(r, 10));
  assert.match(t.out.el.innerHTML, /indisponible/, "jeton secret refusé");
  t = run("pk.abc.def"); const hd = t.ctx.mapbox3d(t.out.el, { centre: [-16.7, 14.2], zoom: 11, fitMax: 13, pts: [
    { lat: 14.1, lng: -16.6, c: "#16A34A", l1: "Ecole", l2: "Fimela", l3: "Terminé : 100%" }, { lat: 14.2, lng: -16.7, c: "#DC2626", l1: "Puits" },
    { lat: null, lng: 3 }, { lat: 200, lng: 3, c: "#000" }] });
  await new Promise(r => setTimeout(r, 20));
  assert.equal(t.Map.last.o.pitch, 45); assert.match(t.Map.last.o.style, /streets-v12/);
  assert.deepEqual(["mc-3d", "mc-cl", "mc-cl-n", "mc-pt"], t.out.layers); assert.equal(t.out.src.cluster, true);
  assert.equal(t.out.src.data.features.length, 2, "points invalides exclus"); assert.equal(t.out.src.data.features[0].properties.c, "#16A34A"); assert.ok(t.out.fit);
  t.Map.hit = { layer: { id: "mc-cl" }, properties: { cluster_id: 1 }, geometry: { coordinates: [1, 2] } }; t.h.click({ point: {} }); assert.equal(t.out.eased, 1);
  t.Map.hit = { layer: { id: "mc-pt" }, properties: { l1: "Ecole" }, geometry: { coordinates: [1, 2] } }; t.h.click({ point: {} }); assert.equal(t.out.popups, 1);
  hd.remove(); assert.equal(t.out.removed, 1);
  console.log("OK   cartes 3D mairie (Mapbox : jeton, 3D, clustering, clics, points invalides, remove)");
})().catch(e => { console.error(e); process.exit(1); });
