// Garde-fou RLS : tables critiques (lots 9 à 13) + correctif P0 paiements. node tests/rls.test.js
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");

const dir = path.join(__dirname, "..", "supabase", "migrations");
const files = fs.readdirSync(dir).filter(f => f.endsWith(".sql")).sort();
// Commentaires SQL retirés : une mention dans un commentaire ne doit pas valider une table.
const sql = Object.fromEntries(files.map(f => [f, fs.readFileSync(path.join(dir, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "")]));

// Table critique -> tables SQL réelles à contrôler (toutes doivent être sécurisées).
// Les « services du territoire » (lot 13) sont stockés dans territoire_infrastructures et territoire_actions.
const CRITIQUES = {
  budgets: ["budgets"],
  marches: ["marches"],
  deliberations: ["deliberations"],
  patrimoine_biens: ["patrimoine_biens"],
  services_territoire: ["territoire_infrastructures", "territoire_actions"],
};

const RE_ENABLE = /enable\s+row\s+level\s+security/i;
const RE_POLICY = /create\s+policy/i;

// Une table est visée par un fichier : soit directement (`alter table public.t …`, `create policy … on public.t`),
// soit via une boucle dynamique (`foreach t in array array['a','t']`) dans un fichier contenant la commande.
const viaTableau = t => new RegExp(`array\\s*\\[[^\\]]*'${t}'[^\\]]*\\]`, "i");
function couvre(t, f, motif) {
  const s = sql[f], nom = new RegExp(`\\b(?:public\\.)?"?${t}"?\\b`, "i");
  return s.split(";").some(st => motif.test(st) && nom.test(st)) || (motif.test(s) && viaTableau(t).test(s));
}

const erreurs = [];
for (const [critique, tables] of Object.entries(CRITIQUES)) {
  for (const t of tables) {
    const rls = files.filter(f => couvre(t, f, RE_ENABLE));
    const pol = files.filter(f => couvre(t, f, RE_POLICY));
    if (!rls.length) erreurs.push(`Table « ${t} » (${critique}) : aucun ENABLE ROW LEVEL SECURITY dans supabase/migrations/`);
    if (!pol.length) erreurs.push(`Table « ${t} » (${critique}) : aucun CREATE POLICY dans supabase/migrations/`);
  }
}

// Correctif P0 paiements : REVOKE DELETE sur paiements_taxes.
// Le fichier est cherché par nom (…_p0_rls_paiements.sql, …_p0_revoke_paiements.sql) ; le contenu fait foi.
const p0 = files.filter(f => /_p0_.*paiements.*\.sql$/.test(f));
const RE_REVOKE_DELETE = /revoke\s+[^;]*\bdelete\b[^;]*\bon\s+(?:table\s+)?(?:public\.)?"?paiements_taxes"?\b/i;
if (!p0.length) erreurs.push("Correctif P0 paiements : aucun fichier *_p0_*paiements*.sql trouvé (attendu : …_p0_rls_paiements.sql / …_p0_revoke_paiements.sql)");
else if (!p0.some(f => RE_REVOKE_DELETE.test(sql[f])))
  erreurs.push(`Table « paiements_taxes » : REVOKE DELETE absent de ${p0.join(", ")}`);

if (erreurs.length) {
  console.error("ECHEC RLS :\n - " + erreurs.join("\n - "));
  assert.fail(`${erreurs.length} table(s)/vérification(s) mal configurée(s) : ${erreurs[0]}`);
}
console.log("OK RLS sécurisées");
