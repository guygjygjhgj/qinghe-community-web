import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const backend=pathToFileURL(resolve(process.argv[2]||'../qinghe-registration-service')+'/');
const {fixture}=await import(new URL('tests/community-fixture.mjs',backend));
const {handleApi}=await import(new URL('lib/registration.mjs',backend));
import {createCommunityClient} from '../community-client.js';
import {setTimeout as delay} from 'node:timers/promises';
const f=await fixture(10),clients=[],received=new Map();let start=0;
for(const user of f.users){const cache=new Map();clients.push(createCommunityClient({auth:{getToken:()=>user.token,hasSession:()=>true,invalidate(){}},storage:{getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.delete(k)},fetchImpl:(url,init)=>handleApi(new Request(url,init),f.env),getRoute:()=>'/chat/test',onState:s=>{if(start&&s.chats.some(m=>m.text==='10人并发-'+user.id)&&!received.has(user.id))received.set(user.id,Math.round(performance.now()-start));},document:{hidden:false,addEventListener(){},removeEventListener(){}},window:{setTimeout,clearTimeout,addEventListener(){},removeEventListener(){}}}));}
try{await Promise.all(clients.map(c=>c.bootstrap()));const conversations=[];for(let i=0;i<10;i++)conversations.push((await clients[i].command('chat.open',f.users[(i+1)%10].id)).id);await Promise.all(clients.map(c=>c.bootstrap()));clients.forEach(c=>c.start());start=performance.now();await Promise.all(clients.map((c,i)=>c.command('chat.send',conversations[i],{text:'10人并发-'+f.users[(i+1)%10].id})));for(let i=0;i<120&&received.size<10;i++)await delay(25);assert.equal(received.size,10);const max=Math.max(...received.values());assert.ok(max<3000,String(max));console.log(JSON.stringify({users:10,received:received.size,maxDeliveryMs:max,deliveryTimesMs:[...received.values()],database:'isolated SQLite with production API and 10 independent sessions',result:'PASS'}));}finally{clients.forEach(c=>c.dispose());f.close();}
