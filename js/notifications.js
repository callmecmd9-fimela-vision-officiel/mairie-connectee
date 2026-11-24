/* LOT 6 : notifications WhatsApp (WAHA pour les tests ; l'API officielle Meta pourra la remplacer sans toucher au reste).
   Architecture : envoyerNotification() (générique, trace en base) -> NOTIF_FOURNISSEURS[NOTIF_CONFIG.fournisseur] -> envoyerMessageWaha() / envoyerMessageMeta().
   Pour basculer vers Meta : implémenter envoyerMessageMeta() puis mettre NOTIF_CONFIG.fournisseur = "meta" (aucune autre modification).
   ATTENTION : toute clé d'API placée ici est visible dans le navigateur. Pour les tests, WAHA tourne sans clé ; en production, appeler le fournisseur depuis une Edge Function. */
/* URL complète de l'API WAHA (à modifier ici : serveur distant, port, etc.) */
const WAHA_API_URL = "http://localhost:3000/api/sendText";
const NOTIF_CONFIG = {
  fournisseur: "waha" /* "waha" | "meta" */,
  indicatifPays: "221" /* ajouté aux numéros locaux (ex. 77 123 45 67) */,
  proposerAuChangementDeStatut: true /* demande confirmation d'avertir le citoyen après un changement de statut */,
  waha: { session: "default", apiKey: "", delaiMs: 10000 },
  meta: { version: "v20.0", phoneNumberId: "" } /* le jeton d'accès Meta ne doit JAMAIS figurer ici */
};
const NOTIF_TELRE = /^\+?[0-9 ]{8,16}$/;
/* Numéro -> chiffres avec indicatif pays ("" si invalide) */
function notifNormaliser(tel) {
  let d = String(tel || "").replace(/[^0-9]/g, "");
  if (String(tel || "").trim().startsWith("00")) d = d.replace(/^00/, "");
  else if (!String(tel || "").trim().startsWith("+") && d.length <= 9) d = NOTIF_CONFIG.indicatifPays + d.replace(/^0+/, "");
  return d.length >= 10 && d.length <= 15 ? d : "";
}
/* Fournisseur WAHA : POST WAHA_API_URL (chatId + text) */
async function envoyerMessageWaha(telephone, message) {
  const num = notifNormaliser(telephone);
  if (!num) throw new Error("Numéro de téléphone invalide.");
  const c = NOTIF_CONFIG.waha,
    ctl = new AbortController(),
    tm = setTimeout(() => ctl.abort(), c.delaiMs || 10000),
    h = { "Content-Type": "application/json" };
  if (c.apiKey) h["X-Api-Key"] = c.apiKey;
  try {
    const r = await fetch(WAHA_API_URL, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ session: c.session || "default", chatId: num + "@c.us", text: String(message) }),
      signal: ctl.signal
    });
    if (!r.ok) throw new Error("WAHA a répondu HTTP " + r.status + ".");
    return await r.json().catch(() => ({}));
  } catch (e) {
    throw new Error(e && e.name == "AbortError" ? "WAHA ne répond pas (délai dépassé)." : e.message || "WAHA injoignable.");
  } finally {
    clearTimeout(tm);
  }
}
/* Fournisseur Meta (WhatsApp Cloud API) : à implémenter plus tard, idéalement via une Edge Function (jeton secret côté serveur). */
async function envoyerMessageMeta(telephone, message) {
  throw new Error("Fournisseur Meta non configuré : implémentez envoyerMessageMeta().");
}
const NOTIF_FOURNISSEURS = { waha: envoyerMessageWaha, meta: envoyerMessageMeta };
/* Point d'entrée unique : envoyerNotification(telephone, message, ctx?) ; ctx = { commune_id, demande_id } facultatif.
   Trace en base (public.notifications_whatsapp), envoi via le fournisseur actif, mise à jour du statut ('succes' | 'echec').
   Retourne { ok, id, erreur }. Aucun envoi si la trace ne peut pas être enregistrée. */
