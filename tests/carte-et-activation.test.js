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
