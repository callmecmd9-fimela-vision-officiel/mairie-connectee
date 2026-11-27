/* Suivi du Conseil municipal (espace mairie > Conseil municipal > Suivi des sessions) :
   sessions du Conseil et délibérations associées (date, objet, statut de transmission), avec création rapide
   d'une session ou d'une délibération (maire, secrétariat).
   Tables public.sessions_conseil et public.deliberations (colonnes de traçabilité : migration 20261202000300_lot11_gouvernance.sql).
   Données déjà chargées par core.js : D().se (sessions) et D().del (délibérations).
   Vote des conseillers (vue détail d'une délibération) : table public.votes_deliberations (un vote par conseiller et par délibération,
   vote possible uniquement au statut « projet » : garde-fou en base) ; résultats rafraîchis en temps réel (Realtime + relevé périodique).
   Clôture du vote (maire) : RPC cloturer_deliberation (SECURITY DEFINER) qui recompte les votes et passe le statut projet -> adoptee (Pour > Contre) ou rejetee (Contre >= Pour) ; aucun vote = clôture refusée.
   Procès-verbal imprimable (maire, secrétariat) : gabarit #prt + window.print(), structure inspirée de ecDoc (js/etat-civil.js).
   Création d'une délibération : statut initial toujours « projet » (adoptée / rejetée uniquement par le vote).
   Fiche du votant : conseillers.user_id en priorité, e-mail = contact en dernier recours (migration 20261201000500_p1_gouvernance_fixes.sql).
   Lot D (migration 20261207_budget_conseil.sql) : quorum = majorité des membres en exercice présents (règle RM.quorum, js/regles-municipales.js) ; sans quorum,
   le vote et la clôture sont refusés (la base refuse aussi l'adoption / le rejet : trigger deliberations_garde_quorum). Les procurations comptent pour le vote, pas pour le quorum.
   Module encapsulé : aucun identifiant global déclaré.
   Dépend de core.js, core-ui.js, adjoints.js (fdd), secretariat.js (SES, SNAV, V), maire.js (st2) : à charger après maire.js. */
