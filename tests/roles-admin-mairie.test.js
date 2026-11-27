// Rôles Super Admin / Admin mairie / Maire : contrat statique (migration, Edge Functions, interface).
// Exécuter : node tests/roles-admin-mairie.test.js
// Les scénarios réels (triggers, RLS, RPC) sont dans tests/postgres/roles-admin-mairie-integration.sh
// et exigent une base PostgreSQL jetable.
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const rd = p => fs.readFileSync(path.join(R, p), 'utf8');
let failures = 0;
const ok = (name, pass) => { console.log(pass ? 'OK  ' : 'FAIL', name); if (!pass) failures++; };
const mig = rd('supabase/migrations/20261120100000_roles_admin_mairie_separation.sql');
const fn = name => { const m = new RegExp('create or replace function ' + name.replace(/\./g, '\\.') + '\\([\\s\\S]*?\\n\\$\\$;', 'i').exec(mig); return m ? m[0] : ''; };

// ---- Hygiène SQL (la migration n'est pas exécutable ici : contrôles structurels)
ok('SQL : transaction begin/commit unique', (mig.match(/^begin;/gm) || []).length === 1 && (mig.match(/^commit;/gm) || []).length === 1);
ok('SQL : délimiteurs $$ équilibrés', (mig.match(/\$\$/g) || []).length % 2 === 0);
ok('SQL : aucun TG_OP dans une clause WHEN de trigger', !/\bwhen\s*\([^)]*tg_op/i.test(mig));
ok('SQL : aucune écriture de données réelles (pas de mot de passe, pas d’e-mail réel)', !/@gmail\.com|password|mot_de_passe/i.test(mig.replace(/--.*$/gm, '')));
const defs = mig.match(/create or replace function [\s\S]*?\n\$\$;/gi) || [];
ok('SQL : ' + defs.length + ' fonctions, toutes avec search_path vide', defs.length >= 20 && defs.every(d => /set search_path\s*=\s*''/i.test(d)));
ok('SQL : fonctions SECURITY DEFINER sensibles sans accès anon', ['saas_preparer_admin_mairie', 'saas_affecter_admin_mairie', 'saas_admins_mairie', 'saas_compte_par_email'].every(f => new RegExp('revoke all on function public\\.' + f + '\\([^)]*\\) from public, anon').test(mig)));

// ---- Hiérarchie des rôles
ok('rôle admin_mairie ajouté à la contrainte profiles_role_check', /profiles_role_check[\s\S]{0,400}'admin_mairie'/.test(mig));
ok('org_gest : plateforme, super-admin ou admin_mairie de la commune (plus le maire)', /org_gest/.test(fn('public.org_gest')) && /is_commune_admin\(c\)/.test(fn('public.org_gest')) && !/'maire'/.test(fn('public.org_gest')));
const dp = fn('public.org_droit_propre');
ok('org_droit_propre : admin_mairie limité au module org', /role='admin_mairie'[\s\S]{0,200}m='org'/.test(dp) && !/affectations[\s\S]*admin_mairie/.test(dp.split("p.role='admin_mairie'")[0]));
ok('org_droit_propre : le maire perd l’écriture sur org mais garde le reste', /role='maire'[\s\S]{0,120}not private\.droit_reserve\(m,a\)/.test(dp));
ok('droits réservés = module org en écriture', /p_module='org' and p_action in \('creer','modifier','supprimer','administrer'\)/.test(mig));

// ---- Anti-élévation
for (const [trg, tbl] of [['trg_garde_profil_roles', 'profiles'], ['trg_garde_org_affectation', 'org_affectations'], ['trg_garde_org_role_droits', 'org_role_droits'], ['trg_garde_org_delegation', 'org_delegations_droits']])
  ok('trigger ' + trg + ' sur ' + tbl, new RegExp('create trigger ' + trg + ' before [\\s\\S]*? on public\\.' + tbl).test(mig));
const gp = fn('private.garde_profil_roles');
ok('profiles : seul le privilégié gère un admin_mairie', /old\.role::text='admin_mairie' or new\.role::text='admin_mairie'/.test(gp) && /est_privilegie\(\)/.test(gp));
ok('profiles : auto-modification de rôle/commune interdite', /new\.id=actor/.test(gp) && /errcode='42501'/.test(gp));
ok('affectation : admin_mairie non affectable, auto-affectation interdite', /role::text='admin_mairie'/.test(fn('private.garde_org_affectation')) && /new\.user_id=\(select auth\.uid\(\)\)/.test(fn('private.garde_org_affectation')));
ok('délégation : pas de module d’administration ni de bénéficiaire admin_mairie', /droit_reserve/.test(fn('private.garde_org_delegation')) && /admin_mairie/.test(fn('private.garde_org_delegation')));
ok('lier_adjoint : n’écrase jamais admin_mairie', /role in \('maire','super_admin','admin_mairie'\)/.test(fn('public.lier_adjoint')));
ok('journal : changements de rôle tracés (insert + update)', /trg_journaliser_profil_role_ins/.test(mig) && /trg_journaliser_profil_role_upd/.test(mig) && /profil_role_change/.test(mig));
ok('lecture des profils de sa commune pour admin_mairie (RLS, sans écriture)', /create policy profiles_lecture_admin_mairie on public\.profiles\s+for select/.test(mig));

