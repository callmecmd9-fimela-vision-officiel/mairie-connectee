// Lot 6 : rendez-vous (formulaire, envoi, suivi, sans compte). node tests/citoyen-rdv.test.js
const vm=require('vm'),fs=require('fs'),path=require('path');let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
async function boot({user=true,rv=[]}={}){
 const app={innerHTML:''},handlers={click:[],change:[]},els={},rpcs=[],log=[],store={mc_co:'fimela'};const U={id:'u1',phone:'221771234567'};
 const from=t=>{const b={select(){return b},order(){return b},limit(){return b},maybeSingle(){return b},eq(){return b},update(){return b},then(r,j){return Promise.resolve({data:t=='citoyens'?{prenom:'Awa',nom:'Diop'}:[],error:null}).then(r,j)}};return b};
 const sb={auth:{getSession:async()=>({data:{session:user?{user:U}:null}}),signOut:async()=>{log.push('out')},signInAnonymously:async()=>{log.push('anon');return{}}},from,
  rpc:async(n,a)=>{rpcs.push([n,a]);if(n=='commune_par_slug')return{data:[{id:'cid1',slug:'fimela',nom:'Fimela'}]};if(n=='infos_commune')return{data:[{nom:'Fimela'}]};if(n=='portail_commune')return{data:[{horaires:'08h - 17h'}]};
   if(n=='mes_rdvs')return{data:rv};if(n=='creer_rdv')return{data:'RDV-ABCD1234'};return{data:[]}}};
 const ctx={supabase:{createClient:()=>sb},document:{querySelector:s=>s=='#app'?app:els[s]||null,getElementById:()=>null,addEventListener:(n,fn)=>(handlers[n]=handlers[n]||[]).push(fn),createElement:()=>({}),head:{appendChild(){}},documentElement:{style:{setProperty(){},removeProperty(){}}},hidden:false},
  localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]},location:{search:'',pathname:'/',origin:'https://m.x',hostname:'x.workers.dev'},history:{replaceState(){}},navigator:{onLine:true},URL,Blob,URLSearchParams,setInterval(){},setTimeout(){},addEventListener(){},scrollTo(){},console,Promise,JSON,Math,Date,crypto:{},matchMedia:()=>({matches:true})};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js','citoyen.js'),'utf8'),ctx);await new Promise(r=>setTimeout(r,60));
 const click=async d=>{const t={dataset:d,textContent:''};for(const h of handlers.click)await h({target:{closest:s=>s=='[data-a]'?t:null}})};
 return{app,els,rpcs,log,store,click,H:()=>app.innerHTML,S:()=>vm.runInContext('S',ctx)}}
(async()=>{
 const dt=n=>new Date(Date.now()+n*864e5).toISOString().slice(0,10);
 let t=await boot();
 ok('accueil : carte « Prendre rendez-vous » ouvre le formulaire dédié',/data-a="rdv"/.test(t.H()));
 await t.click({a:'rdv'});
 ok('formulaire : service, motif, date ; identité du compte non redemandée',/id="rs"/.test(t.H())&&/id="rm"/.test(t.H())&&/id="rd"/.test(t.H())&&!/id="fn"/.test(t.H())&&/n’est confirmé que lorsque/.test(t.H())&&/08h - 17h/.test(t.H()));
 t.els['#rs']={value:'maire'};t.els['#rm']={value:''};t.els['#rd']={value:dt(5)};
 await t.click({a:'rsend'});ok('motif vide refusé, rien envoyé',/motif/.test(t.H())&&!t.rpcs.some(x=>x[0]=='creer_rdv'));
 t.els['#rm']={value:'Parler du terrain'};t.els['#rd']={value:''};await t.click({a:'rsend'});ok('date manquante refusée',/Choisissez une date/.test(t.H()));
 t.els['#rd']={value:dt(5)};await t.click({a:'rsend'});
 const c=t.rpcs.filter(x=>x[0]=='creer_rdv')[0];
 ok('envoi : slug (pas d’id commune), service, nom du compte, date',c&&c[1].p_commune=='fimela'&&c[1].p_service=='maire'&&c[1].p_nom=='Awa Diop'&&c[1].p_date==dt(5)&&!('p_commune_id' in c[1]));
 ok('succès : numéro affiché, pas de fausse confirmation, pas de connexion anonyme, rien stocké',/RDV-ABCD1234/.test(t.H())&&/pas encore une confirmation/.test(t.H())&&!t.log.includes('anon')&&!t.store.mc_r_fimela);
 // sans compte
 t=await boot({user:false});await t.click({a:'rdv'});
 ok('sans compte : nom, téléphone, anti-spam demandés',/id="fn"/.test(t.H())&&/id="ft"/.test(t.H())&&/id="ts"/.test(t.H()));
 t.els['#rs']={value:'secretariat'};t.els['#rm']={value:'Légalisation'};t.els['#rd']={value:dt(3)};t.els['#fn']={value:'Moussa Ndiaye'};t.els['#ft']={value:''};
 await t.click({a:'rsend'});ok('sans compte : bloqué sans anti-spam',/anti-spam/.test(t.H())&&!t.rpcs.some(x=>x[0]=='creer_rdv'));
 t.S().tok='ok';await t.click({a:'rsend'});
 ok('sans compte : envoi, numéro mémorisé sur l’appareil, session anonyme fermée',t.rpcs.some(x=>x[0]=='creer_rdv')&&/RDV-ABCD1234/.test(t.store.mc_r_fimela||'')&&t.log.includes('anon')&&t.log.includes('out'));
 ok('suivi : numéros de l’appareil transmis à mes_rdvs',(t.rpcs.filter(x=>x[0]=='mes_rdvs').pop()[1].p_numeros||[]).includes('RDV-ABCD1234'));
 // suivi
 t=await boot({rv:[{numero:'RDV-1',service:'maire',statut:'confirmee',date_souhaitee:'2026-12-01',date_confirmee:'2026-12-02',heure_confirmee:'08:30:00',reponse:null},{numero:'RDV-2',service:'technique',statut:'demandee',date_souhaitee:'2026-12-05'},{numero:'RDV-3',service:'finances',statut:'refusee',date_souhaitee:'2026-12-06',reponse:'Fermé ce jour'}]});
 ok('accueil : « Mes rendez-vous » avec confirmé (date+heure), en attente, refusé (réponse)',/Mes rendez-vous/.test(t.H())&&/Rendez-vous confirmé/.test(t.H())&&/08:30/.test(t.H())&&/Le Maire/.test(t.H())&&/En attente de confirmation/.test(t.H())&&/Fermé ce jour/.test(t.H()));
 await t.click({a:'cat',c:'Audiences et rendez-vous'});ok('rubrique Audiences : même écran rendez-vous',/id="rs"/.test(t.H()));
 await t.click({a:'back'});ok('retour : accueil',/class="tt" data-a="cat"/.test(t.H()));
 console.log(f?'ECHECS: '+f:'TOUS OK');process.exit(f?1:0)})();
