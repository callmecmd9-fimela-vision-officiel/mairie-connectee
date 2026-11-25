/* Suivi des marchés (espace mairie > Administration > Marchés en cours) :
   tableau de bord des marchés non clos + formulaire d'ajout (maire, finances).
   Table public.marches (colonnes reference et type_marche ajoutées par la migration 20261202_lot10_marches.sql).
   Module encapsulé : aucun identifiant global déclaré, car maire.js déclare déjà `const marches` (écran Finances > Marchés publics).
   Dépend de core.js, core-ui.js, adjoints.js (ev), maire.js (MST, MTC, MMODE, st2) : à charger après maire.js. */
(() => {
  const ROLES = ["maire", "finances"],
    CLOS = ["receptionne", "annule"],
    TYPES = [
      ["travaux", "Travaux"],
      ["fournitures", "Fournitures"],
      ["services", "Services"],
      ["prestations_intellectuelles", "Prestations intellectuelles"]
    ],
    TL = Object.fromEntries(TYPES),
    peut = () => !S.sa && ROLES.includes(S.pr);
  let ouvert = false;

  const formulaire = () =>
    pn(
      "Nouveau marché",
      "doc",
      frm(
        inp("mp_rf", "Référence", "text", "", "Ex. AOO-2027-001", 'maxlength="60"') +
          inp("mp_ob", "Objet", "text", "", "", 'maxlength="300" required') +
          sel("mp_ty", "Type de marché", [["", "—"]].concat(TYPES)) +
          sel("mp_mo", "Mode de passation", [["", "—"]].concat(MMODE)) +
          inp("mp_mt", "Montant (FCFA)", "number", 0, "", 'min="0" step="1"') +
          inp("mp_at", "Attributaire", "text", "", "", 'maxlength="200"') +
          sel("mp_st", "Statut", Object.entries(MST), "preparation")
      ) +
        `<p data-sty="margin-top:10px"><button class="bt" data-m="mpsave">Enregistrer</button> <button class="bo" data-m="mpcancel">Annuler</button></p>` +
        emp(
          "Le Maire est ordonnateur ; les paiements relèvent du comptable public. Cet écran suit les marchés, il n’enregistre aucun paiement."
        )
    );

  const marches = () => {
    const L = D().mar.filter(x => !CLOS.includes(x.statut)),
      tot = L.reduce((s, x) => s + (+x.montant || 0), 0),
      att = L.filter(x => ["attribue", "approuve", "en_cours"].includes(x.statut)).length,
      p = peut();
    return (
      `<div class="kp">${kp("k2", "doc", "Marchés en cours", L.length)}${kp("k3", "coins", "Montant total", fmt(tot) + " FCFA")}${kp("k1", "tools", "Attribués / en exécution", att)}</div>` +
      (p && ouvert ? formulaire() : "") +
      pn(
        "Marchés en cours",
        "doc",
        L.map(x =>
          rw(
            `<b>${esc(x.reference || x.numero || "Sans référence")}</b> ${esc(x.objet)}<div class="mut" data-sty="font-size:13px">${esc(TL[x.type_marche] || "Type non précisé")} · ${esc(x.attributaire || "attributaire non désigné")}</div>`,
            `<div data-sty="display:grid;gap:4px;justify-items:end"><b>${esc(fmt(x.montant))} FCFA</b>${st2(MST[x.statut] || x.statut || "—", MTC[x.statut] || "")}</div>`
          )
        ).join("") || emp("Aucun marché en cours."),
        p && !ouvert ? `<button class="bt" data-m="mpnew">Nouveau marché</button>` : ""
      )
    );
  };

  RP.marchestdb = ["maire", "finances", "secretariat"]; /* lecture : même périmètre que la politique RLS de public.marches */
  SPL.marchestdb = "Marchés en cours";
  SUB.marchestdb = marches;

  document.addEventListener("click", async e => {
    const t = e.target.closest("[data-m]"),
      m = t && t.dataset.m;
    if (!m || !/^mp(new|cancel|save)$/.test(m) || !peut()) return;
    S.err = "";
    try {
      if (m == "mpnew") ouvert = true;
      else if (m == "mpcancel") ouvert = false;
      else {
        const g = id => (($("#" + id) || {}).value || "").trim(),
          ref = g("mp_rf"),
          o = {
            commune_id: S.cid,
            numero: ref || null,
            reference: ref || null,
            objet: g("mp_ob"),
            type_marche: g("mp_ty") || null,
            mode: g("mp_mo") || null,
            montant: +g("mp_mt") || 0,
            attributaire: g("mp_at") || null,
            statut: g("mp_st") || "preparation"
          };
        if (!o.objet) throw new Error("L’objet du marché est obligatoire.");
        if (o.montant < 0) throw new Error("Le montant ne peut pas être négatif.");
        const r = await sb.from("marches").insert(o);
        if (r.error)
          throw new Error(
            r.error.code == "23505" ? "Cette référence existe déjà pour cette commune." : "Enregistrement refusé : " + r.error.message
          );
        ouvert = false;
        await load(["marches"]);
        S.err = "Marché enregistré.";
      }
    } catch (x) {
      S.err = x && x.message ? x.message : "Erreur réseau. Réessayez.";
    }
    render();
    window.scrollTo(0, 0);
  });
})();
