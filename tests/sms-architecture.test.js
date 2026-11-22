const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
(async()=>{
const L=await import(path.join(__dirname,"..","supabase","functions","sms-dispatch","lib.mjs"));
// numéros
assert.equal(L.normalizePhone("77 123 45 67"),"+221771234567");assert.equal(L.normalizePhone("+221 78 000 00 00"),"+221780000000");
assert.equal(L.normalizePhone("0033 1 23 45 67 89"),"+33123456789");assert.equal(L.normalizePhone("12345"),null);assert.equal(L.normalizePhone("+221 99 123 45 67"),null);assert.equal(L.normalizePhone(null),null);
// modèles : repli fr, variable manquante refusée, pas de saut de ligne injecté
assert.match(L.render("demande_recue","wo",{commune:"Fimela",numero:"A1",lien:"https://x"}),/^Fimela : votre demande A1/);
assert.throws(()=>L.render("demande_recue","fr",{commune:"F"}),/variable manquante/);assert.throws(()=>L.render("nope","fr",{}),/inconnu/);
assert.ok(!/\n/.test(L.render("code_otp","fr",{commune:"A\nB",code:"123456"})));
// segments
assert.deepEqual(L.segments("Bonjour"),{encoding:"GSM-7",length:7,segments:1});assert.equal(L.segments("a".repeat(161)).segments,2);
assert.equal(L.segments("Prêt à retirer ç").encoding,"UCS-2");assert.equal(L.segments("é".repeat(71)+"ç").segments,2);
// décision
assert.equal(L.canSend({actif:false,quota:10,utilises:0,body:"x"}).ok,false);assert.equal(L.canSend({actif:true,quota:2,utilises:2,body:"x"}).raison,"quota mensuel atteint");
assert.equal(L.canSend({actif:true,quota:null,utilises:99,body:"x"}).ok,true);assert.equal(L.canSend({actif:true,quota:null,utilises:0,body:"a".repeat(500)}).ok,false);
assert.ok(L.retryDelayMs(0)<L.retryDelayMs(3));assert.equal(L.shouldGiveUp(5),true);assert.equal(L.shouldGiveUp(2),false);
// fournisseurs : aucun par défaut (fail-closed), dryrun, http-json générique
assert.equal(L.makeProvider({}),null);assert.equal(L.makeProvider({SMS_PROVIDER:"inconnu"}),null);assert.equal(L.makeProvider({SMS_PROVIDER:"http-json",SMS_HTTP_URL:"http://non-https"}),null);
assert.match((await L.makeProvider({SMS_PROVIDER:"dryrun"}).send({to:"+221771234567",body:"x"})).ref,/^dry-/);
let seen;const f=async(u,o)=>{seen={u,o};return{ok:true,json:async()=>({id:"P1"})}};
const p=L.makeProvider({SMS_PROVIDER:"http-json",SMS_HTTP_URL:"https://api.example/sms",SMS_HTTP_AUTH:"Bearer k",SMS_SENDER_ID:"MAIRIE"},f);
const r=await p.send({to:"+221771234567",body:'Dit "oui"',ref:"r1"});assert.equal(r.ref,"P1");assert.equal(JSON.parse(seen.o.body).text,'Dit "oui"');assert.equal(seen.o.headers.Authorization,"Bearer k");
const f5=async()=>({ok:false,status:503});await assert.rejects(L.makeProvider({SMS_PROVIDER:"http-json",SMS_HTTP_URL:"https://a.b/c"},f5).send({to:"+2217",body:"x",ref:"r"}),e=>e.retry===true);
const f4=async()=>({ok:false,status:400});await assert.rejects(L.makeProvider({SMS_PROVIDER:"http-json",SMS_HTTP_URL:"https://a.b/c"},f4).send({to:"+2217",body:"x",ref:"r"}),e=>e.retry===false);
// SQL : service_role seul, RLS active, rien dans migrations/
const sql=fs.readFileSync(path.join(__dirname,"..","supabase","proposed","20261121_sms_outbox.sql"),"utf8");
assert.match(sql,/enable row level security/);assert.match(sql,/skip locked/);assert.match(sql,/to service_role/);assert.ok(!/to authenticated;?\s*$/m.test(sql.split("revoke all on function")[1]||""));
assert.ok(!fs.readdirSync(path.join(__dirname,"..","supabase","migrations")).some(x=>/sms/i.test(x)));
const edge=fs.readFileSync(path.join(__dirname,"..","supabase","functions","sms-dispatch","index.ts"),"utf8");assert.ok(edge.indexOf("503")<edge.indexOf("403"));
console.log("OK   SMS : numéros, modèles, segments, quota, reprise, adaptateurs (fail-closed), SQL proposé");
})().catch(e=>{console.error(e);process.exit(1)});
