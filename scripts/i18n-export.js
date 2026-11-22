// Exporte les textes de l'interface citoyenne (TX.fr) vers un CSV à faire traduire/valider : node scripts/i18n-export.js > docs/i18n/textes_a_valider.csv
const fs=require("fs"),vm=require("vm"),path=require("path");
const src=fs.readFileSync(path.join(__dirname,"..","js","citoyen.js"),"utf8");
const m=src.match(/const TX\s*=\s*\{\s*fr:\s*(\{[\s\S]*?\n?\s*\})\s*\};/);if(!m){console.error("TX.fr introuvable");process.exit(1)}
const fr=vm.runInNewContext("("+m[1]+")");const q=v=>'"'+String(v).replace(/"/g,'""')+'"';
console.log(["cle","francais","wolof","sereer","longueur_max","statut_validation","validateur","date"].join(","));
for(const [k,v] of Object.entries(fr))console.log([k,q(v),"","",Math.ceil(v.length*1.4),"a_valider","",""].join(","));
