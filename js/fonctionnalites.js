/* Interrupteur de fonctionnalités (migration 20261210000100). Fonctions suspendues : grisées pour tous ; écriture (et lecture du budget) bloquées côté serveur. */
const FF_MAP = { etat_civil_registre: ["registre"], budget_local: ["budget", "rapb"] },
  FFS = { off: [], motif: {}, orig: {}, lab: {} };
async function ffLoad() {
  try {
    const a = await sb.rpc("fonctionnalites_suspendues");
    if (!a.error) FFS.off = a.data || [];
    const b = await sb.from("fonctionnalites_plateforme").select("code,motif");
    (b.data || []).forEach(x => {
      FFS.motif[x.code] = x.motif;
    });
  } catch (e) {}
  ffApply();
}
function ffSub(k) {
  for (const x of Object.values(SP)) {
    const s = x.subs.find(y => y[0] == k);
    if (s) return s;
  }
  return null;
}
function ffSet(c, k, isOff) {
  const sub = ffSub(k);
  if (FFS.orig[k] === undefined && typeof SUB[k] == "function") FFS.orig[k] = SUB[k];
  if (sub && FFS.lab[k] === undefined) FFS.lab[k] = sub[1];
  if (sub) sub[1] = isOff ? "\u{1F512} " + FFS.lab[k] : FFS.lab[k];
  if (FFS.orig[k]) SUB[k] = isOff ? () => ffNotice(c, k) : FFS.orig[k];
}
function ffApply() {
  const off = new Set();
  FFS.off.forEach(c => (FF_MAP[c] || []).forEach(k => off.add(k)));
  Object.keys(FF_MAP).forEach(c => FF_MAP[c].forEach(k => ffSet(c, k, off.has(k))));
}
function ffNotice(c, k) {
  const m = esc(FFS.motif[c] || "Cette fonctionnalité est gérée par le système national.");
  if (c == "etat_civil_registre" && typeof ecList == "function") {
    const h1 = `<p>${m}</p><p class="mut">Archive consultable. Saisie, rectification et copies suspendues.</p>`;
    return pn(FFS.lab[k] + " : lecture seule", "alert", h1 + `<div data-sty="pointer-events:none">${ecList()}</div>`);
  }
  const h2 = `<div data-sty="opacity:.6;pointer-events:none"><p>${m}</p></div>`;
  return pn(FFS.lab[k] + " : suspendue", "alert", h2 + `<p class="mut">Les demandes des citoyens restent actives.</p>`);
}
