/* Services territoriaux (espace mairie > Administration > Services territoriaux) :
   onglets par domaine (Éducation, Santé, Environnement, Urbanisme, Développement) avec, pour chacun,
   les infrastructures communales et les actions en cours, + ajout d'une infrastructure ou d'une action (maire, secrétariat).
   Tables public.territoire_infrastructures et public.territoire_actions (migration 20261202000500_lot13_services_territoriaux.sql),
   chargées par load() comme patrimoine.js (E0 / LG).
   Module encapsulé : seul services_territoire() est exposée (window.services_territoire), aucun autre identifiant global.
   Dépend de core.js, core-ui.js (pn, rw, tabs, frm, sel, inp, emp, kp), adjoints.js (fdd), maire.js (st2) : à charger après maire.js. */
(() => {
  const ROLES = ["maire", "secretariat"] /* boutons d'ajout (la RLS autorise aussi adjoint et technique) */,
    CATS = [
      ["education", "Éducation"],
      ["sante", "Santé"],
      ["environnement", "Environnement"],
      ["urbanisme", "Urbanisme"],
      ["developpement", "Développement"]
    ],
    CL = Object.fromEntries(CATS),
    ETATS = [
      ["bon", "Bon"],
      ["moyen", "Moyen"],
      ["mauvais", "Mauvais"],
      ["hors_service", "Hors service"]
    ],
    EL = Object.fromEntries(ETATS),
    EC = { bon: "ok", moyen: "or", mauvais: "rd", hors_service: "rd" },
    STS = [
      ["planifiee", "Planifiée"],
      ["en_cours", "En cours"],
      ["terminee", "Terminée"],
      ["suspendue", "Suspendue"],
      ["annulee", "Annulée"]
    ],
    SL = Object.fromEntries(STS),
    SC = { planifiee: "", en_cours: "ok", terminee: "", suspendue: "or", annulee: "rd" },
    CLOS = ["terminee", "annulee"],
    peut = () => !S.sa && ROLES.includes(S.pr);
  let ouvert = null; /* null | "choix" | "infra" | "action" */

  E0.territoire_infrastructures = [];
  E0.territoire_actions = [];
  LG.territoire_infrastructures = [
    () => LQ("territoire_infrastructures").order("categorie").order("nom"),
    r => {
      S.db.territoire_infrastructures = r || [];
    }
  ];
  LG.territoire_actions = [
    () => LQ("territoire_actions").order("created_at", { ascending: false }),
    r => {
      S.db.territoire_actions = r || [];
    }
  ];

  const cat = () => (CL[S.tab.svt_cat] ? S.tab.svt_cat : "education");

  const formulaire = () => {
    const c = cat(),
      bt = `<p data-sty="margin-top:10px"><button class="bt" data-m="svtsave">Enregistrer</button> <button class="bo" data-m="svtcancel">Annuler</button></p>`;
    if (ouvert == "choix")
      return pn(
        "Ajouter",
        "tools",
        `<p>Que souhaitez-vous ajouter ?</p><p><button class="bt" data-m="svtinfra">Une infrastructure</button> <button class="bt" data-m="svtaction">Une action</button> <button class="bo" data-m="svtcancel">Annuler</button></p>`
      );
    if (ouvert == "infra")
      return pn(
        "Nouvelle infrastructure",
        "tools",
        frm(
          sel("ts_ca", "Domaine", CATS, c) +
            inp("ts_nm", "Nom", "text", "", "Ex. École primaire de Fimela", 'maxlength="200" required') +
            inp("ts_lo", "Localisation", "text", "", "", 'maxlength="200"') +
            sel("ts_et", "État", ETATS, "bon") +
            inp("ts_ge", "Gestionnaire", "text", "", "", 'maxlength="200"')
        ) + `<label for="ts_dt">Détails</label><textarea id="ts_dt" rows="3" maxlength="3000"></textarea>${bt}`
      );
    return pn(
      "Nouvelle action",
      "tools",
      frm(
        sel("ts_ca", "Domaine", CATS, c) +
          inp("ts_ob", "Objet", "text", "", "", 'maxlength="300" required') +
          inp("ts_d1", "Date de début", "date") +
          inp("ts_d2", "Date de fin", "date") +
          sel("ts_st", "Statut", STS, "planifiee")
      ) + `<label for="ts_ds">Description</label><textarea id="ts_ds" rows="3" maxlength="3000"></textarea>${bt}`
    );
  };

  const infra = x =>
    rw(
      `<b>${esc(x.nom)}</b><div class="mut" data-sty="font-size:13px">${esc(x.localisation || "Localisation non précisée")}${x.gestionnaire ? " · Géré par " + esc(x.gestionnaire) : ""}</div>${x.details ? `<div data-sty="font-size:14px">${esc(x.details)}</div>` : ""}`,
      st2(EL[x.etat] || x.etat || "—", EC[x.etat] || "")
    );

  const action = x => {
    const dd = x.date_debut || x.date_fin ? (x.date_debut ? fdd(x.date_debut) : "…") + " → " + (x.date_fin ? fdd(x.date_fin) : "…") : "Dates non précisées";
    return rw(
      `<b>${esc(x.objet)}</b><div class="mut" data-sty="font-size:13px">${esc(dd)}</div>${x.description ? `<div data-sty="font-size:14px">${esc(x.description)}</div>` : ""}`,
      st2(SL[x.statut] || x.statut || "—", SC[x.statut] || "")
    );
  };

  function services_territoire() {
    S.tab.svt_cat = cat();
    const c = S.tab.svt_cat,
      d = D(),
      I = d.territoire_infrastructures,
      A = d.territoire_actions,
      n = k => I.filter(x => x.categorie == k).length + A.filter(x => x.categorie == k && !CLOS.includes(x.statut)).length,
      Ic = I.filter(x => x.categorie == c),
      Ac = A.filter(x => x.categorie == c),
      Ao = Ac.filter(x => !CLOS.includes(x.statut)),
      nc = Ac.length - Ao.length,
      p = peut();
    return (
      (p && ouvert ? formulaire() : "") +
      pn(
        "Services territoriaux",
        "tools",
        tabs(
          "svt_cat",
          CATS.map(k => [k[0], k[1] + " (" + n(k[0]) + ")"])
        ) +
          `<h3>Infrastructures · ${esc(CL[c])}</h3>` +
          (Ic.map(infra).join("") || emp("Aucune infrastructure enregistrée dans ce domaine.")) +
          `<h3>Actions en cours · ${esc(CL[c])}</h3>` +
          (Ao.map(action).join("") || emp("Aucune action en cours dans ce domaine.")) +
          (nc ? emp(nc + " action(s) terminée(s) ou annulée(s) non affichée(s).") : ""),
        p && !ouvert ? `<button class="bt" data-m="svtnew">Ajouter</button>` : ""
      )
    );
  }
  window.services_territoire = services_territoire;

  RP.svterr = ["maire", "adjoint", "cabinet", "secretariat", "technique", "finances"]; /* lecture : périmètre de la politique RLS */
  SPL.svterr = "Services territoriaux";
  SUB.svterr = services_territoire;
  if (!SP.administration.subs.some(s => s[0] == "svterr")) SP.administration.subs.push(["svterr", "Services territoriaux"]);

  /* Le secrétariat a sa propre navigation (SNAV) et n'utilise pas les espaces SP : entrée ajoutée ici pour qu'il accède à cet écran. */
  if (typeof SNAV != "undefined" && !SNAV.some(n => n[0] == "s_svt")) {
    SNAV.push(["s_svt", "Services territoriaux", "tools"]);
    V.s_svt = () => page("Services territoriaux", services_territoire());
  }

  document.addEventListener("click", async e => {
    const t = e.target.closest("[data-m^=svt]"),
      m = t && t.dataset.m;
    if (!m || !/^svt(new|infra|action|cancel|save)$/.test(m) || !peut()) return;
    S.err = "";
    try {
      if (m == "svtnew") ouvert = "choix";
      else if (m == "svtinfra") ouvert = "infra";
      else if (m == "svtaction") ouvert = "action";
      else if (m == "svtcancel") ouvert = null;
      else if (ouvert == "infra" || ouvert == "action") {
        const g = id => (($("#" + id) || {}).value || "").trim(),
          ca = g("ts_ca");
        if (!CL[ca]) throw new Error("Choisissez un domaine.");
        let tb, o;
        if (ouvert == "infra") {
          o = {
            commune_id: S.cid,
            categorie: ca,
            nom: g("ts_nm"),
            localisation: g("ts_lo") || null,
            etat: g("ts_et") || "bon",
            gestionnaire: g("ts_ge") || null,
            details: g("ts_dt") || null
          };
          if (!o.nom) throw new Error("Le nom de l’infrastructure est obligatoire.");
          tb = "territoire_infrastructures";
        } else {
          o = {
            commune_id: S.cid,
            categorie: ca,
            objet: g("ts_ob"),
            date_debut: g("ts_d1") || null,
            date_fin: g("ts_d2") || null,
            statut: g("ts_st") || "planifiee",
            description: g("ts_ds") || null
          };
          if (!o.objet) throw new Error("L’objet de l’action est obligatoire.");
          if (o.date_debut && o.date_fin && o.date_fin < o.date_debut)
            throw new Error("La date de fin ne peut pas précéder la date de début.");
          tb = "territoire_actions";
        }
        const r = await sb.from(tb).insert(o);
        if (r.error) throw new Error("Enregistrement refusé : " + r.error.message);
        const was = ouvert;
        ouvert = null;
        S.tab.svt_cat = ca;
        await load([tb]);
        S.err = was == "infra" ? "Infrastructure enregistrée." : "Action enregistrée.";
      }
    } catch (x) {
      S.err = x && x.message ? x.message : "Erreur réseau. Réessayez.";
    }
    render();
    window.scrollTo(0, 0);
  });
})();
