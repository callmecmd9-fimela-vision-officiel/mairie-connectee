/* Démarches payantes (espace mairie > Finances) : Tarifs, Demandes (encaissement espèces, délivrance du PDF, rejet motivé). Recettes : voir taxes.js */
E0.tarifs_dem = [];
LG.tarifs_dem = [
  () => LQ("tarifs_demarches").order("type_service"),
  r => {
    S.db.tarifs_dem = r || [];
  }
];
E0.dem_pay = [];
LG.dem_pay = [
  () => LQ("demandes").order("created_at", { ascending: false }),
  r => {
    S.db.dem_pay = r || [];
  }
];
const DPC = ["traitee", "rejetee", "cloturee"],
  DPF = n => (+n || 0).toLocaleString("fr-FR") + " FCFA",
  DPD = x => {
    const d = x ? new Date(x) : null;
    return d && !isNaN(d) ? d.toLocaleDateString("fr-FR") : "—";
  },
  DPL = x => !!x.date_limite && new Date(x.date_limite) < new Date() && !DPC.includes(x.statut) && !x.document_url,
  DPP = { non_paye: ["À encaisser", "or"], paye: ["Payé", "ok"], gratuit: ["Gratuit", "bl"] },
  DPT = [
    ["all", "Toutes"],
    ["non_paye", "À encaisser"],
    ["paye", "Payées"],
    ["retard", "En retard"],
    ["rejetee", "Rejetées"],
    ["delivree", "Délivrées"]
  ],
  DPM = (x, f) =>
    f == "all" ||
    (f == "non_paye" && x.statut_paiement == "non_paye") ||
    (f == "paye" && x.statut_paiement == "paye") ||
    (f == "retard" && DPL(x)) ||
    (f == "rejetee" && x.statut == "rejetee") ||
    (f == "delivree" && !!x.document_url);
