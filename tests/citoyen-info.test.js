const vm=require('vm'),fs=require('fs'),path=require('path');let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
async function boot(pj,pub){const app={innerHTML:''},h={click:[]},store={mc_co:'fimela'},rp=[];
 const sb={auth:{getSession:async()=>({data:{session:null}}),signOut:async()=>{}},rpc:async(n,a)=>{rp.push([n,a]);const r={commune_par_slug:[{id:'c1',slug:'fimela',nom:'Fimela'}],infos_commune:[{nom:'Fimela'}],actualites:pub,projets_publics:pj};return{data:r[n]||[]}}};
 const ctx={supabase:{createClient:()=>sb},document:{querySelector:s=>s=='#app'?app:null,getElementById:()=>null,addEventListener:(n,fn)=>(h[n]=h[n]||[]).push(fn),createElement:()=>({}),head:{appendChild(){}},documentElement:{style:{setProperty(){},removeProperty(){}}},hidden:false},localStorage:{getItem:k=>store[k]??null,setItem(){},removeItem(){}},location:{search:'',pathname:'/',origin:'https://m.x',hostname:'x.workers.dev'},history:{replaceState(){}},navigator:{onLine:true},URL,Blob,URLSearchParams,setInterval(){},setTimeout(){},addEventListener(){},scrollTo(){},console,Promise,JSON,Math,Date,crypto:{},matchMedia:()=>({matches:true})};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js','citoyen.js'),'utf8'),ctx);await new Promise(r=>setTimeout(r,60));return{H:()=>app.innerHTML,rp}}
(async()=>{
 let t=await boot([],[]);
 ok('vide : aucun contenu inventé',/Aucune actualité pour le moment/.test(t.H())&&/Aucun projet publié/.test(t.H()));
 ok('projets_publics appelé avec le slug (jamais un id)',t.rp.some(x=>x[0]=='projets_publics'&&x[1].p_commune=='fimela'&&!('p_commune_id' in x[1])));
 t=await boot([{titre:'Route X',localite:'Fimela',statut:'en_cours',avancement:40,date_fin:'2027-03-01'}],[{texte:'Coupure d\u2019eau',jour:'2026-11-10',categorie:'avis'},{texte:'Bonjour',jour:'2026-11-09'}]);
 ok('projet publié affiché (statut, %)',/Route X/.test(t.H())&&/En cours/.test(t.H())&&/40 %/.test(t.H()));
 ok('catégorie Avis affichée, actualité simple sans badge',/Avis/.test(t.H())&&/Coupure d/.test(t.H())&&!/Actualité<\/span>/.test(t.H()));
 ok('lien d\u2019évitement + h1 + main#mc',/class="sk" href="#mc"/.test(t.H())&&/id="mc"/.test(t.H()));
 console.log(f?'ECHECS: '+f:'TOUS OK');process.exit(f?1:0)})();
