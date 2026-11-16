// Test de non-régression : rend toutes les vues avec un DOM/Supabase simulés (node tests/smoke.js)
const vm=require('vm'),fs=require('fs'),path=require('path');const R=path.join(__dirname,'..');
const chain=()=>new Proxy(function(){},{get:(t,p)=>p==='then'?(res)=>res({data:[],error:null}):chain(),apply:()=>chain()});
const el=()=>new Proxy({innerHTML:'',value:'',files:[],dataset:{},children:[],style:{},checked:false,classList:{add(){},remove(){}},addEventListener(){},appendChild(){},remove(){},click(){}},{get:(t,p)=>p in t?t[p]:()=>el()});
function ctx(){const s={console,setTimeout:()=>0,setInterval:()=>0,clearTimeout(){},URL:{createObjectURL:()=>'',revokeObjectURL(){}},Blob:function(){},crypto:{randomUUID:()=>'u',getRandomValues:a=>a},
 localStorage:{getItem:()=>null,setItem(){},removeItem(){}},sessionStorage:{getItem:()=>null,setItem(){}},navigator:{onLine:true},matchMedia:()=>({matches:false}),performance:{now:()=>0},
 location:{search:'',pathname:'/',origin:'https://x',reload(){}},history:{replaceState(){}},confirm:()=>true,scrollTo(){},print(){},createImageBitmap:async()=>({}),caches:{keys:async()=>[],delete:async()=>1}};
 s.document={querySelector:()=>el(),getElementById:()=>el(),createElement:()=>el(),addEventListener(){},body:el(),hidden:false,documentElement:el()};
 s.supabase={createClient:()=>chain()};s.window=s;s.self=s;s.addEventListener=()=>{};s.removeEventListener=()=>{};s.Promise=Promise;s.Date=Date;s.Math=Math;
 return vm.createContext(s)}
const run=(c,files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(R,'js',f+'.js'),'utf8'),c,{filename:f}));
let fail=0;const ok=(n,f)=>{try{const r=f();if(r&&r.then)return r.then(()=>console.log('OK  ',n),e=>{fail++;console.log('FAIL',n,String(e&&e.message||e).slice(0,200))});console.log('OK  ',n,r===undefined?'':r)}catch(e){fail++;console.log('FAIL',n,e.message.slice(0,200))}};
// citoyen
let c=ctx();run(c,['citoyen']);
ok('citoyen: accueil sans commune',()=>vm.runInContext('render();$("#app").innerHTML.length>=0',c));
ok('citoyen: accueil/form/detail',()=>vm.runInContext(`S.co="Fimela";S.slug="fimela";S.cid="1";S.info={};S.pub=[{texte:"x"}];render();home().length>50&&(S.cat="Audience",form().length>50)&&(S.cat=null,S.res={type:"t",numero:"n",cree:"2026-01-01",statut:"nouvelle",historique:[{date:"2026-01-01",statut:"nouvelle"}]},detail().length>50)`,c));
// mairie
for(const [role,sa] of [['maire',0],['adjoint',0],['secretariat',0],['cabinet',0],['finances',0],['rh',0],['etat_civil',0],['technique',0],['agent',0],['super_admin',1]]){
 c=ctx();run(c,['core','adjoints','secretariat','superadmin','maire','actions']);
 ok('mairie '+role,()=>vm.runInContext(`S.role="cab";S.cid="c1";S.uid="u1";S.co="Fimela";S.pr="${role}";S.sa=${!!sa};S.email="a@b.c";S.pm={};S.pu={};S.mod={};
 S.db.proj=[{id:1,titre:"p",statut:"en_cours",avancement:10,budget:5,categorie:"Santé",lat:1,lng:1,date_fin:"2020-01-01"}];S.db.cr=[{id:1,sens:"in",statut:"recu",objet:"o",correspondant:"c",date_reception:T,priorite:"normale"}];
 let n=0,v=NAV().map(x=>x[0]);const tabsAll=Object.values(SP).flatMap(x=>x.subs.map(s=>[x.v,x.v==="s_admin"?s[0]:s[0]]));
 v.forEach(k=>{S.view=k;if(!okv(k))return;const h=V[k]();if(typeof h!=="string"||h.includes("undefined</")||h.includes("[object"))throw new Error("vue "+k);n++});
 for(const k in SP){if(!espAll().includes(SP[k]))continue;for(const s of SP[k].subs){if(!can(s[0])||!SUB[s[0]])continue;S.view=SP[k].v;S.tab[k]=s[0];const h=V[SP[k].v]();if(typeof h!=="string"||h.includes("[object")||h.includes("NaN FCFA"))throw new Error("onglet "+s[0]);n++}}
 render();n`,c))}
