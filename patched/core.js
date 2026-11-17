const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>Number(n||0).toLocaleString("fr-FR"),
fm=n=>{n=+n||0;return n>=1e9?(n/1e9).toFixed(1).replace(".",",")+" Md":n>=1e6?Math.round(n/1e6)+" M":n>=1e3?Math.round(n/1e3)+" k":String(n)},
nm=v=>{const p=Math.pow(10,Math.floor(Math.log10(v))),m=v/p;return(m<=1?1:m<=2?2:m<=5?5:10)*p},
fd=d=>new Date(d+"T00:00").toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"}),
fdt=t=>new Date(t).toLocaleString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}),
dt=()=>{const n=new Date();return n.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})+"<br>"+n.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})};
const T=new Date().toISOString().slice(0,10),Y=new Date().getFullYear();
const URLS="https://aiqegpijisspankpkwfj.supabase.co",KEY="sb_publishable__Zc0adl_eD_PyMkaR5ACzA_-_yjwmbI",TS_KEY="0x4AAAAAAF7OVwUkBsAvSANV";
const sb=supabase.createClient(URLS,KEY,{auth:{storageKey:"mc-cab"}});
window.tsReady=()=>{if(!S.role)render()};
const MS=["\u00c0 r\u00e9pondre","\u00c0 signer","Urgent","Suivi","Class\u00e9"],MC=["a_repondre","a_signer","urgent","suivi","classe"],RS=["Nouvelle","Orient\u00e9e","En traitement","En validation","Trait\u00e9e","R\u00e9orient\u00e9e","En attente de pi\u00e8ces","Rejet\u00e9e","Cl\u00f4tur\u00e9e","Accept\u00e9e","Pr\u00eat \u00e0 retirer"],RC=["nouvelle","orientee","en_cours","a_valider","traitee","redirigee","en_attente_pieces","rejetee","cloturee","acceptee","pret_a_retirer"],PS=["brouillon","valider","planifie","publie"],PL=["Brouillon","\u00c0 valider","Planifi\u00e9","Publi\u00e9"];
const PST=["programme","en_cours","en_attente","en_retard","termine","suspendu"],PSL={programme:"Programm\u00e9s",en_cours:"En cours",en_attente:"En attente",en_retard:"En retard",termine:"Termin\u00e9s",suspendu:"Suspendus"},PSS={programme:"Programm\u00e9",en_cours:"En cours",en_attente:"En attente",en_retard:"En retard",termine:"Termin\u00e9",suspendu:"Suspendu"},PCOL={termine:"#16A34A",en_cours:"#2563EB",programme:"#F59E0B",en_attente:"#94A3B8",en_retard:"#DC2626",suspendu:"#6B7280"},TC2={termine:"ok",en_cours:"bl",programme:"or",en_attente:"or",en_retard:"rd",suspendu:""};
const CAT=["\u00c9ducation","Sant\u00e9","Infrastructures","Autres"],CCOL={"\u00c9ducation":"#2563EB","Sant\u00e9":"#16A34A","Infrastructures":"#F59E0B","Autres":"#8B5CF6"};
const MOIS=["Jan","F\u00e9v","Mar","Avr","Mai","Juin","Juil","Ao\u00fbt","Sep","Oct","Nov","D\u00e9c"];
const P=["Au rythme des pirogues, {c} s\u2019\u00e9veille\u2026","{c}, terre de sel et de lumi\u00e8re, o\u00f9 chaque mar\u00e9e raconte nos racines.","Entre mangrove et horizon, {c} tisse son avenir avec patience et fiert\u00e9.","Le soleil se couche sur {c} ; demain, nous b\u00e2tirons encore.","Chaque main tendue \u00e0 {c} est une promesse tenue."];
const E0={rem:[],pai:[],pli:[],per:[],cg:[],mar:[],pat:[],cd:[],com:[],dec:[],rdv:[],mail:[],req:[],posts:[],med:[],proj:[],fin:[],del:[],adj:[],dl:[],ru:[],rpa:[],ins:[],rap:[],ms:[],nt:[],an:[],act:[],dos:[],sv:[],cn:[],se:[],pr:[],dc:[],op:[],cr:[]};
let S={cs:[],sa:false,co:"",role:null,pr:"",view:"dash",f:"in",tab:{cab:"agenda",com:"pub"},dd:null,dh:[],dp:[],sel:{},fl:{},dch:null,adjv:null,ed:{},hi:[],hk:null,rd:null,ri:null,rr:null,mo:null,au:{},mine:null,pre:null,menu:false,err:"",tok:"",cid:null,uid:null,email:"",db:E0,ind:{},urls:{},ia:[],map:null};
const D=()=>{for(const k in E0)if(!S.db[k])S.db[k]=[];return S.db},slug=()=>(S.cs.find(c=>c.nom==S.co)||{slug:S.co.toLowerCase()}).slug;
const run=async p=>{const r=await p;if(r.error)S.err=r.error.message;return r};
const AL=["maire","adjoint","cabinet","secretariat","finances","rh","etat_civil","technique","agent"];
const RL={maire:"Maire",adjoint:"Adjoint",cabinet:"Cabinet",secretariat:"Secr\u00e9tariat",finances:"Finances",rh:"RH",etat_civil:"\u00c9tat civil",technique:"Technique",agent:"Agent",super_admin:"Super-admin",citoyen:"Citoyen"};
const RLH={maire:"Monsieur le Maire",adjoint:"Monsieur l\u2019Adjoint",cabinet:"Cabinet du Maire",secretariat:"Secr\u00e9tariat",finances:"Service des finances",rh:"Service RH",etat_civil:"Service de l\u2019\u00e9tat civil",technique:"Service technique",agent:"Agent municipal",super_admin:"Administrateur"};
const RP={sdash:["maire"],cin:["maire"],cout:["maire"],actes:["maire"],sconseil:["maire"],sinstr:["maire"],serv:["maire"],sreun:["maire"],dossiers:["maire"],archives:["maire"],srap:["maire"],snotif:["maire"],adjdash:["maire"],adjlist:["maire"],deleg:["maire"],projA:["maire"],reun:["maire"],instr:["maire"],rapp:["maire"],msg:["maire"],docs:["maire"],notif:["maire"],cabinet:["maire","cabinet","secretariat"],budget:["maire","finances"],civil:["maire","adjoint","cabinet","secretariat","agent","etat_civil"],personnel:["maire","rh"],params:["maire"],projets:["maire","adjoint","technique","cabinet"],territoire:["maire","adjoint","technique","cabinet"],conseil:["maire","adjoint","cabinet","secretariat"],citoyens:["maire","adjoint","cabinet","secretariat","agent","etat_civil","technique","finances","rh"],pub:["maire","cabinet","secretariat"],med:["maire","cabinet","secretariat"],rapports:["maire","adjoint","cabinet","finances"]};
const can=k=>S.sa||(typeof orgCan=="function"&&orgCan(k))||(k=="cabinet"&&(S.mod||{}).cabinet===false?false:S.pu&&k in S.pu?S.pu[k]:S.pm&&(S.pr+"."+k) in S.pm?S.pm[S.pr+"."+k]:(RP[k]||[]).includes(S.pr));
const SP0={adjoints:{v:"s_adj",n:"Adjoints au Maire",i:"users",c:"k4",d:"D\u00e9l\u00e9gations, instructions, rapports",subs:[["adjdash","Tableau de bord"],["adjlist","Adjoints"],["deleg","D\u00e9l\u00e9gations"],["projA","Projets suivis"],["reun","R\u00e9unions"],["instr","Instructions"],["rapp","Rapports re\u00e7us"],["msg","Messagerie"],["docs","Documents"],["notif","Notifications"]]},secretariat:{v:"s_sec",n:"Secr\u00e9tariat municipal",i:"mail",c:"k2",d:"Courrier, actes, conseil, archives",subs:[["sdash","Tableau de bord"],["cin","Courrier entrant"],["cout","Courrier sortant"],["actes","Actes"],["sconseil","Conseil municipal"],["sinstr","Instructions"],["serv","Services"],["sreun","R\u00e9unions"],["dossiers","Dossiers"],["archives","Archives"],["srap","Rapports"],["snotif","Notifications"]]},finances:{v:"s_finances",n:"Finances",i:"coins",c:"k1",d:"Budget, recettes, d\u00e9penses",subs:[["budget","Budget et recettes"]]},
administration:{v:"s_admin",n:"Administration",i:"brief",c:"k2",d:"\u00c9tat civil, personnel, param\u00e8tres",subs:[["civil","\u00c9tat civil"],["personnel","Personnel"],["params","Param\u00e8tres"]]},
developpement:{v:"s_dev",n:"D\u00e9veloppement",i:"tools",c:"k3",d:"Projets, travaux, territoire",subs:[["projets","Projets et travaux"],["territoire","Territoire et foncier"]]},
conseil:{v:"s_conseil",n:"Conseil municipal",i:"users",c:"k4",d:"Sessions, d\u00e9lib\u00e9rations",subs:[["conseil","D\u00e9lib\u00e9rations"]]},
citoyens:{v:"s_citoyens",n:"Citoyens",i:"mail",c:"k5",d:"Demandes, communication, m\u00e9dias",subs:[["citoyens","Demandes"],["pub","Publications"],["med","M\u00e9diath\u00e8que"]]},
pilotage:{v:"s_pilot",n:"Pilotage",i:"chart",c:"k6",d:"Rapports, statistiques",subs:[["rapports","Rapports et statistiques"]]}};
const SP={
maire:{v:"s_maire",n:"Espace du Maire",i:"user",c:"k6",d:"Agenda, validations, d\u00e9cisions",subs:[["mdash","Mon tableau de bord"],["agenda","Agenda"],["aud","Audiences"],["reun","R\u00e9unions et activit\u00e9s"],["valid","\u00c0 valider et \u00e0 signer"],["instr","Instructions aux adjoints"],["rapp","Rapports des adjoints"],["msg","Messagerie"],["notif","Notifications"],["decis","Mes d\u00e9cisions"]]},
finances:{v:"s_finances",n:"Finances",i:"coins",c:"k1",d:"Budget, march\u00e9s, rapports",subs:[["budget","Budget et recettes"],["marches","March\u00e9s publics"],["rapb","Rapports budg\u00e9taires"],["paie","Paie du personnel"],["remun","R\u00e9mun\u00e9rations"]]},
administration:{v:"s_admin",n:"Administration",i:"brief",c:"k2",d:"Courrier, actes, personnel, patrimoine",subs:[["civil","\u00c9tat civil"],["personnel","Personnel"],["conges","Cong\u00e9s et absences"],["cin","Courrier entrant"],["cout","Courrier sortant"],["actes","Actes administratifs"],["patrimoine","Patrimoine"],["serv","Services"],["adjlist","Adjoints"],["deleg","D\u00e9l\u00e9gations"],["dossiers","Dossiers"],["archives","Archives"],["params","Param\u00e8tres"]]},
developpement:{v:"s_dev",n:"D\u00e9veloppement communal",i:"tools",c:"k3",d:"Projets, travaux, territoire",subs:[["projets","Projets et travaux"],["projA","Suivi par les adjoints"],["devdom","Par domaine"],["territoire","Territoire et foncier"]]},
conseil:{v:"s_conseil",n:"Conseil municipal",i:"users",c:"k4",d:"Sessions, commissions, d\u00e9lib\u00e9rations",subs:[["sconseil","Sessions et d\u00e9lib\u00e9rations"],["conseil","D\u00e9lib\u00e9rations"],["commissions","Commissions"]]},
citoyens:{v:"s_citoyens",n:"Citoyens",i:"mail",c:"k5",d:"Demandes, audiences, communication",subs:[["citoyens","Demandes"],["audc","Audiences demand\u00e9es"],["recl","R\u00e9clamations"],["aides","Aides sociales"],["pub","Publications"],["med","M\u00e9diath\u00e8que"]]},
pilotage:{v:"s_pilot",n:"Pilotage et statistiques",i:"chart",c:"k6",d:"Rapports, indicateurs, d\u00e9cisions",subs:[["rapports","Rapports et statistiques"],["indic","Indicateurs communaux"],["svcsuivi","Suivi des services"],["evalproj","\u00c9valuation des projets"],["decis","Historique des d\u00e9cisions"]]},
adjoints:Object.assign({},SP0.adjoints,{h:1}),secretariat:Object.assign({},SP0.secretariat,{h:1})};
const espAll=()=>Object.entries(SP).filter(([k,x])=>(S.mod||{})[k]!==false&&x.subs.some(y=>can(y[0]))).map(e=>e[1]);
const espV=()=>espAll().filter(x=>!x.h);
const okv=v=>S.sa?SANAV.some(n=>n[0]==v):isA()?ANAV.some(n=>n[0]==v):isS()?SNAV.some(n=>n[0]==v):v=="dash"||(v=="cabinet"?can("cabinet"):espAll().some(x=>x.v==v));
const cmp=(a,b)=>(a.d+(a.h||"")).localeCompare(b.d+(b.h||""));
const IC={home:'<path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6z"/>',users:'<circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M2 20c0-4 3-6 7-6s7 2 7 6zM17 14c3 0 5 1.5 5 5h-4"/>',coins:'<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" fill="none" stroke="currentColor" stroke-width="2"/>',tools:'<path d="M14 3l7 7-3 3-7-7zM3 21l8-8 3 3-8 8z"/>',brief:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3" fill="none" stroke="currentColor" stroke-width="2"/>',file:'<path d="M6 2h8l5 5v15H6z"/>',map:'<path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.5" fill="#fff"/>',chart:'<path d="M4 20V10h4v10zM10 20V4h4v16zM16 20v-7h4v7z"/>',mega:'<path d="M3 10v4h4l8 5V5L7 10zM18 8c2 1 2 7 0 8"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2l2 3h3l1 3 3 2-1 3 1 3-3 2-1 3h-3l-2 3-2-3H7l-1-3-3-2 1-3-1-3 3-2 1-3h3z" fill="none" stroke="currentColor" stroke-width="2"/>',out:'<path d="M4 3h9v4M4 3v18h9v-4M10 12h11M17 8l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2"/>',bell:'<path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4"/>',check:'<circle cx="12" cy="12" r="10" fill="#16A34A"/><path d="M7 12l3.5 3.5L17 9" fill="none" stroke="#fff" stroke-width="2.5"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2" fill="#2563EB"/><path d="M3 7l9 7 9-7" fill="none" stroke="#fff" stroke-width="2"/>',doc:'<path d="M6 2h8l5 5v15H6z"/><path d="M9 12h7M9 16h7" stroke="#fff" stroke-width="2"/>',alert:'<circle cx="12" cy="12" r="10" fill="#DC2626"/><path d="M12 7v6M12 16v2" stroke="#fff" stroke-width="2.5"/>',info:'<circle cx="12" cy="12" r="10" fill="#2563EB"/><path d="M12 11v6M12 7v2" stroke="#fff" stroke-width="2.5"/>',cal:'<rect x="3" y="5" width="18" height="16" rx="2" fill="#F59E0B"/><path d="M3 10h18M8 3v4M16 3v4" stroke="#fff" stroke-width="2"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="2.5"/>',trend:'<path d="M3 17l6-6 4 4 8-9" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M3 21h18" stroke="currentColor" stroke-width="2"/>',pie:'<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M14 2a8 8 0 0 1 8 8h-8z"/>',shield:'<path d="M12 2l9 3v6c0 5-4 9-9 11C7 20 3 16 3 11V5z" fill="#F2B705" stroke="#fff" stroke-width="1.5"/>'};
const ic=(n,s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${IC[n]||""}</svg>`;
async function lcm(){S.cs=(await sb.from("communes").select("id,slug,nom").order("nom")).data||S.cs}
async function profil(){
const u=(await sb.auth.getUser()).data.user;if(!u){S.err="Connexion impossible : session introuvable. R\u00e9essayez.";return false}Object.keys(SGN).forEach(k=>delete SGN[k]);S.uid=u.id;S.email=u.email||"";
const p=(await sb.from("profiles").select("role,commune_id").eq("id",u.id).maybeSingle()).data;await lcm();
if(!p||!AL.concat("super_admin").includes(p.role)){S.err="Ce compte n\u2019a pas encore d\u2019acc\u00e8s \u00e0 l\u2019espace mairie. Contactez l\u2019administrateur.";await sb.auth.signOut();return false}
const c=S.cs.find(x=>x.id==p.commune_id)||(p.role=="super_admin"?S.cs[0]:null);if(!c){S.err="Aucune commune n\u2019est associ\u00e9e \u00e0 ce compte. Contactez l\u2019administrateur.";await sb.auth.signOut();return false}await loadSys(c.id);if(((S.sys.maintenance||{}).actif&&p.role!="super_admin")||(p.role=="adjoint"&&S.mod.portail_adjoint===false)||(p.role=="secretariat"&&S.mod.portail_secretariat===false)){S.err=(S.sys.maintenance||{}).actif?((S.sys.maintenance||{}).message||"L\u2019application est en maintenance. R\u00e9essayez plus tard."):"Ce module est d\u00e9sactiv\u00e9 par l\u2019administrateur.";await sb.auth.signOut();return false}S.sa=p.role=="super_admin";S.pr=p.role;S.co=c?c.nom:"";S.cid=c?c.id:null;S.role="cab";S.view=p.role=="super_admin"?"sa_dash":p.role=="adjoint"?"a_dash":p.role=="secretariat"?"s_dash":"dash";S.menu=false;LOGIN_AT=Date.now();return true}
const SGN={};
async function sign(bk,paths){const now=Date.now(),k=p=>bk+"|"+p,need=[...new Set(paths)].filter(p=>!(SGN[k(p)]&&SGN[k(p)].t>now));
for(let i=0;i<need.length;i+=100){const r=(await sb.storage.from(bk).createSignedUrls(need.slice(i,i+100),3600)).data||[];r.forEach(x=>{if(x.signedUrl)SGN[k(x.path)]={u:x.signedUrl,t:now+3300000}})}
const o={};paths.forEach(p=>{const c=SGN[k(p)];if(c)o[p]=c.u});return o}
const LQ=t=>sb.from(t).select("*").eq("commune_id",S.cid),DE={ascending:false},AS_=(t,o)=>()=>LQ(t).order(o,DE),SL_=(t,k)=>[()=>sb.from(t).select("*"),r=>{S.db[k]=r||[]}];
const LG={
rdv:[()=>LQ("rdv").order("jour").order("heure"),r=>{S.db.rdv=(r||[]).map(x=>({id:x.id,d:x.jour,h:x.heure.slice(0,5),t:x.titre}))}],
courrier:[AS_("courrier","created_at"),r=>{r=r||[];S.db.cr=r;S.db.mail=r.map(x=>({id:x.id,s:x.sens,f:x.correspondant,o:x.objet,st:MS[MC.indexOf(x.statut)]||CSL[x.statut]||x.statut}))}],
demandes:[AS_("demandes","created_at"),r=>{S.db.req=(r||[]).map(x=>({id:x.id,n:x.numero,t:x.type,w:x.nom,m:x.message,st:RS[RC.indexOf(x.statut)],c:x.created_at,o:x.objet,ct:x.contact,sv:x.service,rp:x.reponse,pc:x.pieces||[]}))}],
publications:[()=>LQ("publications").order("jour"),r=>{S.db.posts=(r||[]).map(x=>({id:x.id,r:x.reseau,d:x.jour,t:x.texte,st:x.statut,m:x.media_id}))}],
medias:[AS_("medias","created_at"),r=>{S.db.med=(r||[]).map(x=>({id:x.id,ty:x.type,t:x.titre,p:x.chemin,u:x.url,src:""}))}],
projets:[AS_("projets","created_at"),r=>{S.db.proj=r||[]}],
finances:[()=>LQ("finances").eq("annee",Y).order("mois"),r=>{S.db.fin=r||[]}],
deliberations:[AS_("deliberations","jour"),r=>{S.db.del=r||[]}],
indicateurs:[()=>sb.from("indicateurs").select("*").eq("commune_id",S.cid).maybeSingle(),r=>{S.ind=r||{}}],
adjoints:[()=>LQ("adjoints").order("rang"),r=>{S.db.adj=r||[]}],
delegations:[AS_("delegations","created_at"),r=>{S.db.dl=r||[]}],
reunions:[()=>LQ("reunions").order("jour").order("heure"),r=>{S.db.ru=r||[]}],
reunion_participants:SL_("reunion_participants","rpa"),
instructions:[AS_("instructions","created_at"),r=>{S.db.ins=r||[]}],
rapports:[AS_("rapports","created_at"),r=>{S.db.rap=r||[]}],
messages:[()=>sb.from("messages").select("*").order("created_at",DE).limit(100),r=>{S.db.ms=r||[]}],
notifications:[()=>sb.from("notifications").select("*").order("created_at",DE).limit(60),r=>{S.db.nt=r||[]}],
annuaire:[()=>sb.rpc("annuaire"),r=>{S.db.an=r||[]}],
actes:[AS_("actes","created_at"),r=>{S.db.act=r||[]}],
dossiers:[AS_("dossiers","created_at"),r=>{S.db.dos=r||[]}],
services:[()=>LQ("services").order("nom"),r=>{S.db.sv=r||[]}],
conseillers:[()=>LQ("conseillers").order("nom"),r=>{S.db.cn=r||[]}],
sessions_conseil:[AS_("sessions_conseil","jour"),r=>{S.db.se=r||[]}],
session_presences:SL_("session_presences","pr"),
documents:[()=>LQ("documents").order("created_at",DE).limit(500),r=>{S.db.dc=r||[]}],
remunerations:[()=>LQ("remunerations"),r=>{S.db.rem=r||[]}],
paies:[()=>LQ("paies").order("mois",DE),r=>{S.db.pai=r||[]}],
paie_lignes:[()=>LQ("paie_lignes").limit(500),r=>{S.db.pli=r||[]}],
personnel:[()=>LQ("personnel").order("nom"),r=>{S.db.per=r||[]}],
conges:[AS_("conges","date_debut"),r=>{S.db.cg=r||[]}],
conges_droits:[()=>LQ("conges_droits").eq("annee",Y),r=>{S.db.cd=r||[]}],
marches:[AS_("marches","created_at"),r=>{S.db.mar=r||[]}],
patrimoine:[AS_("patrimoine","created_at"),r=>{S.db.pat=r||[]}],
commissions:[()=>LQ("commissions").order("nom"),r=>{S.db.com=r||[]}],
decisions:[AS_("decisions","jour"),r=>{S.db.dec=r||[]}],
ops_historique:[()=>sb.from("ops_historique").select("*").order("created_at",DE).limit(60),r=>{S.db.op=r||[]}]};
/* load() = tout recharger ; load(["projets"]) = seulement ces tables (+ notifications et historique) */
async function load(only){
if(S.role!="cab"||!S.cid)return;
const ks=only?[...new Set(only.concat(["notifications","ops_historique"]))].filter(k=>LG[k]):Object.keys(LG).filter(k=>!["personnel","conges","conges_droits","remunerations","paie_lignes"].includes(k)||["maire","rh"].includes(S.pr)).filter(k=>k!="paies"||["maire","rh","finances"].includes(S.pr));
if(!only&&S.sa)await saLoad();
const R=await Promise.all(ks.map(k=>LG[k][0]()));
const er=R.find(x=>x.error),bad=ks.filter((k,i)=>R[i].error);if(er&&bad.length==ks.length){S.err="Chargement impossible : "+er.error.message+". Reconnectez-vous si le probl\u00e8me persiste.";return}if(er){S.err="Chargement partiel ("+bad.join(", ")+") : "+er.error.message;bad.forEach(k=>{R[ks.indexOf(k)]={data:null}})}
/* PostgREST plafonne à 1000 lignes : page suivante tant que la page est pleine (10 000 max) */
for(let i=0;i<ks.length;i++){const k=ks[i];let d=R[i].data;if(!Array.isArray(d)||d.length<1000||k=="annuaire")continue;
for(let p=1;p<10;p++){const r=await LG[k][0]().order("id").range(p*1000,p*1000+999);if(r.error){S.err="Chargement partiel de "+k+" : "+r.error.message;break}d=d.concat(r.data||[]);if((r.data||[]).length<1000)break;if(p==9)S.err="Liste "+k+" tronquée à 10 000 lignes."}R[i].data=d}
if(S.db===E0)S.db=Object.assign({},E0);
ks.forEach((k,i)=>LG[k][1](R[i].data));
const d=D(),I=S.ind;
S.mine=(d.adj.find(a=>a.user_id==S.uid)||{}).id||null;
const mp=d.med.filter(x=>x.ty=="photo").map(x=>x.p).concat([I.blason,I.photo_maire,I.bandeau].filter(Boolean)),
ap=[].concat(d.adj.map(a=>a.photo),d.dl.map(x=>x.acte),d.ins.flatMap(x=>x.pieces||[]),d.rap.flatMap(x=>(x.photos||[]).concat(x.docs||[])),d.proj.flatMap(x=>(x.photos||[]).concat(x.docs||[])),d.ru.flatMap(x=>x.docs||[])).filter(Boolean);
const U=await Promise.all([sign("medias",mp),sign("adjoints",ap)]);S.urls=U[0];S.au=U[1];
d.med.forEach(m=>{m.src=S.urls[m.p]||""})}
const comp=async(f,mx=1920,tg=450000)=>{const im=await createImageBitmap(f);let k=Math.min(1,mx/Math.max(im.width,im.height)),q=.82,b;
for(let n=0;n<6;n++){const c=document.createElement("canvas");c.width=Math.round(im.widt