async function envoyerNotification(telephone, message, ctx) {
  const o = ctx || {},
    tel = String(telephone || "").replace(/\s+/g, " ").trim(),
    msg = String(message || "").trim(),
    canal = NOTIF_CONFIG.fournisseur,
    envoi = NOTIF_FOURNISSEURS[canal];
  if (!NOTIF_TELRE.test(tel)) return { ok: false, erreur: "Numéro de téléphone invalide." };
  if (msg.length < 1 || msg.length > 1000) return { ok: false, erreur: "Message vide ou trop long (1000 caractères maximum)." };
  if (!envoi) return { ok: false, erreur: "Fournisseur inconnu : " + canal };
  const ins = await sb
    .from("notifications_whatsapp")
    .insert({ commune_id: o.commune_id || S.cid, demande_id: o.demande_id || null, destinataire_telephone: tel, message: msg, canal })
    .select("id")
    .single();
  if (ins.error || !ins.data) return { ok: false, erreur: "Trace impossible : " + ((ins.error || {}).message || "erreur inconnue") };
  const id = ins.data.id;
  try {
    await envoi(tel, msg);
    await sb.from("notifications_whatsapp").update({ statut: "succes" }).eq("id", id);
    return { ok: true, id };
  } catch (e) {
    const er = String((e && e.message) || "Échec d’envoi").slice(0, 300);
    await sb.from("notifications_whatsapp").update({ statut: "echec", erreur: er }).eq("id", id);
    return { ok: false, id, erreur: er };
  }
}
/* ---------- Interface Mairie ---------- */
E0.notif_wa = [];
LG.notif_wa = [
  () => LQ("notifications_whatsapp").order("created_at", { ascending: false }).limit(200),
  r => {
    S.db.notif_wa = r || [];
  }
];
const NT = { tab: "dem", sel: null, msg: "", q: "" },
  NTL = {
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
  ntE = x => esc(x == null ? "" : String(x)),
  ntNZ = s =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase(),
  ntDt = x => {
    const d = x ? new Date(x) : null;
    return d && !isNaN(d) ? d.toLocaleDateString("fr-FR") + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—";
  };
const notifTelephone = d =>
  [d && d.telephone, d && d.contact].map(x => String(x || "").replace(/\s+/g, " ").trim()).find(x => NOTIF_TELRE.test(x)) || "";
/* Modèles de message selon le statut de la demande */
function notifTexte(d) {
  const ref = d.numero,
    rp = String(d.reponse || "").trim(),
    T = {
      nouvelle: `votre demande n° ${ref} a bien été reçue par la mairie.`,
      orientee: `votre demande n° ${ref} a été transmise au service compétent.`,
      en_cours: `votre demande n° ${ref} est en cours de traitement.`,
      a_valider: `votre demande n° ${ref} est en cours de vérification.`,
      acceptee: `votre demande n° ${ref} a été acceptée.${rp ? " " + rp : ""}`,
      traitee: `votre demande n° ${ref} a été validée.${rp ? " " + rp : ""}`,
      pret_a_retirer: `votre document (demande n° ${ref}) est prêt : vous pouvez le retirer en mairie.${rp ? " " + rp : ""}`,
      en_attente_pieces: `pour poursuivre votre demande n° ${ref}, merci de fournir : ${rp || "les pièces demandées par la mairie"}`,
      rejetee: `votre demande n° ${ref} a été rejetée.${rp ? " Motif : " + rp : ""}`,
      redirigee: `votre demande n° ${ref} a été réorientée vers l’organisme compétent.${rp ? " " + rp : ""}`,
      cloturee: `votre dossier n° ${ref} est clôturé.`
    };
  return (`Bonjour ${d.nom || ""}, ` + (T[d.statut] || `le statut de votre demande n° ${ref} a changé : ${NTL[d.statut] || d.statut}.`) + `\n— Mairie de ${S.co || ""}`).slice(0, 1000);
}
const ntResultat = (r, tel) => {
  S.err = r.ok ? "Message WhatsApp envoyé au " + tel + "." : "Envoi WhatsApp échoué : " + r.erreur + (r.id ? " (trace conservée dans l’historique)." : "");
};
/* Appelée par js/actions.js après un changement de statut réussi : propose d'avertir le citoyen */
async function notifProposer(demandeId, statut) {
  if (!NOTIF_CONFIG.proposerAuChangementDeStatut || S.sa) return;
  try {
    await load(["dem_pay", "notif_wa"]);
    const d = D().dem_pay.find(x => x.id == demandeId),
      tel = d ? notifTelephone(d) : "";
    if (!d || !tel) return;
    if (!confirm("Prévenir le citoyen par WhatsApp (" + tel + ") : statut « " + (NTL[statut] || statut) + " » ?")) return;
    ntResultat(await envoyerNotification(tel, notifTexte(d), { commune_id: S.cid, demande_id: d.id }), tel);
    await load(["notif_wa"]);
  } catch (x) {
    S.err = x.message || "Notification impossible.";
  }
  render();
}
const ntPanel = () => {
  const d = D().dem_pay.find(x => x.id == NT.sel);
  if (!d) return "";
  const tel = notifTelephone(d);
  return pn(
    "Notifier le citoyen",
    "mail",
    `<p class="mut">${ntE(d.nom || "")} · N° ${ntE(d.numero)} · WhatsApp ${ntE(tel)}</p><label for="nt_msg">Message</label><textarea id="nt_msg" rows="6" maxlength="1000">${ntE(NT.msg)}</textarea><p><button class="bt" data-m="ntsend" data-id="${ntE(d.id)}">Envoyer sur WhatsApp</button> <button class="bo" data-m="ntx">Annuler</button></p>` +
      emp("Fournisseur : " + ntE(NOTIF_CONFIG.fournisseur) + (NOTIF_CONFIG.fournisseur == "waha" ? " (" + ntE(WAHA_API_URL) + ")" : "") + ". Chaque envoi est tracé dans l’historique.")
  );
};
const ntDem = () => {
  const q = ntNZ(NT.q),
    V = D()
      .dem_pay.filter(d => !q || ntNZ([d.nom, d.numero, d.objet, d.type].join(" ")).includes(q))
      .slice(0, 100);
  return (
    ntPanel() +
    pn(
      "Demandes",
      "doc",
      `<label for="nt_q">Rechercher (nom, n° de dossier, objet)</label><input id="nt_q" type="search" maxlength="80" value="${ntE(NT.q)}">` +
        (V.map(d => {
          const tel = notifTelephone(d);
          return rw(
            `<div><b>${ntE(d.objet || d.type || "Demande")}</b><div class="mut">${ntE(d.nom || "")} · N° ${ntE(d.numero)} · ${ntE(NTL[d.statut] || d.statut)}</div><div class="mut">${tel ? "WhatsApp : " + ntE(tel) : "Aucun numéro de téléphone"}</div></div>`,
            tel ? `<button class="bt" data-m="ntopen" data-id="${ntE(d.id)}">Notifier le citoyen</button>` : `<button class="bo" disabled>Pas de numéro</button>`
          );
        }).join("") || emp("Aucune demande."))
    )
  );
};
const ntHist = () =>
  pn(
    "Historique des notifications",
    "mail",
    D()
      .notif_wa.map(n =>
        rw(
          `<div><b>${ntE(n.destinataire_telephone)}</b><div class="mut">${ntE(ntDt(n.date_envoi || n.created_at))}</div><div class="mut">${ntE(String(n.message).slice(0, 160))}${String(n.message).length > 160 ? "…" : ""}</div>${n.erreur ? `<div class="mut">Erreur : ${ntE(n.erreur)}</div>` : ""}</div>`,
          st2({ succes: "Succès", echec: "Échec", en_attente: "En attente" }[n.statut] || n.statut, n.statut == "succes" ? "ok" : n.statut == "echec" ? "rd" : "")
        )
      )
      .join("") || emp("Aucune notification envoyée pour le moment.")
  );
const notifView = () =>
  `<div class="tabs">${[
    ["dem", "Demandes"],
    ["hist", "Historique (" + D().notif_wa.length + ")"]
  ]
    .map(x => `<button class="tb2${NT.tab == x[0] ? " on" : ""}" data-m="nttab" data-v="${x[0]}">${ntE(x[1])}</button>`)
    .join("")}</div>` + (NT.tab == "hist" ? ntHist() : ntDem());
const ntAt = SP.administration.subs.findIndex(x => x[0] == "registre");
SP.administration.subs.splice((ntAt >= 0 ? ntAt : Math.max(0, SP.administration.subs.findIndex(x => x[0] == "civil"))) + 1, 0, ["notifwa", "Notifications WhatsApp"]);
RP.notifwa = ["maire", "adjoint", "cabinet", "secretariat", "agent", "etat_civil"];
SPL.notifwa = "Notifications WhatsApp";
SUB.notifwa = notifView;
document.addEventListener("click", async e => {
  const t = e.target && e.target.closest && e.target.closest("[data-m^=nt]");
  if (!t || S.sa || !/^nt(tab|open|send|x|wa)$/.test(t.dataset.m)) return;
  const m = t.dataset.m;
  S.err = "";
  try {
    if (m == "nttab") {
      NT.tab = t.dataset.v == "hist" ? "hist" : "dem";
      NT.sel = null;
      render();
    } else if (m == "ntopen") {
      const d = D().dem_pay.find(x => x.id == t.dataset.id);
      if (!d) return;
      NT.sel = d.id;
      NT.msg = notifTexte(d);
      render();
      window.scrollTo(0, 0);
    } else if (m == "ntwa") {
      /* Bouton « Notifier le citoyen par WhatsApp » du détail d'une demande */
      if (t.disabled) return;
      t.disabled = true;
      await load(["dem_pay"]);
      const d = D().dem_pay.find(x => x.id == t.dataset.id),
        tel = d ? notifTelephone(d) : "";
      if (!d) throw new Error("Demande introuvable.");
      if (!tel) throw new Error("Aucun numéro de téléphone associé à cette demande.");
      const msg = `Bonjour ${d.nom || ""}, votre demande ${d.type || d.objet || ""} (n° ${d.numero}) est prête à être retirée en mairie.\n— Mairie de ${S.co || ""}`.slice(0, 1000);
      ntResultat(await envoyerNotification(tel, msg, { commune_id: S.cid, demande_id: d.id }), tel);
      await load(["notif_wa"]);
      render();
      window.scrollTo(0, 0);
    } else if (m == "ntx") {
      NT.sel = null;
      render();
    } else if (m == "ntsend") {
      const d = D().dem_pay.find(x => x.id == t.dataset.id),
        tel = d ? notifTelephone(d) : "",
        msg = ((($("#nt_msg") || {}).value || "") + "").trim();
      if (!d || !tel) throw new Error("Aucun numéro de téléphone pour cette demande.");
      ntResultat(await envoyerNotification(tel, msg, { commune_id: S.cid, demande_id: d.id }), tel);
      NT.sel = null;
      await load(["notif_wa"]);
      render();
      window.scrollTo(0, 0);
    }
  } catch (x) {
    S.err = x.message || "Erreur réseau.";
    render();
    window.scrollTo(0, 0);
  }
});
document.addEventListener("change", e => {
  const i = e.target;
  if (!i || S.sa || i.id != "nt_q") return;
  NT.q = i.value;
  render();
  const q = $("#nt_q");
  if (q) q.focus();
});
