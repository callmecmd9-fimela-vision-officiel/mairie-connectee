// Test navigateur (Chromium/Playwright) : interfaces Super Admin et Admin mairie.
// Backend = base PostgreSQL JETABLE + émulation Edge (voir backend.js). Aucun accès à Supabase/production.
const H = require('./harness'); const { uid } = H;
(async () => {
  const { open, check, stop, be } = await H.start(); const q = async (s, p) => (await be.query(s, p)).rows;
  const prof = async n => (await q('select role,commune_id,actif,statut_admin from public.profiles where id=$1', [uid(n)]))[0];
  const nUsers = async () => +(await q('select count(*) c from auth.users'))[0].c;
  const A = 'aaaaaaaa-0000-0000-0000-00000000000a', Bc = 'bbbbbbbb-0000-0000-0000-00000000000b';
  const users0 = await nUsers();
  const click = async (p, sel) => { await p.click(sel); await p.waitForTimeout(900); };
  const amAct = async (p, email, nom, slug, btn = '[data-sa="am_create"]') => { await p.fill('#ae', email); await p.fill('#an', nom || ''); await p.selectOption('#ac', slug); await click(p, btn); };
  const rowOf = async (p, email) => (await p.txt()).split('\n').findIndex(l => l.includes(email));
  const txtAfter = async (p, email, n = 3) => { const l = (await p.txt()).split('\n'); const i = l.findIndex(x => x.includes(email)); return i < 0 ? '' : l.slice(i - 1, i + n).join(' | '); };

  /* ===== SUPER ADMIN ===== */
  let sa = await open(1, 'aal2');
  check('SA : MFA AAL2 -> accès au tableau de bord plateforme', /Gestion des utilisateurs/.test(await sa.txt()));
  await sa.getByRole('button', { name: /Gestion des utilisateurs/ }).first().click(); await sa.waitForTimeout(800);
  let t = await sa.txt();
  check('SA : panneau « Administrateurs municipaux » affiché', /Administrateurs municipaux/.test(t));
  check('SA : Admin A actif / Commune A', /u3@example\.test · Commune A\s*\nActif/.test(t));
  check('SA : Admin B actif / Commune B', /u4@example\.test · Commune B\s*\nActif/.test(t));
  check('SA : admin en attente sans commune, sans bouton d’activation', /u8@example\.test · aucune commune\s*\nEn attente d’affectation\s*\n/.test(t) && !/u8@example\.test[^\n]*\n[^\n]*(Activer|Suspendre)/.test(t));
  check('SA : maire/agent/citoyen absents de la liste des admins municipaux', !/u2@example\.test|u5@example\.test|u6@example\.test/.test(t.split('Administrateurs municipaux')[1].split('Créer un compte')[0]));

  // préparation anticipée (sans commune)
  await amAct(sa, 'u6@example.test', 'Admin Six', '');
  t = await sa.txt(); let p6 = await prof(6);
  check('SA : préparation => message « en attente d’affectation, sans aucun droit »', /Compte préparé : en attente d’affectation, sans aucun droit/.test(t));
  check('SA : DB u6 = admin_mairie, sans commune, inactif, en_attente', p6.role === 'admin_mairie' && !p6.commune_id && p6.actif === false && p6.statut_admin === 'en_attente');
  check('SA : aucun doublon Auth créé', (await nUsers()) === users0);
  check('SA : ligne u6 « En attente » sans bouton', /En attente d’affectation/.test(await txtAfter(sa, 'u6@example.test')) && !/Activer|Suspendre/.test(await txtAfter(sa, 'u6@example.test', 2)));

  // comptes refusés
  for (const [em, lab] of [['u2@example.test', 'maire'], ['superadmin@example.test', 'plateforme'], ['inconnu@example.test', 'inexistant']]) {
    const before = (await q('select role from public.profiles where id=(select id from auth.users where email=$1)', [em]))[0];
    await amAct(sa, em, '', ''); const alert = await sa.locator('[role=alert]').first().innerText().catch(() => '');
    const after = (await q('select role from public.profiles where id=(select id from auth.users where email=$1)', [em]))[0];
    check(`SA : compte ${lab} refusé avec message, rôle inchangé`, alert.length > 3 && JSON.stringify(before) === JSON.stringify(after) && (await nUsers()) === users0, alert);
  }

  // affectation différée : même compte, plus tard
  await amAct(sa, 'u6@example.test', 'Admin Six', 'commune-a'); t = await sa.txt(); p6 = await prof(6);
  check('SA : affectation différée => « Compte affecté, encore inactif »', /Compte affecté, encore inactif/.test(t));
  check('SA : DB u6 = commune A, inactif, statut affecte', p6.commune_id === A && p6.actif === false && p6.statut_admin === 'affecte');
  check('SA : bouton « Activer » proposé (e-mail confirmé)', /Affecté à une commune\s*Activer/.test(await txtAfter(sa, 'u6@example.test', 3).then(x => x.replace(/ \| /g, ''))) || /Activer/.test(await txtAfter(sa, 'u6@example.test', 3)));

  // admin affecté mais inactif : aucun accès
  let u6 = await open(6); t = await u6.txt();
  check('Admin affecté inactif : connexion refusée, aucune donnée de commune', /n’a pas encore accès/.test(t) && !/Administration/.test(t.split('Se connecter')[0].replace('Espace de la mairie', '')));
  await u6.context().close();

  // activation (bouton de la ligne u6, retrouvé par index)
  const tog = async (p, email) => { const i = await p.evaluate(e => (S.am || []).findIndex(a => a.email === e), email); await click(p, `[data-sa="am_toggle"][data-i="${i}"]`); };
  await tog(sa, 'u6@example.test'); p6 = await prof(6);
  check('SA : activation => « Administrateur activé »', /Administrateur activé/.test(await sa.txt()));
  check('SA : DB u6 actif / statut actif', p6.actif === true && p6.statut_admin === 'actif');

  // admin activé : accès limité à SA commune
  u6 = await open(6); t = await u6.txt();
  check('Admin activé : accès à l’espace de la commune A', /MAIRIE DE COMMUNE A/i.test(t));
  check('Admin activé : menu limité à Accueil + Administration', await u6.evaluate(() => espV().length === 1 && espV()[0].n === 'Administration') && !/Finances|Espace du Maire|Conseil municipal|Pilotage/.test(t));
  check('Admin activé : une seule commune visible (isolation)', await u6.evaluate(() => S.cs.length === 1 && S.cs[0].slug === 'commune-a'));
  await u6.context().close();

  // e-mail non confirmé : activation impossible
  await amAct(sa, 'u7@example.test', 'Admin Sept', 'commune-a');
  check('SA : compte non confirmé => bouton « E-mail non confirmé »', /E-mail non confirmé/.test(await txtAfter(sa, 'u7@example.test', 3)));
  await tog(sa, 'u7@example.test'); const p7 = await prof(7);
  check('SA : activation d’un e-mail non confirmé refusée', /confirmée|acceptée/.test(await sa.locator('[role=alert]').first().innerText().catch(() => '')) && p7.actif === false);

  // suspension
  await tog(sa, 'u6@example.test'); p6 = await prof(6);
  check('SA : suspension => « Administrateur suspendu », statut suspendu', /Administrateur suspendu/.test(await sa.txt()) && p6.actif === false && p6.statut_admin === 'suspendu');
  u6 = await open(6);
  check('Admin suspendu : connexion refusée', /n’a pas encore accès/.test(await u6.txt())); await u6.context().close();

  // le SA n'écrit jamais directement dans les tables
  check('SA : aucune écriture REST directe (uniquement RPC/Edge)', be.log.writes.length === 0, JSON.stringify(be.log.writes));
  check('SA : aucune erreur JavaScript de page', sa.errs.length === 0, sa.errs.join(';'));
  await sa.context().close();

  // SA sans AAL2 : pas d'accès plateforme
  const sa1 = await open(1, 'aal1'); t = await sa1.txt();
  check('SA sans AAL2 : accès refusé (pas de menu de gestion)', !/Gestion des utilisateurs/.test(t) && !/Administrateurs municipaux/.test(t)); await sa1.context().close();

  /* ===== ADMIN MAIRIE A ===== */
  const a3 = await open(3); t = await a3.txt();
  check('Admin A : accueil de la commune A', /MAIRIE DE COMMUNE A/i.test(t) && /Administrateur municipal/.test(t));
  check('Admin A : aucun accès plateforme (pas de menu Super Admin)', await a3.evaluate(() => S.sa === false && S.pr === 'admin_mairie') && !/Gestion des utilisateurs|Sauvegardes|Maintenance/.test(t));
  check('Admin A : menu = Administration uniquement', await a3.evaluate(() => espV().map(x => x.n).join() === 'Administration'));
  check('Admin A : aucun droit métier (budget, personnel, paie, signature)', await a3.evaluate(() => ['budget', 'personnel', 'paie', 'remun', 'conseil', 'sdash', 'actes', 'citoyens', 'cabinet'].every(k => !can(k))));
  check('Admin A : droit org (organigramme et droits)', await a3.evaluate(() => can('org')));
  await a3.getByRole('button', { name: /Administration/ }).first().click(); await a3.waitForTimeout(700); t = await a3.txt();
  check('Admin A : organigramme de SA commune seulement', /Poste secrétariat A/.test(t) && !/Poste secrétariat B/.test(t) && /Compléter l’organigramme par défaut/.test(t));
  check('Admin A : pas d’onglet Délégations', !/Délégations/.test(t.split('Services et équipes')[1] || t));
  await a3.getByText('Rôles et droits', { exact: true }).first().click(); await a3.waitForTimeout(600); t = await a3.txt();
  check('Admin A : écran Rôles et droits éditable (boutons actifs)', /Secrétaire A/.test(t) && !/Secrétaire B/.test(t) && await a3.locator('[data-m="orgdr"]:not([disabled])').count() > 0);
  const iso = await a3.evaluate(async () => {
    const pr = (await sb.from('profiles').select('id,commune_id')).data || [], cm = (await sb.from('communes').select('id')).data || [], po = (await sb.from('org_postes').select('code,commune_id')).data || [];
    const af = await sb.rpc('org_gest', { p_slug: 'commune-b' }), ok = await sb.rpc('org_gest', { p_slug: 'commune-a' });
    const prep = await sb.rpc('saas_preparer_admin_mairie', { p_email: 'u11@example.test', p_nom: 'x' }), lst = await sb.rpc('saas_admins_mairie'), att = await sb.rpc('admin_attribuer', { p_email: 'u11@example.test', p_role: 'admin_mairie', p_slug: 'commune-a' });
    const up = await sb.from('profiles').update({ role: 'super_admin' }).eq('id', S.uid);
    return { prB: pr.filter(x => x.commune_id && x.commune_id !== S.cid).length, prA: pr.length, cm: cm.length, poB: po.filter(x => x.commune_id !== S.cid).length, orgB: af.error && af.error.message, orgA: ok.data === S.cid, prep: prep.error && prep.error.message, lst: lst.error && lst.error.message, att: att.error && att.error.message, up: !!up.error };
  });
  check('Admin A : RLS profils — aucun profil d’une autre commune', iso.prB === 0 && iso.prA > 0, JSON.stringify(iso));
  check('Admin A : RLS communes / postes — uniquement la sienne', iso.cm === 1 && iso.poB === 0);
  check('Admin A : org_gest(commune-a) OK, org_gest(commune-b) refusé', iso.orgA && /refus/i.test(iso.orgB || ''), JSON.stringify(iso));
  check('Admin A : préparer/lister/attribuer un admin municipal refusés (plateforme seule)', /plateforme/i.test(iso.prep || '') && /plateforme/i.test(iso.lst || '') && !!iso.att, JSON.stringify(iso));
  check('Admin A : auto-élévation de rôle refusée', iso.up === true && (await prof(3)).role === 'admin_mairie');
  check('Admin A : aucune erreur JavaScript', a3.errs.length === 0, a3.errs.join(';')); await a3.context().close();

  /* ===== ADMIN MAIRIE B : isolation inverse ===== */
  const b4 = await open(4); await b4.getByRole('button', { name: /Administration/ }).first().click(); await b4.waitForTimeout(700); t = await b4.txt();
  check('Admin B : commune B, organigramme B seulement', /MAIRIE DE COMMUNE B/i.test(t) && /Poste secrétariat B/.test(t) && !/Poste secrétariat A/.test(t));
  const g = await b4.evaluate(async () => ({ a: (await sb.rpc('org_gest', { p_slug: 'commune-a' })).error?.message, c: (await sb.from('communes').select('id')).data.length }));
  check('Admin B : org_gest(commune-a) refusé, une seule commune visible', /refus/i.test(g.a || '') && g.c === 1, JSON.stringify(g)); await b4.context().close();

  /* ===== comptes sans accès ===== */
  const p8 = await open(8); check('Admin en attente (sans commune) : accès refusé', /n’a pas encore accès/.test(await p8.txt())); await p8.context().close();
  const p10 = await open(10); check('Admin affecté mais inactif : accès refusé', /n’a pas encore accès/.test(await p10.txt())); await p10.context().close();

  /* ===== MAIRE A : consultation seule de l'organigramme ===== */
  const m2 = await open(2); await m2.getByRole('button', { name: /^Administration$/ }).first().click(); await m2.waitForTimeout(600);
  await m2.getByText('Organigramme et droits').first().click(); await m2.waitForTimeout(900);
  check('Maire : voit l’organigramme sans pouvoir le modifier', await m2.evaluate(() => can('org') && S.pr === 'maire') && /Poste secrétariat A/.test(await m2.txt()) && !/Poste secrétariat B/.test(await m2.txt()) && !/Compléter l’organigramme par défaut/.test(await m2.txt()));
  check('Maire : aucun bouton « Modifier » inerte sur les postes', await m2.locator('[data-m="orgpe"]').count() === 0);
  await m2.getByText('Rôles et droits', { exact: true }).first().click(); await m2.waitForTimeout(600);
  const tot = await m2.locator('[data-m="orgdr"]').count(), act = await m2.locator('[data-m="orgdr"]:not([disabled])').count();
  check('Maire : droits des rôles non modifiables (boutons désactivés)', tot > 0 ? act === 0 : true, `${act}/${tot}`);
  check('Maire : préparation d’admin municipal refusée', /plateforme/i.test(await m2.evaluate(async () => (await sb.rpc('saas_preparer_admin_mairie', { p_email: 'u11@example.test' })).error?.message || '')));
  await m2.context().close();

  /* ===== AGENT A : aucun accès à l'administration des droits ===== */
  const ag = await open(5);
  check('Agent : pas d’accès à l’organigramme et droits', await ag.evaluate(() => !can('org') && !can('params') && !can('budget')) && !/Organigramme/.test(await ag.txt()));
  check('Agent : org_gest refusé', /refus/i.test(await ag.evaluate(async () => (await sb.rpc('org_gest', { p_slug: 'commune-a' })).error?.message || ''))); await ag.context().close();

  await stop();
})().catch(e => { console.error('ERREUR TEST', e); process.exit(2); });
