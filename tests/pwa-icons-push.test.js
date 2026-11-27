// Icônes PNG par commune + notifications push : contrôles statiques, et rendu réel dans Chromium si Playwright est installé.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const R = path.join(__dirname, "..");
const rd = f => fs.readFileSync(path.join(R, f), "utf8");
const png = f => { const b = fs.readFileSync(path.join(R, f)); assert.equal(b.slice(1, 4).toString(), "PNG", f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), n: b.length }; };

// --- icônes par défaut neutres (distinctes du blason de Fimela)
for (const [f, s] of [["icon-defaut-192.png", 192], ["icon-defaut-512.png", 512], ["icon-defaut-maskable-512.png", 512]]) {
  const i = png(f); assert.equal(i.w, s); assert.equal(i.h, s); assert.ok(i.n < 290000, f + " trop lourd");
}
assert.notEqual(fs.readFileSync(path.join(R, "icon-defaut-512.png")).length, fs.readFileSync(path.join(R, "icon-citoyen-512.png")).length);
// --- publication côté mairie
const { compact } = require("./_compact.js");
const dm = compact(rd("js/demarches.js"));
assert.match(dm, /async function pubIcons/); assert.match(dm, /icon-maskable-512\.png|mcIcons\.make/);
assert.match(dm, /data-m="lnkicons"/); assert.match(dm, /contentType:"image\/png"/);
assert.match(rd("mairie.html"), /\/js\/icons\.js/);
// --- manifest citoyen : icônes de la commune seulement si elles existent (HEAD), sinon icônes neutres
const ct = compact(rd("js/citoyen.js"));
assert.match(ct, /method:"HEAD"/); assert.match(ct, /icones-pwa\/"\+S\.cid\+"\/"/); assert.match(ct, /icon-defaut-192\.png/);
assert.match(ct, /apple-touch-icon/);
// --- push : service worker, client, Edge Function, migration proposée (non appliquée)
const sw = rd("sw.js");
assert.match(sw, /addEventListener\("push"/); assert.match(sw, /notificationclick/); assert.match(sw, /mc-v13/);
assert.match(rd("index.html"), /<meta name="mc-vapid" content="">/, "clé VAPID vide par défaut : push désactivé tant que non provisionné");
assert.match(ct, /pushOk/); assert.match(ct, /userVisibleOnly:true/);
const fn = rd("supabase/functions/push-send/index.ts");
assert.match(fn, /x-push-secret/); assert.match(fn, /503/); assert.match(fn, /VAPID_PRIVATE_KEY/);
assert.ok(fn.indexOf("403") > fn.indexOf("503"), "config absente → 503 avant contrôle du secret");
const sql = rd("supabase/proposed/20261121_push_notifications.sql");
assert.match(sql, /enable row level security/); assert.match(sql, /grant execute on function public\.push_abonnements.*to service_role/s);
assert.ok(!/grant execute[^;]*push_abonnements[^;]*authenticated/.test(sql.replace(/revoke[^;]*;/g, "")), "push_abonnements jamais accessible aux utilisateurs");
assert.ok(!fs.readdirSync(path.join(R, "supabase/migrations")).some(f => /push/i.test(f)), "migration push non appliquée");
console.log("OK   icônes par défaut, publication, manifest, push (SW, client, Edge, SQL proposé)");

// --- rendu réel (facultatif)
let pw; try { pw = require("playwright"); } catch (e) { try { pw = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright"); } catch (e2) { console.log("SKIP rendu Chromium (playwright absent)"); process.exit(0); } }
(async () => {
  const b = await pw.chromium.launch(); const p = await b.newPage(); await p.setContent("<body></body>");
  await p.addScriptTag({ content: rd("js/icons.js") });
  const r = await p.evaluate(async () => {
    const a = await mcIcons.make(null, { color: "#7A1F2B", name: "Commune de Joal-Fadiouth" });
    const o = {}; for (const [k, v] of Object.entries(a)) { const u = new Uint8Array(await v.arrayBuffer()); o[k] = [v.size, [...u.slice(0, 4)], v.type]; }
    let err = ""; try { await mcIcons.make(new Blob(["x"]), {}); } catch (e) { err = e.message; }
    return { o, err, ini: [mcIcons.initials("Commune de Joal-Fadiouth"), mcIcons.initials("Mairie de Fimela"), mcIcons.initials("")] };
  });
  await b.close();
  assert.deepEqual(Object.keys(r.o), ["icon-192.png", "icon-512.png", "icon-maskable-512.png"]);
  for (const [k, [n, sig, t]] of Object.entries(r.o)) { assert.deepEqual(sig, [137, 80, 78, 71], k); assert.equal(t, "image/png"); assert.ok(n < 300000, k); }
  assert.match(r.err, /Blason illisible/); assert.deepEqual(r.ini, ["JF", "FI", "M"]);
  console.log("OK   génération PNG réelle (192, 512, maskable) < 300 Ko, blason illisible refusé");
})().catch(e => { console.error(e); process.exit(1); });
