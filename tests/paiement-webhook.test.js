// Paiement mobile (lot 17) : signatures Wave / Orange Money, normalisation des événements, garanties SQL et déploiement.
// node tests/paiement-webhook.test.js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const nodeCrypto = require("node:crypto");
const root = path.join(__dirname, "..");
const fn = path.join(root, "supabase", "functions", "paiement-webhook");

(async () => {
  const lib = await import(path.join(fn, "lib.mjs"));
  const H = (o) => new Headers(o);
  const hm = (k, m) => nodeCrypto.createHmac("sha256", k).update(m).digest("hex");
  const body = JSON.stringify({ type: "checkout.session.completed", data: { client_reference: "PAY-TAXE-2026-000001", transaction_id: "TCN4Y4ZC3FM", amount: "5000", currency: "XOF", payment_status: "succeeded" } });
  const t = String(Math.floor(Date.now() / 1000));

  // --- Wave : signature HMAC
  const S = "whsec_test";
  assert.equal(await lib.verifyWave({ rawBody: body, headers: H({ "wave-signature": `t=${t},v1=${hm(S, t + body)}` }), secret: S }), true, "HMAC t+corps");
  assert.equal(await lib.verifyWave({ rawBody: body, headers: H({ "wave-signature": `t=${t},v1=${hm(S, t + "." + body)}` }), secret: S }), true, "HMAC t.corps");
  assert.equal(await lib.verifyWave({ rawBody: body, headers: H({ "wave-signature": `t=${t},v1=${hm("autre", t + body)}` }), secret: S }), false, "mauvais secret");
  assert.equal(await lib.verifyWave({ rawBody: body + " ", headers: H({ "wave-signature": `t=${t},v1=${hm(S, t + body)}` }), secret: S }), false, "corps altéré");
  assert.equal(await lib.verifyWave({ rawBody: body, headers: H({}), secret: S }), false, "sans en-tête");
  assert.equal(await lib.verifyWave({ rawBody: body, headers: H({ "wave-signature": `t=${t},v1=${hm(S, t + body)}` }), secret: "" }), false, "secret absent : fermé");
  assert.equal(await lib.verifyWave({ rawBody: body, headers: H({ "wave-signature": "t=abc,v1=00" }), secret: S }), false, "format invalide");
  const vieux = String(Math.floor(Date.now() / 1000) - 3600);
  assert.equal(await lib.verifyWave({ rawBody: body, headers: H({ "wave-signature": `t=${vieux},v1=${hm(S, vieux + body)}` }), secret: S, tolerance: 300 }), false, "horodatage hors tolérance");
  assert.equal(await lib.verifyWave({ rawBody: body, headers: H({ "wave-signature": `t=${vieux},v1=${hm(S, vieux + body)}` }), secret: S, tolerance: 0 }), true, "tolérance désactivée par défaut");
  // --- Wave : secret partagé
  assert.equal(await lib.verifyWave({ rawBody: body, headers: H({ authorization: "Bearer " + S }), secret: S }), true, "secret partagé");
  assert.equal(await lib.verifyWave({ rawBody: body, headers: H({ authorization: "Bearer faux" }), secret: S }), false, "secret partagé faux");

  // --- Orange Money
  const K = "om_key";
  assert.equal(await lib.verifyOm({ rawBody: body, headers: H({ authorization: "Bearer " + K }), secret: K }), true, "OM Bearer");
  assert.equal(await lib.verifyOm({ rawBody: body, headers: H({ "x-api-key": K }), secret: K }), true, "OM x-api-key");
  assert.equal(await lib.verifyOm({ rawBody: body, headers: H({ "x-om-signature": "sha256=" + hm(K, body) }), secret: K }), true, "OM HMAC");
  assert.equal(await lib.verifyOm({ rawBody: body, headers: H({ "x-om-signature": hm("x", body) }), secret: K }), false, "OM HMAC faux");
  assert.equal(await lib.verifyOm({ rawBody: body, headers: H({}), secret: K }), false, "OM sans jeton");
  assert.equal(await lib.verifyOm({ rawBody: body, headers: H({ authorization: "Bearer " + K }), secret: undefined }), false, "OM secret absent : fermé");

  // --- Événements
  assert.deepEqual(lib.parseEvent("wave", JSON.parse(body)), { kind: "paid", reference: "PAY-TAXE-2026-000001", txId: "TCN4Y4ZC3FM", montant: 5000 });
  assert.equal(lib.parseEvent("wave", { type: "checkout.session.payment_failed", data: { client_reference: "PAY-TAXE-2026-000001" } }).kind, "failed");
  assert.equal(lib.parseEvent("wave", { type: "b2b.payment_received", data: {} }).kind, "ignore");
  assert.equal(lib.parseEvent("wave", { type: "checkout.session.completed", data: { client_reference: "x", transaction_id: "TCN123", amount: "5000", currency: "XOF" } }).kind, "invalid", "référence invalide");
  assert.equal(lib.parseEvent("wave", { type: "checkout.session.completed", data: { client_reference: "PAY-TAXE-2026-000001", transaction_id: "TCN123", amount: "50.123", currency: "XOF" } }).montant, null, "montant à 3 décimales : refusé en production");
  assert.equal(lib.parseEvent("wave", { type: "checkout.session.completed", data: { client_reference: "PAY-TAXE-2026-000001", transaction_id: "TCN123", amount: "5000", currency: "EUR" } }).kind, "invalid", "devise");
  assert.equal(lib.parseEvent("wave", { type: "checkout.session.completed", data: { client_reference: "PAY-TAXE-2026-000001", transaction_id: "TCN123", amount: "5000", currency: "XOF", payment_status: "processing" } }).kind, "ignore", "paiement non abouti");
  assert.equal(lib.parseEvent("orange_money", { status: "SUCCESS", reference: "PAY-TAXE-2026-000002", transactionId: "MP2611.1234.A12345", amount: { value: 7000, unit: "XOF" } }).montant, 7000);
  assert.equal(lib.parseEvent("orange_money", { status: "FAILED", reference: "PAY-TAXE-2026-000002" }).kind, "failed");
  assert.equal(lib.parseEvent("orange_money", { status: "PENDING" }).kind, "ignore");
  assert.equal(lib.parseEvent("orange_money", { status: "SUCCESS", reference: "PAY-TAXE-2026-000002", transactionId: "../../x", amount: 7000 }).txId, null, "identifiant de transaction piégé");
  // --- Sandbox
  assert.equal(await lib.verifySandbox({ headers: H({ authorization: "Bearer jeton_commune" }), secret: "jeton_commune" }), true, "jeton sandbox");
  assert.equal(await lib.verifySandbox({ headers: H({}), secret: "jeton_commune" }), false, "sandbox sans jeton");
  assert.equal(await lib.verifySandbox({ headers: H({ authorization: "Bearer autre" }), secret: "jeton_commune" }), false, "sandbox mauvais jeton");
  assert.equal(await lib.verifySandbox({ headers: H({ authorization: "Bearer x" }), secret: "" }), false, "sandbox sans secret : fermé");
  assert.equal(lib.sandboxTx(null, "PAY-TAXE-2026-000001"), "SANDBOX-PAY-TAXE-2026-000001");
  assert.equal(lib.sandboxTx("SANDBOX-A1", "PAY-TAXE-2026-000001"), "SANDBOX-A1");
  assert.equal(lib.sandboxTx("TCN123", "PAY-TAXE-2026-000001"), "SANDBOX-TCN123", "une vraie transaction ne garde jamais son identifiant en sandbox");
  assert.equal(lib.communeFromPayload({ data: { metadata: { commune_id: "ABC-1" } } }, "https://x/f"), "abc-1");
  assert.equal(lib.communeFromPayload({}, "https://x/f?commune=Z9"), "z9");
  assert.equal(lib.communeFromPayload({}, "https://x/f"), null);
  assert.equal(await lib.verifyOm({ rawBody: body, headers: H({ "x-om-signature": hm("cle_hmac", body) }), secret: "jeton", hmacSecret: "cle_hmac" }), true, "OM HMAC avec clé distincte");
  assert.equal(lib.parseEvent("inconnu", {}).kind, "invalid");
  assert.equal(lib.parseAmount("-5"), null);
  assert.equal(lib.parseAmount("1e3"), null);
  assert.equal(lib.parseAmount("0"), null);
  assert.equal(lib.providerFrom("https://x/functions/v1/paiement-webhook?provider=om", H({})), "orange_money");
  assert.equal(lib.providerFrom("https://x/f", H({ "wave-signature": "t=1,v1=2" })), "wave");
  assert.equal(lib.providerFrom("https://x/f", H({})), null);

  // --- Edge Function : clés lues par commune en base, aucune clé en dur ni dans l'environnement
  const idx = fs.readFileSync(path.join(fn, "index.ts"), "utf8");
  assert.match(idx, /Deno\.env\.get\("PAIEMENT_ENC_KEY"\)/);
  assert.doesNotMatch(idx, /Deno\.env\.get\("(WAVE_API_KEY|OM_API_KEY|WAVE_WEBHOOK_SECRET)"\)/, "pas de clé fournisseur globale");
  assert.match(idx, /resoudre_reference_taxe/);
  assert.match(idx, /lire_parametres_paiement/);
  assert.match(idx, /param\.mode === "sandbox"/);
  assert.match(idx, /verifySandbox/);
  assert.match(idx, /confirmer_paiement_mobile/);
  const iP = idx.indexOf('rpc("lire_parametres_paiement"'), iV = idx.indexOf("await verifyWave("), iC = idx.indexOf('rpc("confirmer_paiement_mobile"');
  assert.ok(iP > 0 && iP < iV && iV < iC, "paramètres lus, signature vérifiée, puis seulement la RPC");
  assert.ok(idx.indexOf("await verifySandbox(") > 0 && idx.indexOf("await verifySandbox(") < iC, "jeton sandbox vérifié avant la RPC");
  assert.doesNotMatch(idx, /fetch\(/, "aucun appel sortant (ni sandbox, ni production)");
  assert.match(idx, /Paiement mobile non configuré/);
  assert.doesNotMatch(idx, /(sk_|whsec_|wave_sn_)[A-Za-z0-9]{8,}/, "aucun secret en dur");

  // --- Migration lot 17
  const sql = fs.readFileSync(path.join(root, "supabase", "migrations", "20261203000500_lot17_paiement_mobile.sql"), "utf8");
  assert.match(sql, /create table if not exists public\.parametres_paiement_communes\([\s\S]*?commune_id[\s\S]*?fournisseur[\s\S]*?api_key_encrypted[\s\S]*?api_secret_encrypted[\s\S]*?mode text[\s\S]*?actif boolean/);
  assert.match(sql, /fournisseur in \('wave', 'orange_money'\)/);
  assert.match(sql, /mode in \('sandbox', 'production'\)/);
  assert.match(sql, /pgp_sym_encrypt/);
  assert.doesNotMatch(sql, /alter table public\.parametres_paiement_communes[^;]*(enable|grant)[^;]*authenticated/i);
  assert.match(sql, /add column if not exists provider text/);
  assert.match(sql, /add column if not exists provider_transaction_id text/);
  assert.match(sql, /add column if not exists statut_paiement text/);
  assert.match(sql, /trg_ptx_statut_paiement/);
  assert.match(sql, /create unique index if not exists paiements_taxes_provider_tx_uidx[\s\S]*?\(provider_transaction_id\)/);
  assert.match(sql, /create or replace function public\.confirmer_paiement_mobile\(p_reference_taxe text, p_provider_tx_id text, p_provider text, p_montant numeric\)[\s\S]*?security definer/);
  assert.match(sql, /create or replace function public\.initier_paiement_en_ligne\(p_role_id uuid/);
  assert.match(sql, /sandbox\.paiement\.invalid/, "lien factice en sandbox");
  assert.match(sql, /\(v_mode = 'sandbox'\) <> \(left\(v_tx, 8\) = 'SANDBOX-'\)/, "SANDBOX- interdit en production, exigé en sandbox");
  assert.match(sql, /p_montant <> v_r\.montant_du/, "montant exact");
  assert.match(sql, /set statut = 'payee'/, "rôle passé à payee");
  assert.match(sql, /insert into public\.quittances/, "quittance émise");
  assert.match(sql, /'deja_traite', true/, "idempotence");
  for (const f of ["confirmer_paiement_mobile\\(text, text, text, numeric\\)", "echouer_paiement_mobile\\(text, text\\)", "lire_parametres_paiement\\(uuid, text, text\\)", "definir_parametres_paiement\\(uuid, text, text, text, text, boolean, text, text\\)", "resoudre_reference_taxe\\(text\\)"]) {
    assert.match(sql, new RegExp("revoke all on function public\\." + f + " from public, anon, authenticated;\\s*grant execute on function public\\." + f + " to service_role;"), f);
    assert.doesNotMatch(sql, new RegExp("grant execute on function public\\." + f + "[^;]*authenticated"), f);
  }
  assert.match(sql, /grant execute on function public\.modes_paiement_commune\(text\) to authenticated/);
  assert.match(sql, /search_path = ''/);
  assert.ok((sql.match(/set search_path = ''/g) || []).length >= 9, "toutes les fonctions : search_path vide");

  // --- Déploiement
  const cfg = fs.readFileSync(path.join(root, "supabase", "config.toml"), "utf8");
  assert.match(cfg, /\[functions\.paiement-webhook\]\s+verify_jwt = false/);
  console.log("OK   paiement mobile : signatures, événements, RPC idempotente, droits service_role, config");
})().catch((e) => { console.error(e); process.exit(1); });
