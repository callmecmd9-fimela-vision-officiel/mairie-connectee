export async function authorizeIaUser({ caller, admin, communeSlug }) {
  const { data: authData, error: authError } = await caller.auth.getUser();
  const user = authData?.user;

  if (authError || !user || user.is_anonymous === true) {
    return { ok: false, status: 401, message: "Non connecté" };
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role,commune_id,actif")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.actif !== true) {
    return { ok: false, status: 403, message: "Accès refusé" };
  }

  if (profile.role === "super_admin") {
    // Le rôle seul ne suffit pas : la base exige une session AAL2.
    const { data: allowed, error: gateError } = await caller.rpc("is_super_admin");
    if (gateError || allowed !== true) {
      return { ok: false, status: 403, message: "Accès plateforme refusé (MFA AAL2 requise)" };
    }
  } else if (!["maire", "cabinet", "secretariat"].includes(profile.role)) {
    return { ok: false, status: 403, message: "Accès refusé" };
  }

  const { data: commune, error: communeError } = await admin
    .from("communes")
    .select("id,nom,statut")
    .eq("slug", communeSlug)
    .maybeSingle();

  if (communeError || !commune) {
    return { ok: false, status: 400, message: "Commune inconnue" };
  }

  if (!["essai", "actif"].includes(commune.statut)) {
    return { ok: false, status: 403, message: "Commune suspendue ou inactive" };
  }

  if (profile.role !== "super_admin" && profile.commune_id !== commune.id) {
    return { ok: false, status: 403, message: "Accès refusé" };
  }

  return { ok: true, user, profile, commune };
}
