// Chantier 2 : « Mon Espace » (téléphone + SMS), RPC *_par_tel, paiement sandbox, anti-XSS, SQL. node tests/citoyen-espace-tel.test.js
const vm = require("vm"), fs = require("fs"), path = require("path");
let f = 0;
const ok = (n, c) => { console.log(c ? "OK  " : "FAIL", n); if (!c) f++; };
const ROOT = path.join(__dirname, "..");
const SRC = fs.readFileSync(path.join(ROOT, "js", "citoyen.js"), "utf8");
const XSS = '<img src=x onerror=alert(1)>';

async function boot({ user = true, rolesFor = "+221771234567", store = { mc_co: "fimela" }, rolesFn = null, parTelAbsente = false } = {}) {
  const app = { innerHTML: "" }, handlers = { click: [] }, els = {}, rpcs = [], timers = [];
  let roles = [
    { id: "r1", commune_slug: "fimela", libelle: XSS, annee: 2026, montant_du: 5000, statut: "emise", reference_avis: null },
    { id: "r2", commune_slug: "fimela", libelle: "Patente", annee: 2026, montant_du: 7000, statut: "payee", reference_avis: "PAY-TAXE-2026-000002", quittance_ref: "TAX-ABCDEF123456" },
    { id: "r3", commune_slug: "autre", libelle: "AUTRECOMMUNE", annee: 2026, montant_du: 1, statut: "emise" }
  ];
  const U = { id: "u1", phone: "221771234567", is_anonymous: false };
  const from = () => { const b = { select() { return b; }, order() { return b; }, limit() { return b; }, maybeSingle() { return b; }, eq() { return b; }, update() { return b; }, upsert() { return b; }, then(res, rej) { return Promise.resolve({ data: [], error: null }).then(res, rej); } }; return b; };
  const sb = {
    auth: { getSession: async () => ({ data: { session: user ? { user: U } : null } }), signOut: async () => ({}), signInAnonymously: async () => ({}), signInWithOtp: async () => ({}), verifyOtp: async () => ({ data: { user: U } }) },
    from,
    rpc: async (n, a) => {
      rpcs.push([n, a]);
      if (n == "commune_par_slug") return { data: [{ id: "cid1", slug: "fimela", nom: "Fimela" }] };
      if (n == "infos_commune") return { data: [{ nom: "Fimela" }] };
      if (parTelAbsente && /_par_tel$/.test(n)) return { data: null, error: { code: "PGRST202", message: "Could not find the function" } };
      if (n == "mes_roles_imposition_par_tel") return { data: a.p_telephone == rolesFor ? (rolesFn ? rolesFn() : roles) : [] };
      if (n == "mes_roles_imposition") return { data: roles };
      if (n == "mes_demandes_par_tel") return { data: a.p_telephone == rolesFor ? [{ numero: "FIM-0001-AAAA1111", commune_slug: "fimela" }] : [] };
      if (n == "suivre_demandes") return { data: (a.p_numeros || []).map(x => ({ numero: x, type: XSS, statut: "en_cours" })) };
      if (n == "modes_paiement_commune") return { data: [{ fournisseur: "wave", mode: "sandbox" }] };
      if (n == "initier_paiement_taxe") {
        const r = roles.find(x => x.id == a.p_role_id);
        if (!r || r.commune_slug != "fimela") return { data: null, error: { code: "P0002", message: "Rôle introuvable." } };
        r.statut = "en_attente_paiement"; r.reference_avis = "PAY-TAXE-2026-000123";
        return { data: { reference: r.reference_avis, role_id: r.id, statut: r.statut } };
      }
      return { data: [] };
    }
  };
  const ctx = {
    supabase: { createClient: () => sb },
    document: { querySelector: s => (s == "#app" ? app : els[s] || null), getElementById: () => null, addEventListener: (n, fn) => (handlers[n] = handlers[n] || []).push(fn), createElement: () => ({}), head: { appendChild() {} }, documentElement: { style: { setProperty() {} }, setAttribute() {} }, hidden: false },
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: k => delete store[k], get length() { return Object.keys(store).length; }, key: i => Object.keys(store)[i] ?? null },
    location: { search: "", pathname: "/", origin: "https://m.x", hostname: "x.workers.dev" }, history: { replaceState() {} }, navigator: { onLine: true },
    URL, Blob, URLSearchParams, setInterval() {}, setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearTimeout() {}, addEventListener() {}, scrollTo() {}, console, Promise, JSON, Math, Date, crypto: {}, matchMedia: () => ({ matches: true })
  };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(SRC, ctx);
  await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r));
  const click = async d => { const t = { dataset: d, textContent: "" }; for (const h of handlers.click) await h({ target: { closest: s => (s == "[data-a]" ? t : null) } }); };
  return { app, els, rpcs, store, timers, click, roles: () => roles, H: () => app.innerHTML, S: () => vm.runInContext("S", ctx), nph: v => vm.runInContext("nph", ctx)(v) };
}
const tick = () => new Promise(r => setTimeout(r, 70));

