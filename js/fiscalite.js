/* Fiscalité locale et domaine public (espace mairie > Finances > Fiscalité locale ; entrée dédiée pour le secrétariat).
   Tables et RPC : migration 20261203000200_lot15_fiscalite_locale.sql. Droits identiques côté base (RLS / RPC) :
   contribuables : maire, secretariat ; taxes : maire, finances ; générer / encaisser : finances.
   Module encapsulé. Dépend de core.js, core-ui.js, adjoints.js (fdd), maire.js (st2), taxes.js : à charger après. */
(() => {
  const TC = { particulier: "Particulier", entreprise: "Entreprise" },
    TT = { marche: "Marché", domaine_public: "Domaine public", patente: "Patente", autres: "Autres" },
    PE = { mensuel: "Mensuel", trimestriel: "Trimestriel", annuel: "Annuel" },
    RS = { emise: "Émis", en_attente_paiement: "En attente de paiement", payee: "Payé", annulee: "Annulé" },
    RC = { emise: "or", en_attente_paiement: "or", payee: "ok", annulee: "rd" },
    TO = { etal: "Étal", terrasse: "Terrasse", enseigne: "Enseigne" },
    OS = { active: "Active", suspendue: "Suspendue", terminee: "Terminée" },
    TABLES = ["contribuables", "taxes_locales", "roles_imposition", "occupations_domaine_public"],
    DROITS = { fxcadd: ["maire", "secretariat"], fxtadd: ["maire", "finances"], fxgen: ["finances"], fxpay: ["finances"] },
    peut = a => !S.sa && DROITS[a].includes(S.pr),
    ordre = { contribuables: "nom", taxes_locales: "libelle", roles_imposition: "created_at", occupations_domaine_public: "date_debut" };
  let busy = false,
    quit = null; /* dernière quittance émise */

  TABLES.forEach(t => {
    E0[t] = [];
    LG[t] = [
      () => LQ(t).order(ordre[t]),
      r => {
        S.db[t] = r || [];
      }
    ];
  });

  const argent = n => esc(fmt(n)) + " FCFA",
    qui = c => (c ? ((c.prenom || "") + " " + c.nom).trim() : "Contribuable inconnu"),
    contrib = id => D().contribuables.find(c => c.id == id),
    taxe = id => D().taxes_locales.find(t => t.id == id),
    sous = h => `<div class="mut" data-sty="font-size:13px">${h}</div>`,
    bouton = (m, l) => `<p data-sty="margin-top:10px"><button class="bt" data-m="${m}">${l}</button></p>`;

  const vContribuables = () =>
    (peut("fxcadd")
      ? pn(
          "Ajouter un contribuable",
          "user",
          frm(
            sel("fx_cty", "Type", Object.entries(TC)) +
              inp("fx_cnm", "Nom ou raison sociale", "text", "", "", 'maxlength="120"') +
              inp("fx_cpr", "Prénom", "text", "", "", 'maxlength="120"') +
              inp("fx_ctl", "Téléphone", "tel", "", "", 'maxlength="30"') +
              inp("fx_cad", "Adresse", "text", "", "", 'maxlength="300"') +
              inp("fx_cif", "Identifiant fiscal (NINEA…)", "text", "", "", 'maxlength="40"')
          ) + bouton("fxcadd", "Ajouter")
        )
      : "") +
    pn(
      "Contribuables",
      "users",
      D()
        .contribuables.map(c =>
          rw(
            `<b>${esc(qui(c))}</b>${sous(esc(c.adresse || "adresse non précisée") + " · " + esc(c.telephone || "sans téléphone") + (c.identifiant_fiscal ? " · " + esc(c.identifiant_fiscal) : ""))}`,
            st2(TC[c.type] || c.type, "")
          )
        )
        .join("") || emp("Aucun contribuable enregistré.")
    );

  const vTaxes = () =>
    (peut("fxtadd")
      ? pn(
          "Ajouter une taxe",
          "coins",
          frm(
            inp("fx_tlb", "Libellé", "text", "", "", 'maxlength="150"') +
              sel("fx_tty", "Type", Object.entries(TT)) +
              inp("fx_tmt", "Montant par période (FCFA)", "number", "", "", 'min="1" step="1"') +
              sel("fx_tpe", "Périodicité", Object.entries(PE))
          ) + bouton("fxtadd", "Ajouter")
        )
      : "") +
    pn(
      "Taxes locales",
      "coins",
      D()
        .taxes_locales.map(t =>
          rw(`<b>${esc(t.libelle)}</b>${sous(esc(TT[t.type] || t.type) + " · " + esc(PE[t.periodicite] || t.periodicite))}`, `<b>${argent(t.montant_base)}</b>`)
        )
        .join("") || emp("Aucune taxe définie.")
    );

  const vRoles = () => {
    const A = +T.slice(0, 4),
      annees = [...new Set([A, ...D().roles_imposition.map(r => +r.annee)])].sort((a, b) => b - a);
    if (!annees.includes(+S.tab.fisc_an)) S.tab.fisc_an = String(A);
    const an = +S.tab.fisc_an,
      L = D().roles_imposition.filter(r => +r.annee == an),
      total = s => L.filter(r => r.statut == s).reduce((a, r) => a + (+r.montant_du || 0), 0);
    return (
      (quit
        ? `<p role="status">Quittance <b>${esc(quit.num_quittance)}</b> émise · <a href="/quittance?ref=${encodeURIComponent(quit.reference_paiement)}" target="_blank" rel="noopener noreferrer">Voir / imprimer</a></p>`
        : "") +
      (peut("fxgen")
        ? pn(
            "Générer un rôle d’imposition",
            "doc",
            D().contribuables.length && D().taxes_locales.length
              ? frm(
                  sel("fx_rco", "Contribuable", D().contribuables.map(c => [c.id, qui(c)])) +
                    sel("fx_rta", "Taxe", D().taxes_locales.map(t => [t.id, t.libelle])) +
                    inp("fx_ran", "Année", "number", an, "", 'min="2000" max="2100" step="1"')
                ) + bouton("fxgen", "Générer un rôle")
              : emp("Ajoutez d’abord au moins un contribuable et une taxe.")
          )
        : "") +
      pn(
        "Rôles d’imposition",
        "doc",
        tabs("fisc_an", annees.map(a => [String(a), String(a)])) +
          rw(`<span class="mut">À recouvrer / encaissé</span>`, `<b>${argent(total("emise") + total("en_attente_paiement"))} / ${argent(total("payee"))}</b>`) +
          (L.map(r => {
            const t = taxe(r.taxe_id);
            return rw(
              `<b>${esc(qui(contrib(r.contribuable_id)))}</b>${sous(esc(t ? t.libelle : "Taxe inconnue") + " · " + esc(r.annee) + (r.reference_avis ? " · " + esc(r.reference_avis) : ""))}`,
              `<div data-sty="display:grid;gap:4px;justify-items:end"><b>${argent(r.montant_du)}</b>${st2(RS[r.statut] || r.statut, RC[r.statut] || "")}${["emise", "en_attente_paiement"].includes(r.statut) && peut("fxpay") ? `<button class="bt" data-m="fxpay" data-id="${esc(r.id)}">Encaisser</button>` : ""}</div>`
            );
          }).join("") || emp("Aucun rôle pour cette année."))
      )
    );
  };

  /* Échéance d'une occupation non terminée : dépassée, ou dans les 30 jours. */
  const echeance = o => {
    if (o.statut == "terminee" || !o.date_fin) return null;
    const j = Math.round((Date.parse(o.date_fin) - Date.parse(T)) / 86400000);
    return j < 0 ? ["Échue", "rd"] : j <= 30 ? [j ? "Échéance dans " + j + " j" : "Échéance aujourd’hui", "or"] : null;
  };

  const vDomaine = () => {
    const L = D()
        .occupations_domaine_public.slice()
        .sort((a, b) => String(a.date_fin || "9999").localeCompare(String(b.date_fin || "9999"))),
      al = L.map(echeance).filter(Boolean),
      nb = c => al.filter(a => a[1] == c).length;
    return (
      (al.length ? `<div class="al" role="alert">${nb("rd")} occupation(s) échue(s) · ${nb("or")} à échéance sous 30 jours.</div>` : "") +
      pn(
        "Occupations du domaine public",
        "tools",
        L.map(o => {
          const e = echeance(o);
          return rw(
            `<b>${esc(o.emplacement)}</b>${sous(esc(TO[o.type_occupation] || o.type_occupation) + " · " + esc(qui(contrib(o.contribuable_id))) + " · du " + esc(fdd(o.date_debut)) + (o.date_fin ? " au " + esc(fdd(o.date_fin)) : " (sans échéance)"))}`,
            `<div data-sty="display:grid;gap:4px;justify-items:end"><b>${argent(o.montant_mensuel)} / mois</b>${st2(OS[o.statut] || o.statut, "")}${e ? st2(e[0], e[1]) : ""}</div>`
          );
        }).join("") || emp("Aucune occupation enregistrée.")
      )
    );
  };

  const VUES = { contrib: vContribuables, taxes: vTaxes, roles: vRoles, domaine: vDomaine };
  const vue = () => {
    if (!VUES[S.tab.fisc]) S.tab.fisc = "contrib";
    return (
      tabs("fisc", [
        ["contrib", "Contribuables"],
        ["taxes", "Taxes"],
        ["roles", "Rôles d’imposition"],
        ["domaine", "Domaine public"]
      ]) + VUES[S.tab.fisc]()
    );
  };

  SP.finances.subs.push(["fiscalite", "Fiscalité locale"]);
  RP.fiscalite = ["maire", "adjoint", "finances", "secretariat"];
  SPL.fiscalite = "Fiscalité locale";
  SUB.fiscalite = vue;
  /* Le secrétariat a sa propre navigation (SNAV) et n'utilise pas les espaces SP. */
  if (typeof SNAV != "undefined" && !SNAV.some(n => n[0] == "s_fisc")) {
    SNAV.push(["s_fisc", "Fiscalité locale", "coins"]);
    V.s_fisc = () => page("Fiscalité locale", vue());
  }

  const refus = r => {
    if (!r.error) return r;
    if (r.error.code == "PGRST202" || r.error.code == "42P01" || r.error.code == "PGRST205")
      throw new Error("Fiscalité locale non disponible sur le serveur : migration 20261203000200 à appliquer.");
    throw new Error("Opération refusée : " + r.error.message);
  };

  document.addEventListener("click", async e => {
    const t = e.target.closest("[data-m^=fx]"),
      m = t && t.dataset.m;
    if (!m || !Object.prototype.hasOwnProperty.call(DROITS, m) || !peut(m) || busy) return;
    busy = true;
    S.err = "";
    try {
      const g = id => (($("#" + id) || {}).value || "").trim();
      let recharger, message;
      if (m == "fxcadd") {
        const o = {
          commune_id: S.cid,
          type: g("fx_cty"),
          nom: g("fx_cnm"),
          prenom: g("fx_cpr") || null,
          telephone: g("fx_ctl") || null,
          adresse: g("fx_cad") || null,
          identifiant_fiscal: g("fx_cif") || null
        };
        if (!TC[o.type]) throw new Error("Choisissez un type de contribuable.");
        if (!o.nom) throw new Error("Le nom est obligatoire.");
        refus(await sb.from("contribuables").insert(o));
        recharger = ["contribuables"];
        message = "Contribuable enregistré.";
      } else if (m == "fxtadd") {
        const o = {
          commune_id: S.cid,
          libelle: g("fx_tlb"),
          type: g("fx_tty"),
          montant_base: Number(g("fx_tmt")),
          periodicite: g("fx_tpe")
        };
        if (!o.libelle) throw new Error("Le libellé est obligatoire.");
        if (!TT[o.type] || !PE[o.periodicite]) throw new Error("Type ou périodicité invalide.");
        if (!Number.isFinite(o.montant_base) || o.montant_base <= 0 || o.montant_base >= 1e12) throw new Error("Le montant est invalide.");
        refus(await sb.from("taxes_locales").insert(o));
        recharger = ["taxes_locales"];
        message = "Taxe enregistrée.";
      } else if (m == "fxgen") {
        const o = { p_contribuable_id: g("fx_rco"), p_taxe_id: g("fx_rta"), p_annee: Number(g("fx_ran")) };
        if (!o.p_contribuable_id || !o.p_taxe_id) throw new Error("Choisissez un contribuable et une taxe.");
        if (!Number.isInteger(o.p_annee) || o.p_annee < 2000 || o.p_annee > 2100) throw new Error("Année invalide.");
        refus(await sb.rpc("generer_role_imposition", o));
        S.tab.fisc_an = String(o.p_annee);
        recharger = ["roles_imposition"];
        message = "Rôle d’imposition généré.";
      } else {
        const x = D().roles_imposition.find(r => r.id == t.dataset.id);
        if (!x || !["emise", "en_attente_paiement"].includes(x.statut)) throw new Error("Ce rôle ne peut pas être encaissé. Actualisez la liste.");
        if (!window.confirm("Confirmer la réception de " + fmt(x.montant_du) + " FCFA au guichet ?")) {
          busy = false;
          return;
        }
        quit = refus(await sb.rpc("payer_role_imposition", { p_role_id: x.id, p_montant: +x.montant_du })).data;
        recharger = ["roles_imposition", "paiements_taxes"];
        message = "Encaissement enregistré, quittance émise.";
      }
      await load(recharger);
      S.err = message;
    } catch (x) {
      S.err = x && x.message ? x.message : "Erreur réseau. Réessayez.";
    }
    busy = false;
    render();
    window.scrollTo(0, 0);
  });
})();
