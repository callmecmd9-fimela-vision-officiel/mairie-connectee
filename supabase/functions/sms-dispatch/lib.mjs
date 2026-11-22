// Logique pure du module SMS (testable sans Deno) : numéros, modèles, segments, adaptateurs de fournisseur.
// Aucun fournisseur n'est imposé : un adaptateur = { name, send({to, body, ref}) -> {ref} } ; voir providers ci-dessous et docs/SMS_ARCHITECTURE.md.

/** Normalise un numéro en E.164. Sénégal par défaut (+221, mobiles 70/75/76/77/78, fixes 30/33/34). Retourne null si invalide. */
export function normalizePhone(raw, defaultCc = "221") {
  let s = String(raw ?? "").replace(/[\s.\-()]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (!s.startsWith("+")) s = "+" + defaultCc + s.replace(/^0+/, "");
  if (!/^\+[1-9]\d{7,14}$/.test(s)) return null;
  if (s.startsWith("+221") && !/^\+221(7[05678]|3[03348])\d{7}$/.test(s)) return null;
  return s;
}

/** Modèles par langue ; « fr » est la référence. wo/sr : à compléter APRÈS validation linguistique (voir docs/I18N_WOLOF_SERERE.md). */
export const TEMPLATES = {
  fr: {
    demande_recue: "{commune} : votre demande {numero} est enregistrée. Suivi : {lien}",
    statut_change: "{commune} : votre dossier {numero} est passé à « {statut} ». Détails : {lien}",
    pret_a_retirer: "{commune} : votre document (dossier {numero}) est prêt. Retrait au guichet avec une pièce d’identité.",
    rdv_confirme: "{commune} : rendez-vous confirmé le {date} à {heure}. Pour annuler : {lien}",
    rdv_rappel: "{commune} : rappel de votre rendez-vous demain {date} à {heure}.",
    code_otp: "{commune} : votre code de connexion est {code}. Ne le communiquez à personne.",
  },
  wo: {}, sr: {}, // vides tant que non validés : repli automatique sur « fr »
};

export function render(template, lang, vars = {}) {
  const t = (TEMPLATES[lang] && TEMPLATES[lang][template]) || TEMPLATES.fr[template];
  if (!t) throw new Error("modèle inconnu : " + template);
  return t.replace(/\{(\w+)\}/g, (_, k) => {
    if (vars[k] === undefined || vars[k] === null) throw new Error("variable manquante : " + k);
    return String(vars[k]).replace(/[\r\n]+/g, " ").slice(0, 160);
  });
}

const GSM7 = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const EXT = "^{}\\[~]|€";
/** Nombre de segments facturés (GSM-7 : 160/153 ; sinon UCS-2 : 70/67). Les accents hors GSM-7 (ex. « ç », « î ») basculent en UCS-2 : coût ×2,3. */
export function segments(body) {
  let gsm = true, len = 0;
  for (const ch of String(body)) { if (GSM7.includes(ch)) len++; else if (EXT.includes(ch)) len += 2; else { gsm = false; break; } }
  if (gsm) return { encoding: "GSM-7", length: len, segments: len <= 160 ? 1 : Math.ceil(len / 153) };
  const n = [...String(body)].length;
  return { encoding: "UCS-2", length: n, segments: n <= 70 ? 1 : Math.ceil(n / 67) };
}

/** Décision d'envoi pour une commune : actif, quota mensuel, longueur. */
export function canSend({ actif, quota, utilises, body }) {
  if (!actif) return { ok: false, raison: "SMS désactivés pour cette commune" };
  const seg = segments(body).segments;
  if (seg > 3) return { ok: false, raison: "message trop long (> 3 segments)" };
  if (quota != null && utilises + seg > quota) return { ok: false, raison: "quota mensuel atteint" };
  return { ok: true, segments: seg };
}

/** Reprise : délais croissants, abandon après 5 essais. */
export const retryDelayMs = (attempt) => [60e3, 5 * 60e3, 30 * 60e3, 2 * 3600e3, 6 * 3600e3][Math.min(attempt, 4)];
export const shouldGiveUp = (attempt) => attempt >= 5;

/** Adaptateurs. « dryrun » n'envoie rien (journal). « http-json » : n'importe quel fournisseur à API HTTP/JSON, configuré par secrets, sans modifier le code. */
export function makeProvider(env, fetchImpl = globalThis.fetch) {
  const name = (env.SMS_PROVIDER || "").toLowerCase();
  if (!name) return null; // non configuré : aucun envoi (fail-closed)
  if (name === "dryrun") return { name, send: async ({ to, body }) => ({ ref: "dry-" + to.slice(-4) + "-" + body.length }) };
  if (name === "http-json") {
    const url = env.SMS_HTTP_URL, tpl = env.SMS_HTTP_BODY || '{"to":"{to}","text":"{body}","from":"{sender}"}';
    if (!url || !/^https:\/\//.test(url)) return null;
    const hdr = { "Content-Type": "application/json" };
    if (env.SMS_HTTP_AUTH) hdr[env.SMS_HTTP_AUTH_HEADER || "Authorization"] = env.SMS_HTTP_AUTH;
    const q = (v) => JSON.stringify(String(v)).slice(1, -1);
    return { name, send: async ({ to, body, ref }) => {
      const payload = tpl.replace(/\{(to|body|sender|ref)\}/g, (_, k) => q({ to, body, sender: env.SMS_SENDER_ID || "", ref }[k]));
      const r = await fetchImpl(url, { method: "POST", headers: hdr, body: payload });
      if (!r.ok) { const e = new Error("fournisseur HTTP " + r.status); e.retry = r.status >= 500 || r.status === 429; throw e; }
      let j = {}; try { j = await r.json(); } catch (_) {}
      return { ref: String(j.id ?? j.message_id ?? j.messageId ?? ref) };
    } };
  }
  return null; // autre nom : ajouter un adaptateur ici (une fonction, sans toucher au reste)
}
