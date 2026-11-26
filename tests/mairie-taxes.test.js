// Portail fiscal mairie : recettes / taxes (total, tableau, validation guichet via la RPC valider_paiement_especes). node tests/mairie-taxes.test.js
const vm=require('vm'),fs=require('fs'),path=require('path');let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
function mk({rows=[],rpcRes={data:{succes:true},error:null},conf=true,pr='finances'}={}){const handlers=[],rpcs=[],writes=[],loads=[];
 const ctx={E0:{},LG:{},SP:{finances:{subs:[]}},RP:{},SPL:{},SUB:{},S:{cid:'c1',sa:false,pr,err:'',db:{paiements_taxes:rows}},
  D:()=>ctx.S.db,LQ:t=>({order(){return{t}}}),esc:s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  pn:(t,i,b)=>`<section>${t}${b}</section>`,emp:m=>`<p>${m}</p>`,st2:l=>`<span>${l}</span>`,rw:(a,b)=>`<div>${a}${b}</div>`,ic:()=>'',render(){},load:async k=>{loads.push(k)},confirm:()=>conf,
  // Toute écriture directe sur la table est comptée : la validation doit passer UNIQUEMENT par la RPC
  sb:{rpc:async(fn,args)=>{rpcs.push([fn,args]);return rpcRes},from:t=>({update:()=>{writes.push(t);return{eq(){return this},select:async()=>({data:[],error:null})}}})},
  document:{addEventListener:(n,fn)=>handlers.push(fn)},scrollTo(){},console};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js','taxes.js'),'utf8'),ctx);
 const click=async(m,d={})=>{const t={dataset:Object.assign({m},d)};for(const h of handlers)await h({target:{closest:s=>s==`[data-m=${m}]`?t:null}})};
 return{ctx,rpcs,writes,loads,click}}
(async()=>{
 const R=[{id:'p1',type_taxe:'TEOM',montant:5000,statut:'en_attente',source:'guichet',reference_paiement:'TAX-1',created_at:'2026-11-20T10:00:00Z'},
  {id:'p2',type_taxe:'Taxe <i>foncière</i>',montant:25000,statut:'paye',source:'guichet',reference_paiement:'TAX-2',created_at:'2026-11-21T10:00:00Z'},
  {id:'p3',type_taxe:'Droits de place',montant:2500,statut:'paye',source:'taxe',reference_paiement:'TAX-3',created_at:'2026-11-22T10:00:00Z'},
  {id:'p4',type_taxe:'Patente',montant:7000,statut:'en_attente',source:'en_ligne_simule',reference_paiement:'TAX-4',created_at:'2026-11-23T10:00:00Z'}];
 let t=mk({rows:R});const h=t.ctx.SUB.taxes();
 ok('onglet Finances > Recettes / Taxes avec droits',t.ctx.SP.finances.subs.some(s=>s[0]=='taxes')&&t.ctx.RP.taxes.includes('agent'));
 ok('total = somme des montants payés uniquement',/27[\s\u202f\u00a0]500 FCFA/.test(h)&&!/32[\s\u202f\u00a0]500/.test(h));
 ok('lignes : type échappé, référence, statut',/Taxe &lt;i&gt;foncière/.test(h)&&/TAX-3/.test(h)&&/En attente/.test(h)&&/Payé/.test(h));
 ok('bouton de validation : en attente ET source guichet seulement (pas en ligne, pas payé)',(h.match(/data-m="ptval"/g)||[]).length==1&&/data-id="p1"/.test(h)&&!/data-id="p4"/.test(h));
 await t.click('ptval',{id:'p1'});
 ok('validation = appel RPC valider_paiement_especes (id + motif), sans écriture directe',t.rpcs.length==1&&t.rpcs[0][0]=='valider_paiement_especes'&&JSON.stringify(t.rpcs[0][1])=='{"p_id":"p1","p_motif":"Validation guichet"}'&&t.writes.length==0);
 ok('succès : liste rechargée et message de confirmation',JSON.stringify(t.loads[0])=='["paiements_taxes"]'&&/validé/.test(t.ctx.S.err));
 t=mk({rows:R,conf:false});await t.click('ptval',{id:'p1'});ok('annulation de la confirmation : aucun appel',t.rpcs.length==0&&t.writes.length==0);
 t=mk({rows:R});await t.click('ptval',{id:'p2'});ok('paiement déjà payé : aucun appel',t.rpcs.length==0&&t.writes.length==0);
 t=mk({rows:R});await t.click('ptval',{id:'p4'});ok('source en ligne : refus côté interface, aucun appel',t.rpcs.length==0&&t.writes.length==0&&/guichet/.test(t.ctx.S.err));
 t=mk({rows:R,rpcRes:{data:null,error:{code:'42501',message:'Accès refusé : seul le rôle « finances » peut valider un paiement en espèces.'}}});await t.click('ptval',{id:'p1'});
 ok('refus serveur (42501) : message clair, pas de rechargement',/Accès refusé/.test(t.ctx.S.err)&&t.loads.length==0);
 t=mk({rows:R,rpcRes:{data:null,error:{code:'P0002',message:'Paiement introuvable.'}}});await t.click('ptval',{id:'p1'});
 ok('paiement introuvable (P0002) : message dédié',/introuvable/.test(t.ctx.S.err)&&t.loads.length==0);
 t=mk({rows:R,rpcRes:{data:null,error:{code:'40001',message:'x'}}});await t.click('ptval',{id:'p1'});
 ok('modifié entre-temps (40001) : message dédié',/modifié entre-temps/.test(t.ctx.S.err)&&t.loads.length==0);
 t=mk({rows:R,rpcRes:{data:null,error:{code:'PGRST202',message:'function not found'}}});await t.click('ptval',{id:'p1'});
 ok('RPC non déployée (PGRST202) : message explicite',/pas encore disponible/.test(t.ctx.S.err)&&t.loads.length==0);
 t=mk({rows:R});t.ctx.S.sa=true;await t.click('ptval',{id:'p1'});ok('super-admin : aucun appel',t.rpcs.length==0&&t.writes.length==0);
 t=mk({rows:R,pr:'finances'});ok('finances : bouton « Valider (espèces) » visible (en attente + guichet)',/data-m="ptval"/.test(t.ctx.SUB.taxes()));
 for(const pr of ['secretariat','agent']){t=mk({rows:R,pr});ok(pr+' : bouton « Valider (espèces) » absent (réservé à finances)',!/data-m="ptval"/.test(t.ctx.SUB.taxes())&&!/Valider \(espèces\)/.test(t.ctx.SUB.taxes()));
  await t.click('ptval',{id:'p1'});ok(pr+' : clic sans effet',t.rpcs.length==0&&t.writes.length==0)}
 t=mk({rows:R,pr:'maire'});ok('maire : bouton absent (la RPC est réservée au rôle finances)',!/data-m="ptval"/.test(t.ctx.SUB.taxes()));
 await t.click('ptval',{id:'p1'});ok('maire : clic sans effet',t.rpcs.length==0&&t.writes.length==0);
 t=mk({rows:[]});ok('liste vide gérée',/Aucun paiement/.test(t.ctx.SUB.taxes())&&/0 FCFA/.test(t.ctx.SUB.taxes()));
 if(f){console.log(f+' échec(s)');process.exit(1)}console.log('PASS: mairie-taxes');
})();
