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
  assert.match(item.version, /^\\d{14}$/, `invalid migration version: ${item.version}`);
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
  '20261119090000_ia_usage_atomic_reservations.sql'
];
const actualSqlFiles = fs.readdirSync(migrationDir).filter(name => name.endsWith('.sql')).sort();
const expectedSqlFiles = [...historicalFiles, ...pendingFiles].sort();
assert.deepEqual(actualSqlFiles, expectedSqlFiles, 'unexpected or missing SQL migration files');

console.log(`PASS: ${manifest.count} recovered migration sources match Supabase history checksums; 2 pending candidates remain separate.`);
