// node tests/etat-civil-signature-offline.test.js : contrat statique LOT A/B/C (signature, rectification, hors-ligne, QR local, export ANEC)
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const R = path.join(__dirname, "..");
const rd = f => fs.readFileSync(path.join(R, f), "utf8");
let f = 0;
const ok = (n, fn) => { try { fn(); console.log("OK  ", n); } catch (e) { f++; console.log("FAIL", n, "-", e.message.split("\n")[0]); } };
const ec = rd("js/etat-civil.js"), q = rd("js/offline-queue.js"), sw = rd("sw.js"), mh = rd("mairie.html"), hd = rd("_headers"), sql = rd("supabase/proposed/20261206_export_lgec.sql");

ok("signature : rpc signer_acte + badge Signé / Non signé", () => {
  assert.match(ec, /sb\.rpc\("signer_acte",\s*\{\s*p_acte/); assert.match(ec, /Signé le/); assert.match(ec, /Non signé/);
});
ok("acte signé : Modifier masqué, Rectifier (jugement) via rpc rectifier_acte", () => {
  assert.match(ec, /sb\.rpc\("rectifier_acte"/); assert.match(ec, /Rectifier \(jugement\)/);
  assert.match(ec, /sg\s*\?\s*`<button[^`]*data-m="ecrect"[\s\S]*?:\s*`<button[^`]*data-m="ecedit"/);
  ["p_juridiction", "p_jugement_numero", "p_jugement_date", "p_motif"].forEach(k => assert.ok(ec.includes(k), k));
});
ok("saisie : mode ordinaire / jugement supplétif dans ecPayload", () => {
  assert.match(ec, /jugement_suppletif/);
  ["mode_inscription", "date_declaration", "declarant", "juridiction", "jugement_numero", "jugement_date"].forEach(k => assert.ok(ec.includes(k + ":"), k));
});
ok("mentions marginales chargées et imprimées ; impression bloquée si non signé", () => {
  assert.match(ec, /actes_mentions_marginales/); assert.match(ec, /ecMentions\(a\.id\)/); assert.match(ec, /ecNeedSigned\(a\)/);
});
ok("23505 : « numéro déjà utilisé » distinct de « Doublon probable »", () => {
  assert.match(ec, /Doublon probable/); assert.match(ec, /Numéro déjà utilisé/); assert.match(ec, /23505/);
});
ok("saisie hors ligne : queueAction insert autoId", () => {
  assert.match(ec, /queueAction\(\{\s*table:\s*"actes_etat_civil",\s*op:\s*"insert",\s*data:\s*row,\s*autoId:\s*true\s*\}\)/);
});
ok("signature / rectification : en ligne uniquement (jamais en file)", () => {
  assert.doesNotMatch(ec, /queueAction\(\{\s*rpc/); assert.match(ec, /ecOnly\("Signature"\)/); assert.match(ec, /ecOnly\("Rectification"\)/);
});
ok("rejeu 23505 : vérification par select id, conflit conservé", () => {
  assert.match(q, /"verif"/); assert.match(q, /\.select\("id"\)\.eq\("id"/); assert.match(q, /conflit/);
  assert.doesNotMatch(q, /autoId && code == "23505"\) return "ok"/);
});
ok("QR : plus d'api.qrserver.com (JS, CSP, SW)", () => {
  ["js/etat-civil.js", "js/quittance.js", "_headers", "sw.js", "js/qr-local.js"].forEach(x => assert.doesNotMatch(rd(x), /api\.qrserver\.com/, x));
  assert.match(ec, /window\.qrSvg\(/);
});
ok("qr-local.js : génère un SVG local sans réseau", () => {
  const w = {}; vm.runInNewContext(rd("js/qr-local.js"), { window: w, unescape, encodeURIComponent });
  const svg = w.qrSvg("https://x.sn/verifier.html?ref=EC-2026-ABCDEF123456", { size: 130 });
  assert.match(svg, /^<svg[^>]+viewBox="0 0 (\d+) \1"/); assert.ok(!/(https?:)?\/\/[^"]*\.(png|gif)/.test(svg)); assert.throws(() => w.qrSvg("x".repeat(300)));
});
ok("sw.js : cache mc-v13, shell mairie préchargé, Supabase exclu", () => {
  assert.match(sw, /const C="mc-v13"/); assert.doesNotMatch(sw, /mc-v12/);
  assert.match(sw, /\/mairie\.html/); assert.match(sw, /\(\?:js\|css\)/); assert.match(sw, /u\.origin!==location\.origin/);
});
ok("mairie.html : ?v= au format AAAAMMJJ.n, qr-local avant etat-civil", () => {
  ["etat-civil", "offline-queue", "qr-local"].forEach(n => assert.match(mh, new RegExp("/js/" + n + "\\.js\\?v=\\d{8}(\\.\\d+)?\"")));
  assert.ok(mh.indexOf("qr-local.js") < mh.indexOf("etat-civil.js"));
});
ok("LGEC : export ANEC (CSV + JSON) côté UI", () => {
  assert.match(ec, /Exporter pour l’ANEC/); assert.match(ec, /sb\.rpc\("export_registre_ec"/); assert.match(ec, /registre-ec-/);
});
ok("LGEC SQL : identifiant_national unique par commune, RPC réservée + auditée", () => {
  assert.match(sql, /identifiant_national/); assert.match(sql, /unique index[^;]*\(commune_id,identifiant_national\)\s*where identifiant_national is not null/i);
  assert.match(sql, /function public\.export_registre_ec\(p_annee integer, p_type text/); assert.match(sql, /role in\('maire','adjoint','etat_civil'\)/);
  assert.match(sql, /insert into public\.audit_log/); assert.match(sql, /security definer set search_path=''/);
  assert.match(sql, /revoke all on function public\.export_registre_ec[^;]*from public,anon/);
});
console.log(f ? "ECHECS: " + f : "TOUS OK"); process.exit(f ? 1 : 0);
