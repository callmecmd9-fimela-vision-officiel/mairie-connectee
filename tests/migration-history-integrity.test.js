'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migrationDir = path.join(root, 'supabase', 'migrations');
const manifestPath = path.join(migrationDir, 'recovered-history-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

assert.equal(manifest.count, 81, 'the captured Supabase history must contain 81 migrations');
assert.equal(manifest.migrations.length, manifest.count, 'manifest count mismatch');

const versions = new Set();
const historicalFiles = new Set();

for (const item of manifest.migrations) {
  assert.ok(item.version.length === 14 && [...item.version].every(c => c >= '0' && c <= '9'), `invalid migration version: ${item.version}`);
  assert.equal(item.file, `${item.version}_${item.name}.sql`);
  assert.ok(!versions.has(item.version), `duplicate migration version: ${item.version}`);
  versions.add(item.version);
  historicalFiles.add(item.file);

  const filePath = path.join(migrationDir, item.file);
  assert.ok(fs.existsSync(filePath), `missing recovered migration: ${item.file}`);
  const bytes = fs.readFileSync(filePath);
  assert.equal(bytes.length, item.bytes, `byte length mismatch: ${item.file}`);
  assert.equal(
    crypto.createHash('md5').update(bytes).digest('hex'),
    item.md5,
    `database-history checksum mismatch: ${item.file}`
  );
}

const pendingFiles = [
  '20261119070000_security_null_mfa_guards.sql',
  '20261119090000_ia_usage_atomic_reservations.sql',
  '20261120100000_roles_admin_mairie_separation.sql',
  '20261121090000_org_role_droit_set_admin_mairie.sql',
  '20261121091000_org_kpi_v2.sql',
  '20261121100000_saas_modifier_commune.sql',
  '20261121110000_saas_archiver_supprimer_commune.sql',
  '20261121120000_admin_mairie_perimetre.sql',
  // Appliquées en production et récupérées en lecture seule le 2026-11-22 (absentes du ZIP MAJ16) :
  '20261121130228_org_modele_toutes_mairies.sql',
  '20261121130836_nettoyage_doublon_trigger_org_seed.sql',
  '20261122081303_perf_fk_indexes_et_initplan_restrictives.sql',
  '20261122135230_bucket_icones_pwa_public.sql'
];
const actualSqlFiles = fs.readdirSync(migrationDir).filter(name => name.endsWith('.sql')).sort();
const expectedSqlFiles = [...historicalFiles, ...pendingFiles].sort();
assert.deepEqual(actualSqlFiles, expectedSqlFiles, 'unexpected or missing SQL migration files');

console.log(`PASS: ${manifest.count} recovered migration sources match Supabase history checksums; 8 post-capture migrations (all applied in production, see PRODUCTION_VERSION_MAP.md) remain separate.`);
