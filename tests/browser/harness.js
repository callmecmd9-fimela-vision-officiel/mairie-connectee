// Utilitaires communs : serveur statique local, contexte Playwright avec session simulée, assertions.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright'); const B = require('./backend');
const ROOT = path.resolve(__dirname, '../..');
exports.uid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
exports.start = async () => {
  const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/mairie') p = '/mairie.html'; const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' }[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }); await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  const port = srv.address().port, be = await B.create({ host: process.env.PGHOST, port: +process.env.PGPORT || 5432, user: process.env.PGUSER, password: process.env.PGPASSWORD, database: process.env.PGDATABASE });
  const br = await chromium.launch(); const res = [];
  const check = (label, cond, extra = '') => { res.push({ label, ok: !!cond }); console.log((cond ? 'PASS ' : 'FAIL ') + label + (cond ? '' : '  ' + extra)); };
  const open = async (n, aal = 'aal1') => {
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const errs = [];
    await ctx.addInitScript(s => localStorage.setItem('mc-cab', s), JSON.stringify(B.session({ id: exports.uid(n), email: 'x' }, aal)));
    await ctx.route(/supabase\.co/, be.handler); await ctx.route(/fonts\.|challenges\.cloudflare/, r => r.abort());
    const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message)); pg.errs = errs;
    await pg.goto(`http://127.0.0.1:${port}/mairie.html`); await pg.waitForFunction(() => document.querySelector('#app') && document.querySelector('#app').innerText.length > 40, null, { timeout: 15000 }); await pg.waitForTimeout(1200);
    pg.txt = () => pg.innerText('#app'); return pg; };
  const stop = async () => { await br.close(); srv.close(); await be.close(); const f = res.filter(r => !r.ok).length; console.log(`\nBILAN UI : ${res.length - f}/${res.length} OK, ${f} échec(s)`); process.exit(f ? 1 : 0); };
  return { open, check, stop, be };
};
