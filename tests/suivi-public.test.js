// Page publique /suivi.html : appel RPC suivi_public, statut traduit, montant dû, erreur générique, anti-XSS. node tests/suivi-public.test.js
const fs=require('fs'),path=require('path');let JSDOM;try{({JSDOM}=require('jsdom'))}catch(e){console.log('SKIP: jsdom absent');process.exit(0)}
let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
const R=path.join(__dirname,'..'),html=fs.readFileSync(path.join(R,'suivi.html'),'utf8'),src=fs.readFileSync(path.join(R,'js','suivi.js'),'utf8');
ok('page sans script ni style en ligne',!/<script(?![^>]*src=)/.test(html)&&!/\sstyle=/.test(html)&&!/<style/.test(html));
ok('aligné sur le portail : citoyen.css + lien retour',/citoyen\.css/.test(html)&&/href="\/"/.test(html));
ok('suivi.js sans innerHTML / insertAdjacentHTML / eval',!/innerHTML|insertAdjacentHTML|document\.write|eval\(/.test(src));
async function run(reply,num,tel){
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://x.sn/suivi.html'}),w=dom.window,calls=[];
 w.supabase={createClient:()=>({rpc:(n,a)=>{calls.push([n,a]);return typeof reply=='function'?reply():Promise.resolve(reply)}})};
 w.eval(src);
 w.document.getElementById('sv-n').value=num;w.document.getElementById('sv-t2').value=tel;
 w.document.getElementById('sv-f').dispatchEvent(new w.Event('submit',{cancelable:true}));
 await new Promise(r=>setTimeout(r,20));
 return{calls,txt:w.document.getElementById('sv-r').textContent,box:w.document.getElementById('sv-r'),btn:w.document.getElementById('sv-b')}}
(async()=>{
 const NF='Aucune demande trouvée. Vérifiez le numéro et le téléphone.';
 let r=await run({data:[{num_suivi:'FIM-2026-000123',statut:'a_payer',montant_du:2500,lieu_retrait:'Guichet n°2',date_maj:'2026-11-25T10:30:00Z'}]},' fim-2026-000123 ','+221 77 123 45 67');
 ok('RPC suivi_public(p_num, p_tel) avec numéro normalisé',r.calls.length==1&&r.calls[0][0]=='suivi_public'&&r.calls[0][1].p_num=='FIM-2026-000123'&&r.calls[0][1].p_tel=='+221 77 123 45 67');
 ok('statut en français + montant dû + lieu + date',/En attente de paiement/.test(r.txt)&&/2[\s  ]500 FCFA/.test(r.txt)&&/Guichet n°2/.test(r.txt)&&/novembre 2026/.test(r.txt)&&!/a_payer/.test(r.txt));
 ok('bouton réactivé',r.btn.disabled===false);
 r=await run({data:[{num_suivi:'FIM-2026-000123',statut:'pret_a_retirer',montant_du:2500,lieu_retrait:null,date_maj:'2026-11-25T10:30:00Z'}]},'FIM-2026-000123','771234567');
 ok('montant dû masqué hors a_payer ; lieu par défaut',/Prête à retirer/.test(r.txt)&&!/FCFA/.test(r.txt)&&/À préciser/.test(r.txt));
 r=await run({data:[]},'FIM-2026-000123','771234567');ok('aucun résultat : message demandé',r.txt.trim()==NF);
 r=await run({data:null,error:{message:'x'}},'FIM-2026-000123','771234567');ok('erreur serveur : pas de fuite, message de repli',!/x$/.test(r.txt)&&/Réessayez/.test(r.txt));
 r=await run(()=>Promise.reject(new Error('net')),'FIM-2026-000123','771234567');ok('erreur réseau gérée',/Réessayez/.test(r.txt)&&r.btn.disabled===false);
 r=await run({data:[]},'ABC','771234567');ok('numéro mal formé : message demandé, aucun appel',r.calls.length==0&&r.txt.trim()==NF);
 r=await run({data:[]},'FIM-2026-000123','12');ok('téléphone trop court : aucun appel',r.calls.length==0&&r.txt.trim()==NF);
 r=await run({data:[{num_suivi:'FIM-2026-000123<img src=x>',statut:'<script>x</script>',lieu_retrait:'<img src=x onerror=alert(1)>',date_maj:'bad'}]},'FIM-2026-000123','771234567');
 ok('anti-XSS : valeurs serveur affichées comme texte',r.box.querySelectorAll('img,script').length==0&&/<img src=x onerror/.test(r.txt));
 if(f){console.log(f+' échec(s)');process.exit(1)}console.log('PASS: suivi-public');
})();
