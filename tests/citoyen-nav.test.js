// Lot 3 : navigation service -> démarches -> formulaire, recherche, retour. node tests/citoyen-nav.test.js
const vm=require('vm'),fs=require('fs'),path=require('path');let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
(async()=>{
 const app={innerHTML:''},handlers={click:[],input:[]},store={mc_co:'fimela'};
 const dm=[{id:'d1',type:'État civil',titre:'Acte de naissance (copie littérale)',delai:'3 jours'},{id:'d2',type:'Travaux publics',titre:'Éclairage public en panne'}];
 const rows={commune_par_slug:[{id:'cid1',slug:'fimela',nom:'Fimela'}],infos_commune:[{nom:'Fimela'}],actualites:[],demarches_commune:dm,identite_commune:[{}],portail_commune:[{}],suivre_demandes:[]};
 const sb={auth:{getSession:async()=>({data:{session:null}}),signOut:async()=>{}},rpc:async n=>({data:rows[n]||[]})};
 const ctx={supabase:{createClient:()=>sb},document:{querySelector:s=>s=='#app'?app:s=='#tl'?{innerHTML:''}:null,getElementById:()=>null,addEventListener:(n,fn)=>(handlers[n]=handlers[n]||[]).push(fn),createElement:()=>({}),head:{appendChild(){}},documentElement:{style:{setProperty(){},removeProperty(){}}},hidden:false},
  localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]},location:{search:'',pathname:'/',origin:'https://m.x',hostname:'x.workers.dev'},history:{replaceState(){}},navigator:{onLine:true},URL,Blob,URLSearchParams,setInterval(){},setTimeout(){},addEventListener(){},scrollTo(){},console,Promise,JSON,Math,Date,crypto:{},matchMedia:()=>({matches:true})};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','citoyen.js'),'utf8'),ctx);
 await new Promise(r=>setTimeout(r,60));
 const click=async d=>{const t={dataset:d,textContent:''};for(const h of handlers.click)await h({target:{closest:s=>s=='[data-a]'?t:null}})};
 const typeq=q=>handlers.input.forEach(h=>h({target:{id:'q',value:q}}));
 const H=()=>app.innerHTML,SS=()=>vm.runInContext('S',ctx);
 console.log('DEBUG accueil:',H().length,(H().match(/data-a="cat"/g)||[]).length,SS().co,SS().err);
 ok('accueil : 10 services affichés',(H().match(/class="tt" data-a="cat"/g)||[]).length===10);
 await click({a:'cat',c:'État civil et documents'});
 ok('État civil : 4 grandes cartes + Autres documents (pas le formulaire)',/Que voulez-vous faire/.test(H())&&(H().match(/data-a="rc"/g)||[]).length===4&&/certificat de résidence/.test(H())&&/data-a="dlgo"/.test(H())&&!/id="fn"/.test(H()));
 ok('cartes : extraits naissance/décès + Autres documents',/Demander un extrait de naissance/.test(H())&&/Demander un extrait de décès/.test(H())&&/Autres documents/.test(H()));
 
 await click({a:'dm',d:'d1'});/*dm sans liste*/
 ok('choix démarche état civil (naissance) : formulaire extrait guidé + infos de la démarche',/id="ecn"/.test(H())&&/Extrait d’acte de naissance/.test(H())&&/Délai indicatif :<\/b> 3 jours/.test(H()));
 await click({a:'back'});ok('retour du formulaire : retour à la liste',/Que voulez-vous faire/.test(H()));
 await click({a:'rc',r:'Demander un extrait de mariage'});
 ok('raccourci extrait de mariage : formulaire guidé avec conjoint',/id="ecc"/.test(H())&&/Extrait d’acte de mariage/.test(H())&&!/id="fm"/.test(H()));
 await click({a:'back'});await click({a:'back'});ok('retour de la liste : accueil',(H().match(/class="tt" data-a="cat"/g)||[]).length===10);
 await click({a:'cat',c:'Sport, culture et associations'});
 ok('service sans démarche ni raccourci : formulaire direct (1 clic)',/id="fn"/.test(H())&&!/Que voulez-vous faire/.test(H()));
 await click({a:'back'});ok('retour du formulaire direct : accueil',/class="tt" data-a="cat"/.test(H()));
 await click({a:'cat',c:'État civil et documents'});await click({a:'rc',r:''});ok('Autre demande : formulaire sans objet prérempli',/id="fn"/.test(H())&&!/id="fo"[^>]*value="D/.test(H()));
 await click({a:'back'});await click({a:'back'});
 await click({a:'cat',c:'Voirie et travaux'});ok('voirie : « Signaler un problème de voirie » proposé',/Signaler un problème de voirie/.test(H()));
 await click({a:'back'});
 // recherche
 SS().q='eclairage';const tl=vm.runInContext('tiles()',ctx);ok('recherche sans accents/casse : démarche trouvée',/Éclairage public en panne/.test(tl)&&/data-a="hit"/.test(tl));
 SS().q='extrait';ok('recherche : raccourcis trouvés',/Demander un extrait de naissance/.test(vm.runInContext('tiles()',ctx)));
 SS().q='zzzzz';ok('recherche vide : message',/Aucun service ne correspond/.test(vm.runInContext('tiles()',ctx)));
 SS().q='eclairage';await click({a:'hit',c:'Voirie et travaux',d:'d2'});
 ok('clic sur un résultat : formulaire direct (2 clics max)',/id="fn"/.test(H())&&SS().q==='');
 await click({a:'back'});ok('retour après résultat : liste de la rubrique ou accueil, pas de blocage',/Que voulez-vous faire/.test(H()));
 // texte de repli
 SS().lang='wo';ok('langue sans traduction : repli sur le français',vm.runInContext('tr("back")',ctx)==='← Retour');
 console.log(f?'ECHECS: '+f:'TOUS OK');process.exit(f?1:0)})();
