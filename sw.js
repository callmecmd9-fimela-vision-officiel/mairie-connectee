const C="mc-v13";
/* Auto-test : si fetch() du SW est bloqué (CSP) ou le réseau KO, l'installation échoue et le SW n'est jamais activé : l'app reste utilisable sans SW. */
/* Shell mairie préchargé à l'installation (hors-ligne) : /mairie (= mairie.html) + les /js/ et /css/ qu'il référence, avec leur ?v= exact lu dans la page (jamais figé ici).
   Meilleur effort : un échec du préchargement n'empêche pas l'installation. Les appels Supabase ne sont jamais interceptés ni mis en cache (cf. fetch : même origine uniquement). */
const shell=c=>fetch("/mairie.html",{cache:"reload"}).then(r=>{if(!r.ok)return;const k=r.clone();return c.put("/mairie",r).then(()=>k.text()).then(t=>{const u=[];t.replace(/(?:src|href)="(\/(?:js|css)\/[^"]+)"/g,(m,x)=>{u.push(x);return m});return Promise.all(u.map(x=>fetch(x,{cache:"reload"}).then(y=>{if(y.ok)return c.put(x,y)}).catch(()=>{})))})}).catch(()=>{});
self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>fetch("/js/guard.js",{cache:"reload"}).then(r=>{if(!r.ok)throw 0;return c.put("/js/guard.js",r)}).then(()=>shell(c))).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
/* Réseau d'abord (mises à jour immédiates), cache en secours hors-ligne. Uniquement fichiers statiques du site ; Supabase/Turnstile jamais interceptés. */
self.addEventListener("fetch",e=>{const r=e.request,u=new URL(r.url);
if(r.method!=="GET"||u.origin!==location.origin||u.pathname==="/sw.js")return;
e.respondWith(fetch(r).then(x=>{if(x.ok&&x.type==="basic"){const c=x.clone();caches.open(C).then(h=>h.put(r,c)).catch(()=>{})}return x}).catch(()=>caches.match(r).then(m=>m||(r.mode==="navigate"?caches.match(u.pathname.startsWith("/mairie")?"/mairie":u.pathname.startsWith("/saas")?"/saas":"/"):undefined)||Response.error())))});
/* Notifications push (charge utile minimale : t=titre, b=extrait, n=id notification, d=id dossier). Aucune donnée sensible. */
self.addEventListener("push",e=>{let d={};try{d=e.data?e.data.json():{}}catch(x){}e.waitUntil(self.registration.showNotification(String(d.t||"Mairie").slice(0,80),{body:String(d.b||"").slice(0,120),icon:"/icon-defaut-192.png",badge:"/icon-defaut-192.png",tag:d.n||"mc",data:{d:d.d||""}}))});
self.addEventListener("notificationclick",e=>{e.notification.close();const d=e.notification.data||{},app=String(d.app||"/");e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(l=>{const same=l.filter(c=>c.url&&new URL(c.url).origin===location.origin),c=same.find(x=>new URL(x.url).pathname===app.split("?")[0])||(d.app?null:same[0]);if(c&&"focus"in c){if(d.n)c.postMessage({type:"mc-notif",n:d.n});return c.focus()}return self.clients.openWindow(app.startsWith("/")&&!app.startsWith("//")?app:"/")}))});
/* Background Sync : le navigateur déclenche « sync » (tag mc-offline-queue) dès que le réseau revient, même si l'onglet a été mis en veille.
   Le SW ne rejoue PAS lui-même les requêtes : la session Supabase (JWT, renouvelé automatiquement) vit dans la page, pas dans le SW.
   Il réveille donc les fenêtres ouvertes (js/offline-queue.js) et attend leur accusé « done » (file vidée).
   Sans fenêtre ouverte, ou file non vidée : on lève une erreur pour que le navigateur retente plus tard (il abandonne seul après quelques essais ;
   dernier essai : aucune erreur, la file reste en IndexedDB et sera vidée à la prochaine ouverture de l'application). */
const mcAsk=c=>new Promise(r=>{const m=new MessageChannel(),t=setTimeout(()=>r(false),25000);m.port1.onmessage=x=>{clearTimeout(t);r(!!(x.data&&x.data.done))};try{c.postMessage({type:"mc-flush-queue"},[m.port2])}catch(x){clearTimeout(t);r(false)}});
self.addEventListener("sync",e=>{if(e.tag!=="mc-offline-queue")return;
e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(l=>Promise.all(l.map(mcAsk))).then(a=>{if(!a.some(Boolean)&&!e.lastChance)throw new Error("mc-offline-queue: file non vidée")}))});
