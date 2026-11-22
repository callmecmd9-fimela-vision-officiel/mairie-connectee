// Lot 4 : espace citoyen (compte, profil, historique, notifications, isolation sur appareil). node tests/citoyen-compte.test.js
const vm=require('vm'),fs=require('fs'),path=require('path');let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
async function boot({user=true,prof={prenom:'Awa',nom:'Diop',village:'Mbodiène'},store={mc_co:'fimela'},otpErr=null,smsEnabled=false}={}){
 const app={innerHTML:''},handlers={click:[],input:[]},els={},log=[],rpcs=[];
 const tables={citoyens:prof?[prof]:[],citoyen_notifications:[{id:'n1',titre:'Demande FIM-0001-AAAA1111',corps:'Votre demande est en cours de traitement.',lu:false,created_at:'2026-11-17T10:00:00Z'},{id:'n2',titre:'Annonce',corps:'x',lu:true,created_at:'2026-11-16T10:00:00Z'}]};
 const dem={'FIM-0001-AAAA1111':{numero:'FIM-0001-AAAA1111',type:'État civil',statut:'en_cours'},'FIM-0002-LOCAL000':{numero:'FIM-0002-LOCAL000',type:'Réclamations',statut:'nouvelle'}};
 const from=t=>{const b={select(){return b},order(){return b},limit(){return b},maybeSingle(){b.single=true;return b},update(v){log.push(['update',t,v]);return b},eq(k,v){log.push(['eq',t,k,v]);return b},upsert(v){log.push(['upsert',t,v]);return b},then(res,rej){const d=tables[t];return Promise.resolve({data:b.single?(d&&d[0]||null):(d||[]),error:null}).then(res,rej)}};return b};
 const U={id:'u1',phone:'221771234567',is_anonymous:false};
 const sb={auth:{getSession:async()=>({data:{session:user?{user:U}:null}}),signOut:async()=>{log.push(['signOut'])},signInAnonymously:async()=>{log.push(['anon']);return{}},signInWithOtp:async()=>otpErr?{error:otpErr}:{},verifyOtp:async()=>({data:{user:U}})},from,
  rpc:async(n,a)=>{rpcs.push([n,a]);
   if(n=='commune_par_slug')return{data:[{id:'cid1',slug:'fimela',nom:'Fimela'}]};
   if(n=='infos_commune')return{data:[{nom:'Fimela'}]};
   if(n=='mes_demandes_compte')return{data:[{numero:'FIM-0001-AAAA1111'}]};
   if(n=='suivre_demandes')return{data:(a.p_numeros||[]).map(x=>dem[x]).filter(Boolean)};
   if(n=='suivre_demande')return{data:dem[a.p_numero]?[Object.assign({cree:'2026-11-17T09:00:00Z',service:'secretariat',historique:[]},dem[a.p_numero])]:[]};
   if(n=='creer_demande')return{data:'FIM-0003-NEW00000'};
   return{data:[]}}};
 const ctx={supabase:{createClient:()=>sb},document:{querySelector:s=>s=='#app'?app:els[s]||null,getElementById:()=>null,addEventListener:(n,fn)=>(handlers[n]=handlers[n]||[]).push(fn),createElement:()=>({}),head:{appendChild(){}},documentElement:{style:{setProperty(){},removeProperty(){}}},hidden:false},
  localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]},location:{search:'',pathname:'/',origin:'https://m.x',hostname:'x.workers.dev'},history:{replaceState(){}},navigator:{onLine:true},URL,Blob,URLSearchParams,setInterval(){},setTimeout(){},addEventListener(){},scrollTo(){},console,Promise,JSON,Math,Date,crypto:{},matchMedia:()=>({matches:true})};
 ctx.window=ctx;vm.createContext(ctx);let source=fs.readFileSync(path.join(__dirname,'..','js','citoyen.js'),'utf8');if(smsEnabled)source=source.replace(/const SMS_ON\s*=\s*false;/,'const SMS_ON=true;');vm.runInContext(source,ctx);
 await new Promise(r=>setTimeout(r,60));
 const click=async d=>{const t={dataset:d,textContent:''};for(const h of handlers.click)await h({target:{closest:s=>s=='[data-a]'?t:null}})};
 return{app,els,log,rpcs,store,click,H:()=>app.innerHTML,S:()=>vm.runInContext('S',ctx),ctx}}
