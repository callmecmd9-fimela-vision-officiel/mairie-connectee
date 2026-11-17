// Usage : node patch-org.js dossier_racine   (contient js/core.js et mairie.html) — idempotent, sauvegardes .bak
const fs=require("fs"),r=process.argv[2]||".";
const ed=(f,o,n,tag)=>{let s=fs.readFileSync(f,"utf8");if(s.includes(tag))return console.log("Déjà appliqué :",f);if(s.split(o).length!==2){console.error("Texte attendu introuvable ou en double :",f);process.exit(1)}fs.writeFileSync(f+".bak",s);fs.writeFileSync(f,s.replace(o,()=>n));console.log("OK :",f)};
ed(r+"/js/core.js","const can=k=>S.sa||(k==","const can=k=>S.sa||(typeof orgCan==\"function\"&&orgCan(k))||(k==","orgCan(k)");
ed(r+"/mairie.html",'<script src="/js/actions.js?v=1794657023">','<script src="/js/org.js?v=20261125"></script><script src="/js/actions.js?v=1794657023">',"/js/org.js");
