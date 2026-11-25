// Test de js/enhance.js dans jsdom (npm i jsdom) : node tests/enhance.test.js
let JSDOM;
try{({JSDOM}=require('jsdom'))}catch(e){console.log("SKIP: jsdom non installé");process.exit(0)}
const fs=require('fs'),path=require('path');
const code=fs.readFileSync(path.join(__dirname,'..','js','enhance.js'),'utf8');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let fail=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)fail++};
function page(){const d=new JSDOM('<!doctype html><body><div id="app"><h1>Titre</h1><button data-a="addrdv">Ajouter</button><button data-a="delrdv" data-i="2">Retirer</button><button data-a="go" data-v="x">Nav</button></div></body>',{runScripts:'outside-only',pretendToBeVisual:true});
 const w=d.window;w.eval(code);return w}
(async()=>{
 // 1. double-clic bloqué jusqu'au rendu + focus restauré
 let w=page(),n=0,app=w.document.getElementById('app');
 w.document.addEventListener('click',async e=>{const t=e.target.closest('[data-a]');if(!t||t.dataset.a!=='delrdv')return;n++;await sleep(80);app.innerHTML='<h1>Titre</h1><button data-a="delrdv" data-i="2">Retirer</button>'});
 let b=app.querySelector('[data-a=delrdv]');b.focus();b.click();b.click();b.click();
 ok('double/triple clic = 1 seul envoi',n===1);
 await sleep(250);
 ok('focus rendu au même bouton après rendu',w.document.activeElement===app.querySelector('[data-a=delrdv][data-i="2"]'));
 w.document.getElementById('app').querySelector('[data-a=delrdv]').click();await sleep(250);
 ok('nouvelle action possible après rendu',n===2);
 // 2. navigation jamais bloquée
 w=page();app=w.document.getElementById('app');let g=0;w.document.addEventListener('click',e=>{if(e.target.closest('[data-a=go]'))g++});
 const nav=app.querySelector('[data-a=go]');nav.click();nav.click();nav.click();ok('actions libres non bloquées',g===3);
 // 3. repli : focus sur h1 si l'élément a disparu
 w=page();app=w.document.getElementById('app');w.document.addEventListener('click',async e=>{if(e.target.closest('[data-a=addrdv]')){await sleep(30);app.innerHTML='<h1>Autre</h1>'}});
 app.querySelector('[data-a=addrdv]').focus();app.querySelector('[data-a=addrdv]').click();await sleep(250);
 ok('repli focus sur le titre',w.document.activeElement&&w.document.activeElement.tagName==='H1');
 // 4. hors-ligne : action bloquée + bandeau, navigation libre
 w=page();app=w.document.getElementById('app');Object.defineProperty(w.navigator,'onLine',{get:()=>false,configurable:true});
 let h=0;w.document.addEventListener('click',e=>{if(e.target.closest('[data-a=addrdv]'))h++});
 app.querySelector('[data-a=addrdv]').click();
 ok('hors-ligne : envoi bloqué',h===0);ok('hors-ligne : bandeau affiché',!!w.document.getElementById('mc-off'));
 let g2=0;w.document.addEventListener('click',e=>{if(e.target.closest('[data-a=go]'))g2++});app.querySelector('[data-a=go]').click();ok('hors-ligne : navigation libre',g2===1);
 Object.defineProperty(w.navigator,'onLine',{get:()=>true,configurable:true});w.dispatchEvent(new w.Event('online'));ok('retour réseau : bandeau retiré',!w.document.getElementById('mc-off'));
 app.querySelector('[data-a=addrdv]').click();ok('retour réseau : envoi possible',h===1);
 // 5. pas de #app : sans effet
 const d2=new JSDOM('<!doctype html><body></body>',{runScripts:'outside-only'});let thrown=false;try{d2.window.eval(code)}catch(e){thrown=true}ok('sans #app : aucun effet ni erreur',!thrown);
 console.log(fail?'ECHECS: '+fail:'TOUS OK');process.exit(fail?1:0)})();
                                     
