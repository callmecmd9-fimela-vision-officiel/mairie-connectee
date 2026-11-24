// Démarches payantes côté mairie : Tarifs, Demandes (encaisser, délivrer, rejeter), export CSV des recettes. node tests/mairie-paiements-demandes.test.js
const vm=require('vm'),fs=require('fs'),path=require('path');let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
function mk({rows=[],tar=[],conf=true,promptV='Pièce illisible',rpcErr=null}={}){const H={click:[],change:[]},rpcs=[],loads=[],ups=[];
 const ctx={E0:{},LG:{},SP:{finances:{subs:[]}},RP:{},SPL:{},SUB:{},S:{cid:'c1',sa:false,err:'',db:{dem_pay:rows,tarifs_dem:tar,dmr:[{titre:'Extrait de naissance'}]}},
  D:()=>ctx.S.db,LQ:()=>({order(){return{}}}),esc:s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  pn:(t,i,b)=>`<section>${t}${b}</section>`,emp:m=>`<p>${m}</p>`,st2:l=>`<span>${l}</span>`,rw:(a,b)=>`<div>${a}${b}</div>`,ic:()=>'',render(){},load:async k=>{loads.push(k)},confirm:()=>conf,prompt:()=>promptV,
  crypto:{randomUUID:()=>'11111111-1111-4111-8111-111111111111'},
  sb:{rpc:async(n,a)=>{rpcs.push([n,a]);return rpcErr?{error:{message:rpcErr}}:{data:n=='encaisser_demande'?'QT-ABC':true}},storage:{from:b=>({upload:async(p,fl)=>{ups.push([b,p,fl.type]);return{}},remove:async()=>({})})}},
  document:{addEventListener:(n,fn)=>H[n].push(fn),querySelector:()=>({value:'7500'})},scrollTo(){},console};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js','paiements-demandes.js'),'utf8'),ctx);
 const click=async(m,d={})=>{const t={dataset:Object.assign({m},d)};for(const h of H.click)await h({target:{closest:s=>s==`[data-m=${m}]`?t:null}})};
 const change=async(id,fl)=>{for(const h of H.change)await h({target:{dataset:{dpdel:id},files:fl}})};
 return{ctx,rpcs,loads,ups,click,change}}
(async()=>{
 const past='2020-01-01T00:00:00Z',R=[
  {id:'a',numero:'FIM-0001-X',type:'État civil',objet:'Extrait <b>naissance</b>',nom:'Awa',telephone:'771234567',montant:2000,statut:'nouvelle',statut_paiement:'non_paye',date_limite:past,created_at:'2026-11-01T10:00:00Z'},
  {id:'b',numero:'FIM-0002-Y',type:'État civil',objet:'Certificat',nom:'Moussa',montant:1000,statut:'nouvelle',statut_paiement:'paye',date_limite:'2099-01-01T00:00:00Z',created_at:'2026-11-02T10:00:00Z'},
  {id:'c',numero:'FIM-0003-Z',type:'État civil',objet:'Légalisation',nom:'Fatou',montant:500,statut:'rejetee',reponse:'Dossier incomplet',statut_paiement:'non_paye',created_at:'2026-11-03T10:00:00Z'}];
 let t=mk({rows:R});const h=t.ctx.SUB.dempay();
 ok('sous-menus Tarifs + Demandes avec droits',t.ctx.SP.finances.subs.some(s=>s[0]=='tarifs')&&t.ctx.SP.finances.subs.some(s=>s[0]=='dempay')&&t.ctx.RP.tarifs.includes('finances')&&!t.ctx.RP.tarifs.includes('agent'));
 ok('échappement + alerte rouge si date limite dépassée',/Extrait &lt;b&gt;naissance/.test(h)&&/border-left/.test(h)&&/Délai dépassé/.test(h)&&(h.match(/Délai dépassé/g)||[]).length==1);
 ok('Encaisser seulement si non payé et non clos',(h.match(/data-m="dpenc"/g)||[]).length==1&&/data-id="a"/.test(h));
 ok('Valider et délivrer : bloqué tant que non payé, actif si payé, absent si rejeté',/Valider et délivrer \(paiement requis\)/.test(h)&&(h.match(/data-dpdel="b"/g)||[]).length==1&&!/data-dpdel="c"/.test(h)&&!/data-dpdel="a"/.test(h));
 ok('Rejet proposé sauf dossier clos',(h.match(/data-m="dprej"/g)||[]).length==2);
 t.ctx.S.dpf='rejetee';ok('filtre par statut',!/FIM-0001/.test(t.ctx.SUB.dempay())&&/FIM-0003/.test(t.ctx.SUB.dempay()));
 t.ctx.S.dpf='retard';ok('filtre retard',/FIM-0001/.test(t.ctx.SUB.dempay())&&!/FIM-0002/.test(t.ctx.SUB.dempay()));
 await t.click('dpenc',{id:'a'});ok('encaissement via RPC serveur + rechargement',t.rpcs[0][0]=='encaisser_demande'&&t.rpcs[0][1].p_demande=='a'&&/QT-ABC/.test(t.ctx.S.err)&&JSON.stringify(t.loads[0])=='["dem_pay","paiements_taxes"]');
 t=mk({rows:R});await t.click('dpenc',{id:'b'});ok('déjà payé : aucun encaissement',t.rpcs.length==0);
 t=mk({rows:R,conf:false});await t.click('dpenc',{id:'a'});ok('annulation : aucune écriture',t.rpcs.length==0);
 t=mk({rows:R,promptV:'ok'});await t.click('dprej',{id:'a'});ok('rejet sans motif suffisant refusé',t.rpcs.length==0&&/motif/.test(t.ctx.S.err));
 t=mk({rows:R});await t.click('dprej',{id:'a'});ok('rejet avec motif',t.rpcs[0][0]=='rejeter_demande'&&t.rpcs[0][1].p_motif=='Pièce illisible');
 t=mk({rows:R});await t.change('b',[{type:'application/pdf',size:1000}]);ok('délivrance : PDF dans le dossier de la commune puis RPC',t.ups[0][0]=='documents-delivres'&&t.ups[0][1]=='c1/11111111-1111-4111-8111-111111111111.pdf'&&t.rpcs[0][0]=='delivrer_demande'&&t.rpcs[0][1].p_path==t.ups[0][1]);
 t=mk({rows:R});await t.change('b',[{type:'image/png',size:10}]);ok('non-PDF refusé',t.ups.length==0&&/PDF/.test(t.ctx.S.err));
 t=mk({rows:R});await t.change('a',[{type:'application/pdf',size:10}]);ok('non payé : aucun envoi',t.ups.length==0&&/Paiement requis/.test(t.ctx.S.err));
 t=mk({rows:R});t.ctx.S.sa=true;await t.click('dpenc',{id:'a'});ok('super-admin : aucune écriture',t.rpcs.length==0);
 t=mk({tar:[{id:'t1',type_service:'État civil',montant:1500}]});const g=t.ctx.SUB.tarifs();
 ok('tarifs : lignes existantes + démarches sans tarif',/État civil/.test(g)&&/Extrait de naissance/.test(g)&&/Sans tarif/.test(g));
 await t.click('tfsave',{ty:'État civil'});ok('définir tarif via RPC (entier)',t.rpcs[0][0]=='definir_tarif'&&t.rpcs[0][1].p_montant==7500&&t.rpcs[0][1].p_type_service=='État civil');
 if(f){console.log(f+' échec(s)');process.exit(1)}console.log('PASS: mairie-paiements-demandes');
})();
