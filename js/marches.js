/* Suivi des marchés (espace mairie > Administration > Marchés en cours) :
   tableau de bord des marchés non clos + formulaire d'ajout (maire, finances)
   + vue « Détail du marché » : informations de base, avenants (public.marches_avenants) et ordres de service (public.ordres_service),
   avec saisie d'un avenant / émission d'un ordre de service (maire, finances ; RLS identique côté base).
   Table public.marches (colonnes reference et type_marche ajoutées par la migration 20261202000200_lot10_marches.sql).
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
    OST = { emis: "Émis", notifie: "Notifié", execute: "Exécuté", annule: "Annulé" },
    OTC = { emis: "or", notifie: "bl", execute: "ok", annule: "rd" },
    ACTIONS = /^mp(new|cancel|save|det|back|avnew|avcancel|avsave|osnew|oscancel|ossave)$/,
    LECTURE = /^mp(det|back)$/,
    peut = () => !S.sa && ROLES.includes(S.pr),
    fdate = d => (d ? new Date(d + "T00:00").toLocaleDateString("fr-FR") : "—"),
    signe = v => (+v > 0 ? "+" : "") + fmt(v);
  let ouvert = false /* formulaire « Nouveau marché » */,
    sel = null /* id du marché dont le détail est affiché */,
    av = [] /* avenants du marché sélectionné */,
    os = [] /* ordres de service du marché sélectionné */,
    chg = false /* chargement du détail en cours */,
    errD = "" /* erreur de chargement du détail */,
    fAv = false /* formulaire avenant ouvert */,
    fOs = false /* formulaire ordre de service ouvert */,
    busy = false;

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

  const formAvenant = () =>
    pn(
      "Ajouter un avenant",
      "doc",
      frm(
        inp("av_mt", "Montant supplémentaire (FCFA)", "number", 0, "Négatif pour une moins-value", 'step="1"') +
          inp("av_mo", "Motif", "text", "", "", 'maxlength="1000" required') +
          inp("av_dt", "Date de signature", "date", T, "", "required")
      ) +
        `<p data-sty="margin-top:10px"><button class="bt" data-m="mpavsave">Enregistrer l’avenant</button> <button class="bo" data-m="mpavcancel">Annuler</button></p>`
    );

  const formOrdre = () =>
    pn(
      "Émettre un ordre de service",
      "doc",
      frm(
        inp("os_ob", "Objet", "text", "", "", 'maxlength="300" required') +
          inp("os_de", "Date d’émission", "date", T, "", "required") +
          inp("os_dx", "Date d’exécution prévue (facultatif)", "date", "") +
          sel("os_st", "Statut", Object.entries(OST), "emis")
      ) +
        `<p data-sty="margin-top:10px"><button class="bt" data-m="mpossave">Émettre l’ordre de service</button> <button class="bo" data-m="mposcancel">Annuler</button></p>`
    );

  const liste = () => {
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
            `<div data-sty="display:grid;gap:4px;justify-items:end"><b>${esc(fmt(x.montant))} FCFA</b>${st2(MST[x.statut] || x.statut || "—", MTC[x.statut] || "")}<button class="bo" data-m="mpdet" data-id="${esc(x.id)}">Détail</button></div>`
          )
        ).join("") || emp("Aucun marché en cours."),
        p && !ouvert ? `<button class="bt" data-m="mpnew">Nouveau marché</button>` : ""
      )
    );
  };

  const detail = () => {
    const x = D().mar.find(m => m.id == sel);
    if (!x) {
      sel = null;
      return liste();
    }
    const p = peut(),
      sa = av.reduce((s, a) => s + (+a.montant_supplementaire || 0), 0),
      info = (l, v) => rw(`<span class="mut">${l}</span>`, `<b>${v}</b>`);
    return (
      `<p><button class="bo" data-m="mpback">← Retour aux marchés</button></p>` +
      pn(
        "Détail du marché",
        "doc",
        info("Référence", esc(x.reference || x.numero || "Sans référence")) +
          info("Objet", esc(x.objet)) +
          info("Type de marché", esc(TL[x.type_marche] || "Non précisé")) +
          info("Mode de passation", esc(x.mode || "Non précisé")) +
          info("Attributaire", esc(x.attributaire || "Non désigné")) +
          info("Service", esc(x.service || "Non précisé")) +
          info("Statut", st2(MST[x.statut] || x.statut || "—", MTC[x.statut] || "")) +
          info("Montant initial", esc(fmt(x.montant)) + " FCFA") +
          info("Total des avenants", esc(signe(sa)) + " FCFA") +
          info("Montant actuel", esc(fmt((+x.montant || 0) + sa)) + " FCFA") +
          info("Date de lancement", esc(fdate(x.date_lancement))) +
          info("Date d’attribution", esc(fdate(x.date_attribution))) +
          info("Date de fin", esc(fdate(x.date_fin))) +
          (x.observations ? info("Observations", esc(x.observations)) : "")
      ) +
      (errD ? emp(esc(errD)) : "") +
      (p && fAv ? formAvenant() : "") +
      pn(
        "Avenants",
        "doc",
        chg
          ? emp("Chargement…")
          : av
              .map((a, i) =>
                rw(
                  `<b>Avenant n° ${i + 1}</b> ${esc(a.motif)}<div class="mut" data-sty="font-size:13px">Signé le ${esc(fdate(a.date_signature))}</div>`,
                  `<b>${esc(signe(a.montant_supplementaire))} FCFA</b>`
                )
              )
              .join("") || emp("Aucun avenant pour ce marché."),
        p && !fAv ? `<button class="bt" data-m="mpavnew">Ajouter un avenant</button>` : ""
      ) +
      (p && fOs ? formOrdre() : "") +
      pn(
        "Ordres de service",
        "doc",
        chg
          ? emp("Chargement…")
          : os
              .map(o =>
                rw(
                  `<b>${esc(o.objet)}</b><div class="mut" data-sty="font-size:13px">Émis le ${esc(fdate(o.date_emission))}${o.date_execution_prevue ? " · exécution prévue le " + esc(fdate(o.date_execution_prevue)) : ""}</div>`,
                  st2(OST[o.statut] || o.statut || "—", OTC[o.statut] || "")
                )
              )
              .join("") || emp("Aucun ordre de service pour ce marché."),
        p && !fOs ? `<button class="bt" data-m="mposnew">Émettre un ordre de service</button>` : ""
      )
    );
  };

  /* Charge avenants et ordres de service du marché ; ignore la réponse si l'utilisateur a changé de marché entre-temps. */
  const charger = async id => {
    const q = t => sb.from(t).select("*").eq("marche_id", id).eq("commune_id", S.cid),
      [a, o] = await Promise.all([
        q("marches_avenants").order("date_signature", { ascending: true }).order("id"),
        q("ordres_service").order("date_emission", { ascending: false }).order("id")
      ]);
    if (sel != id) return;
    av = a.data || [];
    os = o.data || [];
    errD = a.error || o.error ? "Chargement impossible : " + (a.error || o.error).message : "";
    chg = false;
  };

  const ouvrir = id => {
    sel = id;
    av = [];
    os = [];
    errD = "";
    fAv = fOs = false;
    chg = true;
  };

  RP.marchestdb = ["maire", "finances", "secretariat"]; /* lecture : même périmètre que la politique RLS de public.marches */
  SPL.marchestdb = "Marchés en cours";
  SUB.marchestdb = () => (sel ? detail() : liste());

  document.addEventListener("click", async e => {
    const t = e.target.closest("[data-m]"),
      m = t && t.dataset.m;
    if (!m || !ACTIONS.test(m) || (!LECTURE.test(m) && !peut())) return;
    if (busy) return;
    S.err = "";
    busy = true;
    try {
      const g = id => (($("#" + id) || {}).value || "").trim();
      if (m == "mpnew") ouvert = true;
      else if (m == "mpcancel") ouvert = false;
      else if (m == "mpdet") {
        ouvrir(t.dataset.id);
        render();
        await charger(sel);
      } else if (m == "mpback") {
        sel = null;
        fAv = fOs = false;
      } else if (m == "mpavnew") fAv = true;
      else if (m == "mpavcancel") fAv = false;
      else if (m == "mposnew") fOs = true;
      else if (m == "mposcancel") fOs = false;
      else if (m == "mpavsave") {
        const id = sel,
          o = {
            commune_id: S.cid,
            marche_id: id,
            montant_supplementaire: g("av_mt") === "" ? 0 : Number(g("av_mt")),
            motif: g("av_mo"),
            date_signature: g("av_dt")
          };
        if (!o.motif) throw new Error("Le motif de l’avenant est obligatoire.");
        if (!o.date_signature) throw new Error("La date de signature est obligatoire.");
        if (!Number.isFinite(o.montant_supplementaire) || Math.abs(o.montant_supplementaire) >= 1e13)
          throw new Error("Le montant supplémentaire est invalide.");
        const r = await sb.from("marches_avenants").insert(o);
        if (r.error) throw new Error("Enregistrement de l’avenant refusé : " + r.error.message);
        fAv = false;
        await charger(id);
        S.err = "Avenant enregistré.";
      } else if (m == "mpossave") {
        const id = sel,
          o = {
            commune_id: S.cid,
            marche_id: id,
            objet: g("os_ob"),
            date_emission: g("os_de"),
            date_execution_prevue: g("os_dx") || null,
            statut: g("os_st") || "emis"
          };
        if (!o.objet) throw new Error("L’objet de l’ordre de service est obligatoire.");
        if (!o.date_emission) throw new Error("La date d’émission est obligatoire.");
        if (o.date_execution_prevue && o.date_execution_prevue < o.date_emission)
          throw new Error("La date d’exécution prévue ne peut pas précéder la date d’émission.");
        const r = await sb.from("ordres_service").insert(o);
        if (r.error) throw new Error("Émission de l’ordre de service refusée : " + r.error.message);
        fOs = false;
        await charger(id);
        S.err = "Ordre de service émis.";
      } else {
        const ref = g("mp_rf"),
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
      chg = false;
      S.err = x && x.message ? x.message : "Erreur réseau. Réessayez.";
    }
    busy = false;
    render();
    window.scrollTo(0, 0);
  });
})();
