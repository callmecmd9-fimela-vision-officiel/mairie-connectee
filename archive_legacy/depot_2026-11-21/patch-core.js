// Usage : node patch-core.js chemin/vers/core.js
// Rend load() tolérant : une table en erreur n'efface plus tout l'écran.
const fs = require("fs");
const f = process.argv[2] || "core.js";
let s = fs.readFileSync(f, "utf8");
const OLD = 'const er=R.find(x=>x.error);if(er){S.err="Chargement impossible : "+er.error.message+". Reconnectez-vous si le probl\\u00e8me persiste.";return}';
const NEW = 'const er=R.find(x=>x.error),bad=ks.filter((k,i)=>R[i].error);if(er&&bad.length==ks.length){S.err="Chargement impossible : "+er.error.message+". Reconnectez-vous si le probl\\u00e8me persiste.";return}if(er){S.err="Chargement partiel ("+bad.join(", ")+") : "+er.error.message;bad.forEach(k=>{R[ks.indexOf(k)]={data:null}})}';
if (s.includes("Chargement partiel (\"+bad")) { console.log("Déjà appliqué."); process.exit(0); }
if (s.split(OLD).length !== 2) { console.error("Texte attendu introuvable (ou en double) : fichier NON modifié."); process.exit(1); }
fs.writeFileSync(f + ".bak", s);
fs.writeFileSync(f, s.replace(OLD, () => NEW));
console.log("OK : core.js corrigé (sauvegarde : " + f + ".bak)");
