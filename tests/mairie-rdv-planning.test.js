// Lot 6 bis (mairie) : panneau jours/heures, validations, enregistrement, créneau déjà confirmé. node tests/mairie-rdv-planning.test.js
const vm=require('vm'),fs=require('fs'),path=require('path');let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
function mk({rdp=[],rdq=[],updErr=null}={}){const handlers=[],ups=[],upd=[],els={};
 const ctx={E0:{},LG:{},SP:{administration:{subs:[]},citoyens:{subs:[]}},RP:{},SPL:{},SUB:{},S:{co:'Fimela',cid:'cid1',ind:{},sa:false,sel:{rq:rdq[0]&&rdq[0].id},err:''},T:'2026-11-17',DE:{ascending:false},
  $:s=>els[s]||null,esc:s=>String(s==null?'':s),slug:()=>'fimela',pn:(t,i,b)=>`<section>${t}${b}</section>`,emp:m=>`<p>${m}</p>`,frm:x=>x,rw:()=>'',
  sel:(id,l,o,v)=>`<select id="${id}" data-v="${v}">${o.map(x=>`<option value="${x[0]}">${x[1]}</option>`).join('')}</select>`,inp:(id,l,ty,v)=>`<input id="${id}" type="${ty}" value="${v}">`,ev:()=>'',
  D:()=>({dmr:[],rdq,rdp}),LQ:()=>({order(){return this}}),load:async()=>{},render:()=>{},svn:x=>x,fdd:x=>x,closeb:()=>'',rowv:(k,id,l,r)=>`<div>${l}${r}</div>`,st2:(l)=>l,
  sb:{from:t=>({upsert:async(o,op)=>{ups.push([t,o,op]);return{}},update:u=>({eq:async()=>{upd.push(u);return updErr?{error:updErr}:{}}}),insert:async()=>({})}),storage:{from:()=>({})}},
  document:{addEventListener:(n,fn)=>handlers.push(fn),createElement:()=>({}),head:{appendChild(){}}},window:null,location:{origin:'https://m.x'},navigator:{},setTimeout(){},scrollTo(){},confirm:()=>true,console};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','demarches.js'),'utf8'),ctx);
 const click=async m=>{const t={dataset:{m},textContent:''};for(const h of handlers)await h({target:{closest:s=>(s.includes('[data-m^=rq]')&&m.startsWith('rq'))||(s=='[data-m=rqplan]'&&m=='rqplan')?t:null}})};
 const form=({j=[1,2,3,4,5],d='08:00',f2='17:00',pd='12:30',pf='14:00',du='30',ac=true})=>{els['#rp_d']={value:d};els['#rp_f']={value:f2};els['#rp_pd']={value:pd};els['#rp_pf']={value:pf};els['#rp_du']={value:du};els['#rp_ac']={checked:ac};for(let n=1;n<=7;n++)els['#rp_j'+n]={checked:j.includes(n)}};
 return{ctx,ups,upd,form,click,els}}
(async()=>{
 let t=mk();const h=t.ctx.SUB.rdvq();
 ok('sans planning : valeurs annoncées préremplies (lundi-vendredi, 08:00-17:00, pause 12:30-14:00, 30 min)',/id="rp_d" type="time" value="08:00"/.test(h)&&/id="rp_f" type="time" value="17:00"/.test(h)&&/id="rp_pd" type="time" value="12:30"/.test(h)&&/id="rp_pf" type="time" value="14:00"/.test(h)&&(h.match(/id="rp_j[1-5]"[^>]*checked/g)||[]).length==5&&!/id="rp_j6"[^>]*checked/.test(h)&&/Non activé/.test(h));
 ok('sans planning : case « proposer » cochée par défaut',/id="rp_ac"[^>]*checked/.test(h));
 t=mk({rdp:[{actif:true,jours:[1,2,3],heure_debut:'09:00:00',heure_fin:'16:00:00',pause_debut:null,pause_fin:null,duree_min:45}]});const h2=t.ctx.SUB.rdvq();
 ok('planning existant : valeurs lues, pause vide respectée',/id="rp_d" type="time" value="09:00"/.test(h2)&&/id="rp_pd" type="time" value=""/.test(h2)&&/Actif/.test(h2)&&(h2.match(/id="rp_j[1-7]"[^>]*checked/g)||[]).length==3);
 // enregistrement valide
 t=mk();t.form({});await t.click('rqplan');
 const u=t.ups[0];
 ok('enregistrement : upsert rdv_planning pour la commune de la session (S.cid), jours/heures/pause/durée',u&&u[0]=='rdv_planning'&&u[1].commune_id=='cid1'&&JSON.stringify(u[1].jours)=='[1,2,3,4,5]'&&u[1].heure_debut=='08:00'&&u[1].pause_debut=='12:30'&&u[1].duree_min==30&&u[1].actif===true&&u[2].onConflict=='commune_id'&&/enregistrés/.test(t.ctx.S.err));
 // validations
 const bad=[['aucun jour',{j:[]},/au moins un jour/],['fermeture avant ouverture',{d:'17:00',f2:'08:00'},/après l’ouverture/],['pause incomplète',{pf:''},/Pause/],['pause hors horaires',{pd:'07:00'},/Pause/],['pause inversée',{pd:'14:00',pf:'12:30'},/Pause/],['durée absurde',{du:'5'},/durée/],['créneau plus long que la journée',{d:'08:00',f2:'08:20',pd:'',pf:'',du:'30'},/durée/]];
 for(const [n,fv,re] of bad){t=mk();t.form(fv);await t.click('rqplan');ok('refus : '+n,t.ups.length==0&&re.test(t.ctx.S.err))}
 t=mk();t.form({pd:'',pf:''});await t.click('rqplan');ok('pause vide des deux côtés acceptée (pause_debut null)',t.ups.length==1&&t.ups[0][1].pause_debut===null&&t.ups[0][1].pause_fin===null);
 // confirmation : créneau déjà confirmé (index unique 23505)
 const R={id:'r1',numero:'RDV-1',nom:'A B',service:'maire',statut:'demandee',date_souhaitee:'2026-11-20',heure_souhaitee:'09:00:00',motif:'Motif'};
 t=mk({rdq:[R],updErr:{code:'23505',message:'duplicate key value violates unique constraint "rdv_creneau_uq"'}});
 const hp=t.ctx.SUB.rdvq();ok('panneau d’un rendez-vous : heure souhaitée affichée et préremplie',/à 09:00/.test(hp)&&/id="rq_h" type="time" value="09:00"/.test(hp));
 t.els['#rq_d']={value:'2026-11-20'};t.els['#rq_h']={value:'09:00'};t.els['#rq_r']={value:''};await t.click('rqok');
 ok('confirmation d’un créneau déjà pris : message clair (pas d’erreur SQL brute)',/déjà confirmé pour ce service/.test(t.ctx.S.err)&&!/duplicate/.test(t.ctx.S.err));
 console.log(f?'ECHECS: '+f:'TOUS OK');process.exit(f?1:0)})();
