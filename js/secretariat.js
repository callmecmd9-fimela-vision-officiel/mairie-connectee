/* ===== MODULE SECR\u00c9TARIAT MUNICIPAL ===== */
const isS = () => S.pr == "secretariat" && !S.sa,
  isG = () => isM() || isS();
const NZ = s =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const CCAT = [
  "Courrier administratif",
  "Courrier pr\u00e9fectoral",
  "Courrier minist\u00e9riel",
  "Correspondance institutionnelle",
  "Demande citoyenne",
  "Invitation officielle",
  "R\u00e9clamation",
  "Correspondance confidentielle",
  "Autres"
];
const CIS = {
    recu: "Re\u00e7u",
    a_traiter: "\u00c0 traiter",
    affecte: "Affect\u00e9",
    en_cours: "En cours",
    traite: "Trait\u00e9",
    archive: "Archiv\u00e9"
  },
  COS = {
    brouillon: "Brouillon",
    en_validation: "En validation",
    valide: "Valid\u00e9",
    signe: "Sign\u00e9",
    envoye: "Envoy\u00e9",
    archive: "Archiv\u00e9"
  };
const CSL = Object.assign(
  { a_repondre: "\u00c0 r\u00e9pondre", a_signer: "\u00c0 signer", urgent: "Urgent", suivi: "Suivi", classe: "Class\u00e9" },
  CIS,
  COS
);
const ANAT = [
  "Arr\u00eat\u00e9 municipal",
  "D\u00e9cision administrative",
  "Note de service",
  "Circulaire",
  "Instruction administrative",
  "D\u00e9cision de d\u00e9l\u00e9gation",
  "Convention",
  "Contrat",
  "Attestation",
  "Autre document officiel"
];
const AS = {
    brouillon: "Brouillon",
    preparation: "En pr\u00e9paration",
    validation: "En validation",
    signe: "Sign\u00e9",
    transmis: "Transmis",
    publie: "Publi\u00e9 / notifi\u00e9",
    archive: "Archiv\u00e9"
  },
  SES = { prevue: "Pr\u00e9vue", convoquee: "Convoqu\u00e9e", tenue: "Tenue", pv_redige: "PV r\u00e9dig\u00e9", archivee: "Archiv\u00e9e" },
  DOSS = { ouvert: "Ouvert", en_cours: "En cours", en_attente: "En attente", termine: "Termin\u00e9", archive: "Archiv\u00e9" };
const MODT = ["Remise en main propre", "Courrier postal", "E-mail", "Coursier", "Autre"];
Object.assign(IS, { affectee: "Affect\u00e9e" });
Object.assign(TC, {
  recu: "or",
  a_traiter: "or",
  affecte: "bl",
  traite: "ok",
  en_validation: "or",
  valide: "bl",
  signe: "ok",
  envoye: "ok",
  preparation: "bl",
  validation: "or",
  transmis: "bl",
  publie: "ok",
  prevue: "bl",
  convoquee: "bl",
  tenue: "ok",
  pv_redige: "ok",
  archivee: "",
  ouvert: "or",
  termine: "ok",
  affectee: "bl"
});
const MODELES = {
  "Lettre administrative":
    "Objet : \u2026\n\nMadame, Monsieur,\n\nJ\u2019ai l\u2019honneur de vous informer que \u2026\n\nVeuillez agr\u00e9er, Madame, Monsieur, l\u2019expression de mes salutations distingu\u00e9es.",
  "Lettre de r\u00e9ponse":
    "Objet : R\u00e9ponse \u00e0 votre courrier du \u2026\n\nMadame, Monsieur,\n\nJ\u2019accuse r\u00e9ception de votre courrier du \u2026 relatif \u00e0 \u2026 et j\u2019ai l\u2019honneur de vous r\u00e9pondre que \u2026\n\nVeuillez agr\u00e9er, Madame, Monsieur, l\u2019expression de mes salutations distingu\u00e9es.",
  "Lettre d\u2019invitation":
    "Objet : Invitation\n\nMadame, Monsieur,\n\nJ\u2019ai l\u2019honneur de vous inviter \u00e0 \u2026 qui se tiendra le \u2026 \u00e0 \u2026 au \u2026\n\nVotre pr\u00e9sence nous honorerait.\n\nVeuillez agr\u00e9er, Madame, Monsieur, l\u2019expression de mes salutations distingu\u00e9es.",
  "Lettre de transmission":
    "Objet : Transmission de documents\n\nMadame, Monsieur,\n\nJ\u2019ai l\u2019honneur de vous transmettre, ci-joint, \u2026 pour suite \u00e0 donner.\n\nVeuillez agr\u00e9er, Madame, Monsieur, l\u2019expression de mes salutations distingu\u00e9es.",
  "Lettre de demande d\u2019information":
    "Objet : Demande d\u2019informations\n\nMadame, Monsieur,\n\nDans le cadre de \u2026, je vous saurais gr\u00e9 de bien vouloir me communiquer les informations relatives \u00e0 \u2026\n\nVeuillez agr\u00e9er, Madame, Monsieur, l\u2019expression de mes salutations distingu\u00e9es.",
  "Lettre de convocation":
    "Objet : Convocation\n\nMadame, Monsieur,\n\nVous \u00eates convoqu\u00e9(e) \u00e0 \u2026 qui se tiendra le \u2026 \u00e0 \u2026 au \u2026\n\nOrdre du jour : \u2026\n\nVeuillez agr\u00e9er, Madame, Monsieur, l\u2019expression de mes salutations distingu\u00e9es.",
  "Lettre de remerciement":
    "Objet : Remerciements\n\nMadame, Monsieur,\n\nJe tiens \u00e0 vous exprimer, au nom de la commune, mes sinc\u00e8res remerciements pour \u2026\n\nVeuillez agr\u00e9er, Madame, Monsieur, l\u2019expression de mes salutations distingu\u00e9es.",
  "Correspondance institutionnelle":
    "Objet : \u2026\n\nMonsieur le Pr\u00e9fet / Monsieur le Sous-pr\u00e9fet,\n\nJ\u2019ai l\u2019honneur de porter \u00e0 votre connaissance que \u2026\n\nJe vous prie d\u2019agr\u00e9er l\u2019expression de ma haute consid\u00e9ration."
};
const late2 = r => r.date_limite && r.date_limite < T && !["traite", "archive", "envoye"].includes(r.statut),
  latd = x => x.echeance && x.echeance < T && !["termine", "archive"].includes(x.statut);
const MIMES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ],
  EXT = {
    "application/pdf": "pdf",
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/png": "png",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx"
  };
const upa = async (id, sub) => {
  const f = ($("#" + id) || {}).files && $("#" + id).files[0];
  if (!f) return null;
  let bl = f;
  if (f.type.startsWith("image/")) bl = await comp(f, 1800, 500000);
  if (!MIMES.includes(bl.type)) throw new Error("Format non accept\u00e9 (PDF, image, Word ou Excel).");
  if (bl.size > 10485760) throw new Error("Fichier trop volumineux (10 Mo maximum).");
  const p = S.cid + "/" + sub + "/" + crypto.randomUUID() + "." + EXT[bl.type],
    u = await sb.storage.from("archives").upload(p, bl, { contentType: bl.type });
  if (u.error) throw new Error("Envoi impossible : " + u.error.message);
  return { p, mime: bl.type, size: bl.size };
};
const fb = (p, l, d) => (p ? `<button class="tg" data-a="ofile" data-p="${esc(p)}"${d ? ` data-d="${d}"` : ""}>${l}</button>` : "");
const FILE = "image/*,application/pdf,.doc,.docx,.xls,.xlsx";
const fv = (m, k) => (S.fl && S.fl[m] && S.fl[m][k]) || "";
const ff = (m, rows, txt, dt) => {
  const f = (S.fl && S.fl[m]) || {};
  return rows.filter(
    r =>
      (!f.q || NZ(txt(r)).includes(NZ(f.q))) &&
      (!f.st || r.statut == f.st) &&
      (!f.sv || r.service == f.sv) &&
      (!f.d1 || (dt(r) || "") >= f.d1) &&
      (!f.d2 || (dt(r) || "") <= f.d2) &&
      (!f.an || String(r.annee) == f.an) &&
      (!f.cf || r.confidentialite == f.cf)
  );
};
const flt = (m, sts, ex) =>
  pn(
    "Rechercher et filtrer",
    "file",
    frm(
      inp("f_" + m + "_q", "Recherche", "text", fv(m, "q")) +
        (sts ? sel("f_" + m + "_st", "Statut", [["", "Tous"]].concat(sts), fv(m, "st")) : "") +
        sel("f_" + m + "_sv", "Service", [["", "Tous"]].concat(SVO), fv(m, "sv")) +
        inp("f_" + m + "_d1", "Du", "date", fv(m, "d1")) +
        inp("f_" + m + "_d2", "Au", "date", fv(m, "d2")) +
        (ex
          ? inp("f_" + m + "_an", "Ann\u00e9e", "number", fv(m, "an")) +
            sel(
              "f_" + m + "_cf",
              "Confidentialit\u00e9",
              [
                ["", "Toutes"],
                ["public", "Public"],
                ["interne", "Interne"],
                ["confidentiel", "Confidentiel"]
              ],
              fv(m, "cf")
            )
          : "") +
        `<button class="bo" data-a="flt" data-m="${m}">Filtrer</button><button class="tg" data-a="flr" data-m="${m}">R\u00e9initialiser</button>`
    )
  );
