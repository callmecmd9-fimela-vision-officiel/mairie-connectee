// Lot 5 : extrait d'acte guidé (2 méthodes), récapitulatif, envoi, statuts retrait. node tests/citoyen-etatcivil.test.js
const vm=require('vm'),fs=require('fs'),path=require('path');let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
async function boot({user=true,stat='pret_a_retirer'}={}){
 const app={innerHTML:''},handlers={click:[],change:[]},els={},rpcs=[],ups=[],store={mc_co:'fimela'};
 const U={id:'u1',phone:'221771234567'};
 const from=t=>{const b={select(){return b},order(){return b},limit(){return b},maybeSingle(){return b},eq(){return b},update(){return b},then(r,j){return Promise.resolve({data:t=='citoyens'?{prenom:'Awa',nom:'Diop'}:[],error:null}).then(r,j)}};return b};
 const sb={auth:{getSession:async()=>({data:{session:user?{user:U}:null}}),signOut:async()=>{},signInAnonymously:async()=>({})},from,storage:{from:()=>({upload:async p=>{ups.push(p);return{}}})},
  rpc:async(n,a)=>{rpcs.push([n,a]);if(n=='commune_par_slug')return{data:[{id:'cid1',slug:'fimela',nom:'Fimela'}]};if(n=='infos_commune')return{data:[{nom:'Fimela',tel:'339485616',adresse:'Centre'}]};
   if(n=='portail_commune')return{data:[{horaires:'08h - 17h'}]};
   if(n=='suivre_demande')return{data:[{cree:'2026-11-17T09:00:00Z',type:'État civil',service:'etat_civil',statut:stat,reponse:'Guichet 2, le matin',historique:[]}]};
   if(n=='creer_demande')return{data:'FIM-0009-ABCD1234'};return{data:[]}}};
 const ctx={supabase:{createClient:()=>sb},document:{querySelector:s=>s=='#app'?app:els[s]||null,getElementById:()=>null,addEventListener:(n,fn)=>(handlers[n]=handlers[n]||[]).push(fn),createElement:()=>({}),head:{appendChild(){}},documentElement:{style:{setProperty(){},removeProperty(){}}},hidden:false},
  localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]},location:{search:'',pathname:'/',origin:'https://m.x',hostname:'x.workers.dev'},history:{replaceState(){}},navigator:{onLine:true},URL,Blob,URLSearchParams,setInterval(){},setTimeout(){},addEventListener(){},scrollTo(){},console,Promise,JSON,Math,Date,crypto:{randomUUID:()=>'uu'},matchMedia:()=>({matches:true})};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js','citoyen.js'),'utf8'),ctx);await new Promise(r=>setTimeout(r,60));
 const click=async d=>{const t={dataset:d,textContent:''};for(const h of handlers.click)await h({target:{closest:s=>s=='[data-a]'?t:null}})};
 const change=v=>handlers.change.forEach(h=>h({target:{id:'',name:'ecm',value:v}}));
 return{app,els,rpcs,ups,click,change,H:()=>app.innerHTML,S:()=>vm.runInContext('S',ctx)}}
