// Lot 6 bis : créneaux (planning mairie), jour fermé, heure obligatoire, annulation. node tests/citoyen-rdv-creneaux.test.js
const vm=require('vm'),fs=require('fs'),path=require('path');let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
async function boot({user=true,plan,rv=[],slots=['08:00','08:30','09:00'],cancelOk=true,creerErr=null,conf=true}={}){
 const app={innerHTML:''},handlers={click:[],change:[]},els={},rpcs=[],log=[],store={mc_co:'fimela'};const U={id:'u1',phone:'221771234567'};
 const from=t=>{const b={select(){return b},order(){return b},limit(){return b},maybeSingle(){return b},eq(){return b},update(){return b},then(r,j){return Promise.resolve({data:t=='citoyens'?{prenom:'Awa',nom:'Diop'}:[],error:null}).then(r,j)}};return b};
 const sb={auth:{getSession:async()=>({data:{session:user?{user:U}:null}}),signOut:async()=>{log.push('out')},signInAnonymously:async()=>{log.push('anon');return{}}},from,
  rpc:async(n,a)=>{rpcs.push([n,a]);if(n=='commune_par_slug')return{data:[{id:'cid1',slug:'fimela',nom:'Fimela'}]};if(n=='infos_commune')return{data:[{nom:'Fimela'}]};if(n=='portail_commune')return{data:[{horaires:'08h - 17h'}]};
   if(n=='planning_rdv')return{data:plan?[plan]:[]};if(n=='creneaux_rdv')return{data:slots.map(h=>({heure:h}))};
   if(n=='mes_rdvs')return{data:rv};if(n=='creer_rdv')return creerErr?{error:{message:creerErr}}:{data:'RDV-ABCD1234'};if(n=='annuler_rdv')return{data:cancelOk};return{data:[]}}};
 let checked=null;
 const ctx={supabase:{createClient:()=>sb},confirm:()=>conf,document:{querySelector:s=>s=='#app'?app:(s=='input[name="rh"]:checked'?checked:els[s]||null),getElementById:()=>null,addEventListener:(n,fn)=>(handlers[n]=handlers[n]||[]).push(fn),createElement:()=>({}),head:{appendChild(){}},documentElement:{style:{setProperty(){},removeProperty(){}}},hidden:false},
  localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]},location:{search:'',pathname:'/',origin:'https://m.x',hostname:'x.workers.dev'},history:{replaceState(){}},navigator:{onLine:true},URL,Blob,URLSearchParams,setInterval(){},setTimeout(){},addEventListener(){},scrollTo(){},console,Promise,JSON,Math,Date,crypto:{},matchMedia:()=>({matches:true})};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js','citoyen.js'),'utf8'),ctx);await new Promise(r=>setTimeout(r,60));
 const click=async d=>{const t={dataset:d,textContent:'',disabled:false};for(const h of handlers.click)await h({target:{closest:s=>s=='[data-a]'?t:null}})};
 const change=async(id,v)=>{for(const h of handlers.change)await h({target:{id,name:'',value:v}});await new Promise(r=>setTimeout(r,10))};
 return{app,els,rpcs,log,store,click,change,pick:v=>{checked=v?{value:v}:null},H:()=>app.innerHTML,S:()=>vm.runInContext('S',ctx)}}