const rowv = (k, id, l, r) =>
  `<button class="rw" ${rowb} data-a="sopen" data-k="${k}" data-id="${id}"><div class="rl">${l}</div><div data-sty="display:grid;gap:4px;justify-items:end">${r}</div></button>`;
const closeb = k => `<button class="bo" data-a="sopen" data-k="${k}" data-id="">Fermer</button>`;
const histb = (tb, id) => `<button class="tg" data-a="hist" data-tb="${tb}" data-id="${id}">Historique</button>`;
const sstat = () => {
  const d = D(),
    ci = d.cr.filter(x => x.sens == "in"),
    co = d.cr.filter(x => x.sens == "out"),
    op = ["recu", "a_traiter", "affecte", "en_cours"],
    ym = T.slice(0, 7);
  return {
    ci,
    co,
    rec: ci.filter(x => x.date_reception == T).length,
    nt: ci.filter(x => op.includes(x.statut)),
    so: co.filter(x => x.statut == "envoye" && (x.date_envoi || "").slice(0, 7) == ym).length,
    va: co.filter(x => x.statut == "en_validation"),
    dc: d.dos.filter(x => ["ouvert", "en_cours", "en_attente"].includes(x.statut)),
    dr: d.dos.filter(latd),
    ru: d.ru.filter(r => r.jour >= T && r.statut != "annulee"),
    dl: d.del.filter(x => x.statut == "adoptee" && !x.transmise_le),
    tr: d.act.filter(x => x.statut == "signe" && !x.date_transmission),
    ni: d.ins.filter(x => !["terminee", "cloturee"].includes(x.statut))
  };
};
const urg = () => {
  const d = D(),
    s = sstat(),
    a = [];
  s.nt
    .filter(x => x.priorite == "urgente")
    .forEach(x => a.push({ i: "alert", t: `Courrier urgent non trait\u00e9 : ${x.reference} ${x.objet}`, v: "s_cin" }));
  s.ci.filter(late2).forEach(x => a.push({ i: "alert", t: `Courrier en retard : ${x.reference} ${x.objet}`, v: "s_cin" }));
  s.va.forEach(x => a.push({ i: "info", t: `Courrier en attente de validation : ${x.reference}`, v: "s_cout" }));
  d.act
    .filter(x => x.statut == "validation")
    .forEach(x => a.push({ i: "info", t: `Acte en attente de signature : ${x.reference}`, v: "s_actes" }));
  s.tr.forEach(x => a.push({ i: "cal", t: `Acte sign\u00e9 \u00e0 transmettre : ${x.reference}`, v: "s_actes" }));
  s.dr.forEach(x => a.push({ i: "alert", t: `Dossier en retard : ${x.numero} ${x.intitule}`, v: "s_dos" }));
  d.ins.filter(late).forEach(x => a.push({ i: "alert", t: `Instruction en retard : ${x.reference} ${x.objet}`, v: "s_instr" }));
  s.dl.forEach(x => a.push({ i: "cal", t: `D\u00e9lib\u00e9ration \u00e0 transmettre : n\u00b0${x.numero}`, v: "s_cm" }));
  return a;
};
const TBL = {
    marches: "March\u00e9",
    patrimoine: "Patrimoine",
    commissions: "Commission",
    decisions: "D\u00e9cision",
    courrier: "Courrier",
    actes: "Acte",
    dossiers: "Dossier",
    instructions: "Instruction",
    sessions_conseil: "Session du Conseil",
    deliberations: "D\u00e9lib\u00e9ration",
    documents: "Document",
    delegations: "D\u00e9l\u00e9gation",
    rapports: "Rapport",
    projets: "Projet"
  },
  ACL = { INSERT: "cr\u00e9\u00e9", UPDATE: "modifi\u00e9", DELETE: "supprim\u00e9" };
