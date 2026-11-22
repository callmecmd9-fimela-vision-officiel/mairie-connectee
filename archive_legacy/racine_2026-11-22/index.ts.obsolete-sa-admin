// Edge Function « sa-admin » : opérations sensibles sur les comptes (clé service_role côté serveur uniquement).
// Déploiement : supabase functions deploy sa-admin   (verify_jwt activé par défaut)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const CORS = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const ROLES = ["maire", "adjoint", "cabinet", "secretariat", "finances", "rh", "etat_civil", "technique", "agent"];
const out = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const fail = (m: string, s = 400) => out({ error: m }, s);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("Méthode non autorisée", 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return fail("Non authentifié", 401);

  const ad = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: me } = await ad.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "super_admin") return fail("Accès refusé", 403);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return fail("Requête invalide"); }
  const action = String(b.action ?? "");
  if (action === "ping") return out({ ok: true });

  const str = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
  const audit = (commune: string | null, a: string, cible: string, detail: unknown) =>
    ad.from("journal_audit").insert({ commune_id: commune, user_id: user.id, email: user.email, action: a, cible, detail });
  const cible = async (id: string) => {
    const { data } = await ad.from("profiles").select("id, role, commune_id").eq("id", id).maybeSingle();
    return data;
  };
  const mdpMin = async (commune: string) => {
    const { data } = await ad.from("parametres_systeme").select("valeur").eq("commune_id", commune).eq("cle", "mdp_min").maybeSingle();
    const n = Number(data?.valeur);
    return n >= 8 && n <= 64 ? n : 12;
  };

  try {
    if (action === "creer") {
      const email = str(b.email).toLowerCase(), nom = str(b.nom, 120), service = str(b.service, 120), role = str(b.role);
      const pw = String(b.password ?? "");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("E-mail invalide");
      if (!nom) return fail("Nom requis");
      if (!ROLES.includes(role)) return fail("Rôle invalide");
      const { data: com } = await ad.from("communes").select("id").eq("slug", str(b.commune)).maybeSingle();
      if (!com) return fail("Commune introuvable");
      const min = await mdpMin(String(com.id));
      if (pw.length < min) return fail(`Mot de passe : ${min} caractères minimum`);
      const { data: cr, error } = await ad.auth.admin.createUser({ email, password: pw, email_confirm: true, user_metadata: { nom } });
      if (error || !cr.user) return fail(error?.message ?? "Création impossible");
      const { error: e2 } = await ad.from("profiles").upsert({ id: cr.user.id, role, commune_id: com.id, nom, service: service || null, actif: true });
      if (e2) { await ad.auth.admin.deleteUser(cr.user.id); return fail(e2.message); }
      await audit(String(com.id), "user_create", email, { role, nom });
      return out({ ok: true, id: cr.user.id });
    }

    const id = str(b.id, 60);
    if (!id) return fail("Compte manquant");
    const t = await cible(id);
    if (!t) return fail("Compte introuvable", 404);
    const com = t.commune_id ? String(t.commune_id) : null;
    const self = id === user.id, isSA = t.role === "super_admin";

    if (action === "modifier") {
      const patch: Record<string, unknown> = {};
      if (b.nom !== undefined) patch.nom = str(b.nom, 120);
      if (b.service !== undefined) patch.service = str(b.service, 120) || null;
      if (b.role !== undefined) {
        const role = str(b.role);
        if (!ROLES.includes(role)) return fail("Rôle invalide");
        if (self || isSA) return fail("Le rôle d'un super administrateur ne peut pas être modifié");
        patch.role = role;
      }
      if (!Object.keys(patch).length) return fail("Rien à modifier");
      const { error } = await ad.from("profiles").update(patch).eq("id", id);
      if (error) return fail(error.message);
      await audit(com, "user_update", id, patch);
      return out({ ok: true });
    }

    if (action === "activer") {
      const actif = b.actif === true;
      if (!actif && (self || isSA)) return fail("Ce compte ne peut pas être désactivé");
      const { error } = await ad.auth.admin.updateUserById(id, { ban_duration: actif ? "none" : "876000h" });
      if (error) return fail(error.message);
      await ad.from("profiles").update({ actif }).eq("id", id);
      if (!actif) await ad.rpc("_revoquer_sessions", { p_user: id });
      await audit(com, actif ? "user_enable" : "user_disable", id, null);
      return out({ ok: true });
    }

    if (action === "reinit_mdp") {
      const pw = String(b.password ?? "");
      const min = await mdpMin(com ?? "");
      if (pw.length < min) return fail(`Mot de passe : ${min} caractères minimum`);
      if (isSA && !self) return fail("Mot de passe d'un autre super administrateur non modifiable");
      const { error } = await ad.auth.admin.updateUserById(id, { password: pw });
      if (error) return fail(error.message);
      await ad.rpc("_revoquer_sessions", { p_user: id });
      await audit(com, "user_password", id, null);
      return out({ ok: true });
    }

    if (action === "supprimer") {
      if (self || isSA) return fail("Ce compte ne peut pas être supprimé");
      await ad.rpc("_revoquer_sessions", { p_user: id });
      const { error: e1 } = await ad.from("profiles").delete().eq("id", id);
      if (e1) return fail("Suppression impossible : " + e1.message);
      const { error } = await ad.auth.admin.deleteUser(id);
      if (error) return fail(error.message);
      await audit(com, "user_delete", id, null);
      return out({ ok: true });
    }

    return fail("Action inconnue");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Erreur serveur", 500);
  }
});
