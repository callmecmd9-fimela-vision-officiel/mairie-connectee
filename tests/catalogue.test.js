// Catalogue : boîte « Autres documents », recherche, catégories, modèles, isolation côté UI. node tests/catalogue.test.js
const vm=require('vm'),fs=require('fs'),path=require('path');let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
(async()=>{
 const app={innerHTML:''},dlg={innerHTML:'',hidden:true},els={'#dlg':dlg},h={click:[],input:[]},store={mc_co:'fimela'},rp=[];
 const dm=[{id:'a',type:'État civil',famille:'Certificats et attestations',titre:'Certificat de vie',description:'Atteste que vous êtes en vie',service:'etat_civil',modele:'identite',frais:'0',statut:'actif'},
 {id:'b',type:'Urbanisme',famille:'Foncier et urbanisme',titre:'Demande d’affectation de terre',service:'technique',modele:'foncier'},
 {id:'c',type:'État civil',famille:'Légalisations et certifications',titre:'Légalisation de signature',modele:'legalisation',autorite:'Préfecture'},
 {id:'d',type:'Aide sociale',famille:'Action sociale et services communaux',titre:'Demande d’aide sociale',modele:'social'},
 {id:'z',type:'État civil',famille:'État civil',titre:'Ancienne',statut:'archive'}];
 const sb={auth:{getSession:async()=>({data:{session:null}}),signOut:async()=>{}},rpc:async(n,a)=>{rp.push([n,a]);const r={commune_par_slug:[{id:'c1',slug:'fimela',nom:'Fimela'}],infos_commune:[{nom:'Fimela'}],demarches_commune:dm};return{data:r[n]||[]}}};
 const ctx={supabase:{createClient:()=>sb},document:{querySelector:s=>s=='#app'?app:els[s]||null,getElementById:()=>null,addEventListener:(n,fn)=>(h[n]=h[n]||[]).push(fn),createElement:()=>({}),head:{appendChild(){}},body:{style:{}},documentElement:{style:{setProperty(){},removeProperty(){}}},hidden:false},localStorage:{getItem:k=>store[k]??null,setItem(){},removeItem(){}},location:{search:'',pathname:'/',origin:'https://m.x',hostname:'x.workers.dev'},history:{replaceState(){}},navigator:{onLine:true},URL,Blob,URLSearchParams,setInterval(){},setTimeout(){},addEventListener(){},scrollTo(){},console,Promise,JSON,Math,Date,crypto:{},matchMedia:()=>({matches:true})};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js','citoyen.js'),'utf8'),ctx);await new Promise(r=>setTimeout(r,60));
 const click=async d=>{const t={dataset:d,textContent:''};for(const x of h.click)await x({target:{id:'',closest:s=>s=='[data-a]'?t:null}})};
 const H=()=>app.innerHTML,S=()=>vm.runInContext('S',ctx),typ=v=>{els['#dlr']={innerHTML:''};h.input.forEach(x=>x({target:{id:'dq',value:v}}));return els['#dlr'].innerHTML};
 ok('demarches_commune appelé par slug uniquement',rp.some(x=>x[0]=='demarches_commune'&&x[1].p_commune=='fimela'&&!('p_commune_id' in x[1])));
 await click({a:'cat',c:'État civil et documents'});
 ok('4 cartes + Autres documents',(H().match(/data-a="rc"/g)||[]).length==4&&/Autres documents/.test(H()));
 await click({a:'dlgo'});
 ok('dialogue ouvert, titre, recherche, catégories',dlg.hidden===false&&/Quel document recherchez-vous/.test(dlg.innerHTML)&&/id="dq"/.test(dlg.innerHTML)&&/Foncier et urbanisme/.test(dlg.innerHTML)&&/role|dlgx/.test(dlg.innerHTML));
 ok('liste : prestations actives, archivée exclue, service affiché',/Certificat de vie/.test(dlg.innerHTML)&&!/Ancienne/.test(dlg.innerHTML)&&/Service :<\/b> État civil|Service :<\/b> Service de l’état civil/.test(dlg.innerHTML)&&/Préfecture/.test(dlg.innerHTML));
 ok('recherche dynamique sans accents',/Certificat de vie/.test(typ('VIE'))&&!/Légalisation/.test(typ('vie'))&&/Légalisation/.test(typ('legalis')));
 ok('aucun résultat : message prévu',/Nous n’avons pas trouvé ce document/.test(typ('zzzz')));
 await click({a:'dlgc',c:'Foncier et urbanisme'});
 typ('');
 await click({a:'dlgx'});ok('fermeture',dlg.hidden===true&&dlg.innerHTML==='');
 await click({a:'dlgo'});ok('réouverture',dlg.hidden===false);
 for(const [id,champ] of [['a','mf_pn'],['b','mf_lo'],['c','mf_dc'],['d','mf_nf']]){
  await click({a:'dlgp',d:id});ok('prestation '+id+' : formulaire propre ('+champ+')',new RegExp('id="'+champ+'"').test(H())&&!/id="fm"/.test(H()))}
 await click({a:'dlgp',d:''});ok('« Autres demandes » : formulaire libre',/id="fm"/.test(H()));
 console.log(f?'ECHECS: '+f:'TOUS OK');process.exit(f?1:0)})();
