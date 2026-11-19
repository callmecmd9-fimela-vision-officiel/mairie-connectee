const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const core = fs.readFileSync(require("node:path").join(__dirname, "..", "js", "core.js"), "utf8");

function setup({ role = "super_admin", aal = "aal1", factors = [{ id: "totp-1", status: "verified" }], active = true } = {}) {
  const calls = [];
  const profile = { role, commune_id: role === "super_admin" ? null : "c1", actif: active };
  const sb = {
    auth: {
      getUser: async () => ({ data: { user: { id: "u1", email: "admin@example.test" } }, error: null }),
      signOut: async () => { calls.push("signOut"); return { error: null }; },
      mfa: {
        getAuthenticatorAssuranceLevel: async () => {
          calls.push("aal");
          return { data: { currentLevel: aal, nextLevel: "aal2" }, error: null };
        },
        listFactors: async () => {
          calls.push("factors");
          return { data: { totp: factors }, error: null };
        },
        challenge: async ({ factorId }) => {
          calls.push(["challenge", factorId]);
          return { data: { id: "challenge-1" }, error: null };
        },
      },
    },
    from(table) {
      const q = {
        select() { return q; },
        eq() { return q; },
        order() { return q; },
        maybeSingle: async () => ({ data: profile, error: null }),
        then(resolve, reject) {
          const rows = table === "communes" ? [{ id: "c1", slug: "fimela", nom: "Fimela" }] : [];
          return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
        },
      };
      return q;
    },
  };
  const context = {
    supabase: { createClient: () => sb },
    console,
    Date,
    Promise,
    setTimeout,
    clearTimeout,
    document: {},
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext('var LOGIN_AT = 0; async function loadSys(){ S.sys={maintenance:{actif:false}}; S.mod={}; }', context);
  vm.runInContext(core, context, { filename: "core.js" });
  return { context, calls };
}

(async () => {
  let failures = 0;
  const test = async (name, fn) => {
    try { await fn(); console.log("OK  ", name); }
    catch (error) { failures++; console.error("FAIL", name, error); }
  };

  await test("syntaxe des modules d’authentification mairie", async () => {
    for (const path of ["js/core.js", "js/actions.js", "js/secretariat.js"]) {
      const source = fs.readFileSync(require("node:path").join(__dirname, "..", path), "utf8");
      new vm.Script(source, { filename: path });
    }
  });

  await test("super-admin AAL1 : accès suspendu et défi TOTP préparé", async () => {
    const x = setup();
    const ok = await vm.runInContext("profil()", x.context);
    assert.equal(ok, false);
    assert.equal(vm.runInContext("S.role", x.context), null);
    assert.equal(vm.runInContext("S.mfa.factorId", x.context), "totp-1");
    assert.equal(vm.runInContext("S.mfa.challengeId", x.context), "challenge-1");
    assert.ok(x.calls.some(c => Array.isArray(c) && c[0] === "challenge"));
  });

  await test("super-admin AAL2 : connexion autorisée", async () => {
    const x = setup({ aal: "aal2" });
    const ok = await vm.runInContext("profil()", x.context);
    assert.equal(ok, true);
    assert.equal(vm.runInContext("S.sa", x.context), true);
    assert.equal(vm.runInContext("S.role", x.context), "cab");
    assert.equal(x.calls.includes("challenge"), false);
  });

  await test("super-admin sans facteur TOTP vérifié : accès refusé et configuration demandée", async () => {
    const x = setup({ factors: [] });
    const ok = await vm.runInContext("profil()", x.context);
    assert.equal(ok, false);
    assert.equal(vm.runInContext("S.mfa.setup", x.context), true);
    assert.equal(vm.runInContext("S.role", x.context), null);
  });

  await test("maire AAL1 : aucun défi MFA plateforme imposé", async () => {
    const x = setup({ role: "maire", aal: "aal1" });
    const ok = await vm.runInContext("profil()", x.context);
    assert.equal(ok, true);
    assert.equal(vm.runInContext("S.sa", x.context), false);
    assert.equal(x.calls.includes("aal"), false);
  });

  await test("profil inactif : connexion refusée avant tout contrôle MFA", async () => {
    const x = setup({ active: false });
    const ok = await vm.runInContext("profil()", x.context);
    assert.equal(ok, false);
    assert.ok(x.calls.includes("signOut"));
    assert.equal(x.calls.includes("aal"), false);
  });

  console.log(failures ? `ÉCHECS : ${failures}` : "TOUS LES TESTS MFA MAIRIE OK");
  process.exitCode = failures ? 1 : 0;
})();
