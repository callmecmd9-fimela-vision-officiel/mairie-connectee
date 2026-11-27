/* Budget communal (espace mairie > Finances > Budgets) : tables budgets, budget_lignes, engagements (migration 20261202000100_lot9_budget.sql).
   Lot D (migration 20261207_budget_conseil.sql) : parcours dob -> brouillon -> vote -> approuve -> cloture ; le vote exige le Débat d'Orientation Budgétaire
   (date_dob + pv_dob_url) ; l'approbation exige la preuve de transmission à la tutelle (RPC budget_transmettre_tutelle / budget_decider_tutelle).
   Lot E (migration 20261208_marches_fiscalite.sql) : circuit des dépenses ordonnateur (Maire) / comptable public (finances, quittance du Trésor).
   Règles pures : js/regles-municipales.js (RM). */
E0.budgets = [];
E0.budget_lignes = [];
E0.engagements = [];
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
LG.engagements = [
  () => LQ("engagements").order("date_engagement", { ascending: false }),
  r => {
    S.db.engagements = r || [];
  }
];
const BDS = { dob: "Débat d’orientation (DOB)", brouillon: "Brouillon", vote: "Voté", approuve: "Approuvé", cloture: "Clôturé" },
  BDC = { dob: "or", brouillon: "or", vote: "bl", approuve: "ok", cloture: "ok" },
  TUT = { en_attente: "En attente de la tutelle", approuve: "Approuvé par la tutelle", rejete: "Rejeté par la tutelle" },
  TUC = { en_attente: "or", approuve: "ok", rejete: "rd" },
  BD_ROLES = ["maire", "finances"],
  /* Saisie d'un engagement : maire, finances, secrétariat (politique RLS engagements_creation alignée) */
  EG_ROLES = ["maire", "finances", "secretariat"],
  EGS = { engage: "Engagé", liquide: "Liquidé", ordonnance: "Ordonnancé", paye: "Payé", annule: "Annulé" },
  EGC = { engage: "bl", liquide: "bl", ordonnance: "or", paye: "ok", annule: "" };
/* Circuit de la dépense : ordonnateur (Maire) puis comptable public (finances / Trésor) ; libellés des actions et statuts suivants */
const EGA = { bdeliq: ["liquide", "Liquider"], bdeord: ["ordonnance", "Ordonnancer (Maire)"] };
const bdF = n => fmt(n) + " FCFA",
  bdSum = (L, t, k) => L.filter(x => x.type_recette_depense == t).reduce((a, x) => a + (+x[k] || 0), 0),
  /* Totaux automatiques d'un budget : somme de toutes ses lignes (montant_prevu, montant_realise) */
  bdTotaux = L => ({
    prevu: L.reduce((a, x) => a + (+x.montant_prevu || 0), 0),
    realise: L.reduce((a, x) => a + (+x.montant_realise || 0), 0)
  }),
  BDT = { recette: "Recette", depense: "Dépense" },
  /* Engagements d'une ligne (les engagements annulés ne consomment plus de crédit) */
  bdEngs = (EG, id) => EG.filter(e => e.budget_ligne_id == id),
  bdEngSum = (EG, id) =>
    bdEngs(EG, id)
      .filter(e => e.statut != "annule")
      .reduce((a, e) => a + (+e.montant || 0), 0),
  /* Crédit disponible = montant_prevu - (somme des engagements + montant_realise) */
  bdCredit = (x, EG) => (+x.montant_prevu || 0) - (bdEngSum(EG, x.id) + (+x.montant_realise || 0));
let bdOuv = null /* id du budget dont on affiche le détail */,
  bdFrm = false /* formulaire « Ajouter une ligne » ouvert */,
  bdEng = null /* id de la ligne budgétaire dont le formulaire « Nouvel engagement » est ouvert */,
  bdPay = null; /* id de l'engagement dont le formulaire « Paiement du comptable public » est ouvert */
