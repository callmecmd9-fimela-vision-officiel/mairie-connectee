// Lot D : délégations reçues, chargement sensible, traçabilité, Mon poste. node tests/org-d.test.js (arbre réel : js/*.js)
const vm=require('vm'),fs=require('fs'),path=require('path');const R=path.join(__dirname,'..');let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
const chain=()=>new Proxy(function(){},{get:(t,p)=>p==='then'?(res)=>res({data:[],error:null}):chain(),apply:()=>chain()});
const el=()=>new Proxy({innerHTML:'',value:'',files:[],dataset:{},children:[],style:{},checked:false,classList:{add(){},remove(){}},addEventListener(){},appendChild(){},remove(){},click(){}},{get:(t,p)=>p in t?t[p]:()=>el()});
function ctx(sbx){const s={console,setTimeout:()=>0,setInterval:()=>0,clearTimeout(){},URL:{createObjectURL:()=>'',revokeObjectURL(){}},Blob:function(){},crypto:{randomUUID:()=>'u',getRandomValues:a=>a},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},sessionStorage:{getItem:()=>null,setItem(){}},navigator:{onLine:true},matchMedia:()=>({matches:false}),performance:{now:()=>0},location:{search:'',pathname:'/',origin:'https://x',reload(){}},history:{replaceState(){}},confirm:()=>true,scrollTo(){},print(){},createImageBitmap:async()=>({}),caches:{keys:async()=>[],delete:async()=>1}};
 s.handlers=[];s.document={querySelector:()=>el(),getElementById:()=>el(),createElement:()=>el(),addEventListener:(n,fn)=>s.handlers.push(fn),body:el(),hidden:false,documentElement:el()};
 s.supabase={createClient:()=>sbx||chain()};s.window=s;s.self=s;s.addEventListener=()=>{};s.removeEventListener=()=>{};s.Promise=Promise;s.Date=Date;s.Math=Math;return vm.createContext(s)}
const run=(c,l)=>l.forEach(x=>vm.runInContext(fs.readFileSync(path.join(R,'js',x+'.js'),'utf8'),c,{filename:x}));
const FILES=['core','core-ui','regles-municipales','adjoints','secretariat','superadmin','maire','demarches','org','org-d','actions'];
(async()=>{
 const calls=[],from=[],tb={org_roles:[{code:'rrh',nom:'Responsable RH',actif:true}],org_postes:[{code:'rh1',nom:'Responsable RH',role_code:'rrh',service_code:'etat_civil',actif:true}],org_affectations:[{id:'a1',user_id:'u2',poste_code:'rh1',debut:'2026-01-01',actif:true}],
  org_role_droits:[{role_code:'rrh',module:'personnel',action:'consulter'}],
  org_delegations_droits:[{id:'g1',de_user:'u1',a_user:'u2',module:'paie',action:'consulter',debut:'2026-01-01T00:00:00Z',fin:'2099-01-01T00:00:00Z'},{id:'g2',de_user:'u1',a_user:'u2',module:'conges',action:'consulter',debut:'2020-01-01T00:00:00Z',fin:'2020-06-01T00:00:00Z'}],
  profiles:[{id:'u2',nom:'Awa Diop',role:'agent',actif:true}],personnel:[{id:'p1',nom:'N',prenom:'P',actif:true}],acces_sensibles:[{user_id:'u2',module:'paie',created_at:'2026-11-17T10:00:00Z'}]};
 const q=t=>{from.push(t);const b={select(){return b},order(){return b},limit(){return b},range(){return b},eq(){return b},in(){return b},then(r,j){return Promise.resolve({data:tb[t]||[],error:null}).then(r,j)}};return b};
 const sbx={from:q,rpc:async(n,a)=>{calls.push([n,a]);return{data:null,error:null}},storage:{from:()=>({createSignedUrls:async()=>({data:[]})})},auth:{onAuthStateChange(){},getSession:async()=>({data:{session:null}})},functions:{invoke:async()=>({})}};
 const c=ctx(sbx);run(c,FILES);const E=s=>vm.runInContext(s,c),w=()=>new Promise(r=>setTimeout(r,20));
 E(`S.role="cab";S.cid="c1";S.uid="u2";S.co="Fimela";S.pr="agent";S.sa=false;S.pm={};S.pu={};S.mod={};S.email="a@b.c";S.orgMy=null`);
 await E(`orgMine().then(()=>orgDeleg())`);
 ok('poste + délégation reçue active : menus personnel et paie ; délégation expirée (conges) ignorée',E(`can("personnel")&&can("paie")&&!can("conges")`));
 ok('Mon poste et Mes délégations visibles (non-maire avec poste)',E(`can("monposte")&&can("mydeleg")`));
 await E(`orgDx()`);ok('données sensibles chargées pour le poste habilité (personnel, paies, paie_lignes)',from.includes('personnel')&&from.includes('paie_lignes')&&E(`D().per.length`)==1);
 E(`SUB.monposte()`);await w();const H=E(`SUB.monposte()`);ok('Mon poste : poste, délégation reçue',/Responsable RH/.test(H)&&/Délégations reçues/.test(H));
 E(`SUB.mydeleg()`);await w();ok('Mes délégations : formulaire pour un non-maire',/Déléguer un droit/.test(E(`SUB.mydeleg()`)));
 E(`SUB.personnel();SUB.personnel()`);ok('traçabilité : 1 appel org_tracer pour 2 ouvertures',calls.filter(x=>x[0]=='org_tracer'&&x[1].p_module=='personnel').length==1);
 E(`S.orgMy=null;S.uid="u9"`);ok('sans poste ni délégation : aucun changement (can inchangé, pas de Mon poste)',!E(`can("personnel")||can("monposte")`));
 E(`S.pr="maire";S.uid="u1";S.orgMy=null`);E(`SUB.acces()`);await w();ok('maire : Consultations sensibles listées',/Awa Diop|—/.test(E(`SUB.acces()`))&&/Paie/.test(E(`SUB.acces()`)));
 ok('maire : Mon poste invisible',!E(`can("monposte")`));
 ok('régression : vues maire existantes',E(`NAV().map(x=>x[0]).every(k=>{S.view=k;return !okv(k)||typeof V[k]()=="string"})`));
 console.log(f?'ECHECS: '+f:'TOUS OK');process.exit(f?1:0)})();
