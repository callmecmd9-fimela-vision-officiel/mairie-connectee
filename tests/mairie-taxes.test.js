// Portail fiscal mairie : recettes / taxes (total, tableau, validation guichet). node tests/mairie-taxes.test.js
const vm=require('vm'),fs=require('fs'),path=require('path');let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
function mk({rows=[],updRes={data:[{id:'p1'}]},conf=true}={}){const handlers=[],upd=[],loads=[];
 const ctx={E0:{},LG:{},SP:{finances:{subs:[]}},RP:{},SPL:{},SUB:{},S:{cid:'c1',sa:false,err:'',db:{paiements_taxes:rows}},
  D:()=>ctx.S.db,LQ:t=>({order(){return{t}}}),esc:s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  pn:(t,i,b)=>`<section>${t}${b}</section>`,emp:m=>`<p>${m}</p>`,st2:l=>`<span>${l}</span>`,rw:(a,b)=>`<div>${a}${b}</div>`,ic:()=>'',render(){},load:async k=>{loads.push(k)},confirm:()=>conf,
  sb:{from:t=>({update:u=>{const eqs=[];const q={eq:(a,b)=>{eqs.push([a,b]);return q},select:async()=>{upd.push([t,u,eqs]);return updRes}};return q}})},
  document:{addEventListener:(n,fn)=>handlers.push(fn)},scrollTo(){},console};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js','taxes.js'),'utf8'),ctx);
 const click=async(m,d={})=>{const t={dataset:Object.assign({m},d)};for(const h of handlers)await h({target:{closest:s=>s==`[data-m=${m}]`?t:null}})};
 return{ctx,upd,loads,click}}
(async()=>{
 const R=[{id:'p1',type_taxe:'TEOM',montant:5000,statut:'en_attente',reference_paiement:'TAX-1',created_at:'2026-11-20T10:00:00Z'},
  {id:'p2',type_taxe:'Taxe <i>foncière</i>',montant:25000,statut:'paye',reference_paiement:'TAX-2',created_at:'2026-11-21T10:00:00Z'},
  {id:'p3',type_taxe:'Droits de place',montant:2500,statut:'paye',reference_paiement:'TAX-3',created_at:'2026-11-22T10:00:00Z'}];
 let t=mk({rows:R});const h=t.ctx.SUB.taxes();
 ok('onglet Finances > Recettes / Taxes avec droits',t.ctx.SP.finances.subs.some(s=>s[0]=='taxes')&&t.ctx.RP.taxes.includes('agent'));
 ok('total = somme des montants payés uniquement',/27[\s\u202f\u00a0]500 FCFA/.test(h)&&!/32[\s\u202f\u00a0]500/.test(h));
 ok('lignes : type échappé, référence, statut',/Taxe &lt;i&gt;foncière/.test(h)&&/TAX-3/.test(h)&&/En attente/.test(h)&&/Payé/.test(h));
 ok('bouton de validation seulement pour en attente',(h.match(/data-m="ptval"/g)||[]).length==1&&/data-id="p1"/.test(h));
 await t.click('ptval',{id:'p1'});const u=t.upd[0];
 ok('UPDATE statut paye limité commune + en_attente + quittance',u&&u[0]=='paiements_taxes'&&u[1].statut=='paye'&&/quittance/.test(u[1].quittance_url)&&JSON.stringify(u[2])=='[["id","p1"],["commune_id","c1"],["statut","en_attente"]]'&&JSON.stringify(t.loads[0])=='["paiements_taxes"]');
 t=mk({rows:R,conf:false});await t.click('ptval',{id:'p1'});ok('annulation de la confirmation : aucune écriture',t.upd.length==0);
 t=mk({rows:R});await t.click('ptval',{id:'p2'});ok('paiement déjà payé : aucune écriture',t.upd.length==0);
 t=mk({rows:R,updRes:{data:[]}});await t.click('ptval',{id:'p1'});ok('blocage RLS signalé',/refusée/.test(t.ctx.S.err)&&t.loads.length==0);
 t=mk({rows:R});t.ctx.S.sa=true;await t.click('ptval',{id:'p1'});ok('super-admin : aucune écriture',t.upd.length==0);
 t=mk({rows:[]});ok('liste vide gérée',/Aucun paiement/.test(t.ctx.SUB.taxes())&&/0 FCFA/.test(t.ctx.SUB.taxes()));
 if(f){console.log(f+' échec(s)');process.exit(1)}console.log('PASS: mairie-taxes');
})();
