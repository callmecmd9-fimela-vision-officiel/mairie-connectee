const C="mc-v12";
/* Auto-test : si fetch() du SW est bloqué (CSP) ou le réseau KO, l'installation échoue et le SW n'est jamais activé : l'app reste utilisable sans SW. */
self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>fetch("/js/guard.js",{cache:"reload"}).then(r=>{if(!r.ok)throw 0;return c.put("/js/guard.js",r)})).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
/* Réseau d'abord (mises à jour immédiates), cache en secours hors-ligne. Uniquement fichiers statiques du site ; Supabase/Turnstile jamais interceptés. */
self.addEventListener("fetch",e=>{const r=e.request,u=new URL(r.url);
if(r.method!=="GET"||u.origin!==location.origin||u.pathname==="/sw.js")return;
e.respondWith(fetch(r).then(x=>{if(x.ok&&x.type==="basic"){const c=x.clone();caches.open(C).then(h=>h.put(r,c)).catch(()=>{})}return x}).catch(()=>caches.match(r).then(m=>m||(r.mode==="navigate"?caches.match(u.pathname.startsWith("/mairie")?"/mairie":u.pathname.startsWith("/saas")?"/saas":"/"):undefined)||Response.error())))});
/* Notifications push (charge utile minimale : t=titre, b=extrait, n=id notification, d=id dossier). Aucune donnée sensible. */
self.addEventListener("push",e=>{let d={};try{d=e.data?e.data.json():{}}catch(x){}e.waitUntil(self.registration.showNotification(String(d.t||"Mairie").slice(0,80),{body:String(d.b||"").slice(0,120),icon:"/icon-defaut-192.png",badge:"/icon-defaut-192.png",tag:d.n||"mc",data:{d:d.d||""}}))});
self.addEventListener("notificationclick",e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(l=>{for(const c of l){if(c.url&&new URL(c.url).origin===location.origin&&"focus"in c)return c.focus()}return self.clients.openWindow("/")}))});
