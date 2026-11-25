// Contrôle avant déploiement : chaque ressource locale référencée par une page existe ET sera publiée (liste blanche .assetsignore).
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const R = path.join(__dirname, "..");
const rules = fs.readFileSync(path.join(R, ".assetsignore"), "utf8").split(/\r?\n/).map(x => x.trim()).filter(Boolean);
const allow = rules.filter(r => r.startsWith("!/")).map(r => r.slice(2));
const published = rel => allow.some(a => a.endsWith("/") ? rel.startsWith(a) : new RegExp("^" + a.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*") + "$").test(rel));
let n = 0;
for (const page of ["index.html", "mairie.html", "saas.html", "confidentialite.html", "verifier.html", "quittance.html", "suivi.html"]) {
  const html = fs.readFileSync(path.join(R, page), "utf8");
  for (const m of html.matchAll(/(?:src|href)="(\/[^"#?]*)(?:\?[^"]*)?"/g)) {
    const rel = m[1].slice(1);
    if (!rel || rel === "mairie" || rel === "saas") continue;
    assert.ok(fs.existsSync(path.join(R, rel)), `${page} : ressource absente ${rel}`);
    assert.ok(published(rel), `${page} : ${rel} référencé mais exclu du déploiement (.assetsignore)`);
    n++;
  }
  // Toute ressource locale versionnée doit porter ?v= (cache-busting) sauf bibliothèques embarquées.
  for (const m of html.matchAll(/(?:src|href)="(\/(?:js|css)\/[^"?]+)(\?[^"]*)?"/g))
    if (!m[2]) assert.match(m[1], /\/(supabase|leaflet|pwa-init)\.(js|css)$/, `${page} : ${m[1]} sans ?v=`);
}
for (const f of ["manifest-citoyen.webmanifest", "manifest-mairie.webmanifest", "manifest-saas.webmanifest"]) {
  const mf = JSON.parse(fs.readFileSync(path.join(R, f), "utf8"));
  for (const i of mf.icons || []) assert.ok(fs.existsSync(path.join(R, i.src.replace(/^\//, ""))), `${f} : icône absente ${i.src}`);
}
console.log(`OK   ${n} références de pages présentes et publiées ; manifestes cohérents`);
