// Usage : node patch-orgd.js dossier_racine (contient mairie.html) — idempotent, sauvegarde .bak
const fs=require("fs"),r=process.argv[2]||".",f=r+"/mairie.html",o='<script src="/js/org.js?v=20261125"></script>',n=o+'<script src="/js/org-d.js?v=20261127"></script>';
let s=fs.readFileSync(f,"utf8");if(s.includes("/js/org-d.js"))return console.log("Déjà appliqué :",f);
if(s.split(o).length!==2){console.error("Balise org.js introuvable ou en double (appliquer patch-org.js d'abord) :",f);process.exit(1)}
fs.writeFileSync(f+".bak",s);fs.writeFileSync(f,s.replace(o,()=>n));console.log("OK :",f);
