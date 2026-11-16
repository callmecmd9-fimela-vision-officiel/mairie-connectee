const C="mc-v6";
self.addEventListener("install",e=>e.waitUntil(self.skipWaiting()));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
/* Réseau d'abord (mises à jour immédiates), cache en secours hors-ligne. Uniquement fichiers statiques du site ; Supabase/Turnstile jamais interceptés. */
self.addEventListener("fetch",e=>{const r=e.request,u=new URL(r.url);
if(r.method!=="GET"||u.origin!==location.origin||u.pathname==="/sw.js")return;
e.respondWith(fetch(r).then(x=>{if(x.ok&&x.type==="basic"){const c=x.clone();caches.open(C).then(h=>h.put(r,c)).catch(()=>{})}return x}).catch(()=>caches.match(r).then(m=>m||(r.mode==="navigate"?caches.match(u.pathname.startsWith("/mairie")?"/mairie":"/"):undefined)||Response.error())))});
