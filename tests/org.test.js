// Lot B : vues organigramme/droits, branchement can(), actions. node tests/org.test.js
const vm=require('vm'),fs=require('fs'),path=require('path');const R=path.join(__dirname,'..');let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
const chain=()=>new Proxy(function(){},{get:(t,p)=>p==='then'?(res)=>res({data:[],error:null}):chain(),apply:()=>chain()});
const el=()=>new Proxy({innerHTML:'',value:'',files:[],dataset:{},children:[],style:{},checked:false,classList:{add(){},remove(){}},addEventListener(){},appendChild(){},remove(){},click(){}},{get:(t,p)=>p in t?t[p]:()=>el()});
function ctx(sbx){const s={console,setTimeout:()=>0,setInterval:()=>0,clearTimeout(){},URL:{createObjectURL:()=>'',revokeObjectURL(){}},Blob:function(){},crypto:{randomUUID:()=>'u',getRandomValues:a=>a},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},sessionStorage:{getItem:()=>null,setItem(){}},navigator:{onLine:true},matchMedia:()=>({matches:false}),performance:{now:()=>0},location:{search:'',pathname:'/',origin:'https://x',reload(){}},history:{replaceState(){}},confirm:()=>true,scrollTo(){},print(){},createImageBitmap:async()=>({}),caches:{keys:async()=>[],delete:async()=>1}};
 s.handlers=[];s.document={querySelector:()=>el(),getElementById:()=>el(),createElement:()=>el(),addEventListener:(n,fn)=>s.handlers.push(fn),body:el(),hidden:false,documentElement:el()};
 s.supabase={createClient:()=>sbx||chain()};s.window=s;s.self=s;s.addEventListener=()=>{};s.removeEventListener=()=>{};s.Promise=Promise;s.Date=Date;s.Math=Math;return vm.createContext(s)}
const run=(c,l)=>l.forEach(x=>vm.runInContext(fs.readFileSync(path.join(R,'js',x+'.js'),'utf8'),c,{filename:x}));
const FILES=['core','core-ui','regles-municipales','adjoints','secretariat','superadmin','maire','demarches','org','actions'];
(async()=>{
 const calls=[],tb={org_roles:[{code:'resp_finances',nom:'Responsable finances',actif:true},{code:'agent_polyvalent',nom:'Agent polyvalent',actif:true}],org_postes:[{code:'maire',nom:'Maire',role_code:'resp_finances',actif:true},{code:'resp_finances',nom:'Responsable finances',role_code:'resp_finances',parent_code:'maire',actif:true}],org_affectations:[{id:'a1',user_id:'u2',poste_code:'resp_finances',debut:'2026-01-01',actif:true}],org_delegations_droits:[{id:'g1',de_user:'u1',a_user:'u2',module:'budget',action:'valider',debut:'2026-11-01T00:00:00Z',fin:'2099-01-01T00:00:00Z'}],profiles:[{id:'u2',nom:'Awa Diop',role:'finances',actif:true}],org_role_droits:[{role_code:'resp_finances',module:'budget',action:'consulter'}]};
 const q=t=>{const b={select(){return b},order(){return b},limit(){return b},range(){return b},eq(){return b},in(){return b},then(r,j){return Promise.resolve({data:tb[t]||[],error:null}).then(r,j)}};return b};
 const sbx={from:q,rpc:async(n,a)=>{calls.push([n,a]);return{data:null,error:null}},storage:{from:()=>({createSignedUrls:async()=>({data:[]})})},auth:{onAuthStateChange(){},getSession:async()=>({data:{session:null}})},functions:{invoke:async()=>({})}};
 const c=ctx(sbx);run(c,FILES);
 const E=s=>vm.runInContext(s,c);
 E(`S.role="cab";S.cid="c1";S.uid="u1";S.co="Fimela";S.pr="maire";S.sa=false;S.pm={};S.pu={};S.mod={};S.email="a@b.c"`);
 E(`S.view=SP.administration.v;S.tab.administration="org";orgView()`);await new Promise(r=>setTimeout(r,20));
 const H=E(`orgView()`);
 E(`S.pr="maire"`);
 ok('organigramme rendu (hiérarchie + rôle + effectif)',/Organigramme de Fimela/.test(H)&&/Responsable finances/.test(H)&&/1 personne/.test(H));
 E(`S.tab.orgt="roles"`);const H2=E(`orgView()`);
 ok('matrice de droits : 26 modules x 11 actions, droit existant actif',(H2.match(/data-m="orgdr"/g)||[]).length==286&&/data-ac="consulter" data-on="0" aria-pressed="true"/.test(H2));
 E(`S.tab.orgt="del"`);ok('délégations : statut Active et bouton Révoquer',/Active/.test(E(`orgView()`))&&/data-m="orgdv"/.test(E(`orgView()`)));
 const click=async d=>{const t={dataset:d,textContent:''};for(const h of c.handlers)await h({target:{closest:s=>s.includes('[data-m^=org]')?t:null}})};
 await click({m:'orgdr',r:'resp_finances',mo:'budget',ac:'signer',on:'1'});
 const r1=calls.pop();ok('toggle droit -> rpc org_role_droit_set',r1&&r1[0]=='org_role_droit_set'&&r1[1].p_role=='resp_finances'&&r1[1].p_module=='budget'&&r1[1].p_action=='signer'&&r1[1].p_on===true);
 await click({m:'orgdv',id:'g1'});ok('révocation -> rpc org_revoquer',calls.some(x=>x[0]=='org_revoquer'&&x[1].p_id=='g1'));
 // can() : aucun effet sans affectation ; effet limité à "consulter" avec affectation
 E(`S.pr="agent";S.orgMy=null`);ok('sans affectation : can() inchangé (budget refusé à un agent)',!E(`can("budget")`));
 E(`S.orgMy=new Set(["consulter|budget","creer|marches"])`);
 ok('avec droit de consulter : écran budget visible ; marches (création seule) non',E(`can("budget")`)&&!E(`can("marches")`));
 E(`S.pu={budget:false}`);ok('refus individuel explicite prioritaire',!E(`can("budget")`));
 E(`S.pu={};S.mod={budget:false}`);ok('module désactivé : jamais visible',!E(`orgCan("budget")`));
 // régression : vues existantes toujours rendues
 E(`S.pr="maire";S.mod={};S.orgMy=null`);
 ok('régression : vues maire existantes',E(`NAV().map(x=>x[0]).every(k=>{S.view=k;return !okv(k)||typeof V[k]()=="string"})`));
 console.log(f?'ECHECS: '+f:'TOUS OK');process.exit(f?1:0)})();
