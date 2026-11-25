/* Budget communal (espace mairie > Finances > Budgets) : tables budgets, budget_lignes (migration 20261202000100_lot9_budget.sql) */
E0.budgets = [];
E0.budget_lignes = [];
LG.budgets = [
  () => LQ("budgets").order("annee", { ascending: false }),
  r => {
    S.db.budgets = r || [];
  }
];
LG.budget_lignes = [
  () => LQ("budget_lignes").order("chapitre"),
  r => {
    S.db.budget_lignes = r || [];
  }
];
const BDS = { brouillon: "Brouillon", vote: "Voté", approuve: "Approuvé", cloture: "Clôturé" },
  BDC = { brouillon: "or", vote: "bl", approuve: "ok", cloture: "ok" },
  BD_ROLES = ["maire", "finances"];
const bdF = n => fmt(n) + " FCFA",
  bdSum = (L, t, k) => L.filter(x => x.type_recette_depense == t).reduce((a, x) => a + (+x[k] || 0), 0);
const budget = () => {
  const B = D().budgets,
    LN = D().budget_lignes,
    peut = !S.sa && BD_ROLES.includes(S.pr);
  return pn(
    "Budgets de la commune",
    "coins",
    B.map(b => {
      const L = LN.filter(x => x.budget_id == b.id),
        n = L.length;
      return rw(
        `<b>Budget ${esc(b.annee)}</b><div class="mut" data-sty="font-size:13px">${n} ligne${n > 1 ? "s" : ""} budgétaire${n > 1 ? "s" : ""}</div>`,
        `<span data-sty="display:grid;gap:4px;justify-items:end">${st2(BDS[b.statut] || b.statut || "—", BDC[b.statut] || "")}` +
          `<span>Prévu : recettes ${esc(bdF(bdSum(L, "recette", "montant_prevu")))} · dépenses ${esc(bdF(bdSum(L, "depense", "montant_prevu")))}</span>` +
          `<span class="mut" data-sty="font-size:13px">Réalisé : recettes ${esc(bdF(bdSum(L, "recette", "montant_realise")))} · dépenses ${esc(bdF(bdSum(L, "depense", "montant_realise")))}</span></span>`
      );
    }).join("") || emp("Aucun budget enregistré pour cette commune."),
    peut ? `<button class="bt" data-m="bdnew">Nouveau budget</button>` : ""
  );
};
SP.finances.subs.push(["budgets", "Budgets"]);
RP.budgets = ["maire", "adjoint", "finances"];
SPL.budgets = "Budgets";
SUB.budgets = budget;
document.addEventListener("click", async e => {
  const t = e.target.closest("[data-m=bdnew]");
  if (!t || S.sa || !BD_ROLES.includes(S.pr)) return;
  S.err = "";
  try {
    const v = prompt("Année du nouveau budget (AAAA) :", String(new Date().getFullYear()));
    if (v === null) return;
    const an = String(v).trim();
    if (!/^\d{4}$/.test(an) || +an < 2000 || +an > 2100) throw new Error("Année invalide : indiquez quatre chiffres (ex. 2027).");
    if (D().budgets.some(b => b.annee == +an)) throw new Error("Un budget " + an + " existe déjà pour cette commune.");
    const r = await sb.from("budgets").insert({ commune_id: S.cid, annee: +an, statut: "brouillon" });
    if (r.error) throw new Error(r.error.code == "23505" ? "Un budget " + an + " existe déjà pour cette commune." : "Création refusée : " + r.error.message);
    await load(["budgets", "budget_lignes"]);
    S.err = "Budget " + an + " créé (brouillon).";
  } catch (x) {
    S.err = x.message || "Erreur réseau.";
  }
  render();
  window.scrollTo(0, 0);
});