// ---- Cycle de vie / affectation différée
ok('statuts : en_attente, affecte, actif, suspendu', ['en_attente', 'affecte', 'actif', 'suspendu'].every(s => new RegExp("'" + s + "'").test(fn('private.profil_statut_admin'))));
ok('invariant : admin sans commune jamais actif', /new\.commune_id is null then\s+new\.statut_admin:='en_attente'; new\.actif:=false/.test(fn('private.profil_statut_admin')) && /profiles_admin_mairie_coherence/.test(mig));
ok('préparation anticipée sans commune, compte inactif', /saas_preparer_admin_mairie/.test(mig) && /values\(u,'admin_mairie',null,nullif\(trim\(p_nom\),''\),false\)/.test(fn('public.saas_preparer_admin_mairie')));
ok('affectation : refus du transfert d’un admin actif', /suspendez-le avant tout changement de commune/.test(fn('public.saas_affecter_admin_mairie')));
ok('réutilisation des comptes Auth : aucune création/suppression/changement d’identifiants dans la migration', !/insert into auth\.users|delete from auth\.users|update auth\.users|encrypted_password/i.test(mig));
ok('comptes plateforme jamais convertis', /platform_admins where user_id=u/.test(fn('private.cible_admin_mairie')));
ok('saas_creer_commune crée un admin_mairie inactif (plus un maire)', /'admin_mairie',cid|values\(p_admin,'admin_mairie',cid,p_admin_nom,false\)/.test(fn('public.saas_creer_commune')) && !/values\(p_admin,'maire'/.test(fn('public.saas_creer_commune')));
ok('admin_attribuer : admin_mairie créé inactif, plateforme seule', /is_platform_admin\(\)/.test(fn('public.admin_attribuer')) && /'admin_mairie' then false/.test(fn('public.admin_attribuer')));

// ---- Edge Functions
const sa = rd('supabase/functions/sa-admin/index.ts'), sas = rd('supabase/functions/saas-admin/index.ts');
ok('sa-admin : rôle admin_mairie accepté', /const ROLES=\["admin_mairie"/.test(sa));
ok('sa-admin : création anticipée via RPC plateforme (commune facultative)', /saas_preparer_admin_mairie/.test(sa) && /saas_affecter_admin_mairie/.test(sa) && /status:communeSlug\?"affecte":"en_attente"/.test(sa));
ok('sa-admin : activation refusée sans commune', /target\.role==="admin_mairie"&&!communeId/.test(sa));
ok('sa-admin : aucun mot de passe généré', !/password\s*:/.test(sa.replace(/reinit[\s\S]*?\n/g, '')) || !/createUser\(/.test(sa));
ok('saas-admin : compte existant réutilisé, jamais supprimé en cas d’échec', /saas_compte_par_email/.test(sas) && /if\(invited\)await admin\.auth\.admin\.deleteUser/.test(sas));
ok('saas-admin : plus de suppression inconditionnelle de compte', !/\}\s*if\(created\.error\)\{await admin\.auth\.admin\.deleteUser/.test(sas));

// ---- Interface
const { compact } = require('./_compact.js');
const ui = compact(rd('js/superadmin.js')), core = compact(rd('js/core.js')), orgRaw = rd('js/org.js'), org = compact(orgRaw), orgf = compact(rd('js/org-f.js')), html = rd('mairie.html');
ok('UI Super Admin : formulaire création/rattachement + 4 statuts', /am_create/.test(ui) && /Administrateurs municipaux/.test(ui) && ['en_attente', 'affecte', 'actif', 'suspendu'].every(s => new RegExp(s).test(ui)));
ok('UI : commune facultative (en attente d’affectation)', /Aucune \(en attente/.test(ui));
ok('UI : activation/suspension via action serveur « activer »', /action:"activer",id:a\.user_id/.test(ui));
ok('core : libellés admin_mairie et session autorisée', /admin_mairie:"Admin municipal"/.test(core) && /concat\("super_admin","admin_mairie"\)/.test(core));
ok('core : rôle conseiller autorisé à se connecter (liste AL)', /const AL=\[[^\]]*"conseiller"[^\]]*\]/.test(core));
ok('org-f : réservé à admin_mairie/super-admin', /RP\.orgf=\["admin_mairie"\]/.test(orgf));
ok('org : écriture réservée à admin_mairie, délégations masquées pour lui', /W=S\.pr=="admin_mairie"&&!S\.sa/.test(org) && /S\.pr=="admin_mairie"\?\[\]:\[\["del"/.test(org));
ok('org : bouton Modifier du poste réservé à admin_mairie (pas d\'affordance inerte pour le maire)', /const W=S\.pr=="admin_mairie"&&!S\.sa,P=ORG\.P/.test(org) && /\$\{W\?act2\(/.test(org));
ok('versions de scripts incrémentées', ['core', 'superadmin', 'org', 'org-f'].every(n => new RegExp('<script src="/js/' + n + '\\.js\\?v=\\d{8}(?:\\.\\d+)?"></script>').test(html)));

// ---- Comportement front (vm)
const ctx = { console, load: async () => {}, S: { pr: 'admin_mairie', sa: false, orgMy: { postes: [] }, mod: {}, uid: 'u' }, SP: { administration: { subs: [] } }, RP: {}, SPL: {}, SUB: {}, SANAV: [], V: {}, document: { addEventListener() {} }, sb: {}, esc: x => String(x ?? ''), render() {}, $: () => null };
try {
  vm.createContext(ctx); vm.runInContext(orgRaw, ctx, { filename: 'org.js' });
  const E = c => vm.runInContext(c, ctx);
  ok('front : admin_mairie n’obtient aucun droit métier via orgCan', E('orgCan("personnel")') === false);
  ok('front : le maire n’obtient pas non plus d’accès via orgCan', E('S.pr="maire";orgCan("personnel")') === false);
  ok('front : RP.org = maire (lecture) + admin_mairie', JSON.stringify(ctx.RP.org) === '["maire","admin_mairie"]');
} catch (e) { ok('front org.js chargeable en vm : ' + e.message.slice(0, 80), false); }

if (failures) { console.log('ECHECS:', failures); process.exit(1); }
console.log('PASS: roles-admin-mairie (contrat statique)');
