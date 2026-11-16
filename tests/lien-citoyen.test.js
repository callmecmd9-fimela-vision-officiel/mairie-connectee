const vm=require('vm'),fs=require('fs');
const qrsrc=fs.readFileSync(require('path').join(__dirname,'..','qr.js'),'utf8');
const handlers=[];let rendered=0,upserts=[],uploads=[];
const prt={innerHTML:''};
const ctx={E0:{},LG:{},SP:{administration:{subs:[]},citoyens:{subs:[]}},RP:{},SPL:{},SUB:{},S:{co:'Fimela',cid:'cid1',ind:{slogan:'S',blason:'cid1/b.webp'},sa:false},
 $:s=>s=='#prt'?prt:s=='#lc_co'?{value:'#0B5A2E'}:null,esc:s=>String(s),slug:()=>'fimela',pn:(t,i,b)=>`<section>${t}${b}</section>`,emp:m=>`<p>${m}</p>`,frm:x=>x,rw:()=>'',sel:()=>'',inp:()=>'',ev:()=>'',D:()=>({dmr:[]}),LQ:()=>({order(){return this}}),load:async()=>{},
 render:()=>{rendered++},sb:{from:()=>({upsert:async o=>{upserts.push(o);return{}}}),storage:{from:b=>({download:async()=>({data:{type:'image/webp'}}),upload:async(p,d,o)=>{uploads.push([b,p,o.upsert]);return{}}})}},
 document:{addEventListener:(n,f)=>handlers.push(f),createElement:()=>({}),head:{appendChild(s){ vm.runInContext(qrsrc,ctx);s.onload()}}},window:null,location:{origin:'https://m.x'},navigator:{clipboard:{writeText:async()=>{}}},setTimeout:f=>{ctx.__printed=1},scrollTo(){},confirm:()=>true,console};
ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(require('path').join(__dirname,'..','demarches.js'),'utf8'),ctx);
(async()=>{
 console.log('sub added:',JSON.stringify(ctx.SP.administration.subs),ctx.RP.lienc.join());
 let h=ctx.SUB.lienc();console.log('1er rendu: QR?',/<svg/.test(h),'(attendu false, chargement lazy) ; render rappelé:',rendered);
 h=ctx.SUB.lienc();console.log('2e rendu: QR?',/<svg/.test(h),'| lien:',/https:\/\/m\.x\/\?c=fimela/.test(h));
 const click=async m=>{const t={dataset:{m},textContent:''};for(const f of handlers)await f({target:{closest:sel=>sel.includes('[data-m^=lnk]')&&m.startsWith('lnk')||sel.includes('[data-m^=dm]')&&m.startsWith('dm')?t:null}})};
 await click('lnkcolor');console.log('couleur upsert:',JSON.stringify(upserts));
 await click('lnkblason');console.log('blason upload:',JSON.stringify(uploads));
 await click('lnkprint');console.log('affiche:',/MAIRIE DE FIMELA/.test(prt.innerHTML),/<svg/.test(prt.innerHTML),'print:',!!ctx.__printed,'err:',JSON.stringify(ctx.S.err));
})()
