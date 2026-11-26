// Envoi des notifications push Web à la création d'une ligne citoyen_notifications (Database Webhook INSERT).
// Secrets requis : PUSH_WEBHOOK_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:… ou https://…). Sans eux : 503, rien n'est envoyé.
// Le contenu envoyé est volontairement minimal (titre + court extrait + n° de dossier) : aucune donnée personnelle sensible dans la charge utile.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import webpush from "web-push";
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const eq = (a: string, b: string) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
Deno.serve(async (req) => {
  if (req.method !== "POST") return J({ error: "Méthode refusée" }, 405);
  const secret = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "", pub = Deno.env.get("VAPID_PUBLIC_KEY") ?? "", prv = Deno.env.get("VAPID_PRIVATE_KEY") ?? "", sub = Deno.env.get("VAPID_SUBJECT") ?? "";
  if (!secret || !pub || !prv || !sub) return J({ error: "Push non configuré" }, 503);
  if (!eq(req.headers.get("x-push-secret") ?? "", secret)) return J({ error: "Accès refusé" }, 403);
  let ev: { type?: string; table?: string; record?: Record<string, unknown> };
  try { ev = await req.json(); } catch (_) { return J({ error: "Requête invalide" }, 400); }
  if (ev.type !== "INSERT" || ev.table !== "citoyen_notifications" || !ev.record) return J({ ignored: true });
  const r = ev.record, uid = String(r.user_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(uid)) return J({ error: "Requête invalide" }, 400);
  webpush.setVapidDetails(sub, pub, prv);
  const ac = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const q = await ac.rpc("push_abonnements", { p_user: uid });
  if (q.error) return J({ error: "Lecture impossible" }, 500);
  const payload = JSON.stringify({ t: String(r.titre ?? "Mairie").slice(0, 80), b: String(r.corps ?? "").slice(0, 120), n: String(r.id ?? ""), d: String(r.demande_id ?? "") });
  let ok = 0, ko = 0;
  for (const s of (q.data ?? []) as { endpoint: string; p256dh: string; auth: string }[]) {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400, urgency: "normal" }); ok++; await ac.rpc("push_resultat", { p_endpoint: s.endpoint, p_ok: true }); }
    catch (e) { ko++; const c = (e as { statusCode?: number }).statusCode; await ac.rpc("push_resultat", { p_endpoint: s.endpoint, p_ok: false, p_gone: c === 404 || c === 410 }); }
  }
  return J({ envoyes: ok, echecs: ko });
});
