// Logique pure du webhook de paiement mobile (testable sous Node : tests/paiement-webhook.test.js).
// Aucune dépendance Deno ici : seul globalThis.crypto (WebCrypto) est utilisé.

const enc = new TextEncoder();
export const MAX_BODY = 65536;
export const REF_RE = /^PAY-TAXE-[0-9]{4}-[0-9]{6}$/;
export const TX_RE = /^[A-Za-z0-9._:-]{3,100}$/;

const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

// Comparaison à temps constant, sans fuite de longueur : on compare les empreintes SHA-256.
export async function safeEqual(a, b) {
  const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(String(a))), crypto.subtle.digest("SHA-256", enc.encode(String(b)))]);
  const u = new Uint8Array(x), v = new Uint8Array(y);
  let d = 0;
  for (let i = 0; i < u.length; i++) d |= u[i] ^ v[i];
  return d === 0;
}

const bearer = (h) => {
  const m = /^Bearer\s+(.+)$/i.exec(h || "");
  return m ? m[1].trim() : "";
};

/* Wave : soit signature HMAC-SHA256 (en-tête Wave-Signature : t=<horodatage>,v1=<hex>), soit secret partagé
   (Authorization: Bearer <secret>). Le secret vient de WAVE_WEBHOOK_SECRET (à défaut WAVE_API_KEY).
   Le contenu signé est « <t><corps brut> » ou « <t>.<corps brut> » selon la version de la documentation Wave : les deux sont acceptés.
   tolerance (secondes, 0 = désactivée) : un rejeu d'un message authentique reste de toute façon sans effet (idempotence SQL). */
export async function verifyWave({ rawBody, headers, secret, tolerance = 0, now = Date.now() }) {
  if (!secret) return false;
  const sig = headers.get("wave-signature") || headers.get("x-wave-signature");
  if (sig) {
    const parts = {};
    const v1s = [];
    for (const kv of sig.split(",")) {
      const i = kv.indexOf("=");
      if (i < 1) continue;
      const k = kv.slice(0, i).trim(), v = kv.slice(i + 1).trim();
      if (k === "v1") v1s.push(v.toLowerCase());
      else parts[k] = v;
    }
    const t = parts.t;
    if (!t || !/^[0-9]{9,13}$/.test(t) || !v1s.length) return false;
    if (tolerance > 0 && Math.abs(now / 1000 - Number(t)) > tolerance) return false;
    const cands = [await hmacHex(secret, t + rawBody), await hmacHex(secret, t + "." + rawBody)];
    for (const v1 of v1s) for (const c of cands) if (await safeEqual(v1, c)) return true;
    return false;
  }
  const tok = bearer(headers.get("authorization"));
  return tok ? safeEqual(tok, secret) : false;
}

/* Orange Money : jeton secret partagé (Authorization: Bearer, x-api-key ou x-om-token) comparé à OM_API_KEY,
   ou signature HMAC-SHA256 hex du corps brut (x-om-signature, préfixe « sha256= » toléré) avec la même clé. */
export async function verifyOm({ rawBody, headers, secret }) {
  if (!secret) return false;
  const sig = (headers.get("x-om-signature") || "").replace(/^sha256=/i, "").trim().toLowerCase();
  if (sig) return safeEqual(sig, await hmacHex(secret, rawBody));
  const tok = bearer(headers.get("authorization")) || headers.get("x-api-key") || headers.get("x-om-token") || "";
  return tok ? safeEqual(tok, secret) : false;
}

const pick = (o, paths) => {
  for (const p of paths) {
    let v = o;
    for (const k of p.split(".")) v = v == null ? undefined : v[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

// Montant strictement numérique (entier ou 2 décimales max) ; sinon null. Aucun arrondi silencieux.
export function parseAmount(v) {
  if (v && typeof v === "object") v = pick(v, ["value", "amount"]);
  if (typeof v === "number") v = Number.isFinite(v) ? String(v) : "";
  if (typeof v !== "string" || !/^[0-9]{1,13}(\.[0-9]{1,2})?$/.test(v.trim())) return null;
  const n = Number(v.trim());
  return n > 0 ? n : null;
}

const OM_OK = new Set(["SUCCESS", "SUCCESSFUL", "SUCCEEDED", "COMPLETED", "PAID"]);
const OM_KO = new Set(["FAILED", "FAILURE", "CANCELLED", "CANCELED", "REJECTED", "EXPIRED"]);
const WAVE_OK = new Set(["checkout.session.completed", "checkout.paid", "checkout.completed"]);
const WAVE_KO = new Set(["checkout.session.payment_failed", "checkout.payment_failed"]);

/* Normalise un événement fournisseur : { kind: "paid" | "failed" | "ignore" | "invalid", reference, txId, montant }. */
export function parseEvent(provider, body) {
  if (!body || typeof body !== "object") return { kind: "invalid" };
  let kind = "ignore", reference, txId, amount;
  if (provider === "wave") {
    const type = String(pick(body, ["type", "event_type"]) || "");
    const d = body.data && typeof body.data === "object" ? body.data : body;
    reference = pick(d, ["client_reference"]);
    if (WAVE_OK.has(type)) {
      const ps = pick(d, ["payment_status"]);
      kind = ps && String(ps).toLowerCase() !== "succeeded" ? "ignore" : "paid";
      const cur = pick(d, ["currency"]);
      if (kind === "paid" && cur && String(cur).toUpperCase() !== "XOF") return { kind: "invalid" };
    } else if (WAVE_KO.has(type)) kind = "failed";
    txId = pick(d, ["transaction_id", "id"]);
    amount = pick(d, ["amount"]);
  } else if (provider === "orange_money") {
    const st = String(pick(body, ["status", "state", "transactionStatus", "data.status"]) || "").toUpperCase();
    kind = OM_OK.has(st) ? "paid" : OM_KO.has(st) ? "failed" : "ignore";
    reference = pick(body, ["reference", "externalId", "external_id", "orderId", "order_id", "metadata.reference", "data.reference"]);
    txId = pick(body, ["transactionId", "transaction_id", "txnid", "txnId", "id", "data.transactionId"]);
    amount = pick(body, ["amount", "data.amount"]);
  } else return { kind: "invalid" };

  if (kind === "ignore") return { kind };
  reference = typeof reference === "string" ? reference.trim() : "";
  if (!REF_RE.test(reference)) return { kind: "invalid" };
  if (kind === "failed") return { kind, reference };
  txId = typeof txId === "string" || typeof txId === "number" ? String(txId).trim() : "";
  const montant = parseAmount(amount);
  if (!TX_RE.test(txId) || montant === null) return { kind: "invalid" };
  return { kind, reference, txId, montant };
}

export function providerFrom(url, headers) {
  const q = (new URL(url).searchParams.get("provider") || "").toLowerCase();
  if (q === "wave") return "wave";
  if (q === "orange_money" || q === "om" || q === "orange") return "orange_money";
  if (headers.get("wave-signature") || headers.get("x-wave-signature")) return "wave";
  return null;
}
