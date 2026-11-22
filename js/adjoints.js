/* ===== MODULE ADJOINTS AU MAIRE ===== */
const isA = () => S.pr == "adjoint" && !S.sa,
  isM = () => S.sa || S.pr == "maire";
const DOM = [
  "Développement local",
  "Éducation et jeunesse",
  "Action sociale",
  "Santé",
  "Infrastructures",
  "Environnement",
  "Sport et culture",
  "Économie locale",
  "Agriculture et pêche",
  "Jeunesse et développement économique"
];
const TRE = [
  "Réunion avec le maire",
  "Réunion entre adjoints",
  "Réunion avec les chefs de service",
  "Visite de terrain",
  "Rencontre avec les populations",
  "Audience",
  "Mission officielle",
  "Activité communale",
  "Réunion du bureau municipal",
  "Réunion administrative",
  "Réunion de coordination",
  "Réunion avec les partenaires",
  "Réunion exceptionnelle"
];
const TRA = [
  "Rapport mensuel",
  "Rapport trimestriel",
  "Rapport de mission",
  "Rapport de visite de terrain",
  "Rapport d’avancement des projets",
  "Rapport d’activité",
  "Rapport de difficultés"
];
const PRI = [
  ["basse", "Basse"],
  ["normale", "Normale"],
  ["haute", "Haute"],
  ["urgente", "Urgente"]
];
const IS = {
    nouvelle: "Nouvelle instruction",
    prise_en_charge: "Prise en charge",
    en_cours: "En cours",
    en_attente: "En attente",
    terminee: "Terminée",
    cloturee: "Clôturée"
  },
  RSU = { a_venir: "À venir", confirmee: "Confirmée", terminee: "Terminée", annulee: "Annulée" },
  RSA = { brouillon: "Brouillon", transmis: "Transmis", lu: "Lu", archive: "Archivé" },
  DSL = { brouillon: "En attente de validation", effective: "Effective", terminee: "Terminée" };
const TC = {
  nouvelle: "or",
  prise_en_charge: "bl",
  en_cours: "bl",
  en_attente: "or",
  terminee: "ok",
  cloturee: "ok",
  a_venir: "bl",
  confirmee: "ok",
  annulee: "rd",
  brouillon: "or",
  transmis: "bl",
  lu: "ok",
  archive: "",
  effective: "ok",
  urgente: "rd",
  haute: "or",
  normale: "",
  basse: ""
};
const bg2 = (l, k) => `<span class="tg ${TC[k] || ""}" data-sty="cursor:default">${esc(l)}</span>`;
const rl = a => a.fonction || (a.rang == 1 ? "1er adjoint" : a.rang + "ème adjoint"),
  ini = a => ((a.prenom || "?")[0] + (a.nom || "?")[0]).toUpperCase();
const apic = (a, z = 92) =>
  S.au[a.photo]
    ? `<img class="ap" data-sty="width:${z}px;height:${z}px" src="${esc(S.au[a.photo])}" alt="${esc(a.prenom + " " + a.nom)}">`
    : `<div class="ap" data-sty="width:${z}px;height:${z}px;font-size:${Math.round(z / 3)}px" aria-hidden="true">${esc(ini(a))}</div>`;
const an = id => {
  const a = D().adj.find(x => x.id == id);
  return a ? a.prenom + " " + a.nom : "—";
};
const aopts = () =>
  D()
    .adj.filter(a => a.actif)
    .map(a => [a.id, a.prenom + " " + a.nom + " (" + rl(a) + ")"]);
const lk = (p, l) => (p && S.au[p] ? `<a href="${esc(S.au[p])}" target="_blank" rel="noopener noreferrer">${l}</a>` : "");
const ev = (e, k, d = "") => (S.ed && S.ed.e == e && S.ed.r && S.ed.r[k] != null ? S.ed.r[k] : d);
const fdd = d => (d ? new Date(d + "T00:00").toLocaleDateString("fr-FR") : "—");
const late = x => x.date_limite && x.date_limite < T && !["terminee", "cloturee"].includes(x.statut);
const rowb = 'data-sty="width:100%;background:none;border:0;border-top:1px solid var(--ln);text-align:left;cursor:pointer"';
const upl = async (id, aid) => {
  const f = ($("#" + id) || {}).files && $("#" + id).files[0];
  if (!f) return null;
  const bl = f.type == "application/pdf" ? f : await comp(f, 1600, 400000);
  if (bl.size > 5242880) throw new Error("Fichier trop volumineux (5 Mo maximum).");
  const p =
      S.cid +
      "/" +
      (aid || "maire") +
      "/" +
      crypto.randomUUID() +
      "." +
      (bl.type == "application/pdf" ? "pdf" : bl.type == "image/webp" ? "webp" : "jpg"),
    u = await sb.storage.from("adjoints").upload(p, bl, { contentType: bl.type });
  if (u.error) throw new Error("Envoi impossible : " + u.error.message);
  return p;
};
const histBox = id =>
  S.hk == id && S.hi.length
    ? `<div class="al" data-sty="background:#F3F6F1;color:var(--tx);margin-top:8px"><b>Historique des modifications</b>${S.hi
        .map(
          h =>
            `<div data-sty="font-size:13px;font-weight:400">${fdt(h.created_at)} — ${esc(
              h.action == "INSERT"
                ? "Création"
                : h.action == "DELETE"
                  ? "Suppression"
                  : "Modifié : " +
                    Object.keys(h.apres || {})
                      .filter(k => k != "updated_at" && JSON.stringify((h.apres || {})[k]) !== JSON.stringify((h.avant || {})[k]))
                      .join(", ")
            )}</div>`
        )
        .join("")}</div>`
    : "";
