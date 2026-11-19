// Purge hebdomadaire des pièces jointes orphelines (> 24 h, absentes de demandes.pieces). Auth : secret partagé (vault) vérifié par la RPC.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method !== "POST") return J({ error: "Méthode refusée" }, 405);
  const secret = req.headers.get("x-purge-secret") ?? "";
  if (!secret) return J({ error: "Accès refusé" }, 403);
  let dry = false; try { dry = !!(await req.json()).dry; } catch (_) {}
  const ac = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const r = await ac.rpc("pieces_orphelines", { p_secret: secret });
  if (r.error) return J({ error: "Accès refusé" }, 403);
  const names = (r.data ?? []).map((x: { name: string }) => x.name);
  if (dry || !names.length) return J({ orphelines: names.length, supprimees: 0, dry });
  const d = await ac.storage.from("pieces").remove(names);
  if (d.error) return J({ error: "Suppression impossible", orphelines: names.length }, 500);
  return J({ orphelines: names.length, supprimees: (d.data ?? []).length });
});
