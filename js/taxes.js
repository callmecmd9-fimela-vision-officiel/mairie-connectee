/* Recettes / Taxes (espace mairie > Finances > Recettes / Taxes) */
E0.paiements_taxes = [];
LG.paiements_taxes = [
  () => LQ("paiements_taxes").order("created_at", { ascending: false }),
  r => {
    S.db.paiements_taxes = r || [];
  }
];
const PTS = { en_attente: "En attente", paye: "Payé" },
  PTC = { en_attente: "or", paye: "ok" };
const ptF = n => (+n || 0).toLocaleString("fr-FR") + " FCFA",
  ptD = x => {
    const d = x ? new Date(x) : null;
    return d && !isNaN(d) ? d.toLocaleDateString("fr-FR") + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—";
  };
const taxes = () => {
  const L = D().paiements_taxes,
    ok = L.filter(x => x.statut == "paye"),
    at = L.filter(x => x.statut == "en_attente"),
    tot = ok.reduce((a, x) => a + (+x.montant || 0), 0);
  return (
    `<div class="kp"><div class="kc k1"><div class="ki">${ic("coins", 28)}</div><div class="kl">Recettes perçues</div><div class="kv">${esc(ptF(tot))}</div><div class="ks">${ok.length} paiement${ok.length > 1 ? "s" : ""} payé${ok.length > 1 ? "s" : ""}</div></div>` +
    `<div class="kc k3"><div class="ki">${ic("alert", 28)}</div><div class="kl">En attente</div><div class="kv">${at.length}</div><div class="ks">${esc(ptF(at.reduce((a, x) => a + (+x.montant || 0), 0)))}</div></div></div>` +
    pn(
      "Paiements des taxes",
      "coins",
      L.map(x => {
        const s = x.statut;
        return rw(
          `<b>${esc(x.type_taxe || "Taxe")}</b> · ${esc(ptF(x.montant))}<div class="mut" data-sty="font-size:13px">${esc(ptD(x.created_at))} · Réf. ${esc(x.reference_paiement || "—")}</div>`,
          `<span data-sty="display:grid;gap:6px;justify-items:end">${st2(PTS[s] || s || "—", PTC[s] || "rd")}${s == "en_attente" ? `<button class="bt" data-m="ptval" data-id="${esc(x.id)}">Valider (espèces)</button>` : ""}</span>`
        );
      }).join("") || emp("Aucun paiement de taxe enregistré.")
    ) +
    emp("Un paiement en attente peut être validé ici lorsqu’il a été réglé en espèces au guichet.")
  );
};
SP.finances.subs.push(["taxes", "Recettes / Taxes"]);
RP.taxes = ["maire", "finances", "secretariat", "agent"];
SPL.taxes = "Recettes / Taxes";
SUB.taxes = taxes;
document.addEventListener("click", async e => {
  const t = e.target.closest("[data-m=ptval]");
  if (!t || S.sa) return;
  S.err = "";
  try {
    const x = D().paiements_taxes.find(y => y.id == t.dataset.id);
    if (!x || x.statut != "en_attente") return;
    if (!confirm("Confirmer que ce paiement de " + ptF(x.montant) + " a été reçu au guichet ?")) return;
    const r = await sb
      .from("paiements_taxes")
      .update({ statut: "paye", quittance_url: x.quittance_url || "/quittance?ref=" + encodeURIComponent(x.reference_paiement || x.id) })
      .eq("id", x.id)
      .eq("commune_id", S.cid)
      .eq("statut", "en_attente")
      .select("id");
    if (r.error) throw new Error(r.error.message);
    if (!r.data || !r.data.length) throw new Error("Validation refusée : vos droits ne permettent pas de valider ce paiement.");
    await load(["paiements_taxes"]);
    S.err = "Paiement validé : la recette est comptabilisée.";
  } catch (x) {
    S.err = x.message || "Erreur réseau.";
  }
  render();
  window.scrollTo(0, 0);
});
