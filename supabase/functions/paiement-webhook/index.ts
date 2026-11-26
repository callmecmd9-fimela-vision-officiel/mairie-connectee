// Webhook des paiements mobiles Wave / Orange Money, multi-communes avec mode sandbox / production.
// 1) la taxe (référence du payload) donne la commune ; 2) les paramètres de CETTE commune sont lus et déchiffrés
// (parametres_paiement_communes) ; 3) sandbox : simulation sans aucun appel au fournisseur, autorisée par le jeton de la commune ;
//    production : signature HMAC (ou jeton) du fournisseur ; 4) RPC confirmer_paiement_mobile (service_role, idempotente).
// Déploiement : verify_jwt = false (config.toml) — l'authentification est assurée ICI. Tout refus d'accès répond 401 sans détail.
// URL à déclarer chez le fournisseur : https://<projet>.supabase.co/functions/v1/paiement-webhook?provider=wave | orange_money
// Secret unique de la fonction : PAIEMENT_ENC_KEY (clé maîtresse de déchiffrement ; absente => 503). SUPABASE_URL et
// SUPABASE_SERVICE_ROLE_KEY sont fournis par Supabase. Les clés des communes ne sont jamais dans l'environnement.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { MAX_BODY, communeFromPayload, parseEvent, providerFrom, sandboxTx, verifyOm, verifySandbox, verifyWave } from "./lib.mjs";

const J = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const log = (o: Record<string, unknown>) => console.log(JSON.stringify({ fn: "paiement-webhook", ...o }));
const REFUS = () => J({ error: "Accès refusé" }, 401);

Deno.serve(async (req) => {
  if (req.method !== "POST") return J({ error: "Méthode refusée" }, 405);

  const provider = providerFrom(req.url, req.headers);
  if (!provider) return J({ error: "Fournisseur inconnu" }, 400);

  const cle = Deno.env.get("PAIEMENT_ENC_KEY") || "";
  if (cle.length < 16) {
    log({ provider, etat: "cle_maitresse_absente" });
    return J({ error: "Paiement mobile non configuré" }, 503);
  }

  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > MAX_BODY) return J({ error: "Corps trop volumineux" }, 413);
  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY) return J({ error: "Corps trop volumineux" }, 413);

  let corps: unknown;
  try {
    corps = JSON.parse(rawBody);
  } catch {
    return J({ error: "JSON invalide" }, 400);
  }
  // Lecture seule à ce stade : rien n'est modifié avant l'authentification.
  const ev = parseEvent(provider, corps);
  if (ev.kind === "ignore") return J({ ok: true, ignore: true });
  if (ev.kind === "invalid") {
    log({ provider, etat: "evenement_invalide" });
    return J({ error: "Événement invalide" }, 422);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // 1) Commune de la taxe (source de vérité : la base), recoupée avec l'identifiant éventuel du payload / de l'URL.
  const ref = await admin.rpc("resoudre_reference_taxe", { p_reference: ev.reference });
  const taxe = (ref.data ?? null) as { commune_id: string; montant_du: number } | null;
  if (ref.error || !taxe) {
    log({ provider, etat: ref.error ? "echec_rpc_reference" : "reference_inconnue" });
    return REFUS();
  }
  const declaree = communeFromPayload(corps, req.url);
  if (declaree && declaree !== String(taxe.commune_id).toLowerCase()) {
    log({ provider, etat: "commune_incoherente" });
    return REFUS();
  }

  // 2) Paramètres de la commune (déchiffrés côté base avec la clé maîtresse ; null si absents ou inactifs).
  const pr = await admin.rpc("lire_parametres_paiement", { p_commune: taxe.commune_id, p_fournisseur: provider, p_cle: cle });
  const param = (pr.data ?? null) as { mode: "sandbox" | "production"; api_key: string | null; api_secret: string | null } | null;
  if (pr.error || !param) {
    log({ provider, etat: pr.error ? "echec_rpc_parametres" : "parametres_absents", commune: taxe.commune_id });
    return REFUS();
  }

  // 3) Authentification selon le mode
  let authentique = false;
  if (param.mode === "sandbox") {
    // Simulation : aucun appel au fournisseur ; le jeton de la commune est exigé.
    authentique = await verifySandbox({ headers: req.headers, secret: param.api_secret ?? "" });
  } else if (provider === "wave") {
    authentique = await verifyWave({
      rawBody,
      headers: req.headers,
      secret: param.api_secret || param.api_key || "",
      tolerance: Number(Deno.env.get("WAVE_TIMESTAMP_TOLERANCE_SECONDS") || 0),
    });
  } else {
    authentique = await verifyOm({ rawBody, headers: req.headers, secret: param.api_key || "", hmacSecret: param.api_secret || param.api_key || "" });
  }
  if (!authentique) {
    log({ provider, mode: param.mode, etat: "authentification_refusee", commune: taxe.commune_id });
    return REFUS();
  }

  // 4) Rapprochement
  if (ev.kind === "failed") {
    const r = await admin.rpc("echouer_paiement_mobile", { p_reference_taxe: ev.reference, p_provider: provider });
    if (r.error) {
      log({ provider, etat: "echec_rpc", code: r.error.code, reference: ev.reference });
      return J({ error: "Traitement impossible" }, 500);
    }
    return J({ ok: true });
  }

  let txId = ev.txId;
  let montant = ev.montant;
  if (param.mode === "sandbox") {
    txId = sandboxTx(txId, ev.reference);
    montant = montant ?? Number(taxe.montant_du);
  } else if (!txId || montant === null) {
    log({ provider, etat: "transaction_ou_montant_manquant", reference: ev.reference });
    return J({ error: "Événement invalide" }, 422);
  }

  const r = await admin.rpc("confirmer_paiement_mobile", {
    p_reference_taxe: ev.reference,
    p_provider_tx_id: txId,
    p_provider: provider,
    p_montant: montant,
  });
  if (r.error) {
    const permanent = ["P0002", "22023", "55000"].includes(r.error.code ?? "");
    log({ provider, mode: param.mode, etat: "echec_rpc", code: r.error.code, reference: ev.reference, tx: txId });
    // Erreur permanente (référence inconnue, paramètre invalide, fournisseur non configuré) : inutile de réessayer.
    return permanent ? J({ error: "Rapprochement impossible" }, 422) : J({ error: "Traitement impossible" }, 500);
  }
  const d = (r.data ?? {}) as { succes?: boolean; code?: string; deja_traite?: boolean; num_quittance?: string };
  if (!d.succes) {
    // Anomalie métier (montant incorrect, rôle déjà payé…) : tracée en base (audit_log) ; 200 pour stopper les relances.
    log({ provider, mode: param.mode, etat: "anomalie", code: d.code, reference: ev.reference, tx: txId });
    return J({ ok: false, code: d.code ?? "anomalie" });
  }
  log({ provider, mode: param.mode, etat: d.deja_traite ? "deja_traite" : "confirme", reference: ev.reference, tx: txId });
  return J({ ok: true, mode: param.mode, deja_traite: !!d.deja_traite, num_quittance: d.num_quittance });
});
