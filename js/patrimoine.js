/* Biens communaux (espace mairie > Administration > Biens communaux) : liste filtrable par catégorie + ajout d'un bien.
   Table public.patrimoine_biens (migration 20261204_lot12_patrimoine.sql), chargée par load() comme budget.js (E0 / LG).
   Distinct de l'écran « Patrimoine » de maire.js (table public.patrimoine), qui n'est pas modifié.
   Module encapsulé : aucun identifiant global déclaré, car maire.js déclare déjà `const patrimoine`.
   Dépend de core.js, core-ui.js, adjoints.js (fdd), maire.js (st2) : à charger après maire.js. */
(() => {
  const ROLES = ["maire", "secretariat", "finances"],
    CATS = [
      ["terrain", "Terrain"],
      ["batiment", "Bâtiment"],
      ["vehicule", "Véhicule"],
      ["equipement", "Équipement"]
    ],
    CL = Object.fromEntries(CATS),
    STS = [
      ["actif", "Actif"],
      ["en_entretien", "En entretien"],
      ["hors_service", "Hors service"],
      ["cede", "Cédé"]
    ],
    SL = Object.fromEntries(STS),
    SC = { actif: "ok", en_entretien: "or", hors_service: "rd", cede: "" },
    peut = () => !S.sa && ROLES.includes(S.pr);
  let ouvert = false;

  E0.patrimoine_biens = [];
  LG.patrimoine_biens = [
    () => LQ("patrimoine_biens").order("categorie").order("nom"),
    r => {
      S.db.patrimoine_biens = r || [];
    }
  ];

  const formulaire = () =>
    pn(
      "Ajouter un bien",
      "tools",
      frm(
        sel("pb_ca", "Catégorie", CATS) +
          inp("pb_nm", "Nom", "text", "", "", 'maxlength="200"') +
          inp("pb_lo", "Localisation", "text", "", "", 'maxlength="200"') +
          inp("pb_va", "Valeur estimée (FCFA)", "number", 0, "", 'min="0" step="1"') +
          sel("pb_st", "Statut", STS, "actif") +
          inp("pb_da", "Date d’acquisition", "date")
      ) +
        `<label for="pb_ds">Description</label><textarea id="pb_ds" rows="3" maxlength="3000"></textarea><p data-sty="margin-top:10px"><button class="bt" data-m="pbsave">Enregistrer</button> <button class="bo" data-m="pbcancel">Annuler</button></p>`
    );

  const patrimoine = () => {
    const B = D().patrimoine_biens,
      f = CL[S.tab.patbiens_f] ? S.tab.patbiens_f : "tous",
      L = f == "tous" ? B : B.filter(x => x.categorie == f),
      tot = B.filter(x => x.statut != "cede").reduce((s, x) => s + (+x.valeur_estimee || 0), 0),
      p = peut();
    return (
      `<div class="kp">${kp("k2", "tools", "Biens", B.length)}${kp("k3", "coins", "Valeur estimée", fmt(tot) + " FCFA")}${kp("k4", "alert", "Hors service", B.filter(x => x.statut == "hors_service").length)}</div>` +
      (p && ouvert ? formulaire() : "") +
      pn(
        "Biens communaux",
        "tools",
        tabs(
          "patbiens_f",
          [["tous", "Tous (" + B.length + ")"]].concat(CATS.map(c => [c[0], c[1] + " (" + B.filter(x => x.categorie == c[0]).length + ")"]))
        ) +
          (L.map(x =>
            rw(
              `<b>${esc(x.nom)}</b><div class="mut" data-sty="font-size:13px">${esc(CL[x.categorie] || x.categorie)} · ${esc(x.localisation || "localisation non précisée")}${x.date_acquisition ? " · acquis le " + fdd(x.date_acquisition) : ""}</div>${x.description ? `<div data-sty="font-size:14px">${esc(x.description)}</div>` : ""}`,
              `<div data-sty="display:grid;gap:4px;justify-items:end"><b>${esc(fmt(x.valeur_estimee))} FCFA</b>${st2(SL[x.statut] || x.statut || "—", SC[x.statut] || "")}</div>`
            )
          ).join("") || emp(f == "tous" ? "Aucun bien enregistré." : "Aucun bien dans cette catégorie.")),
        p && !ouvert ? `<button class="bt" data-m="pbnew">Ajouter un bien</button>` : ""
      )
    );
  };

  RP.patbiens = [
    "maire",
    "adjoint",
    "finances",
    "secretariat",
    "technique"
  ]; /* lecture : périmètre de la politique RLS de patrimoine_biens */
  SPL.patbiens = "Biens communaux";
  SUB.patbiens = patrimoine;

  /* Le secrétariat a sa propre navigation (SNAV) et n'utilise pas les espaces SP : entrée ajoutée ici pour qu'il accède à cet écran.
     Supprimer ce bloc si le secrétariat ne doit pas avoir cet écran dans son menu. */
  if (typeof SNAV != "undefined" && !SNAV.some(n => n[0] == "s_pb")) {
    SNAV.push(["s_pb", "Biens communaux", "tools"]);
    V.s_pb = () => page("Biens communaux", patrimoine());
  }

  document.addEventListener("click", async e => {
    const t = e.target.closest("[data-m^=pb]"),
      m = t && t.dataset.m;
    if (!m || !/^pb(new|cancel|save)$/.test(m) || !peut()) return;
    S.err = "";
    try {
      if (m == "pbnew") ouvert = true;
      else if (m == "pbcancel") ouvert = false;
      else {
        const g = id => (($("#" + id) || {}).value || "").trim(),
          o = {
            commune_id: S.cid,
            categorie: g("pb_ca"),
            nom: g("pb_nm"),
            description: g("pb_ds") || null,
            localisation: g("pb_lo") || null,
            valeur_estimee: +g("pb_va") || 0,
            statut: g("pb_st") || "actif",
            date_acquisition: g("pb_da") || null
          };
        if (!CL[o.categorie]) throw new Error("Choisissez une catégorie.");
        if (!o.nom) throw new Error("Le nom du bien est obligatoire.");
        if (o.valeur_estimee < 0) throw new Error("La valeur estimée ne peut pas être négative.");
        const r = await sb.from("patrimoine_biens").insert(o);
        if (r.error) throw new Error("Enregistrement refusé : " + r.error.message);
        ouvert = false;
        await load(["patrimoine_biens"]);
        S.err = "Bien enregistré.";
      }
    } catch (x) {
      S.err = x && x.message ? x.message : "Erreur réseau. Réessayez.";
    }
    render();
    window.scrollTo(0, 0);
  });
})();