// saas
c=ctx();run(c,['saas']);
ok('saas: login+vues',()=>vm.runInContext(`let n=0;render();S.st="app";S.d={mairies:1,par_statut:{},inscriptions:[]};S.me="x";for(const k of NAV.map(x=>x[0])){S.v=k;if(V[k]().length<10)throw new Error(k);n++}S.tb="fac";S.v="abos";V.abos();S.tb="off";V.abos();n`,c));
// sw
ok('sw.js syntaxe',()=>{new vm.Script(fs.readFileSync(path.join(R,'sw.js'),'utf8'))});
setTimeout(()=>{},0);
ok('sw: réseau puis cache hors-ligne',()=>{const ls={},store={};let online=true;
 const sc={location:{origin:'https://x'},URL,Response:{error:()=>'ERR'},caches:{keys:async()=>[],delete:async()=>1,open:async()=>({put:async(r,c)=>{store[r.url]=c}}),match:async r=>store[r.url||r]},
 fetch:async r=>{if(!online)throw 0;return{ok:true,type:'basic',clone:()=>'CLONE',url:r.url}},skipWaiting(){},clients:{claim(){}},addEventListener:(n,f)=>ls[n]=f};
 sc.self=sc;vm.runInNewContext(fs.readFileSync(path.join(R,'sw.js'),'utf8'),sc);let out;const ev=(url,m='GET',mode='no-cors')=>{out=undefined;ls.fetch({request:{url,method:m,mode},respondWith:p=>out=p});return out};
 return ev('https://x/js/core.js').then(()=>{online=false;return ev('https://x/js/core.js')}).then(r=>{if(r!=='CLONE')throw new Error('cache KO '+r);return ev('https://x/zz','GET','navigate')}).then(r=>{if(r!=='ERR'&&r!==undefined)throw new Error('nav '+r);if(ev('https://aiqegpijisspankpkwfj.supabase.co/rest','GET')!==undefined)throw new Error('cross-origin intercepté');if(ev('https://x/api','POST')!==undefined)throw new Error('POST intercepté');0})});
setTimeout(()=>{console.log(fail?'ECHECS: '+fail:'TOUS OK');process.exit(fail?1:0)},300);
// pagination : 2500 projets => 3 pages
(async()=>{const c=ctx();run(c,['core','adjoints','secretariat','superadmin','maire','actions']);
 const r=await vm.runInContext(`(async()=>{const all=Array.from({length:2500},(_,i)=>({id:i,statut:"x",avancement:0,budget:0,titre:"t"}));
 const mk=(a,b)=>({order(){return this},range(x,y){return Promise.resolve({data:all.slice(x,y+1),error:null})},then(f){return Promise.resolve({data:all.slice(0,1000),error:null}).then(f)}});
 LG.projets=[()=>mk(),r=>{S.db.proj=r}];S.role="cab";S.cid="c";S.pr="maire";S.uid="u";S.ind={};
 const o=sb;await load(["projets"]);return S.db.proj.length+"|"+S.err})()`,c);
 if(r.startsWith("2500|"))console.log('OK   pagination 2500 lignes');else{fail++;console.log('FAIL pagination',r)}})();
