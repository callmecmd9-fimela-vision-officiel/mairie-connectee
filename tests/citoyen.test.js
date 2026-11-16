const vm=require('vm'),fs=require('fs');
async function run(name,{search='',ls={},net=true,host='mairie-connectee.x.workers.dev'}){
 const app={innerHTML:''},link={h:'/manifest-citoyen.webmanifest',getAttribute(){return this.h},setAttribute(k,v){this.h=v}};
 const store={...ls};const calls=[];
 const rows={commune_par_slug:[{id:'cid1',slug:'fimela',nom:'Fimela'}],infos_commune:[{nom:'Fimela',slogan:'Une commune, un avenir',devise:'Fimela, notre fierté'}],actualites:[{texte:'Hello'}],demarches_commune:[{id:'d1',type:'État civil',titre:'Acte de naissance'}],identite_commune:[{couleur:'#0B5A2E',blason:true}],suivre_demandes:[],mes_demandes_compte:[],commune_par_hote:[]};
 const sb={auth:{getSession:async()=>({data:{session:null}}),signOut:async()=>{}},rpc:async(n,a)=>{calls.push(n);if(!net)return{error:{message:'x'}};if(n=='commune_par_slug'&&a.p_slug!='fimela')return{data:[]};return{data:rows[n]||[]}}};
 const ctx={supabase:{createClient:()=>sb},document:{querySelector:s=>s=='#app'?app:s.includes('manifest')?link:null,addEventListener(){},createElement:()=>({}),head:{appendChild(){}},documentElement:{style:{setProperty(){},removeProperty(){}}},hidden:false},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]},location:{search,pathname:'/',origin:'https://m.x',hostname:host},history:{replaceState(){}},navigator:{onLine:true},URL,Blob,URLSearchParams,setInterval(){},setTimeout(f){},addEventListener(){},scrollTo(){},console,Promise,JSON,Math,Date,crypto:{}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(require('path').join(__dirname,'..','citoyen.js'),'utf8'),ctx);
 await new Promise(r=>setTimeout(r,50));
 console.log('==',name,'| rpc:',calls.join(','),'\n  pick:',/lien ou le QR code/.test(app.innerHTML),'home:',/Commune de Fimela/.test(app.innerHTML),'slogan:',/Une commune, un avenir/.test(app.innerHTML),'devise:',/notre fierté/.test(app.innerHTML),'logo:',/class="bz"/.test(app.innerHTML),'retry:',/data-a="retry"/.test(app.innerHTML),'alert:',(app.innerHTML.match(/class="al"[^>]*>([^<]*)/)||[])[1]||'-','\n  manifest:',link.h.slice(0,40),'\n  LS mc_co:',store.mc_co);
 if(link.h.startsWith('blob:'))ctx.__ok=1}
(async()=>{
 await run('sans slug',{});
 await run('?c=fimela',{search:'?c=fimela'});
 await run('mémorisé',{ls:{mc_co:'fimela'}});
 await run('slug inconnu (URL)',{search:'?c=zzz',ls:{}});
 await run('hors-ligne sans cache',{ls:{mc_co:'fimela'},net:false});
 await run('hors-ligne avec cache',{ls:{mc_co:'fimela',mc_ci_fimela:JSON.stringify({id:'cid1',nom:'Fimela',info:{slogan:'Une commune, un avenir'},idt:{},pub:[],dm:[]})},net:false});
})()
