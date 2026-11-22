const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const saas = require("./_compact.js").compact(fs.readFileSync(path.join(root, "js/saas.js"), "utf8"));
const saasHtml = fs.readFileSync(path.join(root, "saas.html"), "utf8");
const mairieHtml = fs.readFileSync(path.join(root, "mairie.html"), "utf8");
const edge = fs.readFileSync(path.join(root, "supabase/functions/saas-admin/index.ts"), "utf8");

const createStart = saas.indexOf('async create(){');
const createEnd = saas.indexOf('async susp(', createStart);
assert.ok(createStart >= 0 && createEnd > createStart, "action create() présente");
const create = saas.slice(createStart, createEnd);

assert.match(create, /action:"creer_mairie"/);
assert.match(create, /admin_email:f\.ae/);
assert.doesNotMatch(create, /password|n_pw|f\.pw/i, "aucun mot de passe n'est transmis par le navigateur");
assert.doesNotMatch(saas, /n_pw|async gen\(\)|Générer un mot de passe/, "aucun formulaire ou générateur de mot de passe inutile");
assert.match(saas, /Invitation envoyée à l’administrateur/);
assert.match(saas, /compte inactif jusqu’à confirmation de l’adresse e-mail/);

assert.match(edge, /inviteUserByEmail\(email/);
assert.match(edge, /profiles"\)\.update\(\{actif:false\}\)/);
assert.match(edge, /compte_actif:false/);

assert.match(saasHtml, /\/js\/saas\.js\?v=20261121\.4/);
for (const [module, version] of [["core.js", "20261121.1"], ["secretariat.js", "20261119.1"], ["actions.js", "20261122.2"]]) {
  assert.match(mairieHtml, new RegExp("/js/" + module.replace(".", "\\.") + "\\?v=" + version.replace(".", "\\.")));
}

console.log("OK  création mairie alignée sur l'invitation e-mail côté Edge Function");
console.log("OK  aucun mot de passe temporaire demandé ou transmis par le navigateur");
console.log("OK  statut inactif et confirmation e-mail explicités");
console.log("OK  cache bust des scripts mairie/SaaS modifiés");
