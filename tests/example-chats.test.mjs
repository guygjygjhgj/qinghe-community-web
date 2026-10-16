import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setup} from './helpers/browser.mjs';
import {initialState} from '../domain.js';
import {createViews} from '../native-views.js';
const assets=JSON.parse(readFileSync(new URL('../assets.json',import.meta.url)));

test('both original neighbor examples remain accessible without becoming real messages or agreements',async()=>{
 for(const person of ['chen','wang']){
  const state=initialState();state.loggedIn=true;const env=await setup('/chat/example-'+person,state);
  try{
   assert.equal(document.querySelector('.native-canvas').dataset.exampleChat,'example-'+person);
   assert.ok(document.querySelector('[data-node-id="11:1215"]').textContent.includes('已归档'));
   assert.ok(document.querySelector('[data-node-id="11:1221"]'));
   assert.equal(document.querySelector('form[data-form=chat]'),null);
   await env.click('[data-node-id="11:1282"]');
   assert.equal(env.stored().chats.length,0);
   assert.equal(env.stored().agreements.length,0);
   assert.ok(document.querySelector('#toast').textContent.includes('仅供浏览'));
   await env.click('[data-node-id="11:1216"]');assert.equal(env.routeNow(),'/messages');
  }finally{env.cleanup();}
 }
});

test('new shared accounts keep the original notification and plant page designs without inventing private records',async()=>{
 const state=initialState();state.loggedIn=true;const env=await setup('/',state);
 try{
  state.cloud=true;state.conversations=[];state.plants=[];state.messages=[{id:'real-notice',title:'真实邻居发来消息',kind:'chat',text:'不能覆盖原稿示例卡片',to:'/chat/real-chat',read:false,createdAt:Date.now()}];
  const views=createViews(()=>state,assets,''),vm={forms:{},selected:new Set()};
  const host=document.createElement('div');host.innerHTML=views.render('/messages',vm).html;
  assert.equal(host.querySelector('[data-node-id="11:1712"]').textContent,'青禾社区');
  assert.equal(host.querySelector('[data-node-id="11:1713"]').textContent,'不能覆盖原稿示例卡片');
  assert.equal(host.querySelector('[data-node-id="11:1716"]').hidden,true);
  assert.equal(host.querySelector('[data-node-id="11:1698"]').dataset.action,'notification');
  assert.equal(host.querySelector('[data-node-id="11:1698"]').dataset.id,'real-notice');
  assert.ok(!host.textContent.includes('原稿通知'));
  assert.ok([...host.querySelector('[data-message-picker]').options].some(o=>o.value==='real-notice'));
  host.innerHTML=views.render('/me',vm).html;
  assert.equal(host.firstElementChild.dataset.screen,'plants');
  assert.ok(host.querySelector('[data-native-plant-motion]'));
  assert.ok([...host.querySelector('select[aria-label="我的植物"]').options].some(o=>o.value==='/plant/new'));
  assert.equal(state.plants.length,0);assert.equal(state.chats.length,0);
 }finally{env.cleanup();}
});

test('the original conversation selector offers real conversations and both source examples',async()=>{
 const state=initialState();state.loggedIn=true;const env=await setup('/',state);
 try{
  state.cloud=true;state.conversations=[{id:'real-chat',peerId:'wang',readAt:0}];state.chats=[];
  for(const selected of ['real-chat','example-chen','example-wang']){
   const host=document.createElement('div');host.innerHTML=createViews(()=>state,assets,'').render('/messages',{forms:{},selected:new Set(),cloudConversationId:selected}).html;
   const picker=host.querySelector('[data-cloud-conversation-select]');
   assert.equal(picker.value,selected);
   assert.ok([...picker.options].some(o=>o.value==='example-chen'&&o.textContent.includes('已归档')));
   assert.ok([...picker.options].some(o=>o.value==='example-wang'&&o.textContent.includes('已归档')));
   assert.ok(host.querySelector('[data-route="/chat/'+selected+'"]'));
  }
  assert.equal(state.chats.length,0);assert.equal(state.agreements.length,0);
 }finally{env.cleanup();}
});

test('a shared notice uses its actual author and avatar in the original slots even when names are duplicated',async()=>{
 const state=initialState();state.loggedIn=true;const env=await setup('/',state);
 try{
  state.cloud=true;state.conversations=[];
  state.users.first={id:'first',name:'邻居',avatar:'profile:img5'};
  state.users.second={id:'second',name:'邻居',avatar:'seed-post:imgGpt1'};
  state.messages=[{id:'notice',actorId:'second',kind:'comment',title:'收到留言',text:'邻居：一起交流',to:'/post/mint',read:false,createdAt:Date.now()}];
  const host=document.createElement('div');host.innerHTML=createViews(()=>state,assets,'').render('/messages',{forms:{},selected:new Set()}).html;
  assert.equal(host.querySelector('[data-node-id="11:1712"]').textContent,'邻居');
  assert.equal(host.querySelector('[data-node-id="11:1707"] img').getAttribute('src'),assets['seed-post'].imgGpt1.file);
  assert.equal(host.querySelector('[data-node-id="11:1698"]').dataset.id,'notice');
 }finally{env.cleanup();}
});