const rem = () => {
  const d = D(),
    a = [],
    lim = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  d.ins
    .filter(x => !["terminee", "cloturee"].includes(x.statut) && x.date_limite && x.date_limite <= lim)
    .forEach(x =>
      a.push({ i: late(x) ? "alert" : "cal", t: `${x.reference} : échéance ${fdd(x.date_limite)}${late(x) ? " (dépassée)" : ""}` })
    );
  d.ru
    .filter(r => r.jour >= T && r.jour <= lim && r.statut != "annulee")
    .forEach(r => a.push({ i: "cal", t: `Réunion « ${r.objet} » le ${fdd(r.jour)} à ${r.heure.slice(0, 5)}` }));
  d.proj.filter(p => p.statut == "en_retard").forEach(p => a.push({ i: "alert", t: `Projet en retard : ${p.titre}` }));
  return a;
};
const adjDash = () => {
  const d = D(),
    A = d.adj.filter(a => a.actif),
    dl = d.dl.filter(x => x.statut == "effective"),
    ps = d.proj.filter(p => p.adjoint_id),
    ru = d.ru.filter(r => r.jour >= T && r.statut != "annulee").sort((a, b) => (a.jour + a.heure).localeCompare(b.jour + b.heure)),
    ins = d.ins.filter(x => !["terminee", "cloturee"].includes(x.statut)),
    rr = d.rap.filter(r => r.statut == "transmis"),
    COL = ["#16A34A", "#2563EB", "#F59E0B", "#8B5CF6", "#0F766E", "#E11D48"],
    seg = A.map((a, i) => ({ v: dl.filter(x => x.adjoint_id == a.id).length, c: COL[i % 6], a })).filter(x => x.v > 0),
    tot = seg.reduce((s, x) => s + x.v, 0);
  return (
    `<div class="kp">${kp("k1", "users", "Adjoints en fonction", A.length)}${kp("k2", "brief", "Domaines de délégation", new Set(dl.map(x => x.domaine)).size)}${kp("k3", "tools", "Projets suivis", ps.length)}${kp("k4", "cal", "Réunions programmées", ru.length)}${kp("k5", "file", "Dossiers en attente", ins.length)}${kp("k6", "doc", "Rapports à lire", rr.length)}</div>` +
    pn(
      "Nos Adjoints au Maire",
      "users",
      A.length
        ? `<div class="ag">${A.map(
            a =>
              `<div class="ac">${apic(a)}<b>${esc(a.prenom + " " + a.nom)}</b><div class="mut">${esc(rl(a))}</div><div class="dm"><b>Domaines :</b>${
                dl
                  .filter(x => x.adjoint_id == a.id)
                  .map(x => `<div>✓ ${esc(x.domaine)}</div>`)
                  .join("") || '<div class="mut">Aucune délégation effective</div>'
              }</div><div class="mut" data-sty="font-size:13px">${ps.filter(p => p.adjoint_id == a.id).length} projet(s) · ${ins.filter(x => x.adjoint_id == a.id).length} dossier(s) en cours</div><button class="bt" data-sty="margin-top:8px" data-a="adjv" data-id="${a.id}">Voir le profil</button></div>`
          ).join("")}</div>`
        : emp("Aucun adjoint enregistré. Ajoutez-les dans l’onglet Adjoints.")
    ) +
    `<div class="g3">${pn("Répartition des délégations", "pie", tot ? `<div class="dn">${donut(seg, tot, "délégations")}<div data-sty="flex:1;min-width:140px">${seg.map(x => `<div class="rw" data-sty="padding:6px 0"><span><i data-sty="display:inline-block;width:11px;height:11px;border-radius:50%;background:${x.c};margin-right:8px"></i>${esc(rl(x.a))}</span><b>${x.v}</b></div>`).join("")}</div></div>` : emp("Aucune délégation effective pour le moment."))}${pn(
      "Projets par adjoint",
      "check",
      ps
        .slice(0, 6)
        .map(p =>
          rw(
            `<b>${esc(p.titre)}</b><div class="mut" data-sty="font-size:13px">${esc(an(p.adjoint_id))} · échéance ${fdd(p.date_fin)}</div>`,
            `<span class="tg ${TC2[p.statut] || ""}" data-sty="cursor:default">${PSS[p.statut]}</span>`
          )
        )
        .join("") || emp("Aucun projet affecté à un adjoint.")
    )}${pn(
      "Réunions et activités",
      "cal",
      ru
        .slice(0, 5)
        .map(r =>
          rw(
            `<b>${esc(r.objet)}</b><div class="mut" data-sty="font-size:13px">${fdd(r.jour)} · ${esc(r.heure.slice(0, 5))} · ${esc(r.lieu || "")}</div>`,
            bg2(RSU[r.statut], r.statut)
          )
        )
        .join("") || emp("Aucune réunion programmée.")
    )}</div>`
  );
};
const adjProfile = (a, ro) => {
  const d = D();
  return pn(
    "Profil : " + esc(a.prenom + " " + a.nom),
    "user",
    `<div class="ai">${apic(a, 90)}<div><b data-sty="font-size:18px">${esc(a.prenom + " " + a.nom)}</b><div class="mut">${esc(rl(a))}</div>${a.telephone ? `<div>${esc(a.telephone)}</div>` : ""}${a.email ? `<div>${esc(a.email)}</div>` : ""}</div></div><h3 data-sty="margin:14px 0 4px;font-size:16px">Délégations</h3>${
      d.dl
        .filter(x => x.adjoint_id == a.id)
        .map(x => `<div>${esc(x.domaine)} ${bg2(DSL[x.statut], x.statut)}</div>`)
        .join("") || emp("Aucune.")
    }<h3 data-sty="margin:14px 0 4px;font-size:16px">Projets</h3>${
      d.proj
        .filter(p => p.adjoint_id == a.id)
        .map(p => `<div>${esc(p.titre)} : ${PSS[p.statut]} (${p.avancement}%)</div>`)
        .join("") || emp("Aucun.")
    }<h3 data-sty="margin:14px 0 4px;font-size:16px">Instructions</h3>${
      d.ins
        .filter(x => x.adjoint_id == a.id)
        .map(x => `<div>${esc(x.reference)} ${esc(x.objet)} : ${IS[x.statut]}</div>`)
        .join("") || emp("Aucune.")
    }${ro ? "" : `<p data-sty="margin-top:12px"><button class="bo" data-a="adjv" data-id="">Fermer le profil</button></p>`}`
  );
};
const adjList = () => {
  const d = D(),
    e = S.ed && S.ed.e == "adj",
    P = S.adjv && d.adj.find(x => x.id == S.adjv);
  return (
    (P ? adjProfile(P) : "") +
    pn(
      e ? "Modifier l’adjoint" : "Nouvel adjoint",
      "users",
      frm(
        inp("a_pr", "Prénom", "text", ev("adj", "prenom")) +
          inp("a_nm", "Nom", "text", ev("adj", "nom")) +
          inp("a_rg", "Rang (1 = premier adjoint)", "number", ev("adj", "rang", d.adj.length + 1), "", 'min="1" max="10"') +
          inp("a_fn", "Fonction (facultatif)", "text", ev("adj", "fonction"), "Ex. 2ème Adjointe") +
          inp("a_tl", "Téléphone", "text", ev("adj", "telephone")) +
          inp("a_em", "E-mail de contact", "email", ev("adj", "email")) +
          `<button class="bt" data-a="adjsave">Enregistrer</button>${e ? `<button class="bo" data-a="ecl">Annuler</button>` : ""}`
      )
    ) +
    pn(
      "Adjoints",
      "users",
      d.adj
        .map(
          a =>
            `<div class="rw" data-sty="align-items:flex-start"><div class="ai">${apic(a, 64)}<div><b>${esc(a.prenom + " " + a.nom)}</b> ${a.actif ? "" : '<span class="tg rd" data-sty="cursor:default">Inactif</span>'}<div class="mut">${esc(rl(a))} · ${a.user_id ? "compte lié" : "aucun compte lié"}</div><div data-sty="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><button class="tg" data-a="adjv" data-id="${a.id}">Profil</button><button class="tg" data-a="edit" data-e="adj" data-id="${a.id}">Modifier</button><button class="tg" data-a="adjoff" data-id="${a.id}">${a.actif ? "Désactiver" : "Réactiver"}</button></div><div class="fr" data-sty="margin:8px 0 0"><div><label for="ph_${a.id}">Photo</label><input id="ph_${a.id}" type="file" accept="image/*"></div><button class="bo" data-a="adjphoto" data-id="${a.id}">Envoyer la photo</button></div>${a.user_id ? "" : `<div class="fr" data-sty="margin:0"><div><label for="lk_${a.id}">E-mail du compte à lier (rôle adjoint)</label><input id="lk_${a.id}" type="email"></div><button class="bo" data-a="adjlink" data-id="${a.id}">Lier le compte</button></div>`}</div></div></div>`
        )
        .join("") || emp("Aucun adjoint. Ajoutez le premier ci-dessus.")
    )
  );
};
const deleg = () => {
  const d = D(),
    M = isM(),
    e = S.ed && S.ed.e == "dl";
  return (
    (M
      ? pn(
          e ? "Modifier la délégation" : "Nouvelle délégation",
          "brief",
          frm(
            sel("d_aj", "Adjoint", aopts(), ev("dl", "adjoint_id")) +
              sel("d_dm", "Domaine", DOM, ev("dl", "domaine")) +
              inp("d_db", "Date de début", "date", ev("dl", "date_debut")) +
              inp("d_df", "Date de fin", "date", ev("dl", "date_fin"))
          ) +
            `<label for="d_ms">Missions</label><textarea id="d_ms" rows="3">${esc(ev("dl", "missions"))}</textarea><label for="d_lm">Limites de responsabilité</label><textarea id="d_lm" rows="2">${esc(ev("dl", "limites"))}</textarea><p data-sty="margin-top:10px"><button class="bt" data-a="delsave">Enregistrer</button> ${e ? `<button class="bo" data-a="ecl">Annuler</button>` : ""}</p>` +
            emp(
              "Une délégation devient effective seulement après l’enregistrement de l’acte officiel (arrêté ou décision) et sa validation."
            )
        )
      : "") +
    pn(
      M ? "Délégations" : "Mes délégations",
      "brief",
      d.dl
        .map(
          x =>
            `<div class="rw" data-sty="align-items:flex-start"><div class="rl"><b>${esc(x.domaine)}</b> ${bg2(DSL[x.statut], x.statut)}<div class="mut">${esc(an(x.adjoint_id))} · du ${fdd(x.date_debut)} au ${fdd(x.date_fin)}</div>${x.missions ? `<div><b>Missions :</b> ${esc(x.missions)}</div>` : ""}${x.limites ? `<div><b>Limites :</b> ${esc(x.limites)}</div>` : ""}<div>${lk(x.acte, "Voir l’acte de délégation") || '<span class="mut">Acte non enregistré</span>'}</div>${M ? `<div class="fr" data-sty="margin:8px 0 0"><div><label for="ac_${x.id}">Acte (PDF ou image)</label><input id="ac_${x.id}" type="file" accept="image/*,application/pdf"></div><button class="bo" data-a="delacte" data-id="${x.id}">Joindre l’acte</button></div><div data-sty="display:flex;gap:6px;flex-wrap:wrap"><button class="tg" data-a="edit" data-e="dl" data-id="${x.id}">Modifier</button>${x.statut == "brouillon" ? `<button class="tg ok" data-a="delval" data-id="${x.id}">Valider (rendre effective)</button><button class="tg rd" data-a="deldl" data-id="${x.id}">Supprimer</button>` : ""}${x.statut == "effective" ? `<button class="tg" data-a="delend" data-id="${x.id}">Terminer</button>` : ""}<button class="tg" data-a="hist" data-tb="delegations" data-id="${x.id}">Historique</button></div>` : ""}${histBox(x.id)}</div></div>`
        )
        .join("") || emp("Aucune délégation.")
    )
  );
};
const suiviF = (p, i) =>
  `<div class="rw" data-sty="display:block"><b>${esc(p.numero || "")} · ${esc(p.titre)}</b> <span class="tg ${TC2[p.statut] || ""}" data-sty="cursor:default">${PSS[p.statut]}</span><div class="mut" data-sty="font-size:13px">${esc(p.localite || "")} · ${esc(p.domaine || "—")} · ${fmt(p.budget)} FCFA · ${esc(p.financement || "financement non précisé")} · responsable : ${esc(p.responsable || "—")} · du ${fdd(p.date_debut)} au ${fdd(p.date_fin)}</div>${p.description ? `<div>${esc(p.description)}</div>` : ""}<div class="bar" data-sty="max-width:300px"><i data-sty="width:${p.avancement}%;background:${PCOL[p.statut]}"></i></div><div class="fr" data-sty="margin-top:8px">${sel(
    "ps_" + i,
    "Statut",
    PST.map(k => [k, PSS[k]]),
    p.statut
  )}${inp("pv_" + i, "Avancement (%)", "number", p.avancement, "", 'min="0" max="100"')}${fl("pph_" + i, "Ajouter une photo", `<input id="pph_${i}" type="file" accept="image/*">`)}${fl("pdc_" + i, "Ajouter un document (PDF)", `<input id="pdc_${i}" type="file" accept="application/pdf">`)}</div><label for="pd_${i}">Difficultés rencontrées</label><textarea id="pd_${i}" rows="2">${esc(p.difficultes || "")}</textarea><label for="po_${i}">Observations de l’adjoint</label><textarea id="po_${i}" rows="2">${esc(p.observations || "")}</textarea><div data-sty="margin:6px 0">${(p.photos || []).map((x, k) => lk(x, "Photo " + (k + 1))).join(" · ")} ${(p.docs || []).map((x, k) => lk(x, "Document " + (k + 1))).join(" · ")}</div><p data-sty="display:flex;gap:8px;flex-wrap:wrap"><button class="bt" data-a="pjsuivi" data-i="${i}">Enregistrer le suivi</button><button class="bo" data-a="pjrapport" data-i="${i}">Rapport de suivi au maire</button></p></div>`;
