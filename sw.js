const V="mc-v1",SHELL=["/","/mairie","/css/mairie.css","/js/core.js","/js/adjoints.js","/js/secretariat.js","/js/actions.js","/manifest-citoyen.webmanifest","/manifest-mairie.webmanifest","/icon-citoyen-192.png","/icon-mairie-192.png"],CDN=["cdn.jsdelivr.net","cdnjs.cloudflare.com","fonts.googleapis.com","fonts.gstatic.com"];
self.addEventListener("install",e=>e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
const put=(r,res)=>{if(res&&res.ok&&!res.redirected)caches.open(V).then(c=>c.put(r,res.clone()));return res};
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);
if(u.origin===location.origin){e.respondWith(fetch(r).then(x=>put(r,x)).catch(()=>caches.match(r).then(m=>m||(r.mode==="navigate"?caches.match(u.pathname.startsWith("/mairie")?"/mairie":"/"):Response.error()))));return}
if(CDN.includes(u.hostname))e.respondWith(caches.match(r).then(m=>{const n=fetch(r).then(x=>put(r,x)).catch(()=>m);return m||n}))});
