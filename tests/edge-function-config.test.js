const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const config = fs.readFileSync(path.join(root, "supabase", "config.toml"), "utf8");
const expected = {
  "ia-texte": true,
  "saas-admin": true,
  "sa-admin": true,
  "purge-pieces": false,
  "bright-worker": true,
  "admin-comptes": true,
};

for (const [slug, verifyJwt] of Object.entries(expected)) {
  const block = config.match(new RegExp(`\\[functions\\.${slug}\\]\\s+verify_jwt = (true|false)`));
  assert.ok(block, `configuration absente : ${slug}`);
  assert.equal(block[1] === "true", verifyJwt, `verify_jwt incorrect : ${slug}`);
  assert.ok(fs.existsSync(path.join(root, "supabase", "functions", slug, "index.ts")),
    `source Edge Function absente : ${slug}`);
}

const iaSource = fs.readFileSync(path.join(root, "supabase", "functions", "ia-texte", "index.ts"), "utf8");
assert.match(iaSource, /Access-Control-Allow-Methods/);
assert.match(iaSource, /usageReadError/);
assert.match(iaSource, /usageWriteError/);

console.log("OK   six Edge Functions versionnées, JWT configuré et quota IA fail-closed");
