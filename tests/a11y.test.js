// node tests/a11y.test.js (npm i jsdom) : js/a11y.js
let JSDOM;
try{({JSDOM}=require('jsdom'))}catch(e){console.log("SKIP: jsdom non installé");process.exit(0)}
const fs=require('fs'),path=require('path');
const code=fs.readFileSync(path.join(__dirname,'..','js','a11y.js'),'utf8');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let fail=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)fail++};
(async()=>{
 const w=new JSDOM('<!doctype html><html lang="fr"><head></head><body><div id="app"><h1>Accueil</h1><input placeholder="Nom complet"><label for="e">E-mail</label><input id="e"><div class="f"><span>Téléphone</span><input></div><button title="Fermer"><svg></svg></button><button>OK</button><img src="x.png"><table><tr><th>A</th></tr></table></div></body></html>',{runScripts:'outside-only',pretendToBeVisual:true}).window;
 w.eval(code);const d=w.document,app=d.getElementById('app');
 ok('lien d\'évitement en premier',d.body.firstChild.className==='mc-skip'&&d.body.firstChild.getAttribute('href')==='#app');
 ok('#app = main focusable',app.getAttribute('role')==='main'&&app.getAttribute('tabindex')==='-1');
 const i=app.querySelectorAll('input');
 ok('placeholder => aria-label',i[0].getAttribute('aria-label')==='Nom complet');
 ok('label[for] respecté (pas d\'aria-label forcé)',!i[1].getAttribute('aria-label'));
 ok('texte voisin => aria-label',i[2].getAttribute('aria-label')==='Téléphone');
 ok('bouton icône nommé par title',app.querySelector('button').getAttribute('aria-label')==='Fermer');
 ok('bouton texte inchangé',!app.querySelectorAll('button')[1].getAttribute('aria-label'));
 ok('svg masqué aux lecteurs d\'écran',app.querySelector('svg').getAttribute('aria-hidden')==='true');
 ok('img sans alt => alt vide (décorative)',app.querySelector('img').getAttribute('alt')==='');
 ok('th scope=col',app.querySelector('th').getAttribute('scope')==='col');
 ok('région live polite',d.getElementById('mc-live').getAttribute('aria-live')==='polite');
 await sleep(200);ok('titre de page annoncé',d.getElementById('mc-live').textContent==='Accueil');
 app.innerHTML='<h1>Démarches</h1><input placeholder="Rechercher">';await sleep(250);
 ok('nouveau rendu : annonce + champ nommé',d.getElementById('mc-live').textContent==='Démarches'&&app.querySelector('input').getAttribute('aria-label')==='Rechercher');
 w.eval(code);ok('idempotent (un seul lien)',d.querySelectorAll('.mc-skip').length===1);
 const w2=new JSDOM('<!doctype html><body></body>',{runScripts:'outside-only'}).window;w2.eval(code);ok('sans #app : aucun effet ni erreur',w2.document.querySelectorAll('.mc-skip').length===0);
 console.log(fail?'ECHEC':'TOUS OK');process.exit(fail?1:0)})();
