// Multilingue : aucune langue non validée/incomplète n’est proposée ; repli français. node tests/i18n.test.js
const vm=require('vm'),fs=require('fs'),path=require('path');let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
(async()=>{
 const app={innerHTML:''},handlers={click:[],input:[]},store={mc_co:'fimela'};
 const dm=[{id:'d1',type:'État civil',titre:'Acte de naissance (copie littérale)',delai:'3 jours'},{id:'d2',type:'Travaux publics',titre:'Éclairage public en panne'}];
 const rows={commune_par_slug:[{id:'cid1',slug:'fimela',nom:'Fimela'}],infos_commune:[{nom:'Fimela'}],actualites:[],demarches_commune:dm,identite_commune:[{}],portail_commune:[{}],suivre_demandes:[]};
 const sb={auth:{getSession:async()=>({data:{session:null}}),signOut:async()=>{}},rpc:async n=>({data:rows[n]||[]})};
 const ctx={supabase:{createClient:()=>sb},document:{querySelector:s=>s=='#app'?app:s=='#tl'?{innerHTML:''}:null,getElementById:()=>null,addEventListener:(n,fn)=>(handlers[n]=handlers[n]||[]).push(fn),createElement:()=>({}),head:{appendChild(){}},documentElement:{style:{setProperty(){},removeProperty(){}}},hidden:false},
  localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]},location:{search:'',pathname:'/',origin:'https://m.x',hostname:'x.workers.dev'},history:{replaceState(){}},navigator:{onLine:true},URL,Blob,URLSearchParams,setInterval(){},setTimeout(){},addEventListener(){},scrollTo(){},console,Promise,JSON,Math,Date,crypto:{},matchMedia:()=>({matches:true})};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js','i18n.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js','citoyen.js'),'utf8'),ctx);
 await new Promise(r=>setTimeout(r,60));
 const click=async d=>{const t={dataset:d,textContent:''};for(const h of handlers.click)await h({target:{closest:s=>s=='[data-a]'?t:null}})};
 const typeq=q=>handlers.input.forEach(h=>h({target:{id:'q',value:q}}));
 const H=()=>app.innerHTML,SS=()=>vm.runInContext("S",ctx),ev=c=>vm.runInContext(c,ctx);
 ok('accueil : textes via tr() (français)',/Faire une demande/.test(H())&&/Nos services municipaux/.test(H())&&/placeholder="Numéro de suivi…"/.test(H()));
 ok('livré : seul le wolof (validé, 100 % des clés) est proposé ; sereer absent',ev('langsOk().join()')==='wo'&&/data-a="lang" data-l="wo"/.test(H())&&!/data-l="sr"/.test(H()));ok('wolof livré : toutes les clés du français traduites, aucune vide',ev('Object.keys(TX.fr).every(k=>typeof TX.wo[k]==="string"&&TX.wo[k].trim())'));
 // wolof « validé » mais incomplet : toujours refusé
 ev('window.MC_LANGS.wo.statut="valide";TX.wo={back:"x"}');ok('langue validée mais incomplète : refusée',ev('langsOk().length')===0);
 // wolof non validé mais complet : refusé
 ev('window.MC_LANGS.wo.statut="a_valider";TX.wo=Object.fromEntries(Object.keys(TX.fr).map(k=>[k,"w_"+k]))');ok('langue complète mais non validée : refusée',ev('langsOk().length')===0);
 // validée + complète : proposée, choix mémorisé
 ev('window.MC_LANGS.wo.statut="valide"');ev('render()');ok('langue validée et complète : sélecteur affiché',ev('langsOk().join()')==='wo'&&/data-a="lang" data-l="wo"/.test(H()));
 await click({a:'lang',l:'wo'});ok('choix wolof appliqué + mémorisé',SS().lang==='wo'&&store.mc_lang==='wo'&&/w_h_req/.test(H()));
 await click({a:'lang',l:'sr'});ok('langue non proposée refusée',SS().lang==='wo');
 await click({a:'lang',l:'fr'});ok('retour français',SS().lang==='fr'&&/Faire une demande/.test(H()));
 // clé absente : repli
 ev('delete TX.wo.h_req');SS().lang='wo';ok('clé manquante : repli sur le français',ev('tr("h_req")')==='Faire une demande');
 const csv=fs.readFileSync(path.join(__dirname,'..','docs','i18n','textes_a_valider.csv'),'utf8');ok('CSV linguistes couvre toutes les clés',ev('Object.keys(TX.fr)').every(k=>csv.includes('\n'+k+',')));
 const i18n=require('./_compact.js').compact(fs.readFileSync(path.join(__dirname,'..','js','i18n.js'),'utf8'));ok('livré : wo « valide », sr « a_valider » et sans texte',/wo:\{nom:"Wolof",statut:"valide"\}/.test(i18n)&&/sr:\{nom:"Sereer",statut:"a_valider"\}/.test(i18n)&&/sr:\{\}\}/.test(i18n));
 console.log(f?'ÉCHECS '+f:'TOUS OK');process.exit(f?1:0);
})();
