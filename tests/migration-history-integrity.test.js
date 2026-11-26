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
  '20261122135230_bucket_icones_pwa_public.sql',
  // Politique de mot de passe 30 jours (2026-11-23) : appliquée en production le 2026-11-22 (version 20261122214824).
  '20261123090000_politique_mot_de_passe_30_jours.sql',
  // Admins de mairie activés = super_admin de leur commune (2026-11-23) : appliquée en production (version 20261123084211).
  '20261123120000_admin_mairie_actif_vers_admin_commune.sql',
  // LOT A (2026-12-02) : socle géographique des communes — appliquée en production (objets vérifiés), enregistrée dans l'historique sous cette version.
  '20261202000000_communes_geo.sql',
  // LOTS 9 à 13 (2026-12-02) : appliquées en production (objets vérifiés) et enregistrées dans l'historique Supabase sous ces mêmes versions.
  '20261202000100_lot9_budget.sql',
  '20261202000200_lot10_marches.sql',
  '20261202000300_lot11_gouvernance.sql',
  '20261202000400_lot12_patrimoine.sql',
  '20261202000500_lot13_services_territoriaux.sql',
  // P0 paiements (2026-11-25) : RPC valider_paiement_especes — appliquée en production en SQL direct, version inscrite dans l'historique.
  '20261202000600_p0_rpc_valider_paiement.sql',
  // P0 paiements (2026-11-25) : garde-fou RLS (UPDATE direct interdit à l'API) — appliquée en production en SQL direct.
  '20261202000700_p0_rls_paiements.sql',
  // P0 paiements (2026-11-25) : retrait DELETE/TRUNCATE/REFERENCES/TRIGGER (authenticated) et de tout droit (anon) — appliquée en production en SQL direct.
  '20261202000800_p0_revoke_paiements.sql',
  // P0 machines à états (2026-11-25) : triggers votes_deliberations / deliberations / budgets / marches — PROPOSÉE, non appliquée en production.
  '20261202000900_p0_triggers_machines_etats.sql',
  // P1 budget (2026-11-25) : politique RLS engagements_creation étendue au rôle secretariat — PROPOSÉE, non appliquée en production.
  '20261202001000_p1_rls_engagements_secretariat.sql',
  // P1 gouvernance (2026-11-25) : conseillers.user_id, rôle conseiller, RLS vote adjoint/conseiller, Realtime — PROPOSÉE, non appliquée en production.
  '20261202001100_p1_gouvernance_fixes.sql',
  // P1 gouvernance (2026-11-25) : RPC cloturer_deliberation (SECURITY DEFINER) — PROPOSÉE, non appliquée en production.
  '20261202001200_p1_rpc_cloture_deliberation.sql',
  // P1 patrimoine (2026-11-25) : biens.latitude / longitude — appliquée en production le 2026-11-25.
  '20261202001300_p1_patrimoine_geolocalisation.sql',
  // P1 services territoriaux (2026-11-25) : latitude / longitude + budget_ligne_id — appliquée en production le 2026-11-25.
  '20261202001400_p1_services_geo.sql',
  // P1 paiements (2026-11-25) : FK paiements_taxes.citoyen_id -> auth.users (encaissement guichet) — appliquée en production le 2026-11-25.
  '20261202001500_p1_fix_paiements_taxes_citoyen_fk.sql',
  // P1 suivi anonyme des demandes (2026-11-25) : num_suivi, suivi_tokens, v_suivi_public, RPC suivi_public — proposed (PROPOSÉE, non appliquée).
  '20261202001600_p1_suivi_demandes.sql',
  // P1 circuit des demandes (2026-11-25) : statuts, demandes_historique, registre_retraits, gardes de transition — proposed (PROPOSÉE, non appliquée).
  '20261202001700_p1_workflow_demandes.sql',
  // P1 circuit des demandes (2026-11-25) : RPC encaisser_demande (quittance QUIT-YYYY-NNNNNN) — proposed (PROPOSÉE, non appliquée).
  '20261202001800_p1_rpc_encaisser_demande.sql',
  // P1 circuit des demandes (2026-11-25) : RPC retirer_demande (registre des retraits) — proposed (PROPOSÉE, non appliquée).
  '20261202001900_p1_rpc_retirer_demande.sql',
  // P1 guichet (2026-11-25) : politiques SELECT demandes_guichet / demandes_historique_guichet (finances, secretariat, agent, maire) — proposed (PROPOSÉE, non appliquée).
  '20261202002000_p1_rls_demandes_guichet.sql',
  // LOT 15 : fiscalité locale et domaine public — appliquée en production le 2026-11-26.
  '20261203000200_lot15_fiscalite_locale.sql',
  // P0 sécurité (2026-11-26) : RLS demandes — demandes_citoyen (citoyen_id = auth.uid()), anon sans accès, purge des politiques de lecture non prévues — appliquée en production le 2026-11-26.
  '20261203000300_fix_rls_demandes_citoyen.sql',
  // LOT 16 : « Mes Taxes » citoyen — appliquée en production le 2026-11-26.
  '20261203000400_lot16_citoyen_taxes.sql',
  // LOT 17 : paiement mobile Wave / Orange Money (webhook, RPC confirmer_paiement_mobile) — appliquée en production le 2026-11-26.
  '20261203000500_lot17_paiement_mobile.sql',
  // LOT 18 : « Mon Espace » — RPC mes_roles_imposition_par_tel / mes_demandes_par_tel (téléphone vérifié par SMS) — PROPOSÉE, non appliquée.
  '20261204000100_lot18_citoyen_rpc_par_tel.sql',
  // Photo par utilisateur (profiles.photo, RPC sa_set_profil_photo / sa_profils_photos / mon_profil_photo) — PROPOSÉE, non appliquée.
  '20261204000200_photo_profil_utilisateur.sql'
];
const actualSqlFiles = fs.readdirSync(migrationDir).filter(name => name.endsWith('.sql')).sort();
const expectedSqlFiles = [...historicalFiles, ...pendingFiles].sort();
assert.deepEqual(actualSqlFiles, expectedSqlFiles, 'unexpected or missing SQL migration files');

console.log(`PASS: ${manifest.count} recovered migration sources match Supabase history checksums; ${pendingFiles.length} post-capture migrations (applied in production or proposed, see PRODUCTION_VERSION_MAP.md) remain separate.`);
