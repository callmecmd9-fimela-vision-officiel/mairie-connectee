/* ===== MODULE ESPACE DU MAIRE ===== */
const sm = a => a.reduce((s, x) => s + (+x || 0), 0),
  NP = n => (+n > 0 ? fmt(n) : "Non renseigné"),
  plate = p => p.statut == "en_retard" || (p.date_fin && p.date_fin < T && !["termine", "suspendu"].includes(p.statut));
const MST = {
    preparation: "En préparation",
    lance: "Lancé",
    evaluation: "En évaluation",
    attribue: "Attribué",
    approuve: "Approuvé",
    en_cours: "En exécution",
    receptionne: "Réceptionné",
    annule: "Annulé"
  },
  MTC = {
    preparation: "or",
    lance: "bl",
    evaluation: "bl",
    attribue: "bl",
    approuve: "bl",
    en_cours: "bl",
    receptionne: "ok",
    annule: "rd"
  };
const MMODE = ["Appel d'offres ouvert", "Appel d'offres restreint", "Demande de renseignements et de prix", "Gré à gré", "Autre"],
  PCAT = ["Bâtiment", "Terrain", "Équipement", "Véhicule", "Mobilier", "Infrastructure", "Autre"],
  PET = { bon: "Bon état", moyen: "État moyen", mauvais: "Mauvais état", hors_service: "Hors service" },
  PTC = { bon: "ok", moyen: "or", mauvais: "rd", hors_service: "rd" },
  DCT = ["Arrêté", "Décision", "Instruction", "Validation", "Autre"];
const st2 = (l, c) => `<span class="tg ${c || ""}" data-sty="cursor:default">${esc(l)}</span>`,
  mw = () => !S.sa && ["maire", "finances"].includes(S.pr),
  act2 = h => `<div class="sa-ac">${h}</div>`;
const gb = (sp, tb, l, x = "") => `<button class="tg" data-m="go" data-sp="${sp}" data-t="${tb}"${x}>${l}</button>`;
/* ---- données ---- */
const ms = () => {
  const d = D(),
    I = S.ind,
    ag = d.per.filter(x => x.actif).length || +I.agents || 0,
    rec = sm(d.fin.map(r => r.recettes)),
    dep = sm(d.fin.map(r => r.depenses)),
    B = +I.budget_annuel || 0,
    pr = d.proj,
    ru = d.ru.filter(r => r.jour >= T && r.statut != "annulee");
  return {
    ag,
    rec,
    dep,
    B,
    ex: B ? Math.round((dep / B) * 100) : 0,
    pr,
    pc: pr.filter(p => p.statut == "en_cours").length,
    pt: pr.filter(p => p.statut == "termine").length,
    pl: pr.filter(plate).length,
    rq: d.req.length,
    rqn: d.req.filter(r => r.st == "Nouvelle").length,
    cin: d.cr.filter(x => x.sens == "in" && ["recu", "a_traiter", "affecte", "en_cours"].includes(x.statut)).length,
    ru,
    au: ru.filter(r => r.type == "Audience").length
  };
};
const todo = () => {
  const d = D(),
    a = [];
  d.cr
    .filter(x => x.sens == "out" && x.statut == "en_validation")
    .forEach(x =>
      a.push({
        i: "doc",
        t: `Courrier à valider : ${x.reference || ""} ${x.objet}`,
        sp: "administration",
        tb: "cout",
        k: "cout",
        id: x.id,
        q: "mval",
        ql: "Valider"
      })
    );
  d.cr
    .filter(x => x.sens == "out" && x.statut == "valide")
    .forEach(x =>
      a.push({
        i: "mega",
        t: `Courrier à signer : ${x.reference || ""} ${x.objet}`,
        sp: "administration",
        tb: "cout",
        k: "cout",
        id: x.id,
        q: "msign",
        ql: "Marquer signé"
      })
    );
  d.act
    .filter(x => x.statut == "validation")
    .forEach(x =>
      a.push({ i: "doc", t: `Acte à signer : ${x.reference || ""} ${x.objet}`, sp: "administration", tb: "actes", k: "act", id: x.id })
    );
  d.dl
    .filter(x => x.statut == "brouillon")
    .forEach(x =>
      a.push({ i: "brief", t: `Délégation à valider : ${x.domaine} (${an(x.adjoint_id)})`, sp: "administration", tb: "deleg" })
    );
  d.req
    .filter(x => x.st == "En validation")
    .forEach(x => a.push({ i: "mail", t: `Demande citoyenne à valider : ${x.n} ${x.o || x.t}`, sp: "citoyens", tb: "citoyens", dd: x.id }));
  d.rap
    .filter(x => x.statut == "transmis")
    .forEach(x =>
      a.push({ i: "doc", t: `Rapport à lire : ${x.titre} (${an(x.adjoint_id)})`, sp: "maire", tb: "rapp", ks: "rr", id: x.id })
    );
  d.ins
    .filter(late)
    .forEach(x =>
      a.push({ i: "alert", t: `Instruction en retard : ${x.reference} ${x.objet}`, sp: "maire", tb: "instr", ks: "ri", id: x.id })
    );
  d.pai
    .filter(x => x.statut == "valide")
    .forEach(x => a.push({ i: "coins", t: `Paie à ordonnancer : ${fmois(x.mois)}`, sp: "finances", tb: "paie", k: "pai", id: x.id }));
  d.proj.filter(plate).forEach(x => a.push({ i: "alert", t: `Projet en retard : ${x.titre}`, sp: "developpement", tb: "projets" }));
  return a;
};
const dec = (type, objet, ref) => sb.from("decisions").insert({ commune_id: S.cid, type, objet, reference: ref || null });
const okq = async p => {
  const r = await p;
  if (r.error) throw new Error(r.error.code == "23505" ? "Cette valeur existe déjà (numéro unique)." : r.error.message);
  return r;
};
const trow = x =>
  rw(
    `<div class="ai">${ic(x.i, 22)}<b>${esc(x.t)}</b></div>`,
    act2(
      (x.q ? `<button class="tg ok" data-m="${x.q}" data-id="${x.id}">${x.ql}</button>` : "") +
        gb(
          x.sp,
          x.tb,
          "Ouvrir",
          (x.k ? ` data-k="${x.k}"` : "") +
            (x.ks ? ` data-ks="${x.ks}"` : "") +
            (x.dd ? ` data-dd="${x.dd}"` : "") +
            ` data-id="${x.id || x.dd || ""}"`
        )
    )
  );