const sDash = () => {
  const d = D(),
    s = sstat(),
    U = urg(),
    R = rem(),
    ag = d.ru
      .filter(r => r.jour >= T && r.statut != "annulee")
      .sort((a, b) => (a.jour + a.heure).localeCompare(b.jour + b.heure))
      .slice(0, 5),
    docs = []
      .concat(
        d.act.slice(0, 5).map(x => ({ t: x.reference + " \u00b7 " + x.objet, d: x.created_at, p: x.pdf })),
        d.dc.slice(0, 5).map(x => ({ t: x.reference + " \u00b7 " + x.titre, d: x.created_at, p: x.chemin, i: x.id }))
      )
      .sort((a, b) => String(b.d).localeCompare(String(a.d)))
      .slice(0, 6),
    tiles = [
      ["s_cout", "R\u00e9diger un courrier", "mega", "k2"],
      ["s_cin", "Enregistrer un courrier re\u00e7u", "mail", "k1"],
      ["s_actes", "Pr\u00e9parer un acte", "doc", "k3"],
      ["s_reun", "Programmer une r\u00e9union", "cal", "k4"],
      ["s_dos", "Suivre un dossier", "file", "k5"],
      ["s_rap", "Consulter les statistiques", "chart", "k6"]
    ];
  return (
    `<div class="kp">${kp("k1", "mail", "Courriers re\u00e7us aujourd\u2019hui", s.rec)}${kp("k2", "mail", "Entrants non trait\u00e9s", s.nt.length)}${kp("k3", "mega", "Sortants envoy\u00e9s ce mois", s.so)}${kp("k4", "doc", "Courriers \u00e0 valider", s.va.length)}${kp("k5", "file", "Dossiers en cours", s.dc.length)}${kp("k6", "alert", "Dossiers en retard", s.dr.length)}${kp("k1", "cal", "R\u00e9unions programm\u00e9es", s.ru.length)}${kp("k2", "users", "D\u00e9lib\u00e9rations \u00e0 suivre", s.dl.length)}${kp("k3", "doc", "Documents \u00e0 transmettre", s.tr.length)}${kp("k4", "check", "Instructions non ex\u00e9cut\u00e9es", s.ni.length)}</div>` +
    pn(
      "Actions urgentes",
      "alert",
      U.slice(0, 8)
        .map(
          a =>
            `<div class="rw"><div class="ai">${ic(a.i, 24)}<b>${esc(a.t)}</b></div><button class="tg" data-a="gos" data-v="${a.v}">Voir</button></div>`
        )
        .join("") || emp("Aucune action urgente. Tout est \u00e0 jour.")
    ) +
    `<div class="g3">${pn(
      "Ma bo\u00eete de r\u00e9ception",
      "mail",
      s.ci
        .slice(0, 5)
        .map(x =>
          rw(
            `<b>${esc(x.objet)}</b><div class="mut" data-sty="font-size:13px">${fdd(x.date_reception)} \u00b7 ${esc(x.correspondant)}</div>`,
            bg2(CIS[x.statut] || x.statut, x.statut)
          )
        )
        .join("") || emp("Aucun courrier re\u00e7u."),
      `<button class="tg" data-sty="background:#fff" data-a="gos" data-v="s_cin">Voir tout</button>`
    )}${pn("Mon agenda", "cal", ag.map(r => rw(`<b>${esc(r.heure.slice(0, 5))} \u00b7 ${esc(r.objet)}</b><div class="mut" data-sty="font-size:13px">${fdd(r.jour)} \u00b7 ${esc(r.lieu || "")}</div>`, bg2(RSU[r.statut], r.statut))).join("") || emp("Aucune r\u00e9union programm\u00e9e."), `<button class="tg" data-sty="background:#fff" data-a="gos" data-v="s_reun">Voir tout</button>`)}${pn("Actes et documents r\u00e9cents", "doc", docs.map(x => rw(`<b>${esc(x.t)}</b><div class="mut" data-sty="font-size:13px">${fdt(x.d)}</div>`, fb(x.p, "Ouvrir", x.i))).join("") || emp("Aucun document enregistr\u00e9."))}</div>` +
    `<div class="g3">${pn("Actions rapides", "tools", `<div class="ecg" data-sty="margin:0">${tiles.map(x => `<button class="ec ${x[3]}" data-sty="min-height:90px" data-a="gos" data-v="${x[0]}">${ic(x[2], 26)}<b data-sty="font-size:15px">${x[1]}</b></button>`).join("")}</div>`)}${pn(
      "Historique des op\u00e9rations",
      "tools",
      d.op
        .slice(0, 8)
        .map(
          h =>
            `<div class="rw"><div class="rl" data-sty="font-size:14px">${esc(TBL[h.table_name] || h.table_name)} ${ACL[h.action] || ""} <span class="mut">${esc(((h.apres || h.avant || {}).reference || (h.apres || h.avant || {}).numero || (h.apres || h.avant || {}).titre || (h.apres || h.avant || {}).objet || "").toString().slice(0, 40))}</span></div><span class="mut" data-sty="font-size:12px;white-space:nowrap">${fdt(h.created_at)}</span></div>`
        )
        .join("") || emp("Aucune op\u00e9ration enregistr\u00e9e.")
    )}${pn("Alertes sur les \u00e9ch\u00e9ances", "bell", R.map(a => `<div class="rw"><div class="ai">${ic(a.i, 24)}<b>${esc(a.t)}</b></div></div>`).join("") || emp("Aucune \u00e9ch\u00e9ance proche."))}</div>`
  );
};
const cinPanel = o => {
  const G = isG();
  return pn(
    "Courrier " + esc(o.reference),
    "mail",
    `<p><b>${esc(o.objet)}</b> ${bg2(CIS[o.statut] || o.statut, o.statut)} ${bg2(o.priorite, o.priorite)}${o.confidentiel ? ' <span class="tg rd" data-sty="cursor:default">Confidentiel</span>' : ""}<br>Re\u00e7u le ${fdd(o.date_reception)} \u00b7 exp\u00e9diteur : ${esc(o.correspondant)}${o.organisme ? " (" + esc(o.organisme) + ")" : ""}<br>Cat\u00e9gorie : ${esc(o.categorie || "\u2014")} \u00b7 destinataire : ${esc(o.destinataire || "\u2014")} \u00b7 service : ${esc(o.service ? svn(o.service) : "\u00e0 d\u00e9finir")}${o.adjoint_id ? " \u00b7 adjoint : " + esc(an(o.adjoint_id)) : ""}<br>Date limite : ${fdd(o.date_limite)}</p>${o.observations ? `<p><b>Observations :</b> ${esc(o.observations)}</p>` : ""}<p>${(o.pieces || []).map((p, k) => fb(p, "Document " + (k + 1))).join(" ")}</p>` +
      (G && o.statut != "archive"
        ? `<div class="fr">${sel("cp_sv", "Affecter au service", [["", "\u2014"]].concat(SVO), o.service || "")}<button class="bo" data-a="cinaff">Affecter</button>${sel("cp_aj", "Transmettre \u00e0 un adjoint", [["", "\u2014"]].concat(aopts()), o.adjoint_id || "")}<button class="bo" data-a="cinadj">Transmettre</button></div><p data-sty="display:flex;gap:6px;flex-wrap:wrap"><button class="tg" data-a="cintrm">Transmettre au maire</button>${["a_traiter", "en_cours", "traite"].map(k => `<button class="tg" data-a="cinst" data-s="${k}">${CIS[k]}</button>`).join("")}<button class="tg" data-a="cinst" data-s="archive">Archiver</button></p><label for="cp_ob">Observations</label><textarea id="cp_ob" rows="2">${esc(o.observations || "")}</textarea><p data-sty="margin-top:8px"><button class="bo" data-a="cinobs">Enregistrer les observations</button></p>`
        : "") +
      `<p>${histb("courrier", o.id)} ${closeb("cin")}</p>${histBox(o.id)}`
  );
};
const cin = () => {
  const d = D(),
    G = isG(),
    R = ff(
      "cin",
      d.cr.filter(x => x.sens == "in"),
      r => [r.reference, r.objet, r.correspondant, r.organisme, r.categorie].join(" "),
      r => r.date_reception
    ),
    o = S.sel.cin && d.cr.find(x => x.id == S.sel.cin);
  return (
    (o ? cinPanel(o) : "") +
    (G
      ? pn(
          "Enregistrer un courrier re\u00e7u",
          "mail",
          frm(
            inp("c_ex", "Exp\u00e9diteur") +
              inp("c_or", "Organisme ou structure d\u2019origine") +
              inp("c_ob", "Objet") +
              sel("c_ca", "Cat\u00e9gorie", CCAT) +
              sel("c_pr", "Priorit\u00e9", PRI, "normale") +
              inp("c_dr", "Date de r\u00e9ception", "date", T) +
              inp("c_dl", "Date limite de traitement", "date") +
              sel("c_sv", "Service concern\u00e9", [["", "\u00c0 d\u00e9finir"]].concat(SVO)) +
              inp("c_de", "Destinataire", "text", "", "Ex. Le Maire") +
              fl("c_fi", "Num\u00e9riser ou joindre un document", `<input id="c_fi" type="file" accept="${FILE}" capture="environment">`)
          ) +
            `<label for="c_obs">Observations</label><textarea id="c_obs" rows="2"></textarea><p data-sty="margin-top:10px"><button class="bt" data-a="cinsave">Enregistrer le courrier</button></p>` +
            emp("Le num\u00e9ro d\u2019enregistrement est attribu\u00e9 automatiquement.")
        )
      : "") +
    flt("cin", Object.entries(CIS)) +
    pn(
      "Registre du courrier entrant",
      "mail",
      R.map(r =>
        rowv(
          "cin",
          r.id,
          `<b>${esc(r.reference || "")} \u00b7 ${esc(r.objet)}</b>${r.confidentiel ? ' <span class="tg rd" data-sty="cursor:default">Confidentiel</span>' : ""}<div class="mut" data-sty="font-size:13px">${fdd(r.date_reception)} \u00b7 ${esc(r.correspondant)}${r.organisme ? " (" + esc(r.organisme) + ")" : ""} \u00b7 ${esc(r.categorie || "")}${late2(r) ? ' <b data-sty="color:#B91C1C">\u00b7 EN RETARD</b>' : ""}</div>`,
          bg2(CIS[r.statut] || r.statut, r.statut) + bg2(r.priorite, r.priorite)
        )
      ).join("") || emp("Aucun courrier trouv\u00e9.")
    )
  );
};
const coPanel = o => {
  const G = isG(),
    M = isM(),
    st = o.statut;
  return pn(
    "Courrier " + esc(o.reference),
    "mega",
    `<p><b>${esc(o.objet)}</b> ${bg2(COS[st] || st, st)}<br>Destinataire : ${esc(o.correspondant)}${o.signe_le ? " \u00b7 sign\u00e9 le " + fdt(o.signe_le) : ""}${o.date_envoi ? " \u00b7 envoy\u00e9 le " + fdd(o.date_envoi) + " (" + esc(o.mode_transmission || "") + ")" : ""}</p><div data-sty="white-space:pre-wrap;margin-bottom:8px">${esc(o.contenu || "")}</div><p>${(o.pieces || []).map((p, k) => fb(p, "Pi\u00e8ce " + (k + 1))).join(" ")} ${fb(o.preuve_envoi, "Preuve d\u2019envoi")}</p>` +
      (G && st == "brouillon"
        ? `<p data-sty="display:flex;gap:6px;flex-wrap:wrap"><button class="tg" data-a="edit" data-e="cr" data-id="${o.id}">Modifier</button><button class="tg ok" data-a="costatut" data-s="en_validation">Soumettre pour validation</button><button class="tg rd" data-a="codel">Supprimer</button></p>`
        : "") +
      (st == "en_validation"
        ? M || S.pr == "adjoint"
          ? `<p><button class="bt" data-a="costatut" data-s="valide">Valider le courrier</button></p>`
          : emp("En attente de validation par le maire ou l\u2019adjoint.")
        : "") +
      (st == "valide"
        ? `<div class="fr">${fl("o_sg", "Copie sign\u00e9e (preuve de signature)", `<input id="o_sg" type="file" accept="${FILE}">`)}<button class="bo" data-a="coatt">Joindre la copie sign\u00e9e</button></div>${M ? `<p><button class="bt" data-a="costatut" data-s="signe">Marquer comme sign\u00e9</button></p>` : emp("La signature est r\u00e9serv\u00e9e au maire.")}`
        : "") +
      (G && st == "signe"
        ? `<div class="fr">${inp("o_dt", "Date d\u2019envoi", "date", T)}${sel("o_md", "Mode de transmission", MODT)}${fl("o_pv", "Preuve d\u2019envoi", `<input id="o_pv" type="file" accept="${FILE}">`)}<button class="bt" data-a="coenv">Enregistrer l\u2019envoi</button></div>`
        : "") +
      (G && st == "envoye" ? `<p><button class="tg" data-a="costatut" data-s="archive">Archiver une copie</button></p>` : "") +
      `<p><button class="bo" data-a="coprint">Imprimer la lettre</button> ${histb("courrier", o.id)} ${closeb("cout")}</p>${histBox(o.id)}`
  );
};
const cout = () => {
  const d = D(),
    G = isG(),
    e = S.ed && S.ed.e == "cr",
    R = ff(
      "cout",
      d.cr.filter(x => x.sens == "out"),
      r => [r.reference, r.objet, r.correspondant].join(" "),
      r => (r.created_at || "").slice(0, 10)
    ),
    o = S.sel.cout && d.cr.find(x => x.id == S.sel.cout);
  return (
    (o ? coPanel(o) : "") +
    (G
      ? pn(
          e ? "Modifier le courrier" : "Nouveau courrier sortant",
          "mega",
          frm(
            sel("o_mo", "Mod\u00e8le de lettre", [["", "Aucun mod\u00e8le"]].concat(Object.keys(MODELES)), ev("cr", "modele")) +
              inp("o_de", "Destinataire", "text", ev("cr", "correspondant")) +
              inp("o_ob", "Objet", "text", ev("cr", "objet")) +
              fl("o_fi", "Joindre un document", `<input id="o_fi" type="file" accept="${FILE}">`)
          ) +
            `<label for="o_ct">Contenu</label><textarea id="o_ct" rows="8">${esc(ev("cr", "contenu"))}</textarea><p data-sty="margin-top:10px"><button class="bt" data-a="cosave">Enregistrer le brouillon</button> ${e ? `<button class="bo" data-a="ecl">Annuler</button>` : ""}</p>` +
            emp("Le maire valide et signe : le secr\u00e9tariat pr\u00e9pare, suit et enregistre l\u2019envoi avec sa preuve.")
        )
      : "") +
    flt("cout", Object.entries(COS)) +
    pn(
      "Registre du courrier sortant",
      "mega",
      R.map(r =>
        rowv(
          "cout",
          r.id,
          `<b>${esc(r.reference || "")} \u00b7 ${esc(r.objet)}</b><div class="mut" data-sty="font-size:13px">\u00c0 : ${esc(r.correspondant)} \u00b7 ${fdd((r.created_at || "").slice(0, 10))}</div>`,
          bg2(COS[r.statut] || r.statut, r.statut)
        )
      ).join("") || emp("Aucun courrier sortant.")
    )
  );
};
const acPanel = o => {
  const G = isG(),
    M = isM(),
    st = o.statut;
  return pn(
    esc(o.reference) + " \u00b7 " + esc(o.nature),
    "doc",
    `<p><b>${esc(o.objet)}</b> ${bg2(AS[st], st)}<br>R\u00e9dig\u00e9 le ${fdd(o.date_redaction)} \u00b7 service : ${esc(o.service ? svn(o.service) : "\u2014")} \u00b7 autorit\u00e9 signataire : ${esc(o.signataire || "\u2014")}<br>${o.date_signature ? "Sign\u00e9 le " + fdd(o.date_signature) + " \u00b7 " : ""}${o.date_transmission ? "Transmis le " + fdd(o.date_transmission) : ""}</p><p>${fb(o.pdf, "Document PDF")} ${fb(o.preuve_signature, "Preuve de signature")} ${fb(o.preuve_transmission, "Preuve de transmission")}</p>${o.observations ? `<p><b>Observations :</b> ${esc(o.observations)}</p>` : ""}` +
      (G && (st == "brouillon" || st == "preparation")
        ? `<p data-sty="display:flex;gap:6px;flex-wrap:wrap">${st == "brouillon" ? `<button class="tg" data-a="acst" data-s="preparation">Passer en pr\u00e9paration</button>` : ""}<button class="tg ok" data-a="acst" data-s="validation">Soumettre \u00e0 validation</button>${st == "brouillon" ? `<button class="tg rd" data-a="acdel">Supprimer</button>` : ""}</p>`
        : "") +
      (st == "validation"
        ? `<div class="fr">${inp("a_ds", "Date de signature", "date", o.date_signature || T)}${inp("a_sg2", "Autorit\u00e9 signataire", "text", o.signataire || "")}${fl("a_ps", "Preuve de signature (acte sign\u00e9)", `<input id="a_ps" type="file" accept="${FILE}">`)}${M ? `<button class="bt" data-a="acsign">Enregistrer la signature</button>` : `<button class="bo" data-a="acpreuve">Joindre la preuve</button>`}</div>${M ? "" : emp("La signature est r\u00e9serv\u00e9e \u00e0 l\u2019autorit\u00e9 signataire (le maire).")}`
        : "") +
      (G && st == "signe"
        ? `<div class="fr">${inp("a_dt", "Date de transmission", "date", T)}${fl("a_pt", "Preuve de transmission", `<input id="a_pt" type="file" accept="${FILE}">`)}<button class="bt" data-a="actrans">Enregistrer la transmission</button></div><p><button class="tg" data-a="acst" data-s="publie">Publier / notifier</button> <button class="tg" data-a="acst" data-s="archive">Archiver</button></p>`
        : "") +
      (G && (st == "transmis" || st == "publie")
        ? `<p><button class="tg" data-a="acst" data-s="archive">Archiver</button>${st == "transmis" ? ` <button class="tg" data-a="acst" data-s="publie">Publier / notifier</button>` : ""}</p>`
        : "") +
      `<p>${histb("actes", o.id)} ${closeb("act")}</p>${histBox(o.id)}`
  );
};
const actes = () => {
  const d = D(),
    G = isG(),
    R = ff(
      "act",
      d.act,
      r => [r.reference, r.nature, r.objet].join(" "),
      r => r.date_redaction
    ),
    o = S.sel.act && d.act.find(x => x.id == S.sel.act);
  return (
    (o ? acPanel(o) : "") +
    (G
      ? pn(
          "Nouvel acte administratif",
          "doc",
          frm(
            sel("a_na", "Nature de l\u2019acte", ANAT) +
              inp("a_ob", "Objet") +
              inp("a_dr", "Date de r\u00e9daction", "date", T) +
              sel("a_sv", "Service concern\u00e9", [["", "\u2014"]].concat(SVO)) +
              inp("a_sg", "Autorit\u00e9 signataire", "text", "", "Ex. Le Maire") +
              fl("a_fi", "Document (PDF)", `<input id="a_fi" type="file" accept="${FILE}">`) +
              `<button class="bt" data-a="acsave">Enregistrer l\u2019acte</button>`
          ) +
            emp(
              "Un acte n\u2019est jamais consid\u00e9r\u00e9 comme sign\u00e9 sans preuve de signature enregistr\u00e9e. Apr\u00e8s signature, il n\u2019est plus modifiable."
            )
        )
      : "") +
    flt("act", Object.entries(AS)) +
    pn(
      "Registre des actes administratifs",
      "doc",
      R.map(r =>
        rowv(
          "act",
          r.id,
          `<b>${esc(r.reference || "")} \u00b7 ${esc(r.objet)}</b><div class="mut" data-sty="font-size:13px">${esc(r.nature)} \u00b7 ${fdd(r.date_redaction)}</div>`,
          bg2(AS[r.statut], r.statut)
        )
      ).join("") || emp("Aucun acte.")
    )
  );
};
const sePanel = o => {
  const d = D(),
    G = isG(),
    st = o.statut,
    cn = d.cn.filter(x => x.actif),
    pr = d.pr.filter(x => x.session_id == o.id),
    dl = d.del.filter(x => x.session_id == o.id);
  return pn(
    esc(o.numero) + " \u00b7 " + esc(o.type),
    "users",
    `<p>${fdd(o.jour)} \u00e0 ${esc(o.heure.slice(0, 5))} \u00b7 ${esc(o.lieu || "lieu non pr\u00e9cis\u00e9")} ${bg2(SES[st], st)}<br>${o.convocation_le ? "Convocations envoy\u00e9es le " + fdd(o.convocation_le) : "Convocations non envoy\u00e9es"}${o.transmission_le ? " \u00b7 transmis au repr\u00e9sentant de l\u2019\u00c9tat le " + fdd(o.transmission_le) : ""}</p><div data-sty="white-space:pre-wrap"><b>Ordre du jour :</b>\n${esc(o.ordre_du_jour || "\u2014")}</div><p>${(o.documents || []).map((p, k) => fb(p, "Document " + (k + 1))).join(" ")} ${fb(o.pv, "Proc\u00e8s-verbal")}</p>` +
      (G && st != "archivee"
        ? `<div class="fr">${inp("se_cv", "Date d\u2019envoi des convocations", "date", o.convocation_le || T)}<button class="bo" data-a="secv">Enregistrer les convocations</button>${fl("se_dc", "Document \u00e0 distribuer", `<input id="se_dc" type="file" accept="${FILE}">`)}<button class="bo" data-a="sedoc">Ajouter le document</button></div><h3 data-sty="font-size:16px">Pr\u00e9sences</h3><div data-sty="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:8px">${cn.map(c => `<span data-sty="display:flex;gap:6px;align-items:center"><input type="checkbox" id="pc_${c.id}" aria-label="${esc(c.prenom + " " + c.nom)}" data-sty="width:auto;min-height:0"${(pr.find(x => x.conseiller_id == c.id) || {}).present ? " checked" : ""}> ${esc(c.prenom + " " + c.nom)}</span>`).join("") || '<span class="mut">Ajoutez les conseillers dans l\u2019onglet Conseillers.</span>'}</div><button class="bo" data-a="sepres">Enregistrer les pr\u00e9sences</button><h3 data-sty="font-size:16px;margin-top:12px">D\u00e9lib\u00e9rations de la session</h3>${dl.map(x => `<div class="rw"><div class="rl"><b>n\u00b0${esc(x.numero)}</b> ${esc(x.objet)} ${bg2({ adoptee: "Adopt\u00e9e", projet: "Projet", rejetee: "Rejet\u00e9e" }[x.statut], x.statut == "adoptee" ? "ok" : "or")}${x.transmise_le ? ' <span class="mut">transmise le ' + fdd(x.transmise_le) + "</span>" : ""}</div><button class="tg" data-a="sedtr" data-id="${x.id}">Marquer transmise</button></div>`).join("") || emp("Aucune d\u00e9lib\u00e9ration enregistr\u00e9e.")}<div class="fr">${inp("sd_nu", "Num\u00e9ro", "text", "", o.numero)}${inp("sd_ob", "Objet")}${sel(
            "sd_st",
            "D\u00e9cision",
            [
              ["adoptee", "Adopt\u00e9e"],
              ["rejetee", "Rejet\u00e9e"],
              ["projet", "Projet"]
            ]
          )}<button class="bo" data-a="sedel">Enregistrer la d\u00e9lib\u00e9ration</button></div><div class="fr">${fl("se_pv", "Proc\u00e8s-verbal (PDF ou Word)", `<input id="se_pv" type="file" accept="${FILE}">`)}<button class="bo" data-a="sepv">Enregistrer le proc\u00e8s-verbal</button></div><div class="fr">${inp("se_tr", "Date de transmission au repr\u00e9sentant de l\u2019\u00c9tat", "date", o.transmission_le || "")}<button class="bo" data-a="setrans">Enregistrer la transmission</button></div><label for="se_oe">Observations du repr\u00e9sentant de l\u2019\u00c9tat</label><textarea id="se_oe" rows="2">${esc(o.observations_etat || "")}</textarea><label for="se_su">Suites \u00e0 donner</label><textarea id="se_su" rows="2">${esc(o.suites || "")}</textarea><p data-sty="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap"><button class="bo" data-a="sesuites">Enregistrer les observations et suites</button><button class="tg" data-a="sest" data-s="tenue">Session tenue</button><button class="tg" data-a="sest" data-s="archivee">Archiver la session</button></p>`
        : "") +
      `<p>${histb("sessions_conseil", o.id)} ${closeb("ses")}</p>${histBox(o.id)}`
  );
};
const sconseil = () => {
  const d = D(),
    G = isG(),
    e = S.ed && S.ed.e == "cn",
    o = S.sel.ses && d.se.find(x => x.id == S.sel.ses),
    tb = S.tab.cns || "ses";
  return (
    tabs("cns", [
      ["ses", "Sessions"],
      ["cn", "Conseillers"],
      ["dl", "D\u00e9lib\u00e9rations"]
    ]) +
    (tb == "ses"
      ? (o ? sePanel(o) : "") +
        (G
          ? pn(
              "Programmer une session",
              "users",
              frm(
                sel("se_ty", "Type de session", ["Session ordinaire", "Session extraordinaire"]) +
                  inp("se_jo", "Date", "date", T) +
                  inp("se_he", "Heure", "time", "09:00") +
                  inp("se_li", "Lieu")
              ) +
                `<label for="se_od">Ordre du jour</label><textarea id="se_od" rows="4"></textarea><p data-sty="margin-top:10px"><button class="bt" data-a="sesave">Programmer la session</button></p>`
            )
          : "") +
        pn(
          "Calendrier des sessions",
          "users",
          d.se
            .map(r =>
              rowv(
                "ses",
                r.id,
                `<b>${esc(r.numero || "")} \u00b7 ${esc(r.type)}</b><div class="mut" data-sty="font-size:13px">${fdd(r.jour)} ${esc(r.heure.slice(0, 5))} \u00b7 ${esc(r.lieu || "")}</div>`,
                bg2(SES[r.statut], r.statut)
              )
            )
            .join("") || emp("Aucune session.")
        )
      : tb == "cn"
        ? (G
            ? pn(
                e ? "Modifier le conseiller" : "Nouveau conseiller",
                "users",
                frm(
                  inp("k_pr", "Pr\u00e9nom", "text", ev("cn", "prenom")) +
                    inp("k_nm", "Nom", "text", ev("cn", "nom")) +
                    inp("k_fn", "Fonction", "text", ev("cn", "fonction")) +
                    inp("k_ct", "Contact", "text", ev("cn", "contact")) +
                    `<button class="bt" data-a="cnsave">Enregistrer</button>${e ? `<button class="bo" data-a="ecl">Annuler</button>` : ""}`
                )
              )
            : "") +
          pn(
            "Conseillers municipaux",
            "users",
            d.cn
              .map(c =>
                rw(
                  `<b>${esc(c.prenom + " " + c.nom)}</b> ${c.actif ? "" : '<span class="tg rd" data-sty="cursor:default">Inactif</span>'}<div class="mut" data-sty="font-size:13px">${esc(c.fonction || "")} ${esc(c.contact || "")}</div>`,
                  G
                    ? `<div data-sty="display:grid;gap:4px;justify-items:end"><button class="tg" data-a="edit" data-e="cn" data-id="${c.id}">Modifier</button><button class="tg" data-a="cnoff" data-id="${c.id}">${c.actif ? "D\u00e9sactiver" : "R\u00e9activer"}</button></div>`
                    : ""
                )
              )
              .join("") || emp("Aucun conseiller enregistr\u00e9.")
          )
        : V.conseil_body())
  );
};
const inS = o => {
  const G = isG();
  return pn(
    esc(o.reference || "") + " \u00b7 " + esc(o.objet),
    "check",
    `<p>${bg2(IS[o.statut], o.statut)} ${bg2(o.priorite, o.priorite)} ${late(o) ? '<b data-sty="color:#B91C1C">EN RETARD</b>' : ""}<br>Service : ${esc(o.service ? svn(o.service) : o.adjoint_id ? "Adjoint : " + an(o.adjoint_id) : "\u2014")} \u00b7 responsable : ${esc(o.responsable || "\u2014")} \u00b7 auteur : ${esc(o.auteur || "\u2014")}<br>Cr\u00e9\u00e9e le ${fdd((o.created_at || "").slice(0, 10))} \u00b7 limite ${fdd(o.date_limite)}</p>${o.description ? `<div data-sty="white-space:pre-wrap">${esc(o.description)}</div>` : ""}<p>${(o.pieces || []).map((p, k) => fb(p, "Pi\u00e8ce " + (k + 1))).join(" ")}</p>${o.reponse ? `<div class="okb"><b>R\u00e9ponse</b><br>${esc(o.reponse)}</div>` : ""}` +
      (G && o.statut != "cloturee"
        ? `<div class="fr">${sel("n_sv", "Service destinataire", [["", "\u2014"]].concat(SVO), o.service || "")}${inp("n_re", "Responsable", "text", o.responsable || "")}<button class="bo" data-a="sinaff">Affecter</button></div><p data-sty="display:flex;gap:6px;flex-wrap:wrap">${["prise_en_charge", "en_cours", "en_attente", "terminee"].map(k => `<button class="tg" data-a="sinst" data-s="${k}">${IS[k]}</button>`).join("")}<button class="tg" data-a="sinrel">Relancer</button></p><label for="n_ob">Observations</label><textarea id="n_ob" rows="2">${esc(o.observations || "")}</textarea><p data-sty="margin-top:8px"><button class="bo" data-a="sinobs">Enregistrer</button></p>`
        : "") +
      `<p>${histb("instructions", o.id)} ${closeb("ins")}</p>${histBox(o.id)}`
  );
};
const sInstr = () => {
  const d = D(),
    G = isG(),
    R = ff(
      "ins",
      d.ins,
      r => [r.reference, r.objet, r.responsable].join(" "),
      r => r.date_emission
    ),
    o = S.sel.ins && d.ins.find(x => x.id == S.sel.ins),
    nb = d.ins.filter(late).length;
  return (
    (o ? inS(o) : "") +
    (G
      ? pn(
          "Enregistrer une instruction ou une t\u00e2che",
          "check",
          frm(
            sel(
              "n_s2",
              "Service destinataire",
              SVO.filter(x => x[0] != "adjoint")
            )
          ) +
            frm(
              inp("n_r2", "Responsable") +
                inp("n_o2", "Objet") +
                inp("n_a2", "Auteur de l\u2019instruction", "text", "Le Maire") +
                sel("n_p2", "Priorit\u00e9", PRI, "normale") +
                inp("n_d2", "Date limite", "date") +
                fl("n_f2", "Pi\u00e8ce jointe", `<input id="n_f2" type="file" accept="${FILE}">`)
            ) +
            `<label for="n_t2">Description</label><textarea id="n_t2" rows="3"></textarea><p data-sty="margin-top:10px"><button class="bt" data-a="sinsave">Enregistrer</button></p>` +
            emp("Le secr\u00e9tariat enregistre et suit ; la cl\u00f4ture est r\u00e9serv\u00e9e au maire.")
        )
      : "") +
    `<p><button class="bo" data-a="gos" data-v="s_rap" data-r="instr_retard">Pr\u00e9parer le rapport de suivi au maire (${nb} en retard)</button></p>` +
    flt("ins", Object.entries(IS)) +
    pn(
      "Instructions et t\u00e2ches",
      "check",
      R.map(r =>
        rowv(
          "ins",
          r.id,
          `<b>${esc(r.reference || "")} \u00b7 ${esc(r.objet)}</b><div class="mut" data-sty="font-size:13px">${esc(r.service ? svn(r.service) : r.adjoint_id ? an(r.adjoint_id) : "\u2014")} \u00b7 limite ${fdd(r.date_limite)} ${late(r) ? '<b data-sty="color:#B91C1C">\u00b7 EN RETARD</b>' : ""}</div>`,
          bg2(IS[r.statut], r.statut) + bg2(r.priorite, r.priorite)
        )
      ).join("") || emp("Aucune instruction.")
    )
  );
};
const serv = () => {
  const d = D(),
    G = isG(),
    e = S.ed && S.ed.e == "sv";
  return (
    (G
      ? pn(
          e ? "Modifier le service" : "Nouveau service",
          "brief",
          frm(
            inp("v_no", "Nom du service", "text", ev("sv", "nom")) +
              sel(
                "v_co",
                "Type",
                [
                  ["secretariat", "Administration g\u00e9n\u00e9rale"],
                  ["finances", "Finances"],
                  ["rh", "Ressources humaines"],
                  ["etat_civil", "\u00c9tat civil"],
                  ["technique", "Services techniques"],
                  ["autre", "Autre service"]
                ],
                ev("sv", "code", "autre")
              ) +
              inp("v_re", "Responsable", "text", ev("sv", "responsable")) +
              inp("v_ef", "Agents affect\u00e9s", "number", ev("sv", "effectif", "")) +
              `<button class="bt" data-a="svsave">Enregistrer</button>${e ? `<button class="bo" data-a="ecl">Annuler</button>` : ""}`
          )
        )
      : "") +
    `<div class="g3">${
      d.sv
        .filter(x => x.actif)
        .map(x => {
          const cd = x.code,
            ci = d.cr.filter(c => c.service == cd && c.sens == "in"),
            ds = d.dos.filter(z => z.service == cd),
            is = d.ins.filter(z => z.service == cd);
          return pn(
            esc(x.nom),
            "brief",
            `<p class="mut">Responsable : ${esc(x.responsable || "non renseign\u00e9")} \u00b7 agents affect\u00e9s : ${esc(x.effectif == null ? "\u2014" : x.effectif)}</p><div class="rw"><span>Dossiers en cours</span><b>${ds.filter(z => ["ouvert", "en_cours"].includes(z.statut)).length}</b></div><div class="rw"><span>Dossiers en attente</span><b>${ds.filter(z => z.statut == "en_attente").length}</b></div><div class="rw"><span>T\u00e2ches en retard</span><b>${is.filter(late).length}</b></div><div class="rw"><span>Courriers affect\u00e9s non trait\u00e9s</span><b>${ci.filter(c => !["traite", "archive"].includes(c.statut)).length}</b></div><div class="mut" data-sty="font-size:13px">Derni\u00e8res activit\u00e9s : ${
              []
                .concat(
                  ci.slice(0, 2).map(c => c.reference),
                  ds.slice(0, 2).map(z => z.numero),
                  is.slice(0, 1).map(z => z.reference)
                )
                .filter(Boolean)
                .map(esc)
                .join(", ") || "aucune"
            }</div>${G ? `<p data-sty="margin-top:8px"><button class="tg" data-a="edit" data-e="sv" data-id="${x.id}">Modifier</button> <button class="tg rd" data-a="svdel" data-id="${x.id}">Retirer</button></p>` : ""}`
          );
        })
        .join("") || pn("Services", "brief", emp("Aucun service enregistr\u00e9."))
    }</div>`
  );
};
const doPanel = o => {
  const G = isG();
  return pn(
    esc(o.numero || "") + " \u00b7 " + esc(o.intitule),
    "file",
    `<p>${bg2(DOSS[o.statut], o.statut)} ${latd(o) ? '<b data-sty="color:#B91C1C">EN RETARD</b>' : ""}<br>Demandeur : ${esc(o.demandeur || "\u2014")} \u00b7 d\u00e9pos\u00e9 le ${fdd(o.date_depot)} \u00b7 \u00e9ch\u00e9ance ${fdd(o.echeance)}<br>Cat\u00e9gorie : ${esc(o.categorie || "\u2014")} \u00b7 service : ${esc(o.service ? svn(o.service) : "\u2014")} \u00b7 responsable : ${esc(o.responsable || "\u2014")}</p>${o.objet ? `<p>${esc(o.objet)}</p>` : ""}<p>${(o.documents || []).map((p, k) => fb(p, "Document " + (k + 1))).join(" ")}</p>` +
      (G && o.statut != "archive"
        ? `<p data-sty="display:flex;gap:6px;flex-wrap:wrap">${["en_cours", "en_attente", "termine"].map(k => `<button class="tg" data-a="dost" data-s="${k}">${DOSS[k]}</button>`).join("")}<button class="tg" data-a="dost" data-s="archive">Archiver</button></p><div class="fr">${fl("d_f2", "Ajouter un document", `<input id="d_f2" type="file" accept="${FILE}">`)}<button class="bo" data-a="dosdoc">Joindre</button></div><label for="d_o2">Observations</label><textarea id="d_o2" rows="2">${esc(o.observations || "")}</textarea><p data-sty="margin-top:8px"><button class="bo" data-a="dosobs">Enregistrer</button></p>`
        : "") +
      `<p>${histb("dossiers", o.id)} ${closeb("dos")}</p>${histBox(o.id)}`
  );
};
const dossiers = () => {
  const d = D(),
    G = isG(),
    R = ff(
      "dos",
      d.dos,
      r => [r.numero, r.intitule, r.demandeur, r.objet, r.categorie, r.responsable].join(" "),
      r => r.date_depot
    ),
    o = S.sel.dos && d.dos.find(x => x.id == S.sel.dos);
  return (
    (o ? doPanel(o) : "") +
    (G
      ? pn(
          "Nouveau dossier administratif",
          "file",
          frm(
            inp("d_in", "Intitul\u00e9") +
              inp("d_de", "Demandeur ou organisme") +
              inp("d_ca", "Cat\u00e9gorie") +
              sel("d_sv", "Service responsable", [["", "\u2014"]].concat(SVO)) +
              inp("d_re", "Responsable du traitement") +
              inp("d_ec", "\u00c9ch\u00e9ance", "date") +
              fl("d_fi", "Document associ\u00e9", `<input id="d_fi" type="file" accept="${FILE}">`)
          ) +
            `<label for="d_ob">Objet</label><textarea id="d_ob" rows="2"></textarea><p data-sty="margin-top:10px"><button class="bt" data-a="dosave">Ouvrir le dossier</button></p>`
        )
      : "") +
    flt("dos", Object.entries(DOSS)) +
    pn(
      "Dossiers administratifs",
      "file",
      R.map(r =>
        rowv(
          "dos",
          r.id,
          `<b>${esc(r.numero || "")} \u00b7 ${esc(r.intitule)}</b><div class="mut" data-sty="font-size:13px">${esc(r.demandeur || "")} \u00b7 d\u00e9pos\u00e9 le ${fdd(r.date_depot)} \u00b7 \u00e9ch\u00e9ance ${fdd(r.echeance)} ${latd(r) ? '<b data-sty="color:#B91C1C">\u00b7 EN RETARD</b>' : ""}</div>`,
          bg2(DOSS[r.statut], r.statut)
        )
      ).join("") || emp("Aucun dossier trouv\u00e9.")
    )
  );
};
const arch = () => {
  const d = D(),
    G = isG(),
    v = S.ed && S.ed.e == "dc",
    R = ff(
      "arc",
      d.dc,
      r => [r.reference, r.titre, r.categorie, r.type_doc].join(" "),
      r => (r.created_at || "").slice(0, 10)
    ).sort((a, b) => b.annee - a.annee || String(b.created_at).localeCompare(String(a.created_at)));
  return (
    (G
      ? pn(
          v ? "Nouvelle version de " + esc(S.ed.r.titre) : "Importer un document",
          "shield",
          frm(
            fl("ar_fi", "Fichier (PDF, Word, Excel ou photo)", `<input id="ar_fi" type="file" accept="${FILE}" capture="environment">`) +
              inp("ar_ti", "Titre", "text", v ? S.ed.r.titre : "") +
              inp("ar_an", "Ann\u00e9e", "number", v ? S.ed.r.annee : Y) +
              sel("ar_sv", "Service", [["", "\u2014"]].concat(SVO), v ? S.ed.r.service || "" : "") +
              inp("ar_ca", "Cat\u00e9gorie", "text", v ? S.ed.r.categorie || "" : "") +
              inp("ar_ty", "Type de document", "text", v ? S.ed.r.type_doc || "" : "", "Ex. arr\u00eat\u00e9, rapport\u2026") +
              sel(
                "ar_cf",
                "Confidentialit\u00e9",
                [
                  ["interne", "Interne"],
                  ["public", "Public"],
                  ["confidentiel", "Confidentiel (maire et secr\u00e9tariat)"]
                ],
                v ? S.ed.r.confidentialite : "interne"
              ) +
              inp("ar_cs", "Dur\u00e9e de conservation (ann\u00e9es)", "number", v ? S.ed.r.conservation_ans || "" : "", "Ex. 10") +
              `<button class="bt" data-a="arsave">${v ? "Enregistrer la version" : "Archiver le document"}</button>${v ? `<button class="bo" data-a="ecl">Annuler</button>` : ""}`
          )
        )
      : "") +
    flt("arc", null, 1) +
    pn(
      "Biblioth\u00e8que documentaire",
      "shield",
      R.map(r => {
        const fin = r.conservation_ans != null ? r.annee + r.conservation_ans : null;
        return `<div class="rw" data-sty="align-items:flex-start"><div class="rl"><b>${esc(r.reference || "")} \u00b7 ${esc(r.titre)}</b> <span class="mut">v${r.version}</span> ${r.confidentialite == "confidentiel" ? '<span class="tg rd" data-sty="cursor:default">Confidentiel</span>' : r.confidentialite == "public" ? '<span class="tg ok" data-sty="cursor:default">Public</span>' : ""}<div class="mut" data-sty="font-size:13px">${r.annee} \u00b7 ${esc(r.service ? svn(r.service) : "\u2014")} \u00b7 ${esc(r.categorie || "")} ${esc(r.type_doc || "")}${fin ? " \u00b7 conservation jusqu\u2019en " + fin + (fin <= Y ? ' <b data-sty="color:#B45309">(\u00e9ch\u00e9ance atteinte : \u00e0 examiner)</b>' : "") : ""}${r.statut == "archive" ? " \u00b7 archiv\u00e9" : ""}</div><div data-sty="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${fb(r.chemin, "Ouvrir / t\u00e9l\u00e9charger", r.id)}${G ? `<button class="tg" data-a="edit" data-e="dc" data-id="${r.id}">Nouvelle version</button>${r.statut != "archive" ? `<button class="tg" data-a="arst" data-id="${r.id}">Archiver</button>` : ""}` : ""}${isM() || isS() ? `<button class="tg" data-a="dochist" data-id="${r.id}">Consultations</button>` : ""}</div>${S.dch && S.dch.id == r.id ? `<div class="al" data-sty="background:#F3F6F1;color:var(--tx);margin-top:8px"><b>Historique de consultation</b>${S.dch.rows.map(h => `<div data-sty="font-size:13px;font-weight:400">${fdt(h.created_at)}</div>`).join("") || " aucune consultation"}</div>` : ""}</div></div>`;
      }).join("") || emp("Aucun document trouv\u00e9.")
    )
  );
};
const REP = {
  courrier_jour: () => ({
    t: "Rapport journalier du courrier \u2014 " + fdd(T),
    c: ["R\u00e9f\u00e9rence", "Exp\u00e9diteur", "Objet", "Cat\u00e9gorie", "Statut"],
    r: D()
      .cr.filter(x => x.sens == "in" && x.date_reception == T)
      .map(x => [x.reference, x.correspondant, x.objet, x.categorie || "", CIS[x.statut] || x.statut])
  }),
  mensuel: () => {
    const d = D(),
      ym = T.slice(0, 7),
      m = x => (x || "").slice(0, 7) == ym;
    return {
      t: "Rapport mensuel d\u2019activit\u00e9 administrative \u2014 " + ym,
      c: ["Indicateur", "Valeur"],
      r: [
        ["Courriers re\u00e7us", d.cr.filter(x => x.sens == "in" && m(x.date_reception)).length],
        ["Courriers envoy\u00e9s", d.cr.filter(x => x.sens == "out" && x.statut == "envoye" && m(x.date_envoi)).length],
        ["Actes cr\u00e9\u00e9s", d.act.filter(x => m(x.created_at)).length],
        [
          "Actes sign\u00e9s",
          d.act.filter(x => x.statut != "brouillon" && x.statut != "preparation" && x.statut != "validation" && m(x.date_signature)).length
        ],
        ["Dossiers ouverts", d.dos.filter(x => m(x.date_depot)).length],
        ["R\u00e9unions", d.ru.filter(x => m(x.jour)).length],
        ["D\u00e9lib\u00e9rations", d.del.filter(x => m(x.jour)).length],
        ["Instructions termin\u00e9es", d.ins.filter(x => ["terminee", "cloturee"].includes(x.statut) && m(x.updated_at)).length]
      ]
    };
  },
  attente: () => ({
    t: "Courriers en attente de traitement",
    c: ["R\u00e9f\u00e9rence", "Date", "Exp\u00e9diteur", "Objet", "Priorit\u00e9", "Limite", "Statut"],
    r: sstat().nt.map(x => [
      x.reference,
      fdd(x.date_reception),
      x.correspondant,
      x.objet,
      x.priorite,
      fdd(x.date_limite),
      CIS[x.statut] || x.statut
    ])
  }),
  traites: () => ({
    t: "Courriers trait\u00e9s",
    c: ["R\u00e9f\u00e9rence", "Date", "Exp\u00e9diteur", "Objet", "Statut"],
    r: sstat()
      .ci.filter(x => ["traite", "archive"].includes(x.statut))
      .map(x => [x.reference, fdd(x.date_reception), x.correspondant, x.objet, CIS[x.statut]])
  }),
  instr: () => ({
    t: "Instructions ex\u00e9cut\u00e9es",
    c: ["R\u00e9f\u00e9rence", "Objet", "Destinataire", "Limite", "Statut"],
    r: D()
      .ins.filter(x => ["terminee", "cloturee"].includes(x.statut))
      .map(x => [x.reference, x.objet, x.service ? svn(x.service) : an(x.adjoint_id), fdd(x.date_limite), IS[x.statut]])
  }),
  instr_retard: () => ({
    t: "Rapport de suivi : instructions en retard",
    c: ["R\u00e9f\u00e9rence", "Objet", "Destinataire", "Responsable", "Limite", "Statut"],
    r: D()
      .ins.filter(late)
      .map(x => [
        x.reference,
        x.objet,
        x.service ? svn(x.service) : an(x.adjoint_id),
        x.responsable || "",
        fdd(x.date_limite),
        IS[x.statut]
      ])
  }),
  retard: () => ({
    t: "Dossiers en retard",
    c: ["Num\u00e9ro", "Intitul\u00e9", "Demandeur", "Service", "\u00c9ch\u00e9ance", "Statut"],
    r: D()
      .dos.filter(latd)
      .map(x => [x.numero, x.intitule, x.demandeur || "", x.service ? svn(x.service) : "", fdd(x.echeance), DOSS[x.statut]])
  }),
  reunions: () => ({
    t: "R\u00e9unions",
    c: ["Date", "Heure", "Objet", "Type", "Lieu", "Statut"],
    r: D().ru.map(x => [fdd(x.jour), x.heure.slice(0, 5), x.objet, x.type, x.lieu || "", RSU[x.statut]])
  }),
  deliberations: () => ({
    t: "D\u00e9lib\u00e9rations",
    c: ["Num\u00e9ro", "Date", "Objet", "D\u00e9cision", "Transmise le", "Observations de l\u2019\u00c9tat"],
    r: D().del.map(x => [x.numero, fdd(x.jour), x.objet, x.statut, fdd(x.transmise_le), x.observations_etat || ""])
  }),
  services: () => ({
    t: "Activit\u00e9 des services",
    c: ["Service", "Responsable", "Dossiers en cours", "Dossiers en attente", "T\u00e2ches en retard", "Courriers non trait\u00e9s"],
    r: D().sv.map(x => {
      const ds = D().dos.filter(z => z.service == x.code),
        is = D().ins.filter(z => z.service == x.code),
        ci = D().cr.filter(c => c.service == x.code && c.sens == "in");
      return [
        x.nom,
        x.responsable || "",
        ds.filter(z => ["ouvert", "en_cours"].includes(z.statut)).length,
        ds.filter(z => z.statut == "en_attente").length,
        is.filter(late).length,
        ci.filter(c => !["traite", "archive"].includes(c.statut)).length
      ];
    })
  })
};
const REPL = [
  ["courrier_jour", "Rapport journalier du courrier"],
  ["mensuel", "Rapport mensuel d\u2019activit\u00e9 administrative"],
  ["attente", "Rapport des courriers en attente"],
  ["traites", "Rapport des courriers trait\u00e9s"],
  ["instr", "Rapport des instructions ex\u00e9cut\u00e9es"],
  ["instr_retard", "Rapport de suivi des instructions en retard (au maire)"],
  ["retard", "Rapport des dossiers en retard"],
  ["reunions", "Rapport des r\u00e9unions"],
  ["deliberations", "Rapport des d\u00e9lib\u00e9rations"],
  ["services", "Rapport d\u2019activit\u00e9 des services"]
];
const printTab = R => {
  $("#prt").innerHTML =
    `<div data-sty="font:15px/1.5 'Nunito Sans',sans-serif;padding:24px"><h2 data-sty="margin:0">Mairie de ${esc(S.co)}</h2><p>${esc(S.ind.slogan || "")}</p><hr><h1>${esc(R.t)}</h1><p>\u00c9dit\u00e9 le ${fdt(new Date().toISOString())}</p><table data-sty="width:100%;border-collapse:collapse"><tr>${R.c.map(c => `<th data-sty="border:1px solid #999;padding:6px;text-align:left;background:#eee">${esc(c)}</th>`).join("")}</tr>${R.r.map(r => `<tr>${r.map(x => `<td data-sty="border:1px solid #999;padding:6px">${esc(x)}</td>`).join("")}</tr>`).join("")}</table>${R.r.length ? "" : "<p>Aucune donn\u00e9e.</p>"}</div>`;
  setTimeout(() => window.print(), 400);
};
const csvx = (R, nom) => {
  const q = x =>
      '"' +
      String(x == null ? "" : x)
        .replace(/^[=+\-@]/, "'$&")
        .replace(/"/g, '""') +
      '"',
    u = URL.createObjectURL(
      new Blob(
        [
          "\ufeff" +
            [R.c]
              .concat(R.r)
              .map(r => r.map(q).join(";"))
              .join("\n")
        ],
        { type: "text/csv" }
      )
    ),
    l = document.createElement("a");
  l.href = u;
  l.download = nom + ".csv";
  l.click();
  URL.revokeObjectURL(u);
};
const srap = () =>
  pn(
    "Rapports et statistiques",
    "chart",
    REPL.map(x =>
      rw(
        `<b>${x[1]}</b><div class="mut" data-sty="font-size:13px">${REP[x[0]]().r.length} ligne(s)</div>`,
        `<div data-sty="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><button class="tg" data-a="rpgen" data-k="${x[0]}" data-f="print">Imprimer / PDF</button><button class="tg" data-a="rpgen" data-k="${x[0]}" data-f="csv">Excel (CSV)</button></div>`
      )
    ).join("")
  ) +
  emp(
    "Le PDF s\u2019obtient avec \u00ab Imprimer \u00bb puis \u00ab Enregistrer au format PDF \u00bb. Le fichier Excel s\u2019ouvre directement dans Excel."
  );
const sProf = () =>
  pn(
    "Mon profil",
    "user",
    `<p><b>${esc(S.email)}</b><br>R\u00f4le : ${esc(RL[S.pr] || S.pr)} \u00b7 commune : ${esc(S.co)}</p>${emp("Pour modifier vos acc\u00e8s, contactez l\u2019administrateur.")}`
  );
const SNAV = [
  ["s_dash", "Tableau de bord", "home"],
  ["s_cin", "Courrier entrant", "mail"],
  ["s_cout", "Courrier sortant", "mega"],
  ["s_actes", "Actes administratifs", "doc"],
  ["s_cm", "Conseil municipal", "users"],
  ["s_instr", "Instructions et t\u00e2ches", "check"],
  ["s_serv", "Services municipaux", "brief"],
  ["s_reun", "R\u00e9unions et agenda", "cal"],
  ["s_dos", "Dossiers administratifs", "file"],
  ["s_arch", "Archives num\u00e9riques", "shield"],
  ["s_rap", "Rapports et statistiques", "chart"],
  ["s_notif", "Notifications", "bell"],
  ["s_prof", "Mon profil", "user"],
  ["citoyens", "Demandes citoyennes", "user"],
  ["comm", "Communication", "mega"]
];
const SMAP = {
  s_dash: "sdash",
  s_cin: "cin",
  s_cout: "cout",
  s_actes: "actes",
  s_cm: "sconseil",
  s_instr: "sinstr",
  s_serv: "serv",
  s_reun: "sreun",
  s_dos: "dossiers",
  s_arch: "archives",
  s_rap: "srap",
  s_notif: "snotif"
};
Object.assign(V, {
  s_dash: () => page("Tableau de bord", sDash()),
  s_cin: () => page("Courrier entrant", cin()),
  s_cout: () => page("Courrier sortant", cout()),
  s_actes: () => page("Actes administratifs", actes()),
  s_cm: () => page("Conseil municipal", sconseil()),
  s_instr: () => page("Instructions et t\u00e2ches", sInstr()),
  s_serv: () => page("Services municipaux", serv()),
  s_reun: () => page("R\u00e9unions et agenda", reun()),
  s_dos: () => page("Dossiers administratifs", dossiers()),
  s_arch: () => page("Archives num\u00e9riques", arch()),
  s_rap: () => page("Rapports et statistiques", srap()),
  s_notif: () => page("Notifications", notif()),
  s_prof: () => page("Mon profil", sProf())
});
const UIB = ["sopen", "gos", "flt", "flr", "rpgen", "coprint", "dochist", "ofile"];
const MUT2 = [
  "cinsave",
  "cinaff",
  "cinadj",
  "cintrm",
  "cinst",
  "cinobs",
  "cosave",
  "costatut",
  "coatt",
  "coenv",
  "codel",
  "acsave",
  "acst",
  "acsign",
  "acpreuve",
  "actrans",
  "acdel",
  "sesave",
  "secv",
  "sedoc",
  "sepres",
  "sepv",
  "sedel",
  "sedtr",
  "setrans",
  "sesuites",
  "sest",
  "cnsave",
  "cnoff",
  "sinsave",
  "sinaff",
  "sinst",
  "sinobs",
  "sinrel",
  "svsave",
  "svdel",
  "dosave",
  "dost",
  "dosdoc",
  "dosobs",
  "arsave",
  "arst",
  "ruconv"
];
V.conseil_body = () => {
  const p = S.inS;
  S.inS = 1;
  try {
    return V.conseil();
  } finally {
    S.inS = p;
  }
};
const SUB = {
  budget: V.budget,
  civil: V.civil,
  params: V.params,
  projets: V.projets,
  territoire: V.territoire,
  conseil: V.conseil,
  citoyens: V.citoyens,
  rapports: V.rapports,
  pub: () => page("", pubv()),
  med: () => page("", medv()),
  personnel: () => page("", pn("Personnel", "user", emp("Module en pr\u00e9paration : liste du personnel, postes et cong\u00e9s.")))
};
Object.assign(SUB, {
  sdash: sDash,
  cin,
  cout,
  actes,
  sconseil,
  sinstr: sInstr,
  serv,
  sreun: reun,
  dossiers,
  archives: arch,
  srap,
  snotif: notif,
  adjdash: adjDash,
  adjlist: adjList,
  deleg,
  projA,
  reun,
  instr,
  rapp,
  msg,
  docs,
  notif
});
const spacePage = k => {
  const s = SP[k],
    sub = s.subs.filter(x => can(x[0]));
  if (!sub.length) return page(s.n, emp("Acc\u00e8s non autoris\u00e9."));
  const cur = sub.find(x => x[0] == S.tab[k]) ? S.tab[k] : sub[0][0];
  S.tab[k] = cur;
  let b;
  S.inS = 1;
  try {
    b = SUB[cur]();
  } finally {
    S.inS = 0;
  }
  return page(s.n, (sub.length > 1 ? tabs(k, sub) : "") + b);
};
Object.entries(SP).forEach(([k, x]) => {
  V[x.v] = () => spacePage(k);
});
const cab = () => {
  const V0 = okv(S.view) ? V[S.view] : S.sa ? V.sa_dash : isA() ? V.a_dash : isS() ? V.s_dash : V.dash;
  return `<aside class="sb${S.menu ? " open" : ""}">${brand()}<nav>${NAV()
    .map(n => `<button class="nvb${S.view == n[0] ? " on" : ""}" data-a="go" data-v="${n[0]}">${ic(n[2], 22)}<span>${n[1]}</span></button>`)
    .join(
      ""
    )}</nav><div class="sp"></div><hr><button class="nvb" data-mdp="1">${ic("shield", 22)}<span>Mon mot de passe</span></button><button class="nvb" data-a="out">${ic("out", 22)}<span>D\u00e9connexion</span></button><div class="dv">${esc(S.ind.devise || "")}</div></aside><div class="ov${S.menu ? " on" : ""}" data-a="menu"></div><div class="mn">${V0()}</div>`;
};
const mfaLogin = () => {
  const m = S.mfa || {};
  const error = S.err ? `<div class="al" role="alert" data-sty="margin:0">${esc(S.err)}</div>` : "";
  const setup = m.factorId
    ? `<p>Scannez ce QR code avec Google Authenticator ou une application TOTP compatible.</p><img src="${esc(m.qr)}" alt="QR code de configuration MFA" data-sty="display:block;width:190px;max-width:100%;margin:12px auto"><p class="mut" data-sty="font-size:12px;word-break:break-all">Clé de secours à conserver en lieu sûr : ${esc(m.secret)}</p>${inp("mfa_code", "Code à 6 chiffres de votre application", "text", "", "", 'inputmode="numeric" autocomplete="one-time-code" maxlength="6"')}<button class="bt" data-a="mfa-enroll-verify">Activer l’authentification à deux facteurs</button>`
    : `<p>Le contrôle MFA n’a pas pu être préparé. Annulez la connexion, réessayez ou contactez l’administrateur.</p>`;
  const code = m.challengeId
    ? inp(
        "mfa_code",
        "Code de votre application d’authentification",
        "text",
        "",
        "",
        'inputmode="numeric" autocomplete="one-time-code" maxlength="6"'
      )
    : `<p>Préparation du défi MFA impossible. Demandez un nouveau défi.</p>`;
  const controls = m.setup
    ? ""
    : `<button class="bt" data-a="mfa-verify" ${m.challengeId ? "" : "disabled"}>Vérifier le code</button><button class="bo" data-a="mfa-resend">Renvoyer un défi</button>`;
  return `<div class="lg"><main class="lc"><div class="lh"><p class="mut" data-sty="font-weight:800;letter-spacing:.1em;font-size:12px">MAIRIE CONNECTÉE</p><h1>Vérification de sécurité</h1></div><div class="lb">${error}${m.setup ? setup : code}${controls}<button class="bo" data-a="mfa-cancel">Annuler et revenir à la connexion</button></div></main></div>`;
};
const login = () =>
  S.mfa
    ? mfaLogin()
    : `<div class="lg"><main class="lc"><div class="lh"><p class="mut" data-sty="font-weight:800;letter-spacing:.1em;font-size:12px">MAIRIE CONNECTÉE</p><h1>Espace de la mairie</h1></div><div class="lb">${S.err ? `<div class="al" role="alert" data-sty="margin:0">${esc(S.err)}</div>` : ""}${inp("em", "E-mail", "email", "", "", 'autocomplete="username"')}${inp("pw", "Mot de passe", "password", "", "", 'autocomplete="current-password"')}<div id="ts"></div><button class="bt" data-a="enter">Se connecter</button><p class="mut" data-sty="font-size:13px;margin:0">Les comptes sont créés par l’administrateur. Contactez-le si vous n’avez pas encore vos accès.</p></div></main></div>`;
function render() {
  try {
    render0();
  } catch (e) {
    $("#app").innerHTML =
      `<div class="lg"><main class="lc"><div class="lb"><div class="al" role="alert">Erreur d\u2019affichage (${esc(S.view)}) : ${esc(e.message)}</div><button class="bt" data-a="out">Se d\u00e9connecter</button></div></main></div>`;
  }
}
function render0() {
  $("#app").innerHTML = S.role == "cab" ? cab() : login();
  S.tok = "";
  if ($("#ts") && window.turnstile)
    try {
      turnstile.render("#ts", {
        sitekey: TS_KEY,
        language: "fr",
        callback: x => {
          S.tok = x;
        }
      });
    } catch (e) {}
  if (S.map) {
    try {
      S.map.remove();
    } catch (e) {}
    S.map = null;
  }
  if ($("#map")) initMap();
}
