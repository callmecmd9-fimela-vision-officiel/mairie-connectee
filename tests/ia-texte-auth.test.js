const assert = require("node:assert/strict");

(async () => {
  const { authorizeIaUser } = await import("../supabase/functions/ia-texte/authz.mjs");
  let failures = 0;
  const test = async (name, fn) => {
    try { await fn(); console.log("OK  ", name); }
    catch (error) { failures++; console.error("FAIL", name, error); }
  };

  function setup({ user = { id: "u1", is_anonymous: false }, authError = null,
    profile = { role: "maire", commune_id: "c1", actif: true },
    commune = { id: "c1", nom: "Fimela" }, gate = false, gateError = null } = {}) {
    const queries = [];
    const rpcCalls = [];
    const caller = {
      auth: { getUser: async () => ({ data: { user }, error: authError }) },
      rpc: async (name) => {
        rpcCalls.push(name);
        return { data: gate, error: gateError };
      },
    };
    const admin = {
      from(table) {
        const q = {
          select() { return q; },
          eq() { return q; },
          async maybeSingle() {
            queries.push(table);
            return table === "profiles"
              ? { data: profile, error: null }
              : { data: commune, error: null };
          },
        };
        return q;
      },
    };
    return { caller, admin, queries, rpcCalls };
  }

  await test("refuse une session absente", async () => {
    const x = setup({ user: null });
    const r = await authorizeIaUser({ ...x, communeSlug: "fimela" });
    assert.equal(r.ok, false);
    assert.equal(r.status, 401);
    assert.deepEqual(x.queries, []);
  });

  await test("refuse les sessions Auth anonymes", async () => {
    const x = setup({ user: { id: "anon", is_anonymous: true } });
    const r = await authorizeIaUser({ ...x, communeSlug: "fimela" });
    assert.equal(r.ok, false);
    assert.equal(r.status, 401);
    assert.deepEqual(x.queries, []);
  });

  await test("refuse un profil absent ou inactif", async () => {
    const x = setup({ profile: { role: "maire", commune_id: "c1", actif: false } });
    const r = await authorizeIaUser({ ...x, communeSlug: "fimela" });
    assert.equal(r.ok, false);
    assert.equal(r.status, 403);
    assert.deepEqual(x.queries, ["profiles"]);
  });

  await test("refuse un rôle non autorisé", async () => {
    const x = setup({ profile: { role: "citoyen", commune_id: "c1", actif: true } });
    const r = await authorizeIaUser({ ...x, communeSlug: "fimela" });
    assert.equal(r.ok, false);
    assert.equal(r.status, 403);
    assert.deepEqual(x.queries, ["profiles"]);
  });

  await test("refuse super_admin sans assurance MFA AAL2", async () => {
    const x = setup({ profile: { role: "super_admin", commune_id: null, actif: true }, gate: false });
    const r = await authorizeIaUser({ ...x, communeSlug: "fimela" });
    assert.equal(r.ok, false);
    assert.equal(r.status, 403);
    assert.deepEqual(x.rpcCalls, ["is_super_admin"]);
    assert.deepEqual(x.queries, ["profiles"]);
  });

  await test("refuse super_admin si le contrôle MFA échoue", async () => {
    const x = setup({
      profile: { role: "super_admin", commune_id: null, actif: true },
      gate: true,
      gateError: new Error("RPC refusée"),
    });
    const r = await authorizeIaUser({ ...x, communeSlug: "fimela" });
    assert.equal(r.ok, false);
    assert.equal(r.status, 403);
    assert.deepEqual(x.queries, ["profiles"]);
  });

  await test("autorise super_admin uniquement après validation AAL2", async () => {
    const x = setup({
      profile: { role: "super_admin", commune_id: null, actif: true },
      gate: true,
      commune: { id: "c2", nom: "Commune cible" },
    });
    const r = await authorizeIaUser({ ...x, communeSlug: "commune-cible" });
    assert.equal(r.ok, true);
    assert.equal(r.commune.id, "c2");
    assert.deepEqual(x.rpcCalls, ["is_super_admin"]);
    assert.deepEqual(x.queries, ["profiles", "communes"]);
  });

  await test("autorise un maire actif dans sa propre commune", async () => {
    const x = setup();
    const r = await authorizeIaUser({ ...x, communeSlug: "fimela" });
    assert.equal(r.ok, true);
    assert.equal(r.user.id, "u1");
    assert.equal(r.commune.id, "c1");
    assert.deepEqual(x.rpcCalls, []);
  });

  await test("refuse un maire qui cible une autre commune", async () => {
    const x = setup({ commune: { id: "c2", nom: "Autre commune" } });
    const r = await authorizeIaUser({ ...x, communeSlug: "autre-commune" });
    assert.equal(r.ok, false);
    assert.equal(r.status, 403);
  });

  console.log(failures ? `ÉCHECS : ${failures}` : "TOUS LES TESTS IA-AUTH OK");
  process.exitCode = failures ? 1 : 0;
})();
