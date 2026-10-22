// Cache only public, content-addressed artwork and the unchanged bundled fonts.
// HTML, scripts, API calls, uploads and personal records always use the network.
const PREFIX='lezhi-community-art-';
const CACHE=PREFIX+'v1-__STATIC_FONT_REVISION__';
const LIMIT=180;
const base=new URL('./',self.location.href);
function assetKey(request){
 const url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return null;
 const path=url.pathname.slice(base.pathname.length);
 if(!/^assets\/(?:optimized\/)?[a-f0-9]{40}\.(?:png|jpe?g|webp|avif|svg)$/.test(path)&&!/^assets\/fonts\/[\w-]+\.woff2$/.test(path))return null;
 url.search='';return url.href;
}
async function trim(cache,limit=LIMIT){
 const keys=await cache.keys();
 await Promise.all(keys.slice(0,Math.max(0,keys.length-limit)).map(key=>cache.delete(key)));
}
async function save(cache,key,response){
 try{await cache.put(key,response);await trim(cache);}catch{try{await trim(cache,Math.floor(LIMIT/2));}catch{}}
}
self.addEventListener('install',event=>{event.waitUntil(self.skipWaiting());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);
 await self.clients.claim();
})());});
self.addEventListener('fetch',event=>{
 const key=assetKey(event.request);if(!key)return;
 let finish;const saved=new Promise(resolve=>{finish=resolve;});event.waitUntil(saved);
 event.respondWith((async()=>{
  let cache;try{cache=await caches.open(CACHE);const hit=await cache.match(key);if(hit){finish();return hit;}}catch{}
  try{
   const response=await fetch(event.request);
   if(cache&&response.ok&&response.type!=='opaque'&&!/text\/html/i.test(response.headers.get('content-type')||'')){
    // Do not wait for the full image to enter storage before streaming it to UI.
    save(cache,key,response.clone()).finally(finish);
   }else finish();
   return response;
  }catch(error){finish();throw error;}
 })());
});
