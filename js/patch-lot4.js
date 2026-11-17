// node patch-lot4.js js/citoyen.js  (nécessite lot4.block.js à côté)
const fs=require("fs"),f=process.argv[2]||"citoyen.js";let s=fs.readFileSync(f,"utf8");
if(s.includes("const MD={identite"))return console.log("Déjà appliqué.");
const B=fs.readFileSync(__dirname+"/lot4.block.js","utf8");
const R=[
["dmSel=()=>dmL().find(x=>x.id==S.d.dm);","dmSel=()=>(S.dm||[]).find(x=>x.id==S.d.dm);"],
["/* Lot 6 : rendez-vous.",B+"/* Lot 6 : rendez-vous."],
["${x.autorite?`<p><b>Cette démarche relève","${frX(x)?`<p><b>Frais :</b> ${esc(frX(x))}</p>`:\"\"}${x.retrait?`<p><b>Retrait :</b> ${esc(x.retrait)}</p>`:\"\"}<p><b>Service :</b> ${esc(svOf(x))}</p>${x.autorite?`<p><b>Cette démarche relève"],
["S.rec&&ecK()?ecRec():form()","S.rec&&(ecK()||modK())?(ecK()?ecRec():modRec()):form()"],
["const form=()=>{if(ecK())return ecForm();","const form=()=>{if(ecK())return ecForm();if(modK())return modForm();"],
["rec=S.rec&&ecK()","rec=S.rec&&(ecK()||modK())"],
['["ecrev","ecedit","send","copy","back"]','["ecrev","ecedit","mrev","medit","send","copy","back"]'],
['else if(a=="ecrev"){ecRev()}','else if(a=="ecrev"){ecRev()}else if(a=="mrev"){modRev()}else if(a=="medit"){S.rec=false}'],
['S.d={dm:"",fo:t.dataset.r,ec:ECK[t.dataset.r]||""}','S.d={dm:cat4(t.dataset.r),fo:t.dataset.r,ec:ECK[t.dataset.r]||""}']];
for(const [o,n] of R){if(s.split(o).length!==2){console.error("Introuvable/doublon :",o.slice(0,50));process.exit(1)}s=s.replace(o,()=>n)}
fs.writeFileSync(f+".bak",fs.readFileSync(f));fs.writeFileSync(f,s);console.log("OK lot 4");