(() => {
  const ROLES = ["maire", "secretariat"],
    DL = { projet: "Projet", adoptee: "Adoptée", rejetee: "Rejetée" },
    DC = { projet: "or", adoptee: "ok", rejetee: "rd" },
    SC = { prevue: "or", convoquee: "bl", tenue: "ok", pv_redige: "ok", archivee: "" },
    EX = { a_executer: "À exécuter", en_cours: "En cours d’exécution", executee: "Exécutée", suspendue: "Suspendue", annulee: "Annulée" },
    peut = () => !S.sa && ROLES.includes(S.pr),
    VOTANTS = ["conseiller", "maire", "adjoint"] /* rôles qui voient les boutons de vote ; la RLS de la base reste l'autorité */,
    VL = { pour: "Pour", contre: "Contre", abstention: "Abstention" },
    VC = { pour: "ok", contre: "rd", abstention: "or" },
    votant = () => !S.sa && VOTANTS.includes(S.pr),
    maire = () => !S.sa && S.pr == "maire",
    lire = () => !S.sa && (RP.suiviconseil.includes(S.pr) || VOTANTS.includes(S.pr));
  let mode = ""; /* "" | "s" (formulaire session) | "d" (formulaire délibération) */
  let ouv = ""; /* id de la délibération dont le détail est ouvert */
  let votes = []; /* votes de la délibération ouverte */
  let cons = []; /* fiches de conseillers lisibles par l'utilisateur (id, actif, user_id, contact) */
  let pres = []; /* présences de la session de la délibération ouverte (pour le quorum) */
  let presOk = false; /* présences chargées */
  let pret = false; /* votes chargés */
  let lerr = ""; /* erreur de lecture des votes */
  let enCours = false; /* vote en cours d'envoi (anti double clic) */
  let enVol = false; /* relevé en cours */
  let chan = null; /* canal Realtime */
  let tempo = null; /* relevé périodique de secours */

  /* statut de transmission au représentant de l'État + suites de traçabilité (publication, caractère exécutoire, exécution) */
  const transmission = x => {
    let t;
    if (x.statut == "projet") t = st2("Projet non transmissible", "or");
    else if (x.statut == "rejetee") t = st2("Transmission sans objet", "");
    else t = x.transmise_le ? st2("Transmise le " + fdd(x.transmise_le), "ok") : st2("À transmettre", "or");
    return (
      t +
      (x.publiee_le ? " " + st2("Publiée le " + fdd(x.publiee_le), "bl") : "") +
      (x.rendue_executoire_le ? " " + st2("Exécutoire le " + fdd(x.rendue_executoire_le), "bl") : "") +
      (x.statut_execution ? " " + st2(EX[x.statut_execution] || x.statut_execution, x.statut_execution == "executee" ? "ok" : "") : "")
    );
  };

  const ligneDel = x =>
    rw(
      `<b>${esc(x.objet)}</b><div class="mut" data-sty="font-size:13px">N° ${esc(x.numero)} · ${fdd(x.jour)}</div>`,
      `<div data-sty="display:grid;gap:4px;justify-items:end">${st2(DL[x.statut] || x.statut || "—", DC[x.statut] || "")}${transmission(x)}${
        lire()
          ? `<button class="bo" data-m="gvopen" data-id="${esc(x.id)}" aria-label="Voir la délibération n° ${esc(x.numero)}">${x.statut == "projet" && votant() ? "Détail et vote" : "Détail"}</button>`
          : ""
      }</div>`
    );

  /* ---------- Vue détail et vote ---------- */
  const delOuverte = () => D().del.find(x => x.id == ouv) || null,
    /* Fiche de conseiller de l'utilisateur connecté : lien conseillers.user_id en priorité ;
       en dernier recours seulement (aucune fiche liée au compte), correspondance e-mail du compte = champ contact sur une fiche non liée à un compte */
    moi = () => {
      const actifs = cons.filter(k => k.actif !== false),
        lie = actifs.find(k => k.user_id && S.uid && k.user_id == S.uid);
      if (lie) return lie.id;
      const em = String(S.email || "")
          .trim()
          .toLowerCase(),
        c =
          em &&
          actifs.find(
            k =>
              !k.user_id &&
              String(k.contact || "")
                .trim()
                .toLowerCase() == em
          );
      return c ? c.id : null;
    },
    compte = () => {
      const n = { pour: 0, contre: 0, abstention: 0 };
      votes.forEach(v => {
        if (Object.prototype.hasOwnProperty.call(n, v.vote)) n[v.vote]++;
      });
      return n;
    },
    inf = x =>
      `<b>${esc(x.objet)}</b><div class="mut" data-sty="font-size:13px">N° ${esc(x.numero)} · ${fdd(x.jour)}</div><div data-sty="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${st2(DL[x.statut] || x.statut || "—", DC[x.statut] || "")}${transmission(x)}</div>`,
    /* Le quorum n'est calculé que si les fiches des conseillers sont lisibles (maire, secrétariat, cabinet) ; sinon la base reste l'autorité. */
    quorumCalculable = x => !S.sa && !!x && !!x.session_id && ["maire", "secretariat", "cabinet"].includes(S.pr) && presOk,
    quorumBloc = x => (quorumCalculable(x) ? RM.quorumBlocage(cons, pres) : ""),
    quorumLigne = x => {
      if (!x || !x.session_id) return rw("<b>Quorum</b>", st2("Hors session : non applicable", ""));
      if (!quorumCalculable(x)) return rw("<b>Quorum</b>", st2("Contrôlé par le serveur", ""));
      const q = RM.quorum(cons, pres);
      return rw(
        `<b>Quorum</b><div class="mut" data-sty="font-size:13px">Majorité des ${q.membres} membres en exercice : ${q.requis} présents requis${q.procurations ? " · " + q.procurations + " procuration(s) (comptées pour le vote, pas pour le quorum)" : ""}</div>`,
        st2(q.presents + " présent(s) · " + (q.atteint ? "atteint" : "NON atteint"), q.atteint ? "ok" : "rd")
      );
    },
    bilan = () => {
      if (!pret) return emp(esc(lerr || "Chargement des résultats…"));
      const n = compte();
      return (
        quorumLigne(delOuverte()) +
        Object.keys(VL)
          .map(k => rw(st2(VL[k], VC[k]), `<b>${n[k]}</b>`))
          .join("") +
        rw("<b>Total des votes</b>", `<b>${n.pour + n.contre + n.abstention}</b>`)
      );
    },
    boutons = (x, off) =>
      `<div data-sty="display:flex;flex-wrap:wrap;gap:8px">${Object.keys(VL)
        .map(k => `<button class="bt" data-m="gvvote" data-v="${k}" data-id="${esc(x.id)}"${off ? " disabled" : ""}>${VL[k]}</button>`)
        .join("")}</div>`,
    blocVote = x => {
      if (!votant() || !pret) return "";
      if (x.statut != "projet")
        return `<p class="mut">Le vote est clos : la délibération est au statut « ${esc(DL[x.statut] || x.statut || "—")} ».</p>`;
      const id = moi(),
        mien = id && votes.find(v => v.conseiller_id == id);
      if (!id)
        return `<p class="mut">Aucune fiche de conseiller actif n’est rattachée à votre compte : le vote est impossible. Contactez le secrétariat.</p>${boutons(x, true)}`;
      if (mien) return `<p>Vous avez voté : ${st2(VL[mien.vote] || mien.vote, VC[mien.vote] || "")}</p>`;
      return `<p class="mut">Un seul vote par conseiller et par délibération.</p>${boutons(x, false)}`;
    },
    actions = x => {
      if (!pret) return "";
      const b = [];
      if (maire() && x.statut == "projet")
        b.push(`<button class="bt" data-m="gvclot" data-id="${esc(x.id)}"${enCours ? " disabled" : ""}>Clôturer le vote</button>`);
      if (peut()) b.push(`<button class="bo" data-m="gvpv" data-id="${esc(x.id)}">Imprimer le Procès-Verbal</button>`);
      return b.length ? `<div data-sty="display:flex;flex-wrap:wrap;gap:8px">${b.join("")}</div>` : "";
    },
    detail = () => {
      const x = delOuverte();
      if (!x || !lire()) return "";
      return pn(
        `Délibération n° ${esc(x.numero)}`,
        "doc",
        `<div id="gv_inf">${inf(x)}</div><h3 data-sty="font-size:16px;margin-top:12px">Résultats du vote</h3><div id="gv_res" role="status" aria-live="polite">${bilan()}</div><div id="gv_vote" data-sty="margin-top:12px">${blocVote(x)}</div><div id="gv_act" data-sty="margin-top:12px">${actions(x)}</div>`,
        `<button class="bo" data-m="gvclose">Fermer</button>`
      );
    },
    /* Met à jour la vue détail déjà affichée, sans refaire toute la page */
    maj = () => {
      const x = delOuverte(),
        a = $("#gv_inf"),
        b = $("#gv_res"),
        c = $("#gv_vote"),
        d = $("#gv_act");
      if (!x || !a || !b || !c) return false;
      a.innerHTML = inf(x);
      b.innerHTML = bilan();
      c.innerHTML = blocVote(x);
      if (d) d.innerHTML = actions(x);
      return true;
    };

  const chargerVotes = async id => {
    const r = await sb.from("votes_deliberations").select("id,conseiller_id,vote,date_vote").eq("deliberation_id", id);
    if (id != ouv) return;
    if (r.error) throw new Error("Lecture des votes refusée : " + r.error.message);
    votes = r.data || [];
    /* le statut peut avoir changé (adoption, rejet) : le vote se ferme alors pour tout le monde */
    const s = await sb.from("deliberations").select("statut").eq("id", id).maybeSingle(),
      x = delOuverte();
    if (x && s.data && s.data.statut && s.data.statut != x.statut) x.statut = s.data.statut;
  };

  const chargerConseillers = async () => {
    if (!lire()) return;
    const r = await sb.from("conseillers").select("*").eq("commune_id", S.cid);
    cons = r.error ? [] : (r.data || []).map(k => ({ id: k.id, actif: k.actif, user_id: k.user_id, contact: k.contact, statut: k.statut }));
  };

  const chargerPresences = async x => {
    pres = [];
    presOk = false;
    if (!x || !x.session_id || !["maire", "secretariat", "cabinet"].includes(S.pr)) return;
    const r = await sb.from("session_presences").select("*").eq("session_id", x.session_id);
    if (x.id != ouv) return;
    if (!r.error) {
      pres = r.data || [];
      presOk = true;
    }
  };

  const arreter = () => {
    if (tempo) clearInterval(tempo);
    tempo = null;
    if (chan) {
      try {
        sb.removeChannel(chan);
      } catch (x) {}
    }
    chan = null;
  };

  /* Relevé des votes ; s'arrête tout seul quand la vue détail n'est plus affichée */
  const rafraichir = async id => {
    if (id != ouv || !$("#gv_res")) return arreter();
    if (enVol) return;
    enVol = true;
    try {
      await chargerVotes(id);
      pret = true;
      lerr = "";
    } catch (x) {
      lerr = x && x.message ? x.message : "Résultats indisponibles.";
    }
    enVol = false;
    maj();
  };

  /* Temps réel : abonnement Realtime aux votes de la délibération, doublé d'un relevé toutes les 15 s (si Realtime n'est pas activé sur la table) */
  const ecouter = id => {
    arreter();
    try {
      if (typeof sb.channel == "function")
        chan = sb
          .channel("gv_votes_" + id)
          .on("postgres_changes", { event: "*", schema: "public", table: "votes_deliberations", filter: "deliberation_id=eq." + id }, () =>
            rafraichir(id)
          )
          .subscribe();
    } catch (x) {
      chan = null;
    }
    tempo = setInterval(() => rafraichir(id), 15000);
  };

  /* Appelé après chaque affichage de la vue détail : charge les votes, les fiches de conseillers, puis écoute les changements */
  const reprendre = async () => {
    const id = ouv;
    if (!id || !$("#gv_res") || enVol) return;
    enVol = true;
    try {
      await Promise.all([chargerVotes(id), chargerConseillers(), chargerPresences(delOuverte())]);
      pret = true;
      lerr = "";
    } catch (x) {
      lerr = x && x.message ? x.message : "Résultats indisponibles.";
    }
    enVol = false;
    maj();
    if (id == ouv && !tempo) ecouter(id);
  };

  const erreurVote = er => {
    const c = String((er && er.code) || "");
    return c == "23505"
      ? "Vous avez déjà voté sur cette délibération."
      : c == "55000"
        ? "Le vote est clos : la délibération n’est plus au statut « Projet »."
        : c == "42501"
          ? "Votre rôle n’est pas autorisé à enregistrer un vote."
          : c == "23514"
            ? "Vote refusé : votre fiche de conseiller n’est pas active ou n’appartient pas à cette commune."
            : "Vote refusé : " + ((er && er.message) || "erreur inconnue");
  };

  /* ---------- Clôture du vote (maire) : RPC public.cloturer_deliberation (migration 20261202001200) ---------- */
  const erreurCloture = er => {
    const c = String((er && er.code) || ""),
      m = String((er && er.message) || "");
    if (c == "PGRST202" || /could not find the function/i.test(m))
      return "Clôture indisponible : la fonction serveur « cloturer_deliberation » n’est pas déployée (migration 20261202001200).";
    if (c == "42501") return "Clôture refusée : seul le maire peut clôturer le vote.";
    if (c == "P0002") return "Délibération introuvable ou hors de votre commune.";
    if (c == "55000" || c == "P0001") return m || "Clôture impossible dans l’état actuel de la délibération.";
    return "Clôture refusée : " + (m || "erreur inconnue");
  };
  const clore = async t => {
    const x = delOuverte();
    if (!maire() || !x || x.id != t.dataset.id || enCours) return;
    if (x.statut != "projet") throw new Error("Le vote est déjà clos : la délibération n’est plus au statut « Projet ».");
    enCours = true;
    try {
      await chargerVotes(x.id); /* relevé frais : on ne clôture jamais sur un décompte périmé */
      await chargerPresences(x); /* idem pour les présences : le quorum se juge sur les données du jour */
      pret = true;
      const qb = quorumBloc(x);
      if (qb) throw new Error("Clôture impossible. " + qb);
      const n = compte(),
        tot = n.pour + n.contre + n.abstention;
      if (!tot) throw new Error("Aucun vote exprimé : la délibération ne peut pas être clôturée. Elle reste au statut « Projet ».");
      const st = n.pour > n.contre ? "adoptee" : "rejetee";
      if (
        !window.confirm(
          "Clôturer le vote de la délibération n° " +
            x.numero +
            " ?\n\nPour : " +
            n.pour +
            " · Contre : " +
            n.contre +
            " · Abstention : " +
            n.abstention +
            "\nRésultat : " +
            (st == "adoptee" ? "ADOPTÉE" : "REJETÉE") +
            ".\n\nCette décision est définitive."
        )
      )
        return;
      const r = await sb.rpc("cloturer_deliberation", { p_id: x.id });
      if (r.error) throw new Error(erreurCloture(r.error));
      const o = r.data && typeof r.data == "object" ? r.data : {};
      if (o.statut != "adoptee" && o.statut != "rejetee")
        throw new Error("Réponse inattendue du serveur : vérifiez l’état de la délibération.");
      await load(["deliberations"]);
      await chargerVotes(x.id).catch(() => {});
      S.err =
        "Vote clôturé : délibération " +
        (o.statut == "adoptee" ? "adoptée" : "rejetée") +
        " (Pour " +
        o.pour +
        ", Contre " +
        o.contre +
        ", Abstention " +
        o.abstention +
        ").";
    } finally {
      enCours = false;
    }
  };

  /* ---------- Procès-verbal imprimable (structure inspirée de ecDoc, js/etat-civil.js) ---------- */
  const pvDoc = x => {
    const n = compte(),
      tot = n.pour + n.contre + n.abstention,
      bl = typeof url == "function" && S.ind && S.ind.blason ? url("blason") : "",
      com = S.co || "",
      se = D().se.find(k => k.id == x.session_id),
      now = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
      res =
        x.statut == "adoptee"
          ? "ADOPTÉE (Pour " + n.pour + " > Contre " + n.contre + ")"
          : x.statut == "rejetee"
            ? "REJETÉE (Contre " + n.contre + " ≥ Pour " + n.pour + ")"
            : "Vote non clos — résultat provisoire";
    return (
      `<article class="ecd" aria-label="Procès-verbal de délibération"><header class="ecd-h">${
        bl
          ? `<img class="ecd-bl" src="${esc(bl)}" alt="Blason de la commune de ${esc(com)}">`
          : `<span class="ecd-bl ecd-sh">${typeof ic == "function" ? ic("shield", 64) : ""}</span>`
      }<div><b>MAIRIE DE ${esc(com.toUpperCase())}</b><span>Conseil municipal</span></div></header>` +
      (x.statut == "projet" ? `<div class="ec-warning">PROCÈS-VERBAL PROVISOIRE — LE VOTE N’EST PAS CLOS</div>` : "") +
      `<h1 class="ecd-t">Procès-verbal de délibération</h1><p class="ecd-s">Délibération n° ${esc(x.numero)}${se ? " · Session du " + esc(fdd(se.jour)) + " (" + esc(se.type || "") + ")" : ""}</p>` +
      `<dl class="ecd-d"><dt>Objet</dt><dd>${esc(x.objet)}</dd><dt>Date</dt><dd>${esc(fdd(x.jour))}</dd>` +
      `<dt>Votes Pour</dt><dd>${n.pour}</dd><dt>Votes Contre</dt><dd>${n.contre}</dd><dt>Abstentions</dt><dd>${n.abstention}</dd><dt>Total des votes</dt><dd>${tot}</dd>` +
      `<dt>Résultat</dt><dd><b>${esc(res)}</b></dd></dl>` +
      `<footer class="ecd-f"><div class="ecd-g"><p>Fait à ${esc(com)}, le ${esc(now)}</p><p class="ecd-o">Le Maire</p><p class="ecd-sg"></p></div></footer>` +
      `<p class="ecd-n">Procès-verbal établi à partir du décompte des votes enregistrés dans l’application. Il ne vaut acte qu’une fois signé par le Maire.</p></article>`
    );
  };

  const imprimer = t => {
    const x = delOuverte(),
      p = $("#prt");
    if (!peut() || !x || x.id != t.dataset.id) return;
    if (!pret) throw new Error("Résultats non chargés : réessayez dans un instant.");
    if (!p) throw new Error("Zone d’impression introuvable.");
    p.innerHTML = pvDoc(x);
    const clear = () => {
      p.innerHTML = "";
      window.removeEventListener("afterprint", clear);
    };
    window.addEventListener("afterprint", clear);
    const wait = Array.from(p.querySelectorAll("img")).map(
      i =>
        new Promise(ok => {
          if (i.complete) return ok();
          i.addEventListener("load", ok);
          i.addEventListener("error", ok);
        })
    );
    Promise.race([Promise.all(wait), new Promise(ok => setTimeout(ok, 3000))]).then(() => setTimeout(() => window.print(), 100));
  };

  const consulter = async (m, t) => {
    if (!lire()) return;
    S.err = "";
    try {
      if (m == "gvclose") {
        arreter();
        ouv = "";
        votes = [];
        pret = false;
        lerr = "";
      } else if (m == "gvopen") {
        const x = D().del.find(d => d.id == t.dataset.id);
        if (!x) return;
        arreter();
        ouv = x.id;
        votes = [];
        pret = false;
        lerr = "";
      } else if (m == "gvclot") {
        await clore(t);
      } else {
        const x = delOuverte(),
          v = t.dataset.v,
          c = moi();
        if (!votant() || !x || x.id != t.dataset.id || !Object.prototype.hasOwnProperty.call(VL, v) || enCours) return;
        if (x.statut != "projet") throw new Error("Le vote est clos : la délibération n’est plus au statut « Projet ».");
        if (!c) throw new Error("Aucune fiche de conseiller actif n’est rattachée à votre compte.");
        const qb = quorumBloc(x);
        if (qb) throw new Error("Vote impossible. " + qb);
        enCours = true;
        try {
          const r = await sb.from("votes_deliberations").insert({ commune_id: S.cid, deliberation_id: x.id, conseiller_id: c, vote: v });
          S.err = r.error ? erreurVote(r.error) : "Vote « " + VL[v] + " » enregistré.";
          await chargerVotes(x.id).catch(() => {});
        } finally {
          enCours = false;
        }
      }
    } catch (x) {
      S.err = x && x.message ? x.message : "Erreur réseau. Réessayez.";
    }
    render();
    window.scrollTo(0, 0);
  };

  const formSession = () =>
    pn(
      "Nouvelle session du Conseil",
      "users",
      frm(
        sel("gv_ty", "Type de session", ["Session ordinaire", "Session extraordinaire"]) +
          inp("gv_jo", "Date", "date", T) +
          inp("gv_he", "Heure", "time", "09:00") +
          inp("gv_li", "Lieu", "text", "", "", 'maxlength="200"')
      ) +
        `<label for="gv_od">Ordre du jour</label><textarea id="gv_od" rows="4" maxlength="5000"></textarea><p data-sty="margin-top:10px"><button class="bt" data-m="gvssave">Programmer la session</button> <button class="bo" data-m="gvcancel">Annuler</button></p>`
    );

  const formDel = () =>
    pn(
      "Nouvelle délibération",
      "doc",
      frm(
        sel(
          "gv_se",
          "Session du Conseil",
          [["", "Sans session"]].concat(D().se.map(s => [s.id, (s.numero || "Session") + " · " + fdd(s.jour)]))
        ) +
          inp("gv_nu", "Numéro", "text", "", "Ex. 2027-001", 'maxlength="30"') +
          inp("gv_ob", "Objet", "text", "", "", 'maxlength="300"') +
          inp("gv_dj", "Date (reprise de la session si elle est choisie)", "date", T)
      ) +
        `<p class="mut" data-sty="margin-top:10px">Statut initial : <b>Projet</b>. Le passage à « Adoptée » ou « Rejetée » résulte uniquement du vote.</p><p data-sty="margin-top:10px"><button class="bt" data-m="gvdsave">Enregistrer la délibération</button> <button class="bo" data-m="gvcancel">Annuler</button></p>`
    );

  const deliberations = () => {
    if (ouv) setTimeout(reprendre, 0); /* après l'affichage : charge et rafraîchit les votes */
    const d = D(),
      S0 = d.se,
      L = d.del,
      ids = new Set(S0.map(s => s.id)),
      libres = L.filter(x => !x.session_id || !ids.has(x.session_id)),
      att = L.filter(x => x.statut == "adoptee" && !x.transmise_le).length,
      p = peut();
    return (
      `<div class="kp">${kp("k2", "users", "Sessions", S0.length)}${kp("k3", "doc", "Délibérations", L.length)}${kp("k1", "mail", "À transmettre", att)}</div>` +
      detail() +
      (p && mode == "s" ? formSession() : "") +
      (p && mode == "d" ? formDel() : "") +
      pn(
        "Sessions du Conseil et délibérations",
        "users",
        S0.map(s => {
          const dl = L.filter(x => x.session_id == s.id);
          return (
            rw(
              `<b>${esc(s.numero || "")} · ${esc(s.type)}</b><div class="mut" data-sty="font-size:13px">${fdd(s.jour)} ${esc((s.heure || "").slice(0, 5))} · ${esc(s.lieu || "lieu non précisé")}${s.transmission_le ? " · transmise le " + fdd(s.transmission_le) : ""}</div>`,
              `<div data-sty="display:grid;gap:4px;justify-items:end">${st2(SES[s.statut] || s.statut || "—", SC[s.statut] || "")}<span class="mut" data-sty="font-size:13px">${dl.length} délibération${dl.length > 1 ? "s" : ""}</span></div>`
            ) +
            (dl.length
              ? `<div data-sty="margin-left:14px;border-left:3px solid #CBD5E1;padding-left:8px">${dl.map(ligneDel).join("")}</div>`
              : "")
          );
        }).join("") || emp("Aucune session enregistrée."),
        p && !mode
          ? `<button class="bt" data-m="gvsnew">Nouvelle session</button> <button class="bt" data-m="gvdnew">Nouvelle délibération</button>`
          : ""
      ) +
      (libres.length ? pn("Délibérations hors session", "doc", libres.map(ligneDel).join("")) : "")
    );
  };

  RP.suiviconseil = [
    "maire",
    "adjoint",
    "cabinet",
    "secretariat"
  ]; /* lecture : périmètre des politiques RLS de sessions_conseil et deliberations */
  SPL.suiviconseil = "Suivi des sessions";
  SUB.suiviconseil = deliberations;

  /* Le secrétariat a sa propre navigation (SNAV) et n'utilise pas les espaces SP : entrée ajoutée ici pour qu'il accède à cet écran.
     Supprimer ce bloc si le secrétariat ne doit pas avoir cet écran dans son menu. */
  if (typeof SNAV != "undefined" && !SNAV.some(n => n[0] == "s_gv")) {
    SNAV.push(["s_gv", "Suivi du Conseil", "users"]);
    V.s_gv = () => page("Suivi du Conseil municipal", deliberations());
  }

  document.addEventListener("click", async e => {
    const t = e.target.closest("[data-m^=gv]"),
      m = t && t.dataset.m;
    if (m == "gvopen" || m == "gvclose" || m == "gvvote" || m == "gvclot") return consulter(m, t);
    if (m == "gvpv") {
      try {
        imprimer(t);
      } catch (x) {
        S.err = x && x.message ? x.message : "Impression impossible.";
        render();
      }
      return;
    }
    if (!m || !/^gv(snew|dnew|cancel|ssave|dsave)$/.test(m) || !peut()) return;
    S.err = "";
    try {
      if (m == "gvsnew") mode = "s";
      else if (m == "gvdnew") mode = "d";
      else if (m == "gvcancel") mode = "";
      else {
        const g = id => (($("#" + id) || {}).value || "").trim();
        let r;
        if (m == "gvssave") {
          const o = {
            commune_id: S.cid,
            type: g("gv_ty") || "Session ordinaire",
            jour: g("gv_jo"),
            heure: g("gv_he") || "09:00",
            lieu: g("gv_li") || null,
            ordre_du_jour: g("gv_od") || null
          };
          if (!o.jour) throw new Error("La date de la session est obligatoire.");
          r = await sb.from("sessions_conseil").insert(o);
        } else {
          const se = D().se.find(x => x.id == g("gv_se")),
            o = {
              commune_id: S.cid,
              numero: g("gv_nu"),
              objet: g("gv_ob"),
              statut: "projet" /* imposé : adoptée / rejetée ne résultent que du vote */,
              jour: se ? se.jour : g("gv_dj") || T,
              session_id: se ? se.id : null
            };
          if (!o.numero || !o.objet) throw new Error("Numéro et objet obligatoires.");
          r = await sb.from("deliberations").insert(o);
        }
        if (r.error) throw new Error("Enregistrement refusé : " + r.error.message);
        mode = "";
        await load(["sessions_conseil", "deliberations"]);
        S.err = m == "gvssave" ? "Session programmée." : "Délibération enregistrée.";
      }
    } catch (x) {
      S.err = x && x.message ? x.message : "Erreur réseau. Réessayez.";
    }
    render();
    window.scrollTo(0, 0);
  });
})();
