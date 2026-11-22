// Politique de mot de passe : 30 jours, alerte à J-7, changement imposé ; aucun mot de passe lisible.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const R = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(R, f), "utf8");

// 1) Fonctions pures, et le module ne fait rien (sans erreur) quand aucun client Supabase n'est présent.
const sandbox = { setInterval() {}, setTimeout() {}, clearTimeout() {}, Date, Promise };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(read("js/mdp-policy.js"), sandbox);
const P = sandbox.MdpPolicy;
assert.equal(P.MAX_JOURS, 30);
assert.equal(P.ALERTE_JOURS, 7);

const DAY = 86400000, t0 = Date.parse("2026-11-01T08:00:00Z");
const at = d => P.statut("2026-11-01T08:00:00Z", t0 + d * DAY);
assert.deepEqual({ ...at(0) }, { jours_ecoules: 0, jours_restants: 30, expire: false, alerte: false });
assert.equal(at(22).alerte, false, "pas d'alerte avant J-7");
assert.equal(at(23).alerte, true, "alerte exactement 7 jours avant l'échéance");
assert.equal(at(23).jours_restants, 7);
assert.equal(at(29).alerte, true);
assert.equal(at(29).expire, false);
assert.equal(at(30).expire, true, "expiration à 30 jours");
assert.equal(at(30).alerte, false, "à l'expiration c'est le changement imposé, plus une alerte");
assert.equal(at(90).expire, true);
assert.equal(P.statut("n'importe quoi"), null);

// 2) Règles de saisie
assert.match(P.validerMdp("court1", "court1"), /10 caractères/);
assert.match(P.validerMdp("uniquementdeslettres", "uniquementdeslettres"), /lettre et un chiffre/);
assert.match(P.validerMdp("1234567890123", "1234567890123"), /lettre et un chiffre/);
assert.match(P.validerMdp("Motdepasse2026", "autreChose2026"), /ne correspondent pas/);
assert.equal(P.validerMdp("Motdepasse2026", "Motdepasse2026"), "");
assert.match(P.traduire("New password should be different from the old password."), /différent de l’ancien/);

// 3) Migration : état tenu par la base, jamais de mot de passe lisible, droits fermés
const sqlBrut = read("supabase/migrations/20261123090000_politique_mot_de_passe_30_jours.sql"), sql = sqlBrut.replace(/--.*$/gm, "");
assert.match(sql, /create trigger mdp_trace_changement[\s\S]*after update of encrypted_password on auth\.users/i);
assert.match(sql, /old\.encrypted_password is distinct from new\.encrypted_password/i);
assert.match(sql, /enable row level security/i);
assert.match(sql, /revoke all on public\.user_password_policy from anon, authenticated/i);
assert.match(sql, /grant execute on function public\.mdp_politique_statut\(\) to authenticated/i);
assert.match(sql, /revoke all on function public\.sa_mdp_statuts\(\) from public, anon/i);
assert.match(sql, /p\.role::text = 'super_admin'/);
assert.doesNotMatch(sql, /grant execute on function public\.(mdp_politique_statut|sa_mdp_statuts)\(\) to (anon|public)/i);
const securityDefiners = sql.match(/security definer/gi) || [];
assert.equal((sql.match(/set search_path = ''/g) || []).length, securityDefiners.length, "chaque security definer fixe son search_path");
assert.doesNotMatch(sql, /encrypted_password\s*,|select[^;]*encrypted_password/i, "le hash n'est jamais lu ni exposé");

// 4) Câblage : chargé après le client Supabase sur les deux espaces authentifiés, jamais sur le portail citoyen
const mairie = read("mairie.html"), saas = read("saas.html");
for (const [name, html, client] of [["mairie.html", mairie, "/js/core.js"], ["saas.html", saas, "/js/saas.js"]]) {
  const i = html.indexOf("/js/mdp-policy.js"), j = html.indexOf(client);
  assert.ok(i > 0 && j > 0 && i > j, `${name} : mdp-policy.js doit être chargé après ${client}`);
}
assert.doesNotMatch(read("index.html"), /mdp-policy/);

// 5) CSP : aucune écriture HTML dynamique ni style inline dans le module
const src = read("js/mdp-policy.js");
assert.doesNotMatch(src, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|setAttribute\(\s*["']style/);

console.log("OK   politique de mot de passe (30 jours, alerte J-7, changement imposé, migration fermée, câblage, CSP)");