const bars = L => {
  const mx = Math.max(1, ...L.map(x => x[1]));
  return L.map(
    x =>
      `<div class="sa-bar"><span class="mut" data-sty="width:110px;font-size:12px">${esc(x[0])}</span><div><i data-sty="width:${Math.round((x[1] / mx) * 100)}%"></i></div><b>${x[1]}</b></div>`
  ).join("");
};
const idCard = () => {
  const I = S.ind,
    v = (k, l) => (I[k] ? `<div><span class="mut">${l} :</span> <b>${esc(I[k])}</b></div>` : ""),
    miss = !I.departement || !I.region || !I.pays;
  return pn(
    "Identité de la commune",
    "shield",
    `<div><b data-sty="font-size:18px">Commune de ${esc(S.co)}</b></div>${v("departement", "Département")}${v("region", "Région")}${v("pays", "Pays")}${v("devise", "Devise")}${v("slogan", "Slogan")}${v("contact_tel", "Téléphone")}${v("contact_adresse", "Adresse")}${v("horaires", "Horaires")}${v("contact_email", "E-mail")}${miss ? `<p class="mut" data-sty="margin-top:8px">Informations à compléter dans Administration > Paramètres. ${gb("administration", "params", "Compléter")}</p>` : ""}`
  );
};
/* ---- tableau de bord ---- */
const mairieDash = () => {
  const d = D(),
    I = S.ind,
    s = ms(),
    t = todo(),
    sc = stat(),
    bg = url("bandeau")
      ? `data-sty="background-image:linear-gradient(rgba(255,255,255,.1),rgba(243,246,241,.9)),url('${esc(url("bandeau"))}')"`
      : "",
    ph = url("photo_maire")
      ? `<img class="mp" src="${esc(url("photo_maire"))}" alt="Photo du Maire">`
      : `<div class="mp" aria-hidden="true">${esc((S.co || "M")[0])}</div>`,
    rq = RS.map((l, i) => [l, d.req.filter(r => r.st == l).length]);
  return `<div class="hero" ${bg}>${url("bandeau") ? "" : palms}${tb("")}<div class="gr">${ph}<div><h1>Bonjour, Monsieur le Maire</h1><i>Commune de ${esc(S.co)} : situation générale</i></div></div></div><div class="ct">${S.err ? `<div class="al" role="alert">${esc(S.err)}</div>` : ""}
${pn("Décisions et alertes", "alert", t.slice(0, 6).map(trow).join("") || emp("Aucune décision en attente. Tout est à jour."), t.length > 6 ? gb("maire", "valid", "Tout voir (" + t.length + ")") : "")}
<h2 data-sty="font:800 17px 'Nunito Sans';margin:6px 0 10px">Situation de la commune</h2>
<div class="kp">${kp("k1", "users", "Population", NP(I.population), I.croissance ? `${I.croissance > 0 ? "▲ +" : "▼ "}${I.croissance}%` : "")}${kp("k2", "home", "Villages et localités", NP(I.villages))}${kp("k4", "users", "Agents municipaux", NP(s.ag))}${kp("k3", "coins", "Budget annuel", s.B ? fm(s.B) + " FCFA" : "Non renseigné")}${kp("k1", "trend", "Recettes " + Y, fm(s.rec))}${kp("k3", "coins", "Dépenses " + Y, fm(s.dep))}${kp("k5", "chart", "Exécution budgétaire", s.B ? s.ex + "%" : "—")}</div>
<h2 data-sty="font:800 17px 'Nunito Sans';margin:6px 0 10px">Activité</h2>
<div class="kp">${kp("k2", "tools", "Projets en cours", s.pc)}${kp("k1", "check", "Projets terminés", s.pt)}${kp("k6", "alert", "Projets en retard", s.pl)}${kp("k5", "mail", "Demandes citoyennes", s.rq, s.rqn ? s.rqn + " nouvelle(s)" : "")}${kp("k3", "mail", "Courriers en attente", s.cin)}${kp("k4", "cal", "Réunions et audiences", s.ru.length, s.au ? s.au + " audience(s)" : "")}${kp("k2", "mega", "Décisions à prendre", t.length)}</div>
<div class="g3">${pn("Évolution des finances", "trend", lineC(d.fin))}${pn("Avancement des projets", "pie", progP(sc))}${pn("Demandes citoyennes par statut", "mail", d.req.length ? bars(rq) : emp("Aucune demande."))}</div>
<div class="g3">${pn("Carte de la commune", "map", mapP())}${pn("Répartition des investissements", "chart", invP(sc))}${pn(
    "Activités récentes",
    "tools",
    acts()
      .map(
        a =>
          `<div class="rw"><div class="ai">${ic(a.i, 28)}<div><b>${esc(a.a)}</b><div class="mut">${esc(a.b)}</div></div></div><span class="mut" data-sty="font-size:12px;white-space:nowrap">${fdt(a.t)}</span></div>`
      )
      .join("") || emp("Aucune activité.")
  )}</div>
${idCard()}<h2 data-sty="font:800 17px 'Nunito Sans';margin:6px 0 10px">Mes espaces</h2><div class="ecg">${espV()
    .map(x => `<button class="ec ${x.c}" data-a="go" data-v="${x.v}">${ic(x.i, 28)}<b>${x.n}</b><span>${x.d}</span></button>`)
    .join("")}</div></div>`;
};
const dash0 = V.dash;
V.dash = () => (S.pr == "maire" && !S.sa ? mairieDash() : dash0());
/* ---- espace personnel ---- */
const mdash = () => {
  const d = D(),
    t = todo(),
    s = ms(),
    un = d.nt.filter(n => !n.lu).length,
    ag = d.rdv
      .filter(r => r.d >= T)
      .sort(cmp)
      .slice(0, 4);
  return (
    `<div class="kp">${kp("k2", "mega", "À valider ou signer", t.filter(x => x.q || x.sp == "administration").length)}${kp("k5", "mega", "Instructions en cours", d.ins.filter(x => !["terminee", "cloturee"].includes(x.statut)).length)}${kp("k6", "doc", "Rapports à lire", d.rap.filter(x => x.statut == "transmis").length)}${kp("k4", "cal", "Audiences à venir", s.au)}${kp("k3", "bell", "Notifications non lues", un)}</div>` +
    pn("À traiter", "alert", t.map(trow).join("") || emp("Rien en attente.")) +
    `<div class="g3">${pn("Prochains rendez-vous", "cal", ag.map(r => rw(`<b>${esc(r.h)}</b> <span class="mut">${fd(r.d)}</span><div>${esc(r.t)}</div>`, "")).join("") || emp("Aucun rendez-vous."))}${pn(
      "Dernières décisions",
      "doc",
      d.dec
        .slice(0, 4)
        .map(x => rw(`<b>${esc(x.objet)}</b><div class="mut" data-sty="font-size:13px">${esc(x.type)} · ${fdd(x.jour)}</div>`, ""))
        .join("") || emp("Aucune décision enregistrée.")
    )}</div>`
  );
};
const aud = () => {
  S.rtype = "Audience";
  try {
    return reun();
  } finally {
    S.rtype = null;
  }
};
const valid = () => {
  const t = todo();
  return (
    pn(
      "Dossiers soumis à l’autorité du Maire",
      "doc",
      t.map(trow).join("") || emp("Aucun dossier en attente de validation ou de signature.")
    ) + emp("Chaque validation faite ici est inscrite au journal des décisions.")
  );
};
const decis = () => {
  const d = D(),
    ops = d.op
      .filter(
        h =>
          h.user_id == S.uid &&
          ["actes", "courrier", "delegations", "instructions", "rapports", "deliberations", "sessions_conseil", "marches"].includes(
            h.table_name
          )
      )
      .slice(0, 12);
  return (
    pn(
      "Enregistrer une décision",
      "mega",
      frm(
        inp("dc_jo", "Date", "date", T) +
          sel("dc_ty", "Type", DCT) +
          inp("dc_rf", "Référence", "text", "", "Ex. Arrêté n° …") +
          inp("dc_ob", "Objet")
      ) +
        `<label for="dc_os">Observations</label><textarea id="dc_os" rows="2"></textarea><p data-sty="margin-top:10px"><button class="bt" data-m="mdsave">Enregistrer</button></p>` +
        emp("Le journal ne permet aucune suppression. Les validations faites depuis l’espace du Maire y sont inscrites automatiquement.")
    ) +
    pn(
      "Journal des décisions",
      "doc",
      d.dec
        .slice(0, 100)
        .map(x =>
          rw(
            `<b>${esc(x.objet)}</b><div class="mut" data-sty="font-size:13px">${esc(x.type)} · ${fdd(x.jour)}${x.reference ? " · " + esc(x.reference) : ""}</div>${x.observations ? `<div>${esc(x.observations)}</div>` : ""}`,
            ""
          )
        )
        .join("") || emp("Aucune décision enregistrée.")
    ) +
    (ops.length
      ? pn(
          "Opérations récentes sur les actes et dossiers",
          "tools",
          ops
            .map(
              h =>
                `<div class="rw"><div class="rl" data-sty="font-size:14px">${esc(TBL[h.table_name] || h.table_name)} ${ACL[h.action] || ""} <span class="mut">${esc(((h.apres || h.avant || {}).reference || (h.apres || h.avant || {}).numero || (h.apres || h.avant || {}).objet || "").toString().slice(0, 50))}</span></div><span class="mut" data-sty="font-size:12px;white-space:nowrap">${fdt(h.created_at)}</span></div>`
            )
            .join("")
        )
      : "")
  );
};
/* ---- finances ---- */
const marches = () => {
  const d = D(),
    e = S.ed && S.ed.e == "mar",
    L = d.mar,
    A = L.filter(x => x.statut != "annule"),
    tot = sm(A.map(x => x.montant)),
    B = +S.ind.budget_annuel || 0,
    W = mw();
  return (
    `<div class="kp">${kp("k2", "doc", "Marchés", A.length)}${kp("k3", "coins", "Montant total", fm(tot) + " FCFA", B ? Math.round((tot / B) * 100) + "% du budget" : "")}${kp("k1", "tools", "En cours", A.filter(x => ["attribue", "approuve", "en_cours"].includes(x.statut)).length)}${kp("k5", "check", "Réceptionnés", A.filter(x => x.statut == "receptionne").length)}</div>` +
    (W
      ? pn(
          e ? "Modifier le marché" : "Nouveau marché",
          "doc",
          frm(
            inp("mk_nu", "Numéro", "text", ev("mar", "numero")) +
              inp("mk_ob", "Objet", "text", ev("mar", "objet")) +
              sel("mk_mo", "Mode de passation", [["", "—"]].concat(MMODE), ev("mar", "mode")) +
              inp("mk_mt", "Montant (FCFA)", "number", ev("mar", "montant", 0), "", 'min="0"') +
              inp("mk_at", "Attributaire", "text", ev("mar", "attributaire")) +
              inp("mk_sv", "Service demandeur", "text", ev("mar", "service")) +
              sel("mk_st", "Statut", Object.entries(MST), ev("mar", "statut", "preparation")) +
              inp("mk_d1", "Date de lancement", "date", ev("mar", "date_lancement")) +
              inp("mk_d2", "Date d’attribution", "date", ev("mar", "date_attribution")) +
              inp("mk_d3", "Date de fin prévue", "date", ev("mar", "date_fin"))
          ) +
            `<label for="mk_os">Observations</label><textarea id="mk_os" rows="2">${esc(ev("mar", "observations"))}</textarea><p data-sty="margin-top:10px"><button class="bt" data-m="mmsave">Enregistrer</button> ${e ? `<button class="bo" data-a="ecl">Annuler</button>` : ""}</p>` +
            emp(
              "Le Maire est ordonnateur ; les paiements relèvent du comptable public. Cet écran suit les marchés, il n’enregistre aucun paiement."
            )
        )
      : "") +
    pn(
      "Marchés publics",
      "doc",
      L.map(x =>
        rw(
          `<b>${esc(x.numero || "")} ${esc(x.objet)}</b><div class="mut" data-sty="font-size:13px">${esc(x.mode || "Mode non précisé")} · ${fmt(x.montant)} FCFA · ${esc(x.attributaire || "attributaire non désigné")}${x.date_fin ? " · fin prévue " + fdd(x.date_fin) : ""}</div>${x.observations ? `<div data-sty="font-size:14px">${esc(x.observations)}</div>` : ""}${histBox(x.id)}`,
          `<div data-sty="display:grid;gap:4px;justify-items:end">${st2(MST[x.statut], MTC[x.statut])}${act2((W ? `<button class="tg" data-a="edit" data-e="mar" data-id="${x.id}">Modifier</button>` : "") + `<button class="tg" data-a="hist" data-tb="marches" data-id="${x.id}">Historique</button>`)}</div>`
        )
      ).join("") || emp("Aucun marché enregistré.")
    )
  );
};
const rbRows = () => {
  const d = D();
  let cr = 0,
    cd = 0;
  return MOIS.map((m, i) => {
    const r = d.fin.find(x => x.mois == i + 1),
      a = r ? +r.recettes : 0,
      b = r ? +r.depenses : 0;
    cr += a;
    cd += b;
    return { m, a, b, s: a - b, cr, cd, r: !!r };
  });
};
REP.budget = () => ({
  t: "Rapport budgétaire " + Y,
  c: ["Mois", "Recettes (FCFA)", "Dépenses (FCFA)", "Solde", "Cumul recettes", "Cumul dépenses"],
  r: rbRows()
    .filter(x => x.r)
    .map(x => [x.m, x.a, x.b, x.s, x.cr, x.cd])
});
const rapb = () => {
  const s = ms(),
    R = rbRows().filter(x => x.r),
    mt = sm(
      D()
        .mar.filter(x => x.statut != "annule")
        .map(x => x.montant)
    );
  return (
    `<div class="kp">${kp("k3", "coins", "Budget annuel", s.B ? fm(s.B) + " FCFA" : "Non renseigné")}${kp("k1", "trend", "Recettes cumulées", fm(s.rec))}${kp("k3", "coins", "Dépenses cumulées", fm(s.dep))}${kp("k5", "chart", "Solde", fm(s.rec - s.dep))}${kp("k4", "chart", "Dépenses / budget", s.B ? s.ex + "%" : "—")}${kp("k2", "doc", "Marchés engagés", fm(mt))}</div>` +
    pn(
      "Évolution mensuelle",
      "trend",
      lineC(D().fin),
      `<button class="tg" data-a="rpgen" data-k="budget" data-f="print">Imprimer / PDF</button> <button class="tg" data-a="rpgen" data-k="budget" data-f="csv">Excel (CSV)</button>`
    ) +
    pn(
      "Tableau par mois",
      "chart",
      R.map(x =>
        rw(
          `<b>${x.m} ${Y}</b><div class="mut" data-sty="font-size:13px">Recettes ${fmt(x.a)} · Dépenses ${fmt(x.b)} FCFA</div>`,
          `<b data-sty="color:${x.s < 0 ? "#B91C1C" : "#166534"}">${x.s < 0 ? "" : "+"}${fmt(x.s)}</b>`
        )
      ).join("") || emp("Aucune saisie. Renseignez les mois dans Budget et recettes.")
    ) +
    emp("Données saisies par le service des finances ; l’exécution comptable relève du comptable public.")
  );
};
/* ---- administration ---- */
const patrimoine = () => {
  const d = D(),
    e = S.ed && S.ed.e == "pat",
    L = d.pat,
    W = ["maire", "secretariat", "technique"].includes(S.pr) && !S.sa;
  return (
    `<div class="kp">${kp("k2", "home", "Biens recensés", L.length)}${kp("k1", "check", "En bon état", L.filter(x => x.etat == "bon").length)}${kp("k6", "alert", "À réparer ou hors service", L.filter(x => ["mauvais", "hors_service"].includes(x.etat)).length)}</div>` +
    (W
      ? pn(
          e ? "Modifier le bien" : "Nouveau bien",
          "home",
          frm(
            inp("pt_rf", "Référence", "text", ev("pat", "reference")) +
              inp("pt_ds", "Désignation", "text", ev("pat", "designation")) +
              sel("pt_ca", "Catégorie", PCAT, ev("pat", "categorie")) +
              inp("pt_lo", "Localisation", "text", ev("pat", "localisation")) +
              sel("pt_et", "État", Object.entries(PET), ev("pat", "etat", "bon")) +
              inp("pt_va", "Valeur estimée (FCFA)", "number", ev("pat", "valeur", ""), "", 'min="0"') +
              inp("pt_dt", "Date d’acquisition", "date", ev("pat", "date_acquisition"))
          ) +
            `<label for="pt_os">Observations</label><textarea id="pt_os" rows="2">${esc(ev("pat", "observations"))}</textarea><p data-sty="margin-top:10px"><button class="bt" data-m="ptsave">Enregistrer</button> ${e ? `<button class="bo" data-a="ecl">Annuler</button>` : ""}</p>`
        )
      : "") +
    pn(
      "Patrimoine communal",
      "home",
      L.map(x =>
        rw(
          `<b>${esc(x.reference || "")} ${esc(x.designation)}</b><div class="mut" data-sty="font-size:13px">${esc(x.categorie || "")} · ${esc(x.localisation || "lieu non précisé")}${x.valeur != null ? " · " + fmt(x.valeur) + " FCFA" : ""}</div>`,
          `<div data-sty="display:grid;gap:4px;justify-items:end">${st2(PET[x.etat], PTC[x.etat])}${W ? act2(`<button class="tg" data-a="edit" data-e="pat" data-id="${x.id}">Modifier</button><button class="tg rd" data-m="mdel" data-tb="patrimoine" data-id="${x.id}">Retirer</button>`) : ""}</div>`
        )
      ).join("") || emp("Aucun bien enregistré. Les valeurs ne sont jamais préremplies.")
    )
  );
};
/* ---- conseil ---- */
const commissions = () => {
  const d = D(),
    e = S.ed && S.ed.e == "com",
    W = ["maire", "secretariat"].includes(S.pr) && !S.sa;
  return (
    (W
      ? pn(
          e ? "Modifier la commission" : "Nouvelle commission",
          "users",
          frm(
            inp("cm_no", "Nom", "text", ev("com", "nom")) +
              inp("cm_do", "Domaine", "text", ev("com", "domaine"), "Ex. Finances, Éducation") +
              inp("cm_pr", "Président", "text", ev("com", "president"))
          ) +
            `<label for="cm_me">Membres</label><textarea id="cm_me" rows="3">${esc(ev("com", "membres"))}</textarea><p data-sty="margin-top:10px"><button class="bt" data-m="cmsave">Enregistrer</button> ${e ? `<button class="bo" data-a="ecl">Annuler</button>` : ""}</p>`
        )
      : "") +
    pn(
      "Commissions du Conseil",
      "users",
      d.com
        .map(x =>
          rw(
            `<b>${esc(x.nom)}</b> ${x.actif ? "" : st2("Inactive", "rd")}<div class="mut" data-sty="font-size:13px">${esc(x.domaine || "")}${x.president ? " · président : " + esc(x.president) : ""}</div>${x.membres ? `<div data-sty="font-size:14px;white-space:pre-wrap">${esc(x.membres)}</div>` : ""}`,
            W
              ? act2(
                  `<button class="tg" data-a="edit" data-e="com" data-id="${x.id}">Modifier</button><button class="tg" data-m="mcact" data-id="${x.id}">${x.actif ? "Désactiver" : "Réactiver"}</button><button class="tg rd" data-m="mdel" data-tb="commissions" data-id="${x.id}">Retirer</button>`
                )
              : ""
          )
        )
        .join("") || emp("Aucune commission enregistrée.")
    )
  );
};
/* ---- développement et pilotage ---- */
const devdom = () => {
  const P = D().proj,
    doms = [...new Set(DOM.concat(P.map(p => p.domaine).filter(Boolean)))],
    av = L => (L.length ? Math.round(sm(L.map(p => (p.statut == "termine" ? 100 : p.avancement))) / L.length) : 0),
    line = (k, L) =>
      rw(
        `<b>${esc(k)}</b><div class="mut" data-sty="font-size:13px">${L.length} projet(s) · ${fmt(sm(L.map(p => p.budget)))} FCFA · avancement moyen ${av(L)}%</div>${L.slice(
          0,
          4
        )
          .map(p => `<div data-sty="font-size:13px">• ${esc(p.titre)} (${PSS[p.statut]})</div>`)
          .join("")}`,
        `<span class="tg" data-sty="cursor:default">${L.length}</span>`
      ),
    sn = P.filter(p => !p.domaine);
  return (
    pn(
      "Projets par domaine",
      "tools",
      doms
        .map(k =>
          line(
            k,
            P.filter(p => p.domaine == k)
          )
        )
        .join("") + (sn.length ? line("Domaine non précisé", sn) : "")
    ) + emp("Le domaine se renseigne à la création d’un projet (Projets et travaux).")
  );
};
const indic = () => {
  const I = S.ind,
    pop = +I.population || 0,
    mn = +I.menages || 0,
    vl = +I.villages || 0,
    ag = ms().ag,
    B = +I.budget_annuel || 0,
    r = (l, v, n = "") => rw(l, `<b>${v}</b>${n ? ` <span class="mut">${n}</span>` : ""}`);
  return (
    pn(
      "Indicateurs communaux",
      "chart",
      r("Population", NP(pop), I.croissance ? "croissance " + I.croissance + "%" : "") +
        r("Villages et localités", NP(vl)) +
        r("Ménages recensés", NP(mn)) +
        r("Agents municipaux", NP(ag)) +
        r("Budget annuel", B ? fmt(B) + " FCFA" : "Non renseigné"),
      gb("administration", "params", "Modifier")
    ) +
    pn(
      "Indicateurs calculés",
      "trend",
      r("Habitants par village", pop && vl ? fmt(Math.round(pop / vl)) : "—") +
        r("Personnes par ménage", pop && mn ? (pop / mn).toFixed(1).replace(".", ",") : "—") +
        r("Agents pour 1 000 habitants", pop && ag ? ((ag / pop) * 1000).toFixed(1).replace(".", ",") : "—") +
        r("Budget par habitant", pop && B ? fmt(Math.round(B / pop)) + " FCFA" : "—")
    ) +
    idCard() +
    emp("Ces données sont saisies par les utilisateurs habilités ; aucune valeur n’est préremplie.")
  );
};
const svcsuivi = () => {
  const R = REP.services();
  return pn(
    "Activité des services municipaux",
    "brief",
    R.r
      .map(r =>
        rw(
          `<b>${esc(r[0])}</b><div class="mut" data-sty="font-size:13px">Responsable : ${esc(r[1] || "non renseigné")}</div>`,
          `<div data-sty="font-size:13px;text-align:right">Dossiers en cours ${r[2]} · en attente ${r[3]}<br>Tâches en retard ${r[4]} · courriers non traités ${r[5]}</div>`
        )
      )
      .join("") || emp("Aucun service enregistré (Administration > Services)."),
    `<button class="tg" data-a="rpgen" data-k="services" data-f="print">Imprimer / PDF</button>`
  );
};
const evalproj = () => {
  const s = stat(),
    P = s.pr,
    rt = P.filter(plate);
  return (
    `<div class="kp">${kp("k2", "tools", "Projets", P.length)}${kp("k1", "pie", "Avancement moyen", s.avg + "%")}${kp("k1", "check", "Terminés", s.cn("termine"))}${kp("k6", "alert", "En retard", rt.length)}${kp("k3", "coins", "Budget total", fm(sm(P.map(p => p.budget))) + " FCFA")}</div><div class="g3">${pn("Avancement", "pie", progP(s))}${pn("Investissements", "chart", invP(s))}</div>` +
    pn(
      "Projets en retard",
      "alert",
      rt
        .map(p =>
          rw(
            `<b>${esc(p.titre)}</b><div class="mut" data-sty="font-size:13px">${esc(p.localite || "")} · fin prévue ${fdd(p.date_fin)} · ${p.avancement}%</div>${p.difficultes ? `<div data-sty="font-size:14px"><b>Difficultés :</b> ${esc(p.difficultes)}</div>` : ""}`,
            st2(PSS[p.statut], TC2[p.statut])
          )
        )
        .join("") || emp("Aucun projet en retard.")
    )
  );
};
/* ---- personnel et congés (maire et RH) ---- */
const PCT = ["Permanent", "Contractuel", "Temporaire", "Stagiaire", "Autre"],
  CGT = ["Annuel", "Maladie", "Maternité", "Paternité", "Exceptionnel", "Autre"],
  CGS = { demande: "En attente", approuve: "Approuvé", refuse: "Refusé" },
  CGC = { demande: "or", approuve: "ok", refuse: "rd" };
