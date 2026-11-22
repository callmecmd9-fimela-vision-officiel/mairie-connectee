// Les migrations « production-ready » = copies exactes des sources testées ; aucun rejeu des migrations déjà appliquées ; script gardé.
const fs=require('fs'),assert=require('assert'),cp=require('child_process'),path=require('path');
const R=path.join(__dirname,'..'),pr=f=>fs.readFileSync(path.join(R,'supabase/production-ready',f),'utf8'),src=f=>fs.readFileSync(path.join(R,f),'utf8');
const strip=s=>s.split('\n').slice(1).join('\n');
const pairs=[['01_20261121090000_org_role_droit_set_admin_mairie.sql','supabase/migrations/20261121090000_org_role_droit_set_admin_mairie.sql',0],['02_20261121091000_org_kpi_v2.sql','supabase/migrations/20261121091000_org_kpi_v2.sql',0],
['03_20261121092000_push_notifications.sql','supabase/proposed/20261121_push_notifications.sql',1],['04_20261121092100_sms_outbox.sql','supabase/proposed/20261121_sms_outbox.sql',1],['05_20261121092200_sms_triggers.sql','supabase/proposed/20261121_sms_triggers.sql',1]];
for(const [a,b,h] of pairs)assert.equal(h?strip(pr(a)):pr(a),h?strip(src(b)):src(b),'dérive : '+a);
const applied=['20261119070000','20261119090000','20261120100000'];
for(const f of fs.readdirSync(path.join(R,'supabase/production-ready')).filter(x=>x.endsWith('.sql')))for(const v of applied)assert(!f.includes(v),'migration déjà appliquée rejouée : '+f);
const r=cp.spawnSync('bash',[path.join(R,'scripts/deploy/apply-migrations.sh')],{env:{PATH:process.env.PATH},encoding:'utf8'});
assert.equal(r.status,2);assert(/REFUS/.test(r.stdout));
const cfg=fs.readFileSync(path.join(R,'supabase/config.toml'),'utf8');assert(/\[functions\.bright-worker\]/.test(cfg),'bright-worker doit rester');
assert(fs.existsSync(path.join(R,'supabase/functions/bright-worker/index.ts')));
console.log('OK   migrations de production prêtes (copies exactes, ordre, script gardé, bright-worker conservé)');
