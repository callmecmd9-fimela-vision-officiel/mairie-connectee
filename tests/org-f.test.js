// Lot F front : services, personnel, affectations et KPI. Exécuter : node tests/org-f.test.js
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..');
let failures = 0;
const ok = (name, pass) => { console.log(pass ? 'OK  ' : 'FAIL', name); if (!pass) failures++; };
const data = {
  services: [{id:'s1',code:'administration',nom:'Administration',type:'direction',parent_id:null,responsable:'Maire',ordre:1,actif:true}],
  postes: [{code:'resp_tech',nom:'Responsable technique',famille:'Technique',role_code:'resp_tech',parent_code:null,service_code:'technique',actif:true,titulaires:[]}],
  agents: [{id:'a1',prenom:'Awa',nom:'Diop',fonction:'Secrétaire',service_id:'s1',actif:true,user_id:null,type_contrat:'Permanent',matricule:'M001',telephone:'770000000',email:'awa@example.sn',fusionne_dans:null,affectations:[{id:'af1',poste_code:'resp_tech',service_id:'s1',debut:'2026-01-01',fin:null,motif:null}]}],
  adjoints: [], comptes: [{id:'u1',nom:'Compte Awa',email:'awa@example.sn',role:'agent',actif:true}]
};
const roles=[{code:'resp_tech',nom:'Responsable technique',description:'Gestion technique',systeme:false,actif:true,droits:[{module:'personnel',action:'consulter'}]}];
const rights=Array.from({length:11},(_,i)=>({dataset:{ofRight:['consulter','creer','modifier','supprimer','valider','rejeter','signer','exporter','imprimer','partager','administrer'][i]},checked:i===0}));
const calls = [], handlers = [], els = {};
const query = { select(){return this;}, eq(){return this;}, async maybeSingle(){return {data:{observations:'Conserver cette note'},error:null};} };
const sb = {
  async rpc(name,args){
    calls.push([name,args]);
    if(name==='org_sa_organigramme') return {data,error:null};
    if(name==='org_sa_roles') return {data:roles,error:null};
    if(name==='org_kpi') return {data:{instr:2,cin:3,actes:1,dossiers:4,citoyens:5,marches:0,projets:6,projets_retard:1,conges:2,paie:1,personnel:7},error:null};
    return {data:name==='org_sa_agent_save'?'agent-new-id':null,error:null};
  },
  from(){return query;}
};
function inp(id,label,type='text',value='',placeholder='',extra=''){return '<label>'+label+'<input id="'+id+'" type="'+type+'" value="'+value+'" '+extra+'></label>';}
function sel(id,label,options,value){return '<label>'+label+'<select id="'+id+'">'+options.map(x=>'<option value="'+x[0]+'"'+(x[0]===value?' selected':'')+'>'+x[1]+'</option>').join('')+'</select></label>';}
const ctx = {
  console, Date, Promise, Math, Number, confirm:()=>true,
  S:{pr:'maire',sa:false,cid:'cid-fimela',co:'Fimela',cs:[{id:'cid-fimela',slug:'fimela',nom:'Fimela'}],tab:{},err:''},
  SP:{administration:{subs:[]}}, RP:{}, SPL:{}, SUB:{}, SANAV:[], V:{}, sb,
  slug:()=> 'fimela', render(){}, esc:x=>String(x??''),
  pn:(title,icon,body,right='')=>'<section><h2>'+title+'</h2>'+right+body+'</section>',
  frm:x=>x, inp, sel, rw:(a,b)=>'<div>'+a+b+'</div>', emp:x=>'<p>'+x+'</p>',
  st2:x=>'<span>'+x+'</span>', tabs:(g,items)=>'<nav>'+items.map(x=>'<button>'+x[1]+'</button>').join('')+'</nav>',
  $:s=>els[s.slice(1)]||null,
  document:{addEventListener:(name,handler)=>handlers.push(handler),querySelectorAll:()=>rights}
};
const c = vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(R,'js','org-f.js'),'utf8'),c,{filename:'org-f.js'});
const E = code => vm.runInContext(code,c);
async function click(dataset){
  const target={dataset};
  for(const handler of handlers) await handler({target:{closest:selector=>selector==='[data-of]'?target:null}});
}
(async()=>{
  E('orgfView()');
  await new Promise(resolve=>setTimeout(resolve,0));
  let html=E('orgfView()');
  ok('module ajouté au menu Administration, réservé au maire',ctx.SP.administration.subs.some(x=>x[0]==='orgf')&&ctx.RP.orgf[0]==='maire');
  ok('chargement par slug et lecture KPI',calls.some(x=>x[0]==='org_sa_organigramme'&&x[1].p_commune==='fimela')&&calls.some(x=>x[0]==='org_kpi'));
  ok('services affichés depuis la réponse serveur',/Administration/.test(html));
  E('S.tab.orgf="agents"'); html=E('orgfView()');
  ok('agents affichés avec service et matricule',/Awa Diop/.test(html)&&/M001/.test(html));
  E('S.tab.orgf="affect"'); html=E('orgfView()');
  ok('historique des affectations visible',/Responsable technique/.test(html)&&/2026-01-01/.test(html));
  E('S.tab.orgf="kpi"'); html=E('orgfView()');
  ok('indicateurs agrégés clairement distingués des KPI individuels',/Indicateurs de la commune/.test(html)&&/ventilation individuelle par poste/.test(html)&&/7/.test(html));
  E('S.tab.orgf="postes"'); html=E('orgfView()');
  ok('postes vacants et modification de poste visibles',/Poste vacant/.test(html)&&/Modifier/.test(html)&&/Nouveau poste/.test(html));
  E('S.tab.orgf="roles";ORGF.roleSelected="resp_tech"'); html=E('orgfView()');
  ok('rôles et droits chargés depuis la RPC dédiée',/Responsable technique/.test(html)&&/Droits du rôle/.test(html)&&/Consulter/.test(html));
  E('S.pr="super_admin";S.sa=true;S.cs=[{id:"cid-fimela",slug:"fimela",nom:"Fimela"}]'); html=E('orgfView()');
  ok('super-administrateur : sélection de commune et écran organigramme',/Commune gérée/.test(html)&&ctx.SANAV.some(x=>x[0]==='sa_org')&&typeof ctx.V.sa_org==='function');
  E('S.pr="maire";S.sa=false');

  els.of_sc={value:'Code Invalide'}; els.of_sn={value:'Test'}; els.of_st={value:'service'}; els.of_sp={value:''}; els.of_sr={value:''}; els.of_sa={value:'1'};
  const before=calls.length;
  await click({of:'service-save'});
  ok('code service invalide refusé avant appel serveur',calls.length===before&&/Code invalide/.test(ctx.S.err));

  els.of_sc={value:'administration'}; els.of_sn={value:'Administration générale'}; els.of_st={value:'direction'}; els.of_sp={value:''}; els.of_sr={value:'Maire'}; els.of_sa={value:'1'};
  await click({of:'service-save'});
  const serviceCall=calls.find(x=>x[0]==='org_sa_service_save');
  ok('service sauvegardé par RPC serveur avec slug et ordre',!!serviceCall&&serviceCall[1].p_commune==='fimela'&&serviceCall[1].p_code==='administration'&&serviceCall[1].p_ordre===1&&!calls.some(x=>x[0]==='org_service_save'));

  els.of_pc={value:'nouveau_poste'}; els.of_pn={value:'Nouveau poste'}; els.of_pf={value:'Technique'}; els.of_pr={value:'resp_tech'}; els.of_pp={value:''}; els.of_ps={value:'technique'}; els.of_pa={value:'1'};
  await click({of:'post-save'});
  const postCall=calls.find(x=>x[0]==='org_sa_poste_save');
  ok('création de poste via RPC sécurisée',!!postCall&&postCall[1].p_code==='nouveau_poste'&&postCall[1].p_role==='resp_tech');

  els.of_rc={value:'nouveau_role'}; els.of_rn={value:'Nouveau rôle'}; els.of_rd={value:'Description'}; els.of_ra={value:'1'};
  await click({of:'role-save'});
  const roleCall=calls.find(x=>x[0]==='org_sa_role_save');
  ok('création de rôle personnalisé via RPC',!!roleCall&&roleCall[1].p_code==='nouveau_role'&&roleCall[1].p_actif===true);
  els.of_rm={value:'personnel'}; E('ORGF.roleSelected="resp_tech"');
  await click({of:'role-rights-save',code:'resp_tech'});
  ok('enregistrement des 11 actions du module par RPC serveur',calls.filter(x=>x[0]==='org_sa_role_droit_set').length===11);

  els.of_ap={value:'Awa'}; els.of_an={value:'Diop'}; els.of_af={value:'Secrétaire'}; els.of_as={value:'administration'}; els.of_au={value:'u1'}; els.of_ac={value:'Permanent'}; els.of_am={value:'M001'}; els.of_at={value:'770000000'}; els.of_ae={value:'awa@example.sn'}; els.of_aa={value:'1'};
  await click({of:'agent-save',id:'a1'});
  const agentCall=calls.find(x=>x[0]==='org_sa_agent_save');
  ok('modification agent conserve les observations existantes',!!agentCall&&agentCall[1].p_obs==='Conserver cette note'&&agentCall[1].p_commune==='fimela');
  const linkCall=calls.find(x=>x[0]==='org_sa_lier_compte');
  ok('liaison fiche RH / compte Auth par RPC dédiée',!!linkCall&&linkCall[1].p_personnel==='agent-new-id'&&linkCall[1].p_user==='u1');

  els.of_xp={value:'agent:a1'}; els.of_xo={value:'resp_tech'}; els.of_xs={value:'administration'}; els.of_xd={value:'2026-11-18'}; els.of_xf={value:''}; els.of_xm={value:'Organisation'};
  await click({of:'assign'});
  const assignmentCall=calls.find(x=>x[0]==='org_sa_affecter');
  ok('affectation agent-poste via RPC sécurisé et slug',!!assignmentCall&&assignmentCall[1].p_personnel==='a1'&&assignmentCall[1].p_adjoint===null&&assignmentCall[1].p_poste==='resp_tech'&&assignmentCall[1].p_commune==='fimela');

  E('S.pr="agent";S.sa=false;ORGF.data=null;ORGF.loading=false');
  const count=calls.length; html=E('orgfView()');
  ok('autre rôle : écran refusé sans appel de données',/réservée au maire/.test(html)&&calls.length===count);
  console.log(failures?'ECHECS: '+failures:'TOUS OK');
  process.exit(failures?1:0);
})();