(async () => {
  // A. Format sénégalais
  let t = await boot();
  ok("A. 77/78/70/76/75 acceptés (avec ou sans +221)", ["77 123 45 67", "781234567", "70-123-45-67", "+221 76 123 45 67", "00221751234567", "221771234567"].every(v => /^\+2217[05678]\d{7}$/.test(t.nph(v))));
  ok("A. formats invalides refusés", ["", "123", "791234567", "+33612345678", "77 123 45", "abc", "<script>", "7712345678"].every(v => t.nph(v) === ""));
  ok("A. SMS_ON actif (écran de connexion ouvert)", /const SMS_ON = true;/.test(SRC));

  // A. Connexion : écran numéro, tel_citoyen après code valide, préremplissage, purge à la déconnexion
  t = await boot({ user: false, store: { mc_co: "fimela", mc_d_fimela: '["FIM-1"]', mc_r_fimela: '["RDV-1"]', mc_lang: "fr" } });
  await t.click({ a: "esp" });
  ok("A. écran Mon Espace : champ téléphone seul, aucun mot de passe", /id="ph"/.test(t.H()) && !/type="password"/.test(t.H()) && /Un code SMS confirme/.test(t.H()));
  t.els["#ph"] = { value: "12345" }; t.S().tok = "ok"; await t.click({ a: "otp" });
  ok("A. numéro invalide refusé côté client, rien en localStorage", /Numéro invalide/.test(t.H()) && !t.store.tel_citoyen && !t.rpcs.some(r => r[0] == "x"));
  t.els["#ph"] = { value: "77 123 45 67" }; t.S().tok = "ok"; await t.click({ a: "otp" });
  ok("A. avant le code, le numéro n'est pas encore mémorisé (rien n'est prouvé)", !t.store.tel_citoyen && /Code reçu par SMS/.test(t.H()));
  t.els["#cd"] = { value: "123456" }; await t.click({ a: "vfy" });
  ok("A. clé tel_citoyen = numéro vérifié", t.store.tel_citoyen === "+221771234567");
  await t.click({ a: "lout" });
  ok("A. Se déconnecter : tel_citoyen et caches personnels purgés, commune/langue conservées", !("tel_citoyen" in t.store) && !("mc_d_fimela" in t.store) && !("mc_r_fimela" in t.store) && t.store.mc_co == "fimela" && t.store.mc_lang == "fr");
  await t.click({ a: "esp" });
  ok("A. déconnecté : plus de numéro prérempli", !/value="77 123/.test(t.H()));
  t = await boot({ user: false, store: { mc_co: "fimela", tel_citoyen: "+221771234567" } });
  await t.click({ a: "esp" });
  ok("A. numéro mémorisé : champ prérempli (confort uniquement)", /value="77 123 45 67"/.test(t.H()));
  t = await boot({ user: false, store: { mc_co: "fimela", tel_citoyen: "<script>alert(1)</script>" } });
  await t.click({ a: "esp" });
  ok("A/D. tel_citoyen malveillant : ignoré, jamais injecté", !/<script>alert/.test(t.H()) && /id="ph"/.test(t.H()));

  // B. RPC par téléphone : le numéro envoyé est celui du compte vérifié
  t = await boot();
  await t.click({ a: "mtx" }); await tick();
  const calls = t.rpcs.filter(r => /_par_tel$/.test(r[0]));
  ok("B. RPC *_par_tel appelées avec le numéro vérifié", calls.some(c => c[0] == "mes_roles_imposition_par_tel" && c[1].p_telephone == "+221771234567") && calls.some(c => c[0] == "mes_demandes_par_tel" && c[1].p_telephone == "+221771234567"));
  ok("B. RPC historique non appelée si la nouvelle existe", !t.rpcs.some(r => r[0] == "mes_roles_imposition" || r[0] == "mes_demandes_compte"));
  ok("B. autre commune masquée", !/AUTRECOMMUNE/.test(t.H()));
  // D. numéro inconnu : liste vide, pas d'erreur
  t = await boot({ rolesFor: "+221700000000" });
  await t.click({ a: "mtx" }); await tick();
  ok("D. numéro inconnu : liste vide, message neutre, aucune erreur ni donnée", /Aucune taxe à votre nom/.test(t.H()) && !/indisponibles/.test(t.H()) && !/Patente/.test(t.H()) && t.S().taxes.length === 0 && t.S().mine.length === 0);
  // B. migration pas encore appliquée : repli sur la RPC historique (compte vérifié)
  t = await boot({ parTelAbsente: true });
  await t.click({ a: "mtx" }); await tick();
  ok("B. repli sur mes_roles_imposition / mes_demandes_compte si la migration est absente", t.rpcs.some(r => r[0] == "mes_roles_imposition") && t.rpcs.some(r => r[0] == "mes_demandes_compte") && /Patente/.test(t.H()));

  // C + D. Paiement sandbox, anti-XSS
  t = await boot();
  await t.click({ a: "mtx" }); await tick();
  let h = t.H();
  ok("D. libellé malveillant échappé (taxes)", !h.includes(XSS) && h.includes("&lt;img src=x onerror=alert(1)&gt;"));
  ok("C. liste : libellé, montant, statut", /Patente/.test(h) && /À payer/.test(h) && /Payée/.test(h));
  ok("C. « Payer en ligne » seulement pour le statut émise (1 bouton : r1)", (h.match(/data-a="txpay"/g) || []).length === 1 && /data-a="txpay" data-id="r1"/.test(h) && />Payer en ligne</.test(h));
  await t.click({ a: "txpay", id: "r1" }); await tick();
  h = t.H();
  const ini = t.rpcs.filter(r => r[0] == "initier_paiement_taxe");
  ok("C. initier_paiement_taxe appelée avec l'id du rôle", ini.length === 1 && ini[0][1].p_role_id == "r1");
  ok("C. référence PAY-TAXE-AAAA-NNNNNN affichée", /PAY-TAXE-2026-000123/.test(h));
  ok("C. message Sandbox exact", h.includes("Mode Sandbox : simulation de paiement. Présentez cette référence au guichet."));
  ok("C. plus de bouton Payer en ligne sur un rôle déjà en attente", (h.match(/data-a="txpay"/g) || []).length === 0);
  ok("C. rafraîchissement programmé après quelques secondes", t.timers.length >= 1 && t.timers[t.timers.length - 1].ms === 5000);
  // le webhook confirme : le rôle passe à payée, le rafraîchissement l'affiche
  const r1 = t.roles().find(x => x.id == "r1"); r1.statut = "payee"; r1.quittance_ref = "TAX-ZZZZZZ123456";
  const nb = t.rpcs.filter(r => r[0] == "mes_roles_imposition_par_tel").length;
  await t.timers[t.timers.length - 1].fn(); await tick();
  ok("C. refresh : taxes rechargées, statut Payée + quittance, plus d'attente", t.rpcs.filter(r => r[0] == "mes_roles_imposition_par_tel").length > nb && /data-ref="TAX-ZZZZZZ123456"/.test(t.H()) && !/Mode Sandbox/.test(t.H()));
  // rôle d'une autre commune / inexistant : refus propre
  t = await boot();
  await t.click({ a: "mtx" }); await tick();
  await t.click({ a: "txpay", id: "r3" }); await tick();
  ok("C. rôle refusé par le serveur : message d'erreur, aucune référence", /Impossible de générer la référence/.test(t.H()) && !/PAY-TAXE-2026-000123/.test(t.H()));
  t = await boot();
  await t.click({ a: "mtx" }); await tick();
  // D. dossiers : type de demande malveillant échappé dans « Mes demandes »
  await t.click({ a: "esp" }); await tick();
  ok("D. « Mes demandes » : type malveillant échappé", !t.H().includes(XSS));

  // Déconnexion : plus aucune taxe affichée
  await t.click({ a: "lout" }); await t.click({ a: "mtx" });
  ok("Déconnexion : taxes effacées de l'écran", t.S().taxes.length === 0 && !/Patente/.test(t.H()));

  // SQL : migration RPC par téléphone
  const sql = fs.readFileSync(path.join(ROOT, "supabase", "migrations", "20261204000100_lot18_citoyen_rpc_par_tel.sql"), "utf8");
  const fn = n => sql.slice(sql.indexOf("function public." + n));
  for (const n of ["mes_roles_imposition_par_tel", "mes_demandes_par_tel"]) {
    const b = fn(n).slice(0, fn(n).indexOf("end $$;"));
    ok("SQL " + n + " : SECURITY DEFINER + search_path vide", /security definer set search_path = ''/.test(b));
    ok("SQL " + n + " : refuse si le numéro n'est pas celui du compte vérifié (liste vide)", /not \(select private\.tel_est_le_mien\(p_telephone\)\)[\s\S]*return;/.test(b));
    ok("SQL " + n + " : EXECUTE réservé à authenticated", new RegExp("revoke all on function public\\." + n + "\\(text\\) from public, anon;\\s*grant execute on function public\\." + n + "\\(text\\) to authenticated;").test(sql) && !new RegExp("grant execute on function public\\." + n + "[^;]*anon").test(sql));
  }
  ok("SQL rôles : uniquement private.mes_contribuables() (jamais un tiers)", /r\.contribuable_id in \(select private\.mes_contribuables\(\)\)/.test(sql));
  ok("SQL demandes : filtre citoyen_id = auth.uid()", /d\.citoyen_id = \(select auth\.uid\(\)\)/.test(sql));
  ok("SQL : téléphone vérifié (phone_confirmed_at) + non anonyme + empreinte SHA-256", /phone_confirmed_at is not null/.test(sql) && /is_anonymous/.test(sql) && /'sha256'/.test(sql));
  ok("SQL : helpers privés sans droit client", /revoke all on function private\.tel_verifie_hash\(\) from public, anon, authenticated;/.test(sql) && /revoke all on function private\.tel_est_le_mien\(text\) from public, anon, authenticated;/.test(sql));
  ok("SQL : aucune table ouverte à anon, aucun create policy", !/create policy|grant [^;]* on (table )?public\./i.test(sql));

  console.log(f ? "ECHECS: " + f : "TOUS OK");
  process.exit(f ? 1 : 0);
})();
