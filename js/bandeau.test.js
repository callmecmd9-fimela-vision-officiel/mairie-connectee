const vm=require('vm'),fs=require('fs');let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
function mk(ind,compFn,dlErr){const handlers=[],uploads=[];
 const ctx={E0:{},LG:{},SP:{administration:{subs:[]},citoyens:{subs:[]}},RP:{},SPL:{},SUB:{},S:{co:'Fimela',cid:'cid1',ind,sa:false},$:()=>null,esc:s=>String(s),slug:()=>'fimela',pn:(t,i,b)=>`<section>${t}${b}</section>`,emp:m=>m,frm:x=>x,rw:()=>'',sel:()=>'',inp:()=>'',ev:()=>'',D:()=>({dmr:[]}),LQ:()=>({order(){return this}}),load:async()=>{},render(){},
 comp:compFn,kb:n=>Math.round(n/1e3)+' Ko',
 sb:{from:()=>({}),storage:{from:b=>({download:async p=>dlErr?{error:{message:'introuvable'}}:{data:{type:'image/jpeg',p}},upload:async(p,d,o)=>{uploads.push([b,p,o.upsert,o.contentType,d.size]);return{}}})}},
 document:{addEventListener:(n,fn)=>handlers.push(fn),createElement:()=>({}),head:{appendChild(){}}},window:{},location:{origin:'https://m.x'},navigator:{},setTimeout(){},scrollTo(){},confirm:()=>true,console};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(require('path').join(__dirname,'..','demarches.js'),'utf8'),ctx);
 const click=async()=>{const t={dataset:{m:'lnkbandeau'},textContent:''};for(const h of handlers)await h({target:{closest:s=>s.includes('lnk')?t:null}})};
 return{ctx,uploads,click}}
(async()=>{
 let t=mk({bandeau:'cid1/photo.jpg'},async(b,mx,tg)=>({type:'image/webp',size:mx==1280?100000:30000,mx,tg}));await t.click();
 ok('publication : 2 fichiers WebP dans le dossier de la commune (cid1/)',t.uploads.length==2&&t.uploads.every(u=>u[0]=='identite'&&u[1].startsWith('cid1/')&&u[3]=='image/webp'&&u[2]===true));
 ok('publication : version mobile d\'abord, puis ordinateur',t.uploads[0][1]=='cid1/bandeau-m.webp'&&t.uploads[1][1]=='cid1/bandeau.webp');
 ok('fichiers envoyés = versions réduites (mobile puis ordinateur)',t.uploads[0][4]==30000&&t.uploads[1][4]==100000);
 ok('message de succès',/publiée/.test(t.ctx.S.err)&&!/impossible|Envoyez/.test(t.ctx.S.err));
 t=mk({},async()=>({}));await t.click();ok('sans photo envoyée : message clair, rien publié',/Envoyez d’abord la photo/.test(t.ctx.S.err)&&t.uploads.length==0);
 t=mk({bandeau:'x'},async()=>({type:'image/jpeg',size:1000}));await t.click();ok('navigateur sans WebP : refus, rien publié',/WebP/.test(t.ctx.S.err)&&t.uploads.length==0);
 t=mk({bandeau:'x'},async(b,mx)=>({type:'image/webp',size:mx==720?10000:310000}));await t.click();ok('image > 300 Ko : refus, rien publié (la limite du bucket serait atteinte)',/trop lourde/.test(t.ctx.S.err)&&t.uploads.length==0);
 t=mk({bandeau:'x'},async()=>({}),true);await t.click();ok('téléchargement impossible : message, rien publié',/introuvable/.test(t.ctx.S.err)&&t.uploads.length==0);
 console.log(f?'ECHECS: '+f:'TOUS OK');process.exit(f?1:0)})();
