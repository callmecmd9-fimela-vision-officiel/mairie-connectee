// « Mes Taxes » : affichage, échappement, avis, quittance, isolation par commune. node tests/citoyen-taxes.test.js
const vm=require('vm'),fs=require('fs'),path=require('path');let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
const src=fs.readFileSync(path.join(__dirname,'..','js','citoyen.js'),'utf8');
const bloc=src.slice(src.indexOf('async function loadTaxes'),src.indexOf('async function choose('));
const rows=[{id:'r1',commune_slug:'fimela',libelle:'<img src=x onerror=1>',annee:2026,montant_du:5000,statut:'emise'},
 {id:'r2',commune_slug:'fimela',libelle:'Patente',annee:2026,montant_du:7000,statut:'en_attente_paiement',reference_avis:'PAY-TAXE-2026-000001'},
 {id:'r3',commune_slug:'fimela',libelle:'Marché',annee:2025,montant_du:100,statut:'payee',quittance_ref:'TAX-ABCDEF123456'},
 {id:'r4',commune_slug:'autre',libelle:'AUTRECOMMUNE',annee:2026,montant_du:1,statut:'emise'}];
const calls=[];const ctx={S:{user:{id:'u1'},slug:'fimela'},esc:s=>String(s==null?'':s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';'),pfm:m=>m+' FCFA',
 sb:{rpc:async(n,a)=>{calls.push([n,a]);return n=='mes_roles_imposition'?{data:rows}:{data:{reference:'x'}}}}};
vm.createContext(ctx);vm.runInContext(bloc+';this.api={loadTaxes,payTaxe,taxCard}',ctx);
(async()=>{await ctx.api.loadTaxes();const h=ctx.api.taxCard();
 ok('libellé échappé',!h.includes('<img'));ok('autre commune masquée',!h.includes('AUTRECOMMUNE'));
 ok('boutons selon statut',(h.match(/data-a="txpay"/g)||[]).length==1&&h.includes('PAY-TAXE-2026-000001')&&h.includes('data-ref="TAX-ABCDEF123456"'));
 await ctx.api.payTaxe('r1');ok('RPC avec id du rôle',calls.some(c=>c[0]=='initier_paiement_taxe'&&c[1].p_role_id=='r1'));
 ctx.S.user=null;await ctx.api.loadTaxes();ok('déconnecté : rien',!ctx.api.taxCard().includes('Patente'));
 process.exit(f?1:0)})();