const dempay = () => {
  const f = S.dpf || "all",
    L = D().dem_pay.filter(x => (+x.montant || 0) > 0 || x.statut_paiement != "gratuit" || DPL(x)),
    V = L.filter(x => DPM(x, f)),
    late = L.filter(DPL).length;
  return (
    `<div class="tabs">${DPT.map(t => `<button class="tb2${f == t[0] ? " on" : ""}" data-m="dpf" data-v="${t[0]}">${esc(t[1])}${t[0] == "retard" && late ? " (" + late + ")" : ""}</button>`).join("")}</div>` +
    pn(
      "Demandes",
      "doc",
      V.map(x => {
        const p = DPP[x.statut_paiement] || [x.statut_paiement || "—", "rd"],
          closed = DPC.includes(x.statut) || !!x.document_url,
          lt = DPL(x);
        return rw(
          `<div${lt ? ' data-sty="border-left:4px solid #B91C1C;padding-left:8px"' : ""}><b>${esc(x.objet || x.type || "Demande")}</b> · ${esc(DPF(x.montant))}<div class="mut">${esc(x.nom || "")} · ${esc(x.telephone || "tél. non renseigné")} · N° ${esc(x.numero)}</div><div class="mut">Déposée le ${esc(DPD(x.created_at))} · Date limite : ${esc(DPD(x.date_limite))} ${lt ? st2("Délai dépassé", "rd") : ""}</div>${x.statut == "rejetee" && x.reponse ? `<div class="mut">Motif : ${esc(x.reponse)}</div>` : ""}</div>`,
          `<span data-sty="display:grid;gap:6px;justify-items:end">${st2(p[0], p[1])}${x.document_url ? st2("Document délivré", "ok") : ""}${
            x.statut_paiement == "non_paye" && !closed
              ? `<button class="bt" data-m="dpenc" data-id="${esc(x.id)}">Encaisser espèces</button>`
              : ""
          }${
            closed
              ? ""
              : x.statut_paiement == "non_paye"
                ? `<button class="bo" disabled>Valider et délivrer (paiement requis)</button>`
                : `<label class="bt" data-sty="cursor:pointer">Valider et délivrer (PDF)<input type="file" accept="application/pdf" hidden data-dpdel="${esc(x.id)}"></label>`
          }${closed ? "" : `<button class="bo" data-m="dprej" data-id="${esc(x.id)}">Rejeter</button>`}</span>`
        );
      }).join("") || emp("Aucune demande pour ce filtre.")
    )
  );
};
const TFS = () => {
  const T = D().tarifs_dem,
    have = new Set(T.map(x => String(x.type_service).toLowerCase())),
    sug = [
      ...new Set(
        []
          .concat(
            typeof DMT != "undefined" ? DMT : [],
            (D().dmr || []).map(x => x.titre)
          )
          .filter(Boolean)
      )
    ].filter(x => !have.has(String(x).toLowerCase()));
  const row = (ty, m, id) =>
    rw(
      `<b>${esc(ty)}</b>${id ? "" : '<div class="mut">Sans tarif : gratuit</div>'}`,
      `<span data-sty="display:flex;gap:6px;align-items:center"><input type="number" min="0" step="1" data-tfin="${esc(ty)}" value="${m == null ? "" : esc(m)}" placeholder="FCFA" data-sty="width:120px"><button class="bt" data-m="tfsave" data-ty="${esc(ty)}">Enregistrer</button>${id ? `<button class="bo" data-m="tfdel" data-id="${esc(id)}">Supprimer</button>` : ""}</span>`
    );
  return (
    pn(
      "Tarifs des démarches",
      "coins",
      T.map(x => row(x.type_service, x.montant, x.id)).join("") + sug.map(x => row(x, null, "")).join("") || emp("Aucune démarche.")
    ) +
    emp(
      "Le tarif d’une démarche précise l’emporte sur celui de sa rubrique ; sans tarif, la démarche est gratuite. Le montant est figé au dépôt de la demande."
    )
  );
};
SP.finances.subs.push(["tarifs", "Tarifs"], ["dempay", "Demandes payantes"]);
RP.tarifs = ["maire", "finances", "secretariat"];
RP.dempay = ["maire", "adjoint", "cabinet", "secretariat", "finances", "agent", "etat_civil", "technique"];
SPL.tarifs = "Tarifs";
SPL.dempay = "Demandes";
SUB.tarifs = TFS;
SUB.dempay = dempay;
const dpDone = async (m, keys) => {
  await load(keys);
  S.err = m;
  render();
  window.scrollTo(0, 0);
};
document.addEventListener("click", async e => {
  const t =
    e.target &&
    e.target.closest &&
    (e.target.closest("[data-m=dpf]") ||
      e.target.closest("[data-m=dpenc]") ||
      e.target.closest("[data-m=dprej]") ||
      e.target.closest("[data-m=tfsave]") ||
      e.target.closest("[data-m=tfdel]"));
  if (!t || S.sa) return;
  const m = t.dataset.m;
  S.err = "";
  try {
    if (m == "dpf") {
      S.dpf = t.dataset.v || "all";
      render();
      return;
    }
    if (m == "dpenc") {
      const x = D().dem_pay.find(y => y.id == t.dataset.id);
      if (!x || x.statut_paiement != "non_paye") return;
      if (!confirm("Confirmer l’encaissement en espèces de " + DPF(x.montant) + " pour le dossier " + x.numero + " ?")) return;
      const r = await sb.rpc("encaisser_demande", { p_demande: x.id });
      if (r.error) throw new Error("Encaissement refusé : " + r.error.message);
      await dpDone("Encaissement enregistré. Quittance n° " + r.data, ["dem_pay", "paiements_taxes"]);
    } else if (m == "dprej") {
      const x = D().dem_pay.find(y => y.id == t.dataset.id);
      if (!x) return;
      const mo = String(prompt("Motif du rejet (obligatoire, 5 caractères minimum) :") || "").trim();
      if (mo.length < 5) throw new Error("Rejet annulé : un motif d’au moins 5 caractères est obligatoire.");
      const r = await sb.rpc("rejeter_demande", { p_demande: x.id, p_motif: mo });
      if (r.error) throw new Error("Rejet refusé : " + r.error.message);
      await dpDone("Demande rejetée : le motif est transmis au citoyen.", ["dem_pay", "demandes"]);
    } else if (m == "tfsave") {
      const ty = t.dataset.ty,
        i = document.querySelector('[data-tfin="' + String(ty).replace(/["\\]/g, "\\$&") + '"]'),
        v = i ? i.value.trim() : "";
      if (v === "" || !/^[0-9]+$/.test(v)) throw new Error("Saisissez un montant entier en FCFA (0 pour gratuit).");
      const r = await sb.rpc("definir_tarif", { p_type_service: ty, p_montant: +v });
      if (r.error) throw new Error("Tarif refusé : " + r.error.message);
      await dpDone("Tarif enregistré : " + ty + " = " + DPF(+v) + ".", ["tarifs_dem"]);
    } else if (m == "tfdel") {
      if (!confirm("Supprimer ce tarif ? La démarche redeviendra gratuite pour les nouvelles demandes.")) return;
      const r = await sb.rpc("supprimer_tarif", { p_id: t.dataset.id });
      if (r.error) throw new Error("Suppression refusée : " + r.error.message);
      await dpDone("Tarif supprimé.", ["tarifs_dem"]);
    }
  } catch (x) {
    S.err = x.message || "Erreur réseau.";
    render();
    window.scrollTo(0, 0);
  }
});
/* Valider et délivrer : choix du PDF final (paiement vérifié côté serveur) */
document.addEventListener("change", async e => {
  const i = e.target;
  if (!i || !i.dataset || !i.dataset.dpdel || S.sa) return;
  const f = i.files && i.files[0],
    x = D().dem_pay.find(y => y.id == i.dataset.dpdel);
  S.err = "";
  let path = "";
  try {
    if (!x || !f) return;
    if (x.statut_paiement == "non_paye") throw new Error("Paiement requis avant la délivrance.");
    if (f.type != "application/pdf") throw new Error("Le document final doit être un fichier PDF.");
    if (f.size > 5242880) throw new Error("PDF trop volumineux (5 Mo maximum).");
    path = S.cid + "/" + crypto.randomUUID() + ".pdf";
    const u = await sb.storage.from("documents-delivres").upload(path, f, { contentType: "application/pdf" });
    if (u.error) throw new Error("Envoi du PDF impossible : " + u.error.message);
    const r = await sb.rpc("delivrer_demande", { p_demande: x.id, p_path: path });
    if (r.error) {
      await sb.storage.from("documents-delivres").remove([path]);
      throw new Error("Délivrance refusée : " + r.error.message);
    }
    await dpDone("Document délivré : le citoyen peut le télécharger depuis son suivi.", ["dem_pay", "demandes"]);
  } catch (z) {
    S.err = z.message || "Erreur réseau.";
    render();
    window.scrollTo(0, 0);
  }
});
