/* Services territoriaux (espace mairie > Administration > Services territoriaux) :
   onglets par domaine (Éducation, Santé, Environnement, Urbanisme, Développement) avec, pour chacun,
   les infrastructures communales et les actions en cours, + ajout / modification / suppression d'une infrastructure ou d'une action (maire, secrétariat),
   vue « Détail » (géolocalisation, ligne budgétaire liée) ; lien facultatif avec public.budget_lignes (lignes de dépense) et latitude / longitude des infrastructures
   (colonnes ajoutées par la migration 20261202001400_p1_services_geo.sql : envoyées seulement si renseignées, le front reste compatible sans elle).
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
    TB = { infra: "territoire_infrastructures", action: "territoire_actions" },
    ACTIONS = /^svt(new|infra|action|cancel|save|edit|del|det|back)$/,
    LECTURE = /^svt(det|back)$/,
    peut = () => !S.sa && ROLES.includes(S.pr),
    fdate = d => (d ? new Date(d + "T00:00").toLocaleDateString("fr-FR") : "—"),
    coord = (v, max) => {
      if (v === "" || v == null) return null;
      const n = Number(String(v).replace(",", "."));
      if (!Number.isFinite(n) || Math.abs(n) > max) throw new Error("Coordonnée invalide (latitude ±90, longitude ±180).");
      return n;
    },
    lien = x =>
      x.latitude != null && x.longitude != null
        ? ` · <a href="https://www.openstreetmap.org/?mlat=${encodeURIComponent(x.latitude)}&mlon=${encodeURIComponent(x.longitude)}#map=17/${encodeURIComponent(x.latitude)}/${encodeURIComponent(x.longitude)}" target="_blank" rel="noopener noreferrer">Voir sur la carte</a>`
        : "",
    /* Lignes budgétaires de dépense, avec l'année du budget : lecture seule de budgets / budget_lignes (déjà chargés par budget.js) */
    lignes = () => {
      const d = D(),
        BG = Object.fromEntries((d.budgets || []).map(b => [b.id, b]));
      return (d.budget_lignes || [])
        .filter(l => l.type_recette_depense == "depense")
        .map(l => [l.id, (BG[l.budget_id] ? BG[l.budget_id].annee + " · " : "") + "Chap. " + l.chapitre + " / art. " + l.article + " (prévu " + fmt(l.montant_prevu) + " FCFA)"])
        .sort((x, y) => (x[1] < y[1] ? 1 : -1));
    },
    libLigne = id => {
      const l = (D().budget_lignes || []).find(x => x.id == id),
        b = l && (D().budgets || []).find(x => x.id == l.budget_id);
      return l ? (b ? b.annee + " · " : "") + "Chap. " + l.chapitre + " / art. " + l.article + " (prévu " + fmt(l.montant_prevu) + " FCFA, réalisé " + fmt(l.montant_realise) + " FCFA)" : "Ligne budgétaire introuvable ou non accessible";
    },
    selLigne = v => sel("ts_bl", "Ligne budgétaire liée (facultatif)", [["", "— Aucune —"]].concat(lignes()), v || "");
  let ouvert = null /* null | "choix" | "infra" | "action" */,
    edit = null /* id de l'élément en cours de modification (type = ouvert) */,
    det = null /* { t: "infra" | "action", id } : détail affiché */,
    busy = false;

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
  const cur = () => (edit ? (D()[TB[ouvert]] || []).find(x => x.id == edit) || {} : {});

  const formulaire = () => {
    const c = cat(),
      x = cur(),
      bt = `<p data-sty="margin-top:10px"><button class="bt" data-m="svtsave">${edit ? "Enregistrer les modifications" : "Enregistrer"}</button> <button class="bo" data-m="svtcancel">Annuler</button></p>`;
    if (ouvert == "choix")
      return pn(
        "Ajouter",
        "tools",
        `<p>Que souhaitez-vous ajouter ?</p><p><button class="bt" data-m="svtinfra">Une infrastructure</button> <button class="bt" data-m="svtaction">Une action</button> <button class="bo" data-m="svtcancel">Annuler</button></p>`
      );
    if (ouvert == "infra")
      return pn(
        edit ? "Modifier l’infrastructure" : "Nouvelle infrastructure",
        "tools",
        frm(
          sel("ts_ca", "Domaine", CATS, x.categorie || c) +
            inp("ts_nm", "Nom", "text", x.nom || "", "Ex. École primaire de Fimela", 'maxlength="200" required') +
            inp("ts_lo", "Localisation", "text", x.localisation || "", "", 'maxlength="200"') +
            inp("ts_la", "Latitude (facultatif)", "number", x.latitude ?? "", "Ex. 14.3500", 'min="-90" max="90" step="any"') +
            inp("ts_lg", "Longitude (facultatif)", "number", x.longitude ?? "", "Ex. -16.5000", 'min="-180" max="180" step="any"') +
            sel("ts_et", "État", ETATS, x.etat || "bon") +
            inp("ts_ge", "Gestionnaire", "text", x.gestionnaire || "", "", 'maxlength="200"') +
            selLigne(x.budget_ligne_id)
        ) + `<label for="ts_dt">Détails</label><textarea id="ts_dt" rows="3" maxlength="3000">${esc(x.details || "")}</textarea>${bt}`
      );
    return pn(
      edit ? "Modifier l’action" : "Nouvelle action",
      "tools",
      frm(
        sel("ts_ca", "Domaine", CATS, x.categorie || c) +
          inp("ts_ob", "Objet", "text", x.objet || "", "", 'maxlength="300" required') +
          inp("ts_d1", "Date de début", "date", x.date_debut || "") +
          inp("ts_d2", "Date de fin", "date", x.date_fin || "") +
          sel("ts_st", "Statut", STS, x.statut || "planifiee") +
          selLigne(x.budget_ligne_id)
      ) + `<label for="ts_ds">Description</label><textarea id="ts_ds" rows="3" maxlength="3000">${esc(x.description || "")}</textarea>${bt}`
    );
  };

  const btns = (t, x) =>
    `<div><button class="bo" data-m="svtdet" data-t="${t}" data-id="${esc(x.id)}">Détail</button>${peut() ? ` <button class="bo" data-m="svtedit" data-t="${t}" data-id="${esc(x.id)}">Modifier</button> <button class="bo" data-m="svtdel" data-t="${t}" data-id="${esc(x.id)}">Supprimer</button>` : ""}</div>`;

  const infra = x =>
    rw(
      `<b>${esc(x.nom)}</b><div class="mut" data-sty="font-size:13px">${esc(x.localisation || "Localisation non précisée")}${x.gestionnaire ? " · Géré par " + esc(x.gestionnaire) : ""}${lien(x)}</div>${x.details ? `<div data-sty="font-size:14px">${esc(x.details)}</div>` : ""}`,
      `<div data-sty="display:grid;gap:4px;justify-items:end">${st2(EL[x.etat] || x.etat || "—", EC[x.etat] || "")}${btns("infra", x)}</div>`
    );

  const dates = x => (x.date_debut || x.date_fin ? (x.date_debut ? fdd(x.date_debut) : "…") + " → " + (x.date_fin ? fdd(x.date_fin) : "…") : "Dates non précisées");

  const action = x =>
    rw(
      `<b>${esc(x.objet)}</b><div class="mut" data-sty="font-size:13px">${esc(dates(x))}</div>${x.description ? `<div data-sty="font-size:14px">${esc(x.description)}</div>` : ""}`,
      `<div data-sty="display:grid;gap:4px;justify-items:end">${st2(SL[x.statut] || x.statut || "—", SC[x.statut] || "")}${btns("action", x)}</div>`
    );

  const detail = () => {
    const x = det && (D()[TB[det.t]] || []).find(i => i.id == det.id);
    if (!x) {
      det = null;
      return liste();
    }
    const p = peut(),
      I = det.t == "infra",
      info = (l, v) => rw(`<span class="mut">${l}</span>`, `<b>${v}</b>`);
    return (
      `<p><button class="bo" data-m="svtback">← Retour aux services</button></p>` +
      (p && ouvert && edit == x.id ? formulaire() : "") +
      pn(
        I ? "Détail de l’infrastructure" : "Détail de l’action",
        "tools",
        info("Domaine", esc(CL[x.categorie] || x.categorie)) +
          (I
            ? info("Nom", esc(x.nom)) +
              info("Localisation", esc(x.localisation || "Non précisée") + lien(x)) +
              (x.latitude != null && x.longitude != null ? info("Coordonnées", esc(x.latitude) + ", " + esc(x.longitude)) : "") +
              info("État", st2(EL[x.etat] || x.etat || "—", EC[x.etat] || "")) +
              info("Gestionnaire", esc(x.gestionnaire || "Non précisé")) +
              (x.details ? info("Détails", esc(x.details)) : "")
            : info("Objet", esc(x.objet)) +
              info("Période", esc(dates(x))) +
              info("Statut", st2(SL[x.statut] || x.statut || "—", SC[x.statut] || "")) +
              (x.description ? info("Description", esc(x.description)) : "")) +
          info("Ligne budgétaire", x.budget_ligne_id ? esc(libLigne(x.budget_ligne_id)) : "Aucune ligne liée") +
          info("Créé le", esc(fdate((x.created_at || "").slice(0, 10)))),
        p && !(ouvert && edit == x.id)
          ? `<button class="bo" data-m="svtedit" data-t="${det.t}" data-id="${esc(x.id)}">Modifier</button> <button class="bo" data-m="svtdel" data-t="${det.t}" data-id="${esc(x.id)}">Supprimer</button>`
          : ""
      )
    );
  };

  function liste() {
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
  function services_territoire() {
    return det ? detail() : liste();
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
    if (!m || !ACTIONS.test(m) || (!LECTURE.test(m) && !peut()) || busy) return;
    busy = true;
    S.err = "";
    try {
      if (m == "svtnew") ouvert = "choix";
      else if (m == "svtinfra") ouvert = "infra";
      else if (m == "svtaction") ouvert = "action";
      else if (m == "svtcancel") (ouvert = null), (edit = null);
      else if (m == "svtdet") {
        if (!TB[t.dataset.t]) throw new Error("Élément inconnu.");
        det = { t: t.dataset.t, id: t.dataset.id };
        ouvert = edit = null;
      } else if (m == "svtback") (det = null), (ouvert = edit = null);
      else if (m == "svtedit") {
        if (!TB[t.dataset.t]) throw new Error("Élément inconnu.");
        ouvert = t.dataset.t;
        edit = t.dataset.id;
        if (!det) {
          const x = (D()[TB[ouvert]] || []).find(i => i.id == edit);
          if (x) S.tab.svt_cat = x.categorie;
        }
      } else if (m == "svtdel") {
        const k = t.dataset.t;
        if (!TB[k]) throw new Error("Élément inconnu.");
        const x = (D()[TB[k]] || []).find(i => i.id == t.dataset.id);
        if (!x) throw new Error("Élément introuvable.");
        if (!window.confirm("Supprimer définitivement « " + (x.nom || x.objet) + " » ? Cette action est irréversible.")) {
          busy = false;
          return;
        }
        const r = await sb.from(TB[k]).delete().eq("id", x.id).eq("commune_id", S.cid).select("id");
        if (r.error) throw new Error("Suppression refusée : " + r.error.message);
        if (!r.data || !r.data.length) throw new Error("Suppression refusée : aucun élément supprimé (droits insuffisants).");
        if (det && det.id == x.id) det = null;
        ouvert = edit = null;
        await load([TB[k]]);
        S.err = k == "infra" ? "Infrastructure supprimée." : "Action supprimée.";
      } else if (ouvert == "infra" || ouvert == "action") {
        const g = id => (($("#" + id) || {}).value || "").trim(),
          ca = g("ts_ca"),
          old = cur(),
          bl = g("ts_bl");
        if (!CL[ca]) throw new Error("Choisissez un domaine.");
        if (bl && !(D().budget_lignes || []).some(l => l.id == bl)) throw new Error("Ligne budgétaire invalide.");
        let o;
        if (ouvert == "infra") {
          const la = coord(g("ts_la"), 90),
            lg = coord(g("ts_lg"), 180);
          if ((la == null) != (lg == null)) throw new Error("Renseignez la latitude ET la longitude, ou aucune des deux.");
          o = {
            categorie: ca,
            nom: g("ts_nm"),
            localisation: g("ts_lo") || null,
            etat: g("ts_et") || "bon",
            gestionnaire: g("ts_ge") || null,
            details: g("ts_dt") || null
          };
          if (!o.nom) throw new Error("Le nom de l’infrastructure est obligatoire.");
          /* Nouvelles colonnes : envoyées seulement si saisies, ou si une valeur existante doit être effacée (compatibilité sans migration). */
          if (la != null || old.latitude != null) {
            o.latitude = la;
            o.longitude = lg;
          }
        } else {
          o = {
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
        }
        if (bl || old.budget_ligne_id) o.budget_ligne_id = bl || null;
        const tb = TB[ouvert];
        let r;
        if (edit) {
          r = await sb.from(tb).update(o).eq("id", edit).eq("commune_id", S.cid).select("id");
          if (!r.error && !(r.data || []).length) throw new Error("Modification refusée : aucun élément modifié (droits insuffisants).");
        } else r = await sb.from(tb).insert({ ...o, commune_id: S.cid });
        if (r.error)
          throw new Error(
            /latitude|longitude|budget_ligne_id/.test(r.error.message || "")
              ? "Géolocalisation / lien budgétaire indisponible : migration 20261202001400 non appliquée. Laissez ces champs vides."
              : "Enregistrement refusé : " + r.error.message
          );
        const was = ouvert,
          mod = !!edit;
        ouvert = edit = null;
        S.tab.svt_cat = ca;
        await load([tb]);
        S.err = (was == "infra" ? "Infrastructure " : "Action ") + (mod ? (was == "infra" ? "modifiée." : "modifiée.") : was == "infra" ? "enregistrée." : "enregistrée.");
      }
    } catch (x) {
      S.err = x && x.message ? x.message : "Erreur réseau. Réessayez.";
    }
    busy = false;
    render();
    window.scrollTo(0, 0);
  });
})();