/* Cycle budgétaire : étapes, DOB, transmission à la tutelle (règles dans RM, appliquées aussi par la base) */
const bdCycle = (b, peut) => {
  const suivant = RM.budgetSuivant(b.statut),
    etapes = RM.BUDGET_ETAPES.map(k => st2((k == b.statut ? "▶ " : "") + BDS[k], k == b.statut ? BDC[k] || "" : "")).join(" "),
    edit = peut && ["dob", "brouillon"].includes(b.statut),
    dob = RM.dobRenseigne(b),
    tut = b.statut == "vote" || b.statut == "approuve" || b.statut_tutelle;
  return pn(
    "Cycle budgétaire",
    "coins",
    `<div data-sty="display:flex;flex-wrap:wrap;gap:6px">${etapes}</div>` +
      rw(
        `<b>Débat d’Orientation Budgétaire</b><div class="mut" data-sty="font-size:13px">Obligatoire avant le vote du budget</div>`,
        dob
          ? st2("Tenu le " + b.date_dob, "ok") +
              (/^https?:\/\//.test(b.pv_dob_url)
                ? ` <a href="${esc(b.pv_dob_url)}" target="_blank" rel="noopener noreferrer">Procès-verbal</a>`
                : ` <span class="mut">PV : ${esc(b.pv_dob_url)}</span>`)
          : st2("Non renseigné", "or")
      ) +
      (edit
        ? frm(
            inp("bd_dd", "Date du DOB", "date", b.date_dob || "", "", "required") +
              inp(
                "bd_dp",
                "Procès-verbal du DOB (lien ou référence)",
                "text",
                b.pv_dob_url || "",
                "https://… ou N° du PV",
                'maxlength="500" required'
              )
          ) + `<p data-sty="margin-top:10px"><button class="bt" data-m="bddobsave">Enregistrer le DOB</button></p>`
        : "") +
      (tut
        ? rw(
            `<b>Transmission à la tutelle</b><div class="mut" data-sty="font-size:13px">${b.date_transmission_tutelle ? "Transmis le " + esc(b.date_transmission_tutelle) + " · preuve : " + esc(b.preuve_transmission_url || "—") : "Aucune transmission enregistrée"}</div>`,
            st2(TUT[b.statut_tutelle] || "Non transmis", TUC[b.statut_tutelle] || "or")
          )
        : "") +
      (peut && b.statut == "vote" && !RM.transmissionProuvee(b)
        ? frm(
            inp("bd_td", "Date de transmission à la tutelle", "date", new Date().toISOString().slice(0, 10), "", "required") +
              inp(
                "bd_tp",
                "Preuve de transmission (bordereau, accusé de réception)",
                "text",
                "",
                "Lien ou référence",
                'maxlength="500" required'
              )
          ) + `<p data-sty="margin-top:10px"><button class="bt" data-m="bdtrsave">Enregistrer la transmission</button></p>`
        : "") +
      (peut && b.statut == "vote" && RM.transmissionProuvee(b)
        ? `<p data-sty="margin-top:10px"><button class="bt" data-m="bdtrapp">La tutelle approuve le budget</button> <button class="bo" data-m="bdtrrej">La tutelle rejette le budget</button></p>`
        : "") +
      (peut && suivant && ["dob", "brouillon"].includes(b.statut)
        ? `<p data-sty="margin-top:10px"><button class="bt" data-m="bdetape" data-s="${esc(suivant)}">Passer à l’étape « ${esc(BDS[suivant])} »</button></p>`
        : "")
  );
};
/* Actions du circuit de la dépense : liquider (maire, finances), ordonnancer (Maire = ordonnateur), payer (finances = comptable public) */
const egActions = (e, peutEg) => {
  if (!peutEg || S.sa) return "";
  const b = [];
  if (e.statut == "engage" && ["maire", "finances"].includes(S.pr))
    b.push(`<button class="bo" data-m="bdeliq" data-id="${esc(e.id)}">Liquider</button>`);
  if (e.statut == "liquide" && RM.ORDONNATEURS.includes(S.pr))
    b.push(`<button class="bo" data-m="bdeord" data-id="${esc(e.id)}">Ordonnancer (Maire)</button>`);
  if (e.statut == "ordonnance" && RM.COMPTABLES.includes(S.pr) && bdPay != e.id)
    b.push(`<button class="bo" data-m="bdepay" data-id="${esc(e.id)}">Enregistrer le paiement du Trésor</button>`);
  return b.length ? `<span data-sty="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${b.join("")}</span>` : "";
};
const bdDetail = (b, LN, EG, peut, peutEg) => {
  const L = LN.filter(x => x.budget_id == b.id).sort(
      (x, y) =>
        String(x.chapitre).localeCompare(String(y.chapitre), "fr", { numeric: true }) ||
        String(x.article).localeCompare(String(y.article), "fr", { numeric: true })
    ),
    T = bdTotaux(L),
    LD = L.filter(x => x.type_recette_depense == "depense"),
    engTot = LD.reduce((a, x) => a + bdEngSum(EG, x.id), 0),
    creditTot = LD.reduce((a, x) => a + bdCredit(x, EG), 0),
    ligEng = bdEng && LD.find(x => x.id == bdEng),
    formEng = ligEng
      ? pn(
          `Nouvel engagement · Chapitre ${esc(ligEng.chapitre)} · Article ${esc(ligEng.article)}`,
          "coins",
          `<p class="mut" data-sty="font-size:13px">Crédit disponible : ${esc(bdF(bdCredit(ligEng, EG)))}</p>` +
            frm(
              inp("eg_mt", "Montant de l'engagement (FCFA)", "number", "", "Ex. 150000", 'min="1" step="1" required') +
                inp("eg_dt", "Date d'engagement", "date", new Date().toISOString().slice(0, 10), "", "required")
            ) +
            `<p data-sty="margin-top:10px"><button class="bt" data-m="bdesave">Enregistrer l'engagement</button> <button class="bo" data-m="bdecancel">Annuler</button></p>`
        )
      : "",
    engPay = bdPay && EG.find(e => e.id == bdPay && e.statut == "ordonnance"),
    formPay = engPay
      ? pn(
          "Paiement par le comptable public",
          "coins",
          `<p class="mut" data-sty="font-size:13px">Montant ordonnancé : ${esc(bdF(engPay.montant))}. Le paiement est exécuté par le comptable public (Receveur municipal / Trésor) ; enregistrez ici sa quittance. L’ordonnateur ne peut pas l’enregistrer.</p>` +
            frm(
              inp("eg_cp", "Comptable public (Receveur municipal)", "text", "", "Nom du comptable", 'maxlength="150" required') +
                inp("eg_rq", "Référence de la quittance du Trésor", "text", "", "", 'maxlength="80" required') +
                inp("eg_dp", "Date de paiement", "date", new Date().toISOString().slice(0, 10), "", "required")
            ) +
            `<p data-sty="margin-top:10px"><button class="bt" data-m="bdepsave">Enregistrer le paiement</button> <button class="bo" data-m="bdepcancel">Annuler</button></p>`
        )
      : "",
    cycle = bdCycle(b, peut),
    form = pn(
      "Ajouter une ligne budgétaire",
      "coins",
      frm(
        inp("bl_ch", "Chapitre", "text", "", "Ex. 011", 'maxlength="20" required') +
          inp("bl_ar", "Article", "text", "", "Ex. 6061", 'maxlength="20" required') +
          sel(
            "bl_ty",
            "Type",
            [
              ["depense", "Dépense"],
              ["recette", "Recette"]
            ],
            "depense"
          ) +
          inp("bl_pr", "Montant prévu (FCFA)", "number", 0, "", 'min="0" step="1"') +
          inp("bl_re", "Montant réalisé (FCFA)", "number", 0, "", 'min="0" step="1"')
      ) +
        `<p data-sty="margin-top:10px"><button class="bt" data-m="bdlsave">Enregistrer</button> <button class="bo" data-m="bdlcancel">Annuler</button></p>`
    );
  return (
    `<div class="kp">${kp("k2", "coins", "Montant total prévu", bdF(T.prevu))}${kp("k3", "coins", "Montant total réalisé", bdF(T.realise))}${kp("k1", "doc", "Lignes budgétaires", L.length)}${kp("k2", "coins", "Total engagé (dépenses)", bdF(engTot))}${kp("k3", "coins", "Crédit disponible (dépenses)", bdF(creditTot))}</div>` +
    cycle +
    (peut && bdFrm ? form : "") +
    (peutEg ? formEng : "") +
    (peutEg ? formPay : "") +
    pn(
      `Budget ${esc(b.annee)} · ${esc(BDS[b.statut] || b.statut || "—")}`,
      "coins",
      L.map(x => {
        const dep = x.type_recette_depense == "depense",
          E = bdEngs(EG, x.id),
          cr = bdCredit(x, EG);
        return (
          rw(
            `<b>Chapitre ${esc(x.chapitre)} · Article ${esc(x.article)}</b><div class="mut" data-sty="font-size:13px">${esc(BDT[x.type_recette_depense] || x.type_recette_depense || "—")}</div>`,
            `<span data-sty="display:grid;gap:4px;justify-items:end"><span>Prévu : ${esc(bdF(x.montant_prevu))}</span><span class="mut" data-sty="font-size:13px">Réalisé : ${esc(bdF(x.montant_realise))}</span>` +
              (dep
                ? `<span class="mut" data-sty="font-size:13px">Engagé : ${esc(bdF(bdEngSum(EG, x.id)))}</span>` +
                  st2("Crédit disponible : " + bdF(cr), cr < 0 ? "or" : "ok")
                : "") +
              `</span>`
          ) +
          (dep
            ? `<div data-sty="margin:0 0 12px 16px">` +
              (E.length
                ? E.map(e =>
                    rw(
                      `<span class="mut" data-sty="font-size:13px">Engagement du ${esc(e.date_engagement || "—")}${e.date_ordonnancement ? " · ordonnancé le " + esc(e.date_ordonnancement) : ""}${e.ref_quittance_tresor ? " · quittance Trésor " + esc(e.ref_quittance_tresor) + (e.comptable_public ? " (" + esc(e.comptable_public) + ")" : "") : ""}</span>`,
                      `<span data-sty="display:grid;gap:4px;justify-items:end"><span>${esc(bdF(e.montant))}</span>${st2(EGS[e.statut] || e.statut || "—", EGC[e.statut] || "")}${egActions(e, peutEg)}</span>`
                    )
                  ).join("")
                : `<div class="mut" data-sty="font-size:13px">Aucun engagement sur cette ligne.</div>`) +
              (peutEg && bdEng != x.id
                ? `<p data-sty="margin-top:6px"><button class="bt" data-m="bdenew" data-id="${esc(x.id)}">Nouvel engagement</button></p>`
                : "") +
              `</div>`
            : "")
        );
      }).join("") || emp("Aucune ligne budgétaire pour ce budget."),
      `<button class="bo" data-m="bdback">← Retour aux budgets</button> ` +
        (peut && !bdFrm ? `<button class="bt" data-m="bdlnew">Ajouter une ligne</button>` : "")
    ) +
    (L.length
      ? emp(
          `Recettes : prévu ${esc(bdF(bdSum(L, "recette", "montant_prevu")))} · réalisé ${esc(bdF(bdSum(L, "recette", "montant_realise")))} — Dépenses : prévu ${esc(bdF(bdSum(L, "depense", "montant_prevu")))} · réalisé ${esc(bdF(bdSum(L, "depense", "montant_realise")))}`
        )
      : "")
  );
};
const budget = () => {
  const B = D().budgets,
    LN = D().budget_lignes,
    EG = D().engagements || [],
    peut = !S.sa && BD_ROLES.includes(S.pr),
    peutEg = !S.sa && EG_ROLES.includes(S.pr),
    ouvert = bdOuv && B.find(b => b.id == bdOuv);
  if (ouvert) return bdDetail(ouvert, LN, EG, peut, peutEg);
  return pn(
    "Budgets de la commune",
    "coins",
    B.map(b => {
      const L = LN.filter(x => x.budget_id == b.id),
        n = L.length;
      return (
        `<div role="button" tabindex="0" data-m="bdsel" data-id="${esc(b.id)}" data-sty="cursor:pointer" title="Voir le détail des lignes">` +
        rw(
          `<b>Budget ${esc(b.annee)}</b><div class="mut" data-sty="font-size:13px">${n} ligne${n > 1 ? "s" : ""} budgétaire${n > 1 ? "s" : ""}</div>`,
          `<span data-sty="display:grid;gap:4px;justify-items:end">${st2(BDS[b.statut] || b.statut || "—", BDC[b.statut] || "")}` +
            `<span>Prévu : recettes ${esc(bdF(bdSum(L, "recette", "montant_prevu")))} · dépenses ${esc(bdF(bdSum(L, "depense", "montant_prevu")))}</span>` +
            `<span class="mut" data-sty="font-size:13px">Réalisé : recettes ${esc(bdF(bdSum(L, "recette", "montant_realise")))} · dépenses ${esc(bdF(bdSum(L, "depense", "montant_realise")))}</span></span>`
        ) +
        `</div>`
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
    const r = await sb.from("budgets").insert({ commune_id: S.cid, annee: +an, statut: "dob" });
    if (r.error)
      throw new Error(
        r.error.code == "23505" ? "Un budget " + an + " existe déjà pour cette commune." : "Création refusée : " + r.error.message
      );
    await load(["budgets", "budget_lignes", "engagements"]);
    S.err = "Budget " + an + " créé (étape : débat d’orientation budgétaire).";
  } catch (x) {
    S.err = x.message || "Erreur réseau.";
  }
  render();
  window.scrollTo(0, 0);
});
/* Détail d'un budget : ouverture / fermeture, ajout d'une ligne (maire, finances) et saisie d'un engagement (maire, finances, secrétariat) */
document.addEventListener("click", async e => {
  const t = e.target.closest("[data-m]"),
    m = t && t.dataset.m;
  if (!m || !/^bd(sel|back|lnew|lcancel|lsave|enew|ecancel|esave|eliq|eord|epay|epcancel|epsave|dobsave|etape|trsave|trapp|trrej)$/.test(m))
    return;
  if (m == "bdsel") {
    bdOuv = t.dataset.id || null;
    bdFrm = false;
    bdEng = null;
    bdPay = null;
    S.err = "";
    render();
    window.scrollTo(0, 0);
    return;
  }
  if (m == "bdback") {
    bdOuv = null;
    bdFrm = false;
    bdEng = null;
    bdPay = null;
    S.err = "";
    render();
    return;
  }
  const eg = /^bde(new|cancel|save|liq|ord|pay|pcancel|psave)$/.test(m);
  if (S.sa || !(eg ? EG_ROLES : BD_ROLES).includes(S.pr)) return;
  S.err = "";
  try {
    if (m == "bdlnew") {
      bdFrm = true;
      bdEng = null;
    } else if (m == "bdlcancel") bdFrm = false;
    else if (m == "bdenew") {
      bdEng = t.dataset.id || null;
      bdFrm = false;
    } else if (m == "bdecancel") bdEng = null;
    else if (m == "bdetape" || m == "bddobsave" || m == "bdtrsave" || m == "bdtrapp" || m == "bdtrrej") {
      const b = D().budgets.find(x => x.id == bdOuv),
        g = id => (($("#" + id) || {}).value || "").trim();
      if (!b) throw new Error("Budget introuvable : retournez à la liste des budgets.");
      if (m == "bddobsave") {
        if (!["dob", "brouillon"].includes(b.statut)) throw new Error("Le DOB ne se modifie plus une fois le budget voté.");
        const dd = g("bd_dd"),
          pv = g("bd_dp");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dd)) throw new Error("La date du DOB est obligatoire.");
        if (!pv) throw new Error("Le procès-verbal du DOB (lien ou référence) est obligatoire.");
        const r = await sb.from("budgets").update({ date_dob: dd, pv_dob_url: pv }).eq("id", b.id);
        if (r.error) throw new Error("Enregistrement du DOB refusé : " + r.error.message);
        S.err = "Débat d’orientation budgétaire enregistré.";
      } else if (m == "bdetape") {
        const cible = t.dataset.s,
          mt = RM.budgetBlocage(b, cible);
        if (mt) throw new Error(mt);
        if (cible == "vote" && !confirm("Passer le budget " + b.annee + " au vote ?\n\nUne fois voté, le budget n’est plus modifiable."))
          return;
        const r = await sb.from("budgets").update({ statut: cible }).eq("id", b.id);
        if (r.error) throw new Error("Changement d’étape refusé : " + r.error.message);
        S.err = "Budget " + b.annee + " : étape « " + BDS[cible] + " ».";
      } else if (m == "bdtrsave") {
        const d = { date: g("bd_td"), preuve: g("bd_tp") },
          mt = RM.tutelleBlocage(b, "transmettre", d);
        if (mt) throw new Error(mt);
        const r = await sb.rpc("budget_transmettre_tutelle", { p_budget: b.id, p_date: d.date, p_preuve_url: d.preuve });
        if (r.error) throw new Error("Transmission refusée : " + r.error.message);
        S.err = "Transmission à la tutelle enregistrée.";
      } else {
        const dec = m == "bdtrapp" ? "approuve" : "rejete",
          mt = RM.tutelleBlocage(b, dec);
        if (mt) throw new Error(mt);
        if (
          !confirm(
            dec == "approuve"
              ? "Enregistrer l’approbation du budget " + b.annee + " par la tutelle ?"
              : "Enregistrer le rejet du budget " + b.annee + " par la tutelle ?"
          )
        )
          return;
        const r = await sb.rpc("budget_decider_tutelle", { p_budget: b.id, p_decision: dec });
        if (r.error) throw new Error("Décision refusée : " + r.error.message);
        S.err =
          dec == "approuve"
            ? "Budget " + b.annee + " approuvé par la tutelle."
            : "Rejet de la tutelle enregistré : le budget reste au statut « voté ».";
      }
      await load(["budgets", "budget_lignes", "engagements"]);
    } else if (m == "bdeliq" || m == "bdeord" || m == "bdepay" || m == "bdepcancel" || m == "bdepsave") {
      const e = (D().engagements || []).find(x => x.id == (m == "bdepsave" ? bdPay : t.dataset.id)),
        g = id => (($("#" + id) || {}).value || "").trim();
      if (m == "bdepcancel") bdPay = null;
      else if (m == "bdepay") {
        if (!e) throw new Error("Engagement introuvable.");
        bdPay = e.id;
        bdEng = null;
        bdFrm = false;
      } else {
        if (!e) throw new Error("Engagement introuvable : actualisez la page.");
        const cible = m == "bdeliq" ? "liquide" : m == "bdeord" ? "ordonnance" : "paye",
          d = m == "bdepsave" ? { comptable_public: g("eg_cp"), ref_quittance_tresor: g("eg_rq"), date_paiement_tresor: g("eg_dp") } : null,
          mt = RM.engagementBlocage(e, cible, S.pr, S.uid, d);
        if (mt) throw new Error(mt);
        const o = cible == "paye" ? { statut: cible, statut_tresor: "paye", ...d } : { statut: cible },
          r = await sb.from("engagements").update(o).eq("id", e.id);
        if (r.error) throw new Error("Changement de statut refusé : " + r.error.message);
        bdPay = null;
        await load(["budgets", "budget_lignes", "engagements"]);
        S.err = "Engagement " + (EGS[cible] || cible).toLowerCase() + ".";
      }
    } else if (m == "bdesave") {
      const b = D().budgets.find(x => x.id == bdOuv),
        x = b && D().budget_lignes.find(l => l.id == bdEng && l.budget_id == b.id);
      if (!b) throw new Error("Budget introuvable : retournez à la liste des budgets.");
      if (!x) throw new Error("Ligne budgétaire introuvable : rouvrez le formulaire d’engagement.");
      if (x.type_recette_depense != "depense") throw new Error("Un engagement ne peut porter que sur une ligne de dépense.");
      const g = id => (($("#" + id) || {}).value || "").trim(),
        montant = +g("eg_mt"),
        dt = g("eg_dt"),
        credit = bdCredit(x, D().engagements || []);
      if (!(montant > 0)) throw new Error("Le montant de l’engagement doit être supérieur à zéro.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dt)) throw new Error("Date d’engagement invalide.");
      if (montant > credit) throw new Error("Crédit insuffisant : " + bdF(credit) + " disponible sur cette ligne.");
      const r = await sb.from("engagements").insert({ commune_id: S.cid, budget_ligne_id: x.id, montant: montant, date_engagement: dt });
      if (r.error) throw new Error("Engagement refusé : " + r.error.message);
      await load(["budgets", "budget_lignes", "engagements"]);
      bdEng = null;
      S.err = "Engagement de " + bdF(montant) + " enregistré (chapitre " + x.chapitre + ", article " + x.article + ").";
    } else {
      const b = D().budgets.find(x => x.id == bdOuv);
      if (!b) throw new Error("Budget introuvable : retournez à la liste des budgets.");
      const g = id => (($("#" + id) || {}).value || "").trim(),
        o = {
          commune_id: S.cid,
          budget_id: b.id,
          chapitre: g("bl_ch"),
          article: g("bl_ar"),
          type_recette_depense: g("bl_ty"),
          montant_prevu: +g("bl_pr") || 0,
          montant_realise: +g("bl_re") || 0
        };
      if (!o.chapitre || o.chapitre.length > 20) throw new Error("Le chapitre est obligatoire (20 caractères maximum).");
      if (!o.article || o.article.length > 20) throw new Error("L’article est obligatoire (20 caractères maximum).");
      if (!BDT[o.type_recette_depense]) throw new Error("Type invalide : recette ou dépense.");
      if (o.montant_prevu < 0 || o.montant_realise < 0) throw new Error("Les montants ne peuvent pas être négatifs.");
      const r = await sb.from("budget_lignes").insert(o);
      if (r.error)
        throw new Error(
          r.error.code == "23505"
            ? "Cette ligne existe déjà (même type, chapitre et article) pour ce budget."
            : "Ajout refusé : " + r.error.message
        );
      await load(["budgets", "budget_lignes", "engagements"]);
      bdFrm = false;
      S.err = "Ligne ajoutée au budget " + b.annee + ".";
    }
  } catch (x) {
    S.err = x.message || "Erreur réseau.";
  }
  render();
  window.scrollTo(0, 0);
});
document.addEventListener("keydown", e => {
  if ((e.key == "Enter" || e.key == " ") && e.target.matches && e.target.matches("[data-m=bdsel]")) {
    e.preventDefault();
    e.target.click();
  }
});
