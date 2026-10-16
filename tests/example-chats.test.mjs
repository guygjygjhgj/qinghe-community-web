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
   assert.ok(document.querySelector('[data-node-id="11:1215"]').textContent.includes('示例'));
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

test('the original conversation selector offers real conversations and both source examples',async()=>{
 const state=initialState();state.loggedIn=true;const env=await setup('/',state);
 try{
  state.cloud=true;state.conversations=[{id:'real-chat',peerId:'wang',readAt:0}];state.chats=[];
  for(const selected of ['real-chat','example-chen','example-wang']){
   const host=document.createElement('div');host.innerHTML=createViews(()=>state,assets,'').render('/messages',{forms:{},selected:new Set(),cloudConversationId:selected}).html;
   const picker=host.querySelector('[data-cloud-conversation-select]');
   assert.equal(picker.value,selected);
   assert.ok([...picker.options].some(o=>o.value==='example-chen'&&o.textContent.includes('原稿示例')));
   assert.ok([...picker.options].some(o=>o.value==='example-wang'&&o.textContent.includes('原稿示例')));
   assert.ok(host.querySelector('[data-route="/chat/'+selected+'"]'));
  }
  assert.equal(state.chats.length,0);assert.equal(state.agreements.length,0);
 }finally{env.cleanup();}
});
