const C="mc-v4",CDN=["cdn.jsdelivr.net","cdnjs.cloudflare.com","fonts.googleapis.com","fonts.gstatic.com"];
self.addEventListener("install",e=>e.waitUntil(self.skipWaiting()));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{const r=e.request,u=new URL(r.url);
if(r.method!="GET"||!CDN.includes(u.hostname))return;
e.respondWith(caches.match(r).then(h=>h||fetch(r).then(res=>{if(res.ok||res.type=="opaque"){const k=res.clone();e.waitUntil(caches.open(C).then(c=>c.put(r,k)))}return res})))});
