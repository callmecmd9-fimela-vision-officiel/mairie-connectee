/* Interrupteur de fonctionnalités (migration 20261210000100). Fonctions suspendues : grisées pour tous ; l'écriture et la lecture sont aussi bloquées côté serveur. */
const FF_MAP = { etat_civil_registre: ["registre"], budget_local: ["budget", "rapb"] },
  FFS = { off: [], motif: {}, orig: {}, lab: {} };
async function ffLoad() {
  try {
    const [a, b] = await Promise.all([sb.rpc("fonctionnalites_suspendues"), sb.from("fonctionnalites_plateforme").select("code,motif")]);
    if (!a.error) FFS.off = a.data || [];
    (b.data || []).forEach(x => {
      FFS.motif[x.code] = x.motif;
    });
  } catch (e) {}
  ffApply();
}
function ffApply() {
  const off = new Set();
  FFS.off.forEach(c => (FF_MAP[c] || []).forEach(k => off.add(k)));
  Object.keys(FF_MAP).forEach(c =>
    FF_MAP[c].forEach(k => {
      const sub = Object.values(SP)
        .map(x => x.subs.find(s => s[0] == k))
        .find(Boolean);
      if (FFS.orig[k] === undefined && typeof SUB[k] == "function") FFS.orig[k] = SUB[k];
      if (sub && FFS.lab[k] === undefined) FFS.lab[k] = sub[1];
      if (sub) sub[1] = off.has(k) ? "\u{1F512} " + FFS.lab[k] : FFS.lab[k];
      if (FFS.orig[k]) SUB[k] = off.has(k) ? () => ffNotice(c, k) : FFS.orig[k];
    })
  );
}
const ffNotice = (c, k) =>
  c == "etat_civil_registre" && typeof ecList == "function"
    ? pn(
        FFS.lab[k] + " : lecture seule",
        "alert",
        `<p>${esc(FFS.motif[c] || "")}</p><p class="mut">Archive consultable. Saisie, rectification et copies suspendues.</p><div class="ffoff" style="pointer-events:none">${ecList()}</div>`
      )
    : pn(
    (FFS.lab[k] || "Fonctionnalité") + " : suspendue",
    "alert",
    `<div class="ffoff" aria-disabled="true" style="opacity:.6;pointer-events:none"><p>${esc(FFS.motif[c] || "Cette fonctionnalité est gérée par le système national.")}</p><p class="mut">Elle sera réactivée si la plateforme est mise en conformité. Les demandes des citoyens restent actives.</p></div>`
  );
