const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "..", "js", "org.js"), "utf8");

function setup({ assignments = true, rightsError = false } = {}) {
  const ranges = [];
  const calls = [];
  const today = new Date().toISOString().slice(0, 10);
  const db = {
    org_affectations: assignments
      ? [{ poste_code: "poste-a", debut: "2020-01-01", fin: null }]
      : [],
    org_postes: [{ role_code: "role-a" }],
  };
  const sb = {
    from(table) {
      let offset = 0;
      const q = {
        select() { return q; },
        eq() { return q; },
        in() { return q; },
        range(a, b) { offset = a; ranges.push([table, a, b]); return q; },
        then(resolve, reject) {
          calls.push(table);
          if (table === "org_role_droits" && rightsError) {
            return Promise.resolve({ data: null, error: new Error("RLS/query failure") }).then(resolve, reject);
          }
          if (table === "org_role_droits") {
            const rows = offset === 0
              ? Array.from({ length: 1000 }, () => ({ module: "personnel", action: "consulter" }))
              : [{ module: "paie", action: "consulter" }];
            return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
          }
          return Promise.resolve({ data: db[table] || [], error: null }).then(resolve, reject);
        },
      };
      return q;
    },
  };
  const context = vm.createContext({
    console,
    Date,
    S: { uid: "user-1", sa: false, pr: "agent", mod: {} },
    SP: { administration: { subs: [] } },
    RP: {},
    SPL: {},
    SUB: {},
    sb,
    load: async () => {},
    document: { addEventListener() {} },
  });
  vm.runInContext(source, context, { filename: "org.js" });
  return { context, ranges, calls, today };
}

(async () => {
  const paged = setup();
  await vm.runInContext("orgMine()", paged.context);
  assert.deepEqual(paged.ranges, [
    ["org_role_droits", 0, 999],
    ["org_role_droits", 1000, 1999],
  ]);
  assert.equal(vm.runInContext('S.orgMy.has("consulter|personnel")', paged.context), true);
  assert.equal(vm.runInContext('S.orgMy.has("consulter|paie")', paged.context), true);
  console.log("OK  droits de poste chargés sur plusieurs pages");

  const failed = setup({ rightsError: true });
  await vm.runInContext("orgMine()", failed.context);
  assert.equal(vm.runInContext("S.orgMy", failed.context), null);
  console.log("OK  erreur de lecture : aucun droit d’interface accordé");

  const empty = setup({ assignments: false });
  await vm.runInContext("orgMine()", empty.context);
  assert.equal(vm.runInContext("S.orgMy", empty.context), null);
  assert.deepEqual(empty.calls, ["org_affectations"]);
  console.log("OK  aucun poste actif : aucun droit de poste chargé");
})();
