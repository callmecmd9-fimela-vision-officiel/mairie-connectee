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
const PSR = { en_ligne_simule: "en ligne (simulation)", guichet: "espèces au guichet", taxe: "taxe" },
  ptQ = v => {
    const t = String(v == null ? "" : v);
    return '"' + (/^[=+\-@\t\r]/.test(t) ? "'" + t : t).replace(/"/g, '""') + '"';
  };
const ptF = n => (+n || 0).toLocaleString("fr-FR") + " FCFA",
  ptD = x => {
    const d = x ? new Date(x) : null;
    return d && !isNaN(d)
      ? d.toLocaleDateString("fr-FR") + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      : "—";
  };
// Messages clairs pour les erreurs renvoyées par la RPC valider_paiement_especes (les contrôles réels sont côté serveur)
const ptE = e => {
  const c = e && e.code,
    m = (e && e.message) || "";
  if (c === "PGRST202" || c === "42883")
    return "La validation des paiements n’est pas encore disponible sur le serveur. Contactez l’administrateur.";
  if (c === "28000" || c === "PGRST301") return "Session expirée : reconnectez-vous puis réessayez.";
  if (c === "P0002") return "Paiement introuvable pour votre commune. Actualisez la liste.";
  if (c === "40001") return "Ce paiement a été modifié entre-temps. Actualisez la liste puis réessayez.";
  if (c === "42501" || c === "22023" || c === "55000") return m || "Validation refusée.";
  return m || "Erreur réseau.";
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
          `<b>${esc(x.type_taxe || "Taxe")}</b> · ${esc(ptF(x.montant))}<div class="mut" data-sty="font-size:13px">${esc(ptD(x.created_at))} · Réf. ${esc(x.reference_paiement || "—")} · ${esc(PSR[x.source] || "")}</div>`,
          `<span data-sty="display:grid;gap:6px;justify-items:end">${st2(PTS[s] || s || "—", PTC[s] || "rd")}${s == "en_attente" && x.source == "guichet" ? (S.pr === "finances" ? `<button class="bt" data-m="ptval" data-id="${esc(x.id)}">Valider (espèces)</button>` : "") : ""}</span>`
        );
      }).join("") || emp("Aucun paiement de taxe enregistré."),
      `<button class="bo" data-m="ptcsv">Exporter CSV (comptabilité)</button>`
    ) +
    emp("Un paiement en attente peut être validé ici lorsqu’il a été réglé en espèces au guichet.")
  );
};
SP.finances.subs.push(["taxes", "Recettes / Taxes"]);
RP.taxes = ["maire", "finances", "secretariat", "agent"];
SPL.taxes = "Recettes / Taxes";
SUB.taxes = taxes;
document.addEventListener("click", e => {
  const t = e.target.closest("[data-m=ptcsv]");
  if (!t) return;
  const ok = D().paiements_taxes.filter(x => x.statut == "paye"),
    rows = [["Date", "Référence", "Objet", "Payeur", "Mode", "Montant FCFA"]].concat(
      ok.map(x => [
        ptD(x.date_paiement || x.created_at),
        x.reference_paiement,
        x.type_taxe,
        x.nom || "",
        PSR[x.source] || "",
        +x.montant || 0
      ])
    ),
    a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + rows.map(r => r.map(ptQ).join(";")).join("\n")], { type: "text/csv" }));
  a.download = "recettes-" + new Date().toISOString().slice(0, 10) + ".csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
});
document.addEventListener("click", async e => {
  if (S.pr !== "finances") return; // la RPC valider_paiement_especes n'accepte que le rôle finances
  const t = e.target.closest("[data-m=ptval]");
  if (!t || S.sa) return;
  S.err = "";
  try {
    const x = D().paiements_taxes.find(y => y.id == t.dataset.id);
    if (!x || x.statut != "en_attente") return;
    if (x.source != "guichet")
      throw new Error("Validation refusée : seul un paiement enregistré au guichet (espèces) peut être validé ici.");
    if (!confirm("Confirmer que ce paiement de " + ptF(x.montant) + " a été reçu au guichet ?")) return;
    const r = await sb.rpc("valider_paiement_especes", { p_id: x.id, p_motif: "Validation guichet" });
    if (r.error) throw new Error(ptE(r.error));
    await load(["paiements_taxes"]);
    S.err = "Paiement validé : la recette est comptabilisée.";
  } catch (x) {
    S.err = x.message || "Erreur réseau.";
  }
  render();
  window.scrollTo(0, 0);
});