(async()=>{
 // 1. citoyen connecté, profil complet : identité jamais redemandée
 let t=await boot();
 await t.click({a:'cat',c:'Sport, culture et associations'});
 ok('profil complet : nom et téléphone non redemandés',!/id="fn"/.test(t.H())&&!/id="ft"/.test(t.H())&&/Demande au nom de Awa Diop/.test(t.H())&&/\+221771234567/.test(t.H()));
 ok('connecté : pas de widget anti-spam inutile',!/id="ts"/.test(t.H()));
 t.els['#ff']={files:[]};t.els['#fo']={value:'Objet'};t.els['#fm']={value:'Bonjour'};
 await t.click({a:'send'});
 const cd=t.rpcs.filter(x=>x[0]=='creer_demande')[0];
 ok('envoi : nom et téléphone repris du compte',cd&&cd[1].p_nom=='Awa Diop'&&cd[1].p_contact=='+221771234567'&&cd[1].p_commune=='fimela');
 ok('envoi connecté : pas de connexion anonyme',!t.log.some(x=>x[0]=='anon'));
 ok('envoi connecté : numéro non copié sur l\'appareil',!t.store.mc_d_fimela&&t.S().ok=='FIM-0003-NEW00000'&&/votre espace/.test(t.H()));
 // 2. isolation appareil partagé
 ok('compte : dossiers du compte lus côté serveur et jamais stockés sur l\'appareil',!t.store.mc_d_fimela&&t.S().mine.some(x=>x.numero=='FIM-0001-AAAA1111'));
 await t.click({a:'lout'});
 ok('déconnexion : session fermée, profil et notifications vidés',t.log.some(x=>x[0]=='signOut')&&t.S().user===null&&t.S().prof===null&&t.S().nt.length===0);
 ok('déconnexion : les dossiers du compte ne sont plus visibles',!t.S().mine.some(x=>x.numero=='FIM-0001-AAAA1111'));
 // 3. profil incomplet : champs redemandés
 t=await boot({prof:{}});
 await t.click({a:'cat',c:'Sport, culture et associations'});
 ok('profil vide : le formulaire demande nom et téléphone',/id="fn"/.test(t.H())&&/id="ft"[^>]*value="\+221771234567"/.test(t.H()));
 // 4. espace connecté
 t=await boot();
 await t.click({a:'esp'});
 ok('espace : profil prénom/nom/village + téléphone vérifié',/Mon profil/.test(t.H())&&/id="pp"[^>]*value="Awa"/.test(t.H())&&/id="pn"[^>]*value="Diop"/.test(t.H())&&/id="pv"[^>]*value="Mbodiène"/.test(t.H())&&/Téléphone vérifié : \+221771234567/.test(t.H()));
 ok('espace : historique des demandes du compte',/Mes demandes/.test(t.H())&&/data-n="FIM-0001-AAAA1111"/.test(t.H()));
 ok('espace : notification non lue marquée, lien « Voir le dossier »',/● Demande FIM-0001-AAAA1111/.test(t.H())&&/data-a="nopen"[^>]*data-n="FIM-0001-AAAA1111"/.test(t.H())&&!/data-a="nopen"[^>]*data-i="n2"/.test(t.H()));
 ok('espace : bouton de déconnexion',/data-a="lout"/.test(t.H()));
 await t.click({a:'open',n:'FIM-0001-AAAA1111'});
 ok('ouverture d\'un dossier depuis l\'espace',/Dossier FIM-0001-AAAA1111/.test(t.H()));
 await t.click({a:'back'});ok('retour du dossier : retour à l\'espace',/Mon profil/.test(t.H()));
 await t.click({a:'nopen',i:'n1',n:'FIM-0001-AAAA1111'});
 ok('notification ouverte : marquée lue et dossier affiché',t.log.some(x=>x[0]=='update'&&x[2].lu===true)&&t.log.some(x=>x[0]=='eq'&&x[2]=='id'&&x[3]=='n1')&&/Dossier FIM-0001-AAAA1111/.test(t.H()));
 // 5. enregistrement du profil
 await t.click({a:'back'});
 t.els['#pp']={value:' A '};t.els['#pn']={value:'Diop'};t.els['#pv']={value:''};
 await t.click({a:'psave'});
 ok('profil : prénom trop court refusé',!t.log.some(x=>x[0]=='upsert')&&/prénom et votre nom/.test(t.H()));
 t.els['#pp']={value:'Awa'};t.els['#pn']={value:'Diop'};t.els['#pv']={value:'Fimela centre'};
 await t.click({a:'psave'});
 const up=t.log.filter(x=>x[0]=='upsert')[0];
 ok('profil : enregistré pour l\'utilisateur connecté uniquement',up&&up[2].user_id=='u1'&&up[2].prenom=='Awa'&&up[2].nom=='Diop'&&up[2].village=='Fimela centre');
 // 6. non connecté : le mode SMS désactivé conserve l’écran alternatif
 t=await boot({user:false});await t.click({a:'esp'});
 ok('SMS désactivé : espace alternatif affiché sans promettre une connexion',/prépare son ouverture/.test(t.H())&&!/Se connecter ou créer un compte/.test(t.H()));
 // Le mode SMS activé est simulé uniquement pour tester le parcours OTP
 t=await boot({user:false,store:{mc_co:'fimela',mc_d_fimela:JSON.stringify(['FIM-0002-LOCAL000'])}});
 ok('sans compte : dossiers de l\'appareil visibles, aucun appel au compte',t.S().mine.length===1&&!t.rpcs.some(x=>x[0]=='mes_demandes_compte'));
 await t.click({a:'cat',c:'Sport, culture et associations'});
 ok('sans compte : dépôt libre conservé (nom + téléphone + anti-spam)',/id="fn"/.test(t.H())&&/id="ft"/.test(t.H())&&/id="ts"/.test(t.H()));
 await t.click({a:'back'});t=await boot({user:false,smsEnabled:true});await t.click({a:'esp'});
 ok('espace déconnecté : « Se connecter ou créer un compte », accès sans compte rappelé',/Se connecter ou créer un compte/.test(t.H())&&/sans compte/.test(t.H())&&!/Mes demandes/.test(t.H().split('Se connecter ou créer un compte')[1]||'')&&!/Notifications/.test(t.H()));
 // 7. SMS indisponible : message honnête
 t=await boot({user:false,otpErr:{code:'phone_provider_disabled',message:'Unsupported phone provider'},smsEnabled:true});
 await t.click({a:'esp'});t.els['#ph']={value:'77 123 45 67'};t.S().tok='ok';
 await t.click({a:'otp'});
 ok('SMS indisponible : message clair, pas de faux succès',/pas encore disponible/.test(t.H())&&!/Code reçu par SMS/.test(t.H()));
 // 8. première connexion : création de la fiche
 t=await boot({user:false,prof:null,otpErr:null,smsEnabled:true});
 await t.click({a:'esp'});t.els['#ph']={value:'77 123 45 67'};t.S().tok='ok';
 await t.click({a:'otp'});ok('SMS envoyé : saisie du code',/Code reçu par SMS/.test(t.H()));
 t.els['#cd']={value:'123456'};await t.click({a:'vfy'});
 ok('première connexion : fiche citoyen créée (pour les notifications) et invitation à compléter le profil',t.log.some(x=>x[0]=='upsert'&&x[1]=='citoyens'&&x[2].user_id=='u1'&&Object.keys(x[2]).length===1)&&/Compte créé/.test(t.H()));
 console.log(f?'ECHECS: '+f:'TOUS OK');process.exit(f?1:0)})();