const projA = () => {
  const d = D();
  if (!isM())
    return pn(
      "Mes projets",
      "tools",
      d.proj.map((p, i) => suiviF(p, i)).join("") || emp("Aucun projet ne vous est affecté pour le moment.")
    );
  return pn(
    "Projets suivis par les adjoints",
    "tools",
    d.proj
      .map(
        (p, i) =>
          `<div class="rw" data-sty="align-items:flex-start"><div class="rl"><b>${esc(p.numero || "")} · ${esc(p.titre)}</b> <span class="tg ${TC2[p.statut] || ""}" data-sty="cursor:default">${PSS[p.statut]}</span><div class="mut" data-sty="font-size:13px">${esc(p.localite || "")} · ${esc(p.domaine || "—")} · ${fmt(p.budget)} FCFA · ${p.avancement}%</div>${p.difficultes ? `<div><b>Difficultés :</b> ${esc(p.difficultes)}</div>` : ""}${p.observations ? `<div><b>Observations :</b> ${esc(p.observations)}</div>` : ""}<div>${(p.photos || []).map((x, k) => lk(x, "Photo " + (k + 1))).join(" · ")} ${(p.docs || []).map((x, k) => lk(x, "Document " + (k + 1))).join(" · ")}</div></div><div data-sty="min-width:210px">${sel("pa_" + i, "Adjoint responsable", [["", "Aucun"]].concat(aopts()), p.adjoint_id || "")}<button class="bo" data-sty="margin-top:6px;width:100%" data-a="pjassign" data-i="${i}">Affecter</button></div></div>`
      )
      .join("") || emp("Aucun projet. Créez-les dans Développement.")
  );
};
const ruPanel = o => {
  const d = D(),
    part = d.rpa.filter(x => x.reunion_id == o.id).map(x => an(x.adjoint_id)),
    can2 = isG() || o.responsable_id == S.mine;
  return pn(
    "Événement : " + esc(o.objet),
    "cal",
    `<p><b>${esc(o.type)}</b><br>${fdd(o.jour)} à ${esc(o.heure.slice(0, 5))} · ${esc(o.lieu || "lieu non précisé")}<br>Responsable : ${esc(an(o.responsable_id))}<br>Participants : ${esc(part.concat(o.participants_texte ? [o.participants_texte] : []).join(", ") || "—")}</p><p>${(o.docs || []).map((x, k) => lk(x, "Document " + (k + 1))).join(" · ")}</p>${can2 ? `<div class="fr">${sel("ru_st", "Statut", Object.entries(RSU), o.statut)}${fl("ru_dc", "Document associé", '<input id="ru_dc" type="file" accept="image/*,application/pdf">')}</div>${isG() ? `<label for="ru_pr">Présences</label><textarea id="ru_pr" rows="2">${esc(o.presences || "")}</textarea><label for="ru_ac">Actions à réaliser et suites</label><textarea id="ru_ac" rows="2">${esc(o.actions || "")}</textarea><p><button class="tg" data-a="ruconv">${o.convoquee ? "Renvoyer les convocations" : "Envoyer les convocations"}</button></p>` : ""}<label for="ru_cr">Compte rendu</label><textarea id="ru_cr" rows="4">${esc(o.compte_rendu || "")}</textarea><p data-sty="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="bt" data-a="rucr">Enregistrer</button><button class="tg rd" data-a="rudel">Supprimer</button><button class="bo" data-a="ruopen" data-id="">Fermer</button></p>` : `${o.compte_rendu ? `<div data-sty="white-space:pre-wrap"><b>Compte rendu :</b> ${esc(o.compte_rendu)}</div>` : ""}<p><button class="bo" data-a="ruopen" data-id="">Fermer</button></p>`}`
  );
};
const reun = () => {
  const d = D(),
    M = isG(),
    o = S.rd && d.ru.find(x => x.id == S.rd),
    R = d.ru.filter(x => !S.rtype || x.type == S.rtype).sort((a, b) => (b.jour + b.heure).localeCompare(a.jour + a.heure));
  return (
    (o ? ruPanel(o) : "") +
    pn(
      "Nouvel événement",
      "cal",
      frm(
        inp("r_ob", "Objet") +
          sel("r_ty", "Type", TRE, S.rtype || "") +
          inp("r_jo", "Date", "date", T) +
          inp("r_he", "Heure", "time", "09:00") +
          inp("r_li", "Lieu") +
          inp("r_pt", "Autres participants") +
          (M ? sel("r_rs", "Responsable", [["", "—"]].concat(aopts())) : "")
      ) +
        `<label>Participants (adjoints)</label><div data-sty="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:10px">${
          d.adj
            .filter(a => a.actif)
            .map(
              a =>
                `<span data-sty="display:flex;gap:6px;align-items:center;font-size:14px"><input type="checkbox" id="rp_${a.id}" aria-label="${esc(a.prenom + " " + a.nom)}" data-sty="width:auto;min-height:0"> ${esc(a.prenom + " " + a.nom)}</span>`
            )
            .join("") || '<span class="mut">Aucun adjoint.</span>'
        }</div><button class="bt" data-a="rusave">Programmer</button>`
    ) +
    pn(
      M ? "Réunions et activités" : "Mes réunions et activités",
      "cal",
      R.map(
        r =>
          `<button class="rw" ${rowb} data-a="ruopen" data-id="${r.id}"><div class="rl"><b>${esc(r.objet)}</b><div class="mut" data-sty="font-size:13px">${esc(r.type)} · ${fdd(r.jour)} ${esc(r.heure.slice(0, 5))} · ${esc(r.lieu || "")}</div><div class="mut" data-sty="font-size:13px">Responsable : ${esc(an(r.responsable_id))}</div></div>${bg2(RSU[r.statut], r.statut)}</button>`
      ).join("") || emp("Aucun événement.")
    )
  );
};
const inPanel = o => {
  const M = isM();
  return pn(
    "Instruction " + esc(o.reference),
    "mega",
    `<p><b>${esc(o.objet)}</b> ${bg2(IS[o.statut], o.statut)} ${bg2(o.priorite, o.priorite)}<br>Destinataire : ${esc(o.adjoint_id ? an(o.adjoint_id) : svn(o.service))} · émise le ${fdd(o.date_emission)} · limite ${fdd(o.date_limite)} ${late(o) ? '<b data-sty="color:#B91C1C">· EN RETARD</b>' : ""}</p>${o.description ? `<div data-sty="white-space:pre-wrap">${esc(o.description)}</div>` : ""}<p>${(o.pieces || []).map((x, k) => lk(x, "Pièce jointe " + (k + 1))).join(" · ")}</p>${o.reponse ? `<div class="okb"><b>Réponse de l’adjoint</b><br>${esc(o.reponse)}</div>` : ""}${
      !M && o.statut != "cloturee"
        ? `<div class="fr">${sel(
            "in_st",
            "Statut",
            ["prise_en_charge", "en_cours", "en_attente", "terminee"].map(k => [k, IS[k]]),
            o.statut == "nouvelle" ? "prise_en_charge" : o.statut
          )}${fl("in_fi", "Pièce jointe", '<input id="in_fi" type="file" accept="image/*,application/pdf">')}</div><label for="in_rp">Votre réponse</label><textarea id="in_rp" rows="3">${esc(o.reponse || "")}</textarea><p data-sty="margin-top:10px"><button class="bt" data-a="inrep">Enregistrer</button> `
        : "<p>"
    }${M && o.statut == "terminee" ? `<button class="bt" data-a="incl">Clôturer l’instruction</button> ` : ""}<button class="tg" data-a="hist" data-tb="instructions" data-id="${o.id}">Historique</button> <button class="bo" data-a="inopen" data-id="">Fermer</button></p>${histBox(o.id)}`
  );
};
const instr = () => {
  const d = D(),
    M = isM(),
    o = S.ri && d.ins.find(x => x.id == S.ri),
    pr = { urgente: 0, haute: 1, normale: 2, basse: 3 },
    L = d.ins.slice().sort((a, b) => pr[a.priorite] - pr[b.priorite]);
  return (
    (o ? inPanel(o) : "") +
    (M
      ? pn(
          "Nouvelle instruction",
          "mega",
          frm(
            sel("i_aj", "Adjoint destinataire", aopts()) +
              inp("i_ob", "Objet") +
              inp("i_dl", "Date limite", "date") +
              sel("i_pr", "Priorité", PRI, "normale") +
              fl("i_fi", "Pièce jointe", '<input id="i_fi" type="file" accept="image/*,application/pdf">')
          ) +
            `<label for="i_ds">Description</label><textarea id="i_ds" rows="3"></textarea><p data-sty="margin-top:10px"><button class="bt" data-a="insave">Envoyer l’instruction</button></p>`
        )
      : "") +
    pn(
      M ? "Instructions émises" : "Instructions du maire",
      "mega",
      L.map(
        x =>
          `<button class="rw" ${rowb} data-a="inopen" data-id="${x.id}"><div class="rl"><b>${esc(x.reference)} · ${esc(x.objet)}</b><div class="mut" data-sty="font-size:13px">${esc(x.adjoint_id ? an(x.adjoint_id) : svn(x.service))} · émise le ${fdd(x.date_emission)} · limite ${fdd(x.date_limite)} ${late(x) ? '<b data-sty="color:#B91C1C">· EN RETARD</b>' : ""}</div></div><div data-sty="display:grid;gap:4px;justify-items:end">${bg2(IS[x.statut], x.statut)}${bg2(x.priorite, x.priorite)}</div></button>`
      ).join("") || emp("Aucune instruction.")
    )
  );
};
const rpPanel = o => {
  const M = isM(),
    mine = !M;
  return pn(
    esc(o.titre),
    "doc",
    `<p><b>${esc(o.type)}</b>${o.periode ? " · " + esc(o.periode) : ""} ${bg2(RSA[o.statut], o.statut)}<br>Auteur : ${esc(an(o.adjoint_id))}${o.transmis_le ? " · transmis le " + fdt(o.transmis_le) : ""}</p><div data-sty="white-space:pre-wrap;margin-bottom:10px">${esc(o.contenu || "")}</div><div data-sty="display:flex;flex-wrap:wrap;gap:8px">${(o.photos || []).map(x => (S.au[x] ? `<img class="th" src="${esc(S.au[x])}" alt="Photo du rapport">` : "")).join("")}</div><p>${(o.docs || []).map((x, k) => lk(x, "Document PDF " + (k + 1))).join(" · ")}</p>${o.observations_maire && mine ? `<div class="okb"><b>Observations du maire</b><br>${esc(o.observations_maire)}</div>` : ""}${M ? `<label for="rp_ob">Observations du maire</label><textarea id="rp_ob" rows="3">${esc(o.observations_maire || "")}</textarea><p data-sty="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="bt" data-a="rpobs" data-s="lu">Enregistrer et marquer comme lu</button><button class="bo" data-a="rpobs" data-s="archive">Archiver</button>` : `<p data-sty="display:flex;gap:8px;flex-wrap:wrap">${o.statut == "brouillon" ? `<button class="bo" data-a="edit" data-e="rap" data-id="${o.id}">Modifier le brouillon</button>` : ""}${o.statut == "transmis" || o.statut == "lu" ? `<button class="bo" data-a="rparch">Archiver</button>` : ""}`}<button class="bo" data-a="rppdf" data-id="${o.id}">Télécharger en PDF</button><button class="tg" data-a="hist" data-tb="rapports" data-id="${o.id}">Historique</button><button class="tg" data-a="rpopen" data-id="">Fermer</button></p>${histBox(o.id)}`
  );
};
const rapp = () => {
  const d = D(),
    M = isM(),
    o = S.rr && d.rap.find(x => x.id == S.rr),
    e = S.ed && S.ed.e == "rap",
    pre = S.pre || {};
  return (
    (o ? rpPanel(o) : "") +
    (!M
      ? pn(
          e ? "Modifier le brouillon" : "Rédiger un rapport",
          "doc",
          frm(
            sel("rp_ty", "Type de rapport", TRA, ev("rap", "type", pre.type || "")) +
              inp("rp_ti", "Titre", "text", ev("rap", "titre", pre.titre || "")) +
              inp("rp_pe", "Période", "text", ev("rap", "periode")) +
              fl("rp_ph", "Ajouter une photo", '<input id="rp_ph" type="file" accept="image/*">') +
              fl("rp_dc", "Joindre un PDF", '<input id="rp_dc" type="file" accept="application/pdf">')
          ) +
            `<label for="rp_ct">Contenu</label><textarea id="rp_ct" rows="8">${esc(ev("rap", "contenu", pre.contenu || ""))}</textarea><p data-sty="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="bo" data-a="rpsave" data-s="brouillon">Enregistrer comme brouillon</button><button class="bt" data-a="rpsave" data-s="transmis">Transmettre au maire</button>${e ? `<button class="tg" data-a="ecl">Annuler</button>` : ""}</p>`
        )
      : "") +
    pn(
      M ? "Rapports reçus" : "Mes rapports",
      "doc",
      d.rap
        .map(
          x =>
            `<button class="rw" ${rowb} data-a="rpopen" data-id="${x.id}"><div class="rl"><b>${esc(x.titre)}</b><div class="mut" data-sty="font-size:13px">${esc(x.type)} · ${esc(an(x.adjoint_id))} · ${x.transmis_le ? "transmis le " + fdt(x.transmis_le) : "non transmis"}</div></div>${bg2(RSA[x.statut], x.statut)}</button>`
        )
        .join("") || emp(M ? "Aucun rapport reçu." : "Aucun rapport. Rédigez le premier ci-dessus.")
    )
  );
};
const msg = () => {
  const d = D(),
    me = S.uid,
    M = isM(),
    dest = d.an.filter(x => x.user_id != me),
    nm = u => (d.an.find(x => x.user_id == u) || {}).nom || (u == me ? "Moi" : "—");
  return (
    pn(
      "Nouveau message",
      "mail",
      frm(
        sel(
          "m_to",
          "Destinataire",
          (M ? [["", "Tous les adjoints (annonce)"]] : []).concat(
            dest.map(x => [x.user_id, x.nom + " (" + (x.role == "maire" ? "maire" : "adjoint") + ")"])
          )
        ) + inp("m_su", "Sujet")
      ) +
        `<label for="m_co">Message</label><textarea id="m_co" rows="4"></textarea><p data-sty="margin-top:10px"><button class="bt" data-a="mssend">Envoyer</button></p>` +
        emp("Les messages privés ne sont visibles que par l’expéditeur et le destinataire.")
    ) +
    pn(
      "Messages et historique des communications",
      "mail",
      d.ms
        .map(x => {
          const mine = x.de == me,
            un = !mine && x.a == me && !x.lu;
          return `<button class="rw" ${rowb} data-a="msopen" data-id="${x.id}"><div class="rl"><b${un ? ' data-sty="color:var(--g)"' : ""}>${un ? "● " : ""}${esc(x.sujet)}</b><div class="mut" data-sty="font-size:13px">${mine ? "À : " + esc(x.a ? nm(x.a) : "Tous les adjoints") : "De : " + esc(nm(x.de))} · ${fdt(x.created_at)}</div>${S.mo == x.id ? `<div data-sty="margin-top:6px;white-space:pre-wrap">${esc(x.corps)}</div>` : ""}</div></button>`;
        })
        .join("") || emp("Aucun message.")
    )
  );
};
const docs = () => {
  const d = D(),
    L = [];
  d.dl.forEach(x => x.acte && L.push(["Acte de délégation", x.domaine + " (" + an(x.adjoint_id) + ")", x.acte]));
  d.ins.forEach(x => (x.pieces || []).forEach(p => L.push(["Instruction " + x.reference, x.objet, p])));
  d.rap.forEach(x => [...(x.photos || []), ...(x.docs || [])].forEach(p => L.push(["Rapport", x.titre, p])));
  d.proj.forEach(x => [...(x.photos || []), ...(x.docs || [])].forEach(p => L.push(["Projet " + (x.numero || ""), x.titre, p])));
  d.ru.forEach(x => (x.docs || []).forEach(p => L.push(["Réunion", x.objet, p])));
  return pn(
    "Documents",
    "file",
    L.map(l =>
      rw(
        `<b>${esc(l[0])}</b><div class="mut" data-sty="font-size:13px">${esc(l[1])}</div>`,
        lk(l[2], "Ouvrir") || '<span class="mut">Indisponible</span>'
      )
    ).join("") || emp("Aucun document pour le moment.")
  );
};
const notif = () => {
  const d = D(),
    R = rem().concat(isG() ? urg().map(u => ({ i: u.i, t: u.t })) : []);
  return (
    pn(
      "Rappels et échéances",
      "bell",
      R.map(a => `<div class="rw"><div class="ai">${ic(a.i, 24)}<b>${esc(a.t)}</b></div></div>`).join("") || emp("Aucune échéance proche.")
    ) +
    pn(
      "Notifications",
      "bell",
      (d.nt.some(n => !n.lu) ? `<p><button class="bo" data-a="ntall">Tout marquer comme lu</button></p>` : "") +
        d.nt
          .map(
            n =>
              `<button class="rw" ${rowb} data-a="ntgo" data-id="${n.id}" data-l="${esc(n.lien || "")}"><div class="rl"><b>${n.lu ? "" : "● "}${esc(n.titre)}</b><div class="mut" data-sty="font-size:13px">${esc(n.corps || "")} · ${fdt(n.created_at)}</div></div></button>`
          )
          .join("") || emp("Aucune notification.")
    )
  );
};
const aDash = () => {
  const d = D(),
    mine = d.adj.find(a => a.id == S.mine),
    mi = d.ins.filter(x => !["terminee", "cloturee"].includes(x.statut)),
    dr = d.rap.filter(x => x.statut == "brouillon"),
    un = d.nt.filter(n => !n.lu).length,
    ru = d.ru.filter(r => r.jour >= T && r.statut != "annulee").sort((a, b) => (a.jour + a.heure).localeCompare(b.jour + b.heure)),
    R = rem();
  return (
    (mine
      ? `<div class="ai" data-sty="margin-bottom:14px">${apic(mine, 72)}<div><h2 data-sty="font:800 22px 'Nunito Sans'">Bonjour, ${esc(mine.prenom + " " + mine.nom)}</h2><div class="mut">${esc(rl(mine))}</div></div></div>`
      : `<div class="al">Votre compte n’est pas encore lié à une fiche d’adjoint. Contactez le maire.</div>`) +
    `<div class="kp">${kp("k1", "brief", "Mes délégations", d.dl.filter(x => x.statut == "effective").length)}${kp("k3", "tools", "Mes projets", d.proj.length)}${kp("k4", "cal", "Réunions à venir", ru.length)}${kp("k5", "mega", "Instructions en cours", mi.length)}${kp("k6", "doc", "Rapports à transmettre", dr.length)}${kp("k2", "bell", "Notifications non lues", un)}</div>` +
    `<div class="g3">${pn("Échéances et rappels", "bell", R.map(a => `<div class="rw"><div class="ai">${ic(a.i, 24)}<b>${esc(a.t)}</b></div></div>`).join("") || emp("Aucune échéance proche."))}${pn(
      "Instructions en cours",
      "mega",
      mi
        .slice(0, 5)
        .map(x =>
          rw(
            `<b>${esc(x.reference)} · ${esc(x.objet)}</b><div class="mut" data-sty="font-size:13px">limite ${fdd(x.date_limite)}</div>`,
            bg2(IS[x.statut], x.statut)
          )
        )
        .join("") || emp("Aucune instruction en cours.")
    )}${pn(
      "Prochaines réunions",
      "cal",
      ru
        .slice(0, 5)
        .map(r =>
          rw(
            `<b>${esc(r.objet)}</b><div class="mut" data-sty="font-size:13px">${fdd(r.jour)} · ${esc(r.heure.slice(0, 5))}</div>`,
            bg2(RSU[r.statut], r.statut)
          )
        )
        .join("") || emp("Aucune réunion à venir.")
    )}</div>`
  );
};
const ANAV = [
  ["a_dash", "Tableau de bord", "home"],
  ["a_deleg", "Mes délégations", "brief"],
  ["a_proj", "Mes projets", "tools"],
  ["a_reun", "Mes réunions et activités", "cal"],
  ["a_instr", "Instructions du maire", "mega"],
  ["a_rapp", "Rapports et comptes rendus", "doc"],
  ["a_msg", "Messagerie", "mail"],
  ["a_docs", "Documents", "file"],
  ["a_notif", "Notifications", "bell"],
  ["a_prof", "Mon profil", "user"]
];
Object.assign(V, {
  a_dash: () => page("Tableau de bord", aDash()),
  a_deleg: () => page("Mes délégations", deleg()),
  a_proj: () => page("Mes projets", projA()),
  a_reun: () => page("Mes réunions et activités", reun()),
  a_instr: () => page("Instructions du maire", instr()),
  a_rapp: () => page("Rapports et comptes rendus", rapp()),
  a_msg: () => page("Messagerie", msg()),
  a_docs: () => page("Documents", docs()),
  a_notif: () => page("Notifications", notif()),
  a_prof: () =>
    page(
      "Mon profil",
      S.mine && D().adj.find(a => a.id == S.mine)
        ? adjProfile(
            D().adj.find(a => a.id == S.mine),
            1
          )
        : emp("Votre compte n’est pas encore lié à une fiche d’adjoint.")
    )
});
const printRap = r => {
  if (!r) return;
  const p = $("#prt");
  p.innerHTML = `<div data-sty="font:16px/1.5 'Nunito Sans',sans-serif;padding:24px"><h2 data-sty="margin:0">Mairie de ${esc(S.co)}</h2><p>${esc(S.ind.slogan || "")}</p><hr><h1>${esc(r.titre)}</h1><p><b>${esc(r.type)}</b>${r.periode ? " — " + esc(r.periode) : ""}<br>Auteur : ${esc(an(r.adjoint_id))}${r.transmis_le ? "<br>Transmis le " + fdt(r.transmis_le) : ""}</p><div data-sty="white-space:pre-wrap">${esc(r.contenu || "")}</div>${r.observations_maire ? `<hr><b>Observations du maire</b><div data-sty="white-space:pre-wrap">${esc(r.observations_maire)}</div>` : ""}${(r.photos || []).map(x => (S.au[x] ? `<img src="${esc(S.au[x])}" data-sty="max-width:100%;margin:8px 0" alt="">` : "")).join("")}</div>`;
  setTimeout(() => window.print(), 400);
};
const UIA = ["adjv", "edit", "ecl", "ruopen", "inopen", "rpopen", "hist", "rppdf", "pjrapport"];
const MUT = [
  "adjsave",
  "adjphoto",
  "adjlink",
  "adjoff",
  "delsave",
  "delacte",
  "delval",
  "delend",
  "deldl",
  "pjassign",
  "pjsuivi",
  "rusave",
  "rucr",
  "rudel",
  "insave",
  "inrep",
  "incl",
  "rpsave",
  "rpobs",
  "rparch",
  "mssend",
  "msopen",
  "ntall",
  "ntgo"
];
