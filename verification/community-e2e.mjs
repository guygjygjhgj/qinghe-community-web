import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const backend=pathToFileURL(resolve(process.argv[2]||'../qinghe-registration-service')+'/');
const {fixture}=await import(new URL('tests/community-fixture.mjs',backend));
const {handleApi}=await import(new URL('lib/registration.mjs',backend));
import {setup} from '../tests/helpers/browser.mjs';
import {createCommunityClient} from '../community-client.js';
const f=await fixture(10),transport=(url,init)=>handleApi(new Request(url,init),f.env);
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const create=(user)=>createCommunityClient({auth:{getToken:()=>user.token,hasSession:()=>true,invalidate(){}},storage:storage(),fetchImpl:transport,document:{hidden:false,addEventListener(){},removeEventListener(){}},window:{setTimeout,clearTimeout,addEventListener(){},removeEventListener(){}}});
const sender=create(f.users[0]);await sender.bootstrap();const c=await sender.command('chat.open',f.users[1].id);
const state=await f.bootstrap(f.users[1]);
const b=await setup('/chat/'+c.id,state,{community:true,token:f.users[1].token,communityFetch:transport});
try{
 assert.equal(b.w.document.querySelectorAll('.chat-message').length,0,'no imaginary source messages');
 b.fill('chat','text','我正在输入，还没发送');const input=b.w.document.querySelector('form[data-form=chat] [name=text]');input.focus();input.setSelectionRange(3,3);
 const start=performance.now();await sender.command('chat.send',c.id,{text:'A发给B的真实消息'});
 for(let i=0;i<140&&!b.w.document.querySelector('.chat-message');i++)await delay(25);
 assert.ok(b.w.document.querySelector('.chat-message')?.textContent.includes('A发给B的真实消息'),'recipient renders received message');assert.ok(performance.now()-start<3000,'delivered within 3 seconds');assert.equal(input.value,'我正在输入，还没发送');assert.equal(b.w.document.activeElement,input);assert.equal(input.selectionStart,3);
 b.fill('chat','text','B已收到，这是回复');await b.submit('chat');await delay(150);await sender.sync();assert.ok(sender.state.chats.some(m=>m.text==='B已收到，这是回复'));
 const reloaded=create(f.users[1]);await reloaded.bootstrap();assert.equal(reloaded.state.chats.length,2,'same account restores messages');reloaded.dispose();
 // A response lost after the database commits must use the same request id on retry.
 let lost=true;const retry=createCommunityClient({auth:{getToken:()=>f.users[0].token,hasSession:()=>true,invalidate(){}},storage:storage(),fetchImpl:async(url,init)=>{const response=await transport(url,init);if(lost&&url.endsWith('/commands')){lost=false;throw Error('response lost');}return response;},document:{hidden:false,addEventListener(){},removeEventListener(){}},window:{setTimeout,clearTimeout,addEventListener(){},removeEventListener(){}}});await retry.bootstrap();await assert.rejects(retry.command('chat.send',c.id,{text:'断网重试只保留一条'}));await retry.command('chat.send',c.id,{text:'断网重试只保留一条'});assert.equal((await f.bootstrap(f.users[1])).chats.filter(m=>m.text==='断网重试只保留一条').length,1);retry.dispose();
 console.log('PASS: two independent sessions, real UI receipt <3s, focus/caret preserved, reply, restore, lost-response idempotency');
}finally{sender.dispose();b.cleanup();f.close();}
