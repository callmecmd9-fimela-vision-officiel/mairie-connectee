const C="mc-v3",CDN=["cdn.jsdelivr.net","cdnjs.cloudflare.com","fonts.googleapis.com","fonts.gstatic.com"];
self.addEventListener("install",e=>e.waitUntil(self.skipWaiting()));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
const put=async(r,res)=>{const c=await caches.open(C),p=new URL(r.url).pathname;for(const k of await c.keys())if(k.url!=r.url&&new URL(k.url).pathname==p&&new URL(k.url).origin==location.origin)await c.delete(k);await c.put(r,res)};
const net=(r,ms)=>new Promise((ok,ko)=>{const t=setTimeout(()=>ko(0),ms);fetch(r).then(x=>{clearTimeout(t);ok(x)},x=>{clearTimeout(t);ko(x)})});
self.addEventListener("fetch",e=>{const r=e.request,u=new URL(r.url);
if(r.method!="GET"||r.headers.has("range"))return;
if(u.origin==location.origin){
e.respondWith((async()=>{try{const res=await net(r,4000);if(res.ok&&res.type=="basic"&&!res.redirected&&!/no-store/i.test(res.headers.get("cache-control")||""))e.waitUntil(put(r,res.clone()));return res}
catch(x){return (await caches.match(r))||(r.mode=="navigate"&&await caches.match(r,{ignoreSearch:true}))||fetch(r)}})())}
else if(CDN.includes(u.hostname)){
e.respondWith(caches.match(r).then(h=>h||fetch(r).then(res=>{if(res.ok||res.type=="opaque"){const k=res.clone();e.waitUntil(caches.open(C).then(c=>c.put(r,k)))}return res})))}});
