// Manifest PWA propre à une commune, servi par une URL réelle (indispensable à l'installation Android / WebAPK : un manifest « blob: » n'est pas installable).
// Public (verify_jwt = false) : n'expose que des informations déjà publiques (nom, couleur, icônes publiées). GET ?c=<slug>&o=<origine https du portail>
const SB = Deno.env.get("SUPABASE_URL") ?? "";
const KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const H = {
  "Content-Type": "application/manifest+json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=300",
};
const rpc = async (fn: string, slug: string) => {
  const r = await fetch(`${SB}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(fn === "commune_par_slug" ? { p_slug: slug } : { p_commune: slug }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  return Array.isArray(j) ? j[0] ?? null : null;
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: H });
  const u = new URL(req.url);
  const slug = (u.searchParams.get("c") ?? "").toLowerCase();
  let origin = "";
  try {
    const o = new URL(u.searchParams.get("o") ?? "");
    if (o.protocol === "https:") origin = o.origin;
  } catch (_) { /* origine absente ou invalide */ }
  if (!/^[a-z0-9-]{1,40}$/.test(slug) || !origin) return new Response("{}", { status: 400, headers: H });
  const c = await rpc("commune_par_slug", slug);
  if (!c) return new Response("{}", { status: 404, headers: H });
  const id = await rpc("identite_commune", slug);
  const col = id && /^#[0-9a-f]{6}$/i.test(id.couleur ?? "") ? id.couleur : "#0B5A2E";
  const base = `${SB}/storage/v1/object/public/icones-pwa/${c.id}/`;
  let custom = false;
  try {
    custom = (await fetch(base + "icon-192.png", { method: "HEAD" })).ok;
  } catch (_) { /* icônes par défaut */ }
  const icons = custom
    ? [
      { src: base + "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: base + "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: base + "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ]
    : [
      { src: origin + "/icon-defaut-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: origin + "/icon-defaut-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: origin + "/icon-defaut-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ];
  const nom = String(c.nom ?? "").replace(/^Commune de\s+/i, "");
  const m = {
    id: `/?c=${slug}`,
    name: `Mairie de ${nom}`,
    short_name: nom.slice(0, 12) || "Mairie",
    description: `Services municipaux de ${nom}`,
    lang: "fr",
    start_url: `${origin}/?c=${slug}`,
    scope: `${origin}/`,
    display: "standalone",
    orientation: "portrait",
    theme_color: col,
    background_color: "#F3F6F1",
    icons,
  };
  return new Response(JSON.stringify(m), { status: 200, headers: H });
});
