// node tests/sw-csp.test.js : le SW ne doit jamais rendre l'app inutilisable (CSP connect-src visée par fetch() du SW)
const fs=require('fs'),vm=require('vm'),path=require('path'),R=path.join(__dirname,'..');
const csp=((fs.readFileSync(path.join(R,'_headers'),'utf8').match(/Content-Security-Policy:\s*(.+)/)||[])[1])||'';
const dir=n=>((csp.split(';').map(s=>s.trim()).find(s=>s.startsWith(n+' '))||'').split(/\s+/).slice(1));
const code=fs.readFileSync(path.join(R,'sw.js'),'utf8');
async function sim(selfAllowed){const ls={},store={};
 const sc={location:{origin:'https://x'},URL,Response:{error:()=>'ERR'},caches:{keys:async()=>[],delete:async()=>1,open:async()=>({put:async(r,c)=>{store[r.url||r]=c}}),match:async r=>store[r.url||r]},
 fetch:async r=>{if(!selfAllowed)throw new TypeError('CSP connect-src');return{ok:true,type:'basic',clone:()=>'C',url:r.url||r}},skipWaiting(){},clients:{claim(){}},addEventListener:(n,f)=>ls[n]=f};
 sc.self=sc;vm.runInNewContext(code,sc);
 let p;ls.install({waitUntil:x=>p=x});let installed=true;try{await p}catch(e){installed=false}
 if(!installed)return{installed};
 let out;ls.fetch({request:{url:'https://x/js/core.js',method:'GET',mode:'no-cors'},respondWith:x=>out=x});return{installed,res:await out}}
(async()=>{let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
 const real=dir('connect-src').concat(dir('connect-src').length?[]:dir('default-src')).includes("'self'");
 ok("CSP déployée : connect-src contient 'self' (fetch du SW)",real);
 const a=await sim(real);ok("SW avec la CSP déployée : app servie (pas de Response.error)",!a.installed||a.res!=='ERR');
 const b=await sim(false);ok("SW + CSP bloquante : installation refusée (SW jamais actif)",!b.installed);
 console.log(f?'ECHECS: '+f:'TOUS OK');process.exit(f?1:0)})();
