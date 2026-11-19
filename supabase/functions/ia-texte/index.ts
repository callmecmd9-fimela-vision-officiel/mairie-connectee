import { createClient } from "npm:@supabase/supabase-js@2";
import { authorizeIaUser } from "./authz.mjs";

const ORIGINES = ["https://mairie-connectee.callmecmd9-916.workers.dev"];
const LIMITE_JOUR = 30;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": ORIGINES.includes(origin) ? origin : ORIGINES[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  const j = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return j({ error: "Méthode non autorisée" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = req.headers.get("Authorization") ?? "";
    if (!url || !anon || !service || !authorization.startsWith("Bearer ")) {
      return j({ error: "Configuration ou authentification invalide" }, 401);
    }

    const caller = createClient(url, anon, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let b: Record<string, unknown>;
    try {
      b = await req.json();
    } catch {
      return j({ error: "Requête invalide" }, 400);
    }

    const access = await authorizeIaUser({
      caller,
      admin,
      communeSlug: String(b.commune ?? "").trim(),
    });
    if (!access.ok) return j({ error: access.message }, access.status);

    const { user, commune } = access;
    const sujet = String(b.sujet ?? "").trim().slice(0, 300);
    const reseau = ["Facebook", "Instagram", "TikTok", "YouTube"].includes(String(b.reseau))
      ? String(b.reseau)
      : "Facebook";

    const jour = new Date().toISOString().slice(0, 10);
    const { data: u } = await admin.from("ia_usage").select("n")
      .eq("user_id", user.id).eq("jour", jour).maybeSingle();
    if ((u?.n ?? 0) >= LIMITE_JOUR) {
      return j({ error: "Limite quotidienne atteinte (" + LIMITE_JOUR + " demandes). Réessayez demain." }, 429);
    }

    const cle = Deno.env.get("ANTHROPIC_API_KEY");
    const cfId = Deno.env.get("CF_ACCOUNT_ID");
    const cfTok = Deno.env.get("CF_API_TOKEN");
    if (!cle && !(cfId && cfTok)) {
      return j({ error: "IA non configurée : ajoutez les clés dans les secrets de la fonction." }, 501);
    }

    const longueur: Record<string, string> = {
      Facebook: "350 caractères maximum",
      Instagram: "300 caractères maximum, suivis de 3 à 5 hashtags",
      TikTok: "150 caractères maximum, percutant",
      YouTube: "500 caractères maximum, comme description de vidéo",
    };
    const system = `Tu es la plume poétique du Maire de la commune de ${commune.nom} (Sénégal). Tu écris en français soutenu, chaleureux, imagé et élégant des textes pour les réseaux sociaux. Règles : texte original, sensible et digne ; aucune promesse politique chiffrée ni fait inventé ; aucun propos partisan ; respect de toutes les communautés ; évoque la terre, la mer, la lumière, les gens et le travail seulement si cela sert le sujet.`;
    const prompt = `Écris 3 propositions différentes pour ${reseau} (${longueur[reseau]}). Sujet : ${sujet || "un message d'attachement et d'espoir pour la commune"}. Sépare les 3 propositions par une ligne contenant uniquement ---. N'ajoute aucun commentaire.`;

    let texte = "";
    if (cle) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": cle, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5-5",
          max_tokens: 900,
          system,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!r.ok) return j({ error: "Service IA indisponible" }, 502);
      const d = await r.json();
      texte = (d.content ?? []).map((x: { text?: string }) => x.text ?? "").join("");
    } else {
      const modele = Deno.env.get("CF_MODEL") ?? "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
      const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfId}/ai/run/${modele}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${cfTok}`, "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
          max_tokens: 900,
        }),
      });
      if (!r.ok) return j({ error: "Service IA indisponible" }, 502);
      const d = await r.json();
      texte = d?.result?.response ?? "";
    }

    const textes = texte.split(/\n\s*-{3,}\s*\n/)
      .map((x: string) => x.replace(/^\s*\d+[.)]\s*/, "").trim())
      .filter((x: string) => x.length > 10)
      .slice(0, 3);
    if (!textes.length) return j({ error: "Réponse IA vide, réessayez." }, 502);

    await admin.from("ia_usage").upsert({ user_id: user.id, jour, n: (u?.n ?? 0) + 1 });
    return j({ textes });
  } catch (_e) {
    return j({ error: "Erreur serveur" }, 500);
  }
});
