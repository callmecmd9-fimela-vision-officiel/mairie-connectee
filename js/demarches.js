/* Démarches configurables (espace mairie > Citoyens > Démarches) */
E0.dmr = [];
LG.demarches = [
  () => LQ("demarches").order("type").order("titre"),
  r => {
    S.db.dmr = r || [];
  }
];
const DMT = [
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
  "Associations"
];
const FAM = [
    "État civil",
    "Certificats et attestations",
    "Légalisations et certifications",
    "Foncier et urbanisme",
    "Action sociale et services communaux"
  ],
  MODL = [
    ["libre", "Formulaire libre"],
    ["identite", "Certificat sur identité"],
    ["legalisation", "Légalisation / certification"],
    ["foncier", "Foncier / urbanisme"],
    ["social", "Social"]
  ],
  STD = { actif: "Active", inactif: "Désactivée", archive: "Archivée" };
const demarches = () => {
  const d = D(),
    e = S.ed && S.ed.e == "dmr",
    ta = (id, l, k) => `<label for="${id}">${l}</label><textarea id="${id}" rows="2">${esc(ev("dmr", k))}</textarea>`;
  return (
    pn(
      e ? "Modifier la démarche" : "Nouvelle démarche",
      "doc",
      frm(
        sel("dm_ty", "Rubrique", DMT, ev("dmr", "type")) +
          inp("dm_ti", "Titre", "text", ev("dmr", "titre")) +
          inp("dm_dl", "Délai indicatif", "text", ev("dmr", "delai"), "Ex. 3 à 5 jours ouvrables") +
          inp("dm_au", "Autorité compétente (si ce n’est pas la mairie)", "text", ev("dmr", "autorite"), "Ex. Tribunal, Préfecture") +
          sel("dm_fa", "Catégorie (famille)", [["", "—"]].concat(FAM), ev("dmr", "famille")) +
          sel("dm_sv", "Service responsable", [["", "Par défaut"]].concat(SVO), ev("dmr", "service")) +
          sel("dm_mo", "Modèle de formulaire", MODL, ev("dmr", "modele", "libre")) +
          inp("dm_fr", "Frais (uniquement s’ils sont officiels)", "text", ev("dmr", "frais"), "Ex. Gratuit") +
          inp("dm_rt", "Modalités de retrait", "text", ev("dmr", "retrait"), "Ex. Guichet état civil, 08h-17h")
      ) +
        ta("dm_ds", "Description", "description") +
        ta("dm_pc", "Pièces justificatives (une par ligne)", "pieces") +
        ta("dm_cd", "Conditions", "conditions") +
        `<p data-sty="margin-top:10px"><button class="bt" data-m="dmsave">Enregistrer</button> ${e ? `<button class="bo" data-a="ecl">Annuler</button>` : ""}</p>` +
        emp("Si une autorité est indiquée, le citoyen est prévenu que la mairie l’oriente vers cet organisme.")
    ) +
    pn(
      "Démarches proposées aux citoyens",
      "doc",
      d.dmr
        .map(x =>
          rw(
            `<b>${esc(x.titre)}</b> ${x.statut == "actif" ? "" : `<span class="tg ${x.statut == "archive" ? "" : "rd"}" data-sty="cursor:default">${STD[x.statut] || "Désactivée"}</span>`}<div class="mut" data-sty="font-size:13px">${esc(x.type)}${x.delai ? " · " + esc(x.delai) : ""}${x.autorite ? " · relève de : " + esc(x.autorite) : ""}</div>`,
            `<div class="sa-ac"><button class="tg" data-a="edit" data-e="dmr" data-id="${x.id}">Modifier</button>${x.statut == "archive" ? "" : `<button class="tg" data-m="dmact" data-id="${x.id}">${x.statut == "actif" ? "Désactiver" : "Activer"}</button>`}<button class="tg" data-m="dmarch" data-id="${x.id}">${x.statut == "archive" ? "Désarchiver" : "Archiver"}</button></div>`
          )
        )
        .join("") || emp("Aucune démarche. Sans démarche configurée, le citoyen dépose une demande libre dans la rubrique.")
    )
  );
};
SP.citoyens.subs.push(["demarches", "Démarches"]);
RP.demarches = ["maire", "cabinet", "secretariat"];
SPL.demarches = "Démarches des citoyens";
SUB.demarches = demarches;
document.addEventListener("click", async e => {
  const t = e.target.closest("[data-m^=dm]");
  if (!t || S.sa) return;
  const m = t.dataset.m,
    g = id => (($("#" + id) || {}).value || "").trim();
  if (!["dmsave", "dmact", "dmarch", "dmdel"].includes(m)) return;
  S.err = "";
  try {
    if (m == "dmsave") {
      const ed = S.ed && S.ed.e == "dmr",
        o = {
          type: g("dm_ty"),
          titre: g("dm_ti"),
          delai: g("dm_dl") || null,
          autorite: g("dm_au") || null,
          description: g("dm_ds") || null,
          pieces: g("dm_pc") || null,
          conditions: g("dm_cd") || null,
          famille: g("dm_fa") || null,
          service: g("dm_sv") || null,
          modele: g("dm_mo") || null,
          frais: g("dm_fr") || null,
          retrait: g("dm_rt") || null
        };
      if (o.titre.length < 3) throw new Error("Le titre est obligatoire.");
      const r = await (ed ? sb.from("demarches").update(o).eq("id", S.ed.r.id) : sb.from("demarches").insert({ ...o, commune_id: S.cid }));
      if (r.error) throw new Error(r.error.message);
      S.ed = {};
      S.err = "Démarche enregistrée.";
    } else if (m == "dmact") {
      const x = D().dmr.find(y => y.id == t.dataset.id),
        r = await sb
          .from("demarches")
          .update({ statut: x.statut == "actif" ? "inactif" : "actif" })
          .eq("id", x.id);
      if (r.error) throw new Error(r.error.message);
    } else if (m == "dmarch") {
      const x = D().dmr.find(y => y.id == t.dataset.id),
        r = await sb
          .from("demarches")
          .update({ statut: x.statut == "archive" ? "inactif" : "archive" })
          .eq("id", x.id);
      if (r.error) throw new Error(r.error.message);
    } else if (confirm("Supprimer cette démarche ?")) {
      const r = await sb.from("demarches").delete().eq("id", t.dataset.id);
      if (r.error) throw new Error(r.error.message);
    }
    await load(["demarches"]);
  } catch (x) {
    S.err = x.message || "Erreur réseau.";
  }
  render();
  window.scrollTo(0, 0);
});

