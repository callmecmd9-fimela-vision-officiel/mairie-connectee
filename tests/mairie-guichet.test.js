// Guichet (dépôt, caisse, retrait) : droits par onglet, appels serveur, échappement. node tests/mairie-guichet.test.js
const vm=require('vm'),fs=require('fs'),path=require('path');let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
function mk({role='secretariat',rows=[],vals={},conf=true,promptV='2000',montant=2000,rpcErr=null,sa=false,insErr=null,found=null}={}){
 const H={click:[]},rpcs=[],loads=[],ins=[],ups=[],sel=[],nav=[];let printed=0,prt={innerHTML:''};
 const q=(t)=>{const o={_t:t,select(c){sel.push([t,c]);return o},eq(){return o},single:async()=>insErr?{error:insErr}:{data:{id:'n1',num_suivi:'FIM-2026-000007',montant}},maybeSingle:async()=>t=='demandes'?{data:found}:{data:{reference_paiement:'QT-ABC123DEF456'}},
   insert(p){ins.push(p);return o},update(p){ups.push(p);return o},then(r){r({error:null})}};return o};
 const ctx={SP:{administration:{subs:[]}},RP:{},SPL:{},SUB:{},S:{cid:'c1',co:'Fimela <x>',pr:role,sa,db:{dem_pay:rows}},
  D:()=>ctx.S.db,esc:s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  pn:(t,i,b)=>`<section>${t}${b}</section>`,emp:m=>`<p>${m}</p>`,st2:l=>`<span>${l}</span>`,rw:(a,b)=>`<div>${a}${b}</div>`,frm:b=>`<div>${b}</div>`,
  inp:(id,l,ty,v)=>`<input id="${id}" value="${ctx.esc(v)}">`,sel:(id,l,o,v)=>`<select id="${id}"></select>`,
  $:s=>s=='#prt'?prt:(vals[s.slice(1)]!==undefined?{value:vals[s.slice(1)]}:null),render(){},load:async k=>{loads.push(k)},confirm:()=>conf,prompt:()=>promptV,
  crypto:{randomUUID:()=>'11111111-2222-4333-8444-555555555555'},
  sb:{from:q,rpc:async(n,a)=>{rpcs.push([n,a]);return rpcErr?{error:rpcErr}:{data:n=='encaisser_demande'?'QUIT-2026-000001':'r1'}}},
  location:{origin:'https://x.sn',assign:u=>nav.push(u)},window:null,setTimeout:fn=>{fn()},scrollTo(){},console,
  document:{addEventListener:(n,fn)=>H[n].push(fn)}};
 ctx.window={print:()=>{printed++},addEventListener(){},removeEventListener(){},scrollTo(){}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js','guichet.js'),'utf8'),ctx);
 const click=async(m,d={})=>{const t={dataset:Object.assign({gm:m},d)};for(const h of H.click)await h({target:{closest:s=>s=='[data-gm]'?t:null}})};
 return{ctx,rpcs,loads,ins,ups,nav,click,sel,get printed(){return printed},prt}}
(async()=>{
 const dep={gd_type:'État civil',gd_nom:'Diop',gd_pre:'Awa',gd_tel:'77 123 45 67',gd_obj:'Extrait <b>naissance</b>'};
 let t=mk();
 ok('sous-menu Administration + droits',t.ctx.SP.administration.subs.some(s=>s[0]=='guichet')&&['secretariat','agent','finances'].every(r=>t.ctx.RP.guichet.includes(r))&&!t.ctx.RP.guichet.includes('maire'));
 let h=t.ctx.SUB.guichet();
 ok('secretariat : onglets Dépôt + Retrait, pas Caisse',/Dépôt au guichet/.test(h)&&/Retrait/.test(h)&&!/>Caisse</.test(h));
 t=mk({role:'finances'});h=t.ctx.SUB.guichet();
 ok('finances : Caisse + Retrait, pas Dépôt',/>Caisse</.test(h)&&/>Retrait</.test(h)&&!/Dépôt au guichet/.test(h));
 t=mk({role:'maire'});ok('maire : accès refusé',/Accès réservé/.test(t.ctx.SUB.guichet()));
 t=mk({sa:true});await t.click('save');ok('super-admin : aucune écriture',t.ins.length==0&&/Accès réservé/.test(t.ctx.SUB.guichet()));
 // Dépôt
 t=mk({vals:dep,montant:2000});await t.click('save');
 const p=t.ins[0]||{};
 ok('dépôt : INSERT sans num_suivi, statut depose, service routé',p.statut=='depose'&&!('num_suivi' in p)&&p.service=='etat_civil'&&p.commune_id=='c1'&&p.nom=='Awa Diop'&&p.telephone=='77 123 45 67'&&/^GUI-\d{4}-[0-9A-F]{32}$/.test(p.numero));
 ok('dépôt payant : passage à a_payer + montant_du',t.ups[0]&&t.ups[0].statut=='a_payer'&&t.ups[0].montant_du==2000&&JSON.stringify(t.loads[0])=='["dem_pay"]');
 h=t.ctx.SUB.guichet();ok('num_suivi affiché + bouton Imprimer le reçu',/FIM-2026-000007/.test(h)&&/Imprimer le reçu/.test(h)&&/2[\s  ]000 FCFA/.test(h));
 await t.click('print');ok('impression : window.print + reçu échappé',t.printed==1&&/FIM-2026-000007/.test(t.prt.innerHTML)&&/Extrait &lt;b&gt;naissance/.test(t.prt.innerHTML)&&/MAIRIE DE FIMELA &lt;X&gt;/.test(t.prt.innerHTML)&&!/<b>naissance/.test(t.prt.innerHTML));
 t=mk({vals:dep,montant:0});await t.click('save');ok('dépôt gratuit : pas de passage à a_payer',t.ups.length==0&&t.ins.length==1);
 t=mk({vals:Object.assign({},dep,{gd_tel:'abc'})});await t.click('save');ok('téléphone invalide refusé, saisie conservée',t.ins.length==0&&/Téléphone invalide/.test(t.ctx.SUB.guichet())&&/value="Diop"/.test(t.ctx.SUB.guichet()));
 t=mk({vals:Object.assign({},dep,{gd_obj:''})});await t.click('save');ok('objet vide refusé',t.ins.length==0);
 t=mk({vals:dep,insErr:{code:'42703',message:'column "num_suivi" does not exist'}});await t.click('save');ok('migration absente : message explicite',/migration 20261202001600/.test(t.ctx.SUB.guichet()));
 t=mk({role:'finances',vals:dep});await t.click('save');ok('finances ne peut pas déposer',t.ins.length==0);
 // Caisse
 const R=[{id:'a',num_suivi:'FIM-2026-000001',numero:'GUI-1',statut:'a_payer',montant:1500,montant_du:1500,nom:'<i>Moussa</i>',objet:'Certificat'},{id:'b',num_suivi:'FIM-2026-000002',statut:'paye',montant:1000}];
 t=mk({role:'finances',rows:R});t.ctx.S.pr='finances';h=(()=>{t.ctx.SUB.guichet();return t.ctx.SUB.guichet()})();
 await t.click('tab',{v:'cai'});h=t.ctx.SUB.guichet();
 ok('caisse : seulement les a_payer, échappé',/FIM-2026-000001/.test(h)&&!/FIM-2026-000002/.test(h)&&/&lt;i&gt;Moussa/.test(h)&&/data-id="a"/.test(h));
 await t.click('enc',{id:'a'});const r=t.rpcs[0]||[];
 ok('encaissement : RPC encaisser_demande (source guichet, réf. reçu)',r[0]=='encaisser_demande'&&r[1].p_id=='a'&&r[1].p_montant==2000&&r[1].p_source=='guichet'&&/^REC-\d{8}-[0-9A-F]{8}$/.test(r[1].p_ref_recu));
 ok('quittance affichée puis redirection vers quittance.html',/QUIT-2026-000001/.test(t.ctx.SUB.guichet())&&t.nav[0]=='/quittance.html?ref=QT-ABC123DEF456');
 t=mk({role:'finances',rows:R,promptV:'12x'});await t.click('tab',{v:'cai'});await t.click('enc',{id:'a'});ok('montant invalide : aucun appel',t.rpcs.length==0&&/Montant invalide/.test(t.ctx.SUB.guichet()));
 t=mk({role:'finances',rows:R,promptV:''});await t.click('tab',{v:'cai'});await t.click('enc',{id:'a'});ok('annulation du prompt : aucun appel',t.rpcs.length==0);
 t=mk({role:'finances',rows:R,rpcErr:{message:'Le montant encaissé (1) ne correspond pas'}});await t.click('tab',{v:'cai'});await t.click('enc',{id:'a'});ok('refus serveur affiché',/ne correspond pas/.test(t.ctx.SUB.guichet())&&t.nav.length==0);
 t=mk({role:'secretariat',rows:R});await t.click('enc',{id:'a'});ok('secretariat ne peut pas encaisser',t.rpcs.length==0);
 // Retrait
 const F={id:'d1',num_suivi:'FIM-2026-000009',nom:'Awa',objet:'Acte',statut:'pret_a_retirer',statut_paiement:'paye'};
 t=mk({vals:{gr_num:'fim-2026-000009'},found:F});await t.click('tab',{v:'ret'});await t.click('find');h=t.ctx.SUB.guichet();
 ok('recherche par num_suivi : formulaire de retrait',/FIM-2026-000009/.test(h)&&/gr_nom/.test(h)&&/gr_cni/.test(h));
 t.ctx.$=s=>({value:{gr_nom:'Moussa Ba',gr_cni:'1234567890'}[s.slice(1)]});
 await t.click('do');ok('retrait : RPC retirer_demande + confirmation visuelle',t.rpcs[0]&&t.rpcs[0][0]=='retirer_demande'&&t.rpcs[0][1].p_id=='d1'&&t.rpcs[0][1].p_nom=='Moussa Ba'&&t.rpcs[0][1].p_cni=='1234567890'&&/Retrait enregistré/.test(t.ctx.SUB.guichet()));
 t=mk({vals:{gr_num:'FIM-2026-000009'},found:Object.assign({},F,{statut:'a_payer',statut_paiement:'non_paye'})});await t.click('tab',{v:'ret'});await t.click('find');h=t.ctx.SUB.guichet();
 ok('dossier non prêt : pas de formulaire',!/gr_nom/.test(h)&&/Retrait impossible/.test(h));
 t=mk({vals:{gr_num:'XYZ'}});await t.click('tab',{v:'ret'});await t.click('find');ok('numéro invalide refusé',/invalide/.test(t.ctx.SUB.guichet()));
 t=mk({vals:{gr_num:'FIM-2026-000009'},found:null});await t.click('tab',{v:'ret'});await t.click('find');ok('introuvable : message',/Aucune demande/.test(t.ctx.SUB.guichet()));
 t=mk({vals:{gr_num:'FIM-2026-000009'},found:F,conf:false});await t.click('tab',{v:'ret'});await t.click('find');t.ctx.$=s=>({value:{gr_nom:'Moussa Ba',gr_cni:'1234567890'}[s.slice(1)]});await t.click('do');ok('retrait annulé : aucun appel',t.rpcs.length==0);
 t=mk({vals:{gr_num:'FIM-2026-000009'},found:F});await t.click('tab',{v:'ret'});await t.click('find');t.ctx.$=s=>({value:{gr_nom:'M',gr_cni:'123'}[s.slice(1)]});await t.click('do');ok('nom/CNI trop courts refusés',t.rpcs.length==0&&/obligatoire/.test(t.ctx.SUB.guichet()));
 if(f){console.log(f+' échec(s)');process.exit(1)}console.log('PASS: mairie-guichet');
})();
