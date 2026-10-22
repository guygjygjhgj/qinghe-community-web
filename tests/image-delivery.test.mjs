import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {prioritizeImages} from '../image-loading.js';
import {h} from '../native-runtime.js';

const image='https://demo.github.io/qinghe-community-web/assets/'+'a'.repeat(40)+'.png';
function worker(fetchImpl){
 const listeners={},saved=new Map(),names=new Map(),cache={match:async key=>saved.get(key)?.clone(),put:async(key,value)=>{saved.set(key,value);},keys:async()=>[...saved.keys()],delete:async key=>saved.delete(key)};
 names.set('other-app-cache',{});names.set('lezhi-community-art-old',{});
 const caches={open:async name=>{names.set(name,cache);return cache;},keys:async()=>[...names.keys()],delete:async name=>names.delete(name)};
 const self={location:{href:'https://demo.github.io/qinghe-community-web/asset-worker.js'},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(name,handler)=>listeners[name]=handler};
 vm.runInNewContext(readFileSync(new URL('../asset-worker.js',import.meta.url),'utf8'),{self,caches,fetch:fetchImpl,URL,Promise});
 return {saved,names,cache,async request(url,method='GET',waitForSave=true){
  let response;const waits=[];listeners.fetch({request:new Request(url,{method}),respondWith:p=>{response=p;},waitUntil:p=>waits.push(p)});
  if(!response)return {bypassed:true};const result=await response;const settled=Promise.all(waits);if(waitForSave)await settled;return {response:result,settled};
 },async activate(){let pending;listeners.activate({waitUntil:p=>pending=p});await pending;}};
}

test('artwork is fetched once, remains byte-identical in cache, and stays available without network',async()=>{
 let requests=0,offline=false;const bytes=Uint8Array.of(137,80,78,71,0,13,10);
 const w=worker(async()=>{requests++;if(offline)throw Error('offline');return new Response(bytes,{headers:{'content-type':'image/png'}});});
 assert.deepEqual(new Uint8Array(await (await w.request(image)).response.arrayBuffer()),bytes);
 offline=true;assert.deepEqual(new Uint8Array(await (await w.request(image+'?release=new')).response.arrayBuffer()),bytes);assert.equal(requests,1);
});

test('private data, uploads, other apps and changing code never enter the public art cache',async()=>{
 let requests=0;const w=worker(async()=>{requests++;return new Response('private');});
 for(const path of ['/qinghe-community-web/','/qinghe-community-web/app.js','/qinghe-community-web/assets.json','/api/community/v1/bootstrap','/qinghe-community-web/uploads/avatar.png','/another-app/assets/'+'a'.repeat(40)+'.png'])assert.equal((await w.request('https://demo.github.io'+path)).bypassed,true,path);
 assert.equal((await w.request(image,'POST')).bypassed,true);assert.equal((await w.request(image.replace('demo.github.io','other.example'))).bypassed,true);assert.equal(requests,0);
 await w.activate();assert.ok(w.names.has('other-app-cache'));assert.ok(!w.names.has('lezhi-community-art-old'));
});

test('failed responses are retried, cache failures do not break display, and the cache is bounded',async()=>{
 let requests=0;const w=worker(async()=>new Response('same pixels',{status:++requests===1?503:200,headers:{'content-type':'image/png'}}));
 assert.equal((await w.request(image)).response.status,503);assert.equal(w.saved.size,0);
 assert.equal(await (await w.request(image)).response.text(),'same pixels');assert.equal(requests,2);
 for(let i=0;i<181;i++)w.saved.set('old-'+i,new Response('art'));
 await w.request(image.replace('a'.repeat(40),'b'.repeat(40)));assert.ok(w.saved.size<=180);
 w.cache.put=async()=>{throw Error('storage full');};assert.equal((await w.request(image.replace('a'.repeat(40),'c'.repeat(40)))).response.status,200);
});

test('cache writes do not delay image streaming',async()=>{
 let complete;const w=worker(async()=>new Response('art',{headers:{'content-type':'image/png'}}));
 w.cache.put=()=>new Promise(resolve=>{complete=resolve;});
 const result=await w.request(image,'GET',false);
 assert.equal(typeof complete,'function');assert.equal(await result.response.text(),'art');assert.equal(w.saved.size,0);
 complete();await result.settled;
});

test('image scheduling retains every source URL, style and slot while promoting the visible viewport',()=>{
 const dom=new JSDOM('<main></main>');globalThis.document=dom.window.document;globalThis.Node=dom.window.Node;
 const root=document.querySelector('main');root.getBoundingClientRect=()=>({top:8,bottom:708});
 const photo=h('img',{src:'assets/original.png',className:'source-crop',style:{width:'300%',left:'-100%'}});assert.equal(photo.loading,'lazy');
 const first=document.createElement('div'),later=document.createElement('div');first.append(photo);later.append(photo.cloneNode(true));root.append(first,later);
 first.getBoundingClientRect=()=>({top:100,bottom:300,width:390,height:200,left:0,right:390});later.getBoundingClientRect=()=>({top:1500,bottom:1700,width:390,height:200,left:0,right:390});
 const source=[...root.querySelectorAll('img')].map(i=>[i.src,i.className,i.getAttribute('style')]);prioritizeImages(root,{innerHeight:720,innerWidth:1280});
 assert.equal(photo.loading,'eager');assert.equal(photo.fetchPriority,'high');assert.equal(later.firstChild.loading,'lazy');assert.equal(later.firstChild.fetchPriority,'low');
 assert.deepEqual([...root.querySelectorAll('img')].map(i=>[i.src,i.className,i.getAttribute('style')]),source);dom.window.close();
});
