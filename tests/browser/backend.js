// Backend simulé pour les tests navigateur : PostgREST/Auth/Edge « sa-admin » branchés sur une base
// PostgreSQL JETABLE (jamais Supabase). Les RPC et lectures s'exécutent en SQL réel avec les claims JWT
// de l'utilisateur et le rôle `authenticated` (RLS appliquée). L'Edge Function est émulée d'après
// supabase/functions/sa-admin/index.ts (Deno absent) : mêmes gardes, mêmes réponses.
const { Client } = require('pg');
const ID = /^[a-z_][a-z0-9_]*$/;
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
exports.jwt = (sub, aal = 'aal1') => `${b64({alg:'HS256',typ:'JWT'})}.${b64({sub,role:'authenticated',aal,aud:'authenticated',exp:Math.floor(Date.now()/1e3)+36000,amr:[{method:'password',timestamp:1}],session_id:'s-'+sub})}.sig`;
exports.session = (user, aal='aal1') => { const t = exports.jwt(user.id, aal); return {access_token:t,token_type:'bearer',expires_in:36000,expires_at:Math.floor(Date.now()/1e3)+36000,refresh_token:'r',user:{id:user.id,aud:'authenticated',role:'authenticated',email:user.email,app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z',factors:aal==='aal2'?[{id:'f1',factor_type:'totp',status:'verified'}]:[]}}; };

exports.create = async (cfg) => {
  const db = new Client(cfg); await db.connect(); const db0 = new Client(cfg); await db0.connect(); // db0 : lectures hors transaction
  const log = { writes: [], rpc: [], edge: [] }; let chain = Promise.resolve();
  const run = (sub, fn) => { const p = chain.then(async () => { await db.query('begin'); try {
    if (sub) { await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)", [sub]); await db.query('set local role authenticated'); }
    const r = await fn(); await db.query('commit'); return r; } catch (e) { await db.query('rollback'); throw e; } }); chain = p.catch(() => {}); return p; };
  const subOf = h => { const m = /^Bearer\s+(\S+)/.exec(h.authorization || ''); if (!m) return null; try { return JSON.parse(Buffer.from(m[1].split('.')[1], 'base64url')).sub || null; } catch { return null; } };
  const json = (route, status, body, extra = {}) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', ...extra }, body: JSON.stringify(body) });
  const pgErr = (route, e) => json(route, 400, { message: e.message, code: e.code || 'P0001' });

  async function rest(route, req, u, sub) {
    const parts = u.pathname.replace('/rest/v1/', '').split('/');
    if (parts[0] === 'rpc') {
      const fn = parts[1]; if (!ID.test(fn)) return json(route, 404, { message: 'fn' });
      const args = req.postData() ? JSON.parse(req.postData()) : {}; const ks = Object.keys(args); log.rpc.push({ fn, sub });
      const info = (await db0.query("select p.proretset from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=$1 limit 1", [fn])).rows[0];
      if (!info) return json(route, 200, fn === 'sa_stats' ? {} : []); // RPC hors périmètre testé : réponse neutre
      const call = `public.${fn}(${ks.map((k, i) => `${k} => $${i + 1}`).join(',')})`;
      try { const r = await run(sub, async () => (await db.query(info.proretset ? `select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) as r from ${call} t` : `select to_jsonb(${call}) as r`, ks.map(k => typeof args[k] === 'object' && args[k] !== null ? JSON.stringify(args[k]) : args[k]))).rows[0].r); return json(route, 200, r); }
      catch (e) { return pgErr(route, e); }
    }
    const tbl = parts[0]; if (!ID.test(tbl)) return json(route, 404, {});
    if (req.method() !== 'GET') { log.writes.push({ m: req.method(), tbl }); return json(route, 403, { message: 'écriture refusée par le backend de test', code: '42501' }); }
    if (!(await db0.query("select to_regclass($1) r", ['public.' + tbl])).rows[0].r) return json(route, 200, []);
    const where = [], vals = []; let order = '', limit = '', off = '';
    for (const [k, v] of u.searchParams) {
      if (k === 'select') continue;
      if (k === 'order') { order = ' order by ' + v.split(',').map(o => { const [c, d] = o.split('.'); return ID.test(c) ? `${c} ${d === 'desc' ? 'desc' : 'asc'}` : ''; }).filter(Boolean).join(','); continue; }
      if (k === 'limit') { limit = ` limit ${+v | 0}`; continue; } if (k === 'offset') { off = ` offset ${+v | 0}`; continue; }
      if (!ID.test(k)) continue; const m = /^(eq|neq|in|is)\.(.*)$/.exec(v); if (!m) continue;
      if (m[1] === 'eq') { vals.push(m[2]); where.push(`${k}::text = $${vals.length}`); }
      else if (m[1] === 'neq') { vals.push(m[2]); where.push(`${k}::text <> $${vals.length}`); }
      else if (m[1] === 'is') where.push(`${k} is ${m[2] === 'null' ? 'null' : m[2] === 'true' ? 'true' : 'false'}`);
      else { const l = m[2].replace(/^\(|\)$/g, '').split(',').map(x => x.replace(/^"|"$/g, '')); vals.push(l); where.push(`${k}::text = any($${vals.length})`); }
    }
    const rg = /^(\d+)-(\d+)$/.exec(req.headers()['range'] || ''); if (rg) { limit = ` limit ${+rg[2] - +rg[1] + 1}`; off = ` offset ${+rg[1]}`; }
    const sel = (u.searchParams.get('select') || '*').split(',').map(s => s.trim()); const cols = sel.every(s => s === '*' || ID.test(s)) ? sel.join(',') : '*';
    try { const rows = await run(sub, async () => (await db.query(`select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) as r from (select ${cols} from public.${tbl}${where.length ? ' where ' + where.join(' and ') : ''}${order}${limit}${off}) t`, vals)).rows[0].r);
      if (/vnd\.pgrst\.object/.test(req.headers()['accept'] || '')) return rows.length === 1 ? json(route, 200, rows[0]) : json(route, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' });
      return json(route, 200, rows); } catch (e) { return pgErr(route, e); }
  }

  async function edge(route, req, sub) {
    const b = JSON.parse(req.postData() || '{}'); log.edge.push({ action: b.action, sub });
    const fail = (m, s = 400) => json(route, s, { error: m }), ok = o => json(route, 200, o);
    if (!sub) return fail('Non authentifié.', 401);
    const gate = await run(sub, async () => (await db.query('select public.is_super_admin() as g')).rows[0].g);
    if (gate !== true) return fail('Super-administrateur ou administrateur plateforme actif avec MFA AAL2 requis.', 403);
    if (b.action === 'ping') return ok({ ok: true });
    if (b.action === 'affecter_admin_mairie') {
      const email = String(b.email || '').trim().toLowerCase(), slug = String(b.commune || '').trim(), nom = String(b.nom || '').trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('Adresse e-mail invalide.');
      try { const id = await run(sub, async () => (await (slug ? db.query('select public.saas_affecter_admin_mairie($1,$2,$3) id', [email, slug, nom || null]) : db.query('select public.saas_preparer_admin_mairie($1,$2) id', [email, nom || null]))).rows[0].id); return ok({ ok: true, id, status: slug ? 'affecte' : 'en_attente' }); }
      catch (e) { return fail(e.message, 403); }
    }
    if (b.action === 'activer') {
      const t = (await db0.query('select p.id,p.role,p.commune_id,u.email_confirmed_at from public.profiles p join auth.users u on u.id=p.id where p.id=$1', [b.id])).rows[0];
      if (!t) return fail('Compte introuvable.', 404);
      const actif = b.actif === true;
      if (t.role === 'super_admin') return fail('Les comptes super-administrateur sont gérés séparément.');
      if (actif && t.role === 'admin_mairie' && !t.commune_id) return fail('Un administrateur municipal doit être rattaché à une commune.', 409);
      if (!actif && t.id === sub) return fail('Vous ne pouvez pas désactiver votre propre compte.');
      // Le super admin peut activer un compte dont l'e-mail n'est pas encore confirmé : l'Edge Function le confirme (email_confirm:true).
      if (actif && !t.email_confirmed_at) await db0.query('update auth.users set email_confirmed_at=now() where id=$1', [b.id]);
      await db0.query('update public.profiles set actif=$2 where id=$1', [b.id, actif]); // service_role : pas de RLS
      return ok({ ok: true, actif });
    }
    return fail('Action inconnue.');
  }

  exports.handler = async (route) => {
    const req = route.request(), u = new URL(req.url()), h = req.headers(), sub = subOf(h);
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    try {
      if (u.pathname.startsWith('/auth/v1/user')) { if (!sub) return json(route, 401, { msg: 'no token' });
        const r = (await db0.query('select id,email,email_confirmed_at from auth.users where id=$1', [sub])).rows[0]; if (!r) return json(route, 401, { msg: 'unknown' });
        const sa = (await db0.query("select 1 from public.platform_admins where user_id=$1 and actif", [sub])).rowCount;
        return json(route, 200, { id: r.id, aud: 'authenticated', role: 'authenticated', email: r.email, email_confirmed_at: r.email_confirmed_at, app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z', factors: sa ? [{ id: 'f1', factor_type: 'totp', status: 'verified' }] : [] }); }
      if (u.pathname.startsWith('/auth/v1/logout')) return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
      if (u.pathname.startsWith('/auth/v1/')) return json(route, 400, { msg: 'auth non simulée : ' + u.pathname });
      if (u.pathname.startsWith('/functions/v1/sa-admin')) return await edge(route, req, sub);
      if (u.pathname.startsWith('/rest/v1/')) return await rest(route, req, u, sub);
      if (u.pathname.startsWith('/storage/v1/')) return json(route, 200, []);
      return json(route, 404, { message: 'non simulé ' + u.pathname });
    } catch (e) { return json(route, 500, { message: 'backend de test : ' + e.message }); }
  };
  return { handler: exports.handler, log, query: (q, p) => db0.query(q, p), close: async () => { await db.end(); await db0.end(); } };
};
