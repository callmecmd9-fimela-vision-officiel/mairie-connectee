// Back-office mairie : signalements citoyens (liste, statuts, carte). node tests/mairie-signalements.test.js
const vm=require('vm'),fs=require('fs'),path=require('path');let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
function mk({rows=[],updRes={data:[{id:'s1'}]},withL=true}={}){const handlers=[],upd=[],loads=[],markers=[],els={};let renders=0;
 const ctx={E0:{},LG:{},SP:{citoyens:{subs:[]}},RP:{},SPL:{},SUB:{},S:{cid:'c1',sa:false,err:'',ind:{},db:{signalements_citoyens:rows}},
  D:()=>ctx.S.db,LQ:t=>({order(){return{t}}}),$:s=>els[s]||null,esc:s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  pn:(t,i,b)=>`<section>${t}${b}</section>`,emp:m=>`<p>${m}</p>`,st2:(l)=>`<span>${l}</span>`,render0(){},render(){renders++},
  load:async k=>{loads.push(k)},
  sb:{from:t=>({update:u=>({eq:(a,b)=>({eq:(c,d)=>({select:async()=>{upd.push([t,u,a,b,c,d]);return updRes}})})})})},
  document:{addEventListener:(n,fn)=>handlers.push(fn)},setTimeout(fn){fn()},scrollTo(){},console};
 if(withL)ctx.L={map:()=>({setView(){return this},fitBounds(){},remove(){},invalidateSize(){}}),tileLayer:()=>({addTo(){}}),circleMarker:(p,o)=>({addTo(){return this},bindPopup(h){markers.push([p,o,h])}})};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js','signalements.js'),'utf8'),ctx);
 const click=async(m,d={})=>{const t={dataset:Object.assign({m},d)};for(const h of handlers)await h({target:{closest:s=>s==`[data-m=${m}]`?t:null}})};
 return{ctx,upd,loads,markers,els,click,renders:()=>renders}}
(async()=>{
 const R=[{id:'s1',categorie:'Voirie',description:'Nid <b>de poule</b>',photo_url:'https://x.supabase.co/p.jpg',latitude:14.4,longitude:-16.9,statut:'nouveau',created_at:'2026-11-20T10:00:00Z'},
  {id:'s2',categorie:'Déchets',description:'Dépôt',photo_url:'javascript:alert(1)',latitude:null,longitude:null,statut:'resolu',created_at:'2026-11-21T10:00:00Z'}];
 let t=mk({rows:R});const h=t.ctx.SUB.signalements();
 ok('onglet enregistré dans Citoyens avec droits',t.ctx.SP.citoyens.subs.some(s=>s[0]=='signalements')&&t.ctx.RP.signalements.includes('maire'));
 ok('liste : date, catégorie, description échappée, statut',/Voirie/.test(h)&&/Déchets/.test(h)&&/Nid &lt;b&gt;de poule/.test(h)&&!/<b>de poule/.test(h)&&/Nouveau/.test(h)&&/Résolu/.test(h));
 ok('photo https cliquable, schéma dangereux ignoré',/<a href="https:\/\/x\.supabase\.co\/p\.jpg"[^>]*rel="noopener noreferrer" aria-label="[^"]*"><img class="th"/.test(h)&&!/javascript:/.test(h));
 ok('boutons de statut vers les 3 autres statuts',(h.match(/data-m="sgst" data-id="s1"/g)||[]).length==3&&!/data-id="s1" data-v="nouveau"/.test(h));
 t.ctx.S.sgf='resolu';const h2=t.ctx.SUB.signalements();ok('filtre par statut',/Déchets/.test(h2)&&!/Voirie/.test(h2.split('Signalements des citoyens')[1]));
 // mise à jour
 await t.click('sgst',{id:'s1',v:'en_cours'});
 const u=t.upd[0];ok('UPDATE limité à la commune et à l’id',u&&u[0]=='signalements_citoyens'&&u[1].statut=='en_cours'&&u[2]=='id'&&u[3]=='s1'&&u[4]=='commune_id'&&u[5]=='c1');
 ok('rechargement + message',JSON.stringify(t.loads[0])=='["signalements_citoyens"]'&&/En cours/.test(t.ctx.S.err));
 t=mk({rows:R});await t.click('sgst',{id:'s1',v:'bidon'});ok('statut inconnu refusé',t.upd.length==0&&/inconnu/.test(t.ctx.S.err));
 t=mk({rows:R,updRes:{data:[]}});await t.click('sgst',{id:'s1',v:'resolu'});ok('mise à jour bloquée par RLS signalée',/refusée/.test(t.ctx.S.err)&&t.loads.length==0);
 t=mk({rows:R,updRes:{error:{message:'boom'}}});await t.click('sgst',{id:'s1',v:'resolu'});ok('erreur Supabase affichée',/boom/.test(t.ctx.S.err));
 t=mk({rows:R});t.ctx.S.sa=true;await t.click('sgst',{id:'s1',v:'resolu'});ok('super-admin : aucune écriture',t.upd.length==0);
 t=mk({rows:R});await t.click('sgst',{id:'s1',v:'nouveau'});ok('même statut : aucune écriture',t.upd.length==0);
 // carte
 t=mk({rows:R});t.els['#sigmap']={};t.ctx.render0();ok('carte : un marqueur par signalement géolocalisé, couleur du statut',t.markers.length==1&&t.markers[0][1].fillColor=='#2563EB'&&/Voirie/.test(t.markers[0][2])&&!/<b>de poule/.test(t.markers[0][2]));
 t=mk({rows:R,withL:false});t.els['#sigmap']={innerHTML:''};t.ctx.render0();ok('Leaflet absent : message sans erreur',/indisponible/.test(t.els['#sigmap'].innerHTML));
 await t.click('sgflt',{v:'nouveau'});ok('clic filtre : état + rendu',t.ctx.S.sgf=='nouveau'&&t.renders()==1);
 if(f){console.log(f+' échec(s)');process.exit(1)}console.log('PASS: mairie-signalements');
})();
