const C="mc-v9";
/* Auto-test : si fetch() du SW est bloqué (CSP) ou le réseau KO, l'installation échoue et le SW n'est jamais activé : l'app reste utilisable sans SW. */
self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>fetch("/js/guard.js",{cache:"reload"}).then(r=>{if(!r.ok)throw 0;return c.put("/js/guard.js",r)})).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
/* Réseau d'abord (mises à jour immédiates), cache en secours hors-ligne. Uniquement fichiers statiques du site ; Supabase/Turnstile jamais interceptés. */
self.addEventListener("fetch",e=>{const r=e.request,u=new URL(r.url);
if(r.method!=="GET"||u.origin!==location.origin||u.pathname==="/sw.js")return;
e.respondWith(fetch(r).then(x=>{if(x.ok&&x.type==="basic"){const c=x.clone();caches.open(C).then(h=>h.put(r,c)).catch(()=>{})}return x}).catch(()=>caches.match(r).then(m=>m||(r.mode==="navigate"?caches.match(u.pathname.startsWith("/mairie")?"/mairie":u.pathname.startsWith("/saas")?"/saas":"/"):undefined)||Response.error())))});
