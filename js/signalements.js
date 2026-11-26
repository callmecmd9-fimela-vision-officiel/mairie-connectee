/* Signalements citoyens (espace mairie > Citoyens > Signalements citoyens) */
E0.signalements_citoyens = [];
LG.signalements_citoyens = [
  () => LQ("signalements_citoyens").order("created_at", { ascending: false }),
  r => {
    S.db.signalements_citoyens = r || [];
  }
];
const SGS = { nouveau: "Nouveau", en_cours: "En cours", resolu: "Résolu", rejete: "Rejeté" },
  SGC = { nouveau: "bl", en_cours: "or", resolu: "ok", rejete: "rd" },
  SGK = { nouveau: "#2563EB", en_cours: "#D97706", resolu: "#16A34A", rejete: "#DC2626" };
const sgDate = x => {
  const d = x ? new Date(x) : null;
  return d && !isNaN(d) ? d.toLocaleDateString("fr-FR") + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—";
};
const sgPos = x => {
  const a = x.latitude == null ? NaN : Number(x.latitude),
    o = x.longitude == null ? NaN : Number(x.longitude);
  return isFinite(a) && isFinite(o) && Math.abs(a) <= 90 && Math.abs(o) <= 180 ? [a, o] : null;
};
const sgPhoto = x =>
  /^https:\/\//.test(x.photo_url || "")
    ? `<a href="${esc(x.photo_url)}" target="_blank" rel="noopener noreferrer" aria-label="Agrandir la photo du signalement"><img class="th" src="${esc(x.photo_url)}" alt="Photo du signalement" loading="lazy"></a>`
    : "";
/* Localités de la commune active (COMMUNES_GEO, LOT A) pour le menu « Aller à un village/quartier ». */
const sgLoc = () => {
  try {
    const g = typeof COMMUNES_GEO != "undefined" ? COMMUNES_GEO.get(slug()) : null;
    return (g && g.localites) || [];
  } catch (e) {
    return [];
  }
};
const sgLocSel = () => {
  const lc = sgLoc();
  return lc.length
    ? `<p><label for="sg-loc" class="mut">Aller à un village/quartier</label> <select id="sg-loc" data-m="sgloc" aria-label="Aller à un village ou quartier"><option value="">— Choisir —</option>${lc.map((l, i) => `<option value="${i}">${esc(l.nom)} (${esc(l.type || "")})</option>`).join("")}</select></p>`
    : "";
};
const signalements = () => {
  const L = D().signalements_citoyens,
    f = SGS[S.sgf] ? S.sgf : "tous",
    V = f == "tous" ? L : L.filter(x => x.statut == f),
    n = k => L.filter(x => x.statut == k).length,
    flt = [["tous", "Tous (" + L.length + ")"]]
      .concat(Object.keys(SGS).map(k => [k, SGS[k] + " (" + n(k) + ")"]))
      .map(
        x => `<button class="tg${x[0] == f ? " bl" : ""}" data-m="sgflt" data-v="${x[0]}" aria-pressed="${x[0] == f}">${esc(x[1])}</button>`
      )
      .join(" ");
  return (
    pn(
      "Carte des signalements",
      "map",
      sgLocSel() +
        `<div id="sigmap" class="map" role="img" aria-label="Carte des signalements de la commune"></div><div class="lgd">${Object.keys(SGS)
          .map(k => `<span><i data-sty="background:${SGK[k]}"></i>${SGS[k]}</span>`)
          .join("")}</div>`
    ) +
    pn(
      "Signalements des citoyens",
      "alert",
      `<p data-sty="display:flex;flex-wrap:wrap;gap:8px">${flt}</p>` +
        (V.map(x => {
          const s = SGS[x.statut] ? x.statut : "nouveau";
          return `<div class="rw" data-sty="flex-wrap:wrap;align-items:flex-start"><div class="rl"><b>${esc(x.categorie || "Autre")}</b> · <span class="mut">${esc(sgDate(x.created_at))}</span><div>${esc(x.description || "")}</div>${sgPhoto(x)}</div><div data-sty="display:grid;gap:6px;justify-items:end">${st2(SGS[s], SGC[s])}<span data-sty="display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end">${Object.keys(
            SGS
          )
            .filter(k => k != s)
            .map(
              k =>
                `<button class="tg" data-m="sgst" data-id="${esc(x.id)}" data-v="${k}" aria-label="Marquer comme ${esc(SGS[k])}">${esc(SGS[k])}</button>`
            )
            .join("")}</span></div></div>`;
        }).join("") || emp("Aucun signalement pour ce filtre."))
    )
  );
};
SP.citoyens.subs.push(["signalements", "Signalements citoyens"]);
RP.signalements = ["maire", "adjoint", "cabinet", "secretariat", "technique"];
SPL.signalements = "Signalements citoyens";
SUB.signalements = signalements;
function sgMap() {
  if (S.sgmap) {
    try {
      S.sgmap.remove();
    } catch (e) {}
    S.sgmap = null;
  }
  const el = $("#sigmap");
  if (!el) return;
  const I = S.ind || {},
    pts = [];
  D().signalements_citoyens.forEach(x => {
    const p = sgPos(x);
    if (!p) return;
    const s = SGS[x.statut] ? x.statut : "nouveau",
      d = String(x.description || "");
    pts.push({
      lat: p[0],
      lng: p[1],
      c: SGK[s],
      l1: x.categorie || "Autre",
      l2: SGS[s],
      l3: d.length > 140 ? d.slice(0, 140) + "…" : d
    });
  });
  S.sgmap = mapbox3d(el, {
    centre: I.centre_lng != null && I.centre_lat != null ? [I.centre_lng, I.centre_lat] : null,
    zoom: I.zoom || 0,
    fitMax: 16,
    one: 15,
    pts
  });
}
const sgRender0 = render0;
render0 = function () {
  sgRender0();
  sgMap();
};
document.addEventListener("change", e => {
  const t = e.target && e.target.closest && e.target.closest("[data-m=sgloc]");
  if (!t || t.value === "") return;
  const l = sgLoc()[+t.value];
  if (l && S.sgmap) S.sgmap.goto(l.lat, l.lng, 16);
});
document.addEventListener("click", async e => {
  const f = e.target.closest("[data-m=sgflt]");
  if (f) {
    S.sgf = f.dataset.v;
    render();
    return;
  }
  const t = e.target.closest("[data-m=sgst]");
  if (!t || S.sa) return;
  S.err = "";
  try {
    const v = t.dataset.v;
    if (!SGS[v]) throw new Error("Statut inconnu.");
    const x = D().signalements_citoyens.find(y => y.id == t.dataset.id);
    if (!x || x.statut == v) return;
    const r = await sb.from("signalements_citoyens").update({ statut: v }).eq("id", x.id).eq("commune_id", S.cid).select("id");
    if (r.error) throw new Error(r.error.message);
    if (!r.data || !r.data.length) throw new Error("Modification refusée : vos droits ne permettent pas de changer ce statut.");
    await load(["signalements_citoyens"]);
    S.err = "Statut mis à jour : " + SGS[v] + ".";
  } catch (x) {
    S.err = x.message || "Erreur réseau.";
  }
  render();
  window.scrollTo(0, 0);
});