const pw = () => !S.sa && ["maire", "rh"].includes(S.pr),
  pnm = x => (x ? x.prenom + " " + x.nom : "—"),
  anc = d => {
    if (!d) return "";
    const y = Math.floor((Date.now() - new Date(d + "T00:00")) / 31557600000);
    return y >= 1 ? y + " an(s) d’ancienneté" : "moins d’un an";
  },
  jours = c => Math.round((new Date(c.date_fin + "T00:00") - new Date(c.date_debut + "T00:00")) / 864e5) + 1,
  enconge = () => D().cg.filter(c => c.statut == "approuve" && c.date_debut <= T && c.date_fin >= T);
REP.personnel = () => ({
  t: "Liste du personnel communal",
  c: ["Matricule", "Nom", "Prénom", "Fonction", "Service", "Contrat", "Date d’embauche", "Situation"],
  r: D().per.map(x => [
    x.matricule || "",
    x.nom,
    x.prenom,
    x.fonction || "",
    x.service || "",
    x.type_contrat,
    fdd(x.date_embauche),
    x.actif ? "En fonction" : "Sorti"
  ])
});
const personnel = () => {
  const d = D(),
    e = S.ed && S.ed.e == "per",
    W = pw(),
    f = (S.fl && S.fl.per) || {},
    A = d.per.filter(x => x.actif),
    ec = enconge().map(c => c.personnel_id),
    bys = {};
  A.forEach(x => {
    const k = x.service || "Non précisé";
    bys[k] = (bys[k] || 0) + 1;
  });
  const L = d.per.filter(x => !f.q || NZ([x.nom, x.prenom, x.matricule, x.fonction, x.service].join(" ")).includes(NZ(f.q)));
  return (
    `<div class="kp">${kp("k4", "users", "Agents en fonction", A.length)}${kp("k1", "check", "Permanents", A.filter(x => x.type_contrat == "Permanent").length)}${kp("k3", "users", "Contractuels et temporaires", A.filter(x => ["Contractuel", "Temporaire"].includes(x.type_contrat)).length)}${kp("k2", "cal", "En congé aujourd’hui", ec.length)}${kp("k6", "out", "Sortis", d.per.length - A.length)}</div>` +
    (W
      ? pn(
          e ? "Modifier l’agent" : "Nouvel agent",
          "user",
          `<datalist id="pe_sl">${d.sv
            .filter(x => x.actif)
            .map(x => `<option value="${esc(x.nom)}">`)
            .join("")}</datalist>` +
            frm(
              inp("pe_mt", "Matricule", "text", ev("per", "matricule")) +
                inp("pe_pr", "Prénom", "text", ev("per", "prenom")) +
                inp("pe_nm", "Nom", "text", ev("per", "nom")) +
                inp("pe_fn", "Fonction ou poste", "text", ev("per", "fonction")) +
                inp("pe_sv", "Service", "text", ev("per", "service"), "", 'list="pe_sl"') +
                sel("pe_ct", "Type de contrat", PCT, ev("per", "type_contrat", "Permanent")) +
                inp("pe_de", "Date d’embauche", "date", ev("per", "date_embauche")) +
                inp("pe_tl", "Téléphone", "text", ev("per", "telephone")) +
                inp("pe_em", "E-mail", "email", ev("per", "email"))
            ) +
            `<label for="pe_os">Observations</label><textarea id="pe_os" rows="2">${esc(ev("per", "observations"))}</textarea><p data-sty="margin-top:10px"><button class="bt" data-m="pesave">Enregistrer</button> ${e ? `<button class="bo" data-a="ecl">Annuler</button>` : ""}</p>` +
            emp("Données personnelles : visibles uniquement par le Maire et le service RH. Aucun salaire n’est enregistré ici.")
        )
      : "") +
    (A.length ? pn("Répartition par service", "chart", bars(Object.entries(bys))) : "") +
    pn(
      "Personnel communal",
      "users",
      frm(
        inp("f_per_q", "Rechercher", "search", f.q || "", "Nom, matricule, fonction, service") +
          `<button class="bo" data-a="flt" data-m="per">Filtrer</button><button class="tg" data-a="flr" data-m="per">Réinitialiser</button>`
      ) +
        act2(
          `<button class="tg" data-a="rpgen" data-k="personnel" data-f="print">Imprimer / PDF</button><button class="tg" data-a="rpgen" data-k="personnel" data-f="csv">Excel (CSV)</button>`
        ) +
        (L.map(x =>
          rw(
            `<b>${esc(pnm(x))}</b> ${x.actif ? "" : st2("Sorti", "rd")} ${ec.includes(x.id) ? st2("En congé", "bl") : ""}<div class="mut" data-sty="font-size:13px">${esc([x.matricule, x.fonction, x.service, x.type_contrat].filter(Boolean).join(" · "))}${x.date_embauche ? " · embauché le " + fdd(x.date_embauche) + " (" + anc(x.date_embauche) + ")" : ""}${x.date_sortie ? " · sorti le " + fdd(x.date_sortie) : ""}</div>${x.telephone || x.email ? `<div class="mut" data-sty="font-size:13px">${esc([x.telephone, x.email].filter(Boolean).join(" · "))}</div>` : ""}`,
            W
              ? act2(
                  `<button class="tg" data-a="edit" data-e="per" data-id="${x.id}">Modifier</button><button class="tg ${x.actif ? "or" : "ok"}" data-m="peactif" data-id="${x.id}">${x.actif ? "Mettre fin aux fonctions" : "Réintégrer"}</button>`
                )
              : ""
          )
        ).join("") || emp("Aucun agent. Les agents enregistrés apparaîtront ici."))
    )
  );
};
const cdr = id => D().cd.find(x => x.personnel_id == id),
  pris = id =>
    sm(
      D()
        .cg.filter(c => c.personnel_id == id && c.statut == "approuve" && c.type == "Annuel" && c.date_debut.slice(0, 4) == Y)
        .map(jours)
    ),
  solde = id => {
    const r = cdr(id);
    return r ? (+r.jours_droit || 0) + (+r.jours_report || 0) - pris(id) : null;
  };
