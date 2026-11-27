/* LOT 5 : Registre d'état civil (espace Mairie > Administration) + copies d'actes imprimables (PDF via window.print) avec blason et QR Code local (js/qr-local.js).
   Signature (rpc signer_acte) et rectification (rpc rectifier_acte) : en ligne uniquement. Saisie d'un nouvel acte : file hors ligne (queueAction, id client).
   Les demandes de copie des citoyens restent dans public.demandes (type « État civil ») ; « Validé » = statut traitee. */
E0.actes_ec = [];
LG.actes_ec = [
  () => LQ("actes_etat_civil").order("annee_acte", { ascending: false }).order("created_at", { ascending: false }),
  r => {
    S.db.actes_ec = r || [];
  }
];
E0.ec_mentions = [];
LG.ec_mentions = [
  () => sb.from("actes_mentions_marginales").select("*").order("created_at", { ascending: true }),
  r => {
    S.db.ec_mentions = r || [];
  }
];
E0.ec_dem = [];
LG.ec_dem = [
  () => LQ("demandes").eq("type", "État civil").order("created_at", { ascending: false }),
  r => {
    S.db.ec_dem = r || [];
  }
];
E0.ec_copies = [];
LG.ec_copies = [
  () => LQ("actes_copies").order("created_at", { ascending: false }),
  r => {
    S.db.ec_copies = r || [];
  }
];
const EC = {
    tab: "reg",
    ft: "all",
    q: "",
    draft: null,
    edit: null,
    pick: null,
    rect: null,
    rd: {},
    pend: { pending: 0, failed: 0, conflicts: 0 },
    xa: ""
  },
  ECT = { naissance: "Naissance", mariage: "Mariage", deces: "Décès" },
  ECS = {
    nouvelle: "Nouvelle",
    orientee: "Orientée",
    en_cours: "En cours",
    a_valider: "À valider",
    traitee: "Validé",
    redirigee: "Réorientée",
    en_attente_pieces: "Pièces demandées",
    rejetee: "Rejetée",
    cloturee: "Clôturée",
    acceptee: "Acceptée",
    pret_a_retirer: "Prêt à retirer"
  },
  ECF = [
    "type",
    "num",
    "an",
    "de",
    "lieu",
    "nom",
    "pre",
    "sexe",
    "dn",
    "ln",
    "prof",
    "pere",
    "mere",
    "cn",
    "cp",
    "cdn",
    "cpere",
    "cmere",
    "off",
    "obs",
    "mode",
    "dd",
    "decl",
    "jur",
    "jn",
    "jd"
  ];
const ecE = x => esc(x == null ? "" : String(x)),
  ecNZ = s =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim(),
  ecD = x => {
    const d = x ? new Date(String(x).length == 10 ? x + "T00:00:00" : x) : null;
    return d && !isNaN(d) ? d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—";
  },
  ecFull = a => (a.prenom || "") + " " + (a.nom || "").toUpperCase(),
  ecKind = d => {
    const t = ecNZ((d.objet || "") + " " + (d.message || ""));
    return /naissance/.test(t) ? "naissance" : /mariage/.test(t) ? "mariage" : /deces/.test(t) ? "deces" : "";
  },
  ecToday = () => new Date().toISOString().slice(0, 10);