(async()=>{
 let t=await boot();
 await t.click({a:'cat',c:'État civil et documents'});await t.click({a:'rc',r:'Demander un extrait de naissance'});
 ok('formulaire court : n° acte + année + nom, pas de message libre',/id="ecn"/.test(t.H())&&/id="eca"/.test(t.H())&&/id="ecp"/.test(t.H())&&!/id="fm"/.test(t.H())&&!/id="fn"/.test(t.H()));
 ok('retrait en mairie annoncé, pas de téléchargement',/se retire ensuite en mairie/.test(t.H()));
 t.els['#ecp']={value:''};t.els['#ecn']={value:'123'};t.els['#eca']={value:'1990'};
 await t.click({a:'ecrev'});ok('nom manquant : erreur claire, pas de récapitulatif',/nom complet de la personne/.test(t.H())&&!/Vérifiez votre demande/.test(t.H()));
 t.els['#ecp']={value:'Fatou Sarr'};t.els['#eca']={value:'12'};await t.click({a:'ecrev'});ok('année invalide refusée',/année de l’acte/.test(t.H()));
 t.els['#eca']={value:'1990'};await t.click({a:'ecrev'});
 ok('récapitulatif affiché (n°, année, nom, demandeur du compte)',/Vérifiez votre demande/.test(t.H())&&/123/.test(t.H())&&/1990/.test(t.H())&&/Fatou Sarr/.test(t.H())&&/Awa Diop/.test(t.H()));
 await t.click({a:'ecedit'});ok('Modifier : retour au formulaire avec valeurs conservées',/value="Fatou Sarr"/.test(t.H())&&/value="123"/.test(t.H()));
 t.els['#fcons']={checked:true};await t.click({a:'ecrev'});await t.click({a:'send'});
 const c=t.rpcs.filter(x=>x[0]=='creer_demande')[0];
 ok('envoi méthode 1 : type État civil, message structuré, aucune pièce',c&&c[1].p_type=='État civil'&&/N° d’acte : 123/.test(c[1].p_message)&&/Année : 1990/.test(c[1].p_message)&&/Fatou Sarr/.test(c[1].p_message)&&c[1].p_pieces.length==0&&c[1].p_commune=='fimela'&&c[1].p_objet=='Extrait d’acte de naissance');
 ok('numéro de suivi affiché, récapitulatif quitté',/FIM-0009-ABCD1234/.test(t.H())&&!t.S().rec);
 // méthode 2
 t=await boot();await t.click({a:'cat',c:'État civil et documents'});await t.click({a:'rc',r:'Demander un extrait de décès'});
 t.els['#ecb']={innerHTML:''};t.change('f');ok('méthode 2 : champ fichier proposé',/id="ff"/.test(t.els['#ecb'].innerHTML)&&!/id="ecn"/.test(t.els['#ecb'].innerHTML));
 t.els['#ecp']={value:'Moussa Ndiaye'};t.els['#ff']={files:[]};await t.click({a:'ecrev'});ok('sans fichier : refusé',/Joignez la photo/.test(t.H()));
 t.els['#ff']={files:[{name:'ancien.pdf',type:'application/pdf',size:1000}]};await t.click({a:'ecrev'});
 ok('récapitulatif méthode 2 : pièce listée',/ancien\.pdf/.test(t.H())&&/Extrait d’acte de décès/.test(t.H()));
 t.els['#fcons']={checked:true};await t.click({a:'send'});const c2=t.rpcs.filter(x=>x[0]=='creer_demande')[0];
 ok('envoi méthode 2 : pièce téléversée dans le dossier de la commune',t.ups.length==1&&t.ups[0].startsWith('cid1/')&&c2&&c2[1].p_pieces.length==1&&/Ancien extrait joint/.test(c2[1].p_message));
 // sans compte : anti-spam exigé
 t=await boot({user:false});await t.click({a:'cat',c:'État civil et documents'});await t.click({a:'rc',r:'Demander un extrait de mariage'});
 t.els['#ecp']={value:'A B'};t.els['#ecn']={value:'5'};t.els['#eca']={value:'2001'};t.els['#fn']={value:'Demandeur Test'};t.els['#ft']={value:'77 123 45 67'};
 await t.click({a:'ecrev'});ok('sans compte : récapitulatif avec widget anti-spam',/id="ts"/.test(t.H()));
 t.els['#fcons']={checked:true};await t.click({a:'send'});ok('sans compte : envoi bloqué sans vérification anti-spam',/anti-spam/.test(t.H())&&!t.rpcs.some(x=>x[0]=='creer_demande'));
 // statut prêt à retirer
 t=await boot();await t.click({a:'open',n:'FIM-0001-AAAA1111'});
 ok('prêt à retirer : libellé, explication, lieu/modalités, horaires réels, pas de téléchargement',/Document prêt à retirer/.test(t.H())&&/Il se retire en mairie/.test(t.H())&&/Guichet 2, le matin/.test(t.H())&&/08h - 17h/.test(t.H())&&/ne se télécharge pas/.test(t.H()));
 t=await boot({stat:'en_attente_pieces'});await t.click({a:'open',n:'X'});ok('info complémentaires : libellé spec',/Informations complémentaires nécessaires/.test(t.H()));
 console.log(f?'ECHECS: '+f:'TOUS OK');process.exit(f?1:0)})();