const conges = () => {
  const d = D(),
    W = pw(),
    A = d.per.filter(x => x.actif),
    ec = enconge(),
    L = d.cg.slice().sort((a, b) => b.date_debut.localeCompare(a.date_debut)),
    nm = id => pnm(d.per.find(x => x.id == id));
  return (
    `<div class="kp">${kp("k3", "cal", "Demandes en attente", d.cg.filter(c => c.statut == "demande").length)}${kp("k2", "users", "En congé aujourd’hui", ec.length)}${kp("k1", "check", "Congés approuvés " + Y, d.cg.filter(c => c.statut == "approuve" && c.date_debut.slice(0, 4) == Y).length)}</div>` +
    (W
      ? pn(
          "Nouvelle demande de congé ou d’absence",
          "cal",
          A.length
            ? frm(
                sel(
                  "cg_ag",
                  "Agent",
                  A.map(x => [x.id, pnm(x)])
                ) +
                  sel("cg_ty", "Type", CGT) +
                  inp("cg_d1", "Du", "date", T) +
                  inp("cg_d2", "Au", "date", T)
              ) +
                `<label for="cg_mo">Motif</label><textarea id="cg_mo" rows="2"></textarea><p data-sty="margin-top:10px"><button class="bt" data-m="cgsave">Enregistrer la demande</button></p>`
            : emp("Enregistrez d’abord des agents dans Personnel.")
        )
      : "") +
    pn(
      "Soldes de congés annuels " + Y,
      "cal",
      A.map(x => {
        const r = cdr(x.id),
          s = solde(x.id);
        return rw(
          `<b>${esc(pnm(x))}</b><div class="mut" data-sty="font-size:13px">${r ? "Droit " + r.jours_droit + " j · report " + r.jours_report + " j · pris " + pris(x.id) + " j · " : "Droit non saisi · "}${r ? `<b data-sty="color:${s < 0 ? "#B91C1C" : "#166534"}">solde ${s} j</b>` : ""}</div>` +
            (W
              ? `<div class="fr" data-sty="margin:6px 0 0">${inp("cd_d_" + x.id, "Droit annuel (jours)", "number", r ? r.jours_droit : "", "", 'min="0" step="0.5"')}${inp("cd_r_" + x.id, "Report (jours)", "number", r ? r.jours_report : 0, "", 'min="0" step="0.5"')}<button class="bo" data-m="cdsave" data-id="${x.id}">Enregistrer</button></div>`
              : ""),
          ""
        );
      }).join("") || emp("Aucun agent en fonction.")
    ) +
    (ec.length
      ? pn(
          "Agents en congé aujourd’hui",
          "users",
          ec
            .map(c =>
              rw(
                `<b>${esc(nm(c.personnel_id))}</b><div class="mut" data-sty="font-size:13px">${esc(c.type)} · jusqu’au ${fdd(c.date_fin)}</div>`,
                ""
              )
            )
            .join("")
        )
      : "") +
    pn(
      "Congés et absences",
      "cal",
      L.map(c =>
        rw(
          `<b>${esc(nm(c.personnel_id))}</b><div class="mut" data-sty="font-size:13px">${esc(c.type)} · du ${fdd(c.date_debut)} au ${fdd(c.date_fin)} (${jours(c)} jour(s) calendaires)</div>${c.motif ? `<div data-sty="font-size:14px">${esc(c.motif)}</div>` : ""}`,
          `<div data-sty="display:grid;gap:4px;justify-items:end">${st2(CGS[c.statut], CGC[c.statut])}${W && c.statut == "demande" ? act2(`<button class="tg ok" data-m="cgdec" data-s="approuve" data-id="${c.id}">Approuver</button><button class="tg rd" data-m="cgdec" data-s="refuse" data-id="${c.id}">Refuser</button><button class="tg" data-m="cgdel" data-id="${c.id}">Supprimer</button>`) : ""}</div>`
        )
      ).join("") || emp("Aucune demande de congé.")
    )
  );
};
/* ---- rémunérations et paie (maire, rh, finances) ---- */
const PAS = { brouillon: "Brouillon", valide: "Validée", ordonnance: "Ordonnancée", paye: "Payée" },
  PAC = { brouillon: "or", valide: "bl", ordonnance: "bl", paye: "ok" },
  fmois = d => {
    const s = new Date(d + "T00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return s[0].toUpperCase() + s.slice(1);
  };
REP.paie = () => {
  const d = D(),
    o = d.pai.find(x => x.id == S.sel.pai) || {};
  return {
    t: "État de paie : " + (o.mois ? fmois(o.mois) : ""),
    c: ["Matricule", "Agent", "Brut (FCFA)", "Retenues (FCFA)", "Net (FCFA)"],
    r: d.pli
      .filter(l => l.paie_id == o.id)
      .map(l => {
        const p = d.per.find(x => x.id == l.personnel_id) || {};
        return [p.matricule || "", pnm(p), l.brut, l.retenues, l.net];
      })
  };
};
const paiePanel = o => {
  const d = D(),
    M = S.pr == "maire" && !S.sa,
    W = ["maire", "rh"].includes(S.pr) && !S.sa,
    F = ["maire", "finances"].includes(S.pr) && !S.sa,
    L = d.pli
      .filter(l => l.paie_id == o.id)
      .sort((a, b) => pnm(d.per.find(x => x.id == a.personnel_id)).localeCompare(pnm(d.per.find(x => x.id == b.personnel_id)))),
    st = o.statut;
  return pn(
    "Paie : " + fmois(o.mois),
    "coins",
    `<p>${st2(PAS[st], PAC[st])}<br>${o.nb_agents} agent(s) · brut ${fmt(o.total_brut)} · retenues ${fmt(o.total_retenues)} · <b>net à payer ${fmt(o.total_net)} FCFA</b>${o.ordonne_le ? "<br>Ordonnancée le " + fdt(o.ordonne_le) : ""}${o.date_paiement ? "<br>Payée le " + fdd(o.date_paiement) + " · référence " + esc(o.reference_paiement || "") : ""}</p>` +
      (L.length
        ? L.map(l => {
            const p = d.per.find(x => x.id == l.personnel_id),
              ed = W && st == "brouillon";
            return `<div class="rw" data-sty="align-items:flex-start"><div class="rl"><b>${esc(pnm(p))}</b>${+l.brut == 0 ? ' <span class="tg or" data-sty="cursor:default">Rémunération non saisie</span>' : ""}<div class="mut" data-sty="font-size:13px">${esc([p && p.matricule, p && p.fonction].filter(Boolean).join(" · "))}</div></div>${ed ? `<div class="fr" data-sty="margin:0;min-width:300px">${inp("pl_b_" + l.id, "Brut", "number", l.brut, "", 'min="0"')}${inp("pl_r_" + l.id, "Retenues", "number", l.retenues, "", 'min="0"')}<button class="bo" data-m="plsave" data-id="${l.id}">Enregistrer</button></div>` : `<div data-sty="text-align:right;font-size:14px">Brut ${fmt(l.brut)}<br>Retenues ${fmt(l.retenues)}<br><b>Net ${fmt(l.net)}</b></div>`}</div>`;
          }).join("")
        : emp("Détail des lignes réservé au Maire et au service RH.")) +
      `<p data-sty="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">${W && st == "brouillon" ? `<button class="bo" data-m="pgen" data-mo="${o.mois}">Régénérer depuis les rémunérations</button><button class="bt" data-m="pval" data-id="${o.id}">Valider la paie</button>` : ""}${M && st == "valide" ? `<button class="bt" data-m="pord" data-id="${o.id}">Ordonnancer le paiement</button><button class="bo" data-m="pret" data-id="${o.id}">Renvoyer en brouillon</button>` : ""}${st == "valide" && !M ? '<span class="mut">En attente d’ordonnancement par le Maire.</span>' : ""}${W && L.length ? `<button class="tg" data-a="rpgen" data-k="paie" data-f="print">Imprimer / PDF</button><button class="tg" data-a="rpgen" data-k="paie" data-f="csv">Excel (CSV)</button>` : ""} ${closeb("pai")}</p>` +
      (F && st == "ordonnance"
        ? `<div class="fr">${inp("pa_dt", "Date du paiement", "date", T)}${inp("pa_rf", "Référence du paiement (virement, mandat)")}<button class="bt" data-m="ppay" data-id="${o.id}">Enregistrer le paiement</button></div>` +
          emp("Le paiement est exécuté par le comptable public ; enregistrez ici sa confirmation.")
        : "")
  );
};
const paie = () => {
  const d = D(),
    R = d.pai,
    o = S.sel.pai && R.find(x => x.id == S.sel.pai),
    W = ["maire", "rh"].includes(S.pr) && !S.sa,
    l = R[0];
  return (
    (l
      ? `<div class="kp">${kp("k2", "cal", "Dernière paie", fmois(l.mois), PAS[l.statut])}${kp("k1", "coins", "Net à payer", fm(l.total_net) + " FCFA")}${kp("k3", "coins", "Brut", fm(l.total_brut) + " FCFA")}${kp("k4", "users", "Agents payés", l.nb_agents)}</div>`
      : "") +
    (o ? paiePanel(o) : "") +
    (W
      ? pn(
          "Préparer la paie d’un mois",
          "coins",
          frm(inp("pa_mo", "Mois", "month", T.slice(0, 7))) +
            `<p data-sty="margin-top:10px"><button class="bt" data-m="pgen">Préparer la paie du mois</button></p>` +
            emp(
              "La paie est préparée à partir des rémunérations enregistrées. Aucun taux de cotisation ni d’impôt n’est appliqué automatiquement : saisissez le total des retenues. Circuit : préparation et validation (RH), ordonnancement (Maire), paiement et preuve (comptable public)."
            )
        )
      : "") +
    pn(
      "Paies du personnel",
      "coins",
      R.map(x =>
        rowv(
          "pai",
          x.id,
          `<b>${fmois(x.mois)}</b><div class="mut" data-sty="font-size:13px">${x.nb_agents} agent(s) · net ${fmt(x.total_net)} FCFA</div>`,
          st2(PAS[x.statut], PAC[x.statut])
        )
      ).join("") || emp("Aucune paie préparée.")
    )
  );
};
const remun = () => {
  const d = D(),
    e = S.ed && S.ed.e == "rem",
    A = d.per.filter(x => x.actif),
    rm = id => d.rem.find(r => r.personnel_id == id),
    br = r => (r ? (+r.salaire_base || 0) + (+r.indemnites || 0) : 0),
    W = ["maire", "rh"].includes(S.pr) && !S.sa,
    ag = e && d.per.find(x => x.id == S.ed.r.personnel_id);
  return (
    `<div class="kp">${kp("k4", "users", "Agents en fonction", A.length)}${kp("k3", "coins", "Masse brute mensuelle", fm(sm(A.map(x => br(rm(x.id))))) + " FCFA")}${kp("k6", "alert", "Sans rémunération saisie", A.filter(x => !rm(x.id)).length)}</div>` +
    (e && W
      ? pn(
          "Rémunération : " + esc(pnm(ag)),
          "coins",
          frm(
            inp("rm_sb", "Salaire de base mensuel (FCFA)", "number", ev("rem", "salaire_base", 0), "", 'min="0"') +
              inp("rm_in", "Indemnités mensuelles (FCFA)", "number", ev("rem", "indemnites", 0), "", 'min="0"') +
              inp("rm_re", "Retenues mensuelles (FCFA)", "number", ev("rem", "retenues", 0), "", 'min="0"') +
              inp("rm_de", "Date d’effet", "date", ev("rem", "date_effet"))
          ) +
            `<label for="rm_os">Observations</label><textarea id="rm_os" rows="2">${esc(ev("rem", "observations"))}</textarea><p data-sty="margin-top:10px"><button class="bt" data-m="rmsave">Enregistrer</button> <button class="bo" data-a="ecl">Annuler</button></p>` +
            emp(
              "Les retenues (cotisations sociales, impôts) sont à saisir selon la réglementation applicable : aucun taux n’est appliqué par l’application."
            )
        )
      : "") +
    pn(
      "Rémunérations par agent",
      "coins",
      A.map(x => {
        const r = rm(x.id);
        return rw(
          `<b>${esc(pnm(x))}</b><div class="mut" data-sty="font-size:13px">${esc([x.matricule, x.fonction, x.service].filter(Boolean).join(" · "))}</div>${r ? `<div data-sty="font-size:14px">Base ${fmt(r.salaire_base)} · indemnités ${fmt(r.indemnites)} · retenues ${fmt(r.retenues)} · <b>brut ${fmt(br(r))} FCFA</b></div>` : '<div class="mut">Non renseignée</div>'}`,
          W ? `<button class="tg" data-m="rmedit" data-id="${x.id}">${r ? "Modifier" : "Saisir"}</button>` : ""
        );
      }).join("") || emp("Aucun agent en fonction (Administration > Personnel).")
    ) +
    emp("Données confidentielles : visibles uniquement par le Maire et le service RH.")
  );
};
/* ---- enregistrement dans les espaces ---- */
Object.assign(RP, {
  paie: ["maire", "rh", "finances"],
  remun: ["maire", "rh"],
  conges: ["maire", "rh"],
  mdash: ["maire"],
  agenda: ["maire"],
  aud: ["maire"],
  valid: ["maire"],
  decis: ["maire"],
  marches: ["maire", "finances"],
  rapb: ["maire", "finances"],
  patrimoine: ["maire", "technique"],
  commissions: ["maire", "adjoint", "cabinet", "secretariat"],
  recl: ["maire", "adjoint", "cabinet", "secretariat"],
  aides: ["maire", "adjoint", "cabinet", "secretariat"],
  audc: ["maire", "adjoint", "cabinet", "secretariat"],
  devdom: ["maire", "adjoint", "technique", "cabinet"],
  indic: ["maire"],
  svcsuivi: ["maire"],
  evalproj: ["maire"]
});
RP.conseil = RP.conseil.filter(r => r != "maire");
Object.assign(SPL, {
  paie: "Paie du personnel",
  remun: "Rémunérations du personnel",
  conges: "Congés et absences",
  mdash: "Espace du Maire : tableau de bord",
  agenda: "Agenda du Maire",
  aud: "Audiences",
  valid: "Validations et signatures",
  decis: "Journal des décisions",
  marches: "Marchés publics",
  rapb: "Rapports budgétaires",
  patrimoine: "Patrimoine communal",
  commissions: "Commissions du Conseil",
  recl: "Réclamations",
  aides: "Aides sociales",
  audc: "Audiences demandées",
  devdom: "Projets par domaine",
  indic: "Indicateurs communaux",
  svcsuivi: "Suivi des services",
  evalproj: "Évaluation des projets"
});
MODS.push(
  ["maire", "Espace du Maire", "Agenda, validations, décisions"],
  ["finances", "Finances", "Budget, marchés, rapports budgétaires"]
);
Object.assign(SUB, {
  paie,
  remun,
  personnel,
  conges,
  mdash,
  agenda,
  aud,
  valid,
  decis,
  marches,
  rapb,
  patrimoine,
  commissions,
  devdom,
  indic,
  svcsuivi,
  evalproj,
  recl: () => pn("Réclamations et signalements", "alert", dem(["Réclamations", "Signalement"])),
  aides: () => pn("Aides sociales", "user", dem("Aide sociale")),
  audc: () => pn("Audiences demandées par les citoyens", "cal", dem(["Audience", "Rendez-vous avec le Maire"]))
});
/* ---- actions ---- */
const MAC = {
  async go(t) {
    const sp = SP[t.dataset.sp];
    if (!sp) return;
    S.view = sp.v;
    if (t.dataset.t) S.tab[t.dataset.sp] = t.dataset.t;
    if (t.dataset.k) S.sel[t.dataset.k] = t.dataset.id || null;
    if (t.dataset.ks) S[t.dataset.ks] = t.dataset.id || null;
    S.menu = false;
    if (t.dataset.dd) {
      S.dd = t.dataset.dd;
      markSeen(S.dd);
      await openD();
    }
  },
  async mval(t) {
    const x = D().cr.find(c => c.id == t.dataset.id);
    await okq(sb.from("courrier").update({ statut: "valide" }).eq("id", x.id));
    await dec("Validation", "Validation du courrier " + (x.reference || "") + " : " + x.objet, x.reference);
    await load(["courrier", "decisions"]);
    S.err = "Courrier validé.";
  },
  async msign(t) {
    const x = D().cr.find(c => c.id == t.dataset.id);
    await okq(sb.from("courrier").update({ statut: "signe" }).eq("id", x.id));
    await dec("Décision", "Signature du courrier " + (x.reference || "") + " : " + x.objet, x.reference);
    await load(["courrier", "decisions"]);
    S.err = "Courrier marqué comme signé.";
  },
  async pesave(t, g) {
    const e = S.ed && S.ed.e == "per",
      o = {
        matricule: g("pe_mt") || null,
        prenom: g("pe_pr"),
        nom: g("pe_nm"),
        fonction: g("pe_fn") || null,
        service: g("pe_sv") || null,
        type_contrat: g("pe_ct"),
        date_embauche: g("pe_de") || null,
        telephone: g("pe_tl") || null,
        email: g("pe_em") || null,
        observations: g("pe_os") || null
      };
    if (!o.prenom || !o.nom) throw new Error("Le prénom et le nom sont obligatoires.");
    await okq(e ? sb.from("personnel").update(o).eq("id", S.ed.r.id) : sb.from("personnel").insert({ ...o, commune_id: S.cid }));
    S.ed = {};
    await load(["personnel"]);
    S.err = "Agent enregistré.";
  },
  async peactif(t) {
    const x = D().per.find(p => p.id == t.dataset.id);
    if (x.actif && !confirm("Mettre fin aux fonctions de " + pnm(x) + " ?")) return;
    await okq(
      sb
        .from("personnel")
        .update(x.actif ? { actif: false, date_sortie: T } : { actif: true, date_sortie: null })
        .eq("id", x.id)
    );
    await load(["personnel"]);
  },
  async cgsave(t, g) {
    const o = {
      personnel_id: g("cg_ag"),
      type: g("cg_ty"),
      date_debut: g("cg_d1"),
      date_fin: g("cg_d2"),
      motif: g("cg_mo") || null,
      commune_id: S.cid
    };
    if (!o.personnel_id || !o.date_debut || !o.date_fin) throw new Error("Agent et dates obligatoires.");
    if (o.date_fin < o.date_debut) throw new Error("La date de fin précède la date de début.");
    if (o.type == "Annuel") {
      const s = solde(o.personnel_id),
        n = Math.round((new Date(o.date_fin + "T00:00") - new Date(o.date_debut + "T00:00")) / 864e5) + 1;
      if (s !== null && n > s && !confirm("Solde insuffisant (" + s + " j) pour " + n + " j. Enregistrer quand même ?")) return;
    }
    await okq(sb.from("conges").insert(o));
    await load(["conges"]);
    S.err = "Demande enregistrée.";
  },
  async cgdec(t) {
    await okq(
      sb.from("conges").update({ statut: t.dataset.s, decide_par: S.uid, decide_le: new Date().toISOString() }).eq("id", t.dataset.id)
    );
    await load(["conges"]);
    S.err = t.dataset.s == "approuve" ? "Congé approuvé." : "Congé refusé.";
  },
  async cdsave(t, g) {
    const id = t.dataset.id,
      dr = g("cd_d_" + id),
      o = {
        personnel_id: id,
        commune_id: S.cid,
        annee: Y,
        jours_droit: +dr,
        jours_report: +g("cd_r_" + id) || 0,
        updated_at: new Date().toISOString()
      };
    if (dr === "" || !(o.jours_droit >= 0)) throw new Error("Saisissez le droit annuel (jours).");
    await okq(sb.from("conges_droits").upsert(o, { onConflict: "personnel_id,annee" }));
    await load(["conges_droits"]);
    S.err = "Solde enregistré.";
  },
  async cgdel(t) {
    if (!confirm("Supprimer cette demande ?")) return;
    await okq(sb.from("conges").delete().eq("id", t.dataset.id).eq("statut", "demande"));
    await load(["conges"]);
  },
  async rmedit(t) {
    const d = D();
    S.ed = { e: "rem", r: Object.assign({ personnel_id: t.dataset.id }, d.rem.find(r => r.personnel_id == t.dataset.id) || {}) };
  },
  async rmsave(t, g) {
    const o = {
      personnel_id: S.ed.r.personnel_id,
      commune_id: S.cid,
      salaire_base: +g("rm_sb") || 0,
      indemnites: +g("rm_in") || 0,
      retenues: +g("rm_re") || 0,
      date_effet: g("rm_de") || null,
      observations: g("rm_os") || null,
      updated_at: new Date().toISOString()
    };
    if (o.retenues > o.salaire_base + o.indemnites) throw new Error("Les retenues ne peuvent pas dépasser le brut.");
    await okq(sb.from("remunerations").upsert(o, { onConflict: "personnel_id" }));
    S.ed = {};
    await load(["remunerations"]);
    S.err = "Rémunération enregistrée.";
  },
  async pgen(t, g) {
    if (t.dataset.mo && !confirm("Régénérer la paie ? Les montants saisis manuellement seront remplacés.")) return;
    const m = t.dataset.mo || (g("pa_mo") ? g("pa_mo") + "-01" : "");
    if (!m) throw new Error("Choisissez un mois.");
    const r = await okq(sb.rpc("paie_generer", { p_mois: m }));
    S.sel.pai = r.data;
    await load(["paies", "paie_lignes"]);
    S.err = "Paie préparée à partir des rémunérations.";
  },
  async plsave(t, g) {
    const id = t.dataset.id;
    await okq(sb.rpc("paie_maj_ligne", { p_ligne: id, p_brut: +g("pl_b_" + id) || 0, p_retenues: +g("pl_r_" + id) || 0 }));
    await load(["paies", "paie_lignes"]);
    S.err = "Ligne enregistrée.";
  },
  async pval(t) {
    await okq(sb.rpc("paie_valider", { p_paie: t.dataset.id }));
    await load(["paies"]);
    S.err = "Paie validée : en attente d’ordonnancement par le Maire.";
  },
  async pret(t) {
    await okq(sb.rpc("paie_retour_brouillon", { p_paie: t.dataset.id }));
    await load(["paies"]);
    S.err = "Paie renvoyée en brouillon.";
  },
  async pord(t) {
    if (!confirm("Ordonnancer cette paie ? Elle ne sera plus modifiable.")) return;
    await okq(sb.rpc("paie_ordonnancer", { p_paie: t.dataset.id }));
    await load(["paies", "decisions"]);
    S.err = "Paie ordonnancée. La décision est inscrite au journal.";
  },
  async ppay(t, g) {
    await okq(sb.rpc("paie_payer", { p_paie: t.dataset.id, p_date: g("pa_dt"), p_ref: g("pa_rf") }));
    await load(["paies"]);
    S.err = "Paiement enregistré.";
  },
  async mdsave(t, g) {
    const o = {
      jour: g("dc_jo") || T,
      type: g("dc_ty"),
      objet: g("dc_ob"),
      reference: g("dc_rf") || null,
      observations: g("dc_os") || null,
      commune_id: S.cid
    };
    if (!o.objet) throw new Error("L’objet de la décision est obligatoire.");
    await okq(sb.from("decisions").insert(o));
    await load(["decisions"]);
    S.err = "Décision enregistrée.";
  },
  async mmsave(t, g) {
    const e = S.ed && S.ed.e == "mar",
      o = {
        numero: g("mk_nu") || null,
        objet: g("mk_ob"),
        mode: g("mk_mo") || null,
        montant: +g("mk_mt") || 0,
        attributaire: g("mk_at") || null,
        service: g("mk_sv") || null,
        statut: g("mk_st"),
        date_lancement: g("mk_d1") || null,
        date_attribution: g("mk_d2") || null,
        date_fin: g("mk_d3") || null,
        observations: g("mk_os") || null
      };
    if (!o.objet) throw new Error("L’objet du marché est obligatoire.");
    await okq(e ? sb.from("marches").update(o).eq("id", S.ed.r.id) : sb.from("marches").insert({ ...o, commune_id: S.cid }));
    S.ed = {};
    await load(["marches"]);
    S.err = "Marché enregistré.";
  },
  async ptsave(t, g) {
    const e = S.ed && S.ed.e == "pat",
      o = {
        reference: g("pt_rf") || null,
        designation: g("pt_ds"),
        categorie: g("pt_ca"),
        localisation: g("pt_lo") || null,
        etat: g("pt_et"),
        valeur: g("pt_va") === "" ? null : +g("pt_va"),
        date_acquisition: g("pt_dt") || null,
        observations: g("pt_os") || null
      };
    if (!o.designation) throw new Error("La désignation est obligatoire.");
    await okq(e ? sb.from("patrimoine").update(o).eq("id", S.ed.r.id) : sb.from("patrimoine").insert({ ...o, commune_id: S.cid }));
    S.ed = {};
    await load(["patrimoine"]);
    S.err = "Bien enregistré.";
  },
  async cmsave(t, g) {
    const e = S.ed && S.ed.e == "com",
      o = { nom: g("cm_no"), domaine: g("cm_do") || null, president: g("cm_pr") || null, membres: g("cm_me") || null };
    if (!o.nom) throw new Error("Le nom de la commission est obligatoire.");
    await okq(e ? sb.from("commissions").update(o).eq("id", S.ed.r.id) : sb.from("commissions").insert({ ...o, commune_id: S.cid }));
    S.ed = {};
    await load(["commissions"]);
    S.err = "Commission enregistrée.";
  },
  async mcact(t) {
    const x = D().com.find(c => c.id == t.dataset.id);
    await okq(sb.from("commissions").update({ actif: !x.actif }).eq("id", x.id));
    await load(["commissions"]);
  },
  async mdel(t) {
    const tb = t.dataset.tb;
    if (!["patrimoine", "commissions"].includes(tb) || !confirm("Retirer cet élément ?")) return;
    await okq(sb.from(tb).delete().eq("id", t.dataset.id));
    await load([tb]);
  }
};
document.addEventListener("click", async e => {
  const t = e.target.closest("[data-m]"),
    f = t && MAC[t.dataset.m];
  if (!f || S.sa) return;
  const g = id => (($("#" + id) || {}).value || "").trim();
  S.err = "";
  try {
    await f(t, g);
  } catch (x) {
    S.err = x && x.message && !/fetch|network|Failed/i.test(x.message) ? x.message : "Erreur réseau. Réessayez.";
  }
  render();
  window.scrollTo(0, 0);
});
setInterval(() => {
  if (S.role == "cab" && S.pr == "maire" && !S.sa && S.view == "dash" && !document.hidden)
    load(["demandes", "courrier", "notifications", "projets", "finances", "rapports", "instructions", "paies"])
      .then(() => {
        if (S.view == "dash") render();
      })
      .catch(() => {});
}, 60000);