const ecFromRow = a => {
  const o = {
    type: a.type_acte,
    num: a.numero_acte,
    an: a.annee_acte,
    de: a.date_evenement,
    lieu: a.lieu_evenement,
    nom: a.nom,
    pre: a.prenom,
    sexe: a.sexe,
    dn: a.date_naissance,
    ln: a.lieu_naissance,
    prof: a.profession,
    pere: a.pere_nom,
    mere: a.mere_nom,
    cn: a.conjoint_nom,
    cp: a.conjoint_prenom,
    cdn: a.conjoint_date_naissance,
    cpere: a.conjoint_pere_nom,
    cmere: a.conjoint_mere_nom,
    off: a.officier_etat_civil,
    obs: a.observations,
    mode: a.mode_inscription || "ordinaire",
    dd: a.date_declaration,
    decl: a.declarant,
    jur: a.juridiction,
    jn: a.jugement_numero,
    jd: a.jugement_date
  };
  Object.keys(o).forEach(k => {
    if (o[k] == null) o[k] = "";
  });
  return o;
};
const ecCap = () => {
  const d = Object.assign({}, EC.draft || {});
  ECF.forEach(k => {
    const e = $("#ec_" + k);
    if (e) d[k] = e.value;
  });
  EC.draft = d;
};
const ecv = k => ((($("#ec_" + k) || {}).value || "") + "").trim();
/* Recherche de l'acte du registre correspondant à une demande (n° + année, sinon nom de la personne concernée) */
const ecMatch = d => {
  const m = String(d.message || ""),
    n = (m.match(/N°\s*d[’']acte\s*:\s*([^\n]+)/i) || [])[1],
    y = (m.match(/Ann[ée]e\s*:\s*(\d{4})/i) || [])[1],
    p = (m.match(/Personne concern[ée]e\s*:\s*([^\n]+)/i) || [])[1],
    k = ecKind(d),
    L = D().actes_ec.filter(a => !k || a.type_acte == k);
  if (n && y) {
    const r = L.filter(a => String(a.numero_acte).toUpperCase() == n.trim().toUpperCase() && String(a.annee_acte) == y);
    if (r.length) return r;
  }
  if (p) {
    const q = ecNZ(p);
    return L.filter(a => q.includes(ecNZ(a.nom)) && q.includes(ecNZ(a.prenom)));
  }
  return [];
};
const ecSigned = a => !!(a && a.signe_le),
  ecMentions = id => (D().ec_mentions || []).filter(m => m.acte_id == id),
  ecMen = m =>
    [
      m.texte || m.mention || m.contenu || m.motif || m.libelle || "",
      m.juridiction ? "Jugement n° " + (m.jugement_numero || "—") + " du " + ecD(m.jugement_date) + " (" + m.juridiction + ")" : ""
    ]
      .filter(Boolean)
      .join(" — ") + (m.created_at ? " [" + ecD(m.created_at) + "]" : ""),
  ecNet = r =>
    navigator.onLine === false ||
    !!(
      r &&
      r.error &&
      (r.status === 0 ||
        [408, 502, 503, 504].includes(r.status) ||
        /failed to fetch|networkerror|load failed|network request failed/i.test(r.error.message || ""))
    ),
  ecOnly = what => {
    if (navigator.onLine === false) throw new Error(what + " impossible hors ligne : reconnectez-vous.");
  },
  ecNeedSigned = a => {
    if (!ecSigned(a))
      throw new Error(
        "Impression bloquée : l’acte n° " + a.numero_acte + "/" + a.annee_acte + " n’est pas signé. Signez-le dans le registre."
      );
  },
  ecDup = e => {
    const m = String((e && e.message) || "");
    if (/doublon probable/i.test(m))
      return "Doublon probable : un acte identique (même personne, même évènement) existe déjà. Vérifiez le registre avant de réessayer.";
    if (/actes_ec_unique|num[ée]ro/i.test(m))
      return "Numéro déjà utilisé : un acte portant ce numéro existe déjà pour ce type et cette année.";
    return "Conflit d’unicité : " + m;
  },
  ecPendTxt = () => {
    const p = EC.pend || {};
    return (
      (p.pending ? p.pending + " acte(s) hors ligne en attente d’envoi. " : "") +
      (p.conflicts ? p.conflicts + " acte(s) en conflit (numéro déjà pris) : à vérifier. " : "")
    );
  },
  ecPendBox = () => `<p id="ec_pend" class="mut" role="status">${ecE(ecPendTxt())}</p>`,
  ecDl = (name, type, txt) => {
    const u = URL.createObjectURL(new Blob([txt], { type: type + ";charset=utf-8" })),
      a = document.createElement("a");
    a.href = u;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  },
  ecCsv = (acts, cols) => {
    const q = v => '"' + String(v).replace(/"/g, '""') + '"';
    return (
      "\ufeff" +
      [cols.map(q)]
        .concat(
          acts.map(a =>
            cols.map(c => {
              let v = a[c];
              if (v == null) v = "";
              else if (typeof v == "object") v = JSON.stringify(v);
              v = String(v);
              return q(/^[=+\-@\t\r]/.test(v) ? "'" + v : v);
            })
          )
        )
        .map(r => r.join(","))
        .join("\r\n")
    );
  };
const ecCopy = id => D().ec_copies.find(c => c.demande_id == id);
/* ---------- Formulaire de saisie ---------- */
const ecForm = () => {
  const d = EC.draft || { type: "naissance", an: String(new Date().getFullYear()) },
    t = d.type || "naissance",
    ed = !!EC.edit,
    lab = { naissance: "Date de naissance", mariage: "Date du mariage", deces: "Date du décès" }[t],
    lieu = { naissance: "Lieu de naissance", mariage: "Lieu du mariage", deces: "Lieu du décès" }[t],
    v = k => d[k] || "",
    ta = (id, l, x) => fl(id, l, `<textarea id="${id}" rows="2" maxlength="1000">${ecE(x)}</textarea>`);
  let b =
    sel(
      "ec_type",
      "Type d’acte",
      Object.keys(ECT).map(k => [k, ECT[k]]),
      t
    ) +
    inp("ec_num", "N° de l’acte", "text", v("num"), "Ex. 125", 'maxlength="30" required') +
    inp("ec_an", "Année de l’acte", "text", v("an"), "AAAA", 'inputmode="numeric" maxlength="4" required') +
    inp("ec_nom", t == "mariage" ? "Nom de l’époux" : "Nom", "text", v("nom"), "NOM", 'maxlength="80" required') +
    inp("ec_pre", t == "mariage" ? "Prénom(s) de l’époux" : "Prénom(s)", "text", v("pre"), "Prénom(s)", 'maxlength="80" required') +
    inp("ec_de", lab, "date", v("de"), "", 'max="' + ecToday() + '" required') +
    inp("ec_lieu", lieu, "text", v("lieu"), "", 'maxlength="120"') +
    sel(
      "ec_mode",
      "Mode d’inscription",
      [
        ["ordinaire", "Ordinaire"],
        ["jugement_suppletif", "Jugement supplétif"]
      ],
      v("mode") || "ordinaire"
    ) +
    inp("ec_dd", "Date de la déclaration", "date", v("dd"), "", 'max="' + ecToday() + '"') +
    inp("ec_decl", "Déclarant", "text", v("decl"), "Nom et prénom(s)", 'maxlength="120"');
  if (v("mode") == "jugement_suppletif")
    b +=
      inp("ec_jur", "Juridiction (jugement supplétif)", "text", v("jur"), "Ex. Tribunal d’instance de Thiès", 'maxlength="120" required') +
      inp("ec_jn", "N° du jugement", "text", v("jn"), "", 'maxlength="60" required') +
      inp("ec_jd", "Date du jugement", "date", v("jd"), "", 'max="' + ecToday() + '" required');
  if (t == "naissance")
    b += sel(
      "ec_sexe",
      "Sexe",
      [
        ["", "—"],
        ["M", "Masculin"],
        ["F", "Féminin"]
      ],
      v("sexe")
    );
  else
    b +=
      inp("ec_dn", t == "mariage" ? "Date de naissance de l’époux" : "Date de naissance", "date", v("dn"), "", 'max="' + ecToday() + '"') +
      inp("ec_ln", t == "mariage" ? "Lieu de naissance de l’époux" : "Lieu de naissance", "text", v("ln"), "", 'maxlength="120"') +
      inp("ec_prof", "Profession", "text", v("prof"), "", 'maxlength="120"');
  b +=
    inp("ec_pere", t == "mariage" ? "Père de l’époux" : "Père", "text", v("pere"), "Nom et prénom(s)", 'maxlength="120"') +
    inp("ec_mere", t == "mariage" ? "Mère de l’époux" : "Mère", "text", v("mere"), "Nom et prénom(s)", 'maxlength="120"');
  if (t == "mariage")
    b +=
      inp("ec_cn", "Nom de l’épouse", "text", v("cn"), "NOM", 'maxlength="80" required') +
      inp("ec_cp", "Prénom(s) de l’épouse", "text", v("cp"), "Prénom(s)", 'maxlength="80" required') +
      inp("ec_cdn", "Date de naissance de l’épouse", "date", v("cdn"), "", 'max="' + ecToday() + '"') +
      inp("ec_cpere", "Père de l’épouse", "text", v("cpere"), "Nom et prénom(s)", 'maxlength="120"') +
      inp("ec_cmere", "Mère de l’épouse", "text", v("cmere"), "Nom et prénom(s)", 'maxlength="120"');
  if (t == "deces")
    b +=
      inp("ec_cn", "Nom du conjoint (si marié)", "text", v("cn"), "", 'maxlength="80"') +
      inp("ec_cp", "Prénom(s) du conjoint", "text", v("cp"), "", 'maxlength="80"');
  b +=
    inp("ec_off", "Officier de l’état civil", "text", v("off"), "Nom et prénom(s)", 'maxlength="120"') +
    ta("ec_obs", "Mentions marginales / observations", v("obs"));
  return pn(
    ed ? "Modifier l’acte" : "Enregistrer un nouvel acte",
    "doc",
    frm(b) +
      `<p><button class="bt" data-m="ecsave">${ed ? "Enregistrer les modifications" : "Enregistrer l’acte"}</button>${ed ? ' <button class="bo" data-m="eccancel">Annuler</button>' : ""}</p>` +
      emp(
        "Les actes déjà enregistrés ne peuvent pas être supprimés. Un numéro d’acte est unique par commune, type d’acte et année. Un acte signé n’est plus modifiable : il se rectifie par jugement."
      ) +
      ecPendBox()
  );
};
/* ---------- Registre ---------- */
const ecRectBox = () => {
  const a = D().actes_ec.find(x => x.id == EC.rect);
  if (!a) return "";
  const r = k => EC.rd[k] || "";
  return pn(
    "Rectifier l’acte n° " + a.numero_acte + "/" + a.annee_acte + " (jugement)",
    "doc",
    frm(
      inp("ec_rj", "Juridiction", "text", r("ec_rj"), "Ex. Tribunal d’instance de Thiès", 'maxlength="120" required') +
        inp("ec_rn", "N° du jugement", "text", r("ec_rn"), "", 'maxlength="60" required') +
        inp("ec_rd", "Date du jugement", "date", r("ec_rd"), "", 'max="' + ecToday() + '" required') +
        fl("ec_rm", "Motif de la rectification", `<textarea id="ec_rm" rows="3" maxlength="1000" required>${ecE(r("ec_rm"))}</textarea>`)
    ) +
      `<p><button class="bt" data-m="ecrectgo" data-id="${ecE(a.id)}">Enregistrer la rectification</button> <button class="bo" data-m="ecrectx">Annuler</button></p>` +
      emp("La rectification s’ajoute en mention marginale ; l’acte d’origine n’est jamais effacé. Connexion requise.")
  );
};
const ecList = () => {
  const L = D().actes_ec,
    q = ecNZ(EC.q),
    V = L.filter(
      a =>
        (EC.ft == "all" || a.type_acte == EC.ft) &&
        (!q || ecNZ([a.nom, a.prenom, a.numero_acte, a.annee_acte, a.pere_nom, a.mere_nom].join(" ")).includes(q))
    );
  return (
    `<div class="tabs">${[["all", "Tous (" + L.length + ")"]]
      .concat(Object.keys(ECT).map(k => [k, ECT[k] + " (" + L.filter(a => a.type_acte == k).length + ")"]))
      .map(t => `<button class="tb2${EC.ft == t[0] ? " on" : ""}" data-m="ecft" data-v="${t[0]}">${ecE(t[1])}</button>`)
      .join("")}</div>` +
    ecRectBox() +
    pn(
      "Registre d’état civil",
      "file",
      ecPendBox() +
        (["maire", "adjoint", "etat_civil"].includes(S.pr)
          ? `<div class="ec-q"><label for="ec_xa">Année à exporter</label><input id="ec_xa" type="text" inputmode="numeric" maxlength="4" value="${ecE(EC.xa || new Date().getFullYear())}"> <button class="bo" data-m="ecexp">Exporter pour l’ANEC (CSV + JSON)</button></div>`
          : "") +
        `<div class="ec-q"><label for="ec_q">Rechercher (nom, prénom, n° d’acte, parents)</label><input id="ec_q" type="search" value="${ecE(EC.q)}" maxlength="80"></div>` +
        (V.map(a => {
          const par = [a.pere_nom && "Père : " + a.pere_nom, a.mere_nom && "Mère : " + a.mere_nom].filter(Boolean).join(" · "),
            ev = { naissance: "Né(e) le ", mariage: "Marié(e) le ", deces: "Décédé(e) le " }[a.type_acte];
          const sg = ecSigned(a),
            ms = ecMentions(a.id);
          return rw(
            `<div><b>${ecE(ecFull(a))}</b>${a.type_acte == "mariage" && a.conjoint_nom ? " et <b>" + ecE((a.conjoint_prenom || "") + " " + a.conjoint_nom.toUpperCase()) + "</b>" : ""}<div class="mut">${ecE(ECT[a.type_acte])} · Acte n° ${ecE(a.numero_acte)}/${ecE(a.annee_acte)}</div><div class="mut">${ev}${ecE(ecD(a.date_evenement))}${a.lieu_evenement ? " à " + ecE(a.lieu_evenement) : ""}${par ? " · " + ecE(par) : ""}</div>${a.mode_inscription == "jugement_suppletif" ? `<div class="mut">Jugement supplétif n° ${ecE(a.jugement_numero)} du ${ecE(ecD(a.jugement_date))} (${ecE(a.juridiction)})</div>` : ""}${a.identifiant_national ? `<div class="mut">Identifiant national : ${ecE(a.identifiant_national)}</div>` : ""}${ms.map(m => `<div class="mut">Mention marginale : ${ecE(ecMen(m))}</div>`).join("")}</div>`,
            `<span class="ec-act">${sg ? st2("Signé le " + ecD(a.signe_le), "ok") : st2("Non signé", "")}${
              sg
                ? `<button class="bo" data-m="ecrect" data-id="${ecE(a.id)}">Rectifier (jugement)</button>`
                : `<button class="bo" data-m="ecedit" data-id="${ecE(a.id)}">Modifier</button><button class="bt" data-m="ecsign" data-id="${ecE(a.id)}">Signer</button>`
            }</span>`
          );
        }).join("") || emp("Aucun acte pour ce filtre."))
    )
  );
};
/* ---------- Copies demandées ---------- */
const ecPickBox = () => {
  const d = D().ec_dem.find(x => x.id == EC.pick);
  if (!d) return "";
  const k = ecKind(d),
    cand = ecMatch(d),
    ids = new Set(cand.map(a => a.id)),
    L = D()
      .actes_ec.filter(a => !k || a.type_acte == k)
      .sort((a, b) => (ids.has(b.id) ? 1 : 0) - (ids.has(a.id) ? 1 : 0));
  return pn(
    "Choisir l’acte du registre",
    "search",
    `<p class="mut">Demande ${ecE(d.numero)} · ${ecE(d.nom || "")}. ${cand.length ? "Plusieurs actes correspondent : choisissez le bon." : "Aucun acte correspondant n’a été trouvé automatiquement : sélectionnez-le dans le registre."}</p>` +
      (L.length
        ? `<label for="ec_pick">Acte du registre</label><select id="ec_pick">${L.map(a => `<option value="${ecE(a.id)}">${ecE(ecFull(a) + " — acte n° " + a.numero_acte + "/" + a.annee_acte + (ids.has(a.id) ? " (correspond)" : ""))}</option>`).join("")}</select><p><button class="bt" data-m="ecpickgo" data-id="${ecE(d.id)}">Générer la copie</button> <button class="bo" data-m="ecpickx">Annuler</button></p>`
        : emp("Le registre ne contient encore aucun acte de ce type : enregistrez-le d’abord.") +
          '<p><button class="bo" data-m="ecpickx">Fermer</button></p>')
  );
};
const ecCopies = () => {
  const all = D().ec_dem.filter(d => ecKind(d)),
    V = all.filter(d => (EC.cf == "all" ? true : d.statut == "traitee"));
  return (
    `<div class="tabs">${[
      ["val", "Validées (" + all.filter(d => d.statut == "traitee").length + ")"],
      ["all", "Toutes (" + all.length + ")"]
    ]
      .map(t => `<button class="tb2${(EC.cf || "val") == t[0] ? " on" : ""}" data-m="eccf" data-v="${t[0]}">${ecE(t[1])}</button>`)
      .join("")}</div>` +
    ecPickBox() +
    pn(
      "Copies d’actes demandées",
      "doc",
      V.map(d => {
        const cp = ecCopy(d.id),
          ok = d.statut == "traitee",
          m = ecMatch(d);
        return rw(
          `<div><b>${ecE(d.objet || "Copie d’acte")}</b><div class="mut">${ecE(d.nom || "")} · N° ${ecE(d.numero)} · déposée le ${ecE(ecD(d.created_at))}</div>${cp ? `<div class="mut">Copie n° ${ecE(cp.reference)}</div>` : ok ? `<div class="mut">${m.length == 1 ? "Acte trouvé dans le registre : " + ecE(ecFull(m[0])) : m.length > 1 ? m.length + " actes possibles dans le registre" : "Acte à sélectionner dans le registre"}</div>` : ""}</div>`,
          `<span class="ec-act">${st2(ECS[d.statut] || d.statut, ok ? "ok" : "")}${
            ok
              ? `<button class="bt" data-m="ecgen" data-id="${ecE(d.id)}">${cp ? "Réimprimer la copie (PDF)" : "Générer la copie (PDF)"}</button>`
              : `<button class="bo" disabled>Disponible après validation</button>`
          }</span>`
        );
      }).join("") || emp("Aucune demande de copie d’acte pour ce filtre.")
    )
  );
};
const registre = () => {
  const t = EC.tab,
    n = D().ec_dem.filter(d => ecKind(d) && d.statut == "traitee" && !ecCopy(d.id)).length;
  return (
    `<div class="tabs">${[
      ["reg", "Registre"],
      ["new", EC.edit ? "Modification" : "Nouvel acte"],
      ["cop", "Copies demandées" + (n ? " (" + n + ")" : "")]
    ]
      .map(x => `<button class="tb2${t == x[0] ? " on" : ""}" data-m="ectab" data-v="${x[0]}">${ecE(x[1])}</button>`)
      .join("")}</div>` + (t == "new" ? ecForm() : t == "cop" ? ecCopies() : ecList())
  );
};
/* ---------- Document imprimable ---------- */
const ecRows = (a, ms) => {
  const r = [["N° de l’acte", a.numero_acte + " / " + a.annee_acte]];
  if (a.type_acte == "naissance") {
    r.push(
      ["Nom", (a.nom || "").toUpperCase()],
      ["Prénom(s)", a.prenom],
      ["Sexe", a.sexe == "M" ? "Masculin" : a.sexe == "F" ? "Féminin" : "—"],
      ["Né(e) le", ecD(a.date_evenement)],
      ["À", a.lieu_evenement || "—"],
      ["Père", a.pere_nom || "—"],
      ["Mère", a.mere_nom || "—"]
    );
  } else if (a.type_acte == "mariage") {
    r.push(
      ["Date du mariage", ecD(a.date_evenement)],
      ["Lieu du mariage", a.lieu_evenement || "—"],
      ["Époux", ecFull(a)],
      ["Né le", a.date_naissance ? ecD(a.date_naissance) + (a.lieu_naissance ? " à " + a.lieu_naissance : "") : "—"],
      ["Père de l’époux", a.pere_nom || "—"],
      ["Mère de l’époux", a.mere_nom || "—"],
      ["Épouse", (a.conjoint_prenom || "") + " " + (a.conjoint_nom || "").toUpperCase()],
      ["Née le", a.conjoint_date_naissance ? ecD(a.conjoint_date_naissance) : "—"],
      ["Père de l’épouse", a.conjoint_pere_nom || "—"],
      ["Mère de l’épouse", a.conjoint_mere_nom || "—"]
    );
  } else {
    r.push(
      ["Nom", (a.nom || "").toUpperCase()],
      ["Prénom(s)", a.prenom],
      ["Décédé(e) le", ecD(a.date_evenement)],
      ["À", a.lieu_evenement || "—"],
      ["Né(e) le", a.date_naissance ? ecD(a.date_naissance) + (a.lieu_naissance ? " à " + a.lieu_naissance : "") : "—"],
      ["Profession", a.profession || "—"],
      ["Père", a.pere_nom || "—"],
      ["Mère", a.mere_nom || "—"]
    );
    if (a.conjoint_nom) r.push(["Conjoint(e)", (a.conjoint_prenom || "") + " " + a.conjoint_nom.toUpperCase()]);
  }
  if (a.mode_inscription == "jugement_suppletif")
    r.push([
      "Inscription",
      "Jugement supplétif n° " + (a.jugement_numero || "—") + " du " + ecD(a.jugement_date) + " (" + (a.juridiction || "—") + ")"
    ]);
  if (a.date_declaration) r.push(["Déclaré le", ecD(a.date_declaration) + (a.declarant ? " par " + a.declarant : "")]);
  if (a.observations) r.push(["Observations", a.observations]);
  (ms || []).forEach(m => r.push(["Mention marginale", ecMen(m)]));
  return r;
};
const ecDoc = (a, ref, dem) => {
  const bl = typeof url == "function" && S.ind && S.ind.blason ? url("blason") : "",
    com = S.co || "",
    qr = (() => {
      try {
        return window.qrSvg(location.origin + "/verifier.html?ref=" + encodeURIComponent(ref), {
          size: 130,
          label: "QR Code de vérification de la copie"
        });
      } catch (e) {
        return "";
      }
    })(),
    now = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  return (
    `<article class="ecd" aria-label="Copie d’acte"><header class="ecd-h">${bl ? `<img class="ecd-bl" src="${ecE(bl)}" alt="Blason de la commune de ${ecE(com)}">` : `<span class="ecd-bl ecd-sh">${ic("shield", 64)}</span>`}<div><b>MAIRIE DE ${ecE(com.toUpperCase())}</b><span>Service de l’état civil</span></div></header>` +
    `<p class="ecd-s">Acte signé le ${ecE(ecD(a.signe_le))}${a.signature_reprise ? " (signature reprise du registre)" : ""}</p><h1 class="ecd-t">Copie d’acte de ${ecE(ECT[a.type_acte].toLowerCase())}</h1><p class="ecd-s">Registre des actes de ${ecE(ECT[a.type_acte].toLowerCase())} · Année ${ecE(a.annee_acte)}</p>` +
    `<dl class="ecd-d">${ecRows(a, ecMentions(a.id))
      .map(x => `<dt>${ecE(x[0])}</dt><dd>${ecE(x[1])}</dd>`)
      .join("")}</dl>` +
    `<footer class="ecd-f"><div class="ecd-g"><p>Délivrée à ${ecE(com)}, le ${ecE(now)}${dem && dem.nom ? "<br>Demandeur : " + ecE(dem.nom) : ""}${dem && dem.numero ? "<br>Dossier n° " + ecE(dem.numero) : ""}</p><p class="ecd-o">L’officier de l’état civil</p><p class="ecd-sg"></p></div>` +
    `<div class="ecd-q">${qr}<p>Vérifier la référence du dossier.<br><b>${ecE(ref)}</b></p></div></footer>` +
    `<p class="ecd-n">Cette copie n’est officielle qu’une fois revêtue du cachet de l’officier de l’état civil. Authenticité vérifiable en ligne sur ${ecE(location.origin)}/verifier.html avec la référence ci-dessus.</p></article>`
  );
};
const ecPrint = (a, ref, dem) => {
  const p = $("#prt");
  if (!p) throw new Error("Zone d’impression introuvable.");
  ecNeedSigned(a);
  p.innerHTML = ecDoc(a, ref, dem);
  const clear = () => {
    p.innerHTML = "";
    window.removeEventListener("afterprint", clear);
  };
  window.addEventListener("afterprint", clear);
  const imgs = Array.from(p.querySelectorAll("img")),
    wait = imgs.map(
      i =>
        new Promise(ok => {
          if (i.complete) return ok();
          i.addEventListener("load", ok);
          i.addEventListener("error", ok);
        })
    );
  Promise.race([Promise.all(wait), new Promise(ok => setTimeout(ok, 3000))]).then(() => {
    setTimeout(() => window.print(), 100);
  });
};
/* ---------- Enregistrement ---------- */
const ecPayload = () => {
  const t = ecv("type") || "naissance",
    nn = x => (x ? x : null),
    num = ecv("num"),
    an = ecv("an"),
    de = ecv("de"),
    nom = ecv("nom"),
    pre = ecv("pre");
  if (!/^[A-Za-z0-9/. -]{1,30}$/.test(num)) throw new Error("N° d’acte invalide (lettres, chiffres, / . - uniquement).");
  if (!(/^\d{4}$/.test(an) && +an >= 1800 && +an <= new Date().getFullYear() + 1)) throw new Error("Année de l’acte invalide.");
  if (nom.length < 2 || pre.length < 2) throw new Error("Nom et prénom(s) obligatoires.");
  if (!de) throw new Error("Date de l’évènement obligatoire.");
  if (de > ecToday()) throw new Error("La date de l’évènement ne peut pas être dans le futur.");
  const mode = ecv("mode") == "jugement_suppletif" ? "jugement_suppletif" : "ordinaire",
    jur = ecv("jur"),
    jn = ecv("jn"),
    jd = ecv("jd"),
    dd = ecv("dd");
  if (mode == "jugement_suppletif") {
    if (jur.length < 2 || !jn || !jd) throw new Error("Jugement supplétif : juridiction, n° et date du jugement obligatoires.");
    if (jd > ecToday()) throw new Error("La date du jugement ne peut pas être dans le futur.");
  }
  if (dd && dd > ecToday()) throw new Error("La date de déclaration ne peut pas être dans le futur.");
  if (t == "mariage" && (ecv("cn").length < 2 || ecv("cp").length < 2)) throw new Error("Nom et prénom(s) de l’épouse obligatoires.");
  return {
    type_acte: t,
    numero_acte: num,
    annee_acte: +an,
    date_evenement: de,
    lieu_evenement: nn(ecv("lieu")),
    nom,
    prenom: pre,
    sexe: t == "naissance" ? nn(ecv("sexe")) : null,
    date_naissance: t == "naissance" ? null : nn(ecv("dn")),
    lieu_naissance: t == "naissance" ? null : nn(ecv("ln")),
    profession: t == "naissance" ? null : nn(ecv("prof")),
    pere_nom: nn(ecv("pere")),
    mere_nom: nn(ecv("mere")),
    conjoint_nom: t == "naissance" ? null : nn(ecv("cn")),
    conjoint_prenom: t == "naissance" ? null : nn(ecv("cp")),
    conjoint_date_naissance: t == "mariage" ? nn(ecv("cdn")) : null,
    conjoint_pere_nom: t == "mariage" ? nn(ecv("cpere")) : null,
    conjoint_mere_nom: t == "mariage" ? nn(ecv("cmere")) : null,
    officier_etat_civil: nn(ecv("off")),
    observations: nn(ecv("obs")),
    mode_inscription: mode,
    date_declaration: nn(dd),
    declarant: nn(ecv("decl")),
    juridiction: mode == "jugement_suppletif" ? jur : null,
    jugement_numero: mode == "jugement_suppletif" ? jn : null,
    jugement_date: mode == "jugement_suppletif" ? jd : null
  };
};
const ecDone = async (m, keys) => {
  await load(keys);
  S.err = m;
  render();
  window.scrollTo(0, 0);
};
SP.administration.subs.splice(
  Math.max(
    0,
    SP.administration.subs.findIndex(x => x[0] == "civil")
  ) + 1,
  0,
  ["registre", "Registre d’état civil"]
);
RP.registre = ["maire", "adjoint", "secretariat", "agent", "etat_civil"];
SPL.registre = "Registre d’état civil";
SUB.registre = registre;
document.addEventListener("click", async e => {
  const t = e.target && e.target.closest && e.target.closest("[data-m^=ec]");
  if (!t || S.sa) return;
  const m = t.dataset.m;
  if (!/^ec(tab|ft|cf|save|edit|cancel|gen|pickgo|pickx|sign|rect|rectgo|rectx|exp)$/.test(m)) return;
  S.err = "";
  try {
    if (m == "ectab") {
      if (EC.tab == "new") ecCap();
      EC.tab = t.dataset.v;
      if (EC.tab != "new" && EC.edit) {
        EC.edit = null;
        EC.draft = null;
      }
      render();
    } else if (m == "ecft") {
      EC.ft = t.dataset.v || "all";
      render();
    } else if (m == "eccf") {
      EC.cf = t.dataset.v || "val";
      render();
    } else if (m == "ecedit") {
      const a = D().actes_ec.find(x => x.id == t.dataset.id);
      if (!a) return;
      if (ecSigned(a)) throw new Error("Acte signé : modification impossible. Utilisez « Rectifier (jugement) ».");
      EC.edit = a.id;
      EC.draft = ecFromRow(a);
      EC.tab = "new";
      render();
      window.scrollTo(0, 0);
    } else if (m == "eccancel") {
      EC.edit = null;
      EC.draft = null;
      EC.tab = "reg";
      render();
    } else if (m == "ecsave") {
      const p = ecPayload(),
        ed = EC.edit;
      if (ed) {
        ecOnly("Modification");
        const r = await sb.from("actes_etat_civil").update(p).eq("id", ed).eq("commune_id", S.cid);
        if (r.error) throw new Error(r.error.code == "23505" ? ecDup(r.error) : "Enregistrement refusé : " + r.error.message);
      } else {
        const id = typeof crypto != "undefined" && crypto.randomUUID ? crypto.randomUUID() : undefined,
          row = Object.assign({ commune_id: S.cid }, id ? { id } : {}, p);
        let r = { error: { message: "hors ligne" }, status: 0 };
        if (navigator.onLine !== false) {
          try {
            r = await sb.from("actes_etat_civil").insert(row);
          } catch (x) {
            r = { error: { message: String((x && x.message) || x) }, status: 0 };
          }
        }
        if (r.error && ecNet(r)) {
          if (typeof queueAction != "function") throw new Error("Hors ligne : file d’attente indisponible, réessayez avec le réseau.");
          await queueAction({ table: "actes_etat_civil", op: "insert", data: row, autoId: true });
          EC.pend = await offlineQueue.info();
          EC.draft = null;
          EC.tab = "reg";
          S.err =
            "Hors ligne : acte mis en file d’attente (" +
            EC.pend.pending +
            " en attente). Il sera envoyé automatiquement au retour du réseau.";
          render();
          window.scrollTo(0, 0);
          return;
        }
        if (r.error) throw new Error(r.error.code == "23505" ? ecDup(r.error) : "Enregistrement refusé : " + r.error.message);
      }
      EC.edit = null;
      EC.draft = null;
      EC.tab = "reg";
      await ecDone(ed ? "Acte modifié." : "Acte enregistré dans le registre.", ["actes_ec"]);
    } else if (m == "ecsign") {
      const a = D().actes_ec.find(x => x.id == t.dataset.id);
      if (!a) return;
      ecOnly("Signature");
      if (
        typeof confirm == "function" &&
        !confirm(
          "Signer l’acte n° " +
            a.numero_acte +
            "/" +
            a.annee_acte +
            " ? Il ne sera plus modifiable (seules les observations restent éditables) ; toute correction passera par un jugement."
        )
      )
        return;
      const r = await sb.rpc("signer_acte", { p_acte: a.id });
      if (r.error) throw new Error("Signature refusée : " + r.error.message);
      await ecDone("Acte signé.", ["actes_ec", "ec_mentions"]);
    } else if (m == "ecrect") {
      const a = D().actes_ec.find(x => x.id == t.dataset.id);
      if (!a || !ecSigned(a)) return;
      EC.rect = a.id;
      EC.rd = {};
      render();
      window.scrollTo(0, 0);
    } else if (m == "ecrectx") {
      EC.rect = null;
      EC.rd = {};
      render();
    } else if (m == "ecrectgo") {
      ecOnly("Rectification");
      const id = t.dataset.id,
        v = k => (($("#" + k) || {}).value || "").trim(),
        jur = v("ec_rj"),
        jn = v("ec_rn"),
        jd = v("ec_rd"),
        mo = v("ec_rm");
      EC.rd = { ec_rj: jur, ec_rn: jn, ec_rd: jd, ec_rm: mo };
      if (jur.length < 2 || !jn || !jd || mo.length < 3)
        throw new Error("Rectification : juridiction, n° et date du jugement, et motif obligatoires.");
      if (jd > ecToday()) throw new Error("La date du jugement ne peut pas être dans le futur.");
      const r = await sb.rpc("rectifier_acte", { p_acte: id, p_juridiction: jur, p_jugement_numero: jn, p_jugement_date: jd, p_motif: mo });
      if (r.error) throw new Error("Rectification refusée : " + r.error.message);
      EC.rect = null;
      EC.rd = {};
      await ecDone("Rectification enregistrée (mention marginale ajoutée).", ["actes_ec", "ec_mentions"]);
    } else if (m == "ecexp") {
      ecOnly("Export");
      const an = (($("#ec_xa") || {}).value || "").trim();
      if (!/^\d{4}$/.test(an)) throw new Error("Année d’export invalide.");
      EC.xa = an;
      const r = await sb.rpc("export_registre_ec", { p_annee: +an, p_type: EC.ft == "all" ? null : EC.ft });
      if (r.error) throw new Error("Export refusé : " + r.error.message);
      const d = r.data || {},
        acts = d.actes || [],
        base = "registre-ec-" + an + "-" + (d.type || "tous");
      if (!acts.length)
        throw new Error(
          "Aucun acte signé à exporter pour " +
            an +
            (d.nb_non_signes_exclus ? " (" + d.nb_non_signes_exclus + " non signé(s) exclu(s))." : ".")
        );
      ecDl(base + ".json", "application/json", JSON.stringify(d, null, 2));
      ecDl(base + ".csv", "text/csv", ecCsv(acts, Object.keys(acts[0])));
      S.err =
        acts.length +
        " acte(s) exporté(s) (CSV + JSON)" +
        (d.nb_non_signes_exclus ? ", " + d.nb_non_signes_exclus + " non signé(s) exclu(s)." : ".");
      render();
      window.scrollTo(0, 0);
    } else if (m == "ecgen") {
      const d = D().ec_dem.find(x => x.id == t.dataset.id);
      if (!d) return;
      if (d.statut != "traitee") throw new Error("La demande doit être validée avant de générer la copie.");
      const cp = ecCopy(d.id);
      if (cp) {
        const a = D().actes_ec.find(x => x.id == cp.acte_id);
        if (!a) throw new Error("Acte introuvable dans le registre.");
        ecPrint(a, cp.reference, d);
        return;
      }
      const c = ecMatch(d);
      if (c.length == 1) {
        ecNeedSigned(c[0]);
        const r = await sb.rpc("generer_copie_acte", { p_demande: d.id, p_acte: c[0].id });
        if (r.error) throw new Error("Génération refusée : " + r.error.message);
        await load(["ec_copies"]);
        render();
        ecPrint(c[0], r.data, d);
      } else {
        EC.pick = d.id;
        render();
      }
    } else if (m == "ecpickx") {
      EC.pick = null;
      render();
    } else if (m == "ecpickgo") {
      const d = D().ec_dem.find(x => x.id == t.dataset.id),
        id = (($("#ec_pick") || {}).value || "").trim(),
        a = D().actes_ec.find(x => x.id == id);
      if (!d || !a) throw new Error("Sélectionnez un acte du registre.");
      ecNeedSigned(a);
      const r = await sb.rpc("generer_copie_acte", { p_demande: d.id, p_acte: a.id });
      if (r.error) throw new Error("Génération refusée : " + r.error.message);
      EC.pick = null;
      await load(["ec_copies"]);
      render();
      ecPrint(a, r.data, d);
    }
  } catch (x) {
    S.err = x.message || "Erreur réseau.";
    render();
    window.scrollTo(0, 0);
  }
});
document.addEventListener("change", e => {
  const i = e.target;
  if (!i || S.sa) return;
  if (i.id == "ec_type" || i.id == "ec_mode") {
    ecCap();
    render();
  } else if (/^ec_r[jndm]$/.test(i.id)) {
    EC.rd[i.id] = i.value;
  } else if (i.id == "ec_xa") {
    EC.xa = i.value;
  } else if (i.id == "ec_q") {
    EC.q = i.value;
    render();
    const q = $("#ec_q");
    if (q) q.focus();
  }
});
/* Compteur hors ligne : mis à jour sans re-rendu (ne casse pas une saisie en cours) ; file vidée → rechargement du registre */
window.addEventListener("offline-queue", e => {
  const was = EC.pend.pending;
  EC.pend = Object.assign({ pending: 0, failed: 0, conflicts: 0 }, e.detail || {});
  const el = $("#ec_pend");
  if (el) el.textContent = ecPendTxt();
  if (was > 0 && EC.pend.pending == 0 && EC.tab == "reg" && !S.sa && S.cid) load(["actes_ec", "ec_mentions"]).then(() => render());
});
