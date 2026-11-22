// Envoi des SMS en file d'attente (sms_outbox). Appel : planificateur (pg_cron/pg_net ou Scheduled Trigger) avec en-tête x-sms-secret.
// Secrets : SMS_DISPATCH_SECRET, SMS_PROVIDER (dryrun | http-json | …), + SMS_HTTP_URL/SMS_HTTP_AUTH/SMS_SENDER_ID pour http-json. Sans fournisseur : 503, aucun envoi.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { makeProvider, normalizePhone, canSend, retryDelayMs, shouldGiveUp } from "./lib.mjs";
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const eq = (a: string, b: string) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
Deno.serve(async (req) => {
  if (req.method !== "POST") return J({ error: "Méthode refusée" }, 405);
  const secret = Deno.env.get("SMS_DISPATCH_SECRET") ?? "";
  const provider = makeProvider(Deno.env.toObject());
  if (!secret || !provider) return J({ error: "SMS non configuré" }, 503);
  if (!eq(req.headers.get("x-sms-secret") ?? "", secret)) return J({ error: "Accès refusé" }, 403);
  const ac = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const q = await ac.rpc("sms_prendre", { p_n: 20 });
  if (q.error) return J({ error: "Lecture impossible" }, 500);
  let sent = 0, failed = 0, skipped = 0;
  for (const m of (q.data ?? []) as { id: string; to_phone: string; body: string; attempts: number; actif: boolean; quota: number | null; utilises: number }[]) {
    const to = normalizePhone(m.to_phone);
    const d = to ? canSend({ actif: m.actif, quota: m.quota, utilises: m.utilises, body: m.body }) : { ok: false, raison: "numéro invalide" };
    if (!d.ok) { skipped++; await ac.rpc("sms_resultat", { p_id: m.id, p_ok: false, p_ref: null, p_err: (d as { raison: string }).raison, p_final: true, p_delay_s: 0 }); continue; }
    try { const r = await provider.send({ to: to!, body: m.body, ref: m.id }); sent++; await ac.rpc("sms_resultat", { p_id: m.id, p_ok: true, p_ref: r.ref, p_err: null, p_final: true, p_delay_s: 0 }); }
    catch (e) { failed++; const retry = (e as { retry?: boolean }).retry !== false; const give = !retry || shouldGiveUp(m.attempts + 1);
      await ac.rpc("sms_resultat", { p_id: m.id, p_ok: false, p_ref: null, p_err: String((e as Error).message).slice(0, 200), p_final: give, p_delay_s: Math.round(retryDelayMs(m.attempts) / 1000) }); }
  }
  return J({ envoyes: sent, echecs: failed, ignores: skipped });
});
