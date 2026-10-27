// Dead Reckoning service worker. The game page is fetched from the network first, so a push to GitHub reaches an installed copy the next time it is opened online; everything is cached so it also starts offline.
const V="dead-reckoning-cache-1";
const CORE=["./","./index.html","./three.min.js","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png","./icons/apple-touch-icon.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
const put=(req,r)=>{if(r&&(r.ok||r.type==="opaque")){const cp=r.clone();caches.open(V).then(c=>c.put(req,cp));}return r;};
self.addEventListener("fetch",e=>{const rq=e.request;if(rq.method!=="GET")return;const u=new URL(rq.url);
  if(u.hostname==="api.github.com")return; // save sync is never cached
  const page=rq.mode==="navigate"||u.pathname.endsWith("/index.html")||u.pathname.endsWith("/")||u.pathname.endsWith("manifest.webmanifest")||u.pathname.endsWith("sw.js");
  if(page){e.respondWith(fetch(rq,{cache:"no-cache"}).then(r=>put(rq,r)).catch(()=>caches.match(rq,{ignoreSearch:true}).then(h=>h||caches.match("./index.html"))));return;}
  e.respondWith(caches.match(rq,{ignoreSearch:true}).then(h=>h||fetch(rq).then(r=>put(rq,r))));});
