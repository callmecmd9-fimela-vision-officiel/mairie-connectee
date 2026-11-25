/* Biens communaux (espace mairie > Administration > Biens communaux) : liste filtrable par catégorie, ajout / modification / suppression d'un bien,
   vue « Détail du bien » avec historique d'entretiens (public.patrimoine_entretiens) et ajout d'un entretien.
   Écriture : maire, secretariat, technique (RLS identique côté base). Entretiens jamais supprimés (traçabilité) : statut « annulé » possible en base.
   Suppression d'un bien refusée par la clé étrangère s'il a des entretiens (message dédié).
   Géolocalisation (latitude / longitude) : colonnes ajoutées par la migration 20261202001300 ; envoyées uniquement si renseignées.
   Table public.patrimoine_biens (migration 20261202000400_lot12_patrimoine.sql), chargée par load() comme budget.js (E0 / LG).
   Distinct de l'écran « Patrimoine » de maire.js (table public.patrimoine), qui n'est pas modifié.
   Module encapsulé : aucun identifiant global déclaré, car maire.js déclare déjà `const patrimoine`.
   Dépend de core.js, core-ui.js, adjoints.js (fdd), maire.js (st2) : à charger après maire.js. */
(() => {
  const ROLES = ["maire", "secretariat", "technique"],
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
    ESL = { planifie: "Planifié", en_cours: "En cours", realise: "Réalisé", annule: "Annulé" },
    ESC = { planifie: "or", en_cours: "bl", realise: "ok", annule: "rd" },
    ACTIONS = /^pb(new|cancel|save|edit|del|det|back|ennew|encancel|ensave)$/,
    LECTURE = /^pb(det|back)$/,
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
        : "";
  let ouvert = false, /* formulaire de bien ouvert */
    edit = null, /* id du bien en cours de modification */
    sel_ = null, /* id du bien dont le détail est affiché */
    ent = [], /* entretiens du bien sélectionné */
    chg = false,
    errD = "",
    fEn = false, /* formulaire entretien ouvert */
    busy = false;

  E0.patrimoine_biens = [];
  LG.patrimoine_biens = [
    () => LQ("patrimoine_biens").order("categorie").order("nom"),
    r => {
      S.db.patrimoine_biens = r || [];
    }
  ];

  const formulaire = () => {
    const x = edit ? D().patrimoine_biens.find(b => b.id == edit) || {} : {};
    return pn(
      edit ? "Modifier le bien" : "Ajouter un bien",
      "tools",
      frm(
        sel("pb_ca", "Catégorie", CATS, x.categorie) +
          inp("pb_nm", "Nom", "text", x.nom || "", "", 'maxlength="200"') +
          inp("pb_lo", "Localisation", "text", x.localisation || "", "", 'maxlength="200"') +
          inp("pb_la", "Latitude (facultatif)", "number", x.latitude ?? "", "Ex. 14.3500", 'min="-90" max="90" step="any"') +
          inp("pb_lg", "Longitude (facultatif)", "number", x.longitude ?? "", "Ex. -16.5000", 'min="-180" max="180" step="any"') +
          inp("pb_va", "Valeur estimée (FCFA)", "number", x.valeur_estimee ?? 0, "", 'min="0" step="1"') +
          sel("pb_st", "Statut", STS, x.statut || "actif") +
          inp("pb_da", "Date d’acquisition", "date", x.date_acquisition || "")
      ) +
        `<label for="pb_ds">Description</label><textarea id="pb_ds" rows="3" maxlength="3000">${esc(x.description || "")}</textarea><p data-sty="margin-top:10px"><button class="bt" data-m="pbsave">${edit ? "Enregistrer les modifications" : "Enregistrer"}</button> <button class="bo" data-m="pbcancel">Annuler</button></p>`
    );
  };

  const formEntretien = () =>
    pn(
      "Ajouter un entretien",
      "tools",
      frm(
        inp("pe_da", "Date d’intervention", "date", T, "", "required") +
          inp("pe_ds", "Description", "text", "", "", 'maxlength="3000" required') +
          inp("pe_co", "Coût (FCFA)", "number", 0, "", 'min="0" step="1"') +
          inp("pe_pr", "Prestataire", "text", "", "", 'maxlength="200"') +
          sel("pe_st", "Statut", Object.entries(ESL), "realise")
      ) +
        `<p data-sty="margin-top:10px"><button class="bt" data-m="pbensave">Enregistrer l’entretien</button> <button class="bo" data-m="pbencancel">Annuler</button></p>`
    );

  const detail = () => {
    const x = D().patrimoine_biens.find(b => b.id == sel_);
    if (!x) {
      sel_ = null;
      return patrimoine();
    }
    const p = peut(),
      tot = ent.filter(e => e.statut != "annule").reduce((s, e) => s + (+e.cout || 0), 0),
      info = (l, v) => rw(`<span class="mut">${l}</span>`, `<b>${v}</b>`);
    return (
      `<p><button class="bo" data-m="pbback">← Retour aux biens</button></p>` +
      (p && edit == x.id ? formulaire() : "") +
      pn(
        "Détail du bien",
        "tools",
        info("Nom", esc(x.nom)) +
          info("Catégorie", esc(CL[x.categorie] || x.categorie)) +
          info("Localisation", esc(x.localisation || "Non précisée") + lien(x)) +
          (x.latitude != null && x.longitude != null ? info("Coordonnées", esc(x.latitude) + ", " + esc(x.longitude)) : "") +
          info("Valeur estimée", esc(fmt(x.valeur_estimee)) + " FCFA") +
          info("Statut", st2(SL[x.statut] || x.statut || "—", SC[x.statut] || "")) +
          info("Date d’acquisition", esc(fdate(x.date_acquisition))) +
          (x.description ? info("Description", esc(x.description)) : ""),
        p && edit != x.id
          ? `<button class="bo" data-m="pbedit" data-id="${esc(x.id)}">Modifier</button> <button class="bo" data-m="pbdel" data-id="${esc(x.id)}">Supprimer</button>`
          : ""
      ) +
      (errD ? emp(esc(errD)) : "") +
      (p && fEn ? formEntretien() : "") +
      pn(
        "Historique des entretiens",
        "tools",
        chg
          ? emp("Chargement…")
          : (ent.length ? rw(`<span class="mut">Coût total (hors annulés)</span>`, `<b>${esc(fmt(tot))} FCFA</b>`) : "") +
              (ent
                .map(e =>
                  rw(
                    `<b>${esc(fdate(e.date_intervention))}</b> ${esc(e.description)}<div class="mut" data-sty="font-size:13px">${esc(e.prestataire || "prestataire non précisé")}</div>`,
                    `<div data-sty="display:grid;gap:4px;justify-items:end"><b>${esc(fmt(e.cout))} FCFA</b>${st2(ESL[e.statut] || e.statut || "—", ESC[e.statut] || "")}</div>`
                  )
                )
                .join("") || emp("Aucun entretien enregistré pour ce bien.")),
        p && !fEn ? `<button class="bt" data-m="pbennew">Ajouter un entretien</button>` : ""
      )
    );
  };

  /* Charge les entretiens du bien ; ignore la réponse si l'utilisateur a changé de bien entre-temps. */
  const charger = async id => {
    const r = await sb
      .from("patrimoine_entretiens")
      .select("*")
      .eq("bien_id", id)
      .eq("commune_id", S.cid)
      .order("date_intervention", { ascending: false })
      .order("id");
    if (sel_ != id) return;
    ent = r.data || [];
    errD = r.error ? "Chargement impossible : " + r.error.message : "";
    chg = false;
  };

  function patrimoine() {
    const B = D().patrimoine_biens,
      f = CL[S.tab.patbiens_f] ? S.tab.patbiens_f : "tous",
      L = f == "tous" ? B : B.filter(x => x.categorie == f),
      tot = B.filter(x => x.statut != "cede").reduce((s, x) => s + (+x.valeur_estimee || 0), 0),
      p = peut();
    return (
      `<div class="kp">${kp("k2", "tools", "Biens", B.length)}${kp("k3", "coins", "Valeur estimée", fmt(tot) + " FCFA")}${kp("k4", "alert", "Hors service", B.filter(x => x.statut == "hors_service").length)}</div>` +
      (p && ouvert && !edit ? formulaire() : "") +
      (p && edit ? formulaire() : "") +
      pn(
        "Biens communaux",
        "tools",
        tabs(
          "patbiens_f",
          [["tous", "Tous (" + B.length + ")"]].concat(CATS.map(c => [c[0], c[1] + " (" + B.filter(x => x.categorie == c[0]).length + ")"]))
        ) +
          (L.map(x =>
            rw(
              `<b>${esc(x.nom)}</b><div class="mut" data-sty="font-size:13px">${esc(CL[x.categorie] || x.categorie)} · ${esc(x.localisation || "localisation non précisée")}${x.date_acquisition ? " · acquis le " + fdd(x.date_acquisition) : ""}${lien(x)}</div>${x.description ? `<div data-sty="font-size:14px">${esc(x.description)}</div>` : ""}`,
              `<div data-sty="display:grid;gap:4px;justify-items:end"><b>${esc(fmt(x.valeur_estimee))} FCFA</b>${st2(SL[x.statut] || x.statut || "—", SC[x.statut] || "")}<div><button class="bo" data-m="pbdet" data-id="${esc(x.id)}">Détail</button>${p ? ` <button class="bo" data-m="pbedit" data-id="${esc(x.id)}">Modifier</button> <button class="bo" data-m="pbdel" data-id="${esc(x.id)}">Supprimer</button>` : ""}</div></div>`
            )
          ).join("") || emp(f == "tous" ? "Aucun bien enregistré." : "Aucun bien dans cette catégorie.")),
        p && !ouvert && !edit ? `<button class="bt" data-m="pbnew">Ajouter un bien</button>` : ""
      )
    );
  }
  const vue = () => (sel_ ? detail() : patrimoine());

  RP.patbiens = [
    "maire",
    "adjoint",
    "finances",
    "secretariat",
    "technique"
  ]; /* lecture : périmètre de la politique RLS de patrimoine_biens */
  SPL.patbiens = "Biens communaux";
  SUB.patbiens = vue;

  /* Le secrétariat a sa propre navigation (SNAV) et n'utilise pas les espaces SP : entrée ajoutée ici pour qu'il accède à cet écran.
     Supprimer ce bloc si le secrétariat ne doit pas avoir cet écran dans son menu. */
  if (typeof SNAV != "undefined" && !SNAV.some(n => n[0] == "s_pb")) {
    SNAV.push(["s_pb", "Biens communaux", "tools"]);
    V.s_pb = () => page("Biens communaux", vue());
  }

  document.addEventListener("click", async e => {
    const t = e.target.closest("[data-m^=pb]"),
      m = t && t.dataset.m;
    if (!m || !ACTIONS.test(m) || (!LECTURE.test(m) && !peut()) || busy) return;
    busy = true;
    S.err = "";
    try {
      const g = id => (($("#" + id) || {}).value || "").trim(),
        B = () => D().patrimoine_biens;
      if (m == "pbnew") {
        ouvert = true;
        edit = null;
      } else if (m == "pbcancel") ouvert = false, edit = null;
      else if (m == "pbedit") {
        edit = t.dataset.id;
        ouvert = true;
      } else if (m == "pbdet") {
        sel_ = t.dataset.id;
        ent = [];
        errD = "";
        fEn = false;
        edit = null;
        ouvert = false;
        chg = true;
        render();
        await charger(sel_);
      } else if (m == "pbback") {
        sel_ = null;
        fEn = false;
        edit = null;
        ouvert = false;
      } else if (m == "pbennew") fEn = true;
      else if (m == "pbencancel") fEn = false;
      else if (m == "pbensave") {
        const id = sel_,
          o = {
            commune_id: S.cid,
            bien_id: id,
            date_intervention: g("pe_da"),
            description: g("pe_ds"),
            cout: g("pe_co") === "" ? 0 : Number(g("pe_co")),
            prestataire: g("pe_pr") || null,
            statut: g("pe_st") || "realise"
          };
        if (!o.date_intervention) throw new Error("La date d’intervention est obligatoire.");
        if (!o.description) throw new Error("La description de l’entretien est obligatoire.");
        if (!Number.isFinite(o.cout) || o.cout < 0 || o.cout >= 1e13) throw new Error("Le coût est invalide.");
        const r = await sb.from("patrimoine_entretiens").insert(o);
        if (r.error) throw new Error("Enregistrement de l’entretien refusé : " + r.error.message);
        fEn = false;
        await charger(id);
        S.err = "Entretien enregistré.";
      } else if (m == "pbdel") {
        const x = B().find(b => b.id == t.dataset.id);
        if (!x) throw new Error("Bien introuvable.");
        if (!window.confirm("Supprimer définitivement le bien « " + x.nom + " » ? Cette action est irréversible.")) {
          busy = false;
          return;
        }
        const r = await sb.from("patrimoine_biens").delete().eq("id", x.id).eq("commune_id", S.cid).select("id");
        if (r.error)
          throw new Error(
            r.error.code == "23503"
              ? "Suppression impossible : ce bien a un historique d’entretiens. Passez son statut à « Cédé » ou « Hors service »."
              : "Suppression refusée : " + r.error.message
          );
        if (!r.data || !r.data.length) throw new Error("Suppression refusée : aucun bien supprimé (droits insuffisants).");
        if (sel_ == x.id) sel_ = null;
        await load(["patrimoine_biens"]);
        S.err = "Bien supprimé.";
      } else {
        const o = {
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
        const la = coord(g("pb_la"), 90),
          lg = coord(g("pb_lg"), 180);
        if ((la == null) != (lg == null)) throw new Error("Renseignez la latitude ET la longitude, ou aucune des deux.");
        /* Colonnes latitude / longitude : envoyées seulement si saisies (ou en modification, pour pouvoir les effacer). */
        if (la != null || edit) {
          o.latitude = la;
          o.longitude = lg;
        }
        let r;
        if (edit) {
          delete o.commune_id;
          r = await sb.from("patrimoine_biens").update(o).eq("id", edit).eq("commune_id", S.cid).select("id");
          if (!r.error && !(r.data || []).length) throw new Error("Modification refusée : aucun bien modifié (droits insuffisants).");
        } else r = await sb.from("patrimoine_biens").insert(o);
        if (r.error)
          throw new Error(
            /latitude|longitude/.test(r.error.message || "")
              ? "Géolocalisation non disponible : migration 20261202001300 non appliquée. Laissez latitude / longitude vides."
              : "Enregistrement refusé : " + r.error.message
          );
        S.err = edit ? "Bien modifié." : "Bien enregistré.";
        ouvert = false;
        edit = null;
        await load(["patrimoine_biens"]);
      }
    } catch (x) {
      chg = false;
      S.err = x && x.message ? x.message : "Erreur réseau. Réessayez.";
    }
    busy = false;
    render();
    window.scrollTo(0, 0);
  });
})();
