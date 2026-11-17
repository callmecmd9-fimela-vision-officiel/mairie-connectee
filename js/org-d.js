/* Lot D (additif, après org.js) : droits reçus par délégation dans les menus, chargement des données sensibles
   pour les postes habilités, traçabilité des consultations (org_tracer), écrans « Mon poste », « Mes délégations »,
   « Consultations sensibles ». Affichage seulement : le serveur (RLS, org_droit) reste l'autorité. */
const ORGD={tr:{},ac:null,al:0};
const ORGDK={personnel:["personnel"],conges:["conges","conges_droits"],remun:["remunerations"],paie:["paies","paie_lignes"]};
/* délégations reçues et actives (consultation) : s'ajoutent aux droits du poste pour les menus */
async function orgDeleg(){if(!S.uid||S.sa||S.pr=="maire")return;try{const n=Date.now(),r=await sb.from("org_delegations_droits").select("a_user,module,action,debut,fin,revoque_le").eq("a_user",S.uid).limit(200);if(r.error)return;
const a=(r.data||[]).filter(x=>x.a_user==S.uid&&!x.revoque_le&&new Date(x.debut)<=n&&new Date(x.fin)>=n);
const s=S.orgMy||new Set();a.forEach(x=>s.add(x.action+"|"+x.module));if(s.size){s.add("consulter|monposte");s.add("consulter|mydeleg");S.orgMy=s}}catch(e){}}
/* tables sensibles que load() ne charge que pour maire/RH : chargées aussi pour un poste habilité (la RLS filtre) */
async function orgDx(){const m=S.orgMy;if(!m||S.sa||S.pr=="maire")return;const had=k=>["personnel","conges","conges_droits","remunerations","paie_lignes"].includes(k)?S.pr=="rh":k=="paies"?["rh","finances"].includes(S.pr):true,ks=[];
Object.keys(ORGDK).forEach(mo=>{if(m.has("consulter|"+mo)&&(S.mod||{})[mo]!==false&&!(S.pu&&mo in S.pu))ORGDK[mo].forEach(k=>{if(LG[k]&&!had(k)&&!ks.includes(k))ks.push(k)})});
if(!ks.length)return;try{const R=await Promise.all(ks.map(k=>LG[k][0]()));if(S.db===E0)S.db=Object.assign({},E0);R.forEach((r,i)=>{if(r&&!r.error)LG[ks[i]][1](r.data)})}catch(e){}}
const _orgdLoad0=load;load=async function(o){await _orgdLoad0(o);if(!o){await orgDeleg();await orgDx()}};
/* traçabilité : une ligne par écran sensible ouvert (15 min de répit par utilisateur et écran) */
function orgdTr(k){if(S.sa||!S.uid||!can(k))return;const i=S.uid+k,n=Date.now();if(ORGD.tr[i]&&n-ORGD.tr[i]<9e5)return;ORGD.tr[i]=n;try{Promise.resolve(sb.rpc("org_tracer",{p_module:k,p_cible:null})).catch(()=>{})}catch(e){}}
["personnel","conges","paie","remun","marches"].forEach(k=>{const f=SUB[k];if(typeof f=="function")SUB[k]=function(){orgdTr(k);return f.apply(this,arguments)}});
const orgdWait=t=>{if(!ORG.ok&&!ORG.ld){orgLoad().then(()=>render())}return ORG.ok==1?"":ORG.ok==-1?pn(t,"alert",emp("Chargement impossible.")+`<button class="bo" data-m="orgrf">Actualiser</button>`):emp("Chargement…")};
const orgdMod=k=>(ORGM.find(m=>m[0]==k)||[0,k])[1];
const orgdPoste=()=>{const w=orgdWait("Mon poste");if(w)return w;const t=T,now=Date.now(),
mine=ORG.A.filter(a=>a.user_id==S.uid&&a.actif&&a.debut<=t&&(!a.fin||a.fin>=t)),ps=mine.map(a=>ORG.P.find(p=>p.code==a.poste_code)).filter(Boolean),rc=[...new Set(ps.map(p=>p.role_code))],
mods=ORGM.filter(m=>ORG.DR.some(x=>rc.includes(x.role_code)&&x.module==m[0]&&x.action=="consulter")),
dl=ORG.G.filter(g=>g.a_user==S.uid&&!g.revoque_le&&new Date(g.debut)<=now&&new Date(g.fin)>=now),
sv=[...new Set(ps.map(p=>p.service_code).filter(Boolean))].filter(c=>SVO.some(x=>x[0]==c)),
n=D().req.filter(r=>sv.includes(r.sv)&&[RS[0],RS[1],RS[2]].includes(r.st)).length;
return `<div class="kp">${kp("k4","user","Mes postes",ps.length)}${kp("k2","brief","Droits reçus par délégation",dl.length)}${sv.length?kp("k5","mail","Demandes à traiter (mon service)",n):""}</div>`+
pn("Mes postes","user",ps.map(p=>rw(`<b>${esc(p.nom)}</b><div class="mut" style="font-size:13px">${esc(orgRn(p.role_code))}${p.service_code?" · "+esc(svn(p.service_code)):""}</div>`,"")).join("")||emp("Aucune affectation en cours."))+
pn("Mes écrans","tools",mods.map(m=>{const sp=Object.entries(SP).find(e=>e[1].subs.some(s=>s[0]==m[0]));return rw(`<b>${esc(m[1])}</b>`,sp&&can(m[0])?act2(gb(sp[0],m[0],"Ouvrir")):"")}).join("")||emp("Aucun écran de consultation lié à votre poste."))+
pn("Délégations reçues","brief",dl.map(g=>rw(`<b>${esc(orgdMod(g.module))}</b> / ${esc(g.action)}<div class="mut" style="font-size:13px">de ${esc(orgUn(g.de_user))} · jusqu’au ${fdd(String(g.fin).slice(0,10))}${g.motif?" · "+esc(g.motif):""}</div>`,"")).join("")||emp("Aucune délégation active."))+
emp("Un écran visible ne donne accès qu’aux données que le serveur autorise.")};
const orgdDel=()=>orgdWait("Mes délégations")||orgDel();
const orgdAcc=()=>{if(ORGD.ac===null&&!ORGD.al){ORGD.al=1;Promise.resolve(sb.from("acces_sensibles").select("user_id,module,cible,created_at").order("created_at",{ascending:false}).limit(200)).then(r=>{ORGD.ac=r.error?-1:(r.data||[]);ORGD.al=0;render()},()=>{ORGD.ac=-1;ORGD.al=0;render()})}
if(ORGD.ac===-1)return pn("Consultations sensibles","alert",emp("Chargement impossible.")+`<button class="bo" data-m="orgdrf">Actualiser</button>`);if(!ORGD.ac)return emp("Chargement…");
const nm=i=>((D().an.find(a=>a.user_id==i)||{}).nom)||"—";
return pn("Consultations sensibles","shield",ORGD.ac.map(x=>rw(`<b>${esc(nm(x.user_id))}</b> a ouvert <b>${esc(orgdMod(x.module))}</b>${x.cible?" · "+esc(x.cible):""}`,`<span class="mut" style="font-size:12px;white-space:nowrap">${fdt(x.created_at)}</span>`)).join("")||emp("Aucune consultation enregistrée."),`<button class="tg" data-m="orgdrf">Actualiser</button>`)+emp("Personnel, congés, paie, rémunérations et marchés : chaque ouverture d’écran est inscrite ici (200 dernières).")};
ORGAC.orgdrf=async()=>{ORGD.ac=null};
SP.administration.subs.push(["monposte","Mon poste"],["mydeleg","Mes délégations"],["acces","Consultations sensibles"]);
RP.monposte=[];RP.mydeleg=[];RP.acces=["maire"];SPL.monposte="Mon poste";SPL.mydeleg="Mes délégations";SPL.acces="Consultations sensibles";
SUB.monposte=orgdPoste;SUB.mydeleg=orgdDel;SUB.acces=orgdAcc;