(async()=>{
 const nd=n=>{const d=new Date(Date.now()+n*864e5);return d.toISOString().slice(0,10)},dow=s=>new Date(s+'T00:00').getDay()||7;
 let wk=0;while(dow(nd(++wk))>5);let we=0;while(dow(nd(++we))<6);
 const PLAN={actif:true,jours:[1,2,3,4,5],heure_debut:'08:00:00',heure_fin:'17:00:00',pause_debut:'12:30:00',pause_fin:'14:00:00',duree_min:30};
 // 1. planning actif : texte des jours/heures réels, aucune heure inventée tant que la date manque
 let t=await boot({plan:PLAN});await t.click({a:'rdv'});
 ok('planning actif : jours, heures et pause affichés depuis le planning',/du lundi au vendredi/.test(t.H())&&/08h à 17h/.test(t.H())&&/pause de 12h30 à 14h\)/.test(t.H()));
 ok('sans date : invitation à choisir une date, aucun créneau',/Choisissez d’abord une date/.test(t.H())&&!/name="rh"/.test(t.H()));
 // 2. jour ouvrable : créneaux libres lus côté serveur
 t.els['#rs']={value:'maire'};t.S().d.rs='maire';t.els['#rsb']={innerHTML:''};
 await t.change('rd',nd(wk));
 const cr=t.rpcs.filter(x=>x[0]=='creneaux_rdv')[0];
 ok('jour ouvrable : creneaux_rdv appelé avec slug, service, date (jamais id de commune)',cr&&cr[1].p_commune=='fimela'&&cr[1].p_service=='maire'&&cr[1].p_date==nd(wk)&&!('p_commune_id' in cr[1]));
 ok('créneaux affichés en boutons radio',(t.els['#rsb'].innerHTML.match(/name="rh"/g)||[]).length==3&&/08h00/.test(t.els['#rsb'].innerHTML)&&/09h00/.test(t.els['#rsb'].innerHTML));
 // 3. week-end : refus clair, aucun appel serveur
 const n0=t.rpcs.filter(x=>x[0]=='creneaux_rdv').length;await t.change('rd',nd(we));
 ok('samedi/dimanche : message « ne reçoit pas ce jour-là », pas de créneau, pas d’appel',/ne reçoit pas ce jour-là/.test(t.els['#rsb'].innerHTML)&&!/name="rh"/.test(t.els['#rsb'].innerHTML)&&t.rpcs.filter(x=>x[0]=='creneaux_rdv').length==n0);
 // 4. envoi : heure obligatoire
 t.els['#rm']={value:'Parler du terrain'};t.els['#rd']={value:nd(wk)};t.pick(null);
 await t.click({a:'rsend'});
 ok('sans heure choisie : refusé, rien envoyé',/Choisissez une heure/.test(t.H())&&!t.rpcs.some(x=>x[0]=='creer_rdv'));
 t.pick('08:30');await t.click({a:'rsend'});
 const c=t.rpcs.filter(x=>x[0]=='creer_rdv')[0];
 ok('envoi : p_heure transmis avec la date, slug et service',c&&c[1].p_heure=='08:30'&&c[1].p_date==nd(wk)&&c[1].p_commune=='fimela'&&c[1].p_service=='maire');
 ok('succès : numéro affiché, pas de fausse confirmation',/RDV-ABCD1234/.test(t.H())&&/pas encore une confirmation/.test(t.H()));
 // 5. créneau pris entre-temps (refus serveur)
 t=await boot({plan:PLAN,creerErr:'creneau'});await t.click({a:'rdv'});t.els['#rs']={value:'maire'};t.els['#rsb']={innerHTML:''};t.els['#rm']={value:'Motif valable'};t.els['#rd']={value:nd(wk)};t.S().d.rd=nd(wk);t.pick('09:00');
 await t.click({a:'rsend'});
 ok('créneau déjà pris : message clair, aucun numéro affiché',/n’est plus disponible/.test(t.H())&&!/RDV-ABCD1234/.test(t.H()));
 // 6. sans planning (ou inactif) : écran date seule, ancien comportement conservé
 for(const p of [null,Object.assign({},PLAN,{actif:false})]){t=await boot({plan:p});await t.click({a:'rdv'});
  ok('planning '+(p?'inactif':'absent')+' : pas de créneaux, date seule',!/name="rh"/.test(t.H())&&!/La mairie reçoit/.test(t.H())&&/id="rd"/.test(t.H())&&t.S().plan===null);
  t.els['#rs']={value:'maire'};t.els['#rm']={value:'Parler du terrain'};t.els['#rd']={value:nd(5)};await t.click({a:'rsend'});
  const q=t.rpcs.filter(x=>x[0]=='creer_rdv')[0];ok('planning '+(p?'inactif':'absent')+' : envoi sans p_heure',q&&!('p_heure' in q[1]))}
 // 7. suivi : heure souhaitée et bouton d'annulation (statuts annulables seulement, à venir seulement)
 const rvs=[{numero:'RDV-1',service:'maire',statut:'demandee',date_souhaitee:nd(5),heure_souhaitee:'09:00:00'},{numero:'RDV-2',service:'technique',statut:'confirmee',date_souhaitee:nd(5),date_confirmee:nd(6),heure_confirmee:'10:30:00'},{numero:'RDV-3',service:'finances',statut:'refusee',date_souhaitee:nd(5),reponse:'Fermé'},{numero:'RDV-4',service:'maire',statut:'annulee',date_souhaitee:nd(5)},{numero:'RDV-5',service:'maire',statut:'confirmee',date_souhaitee:nd(-9),date_confirmee:nd(-8),heure_confirmee:'10:00:00'}];
 t=await boot({plan:PLAN,rv:rvs});
 ok('suivi : heure souhaitée affichée',/à 09:00/.test(t.H()));
 const bt=(t.H().match(/data-a="rcan" data-n="([^"]+)"/g)||[]).map(x=>x.match(/data-n="([^"]+)"/)[1]);
 ok('annulation proposée seulement pour en attente et confirmé à venir (RDV-1, RDV-2)',bt.length==2&&bt.includes('RDV-1')&&bt.includes('RDV-2'));
 // 8. annulation
 await t.click({a:'rcan',n:'RDV-1'});
 const an=t.rpcs.filter(x=>x[0]=='annuler_rdv')[0];
 ok('annulation : RPC avec slug + numéro (jamais id de commune), liste relue',an&&an[1].p_commune=='fimela'&&an[1].p_numero=='RDV-1'&&!('p_commune_id' in an[1])&&t.rpcs.filter(x=>x[0]=='mes_rdvs').length>=2);
 ok('annulation : confirmation affichée',/Rendez-vous annulé/.test(t.H()));
 t=await boot({plan:PLAN,rv:rvs,cancelOk:false});await t.click({a:'rcan',n:'RDV-1'});
 ok('annulation refusée par le serveur : message honnête, pas de faux succès',/Annulation impossible/.test(t.H())&&!/Rendez-vous annulé\./.test(t.H()));
 t=await boot({plan:PLAN,rv:rvs,conf:false});await t.click({a:'rcan',n:'RDV-1'});
 ok('annulation non confirmée par le citoyen : aucun appel',!t.rpcs.some(x=>x[0]=='annuler_rdv'));
 console.log(f?'ECHECS: '+f:'TOUS OK');process.exit(f?1:0)})();
