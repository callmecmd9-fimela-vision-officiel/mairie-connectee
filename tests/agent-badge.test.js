// Photo d'agent + badge (admin mairie). Exécuter : node tests/agent-badge.test.js
const vm = require("vm");
const fs = require("fs");
const path = require("path");
const R = path.join(__dirname, "..");
let failures = 0;
const ok = (name, pass) => {
  console.log(pass ? "OK  " : "FAIL", name);
  if (!pass) failures++;
};
const CID = "11111111-1111-4111-8111-111111111111";
const AID = "22222222-2222-4222-8222-222222222222";
const data = {
  services: [{ id: "s1", code: "etat_civil", nom: "État civil", type: "service", actif: true, ordre: 1 }],
  postes: [],
  agents: [
    {
      id: AID, prenom: "Awa", nom: "Diop", fonction: "Secrétaire", service_id: "s1", actif: true, user_id: null,
      type_contrat: "Contractuel", matricule: "M001", telephone: "770001122", email: "awa.secret@example.sn", photo: CID + "/" + AID + ".webp", affectations: []
    },
    { id: "a2", prenom: "Moussa", nom: "Fall", fonction: "", service_id: null, actif: true, user_id: null, matricule: null, photo: null, affectations: [] }
  ],
  adjoints: [],
  comptes: []
};
const calls = [], uploads = [], removed = [], els = {}, prt = { innerHTML: "" }, handlers = [];
let printed = 0;
const sb = {
  async rpc(name, args) {
    calls.push([name, args]);
    if (name === "org_sa_organigramme") return { data, error: null };
    if (name === "org_sa_roles") return { data: [], error: null };
    if (name === "org_kpi") return { data: {}, error: null };
    return { data: name === "org_sa_agent_save" ? AID : null, error: null };
  },
  from() {
    const q = { select() { return q; }, eq() { return q; }, async maybeSingle() { return { data: { observations: null }, error: null }; } };
    return q;
  },
  storage: {
    from: b => ({
      async upload(p, bl, o) { uploads.push([b, p, bl, o]); return { error: null }; },
      async remove(l) { removed.push([b, l]); return { error: null }; }
    })
  }
};
const fl = (id, l, x) => "<div><label for=" + id + ">" + l + "</label>" + x + "</div>";
const inp = (id, l, ty = "text", v = "") => fl(id, l, '<input id="' + id + '" type="' + ty + '" value="' + v + '">');
const sel = (id, l, o, v) => fl(id, l, '<select id="' + id + '">' + o.map(x => "<option" + (x[0] === v ? " selected" : "") + ">" + x[1] + "</option>").join("") + "</select>");
const ctx = {
  console, Date, Promise, Math, Number, setTimeout: f => { f(); return 0; }, confirm: () => true,
  S: { pr: "admin_mairie", sa: false, cid: CID, co: "Fimela", ind: {}, err: "", tab: {}, cs: [{ id: CID, slug: "fimela", nom: "Fimela" }] },
  SP: { administration: { subs: [] } }, RP: {}, SPL: {}, SUB: {}, SANAV: [], V: {}, sb, slug: () => "fimela", render() {},
  esc: x => String(x ?? "").replace(/[&<>"']/g, m => "&#" + m.charCodeAt(0) + ";"),
  pn: (t, i, b, r = "") => "<section><h2>" + t + "</h2>" + r + b + "</section>", frm: x => x, fl, inp, sel,
  rw: (a, b) => "<div>" + a + b + "</div>", emp: x => "<p>" + x + "</p>", st2: x => "<span>" + x + "</span>",
  tabs: () => "", $: s => (s === "#prt" ? prt : els[s.slice(1)] || null),
  sign: async (b, ps) => Object.fromEntries(ps.map(p => [p, "https://x.supabase.co/sign/" + b + "/" + p + "?t=1"])),
  comp: async f => ({ type: "image/webp", size: 50000 }),
  document: { addEventListener: (n, h) => n === "click" && handlers.push(h), querySelectorAll: () => [] },
  window: { print: () => printed++, addEventListener() {}, removeEventListener() {} }
};
const c = vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(R, "js", "org-f.js"), "utf8"), c, { filename: "org-f.js" });
const E = code => vm.runInContext(code, c);
const click = async dataset => {
  const target = { dataset, disabled: false };
  for (const h of handlers) await h({ target: { closest: s => (s === "[data-of]" ? target : null) } });
};
(async () => {
  E("orgfView()");
  await new Promise(r => setTimeout(r, 0));
  E('S.tab.orgf="agents"');
  let html = E("orgfView()");
  ok("liste : photo signée affichée pour l'agent avec photo, initiales sinon", /sign\/agents-photos\//.test(html) && />MF</.test(html));
  ok("liste : bouton Badge par agent", (html.match(/data-of="agent-badge"/g) || []).length === 2);

  E('ORGF.editAgent=ORGF.data.agents[0]');
  html = E("orgfView()");
  ok("formulaire : champ photo + retrait", /id="of_aph"/.test(html) && /agent-photo-del/.test(html));

  await click({ of: "agent-badge", id: AID });
  const b = prt.innerHTML;
  ok("badge : identité, fonction, service, matricule, mairie", /Awa/.test(b) && /DIOP/.test(b) && /Secrétaire/.test(b) && /État civil/.test(b) && /M001/.test(b) && /MAIRIE DE FIMELA/.test(b));
  ok("badge : photo incluse", /bdg-ph" src="https:\/\/x\.supabase\.co/.test(b));
  ok("badge : AUCUNE donnée sensible (tél., e-mail, contrat)", !/770001122|awa\.secret|Contractuel|observations|salaire/i.test(b));
  ok("badge : impression déclenchée", printed === 1);
  await click({ of: "agent-badge", id: "a2" });
  ok("badge sans photo ni matricule : initiales, pas de matricule", /bdg-ini">MF</.test(prt.innerHTML) && !/Matricule/.test(prt.innerHTML));

  els.of_ap = { value: "Awa" }; els.of_an = { value: "Diop" }; els.of_af = { value: "Secrétaire" }; els.of_as = { value: "etat_civil" };
  els.of_au = { value: "" }; els.of_ac = { value: "Permanent" }; els.of_am = { value: "M001" }; els.of_at = { value: "" }; els.of_ae = { value: "" }; els.of_aa = { value: "1" };
  els.of_aph = { files: [{ type: "image/png", size: 100000 }] };
  await click({ of: "agent-save", id: AID });
  const up = uploads[0];
  ok("envoi : bucket privé agents-photos, chemin <commune>/<agent>.webp", up && up[0] === "agents-photos" && up[1] === CID + "/" + AID + ".webp" && up[3].upsert === true);
  const set = calls.find(x => x[0] === "org_sa_agent_photo_set");
  ok("enregistrement du chemin par RPC serveur", set && set[1].p_id === AID && set[1].p_photo === CID + "/" + AID + ".webp" && set[1].p_commune === "fimela");

  uploads.length = 0; calls.length = 0;
  els.of_aph = { files: [{ type: "application/pdf", size: 1000 }] };
  await click({ of: "agent-save", id: AID });
  ok("fichier non image refusé, fiche tout de même enregistrée", uploads.length === 0 && calls.some(x => x[0] === "org_sa_agent_save") && /photo n'a pas été envoyée/.test(ctx.S.err));
  ctx.S.err = "";
  els.of_aph = { files: [{ type: "image/png", size: 9e6 }] };
  await click({ of: "agent-save", id: AID });
  ok("image > 8 Mo refusée", uploads.length === 0 && /8 Mo/.test(ctx.S.err));

  ctx.S.err = ""; calls.length = 0;
  await click({ of: "agent-photo-del", id: AID });
  ok("retrait : RPC avec null puis suppression du fichier", calls.some(x => x[0] === "org_sa_agent_photo_set" && x[1].p_photo === null) && removed.some(x => x[1][0] === CID + "/" + AID + ".webp"));

  const sql = fs.readFileSync(path.join(R, "supabase", "proposed", "20261123_agent_photo_badge.sql"), "utf8");
  ok("SQL : bucket privé, 4 politiques, RPC gardée, organigramme expose la photo", /values \('agents-photos','agents-photos',false/.test(sql) && ["select", "insert", "update", "delete"].every(a => sql.includes("create policy agents_photos_" + a)) && /org_gest\(p_commune\)/.test(sql) && /'photo',pe\.photo/.test(sql));
  ok("SQL : fonctions sans accès anon", /revoke all on function public\.org_sa_agent_photo_set\(text,uuid,text\) from public, anon/.test(sql) && /revoke all on function private\.peut_photos_agents/.test(sql));
  ok("SQL : écriture limitée aux admins, lecture maire/RH en plus", /array\['admin_mairie','super_admin'\]/.test(sql) && /'maire','rh'/.test(sql));
  const css = fs.readFileSync(path.join(R, "css", "mairie.css"), "utf8");
  ok("CSS : carte 85,6 x 54 mm, masquée à l'écran", /\.bdg\{[^}]*width:85\.6mm;height:54mm/.test(css) && /#prt \.bdg-wrap\{display:none\}/.test(css));
  console.log(failures ? "ECHECS: " + failures : "TOUS OK");
  process.exit(failures ? 1 : 0);
})();
