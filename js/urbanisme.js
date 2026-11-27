/* Urbanisme : instruction des permis de construire (espace mairie > Administration > Permis de construire ; entrée dédiée pour le secrétariat).
   Table public.permis_construire (migration 20261209_urbanisme.sql). Workflow strict, sans saut ni retour :
   depot -> instruction_services_techniques -> avis_commission -> decision_maire -> delivrance.
   Délai d'instruction : date_limite_instruction = dépôt + 3 mois (calculé par le serveur) ; au-delà sans décision, le silence de l'administration est signalé.
   Règles pures : RM.permisBlocage / RM.permisDelai (js/regles-municipales.js) ; la base applique les mêmes règles (CHECK + trigger).
   Droits : lecture maire, adjoint, secrétariat ; écriture maire, secrétariat ; décision du Maire : Maire seul.
   Module encapsulé. Dépend de core.js, core-ui.js, adjoints.js (fdd), maire.js (st2), regles-municipales.js : à charger après. */
(() => {
  const ET = {
      depot: "Dépôt",
      instruction_services_techniques: "Instruction par les services techniques",
      avis_commission: "Avis de la commission",
      decision_maire: "Décision du Maire",
      delivrance: "Délivrance"
    },
    AV = [
      ["favorable", "Favorable"],
      ["reserves", "Favorable avec réserves"],
      ["defavorable", "Défavorable"]
    ],
    AVL = Object.fromEntries(AV),
    DEC = [
      ["accorde", "Permis accordé"],
      ["refuse", "Permis refusé"]
    ],
    DECL = Object.fromEntries(DEC),
    ROLES = ["maire", "secretariat"],
    ACTIONS = /^ub(new|cancel|save|det|back|inst|comm|avis|decide|deliv|silence)$/,
    LECTURE = /^ub(det|back)$/,
    peut = () => !S.sa && ROLES.includes(S.pr),
    maire = () => !S.sa && S.pr == "maire",
    sous = h => `<div class="mut" data-sty="font-size:13px">${h}</div>`,
    bouton = (m, l, cl = "bt") => `<button class="${cl}" data-m="${m}">${l}</button>`;
  let ouvert = false /* formulaire « Nouveau dossier » */,
    sel_ = null /* id du dossier dont le détail est affiché */,
    busy = false;

  E0.permis_construire = [];
  LG.permis_construire = [
    () => LQ("permis_construire").order("date_depot", { ascending: false }),
    r => {
      S.db.permis_construire = r || [];
    }
  ];

  const delai = p => RM.permisDelai(p, T),
    badgeDelai = p => {
      const d = delai(p);
      if (d.etat == "silence") return st2("Silence de l’administration (+" + d.jours + " j)", "rd");
      if (d.etat == "proche") return st2("Échéance dans " + d.jours + " j", "or");
      if (d.etat == "dans_les_delais") return st2("Délai : " + d.jours + " j restants", "ok");
      return "";
    },
    etapes = p =>
      RM.PERMIS_ETAPES.map((k, i) => {
        const cur = RM.PERMIS_ETAPES.indexOf(p.statut);
        return st2((i < cur ? "✓ " : i == cur ? "▶ " : "") + ET[k], i < cur ? "ok" : i == cur ? "bl" : "");
      }).join(" ");

  const formulaire = () =>
    pn(
      "Nouveau dossier de permis de construire",
      "doc",
      frm(
        inp("ub_nu", "Numéro de dossier", "text", "", "Ex. PC-2027-001", 'maxlength="60" required') +
          inp("ub_dm", "Demandeur", "text", "", "", 'maxlength="200" required') +
          inp("ub_tl", "Téléphone", "tel", "", "", 'maxlength="30"') +
          inp("ub_pc", "Parcelle / référence foncière", "text", "", "", 'maxlength="200"') +
          inp("ub_ob", "Objet des travaux", "text", "", "", 'maxlength="300" required') +
          inp("ub_dd", "Date de dépôt", "date", T, "", "required")
      ) +
        `<p data-sty="margin-top:10px">${bouton("ubsave", "Enregistrer le dépôt")} ${bouton("ubcancel", "Annuler", "bo")}</p>` +
        emp("Le délai d’instruction court à partir du dépôt : 3 mois. Au-delà, sans décision, le silence de l’administration est signalé.")
    );

  const actionsDossier = p => {
    if (!peut()) return "";
    if (p.statut == "depot") return `<p>${bouton("ubinst", "Transmettre aux services techniques")}</p>`;
    if (p.statut == "instruction_services_techniques")
      return (
        frm(sel("ub_at", "Avis des services techniques", AV, p.avis_services_techniques || "favorable")) +
        `<p data-sty="margin-top:10px">${bouton("ubcomm", "Valider l’instruction et passer en commission")}</p>`
      );
    if (p.statut == "avis_commission")
      return (
        frm(
          sel("ub_ac", "Avis de la commission", AV, p.avis_commission || "favorable") +
            inp("ub_da", "Date de l’avis de la commission", "date", T, "", "required")
        ) + `<p data-sty="margin-top:10px">${bouton("ubavis", "Enregistrer l’avis et passer à la décision du Maire")}</p>`
      );
    if (p.statut == "decision_maire") {
      if (!p.decision_maire)
        return maire()
          ? frm(sel("ub_dc", "Décision du Maire", DEC, "accorde") + inp("ub_dt", "Date de la décision", "date", T, "", "required")) +
              `<p data-sty="margin-top:10px">${bouton("ubdecide", "Enregistrer la décision")}</p>`
          : emp("En attente de la décision du Maire.");
      if (p.decision_maire == "refuse") return emp("Permis refusé par le Maire : le dossier n’est pas délivré.");
      return (
        frm(
          inp("ub_np", "Numéro du permis", "text", "", "", 'maxlength="60" required') +
            inp("ub_dl", "Date de délivrance", "date", T, "", "required")
        ) + `<p data-sty="margin-top:10px">${bouton("ubdeliv", "Délivrer le permis")}</p>`
      );
    }
    return "";
  };

  const detail = () => {
    const p = D().permis_construire.find(x => x.id == sel_);
    if (!p) {
      sel_ = null;
      return liste();
    }
    const info = (l, v) => rw(`<span class="mut">${l}</span>`, `<b>${v}</b>`),
      lim = p.date_limite_instruction || RM.dateLimiteInstruction(p.date_depot);
    return (
      `<p>${bouton("ubback", "← Retour aux dossiers", "bo")}</p>` +
      pn(
        "Dossier " + esc(p.numero),
        "doc",
        `<div data-sty="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${etapes(p)}</div>` +
          info("Demandeur", esc(p.demandeur) + (p.telephone ? " · " + esc(p.telephone) : "")) +
          info("Parcelle", esc(p.parcelle || "Non précisée")) +
          info("Objet", esc(p.objet)) +
          info("Dépôt", esc(fdd(p.date_depot))) +
          info("Date limite d’instruction (+3 mois)", esc(fdd(lim)) + " " + badgeDelai(p)) +
          (p.silence_constate_le ? info("Silence constaté le", esc(fdd(p.silence_constate_le))) : "") +
          (p.date_instruction ? info("Transmis aux services techniques", esc(fdd(p.date_instruction))) : "") +
          (p.avis_services_techniques
            ? info("Avis des services techniques", esc(AVL[p.avis_services_techniques] || p.avis_services_techniques))
            : "") +
          (p.avis_commission
            ? info("Avis de la commission", esc(AVL[p.avis_commission] || p.avis_commission) + " · " + esc(fdd(p.date_avis_commission)))
            : "") +
          (p.decision_maire
            ? info("Décision du Maire", esc(DECL[p.decision_maire] || p.decision_maire) + " · " + esc(fdd(p.date_decision)))
            : "") +
          (p.numero_permis ? info("Permis n°", esc(p.numero_permis) + " · délivré le " + esc(fdd(p.date_delivrance))) : "")
      ) +
      pn(
        "Étape suivante",
        "tools",
        actionsDossier(p) || emp(p.statut == "delivrance" ? "Dossier clos : permis délivré." : "Aucune action disponible pour votre rôle.")
      )
    );
  };

  const liste = () => {
    const L = D().permis_construire,
      cours = L.filter(p => p.statut != "delivrance" && !(p.statut == "decision_maire" && p.decision_maire)),
      sil = cours.filter(p => delai(p).etat == "silence"),
      deliv = L.filter(p => p.statut == "delivrance");
    return (
      `<div class="kp">${kp("k2", "doc", "Dossiers en instruction", cours.length)}${kp("k3", "tools", "Silence de l’administration", sil.length)}${kp("k1", "doc", "Permis délivrés", deliv.length)}</div>` +
      (sil.length
        ? `<div class="al" role="alert">${sil.length} dossier(s) hors délai d’instruction (3 mois) sans décision : silence de l’administration atteint.${peut() ? " " + bouton("ubsilence", "Constater le silence", "bo") : ""}</div>`
        : "") +
      (peut() && ouvert ? formulaire() : "") +
      pn(
        "Permis de construire",
        "doc",
        L.map(p =>
          rw(
            `<b>${esc(p.numero)}</b> ${esc(p.objet)}${sous(esc(p.demandeur) + " · déposé le " + esc(fdd(p.date_depot)))}<div data-sty="margin-top:4px">${etapes(p)}</div>`,
            `<div data-sty="display:grid;gap:4px;justify-items:end">${badgeDelai(p)}${p.decision_maire == "refuse" ? st2("Refusé", "rd") : ""}<button class="bo" data-m="ubdet" data-id="${esc(p.id)}">Instruire</button></div>`
          )
        ).join("") || emp("Aucun dossier de permis de construire."),
        peut() && !ouvert ? bouton("ubnew", "Nouveau dossier") : ""
      )
    );
  };

  const vue = () => (sel_ ? detail() : liste());
  SP.administration.subs.push(["permis", "Permis de construire"]);
  RP.permis = ["maire", "adjoint", "secretariat"];
  SPL.permis = "Permis de construire";
  SUB.permis = vue;
  if (typeof SNAV != "undefined" && !SNAV.some(n => n[0] == "s_permis")) {
    SNAV.push(["s_permis", "Permis de construire", "doc"]);
    V.s_permis = () => page("Permis de construire", vue());
  }

  /* Applique une étape : contrôle local (RM.permisBlocage) puis écriture ; la base refuse de toute façon un saut d'étape. */
  const avancer = async (p, patch, cible) => {
    const mb = RM.permisBlocage(Object.assign({}, p, patch), cible);
    if (mb) throw new Error(mb);
    const r = await sb
      .from("permis_construire")
      .update(Object.assign({ statut: cible }, patch))
      .eq("id", p.id);
    if (r.error)
      throw new Error(
        r.error.code == "42P01" || r.error.code == "PGRST205"
          ? "Permis de construire non disponible sur le serveur : migration 20261209_urbanisme à appliquer."
          : "Étape refusée : " + r.error.message
      );
    await load(["permis_construire"]);
  };

  document.addEventListener("click", async e => {
    const t = e.target.closest("[data-m^=ub]"),
      m = t && t.dataset.m;
    if (!m || !ACTIONS.test(m) || (!LECTURE.test(m) && !peut()) || busy) return;
    busy = true;
    S.err = "";
    try {
      const g = id => (($("#" + id) || {}).value || "").trim(),
        p = D().permis_construire.find(x => x.id == sel_);
      if (m == "ubnew") ouvert = true;
      else if (m == "ubcancel") ouvert = false;
      else if (m == "ubdet") sel_ = t.dataset.id;
      else if (m == "ubback") sel_ = null;
      else if (m == "ubsave") {
        const o = {
          commune_id: S.cid,
          numero: g("ub_nu"),
          demandeur: g("ub_dm"),
          telephone: g("ub_tl") || null,
          parcelle: g("ub_pc") || null,
          objet: g("ub_ob"),
          statut: "depot",
          date_depot: g("ub_dd")
        };
        if (!o.numero || !o.demandeur || !o.objet) throw new Error("Numéro, demandeur et objet sont obligatoires.");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(o.date_depot)) throw new Error("La date de dépôt est obligatoire.");
        o.date_limite_instruction = RM.dateLimiteInstruction(o.date_depot); /* le serveur recalcule : dépôt + 3 mois */
        const r = await sb.from("permis_construire").insert(o);
        if (r.error)
          throw new Error(
            r.error.code == "23505"
              ? "Ce numéro de dossier existe déjà pour cette commune."
              : r.error.code == "42P01" || r.error.code == "PGRST205"
                ? "Permis de construire non disponible sur le serveur : migration 20261209_urbanisme à appliquer."
                : "Enregistrement refusé : " + r.error.message
          );
        ouvert = false;
        await load(["permis_construire"]);
        S.err = "Dossier déposé. Délai d’instruction : jusqu’au " + fdd(o.date_limite_instruction) + ".";
      } else if (m == "ubsilence") {
        const r = await sb.rpc("constater_silences_permis");
        if (r.error) throw new Error("Constat refusé : " + r.error.message);
        await load(["permis_construire"]);
        S.err = r.data + " dossier(s) marqué(s) en silence de l’administration.";
      } else {
        if (!p) throw new Error("Dossier introuvable : retournez à la liste.");
        if (m == "ubinst") await avancer(p, { date_instruction: T }, "instruction_services_techniques");
        else if (m == "ubcomm") await avancer(p, { avis_services_techniques: g("ub_at") }, "avis_commission");
        else if (m == "ubavis") await avancer(p, { avis_commission: g("ub_ac"), date_avis_commission: g("ub_da") }, "decision_maire");
        else if (m == "ubdecide") {
          if (!maire()) throw new Error("Seul le Maire peut enregistrer la décision.");
          if (p.statut != "decision_maire") throw new Error("La décision n’est possible qu’à l’étape « Décision du Maire ».");
          const o = { decision_maire: g("ub_dc"), date_decision: g("ub_dt") };
          if (!DECL[o.decision_maire] || !/^\d{4}-\d{2}-\d{2}$/.test(o.date_decision)) throw new Error("Décision et date obligatoires.");
          const r = await sb.from("permis_construire").update(o).eq("id", p.id);
          if (r.error) throw new Error("Décision refusée : " + r.error.message);
          await load(["permis_construire"]);
        } else if (m == "ubdeliv") await avancer(p, { numero_permis: g("ub_np"), date_delivrance: g("ub_dl") }, "delivrance");
        S.err = S.err || "Dossier " + p.numero + " mis à jour.";
      }
    } catch (x) {
      S.err = x && x.message ? x.message : "Erreur réseau. Réessayez.";
    }
    busy = false;
    render();
    window.scrollTo(0, 0);
  });
})();