/* Lien citoyen + QR code + identité publique (espace mairie > Administration > Lien citoyen) */
const LC = {};
const lcUrl = () => location.origin + "/?c=" + encodeURIComponent(slug());
const lcQr = u => {
  try {
    const q = qrcode(0, "M");
    q.addData(u);
    q.make();
    return q.createSvgTag({ cellSize: 6, margin: 4, scalable: true, alt: "QR code du lien citoyen" });
  } catch (e) {
    return "";
  }
};
const lienc = () => {
  const I = S.ind || {},
    u = lcUrl(),
    col = /^#[0-9a-fA-F]{6}$/.test(I.couleur || "") ? I.couleur : "#0B5A2E";
  if (!window.qrcode && !LC.t) {
    LC.t = 1;
    const s = document.createElement("script");
    s.src = "/js/qr.js";
    s.onload = () => render();
    s.onerror = () => {
      LC.e = 1;
      render();
    };
    document.head.appendChild(s);
  }
  const q = window.qrcode ? lcQr(u) : "";
  return (
    pn(
      "Lien et QR code pour les citoyens",
      "mega",
      `<p>Le citoyen ne saisit rien : il ouvre ce lien ou scanne le QR code et arrive directement sur la mairie de ${esc(S.co)}. L’adresse est mémorisée sur son téléphone.</p><label for="lc_u">Lien citoyen</label><input id="lc_u" readonly value="${esc(u)}"><p data-sty="margin-top:10px"><button class="bt" data-m="lnkcopy">Copier le lien</button> <button class="bo" data-m="lnkprint">Imprimer l’affiche (QR)</button></p><div data-sty="width:240px;max-width:100%;margin:12px 0">${q || emp(LC.e ? "QR code indisponible : utilisez le lien." : "Génération du QR code…")}</div>`
    ) +
    pn(
      "Identité affichée aux citoyens",
      "gear",
      `<p>Couleur principale de l’application citoyenne (choisissez une couleur assez foncée pour que le texte blanc reste lisible).</p><p><input id="lc_co" type="color" value="${esc(col)}" aria-label="Couleur principale" data-sty="max-width:90px"> <button class="bo" data-m="lnkcolor">Enregistrer la couleur</button></p><p data-sty="margin-top:14px">Blason : après l’avoir envoyé dans Paramètres &gt; Images, publiez-le pour l’afficher sur l’application citoyenne ; les icônes PNG de l’application (écran d’accueil, couleur de la commune) sont créées automatiquement. À refaire si vous changez de blason.</p><p><button class="bo" data-m="lnkblason">Publier le blason et les icônes</button> <button class="bo" data-m="lnkicons">Régénérer les icônes</button></p><p data-sty="margin-top:14px">Photo de la mairie (bannière d’accueil) : après l’avoir envoyée dans Paramètres &gt; Images (« Bandeau d’accueil »), publiez-la. Elle est réduite automatiquement pour l’ordinateur et pour le téléphone. À refaire si vous changez de photo.</p><p><button class="bo" data-m="lnkbandeau">Publier la photo de bannière</button></p>`
    )
  );
};
SP.administration.subs.push(["lienc", "Lien citoyen"]);
RP.lienc = ["maire", "cabinet", "secretariat"];
SPL.lienc = "Lien citoyen et QR code";
SUB.lienc = lienc;
/* icônes PNG de la PWA citoyenne (192, 512, maskable) générées depuis le blason et la couleur, publiées dans le bucket public « identite » */
async function pubIcons(bl, col) {
  if (!window.mcIcons) throw new Error("Générateur d’icônes indisponible : rechargez la page.");
  const o = await mcIcons.make(bl, { color: col || S.ind.couleur, name: S.co });
  let n = 0;
  for (const k of Object.keys(o)) {
    const up = await sb.storage.from("identite").upload(S.cid + "/" + k, o[k], { upsert: true, contentType: "image/png" });
    if (up.error) throw new Error(up.error.message);
    n++;
  }
  return n;
}
document.addEventListener("click", async e => {
  const t = e.target.closest("[data-m^=lnk]");
  if (!t || S.sa) return;
  const m = t.dataset.m,
    g = id => (($("#" + id) || {}).value || "").trim();
  S.err = "";
  try {
    if (m == "lnkcopy") {
      try {
        await navigator.clipboard.writeText(lcUrl());
        t.textContent = "Copié";
      } catch (x) {
        const i = $("#lc_u");
        if (i) i.select();
      }
      return;
    }
    if (m == "lnkprint") {
      const u = lcUrl(),
        q = window.qrcode ? lcQr(u) : "",
        p = $("#prt");
      if (p && q) {
        p.innerHTML = `<div data-sty="font:16px/1.5 'Nunito Sans',sans-serif;padding:40px;text-align:center"><h1 data-sty="font-size:34px;margin:0">MAIRIE DE ${esc(S.co.toUpperCase())}</h1><p data-sty="font-size:20px">${esc(S.ind.slogan || "")}</p><h2 data-sty="font-size:28px;margin:28px 0 8px">Vos démarches en ligne, sans vous déplacer</h2><p data-sty="font-size:20px">Scannez ce QR code avec votre téléphone</p><div data-sty="width:420px;max-width:100%;margin:20px auto">${q}</div><p data-sty="font-size:18px">ou ouvrez : <b>${esc(u)}</b></p><p data-sty="font-size:16px">Service gratuit · Suivi de votre demande en ligne</p></div>`;
        setTimeout(() => window.print(), 400);
        return;
      }
      throw new Error("Affiche indisponible : le QR code n’est pas chargé. Réessayez dans un instant.");
    } else if (m == "lnkcolor") {
      const c = g("lc_co");
      if (!/^#[0-9a-fA-F]{6}$/.test(c)) throw new Error("Couleur invalide.");
      const r = await sb.from("indicateurs").upsert({ commune_id: S.cid, couleur: c });
      if (r.error) throw new Error(r.error.message);
      S.ind.couleur = c;
      S.err = "Couleur enregistrée.";
      try {
        if (S.ind.blason) {
          let bl = null;
          if (S.ind.blason) {
            const d = await sb.storage.from("medias").download(S.ind.blason);
            if (!d.error) bl = d.data;
          }
          await pubIcons(bl, c);
          S.err += " Icônes de l’application mises à jour.";
        }
      } catch (x) {}
    } else if (m == "lnkblason") {
      if (!S.ind.blason) throw new Error("Envoyez d’abord le blason dans Paramètres > Images.");
      const d = await sb.storage.from("medias").download(S.ind.blason);
      if (d.error) throw new Error(d.error.message);
      const up = await sb.storage
        .from("identite")
        .upload(S.cid + "/blason.webp", d.data, { upsert: true, contentType: d.data.type || "image/webp" });
      if (up.error) throw new Error(up.error.message);
      const ni = await pubIcons(d.data);
      S.err =
        "Blason publié : il s’affiche maintenant sur l’application citoyenne. " +
        ni +
        " icônes de l’application créées (écran d’accueil du téléphone).";
    } else if (m == "lnkicons") {
      let bl = null;
      if (S.ind.blason) {
        const d = await sb.storage.from("medias").download(S.ind.blason);
        if (!d.error) bl = d.data;
      }
      const ni = await pubIcons(bl);
      S.err = ni + " icônes publiées" + (bl ? " avec le blason." : " (initiales de la commune : aucun blason envoyé).");
    } else if (m == "lnkbandeau") {
      if (!S.ind.bandeau) throw new Error("Envoyez d’abord la photo dans Paramètres > Images (Bandeau d’accueil).");
      const d = await sb.storage.from("medias").download(S.ind.bandeau);
      if (d.error) throw new Error(d.error.message);
      /* deux versions WebP (≤ 300 Ko chacune) : 1280 px ordinateur, 720 px téléphone ; la version téléphone est envoyée en premier, le citoyen ne voit la photo qu'une fois les deux en place */
      const mk = async mx => {
        const b = await comp(d.data, mx, 280000);
        if (b.type != "image/webp") throw new Error("Ce navigateur ne sait pas créer d’image WebP : utilisez un autre navigateur.");
        if (b.size > 300000) throw new Error("La photo reste trop lourde après réduction. Choisissez une autre photo.");
        return b;
      };
      const sm = await mk(720),
        big = await mk(1280);
      for (const [n, b] of [
        ["bandeau-m.webp", sm],
        ["bandeau.webp", big]
      ]) {
        const up = await sb.storage.from("identite").upload(S.cid + "/" + n, b, { upsert: true, contentType: "image/webp" });
        if (up.error) throw new Error(up.error.message);
      }
      S.err =
        "Photo de bannière publiée (" +
        kb(big.size) +
        " ordinateur, " +
        kb(sm.size) +
        " téléphone) : elle s’affiche maintenant sur l’application citoyenne.";
      const bk = sb.storage.from("identite"),
        vf = typeof bk.createSignedUrl == "function" ? await bk.createSignedUrl(S.cid + "/bandeau.webp", 60) : { data: true };
      if (vf.error || !vf.data) S.err = "Fichier envoyé mais introuvable après publication (" + ((vf.error && vf.error.message) || "inconnu") + ") : contactez le support.";
    }
  } catch (x) {
    S.err = x.message || "Erreur réseau.";
  }
  render();
  window.scrollTo(0, 0);
});

/* Lot 6 : rendez-vous demandés par les citoyens (espace mairie > Citoyens > Rendez-vous) */
E0.rdq = [];
E0.rdp = [];
LG.rdv_demandes = [
  () => LQ("rdv_demandes").order("created_at", DE),
  r => {
    S.db.rdq = r || [];
  }
];
LG.rdv_planning = [
  () => sb.from("rdv_planning").select("*").eq("commune_id", S.cid).maybeSingle(),
  r => {
    S.db.rdp = r ? [r] : [];
  }
];
const RQS = { demandee: "En attente", confirmee: "Confirmé", refusee: "Refusé", annulee: "Annulé" };
const RJ = [
    [1, "Lundi"],
    [2, "Mardi"],
    [3, "Mercredi"],
    [4, "Jeudi"],
    [5, "Vendredi"],
    [6, "Samedi"],
    [7, "Dimanche"]
  ],
  hm5 = v => String(v || "").slice(0, 5);
const rqplan = () => {
  const R = D().rdp,
    P = R[0] || {},
    j = P.jours || [1, 2, 3, 4, 5],
    pd = P.pause_debut === undefined ? "12:30" : P.pause_debut,
    pf = P.pause_fin === undefined ? "14:00" : P.pause_fin;
  return pn(
    "Jours et heures de rendez-vous",
    "cal",
    `<p>${P.actif ? "<b>Actif</b> : le citoyen choisit un jour ouvrable puis une heure libre." : "<b>Non activé</b> : le citoyen propose seulement une date, vous fixez l’heure."}</p><div data-sty="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:10px">${RJ.map(x => `<span data-sty="display:flex;gap:6px;align-items:center"><input type="checkbox" id="rp_j${x[0]}" aria-label="${x[1]}" data-sty="width:auto;min-height:0"${j.includes(x[0]) ? " checked" : ""}> ${x[1]}</span>`).join("")}</div>` +
      frm(
        inp("rp_d", "Ouverture", "time", hm5(P.heure_debut || "08:00")) +
          inp("rp_f", "Fermeture", "time", hm5(P.heure_fin || "17:00")) +
          inp("rp_pd", "Début de la pause", "time", hm5(pd)) +
          inp("rp_pf", "Fin de la pause", "time", hm5(pf)) +
          sel(
            "rp_du",
            "Durée d’un créneau",
            [
              [15, "15 minutes"],
              [20, "20 minutes"],
              [30, "30 minutes"],
              [45, "45 minutes"],
              [60, "1 heure"]
            ],
            P.duree_min || 30
          )
      ) +
      `<label data-sty="display:flex;gap:8px;align-items:center;margin:0 0 10px"><input type="checkbox" id="rp_ac" data-sty="width:auto;min-height:0"${P.actif || !R.length ? " checked" : ""}> Proposer ces créneaux aux citoyens</label><p><button class="bt" data-m="rqplan">Enregistrer</button></p>` +
      emp(
        "Les citoyens ne voient que les heures libres : un créneau déjà confirmé pour le même service disparaît. Laissez la pause vide si elle n’existe pas. Les rendez-vous restent confirmés par vous, jamais automatiquement."
      )
  );
};
const rdvq = () => {
  const d = D(),
    L = d.rdq,
    o = S.sel.rq && L.find(x => x.id == S.sel.rq);
  return (
    rqplan() +
    (o
      ? pn(
          "Rendez-vous " + esc(o.numero),
          "cal",
          `<p><b>${esc(o.nom)}</b>${o.contact ? " · " + esc(o.contact) : ""}<br>${esc(svn(o.service))} · date souhaitée ${fdd(o.date_souhaitee)}${o.heure_souhaitee ? " à " + hm5(o.heure_souhaitee) : ""}</p><p>${esc(o.motif)}</p>` +
            (["demandee", "confirmee"].includes(o.statut)
              ? `<div class="fr">${inp("rq_d", "Date confirmée", "date", o.date_confirmee || o.date_souhaitee)}${inp("rq_h", "Heure", "time", String(o.heure_confirmee || o.heure_souhaitee || "09:00").slice(0, 5))}</div><label for="rq_r">Message au citoyen (obligatoire pour un refus)</label><textarea id="rq_r" rows="2" maxlength="500">${esc(o.reponse || "")}</textarea><p data-sty="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="bt" data-m="rqok">Confirmer</button><button class="bo" data-m="rqno">Refuser</button> ${closeb("rq")}</p>`
              : `<p>${closeb("rq")}</p>`)
        )
      : "") +
    pn(
      "Rendez-vous demandés par les citoyens",
      "cal",
      L.map(x =>
        rowv(
          "rq",
          x.id,
          `<b>${esc(x.nom)}</b> · ${esc(svn(x.service))}<div class="mut" data-sty="font-size:13px">${esc(x.numero)} · souhaité le ${fdd(x.date_souhaitee)}${x.heure_souhaitee ? " à " + hm5(x.heure_souhaitee) : ""}${x.contact ? " · " + esc(x.contact) : ""}</div>`,
          st2(RQS[x.statut] || x.statut, x.statut == "confirmee" ? "ok" : x.statut == "demandee" ? "or" : "rd")
        )
      ).join("") || emp("Aucune demande de rendez-vous.")
    ) +
    emp("Aucun rendez-vous n’est confirmé automatiquement : vous choisissez la date et l’heure.")
  );
};
SP.citoyens.subs.push(["rdvq", "Rendez-vous"]);
RP.rdvq = ["maire", "cabinet", "secretariat"];
SPL.rdvq = "Rendez-vous demandés";
SUB.rdvq = rdvq;
document.addEventListener("click", async e => {
  const t = e.target.closest("[data-m^=rq]");
  if (!t || S.sa) return;
  const m = t.dataset.m;
  if (!["rqok", "rqno"].includes(m)) return;
  const g = id => (($("#" + id) || {}).value || "").trim();
  S.err = "";
  try {
    const x = D().rdq.find(y => y.id == S.sel.rq);
    if (!x) return;
    let u;
    if (m == "rqok") {
      const dj = g("rq_d"),
        h = g("rq_h");
      if (!dj || !h) throw new Error("Indiquez la date et l’heure.");
      if (dj < T) throw new Error("La date ne peut pas être passée.");
      u = { statut: "confirmee", date_confirmee: dj, heure_confirmee: h, reponse: g("rq_r") || null };
    } else {
      if (g("rq_r").length < 5) throw new Error("Écrivez le motif du refus au citoyen.");
      u = { statut: "refusee", reponse: g("rq_r"), date_confirmee: null, heure_confirmee: null };
    }
    const r = await sb.from("rdv_demandes").update(u).eq("id", x.id);
    if (r.error)
      throw new Error(
        r.error.code == "23505" ? "Ce créneau est déjà confirmé pour ce service. Choisissez une autre heure." : r.error.message
      );
    if (m == "rqok" && x.service == "maire" && x.statut != "confirmee") {
      await sb.from("rdv").insert({ commune_id: S.cid, jour: u.date_confirmee, heure: u.heure_confirmee, titre: "Audience : " + x.nom });
    }
    await load(["rdv_demandes", "rdv"]);
    S.err = m == "rqok" ? "Rendez-vous confirmé : le citoyen est notifié s’il a un compte." : "Refus enregistré.";
  } catch (x) {
    S.err = x.message || "Erreur réseau.";
  }
  render();
  window.scrollTo(0, 0);
});

/* Lot 6 bis : enregistrement du planning (jours ouvrables, heures, pause, durée) */
document.addEventListener("click", async e => {
  const t = e.target.closest("[data-m=rqplan]");
  if (!t || S.sa) return;
  const g = id => (($("#" + id) || {}).value || "").trim();
  S.err = "";
  try {
    const J = RJ.map(x => x[0]).filter(n => ($("#rp_j" + n) || {}).checked),
      d = g("rp_d"),
      f = g("rp_f"),
      pd = g("rp_pd"),
      pf = g("rp_pf"),
      du = +g("rp_du"),
      mn = h => +h.slice(0, 2) * 60 + +h.slice(3, 5);
    if (!J.length) throw new Error("Cochez au moins un jour.");
    if (!d || !f || f <= d) throw new Error("L’heure de fermeture doit être après l’ouverture.");
    if (!!pd !== !!pf || (pd && (pf <= pd || pd < d || pf > f)))
      throw new Error("Pause : indiquez un début et une fin dans les heures d’ouverture, ou laissez les deux vides.");
    if (!(du >= 10 && du <= 120) || mn(f) - mn(d) < du) throw new Error("La durée d’un créneau doit tenir dans les heures d’ouverture.");
    const r = await sb.from("rdv_planning").upsert(
      {
        commune_id: S.cid,
        actif: !!($("#rp_ac") || {}).checked,
        jours: J,
        heure_debut: d,
        heure_fin: f,
        pause_debut: pd || null,
        pause_fin: pf || null,
        duree_min: du,
        updated_at: new Date().toISOString()
      },
      { onConflict: "commune_id" }
    );
    if (r.error) throw new Error(r.error.message);
    await load(["rdv_planning"]);
    S.err = "Jours et heures enregistrés.";
  } catch (x) {
    S.err = x.message || "Erreur réseau.";
  }
  render();
  window.scrollTo(0, 0);
});
