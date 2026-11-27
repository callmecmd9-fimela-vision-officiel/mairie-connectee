const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const ui = require("./_compact.js").compact(fs.readFileSync(path.join(root, "js/superadmin.js"), "utf8"));
const edge = fs.readFileSync(path.join(root, "supabase/functions/sa-admin/index.ts"), "utf8");
const html = fs.readFileSync(path.join(root, "mairie.html"), "utf8");

const createStart = ui.indexOf("async u_create(t,g){");
const createEnd = ui.indexOf("async u_save(t,g){", createStart);
assert.ok(createStart >= 0 && createEnd > createStart, "action d'invitation présente");
const create = ui.slice(createStart, createEnd);
assert.match(create, /action:"inviter"/);
assert.match(create, /email:g\("ne"\)/);
assert.match(create, /commune:g\("nc"\)/);
assert.doesNotMatch(create, /password|action:"creer"/);

const resetStart = ui.indexOf("async u_pwsave(t){");
const resetEnd = ui.indexOf("async u_revoke(t){", resetStart);
assert.ok(resetStart >= 0 && resetEnd > resetStart, "action de réinitialisation présente");
const reset = ui.slice(resetStart, resetEnd);
assert.match(reset, /action:"reinit_mdp"/);
assert.match(reset, /captchaToken/);
assert.doesNotMatch(reset, /password:|Nouveau mot de passe/);
assert.match(ui, /function saTurnstile\(\)/);
assert.match(ui, /callback:t=>\{S\.tok=t\}/);
assert.match(ui, /id="ts"/);

assert.doesNotMatch(ui, /u_del|data-sa="supprimer"/, "aucune commande de suppression non supportée");
assert.doesNotMatch(ui, /genpw|inp\("np"/, "aucun mot de passe local pour une invitation");
assert.match(ui, /Inviter l’utilisateur/);

assert.match(edge, /if\(action==="inviter"\)/);
assert.match(edge, /inviteUserByEmail\(email/);
assert.match(edge, /if\(action==="reinit_mdp"\)/);
assert.match(edge, /captchaToken/);
assert.match(edge, /resetPasswordForEmail/);
assert.match(html, /<script src="\/js\/superadmin\.js\?v=\d{8}(?:\.\d+)?"><\/script>/, "superadmin.js chargé avec un paramètre de cache-bust ?v=AAAAMMJJ[.n]");

console.log("OK  création de compte alignée sur l’action serveur inviter");
console.log("OK  réinitialisation alignée sur reset e-mail + Turnstile");
console.log("OK  suppression désactivée retirée de l’interface");
console.log("OK  cache bust du module super-admin");
