// « Mes Taxes » : affichage, échappement, avis, quittance, isolation par commune. node tests/citoyen-taxes.test.js
const vm=require('vm'),fs=require('fs'),path=require('path');let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
const src=fs.readFileSync(path.join(__dirname,'..','js','citoyen.js'),'utf8');
const bloc=src.slice(src.indexOf('async function loadTaxes'),src.indexOf('async function choose('));
const rows=[{id:'r1',commune_slug:'fimela',libelle:'<img src=x onerror=1>',annee:2026,montant_du:5000,statut:'emise'},
 {id:'r2',commune_slug:'fimela',libelle:'Patente',annee:2026,montant_du:7000,statut:'en_attente_paiement',reference_avis:'PAY-TAXE-2026-000001'},
 {id:'r3',commune_slug:'fimela',libelle:'Marché',annee:2025,montant_du:100,statut:'payee',quittance_ref:'TAX-ABCDEF123456'},
 {id:'r4',commune_slug:'autre',libelle:'AUTRECOMMUNE',annee:2026,montant_du:1,statut:'emise'}];
const calls=[];let renders=0,opened=[],rpcStatut={role_statut:'en_attente_paiement',paiement_statut:'en_attente',quittance_ref:null},payUrl='https://pay.wave.com/m/M_sn_x/c/sn/?amount=5000',payMode='production',modes=[{fournisseur:'wave',mode:'production'},{fournisseur:'orange_money',mode:'production'}];
const ctx={S:{user:{id:'u1'},slug:'fimela'},render:()=>{renders++},window:{open:(u)=>opened.push(u)},Date,setInterval,clearInterval,esc:s=>String(s==null?'':s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';'),pfm:m=>m+' FCFA',
 sb:{rpc:async(n,a)=>{calls.push([n,a]);if(n=='mes_roles_imposition')return{data:rows};if(n=='modes_paiement_commune')return{data:modes};if(n=='initier_paiement_en_ligne')return{data:{reference:'PAY-TAXE-2026-000009',payment_url:payUrl,mode:payMode,statut:'en_attente'}};if(n=='statut_paiement_en_ligne')return{data:rpcStatut};return{data:{reference:'x'}}}}};
vm.createContext(ctx);vm.runInContext(bloc+';this.api={loadTaxes,payTaxe,taxCard,payEnLigne,txPoll,txReset,txOpen}',ctx);
(async()=>{await ctx.api.loadTaxes();const h=ctx.api.taxCard();
 ok('libellé échappé',!h.includes('<img'));ok('autre commune masquée',!h.includes('AUTRECOMMUNE'));
 ok('modes lus pour la commune',ctx.S.txm&&ctx.S.txm.wave=='production'&&calls.some(c=>c[0]=='modes_paiement_commune'&&c[1].p_commune=='fimela'));
 ok('boutons selon statut',(h.match(/data-a="txpay"/g)||[]).length==2&&h.includes('PAY-TAXE-2026-000001')&&h.includes('data-ref="TAX-ABCDEF123456"'));
 ok('choix guichet OU en ligne',h.includes('Payer au guichet')&&h.includes('Payer par Wave/OM')&&!h.includes('Générer un avis'));
 await ctx.api.payTaxe('r1');ok('RPC avec id du rôle',calls.some(c=>c[0]=='initier_paiement_taxe'&&c[1].p_role_id=='r1'));
 ctx.S.txc='r1';ok('fournisseurs proposés après le choix en ligne',ctx.api.taxCard().includes('data-p="wave"')&&ctx.api.taxCard().includes('data-p="orange_money"'));ctx.S.txc='';
 await ctx.api.payEnLigne('r1','wave');ok('RPC en ligne avec id + fournisseur',calls.some(c=>c[0]=='initier_paiement_en_ligne'&&c[1].p_role_id=='r1'&&c[1].p_provider=='wave'));
 ok('écran En attente de confirmation',ctx.S.txw&&ctx.S.txw.etat=='attente'&&ctx.api.taxCard().includes('En attente de confirmation'));
 ok('lien fournisseur absent du HTML',!ctx.api.taxCard().includes('pay.wave.com'));
 ctx.api.txOpen();ok('ouverture du lien autorisé',opened[0]==payUrl);
 await ctx.api.txPoll();ok('polling : pas de changement tant que non confirmé',ctx.S.txw.etat=='attente');
 rpcStatut={role_statut:'payee',paiement_statut:'paye',quittance_ref:'TAX-ABCDEF123456'};await ctx.api.txPoll();
 ok('polling : confirmation détectée + rendu',ctx.S.txw.etat=='ok'&&renders>0&&ctx.api.taxCard().includes('Paiement confirmé'));
 ctx.api.txReset();ctx.S.txw=null;rpcStatut={role_statut:'en_attente_paiement',paiement_statut:'echoue',quittance_ref:null};
 await ctx.api.payEnLigne('r1','orange_money');await ctx.api.txPoll();ok('polling : échec détecté',ctx.S.txw.etat=='echec'&&ctx.api.taxCard().includes('Réessayer'));ctx.api.txReset();
 payUrl='https://evil.example/pay';ctx.S.err='';await ctx.api.payEnLigne('r1','wave');ok('lien hors liste blanche refusé (production)',!ctx.S.txw&&/indisponible/.test(ctx.S.err));
 payUrl='https://pay.wave.com.evil.example/x';ctx.S.err='';await ctx.api.payEnLigne('r1','wave');ok('sous-domaine piégé refusé',!ctx.S.txw);
 /* sandbox : lien factice accepté mais jamais ouvert, message « Mode test » */
 payMode='sandbox';payUrl='https://sandbox.paiement.invalid/pay/wave/PAY-TAXE-2026-000009';opened.length=0;ctx.S.err='';
 await ctx.api.payEnLigne('r1','wave');const hs=ctx.api.taxCard();
 ok('sandbox : message Mode test sur l\'écran d\'attente',ctx.S.txw&&ctx.S.txw.mode=='sandbox'&&hs.includes('Mode test : le paiement sera simulé')&&!hs.includes('data-a="txopen"')&&!hs.includes('sandbox.paiement'));
 ctx.api.txOpen();ok('sandbox : lien factice jamais ouvert',opened.length==0);ctx.api.txReset();
 payMode='production';payUrl='https://pay.wave.com/x';
 modes=[{fournisseur:'wave',mode:'sandbox'}];await ctx.api.loadTaxes();ctx.S.txc='r1';const hm=ctx.api.taxCard();
 ok('sandbox : message avant paiement, seul Wave proposé',hm.includes('Mode test : le paiement sera simulé')&&hm.includes('data-p="wave"')&&!hm.includes('data-p="orange_money"'));ctx.S.txc='';
 modes=[];await ctx.api.loadTaxes();ok('aucun fournisseur actif : pas de bouton en ligne',!ctx.api.taxCard().includes('Payer par Wave/OM')&&ctx.api.taxCard().includes('Payer au guichet'));
 modes=[{fournisseur:'wave',mode:'production'}];await ctx.api.loadTaxes();
 payMode='inconnu';ctx.S.err='';await ctx.api.payEnLigne('r1','wave');ok('mode inconnu refusé',!ctx.S.txw);payMode='production';
 await ctx.api.payEnLigne('r1','paypal');ok('fournisseur inconnu : aucun appel',!calls.some(c=>c[1]&&c[1].p_provider=='paypal'));
 ctx.S.user=null;await ctx.api.loadTaxes();ok('déconnecté : rien',!ctx.api.taxCard().includes('Patente'));
 process.exit(f?1:0)})();
