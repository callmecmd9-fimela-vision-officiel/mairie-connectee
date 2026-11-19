// Lot E : boutons d'écriture selon les droits des postes. node tests/org-e.test.js
// Partie 1 (unitaire, autonome) : logique de js/org-e.js avec de faux écrans. Partie 2 : vrais écrans (arbre js/*.js complet requis, sinon ignorée).
const vm=require('vm'),fs=require('fs'),path=require('path');const R=path.join(__dirname,'..');let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
const src=fs.readFileSync(path.join(R,'js','org-e.js'),'utf8');
// ---- Partie 1
const mk=pr=>{const c=vm.createContext({console});vm.runInContext(`var S={sa:false,pr:${JSON.stringify(pr)},orgMy:null};var seen=[];
 var SUB={paie(){seen.push(S.pr);return S.pr},remun(){return S.pr},personnel(){return S.pr},conges(){return S.pr},marches(){return S.pr},autre(){return S.pr}};
 const W=SUB.paie;`,c);vm.runInContext(src,c);return c};
const E=(c,s)=>vm.runInContext(s,c);
let c=mk('agent');
ok('sans poste ni délégation : aucun changement',E(c,'SUB.paie()')==='agent'&&E(c,'SUB.marches()')==='agent');
E(c,'S.orgMy=new Set(["valider|paie"])');ok('paie.valider : rendu comme RH',E(c,'SUB.paie()')==='rh');
E(c,'S.orgMy=new Set(["signer|paie"])');ok('paie.signer : rendu comme maire',E(c,'SUB.paie()')==='maire');
E(c,'S.orgMy=new Set(["consulter|paie"])');ok('consulter seul : aucun bouton d\'écriture en plus',E(c,'SUB.paie()')==='agent');
E(c,'S.orgMy=new Set(["creer|marches"])');ok('marches.creer : rendu comme finances',E(c,'SUB.marches()')==='finances');
E(c,'S.orgMy=new Set(["creer|personnel","modifier|conges"])');ok('personnel et congés : rendu comme RH, remun inchangé',E(c,'SUB.personnel()')==='rh'&&E(c,'SUB.conges()')==='rh'&&E(c,'SUB.remun()')==='agent');
ok('S.pr restauré après le rendu',E(c,'S.pr')==='agent');
ok('un écran non concerné reste inchangé',E(c,'SUB.autre()')==='agent');
c=mk('finances');E(c,'S.orgMy=new Set(["valider|paie"])');ok('rôle historique déjà habilité (finances) : inchangé',E(c,'SUB.paie()')==='finances');
c=mk('maire');E(c,'S.orgMy=new Set(["signer|paie"])');ok('maire : inchangé',E(c,'SUB.paie()')==='maire');
c=mk('agent');E(c,'S.sa=true;S.orgMy=new Set(["valider|paie"])');ok('super-admin : inchangé',E(c,'SUB.paie()')==='agent');
{const c2=vm.createContext({console});vm.runInContext(`var S={sa:false,pr:"agent",orgMy:new Set(["valider|paie"])};var SUB={paie(){throw new Error("x")}};`,c2);vm.runInContext(src,c2);
let thrown=false;try{E(c2,'SUB.paie()')}catch(e){thrown=true}ok('exception pendant le rendu : propagée et S.pr restauré',thrown&&E(c2,'S.pr')==='agent')}
// ---- Partie 2 (vrais écrans)
const FILES=['core','adjoints','secretariat','superadmin','maire','demarches','org','org-d','org-e','actions'];
if(!FILES.every(x=>fs.existsSync(path.join(R,'js',x+'.js')))){console.log('Partie 2 ignorée : arbre js/ incomplet');console.log(f?'ECHECS: '+f:'TOUS OK (partie 1)');process.exit(f?1:0)}
const chain=()=>new Proxy(function(){},{get:(t,p)=>p==='then'?(res)=>res({data:[],error:null}):chain(),apply:()=>chain()});
const el=()=>new Proxy({innerHTML:'',value:'',files:[],dataset:{},children:[],style:{},checked:false,classList:{add(){},remove(){}},addEventListener(){},appendChild(){},remove(){},click(){}},{get:(t,p)=>p in t?t[p]:()=>el()});
const s={console,setTimeout:()=>0,setInterval:()=>0,clearTimeout(){},URL:{createObjectURL:()=>'',revokeObjectURL(){}},Blob:function(){},crypto:{randomUUID:()=>'u',getRandomValues:a=>a},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},sessionStorage:{getItem:()=>null,setItem(){}},navigator:{onLine:true},matchMedia:()=>({matches:false}),performance:{now:()=>0},location:{search:'',pathname:'/',origin:'https://x',reload(){}},history:{replaceState(){}},confirm:()=>true,scrollTo(){},print(){},createImageBitmap:async()=>({}),caches:{keys:async()=>[],delete:async()=>1}};
s.document={querySelector:()=>el(),getElementById:()=>el(),createElement:()=>el(),addEventListener(){},body:el(),hidden:false,documentElement:el()};
s.supabase={createClient:()=>({from:()=>chain(),rpc:async()=>({data:null,error:null}),storage:{from:()=>({createSignedUrls:async()=>({data:[]})})},auth:{onAuthStateChange(){},getSession:async()=>({data:{session:null}})},functions:{invoke:async()=>({})}})};
s.window=s;s.self=s;s.addEventListener=()=>{};s.removeEventListener=()=>{};s.Promise=Promise;s.Date=Date;s.Math=Math;const x=vm.createContext(s);
FILES.forEach(n=>vm.runInContext(fs.readFileSync(path.join(R,'js',n+'.js'),'utf8'),x,{filename:n}));
const X=q=>vm.runInContext(q,x);
X(`S.role="cab";S.cid="c1";S.uid="u2";S.co="Fimela";S.pr="agent";S.sa=false;S.pm={};S.pu={};S.mod={};S.email="a@b.c"`);
X(`S.orgMy=null`);ok('vrai écran paie, sans droit : pas de formulaire « Préparer la paie »',!/Préparer la paie d.un mois/.test(X(`SUB.paie()`)));
X(`S.orgMy=new Set(["consulter|paie","creer|paie"])`);ok('vrai écran paie, paie.creer : formulaire « Préparer la paie »',/Préparer la paie d.un mois/.test(X(`SUB.paie()`)));
X(`S.orgMy=new Set(["consulter|marches","creer|marches"])`);ok('vrai écran marchés, marches.creer : « Nouveau marché »',/Nouveau marché/.test(X(`SUB.marches()`)));
X(`S.orgMy=new Set(["consulter|personnel","creer|personnel"])`);ok('vrai écran personnel, personnel.creer : « Nouvel agent »',/Nouvel agent/.test(X(`SUB.personnel()`)));
X(`S.orgMy=new Set(["consulter|conges","creer|conges"])`);ok('vrai écran congés, conges.creer : « Nouvelle demande »',/Nouvelle demande de congé/.test(X(`SUB.conges()`)));
X(`S.orgMy=null;S.pr="rh"`);ok('régression : RH historique voit toujours « Préparer la paie »',/Préparer la paie d.un mois/.test(X(`SUB.paie()`)));
ok('S.pr restauré',X(`S.pr`)==='rh');
console.log(f?'ECHECS: '+f:'TOUS OK');process.exit(f?1:0);
