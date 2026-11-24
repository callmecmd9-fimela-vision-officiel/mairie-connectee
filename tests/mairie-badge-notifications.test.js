// Pastille de notifications de la mairie : compte les éléments à traiter, s'incrémente, disparaît à l'ouverture de la demande. node tests/mairie-badge-notifications.test.js
const vm=require('vm'),fs=require('fs'),path=require('path');let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
const src=fs.readFileSync(path.join(__dirname,'..','js','core.js'),'utf8');
const A=src.slice(src.indexOf('const seenKey'),src.indexOf('const acts = ')),B=src.slice(src.indexOf('const badgeN'),src.indexOf('const tb = t'));
ok('extraits du code trouvés',A.includes('alerts')&&B.includes('majBadge'));
const store={};
function mk(){const ctx={S:{uid:'u1',cid:'c1',ind:{}},T:'2026-01-01',cmp:()=>0,fd:x=>x,
 D:()=>ctx.db,localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v}},sb:{rpc:async()=>({data:true})},document:{querySelector:()=>null},
 db:{mail:[],posts:[],fin:[],rdv:[{d:'2026-02-01',t:'RDV'}],nt:[],req:[]}};
 vm.createContext(ctx);vm.runInContext(A+';'+B+';this.api={alerts,badgeN,markSeen,unseenNew};',ctx);return ctx}
const c=mk(),api=c.api,req=n=>Array.from({length:n},(_,i)=>({id:'d'+i,st:'Nouvelle'}));
ok('rien à traiter : pastille 0 (le prochain rendez-vous ne compte pas)',api.badgeN()===0);
c.db.req=req(3);
ok('3 nouvelles demandes : pastille 3 (et non 1)',api.badgeN()===3);
c.db.req=req(4);
ok('une 4e demande arrive : la pastille passe à 4',api.badgeN()===4);
api.markSeen('d1');
ok('ouverture d\'une demande : elle disparaît du compteur (4 → 3)',api.badgeN()===3);
api.markSeen('d1');
ok('rouvrir la même demande ne change rien',api.badgeN()===3);
['d0','d2','d3'].forEach(api.markSeen);
ok('toutes ouvertes : pastille 0',api.badgeN()===0);
c.db.req=req(4).concat([{id:'d9',st:'Nouvelle'}]);
ok('une nouvelle demande après coup : pastille 1',api.badgeN()===1);
c.db.req.find(r=>r.id=='d9').st='En cours';
ok('demande prise en charge : plus comptée',api.badgeN()===0);
c.db.req=[{id:'x',st:'Nouvelle'}];c.db.nt=[{lu:false},{lu:false},{lu:true}];c.db.mail=[{st:'À signer'},{st:'À signer'}];
ok('notifications non lues (2) + signatures (2) + demande (1) = 5',api.badgeN()===5);
c.S.uid='u2';
ok('autre utilisateur du même appareil : ses propres demandes non vues',api.unseenNew().length===1);
ok('identifiants purgés : seules les demandes encore chargées sont mémorisées',(()=>{c.S.uid='u1';c.db.req=[{id:'d1',st:'Nouvelle'},{id:'d7',st:'Nouvelle'}];api.markSeen('d7');return JSON.parse(store['mc_vu_u1_c1']).sort().join()=='d1,d7'})());


/* --- état « vu » partagé entre appareils (serveur) --- */
(async()=>{
 const calls=[];let rpcRes={data:true};
 const mk2=()=>{const ctx={S:{uid:'u1',cid:'c1',ind:{}},T:'2026-01-01',cmp:()=>0,fd:x=>x,D:()=>ctx.db,
  localStorage:{getItem:k=>ctx.ls[k]??null,setItem:(k,v)=>{ctx.ls[k]=v}},ls:{},document:{querySelector:()=>null},
  sb:{rpc:async(n,a)=>{calls.push([n,a]);return rpcRes}},
  db:{mail:[],posts:[],fin:[],rdv:[],nt:[],dvues:[],req:[{id:'a',st:'Nouvelle'},{id:'b',st:'Nouvelle'}]}};
  vm.createContext(ctx);vm.runInContext(A+';'+B+';this.api={badgeN,markSeen,syncSeen,unseenNew};',ctx);return ctx};
 let t=mk2();
 ok('appareil 2 : demande déjà vue sur le serveur = non comptée',(t.db.dvues=[{demande_id:'a'}],t.api.badgeN()===1));
 t=mk2();t.api.markSeen('a');await new Promise(r=>setImmediate(r));
 ok('ouverture : appel serveur marquer_demande_vue',calls.length===1&&calls[0][0]==='marquer_demande_vue'&&calls[0][1].p_demande==='a');
 ok('ouverture : état serveur mis à jour localement sans rechargement',t.db.dvues.some(x=>x.demande_id==='a')&&t.api.badgeN()===1);
 t.api.markSeen('a');await new Promise(r=>setImmediate(r));
 ok('rouvrir : aucun second appel serveur',calls.length===1);
 calls.length=0;t=mk2();t.ls['mc_vu_u1_c1']=JSON.stringify(['a','b']);t.api.syncSeen();await new Promise(r=>setImmediate(r));
 ok('rattrapage : demandes vues avant la mise à jour transmises au serveur',calls.length===2);
 calls.length=0;rpcRes={error:{message:'Could not find the function public.marquer_demande_vue(p_demande) in the schema cache'}};t=mk2();
 t.api.markSeen('a');await new Promise(r=>setImmediate(r));t.api.markSeen('b');await new Promise(r=>setImmediate(r));
 ok('SQL non installé : repli local, pastille correcte, plus aucun appel',t.api.badgeN()===0&&calls.length===1);
 rpcRes={data:true};calls.length=0;t=mk2();t.sb.rpc=async()=>{throw new Error('réseau')};
 t.api.markSeen('a');await new Promise(r=>setImmediate(r));
 ok('réseau coupé : aucune exception, la demande reste « vue » localement',t.api.badgeN()===1);
 console.log(f?'ECHECS: '+f:'tout est OK');process.exit(f?1:0);
})();
