/* Guichet (espace mairie > Administration) : Dépôt au guichet, Caisse (espèces), Retrait du document.
   Circuit unifié des demandes (loi 2008-12, décret 2023-2161). Écritures : INSERT demandes (dépôt) + RPC encaisser_demande / retirer_demande.
   Prérequis SQL : 20261202001600 (num_suivi), 001700 (statuts), 001800 (encaissement), 001900 (retrait). Les demandes viennent de D().dem_pay (paiements-demandes.js). */
(function () {
  const GR = { dep: ["secretariat", "agent"], cai: ["finances"], ret: ["secretariat", "agent", "finances"] },
    GT = [
      ["dep", "Dépôt au guichet"],
      ["cai", "Caisse"],
      ["ret", "Retrait"]
    ],
    GTY = [
      "État civil",
      "Audience",
      "Aide sociale",
      "Travaux publics",
      "Urbanisme",
      "Environnement",
      "Éducation",
      "Sport et culture",
      "Commerce",
      "Agriculture et pêche",
      "Réclamations",
      "Associations",
      "Autre demande"
    ],
    GST = {
      nouvelle: "Reçue",
      depose: "Déposée",
      orientee: "Orientée",
      en_cours: "En cours",
      a_valider: "À valider",
      en_attente_pieces: "Pièces manquantes",
      a_payer: "À payer",
      paye: "Payée",
      en_production: "En préparation",
      traitee: "Traitée",
      acceptee: "Acceptée",
      pret_a_retirer: "Prête à retirer",
      retire: "Retirée",
      redirigee: "Redirigée",
      rejetee: "Rejetée",
      cloturee: "Clôturée"
    },
    G = { tab: "", ok: "", err: "", recu: null, qurl: "", ret: null, busy: false, f: {}, rf: {} },
    gF = n => (+n || 0).toLocaleString("fr-FR") + " FCFA",
    gTabs = () => (S.sa ? [] : GT.filter(t => GR[t[0]].includes(S.pr))),
    gV = id => {
      const e = $("#" + id);
      return e ? String(e.value || "").trim() : "";
    },
    gSv = t =>
      t == "État civil" ? "etat_civil" : ["Travaux publics", "Urbanisme", "Environnement"].includes(t) ? "technique" : "secretariat",
    gId = () => String(crypto.randomUUID()).replace(/-/g, "").toUpperCase(),
    gYmd = () => new Date().toISOString().slice(0, 10).replace(/-/g, ""),
    gErr = (e, ctx) => {
      const c = (e && e.code) || "",
        m = (e && e.message) || "Erreur réseau.";
      if (c == "PGRST202" || /could not find the function/i.test(m))
        return ctx + " : fonction serveur non déployée (migrations 20261202001600 à 20261202001900 à appliquer).";
      if (c == "42703" || /column .* does not exist|schema cache/i.test(m))
        return ctx + " : colonne absente, migration 20261202001600 à appliquer.";
      if (c == "42501" || /row-level security/i.test(m)) return ctx + " refusé : droits insuffisants pour votre rôle.";
      return ctx + " refusé : " + m;
    },
    gOk = t =>
      `<div role="status" data-sty="background:#DCFCE7;color:#14532D;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-weight:700">${t}</div>`,
    gBtn = (a, l, d = "", c = "bt") => `<button type="button" class="${c}" data-gm="${a}"${d}>${esc(l)}</button>`;

  /* ---------- Dépôt ---------- */
  const gDep = () =>
    (G.recu
      ? gOk(
          `Demande enregistrée. Numéro de suivi à remettre au citoyen :<div data-sty="font-size:26px;letter-spacing:1px;margin:6px 0">${esc(G.recu.num)}</div>${
            G.recu.montant > 0 ? `Montant à régler à la caisse : ${esc(gF(G.recu.montant))}.<br>` : ""
          }${G.recu.warn ? `<span data-sty="color:#92400E">${esc(G.recu.warn)}</span><br>` : ""}<span class="noprint" data-sty="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">${gBtn("print", "Imprimer le reçu")}${gBtn("new", "Nouveau dépôt", "", "bo")}</span>`
        )
      : "") +
    pn(
      "Nouveau dépôt au guichet",
      "doc",
      frm(
        sel("gd_type", "Type de demande", GTY, G.f.type || "") +
          inp("gd_nom", "Nom", "text", G.f.nom || "", "", 'maxlength="59" autocomplete="off"') +
          inp("gd_pre", "Prénom", "text", G.f.pre || "", "", 'maxlength="59" autocomplete="off"') +
          inp("gd_tel", "Téléphone", "tel", G.f.tel || "", "77 123 45 67", 'maxlength="16" inputmode="tel" autocomplete="off"') +
          inp("gd_obj", "Objet de la demande", "text", G.f.obj || "", "Ex. extrait de naissance", 'maxlength="180" autocomplete="off"')
      ) +
        `<p>${gBtn("save", "Enregistrer la demande", G.busy ? " disabled" : "")}</p>` +
        emp("Le numéro de suivi est généré par le serveur. Le téléphone saisi permettra au citoyen de suivre sa demande sur /suivi.html.")
    );

  /* ---------- Caisse ---------- */
  const gCai = () => {
    const L = (D().dem_pay || []).filter(x => x.statut == "a_payer");
    return pn(
      "Demandes à encaisser",
      "coins",
      L.map(x =>
        rw(
          `<b>${esc(x.num_suivi || x.numero)}</b> · ${esc(gF(x.montant_du || x.montant))}<div class="mut">${esc(x.objet || x.type || "Demande")} · ${esc(x.nom || "")}</div>`,
          gBtn("enc", "Encaisser espèces", ` data-id="${esc(x.id)}"`)
        )
      ).join("") || emp("Aucune demande en attente de paiement.")
    );
  };

  /* ---------- Retrait ---------- */
  const gRet = () => {
    const x = G.ret,
      st = x ? GST[x.statut] || x.statut : "",
      prete = x && x.statut == "pret_a_retirer" && (x.statut_paiement == "paye" || x.statut_paiement == "gratuit");
    return (
      pn(
        "Rechercher une demande",
        "doc",
        frm(
          inp("gr_num", "Numéro de suivi", "text", "", "FIM-2026-000123", 'maxlength="20" autocapitalize="characters" autocomplete="off"')
        ) + `<p>${gBtn("find", "Rechercher")}</p>`
      ) +
      (x
        ? pn(
            "Dossier " + esc(x.num_suivi),
            "doc",
            rw(
              `<b>${esc(x.objet || x.type || "Demande")}</b><div class="mut">${esc(x.nom || "")}</div>`,
              st2(st, x.statut == "pret_a_retirer" ? "ok" : "")
            ) +
              (prete
                ? frm(
                    inp("gr_nom", "Nom du retirant", "text", G.rf.nom || "", "", 'maxlength="120" autocomplete="off"') +
                      inp("gr_cni", "N° de pièce d’identité (CNI)", "text", G.rf.cni || "", "", 'maxlength="30" autocomplete="off"')
                  ) + `<p>${gBtn("do", "Enregistrer le retrait", G.busy ? " disabled" : "")}</p>`
                : emp("Retrait impossible : la demande doit être « Prête à retirer » et payée (statut actuel : " + esc(st) + ")."))
          )
        : "")
    );
  };

  const guichet = () => {
    const T = gTabs();
    if (!T.length) return pn("Guichet", "doc", emp("Accès réservé au personnel du guichet de la commune."));
    if (!T.some(t => t[0] == G.tab)) G.tab = T[0][0];
    return (
      `<div class="tabs">${T.map(t => `<button type="button" class="tb2${G.tab == t[0] ? " on" : ""}" data-gm="tab" data-v="${t[0]}">${esc(t[1])}</button>`).join("")}</div>` +
      (G.err ? `<div class="al" role="alert">${esc(G.err)}</div>` : "") +
      (G.ok
        ? gOk(
            G.ok +
              (G.qurl
                ? `<div data-sty="margin-top:8px"><a class="bt" href="${esc(G.qurl)}" data-sty="display:inline-flex;align-items:center;text-decoration:none">Ouvrir la quittance</a></div>`
                : "")
          )
        : "") +
      (G.tab == "dep" ? gDep() : G.tab == "cai" ? gCai() : gRet())
    );
  };

  /* ---------- Reçu imprimable (zone #prt, masquant #app à l'impression) ---------- */
  const gRecuHtml = r =>
    `<article data-sty="max-width:520px;margin:20px auto;font-family:'Nunito Sans',system-ui,sans-serif;color:#111"><h1 data-sty="font-size:20px;margin:0 0 4px">MAIRIE DE ${esc(String(S.co || "").toUpperCase())}</h1><p data-sty="margin:0 0 14px">Reçu de dépôt de demande</p>` +
    `<p data-sty="margin:0">Numéro de suivi</p><p data-sty="font-size:30px;font-weight:800;letter-spacing:1px;margin:0 0 14px">${esc(r.num)}</p>` +
    `<table data-sty="border-collapse:collapse;width:100%"><tbody>${[
      ["Type", r.type],
      ["Objet", r.objet],
      ["Demandeur", r.nom],
      ["Téléphone", r.tel],
      ["Date de dépôt", r.date],
      ["Montant à régler", r.montant > 0 ? gF(r.montant) : "Gratuit"]
    ]
      .map(
        a =>
          `<tr><th data-sty="text-align:left;padding:6px 8px;border-bottom:1px solid #ccc;width:40%">${esc(a[0])}</th><td data-sty="padding:6px 8px;border-bottom:1px solid #ccc">${esc(a[1])}</td></tr>`
      )
      .join("")}</tbody></table>` +
    `<p data-sty="margin-top:16px;font-size:13px">Suivez votre demande sur ${esc(location.origin)}/suivi.html avec ce numéro et le téléphone indiqué ci-dessus. Conservez ce reçu.</p></article>`;
  const gPrint = r => {
    const p = $("#prt");
    if (!p) throw new Error("Zone d’impression introuvable.");
    p.innerHTML = gRecuHtml(r);
    const clear = () => {
      p.innerHTML = "";
      window.removeEventListener("afterprint", clear);
    };
    window.addEventListener("afterprint", clear);
    setTimeout(() => window.print(), 100);
  };

  /* ---------- Actions ---------- */
  const gDone = async keys => {
    await load(keys);
    render();
    window.scrollTo(0, 0);
  };
  const gSave = async () => {
    const type = gV("gd_type"),
      nom = gV("gd_nom"),
      pre = gV("gd_pre"),
      tel = gV("gd_tel"),
      obj = gV("gd_obj");
    G.f = { type, nom, pre, tel, obj };
    if (!GTY.includes(type)) throw new Error("Choisissez un type de demande.");
    if (nom.length < 1 || pre.length < 1) throw new Error("Nom et prénom obligatoires.");
    if (!/^\+?[0-9 ]{8,16}$/.test(tel)) throw new Error("Téléphone invalide (8 à 16 chiffres, espaces et + autorisés).");
    if (obj.length < 2) throw new Error("L’objet de la demande est obligatoire (2 caractères minimum).");
    G.busy = true;
    try {
      /* num_suivi : jamais envoyé, il est généré et verrouillé par le trigger serveur */
      const full = (pre + " " + nom).slice(0, 120),
        ins = await sb
          .from("demandes")
          .insert({
            commune_id: S.cid,
            numero: "GUI-" + new Date().getFullYear() + "-" + gId(),
            type,
            nom: full,
            objet: obj,
            message: ("Dépôt au guichet : " + obj).slice(0, 2000),
            telephone: tel,
            contact: tel,
            service: gSv(type),
            pieces: [],
            statut: "depose"
          })
          .select("id,num_suivi,montant")
          .single();
      if (ins.error) throw new Error(gErr(ins.error, "Dépôt"));
      const d = ins.data || {},
        mt = +d.montant || 0;
      if (!d.num_suivi) throw new Error("Demande enregistrée mais numéro de suivi absent : migration 20261202001600 à appliquer.");
      let warn = "";
      if (mt > 0) {
        const up = await sb.from("demandes").update({ statut: "a_payer", montant_du: mt }).eq("id", d.id).eq("commune_id", S.cid);
        if (up.error) warn = "Passage au statut « à payer » refusé : " + up.error.message;
      }
      G.recu = { num: d.num_suivi, type, objet: obj, nom: full, tel, montant: mt, warn, date: new Date().toLocaleString("fr-FR") };
      G.ok = "";
      G.f = {};
    } finally {
      G.busy = false;
    }
    await gDone(["dem_pay"]);
  };
  const gEnc = async id => {
    const x = (D().dem_pay || []).find(y => y.id == id);
    if (!x || x.statut != "a_payer") return;
    const def = +x.montant_du || +x.montant || 0,
      v = String(prompt("Montant encaissé en espèces (FCFA) pour " + (x.num_suivi || x.numero) + " :", def ? String(def) : "") || "")
        .replace(/\s/g, "")
        .trim();
    if (!v) return;
    if (!/^[0-9]+$/.test(v) || +v <= 0) throw new Error("Montant invalide : saisissez un entier positif en FCFA.");
    const ref = "REC-" + gYmd() + "-" + gId().slice(0, 8),
      r = await sb.rpc("encaisser_demande", { p_id: x.id, p_montant: +v, p_source: "guichet", p_ref_recu: ref });
    if (r.error) throw new Error(gErr(r.error, "Encaissement"));
    const num = String(r.data || "");
    /* quittance.html résout la référence de paiement (reference_paiement), pas le numéro séquentiel */
    let pref = "";
    try {
      const q = await sb
        .from("paiements_taxes")
        .select("reference_paiement")
        .eq("num_quittance", num)
        .eq("commune_id", S.cid)
        .maybeSingle();
      pref = (q && q.data && q.data.reference_paiement) || "";
    } catch (e) {}
    G.ok =
      "Encaissement enregistré : " +
      gF(+v) +
      ". Quittance n° " +
      num +
      (pref ? "." : ". Référence d’impression introuvable : consultez la quittance depuis les recettes.");
    G.qurl = pref ? "/quittance.html?ref=" + encodeURIComponent(pref) : "";
    await gDone(["dem_pay", "paiements_taxes"]);
    if (G.qurl) setTimeout(() => location.assign(G.qurl), 1500);
  };
  const gFind = async () => {
    const n = gV("gr_num").toUpperCase();
    G.ret = null;
    G.rf = {};
    if (!/^FIM-[0-9]{4}-[0-9]{6}$/.test(n)) throw new Error("Numéro de suivi invalide (format FIM-AAAA-NNNNNN).");
    const r = await sb
      .from("demandes")
      .select("id,num_suivi,nom,type,objet,statut,statut_paiement")
      .eq("commune_id", S.cid)
      .eq("num_suivi", n)
      .maybeSingle();
    if (r.error) throw new Error(gErr(r.error, "Recherche"));
    if (!r.data) throw new Error("Aucune demande de votre commune ne porte ce numéro (ou elle n’est pas visible avec votre rôle).");
    G.ret = r.data;
    render();
  };
  const gDo = async () => {
    const x = G.ret,
      nom = gV("gr_nom"),
      cni = gV("gr_cni");
    if (!x) return;
    G.rf = { nom, cni };
    if (nom.length < 2 || nom.length > 120) throw new Error("Nom du retirant obligatoire (2 à 120 caractères).");
    if (cni.length < 5 || cni.length > 30) throw new Error("N° de pièce d’identité obligatoire (5 à 30 caractères).");
    if (!confirm("Confirmer la remise du document du dossier " + x.num_suivi + " à " + nom + " (pièce n° " + cni + ") ?")) return;
    G.busy = true;
    try {
      const r = await sb.rpc("retirer_demande", { p_id: x.id, p_nom: nom, p_cni: cni });
      if (r.error) throw new Error(gErr(r.error, "Retrait"));
      G.ok =
        "✔ Retrait enregistré : dossier " +
        x.num_suivi +
        " remis à " +
        nom +
        " le " +
        new Date().toLocaleString("fr-FR") +
        ". Statut : Retirée.";
      G.ret = null;
      G.rf = {};
    } finally {
      G.busy = false;
    }
    await gDone(["dem_pay"]);
  };

  SP.administration.subs.push(["guichet", "Guichet"]);
  RP.guichet = ["secretariat", "agent", "finances"];
  SPL.guichet = "Guichet";
  SUB.guichet = guichet;

  document.addEventListener("click", async e => {
    const t = e.target && e.target.closest && e.target.closest("[data-gm]");
    if (!t || S.sa || !gTabs().length || G.busy) return;
    const m = t.dataset.gm,
      allowed = { tab: 1, save: "dep", new: "dep", print: "dep", enc: "cai", find: "ret", do: "ret" }[m];
    if (!allowed || (allowed !== 1 && !GR[allowed].includes(S.pr))) return;
    G.err = "";
    try {
      if (m == "tab") {
        if (!gTabs().some(y => y[0] == t.dataset.v)) return;
        G.tab = t.dataset.v;
        G.ok = "";
        G.qurl = "";
        G.recu = null;
        G.ret = null;
        G.f = {};
        G.rf = {};
        render();
      } else if (m == "save") await gSave();
      else if (m == "new") {
        G.recu = null;
        G.f = {};
        render();
      } else if (m == "print") {
        if (G.recu) gPrint(G.recu);
      } else if (m == "enc") {
        G.ok = "";
        G.qurl = "";
        await gEnc(t.dataset.id);
      } else if (m == "find") {
        G.ok = "";
        await gFind();
      } else if (m == "do") await gDo();
    } catch (x) {
      G.busy = false;
      G.err = x.message || "Erreur réseau.";
      render();
      window.scrollTo(0, 0);
    }
  });
})();
