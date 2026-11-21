/* Espace « admin municipal » (admin_mairie) : périmètre limité à SA mairie.
   Lecture (résumé, utilisateurs, journal) + identité. Garde serveur : public._garde_am (migration 20261121120000).
   Aucun accès aux sauvegardes, à la maintenance, aux modules, à la sécurité globale ni à la gestion des comptes. */
const amOn=()=>S.pr==="admin_mairie"&&!S.sa;
const AMNAV=[["am_dash","Tableau de bord","home"],["am_users","Utilisateurs de la mairie","users"],["am_params","Paramètres de la mairie","gear"],["am_audit","Journal d’audit","doc"]];
const AMD={uid:null,ok:false,busy:false,st:{},us:[],au:[],q:"",aq:"",err:""};
const amRpc=async f=>{const r=await sb.rpc(f,{p_commune:String(S.cid)});if(r.error)throw new Error(r.error.message);return r.data};
async function amData(){if(AMD.busy)return;AMD.busy=true;
 try{const r=await Promise.allSettled([amRpc("am_resume"),amRpc("am_utilisateurs"),amRpc("am_journal")]);
  AMD.st=(r[0].value)||{};AMD.us=(r[1].value)||[];AMD.au=(r[2].value)||[];
  AMD.err=r.some(x=>x.status!=="fulfilled")?"Certaines données n’ont pas pu être chargées. Actualisez la page.":""}
 finally{AMD.ok=true;AMD.busy=false;render()}}
const amReady=()=>{if(AMD.uid!==S.uid){Object.assign(AMD,{uid:S.uid,ok:false,busy:false,st:{},us:[],au:[],q:"",aq:"",err:""})}
 if(!AMD.ok&&!AMD.busy)amData();return AMD.ok};
const amLoading=t=>page(t,emp("Chargement…"));
const amDate=v=>{try{return v?new Date(v).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"}):"jamais"}catch(e){return "—"}};
const AMVOL={demandes:"Demandes citoyennes",courrier:"Courriers",deliberations:"Délibérations",actes:"Actes",projets:"Projets",publications:"Publications",rdv:"Rendez-vous",reunions:"Réunions"};
Object.assign(V,{
am_dash:()=>{if(!amReady())return amLoading("Tableau de bord");const s=AMD.st||{},v=s.volumes||{},
 tiles=[["am_users","Utilisateurs","users","k1","Comptes de la mairie"],["am_params","Paramètres","gear","k2","Identité et coordonnées"],["administration","Administration","brief","k3","Organigramme, droits, services"],["am_audit","Journal d’audit","doc","k4","Activité récente"]];
 return page("Tableau de bord",`${AMD.err?`<div class="al" role="alert">${esc(AMD.err)}</div>`:""}<div class="kp">${kp("k1","users","Utilisateurs actifs",s.users_actifs??0,(s.users_total!=null?s.users_total+" au total":""))}${Object.keys(AMVOL).filter(k=>k in v).slice(0,4).map((k,i)=>kp("k"+(i+2),"doc",AMVOL[k],v[k])).join("")}</div>
 ${pn("Accès rapides","gear",`<div class="ecg">${tiles.map(x=>`<button class="ec ${x[3]}" data-a="go" data-v="${x[0]}">${ic(x[2],28)}<b>${x[1]}</b><span>${x[4]}</span></button>`).join("")}</div>`)}`)},
am_users:()=>{if(!amReady())return amLoading("Utilisateurs de la mairie");const q=(AMD.q||"").toLowerCase(),
 l=AMD.us.filter(u=>!q||((u.nom||"")+" "+(u.email||"")+" "+(u.service||"")).toLowerCase().includes(q));
 return page("Utilisateurs de la mairie",pn("Comptes","users",frm(inp("am_q","Rechercher","search",AMD.q||"","Nom, e-mail ou service"))+`<div class="sa-ac"><button class="bt" data-am="uf">Filtrer</button></div>`+
 (l.map(u=>rw(`<b>${esc(u.nom||u.email)}</b><div class="mut">${esc(u.email||"")}${u.service?" · "+esc(u.service):""}</div><div class="mut">Dernière connexion : ${amDate(u.last_sign_in_at)}</div>`,`<span class="tg bl" style="cursor:default">${esc(RL[u.role]||u.role||"")}</span> <span class="tg ${u.actif===false?"rd":"ok"}" style="cursor:default">${u.actif===false?"Désactivé":"Actif"}</span>`)).join("")||emp("Aucun compte ne correspond."))+
 `<p class="mut">${l.length} compte(s). Consultation seule : l’attribution des postes et des droits se fait dans Administration › Organigramme et droits ; la création et l’activation des comptes sont assurées par la plateforme.</p>`))},
am_params:()=>{const I=S.ind||{};return page("Paramètres de la mairie",pn("Identité de la mairie","brief",frm(inp("am_nom","Nom de la commune","text",S.co||"")+inp("am_sl","Slogan","text",I.slogan||"")+inp("am_dv","Devise","text",I.devise||""))+"")+
 pn("Coordonnées","mail",frm(inp("am_ad","Adresse","text",I.contact_adresse||"")+inp("am_tl","Téléphone","tel",I.contact_tel||"")+inp("am_em","E-mail de contact","email",I.contact_email||"")+inp("am_sw","Site web","url",I.site_web||"","https://")+inp("am_ho","Horaires d’ouverture","text",I.horaires||""))+`<div class="sa-ac"><button class="bt" data-am="save">Enregistrer</button></div>`))},
am_audit:()=>{if(!amReady())return amLoading("Journal d’audit");const q=(AMD.aq||"").toLowerCase(),
 l=AMD.au.filter(a=>!q||((a.email||"")+" "+(a.cible||"")+" "+((typeof ALB!=="undefined"&&ALB[a.action])||a.action)).toLowerCase().includes(q));
 return page("Journal d’audit",pn("Événements","doc",frm(inp("am_aq","Rechercher","search",AMD.aq||"","Utilisateur ou cible"))+`<div class="sa-ac"><button class="bt" data-am="af">Filtrer</button></div><p class="mut">${l.length} événement(s) affiché(s), 200 plus récents.</p>`+
 (l.map(a=>rw(`<b>${esc((typeof ALB!=="undefined"&&ALB[a.action])||a.action)}</b><div class="mut">${esc(a.email||"système")}${a.cible?" · "+esc(a.cible):""}</div>`,`<span class="mut">${amDate(a.created_at)}</span>`)).join("")||emp("Aucun événement."))))}
});
document.addEventListener("click",async e=>{const t=e.target.closest("[data-am]");if(!t||!amOn())return;const g=id=>(($("#"+id)||{}).value||"").trim();
 try{const a=t.dataset.am;
  if(a==="uf"){AMD.q=g("am_q");render()}
  else if(a==="af"){AMD.aq=g("am_aq");render()}
  else if(a==="save"){
   const r=await sb.rpc("sa_enregistrer_identite",{p_commune:String(S.cid),p_data:{nom:g("am_nom"),slogan:g("am_sl"),devise:g("am_dv"),contact_adresse:g("am_ad"),contact_tel:g("am_tl"),contact_email:g("am_em"),site_web:g("am_sw"),horaires:g("am_ho")}});
   if(r.error)throw new Error(r.error.message);
   await lcm();const c=(S.cs||[]).find(x=>x.id==S.cid);if(c)S.co=c.nom;await load();S.err="Identité et coordonnées enregistrées.";render()}
 }catch(x){S.err=x.message||"Opération impossible.";render()}});
