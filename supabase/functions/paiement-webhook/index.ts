// Webhook des paiements mobiles Wave / Orange Money : vérifie l'authenticité de l'appel, puis rapproche le paiement
// avec la taxe via la RPC confirmer_paiement_mobile (service_role uniquement, idempotente).
// Déploiement : verify_jwt = false (config.toml) — l'authentification est assurée ICI par la signature ou le jeton secret.
// URL à déclarer chez le fournisseur : https://<projet>.supabase.co/functions/v1/paiement-webhook?provider=wave | orange_money
// Secrets : WAVE_WEBHOOK_SECRET (ou WAVE_API_KEY), OM_API_KEY, [WAVE_TIMESTAMP_TOLERANCE_SECONDS] ; SUPABASE_URL et
// SUPABASE_SERVICE_ROLE_KEY sont fournis par Supabase. Un secret absent => 503 (aucun paiement n'est accepté).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { MAX_BODY, parseEvent, providerFrom, verifyOm, verifyWave } from "./lib.mjs";

const J = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const log = (o: Record<string, unknown>) => console.log(JSON.stringify({ fn: "paiement-webhook", ...o }));

Deno.serve(async (req) => {
  if (req.method !== "POST") return J({ error: "Méthode refusée" }, 405);

  const provider = providerFrom(req.url, req.headers);
  if (!provider) return J({ error: "Fournisseur inconnu" }, 400);

  const secret =
    provider === "wave"
      ? Deno.env.get("WAVE_WEBHOOK_SECRET") || Deno.env.get("WAVE_API_KEY") || ""
      : Deno.env.get("OM_API_KEY") || "";
  if (!secret) {
    log({ provider, etat: "secret_absent" });
    return J({ error: "Paiement mobile non configuré" }, 503);
  }

  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > MAX_BODY) return J({ error: "Corps trop volumineux" }, 413);
  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY) return J({ error: "Corps trop volumineux" }, 413);

  // 1) Authenticité : signature HMAC ou jeton secret partagé, vérifiés sur le corps BRUT avant tout traitement.
  const authentique =
    provider === "wave"
      ? await verifyWave({ rawBody, headers: req.headers, secret, tolerance: Number(Deno.env.get("WAVE_TIMESTAMP_TOLERANCE_SECONDS") || 0) })
      : await verifyOm({ rawBody, headers: req.headers, secret });
  if (!authentique) {
    log({ provider, etat: "signature_refusee" });
    return J({ error: "Accès refusé" }, 401);
  }

  let corps: unknown;
  try {
    corps = JSON.parse(rawBody);
  } catch {
    return J({ error: "JSON invalide" }, 400);
  }
  const ev = parseEvent(provider, corps);
  if (ev.kind === "ignore") return J({ ok: true, ignore: true });
  if (ev.kind === "invalid") {
    log({ provider, etat: "evenement_invalide" });
    return J({ error: "Événement invalide" }, 422);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // 2) Rapprochement
  if (ev.kind === "failed") {
    const r = await admin.rpc("echouer_paiement_mobile", { p_reference_taxe: ev.reference, p_provider: provider });
    if (r.error) {
      log({ provider, etat: "echec_rpc", code: r.error.code, reference: ev.reference });
      return J({ error: "Traitement impossible" }, 500);
    }
    return J({ ok: true });
  }

  const r = await admin.rpc("confirmer_paiement_mobile", {
    p_reference_taxe: ev.reference,
    p_provider_tx_id: ev.txId,
    p_provider: provider,
    p_montant: ev.montant,
  });
  if (r.error) {
    const permanent = ["P0002", "22023"].includes(r.error.code ?? "");
    log({ provider, etat: "echec_rpc", code: r.error.code, reference: ev.reference, tx: ev.txId });
    // Erreur permanente (référence inconnue, paramètre invalide) : inutile que le fournisseur réessaie.
    return permanent ? J({ error: "Rapprochement impossible" }, 422) : J({ error: "Traitement impossible" }, 500);
  }
  const d = (r.data ?? {}) as { succes?: boolean; code?: string; deja_traite?: boolean; num_quittance?: string };
  if (!d.succes) {
    // Anomalie métier (montant incorrect, rôle déjà payé…) : tracée en base (audit_log) ; 200 pour stopper les relances,
    // l'équipe finances traite le cas (remboursement). Aucune quittance n'a été émise.
    log({ provider, etat: "anomalie", code: d.code, reference: ev.reference, tx: ev.txId });
    return J({ ok: false, code: d.code ?? "anomalie" });
  }
  log({ provider, etat: d.deja_traite ? "deja_traite" : "confirme", reference: ev.reference, tx: ev.txId });
  return J({ ok: true, deja_traite: !!d.deja_traite, num_quittance: d.num_quittance });
});
