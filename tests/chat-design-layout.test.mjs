import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {setup} from './helpers/browser.mjs';
import {initialState} from '../domain.js';
import {createViews,alignNativeLayers} from '../native-views.js';
import {geometry} from '../native-geometry.js';
const assets=JSON.parse(readFileSync(new URL('../assets.json',import.meta.url)));

test('shared direct chat retains the source composer art and does not move its arrow into removed agreement sections',async()=>{
 const state=initialState();state.loggedIn=true;
 const env=await setup('/',state);
 try{
  state.cloud=true;state.conversations=[{id:'real-chat',peerId:'chen'}];
  state.users.chen.name='一位昵称比较长的邻居';
  const long='这是一段需要换行的真实长消息。'.repeat(12);
  state.chats=[{id:'long-message',conversation:'real-chat',author:'li',text:long}];
  const views=createViews(()=>state,assets,''),host=document.createElement('div');
  host.innerHTML=views.render('/chat/real-chat',{forms:{},selected:new Set()}).html;
  const root=host.firstElementChild;
  assert.equal(root.dataset.chatKind,'direct');
  assert.equal(root.querySelector('[data-node-id="11:1215"]').dataset.chatTitle,'true');
  assert.equal(root.querySelector('.chat-message [data-chat-bubble]').textContent,long);
  assert.equal(root.querySelector('.chat-history').style.height,'auto');
  assert.equal(root.querySelectorAll('.chat-message [data-chat-bubble]>p').length,1);
  for(const image of root.querySelectorAll('[data-node-id="11:1279"] img'))assert.ok(statSync(new URL('../'+image.getAttribute('src'),import.meta.url)).size>0);
  const arrow=root.querySelector('[data-node-id="11:1284"]'),source=geometry.chat.find(r=>r[0]==='11:1284');
  const removed=802.478+394.679;
  root.getBoundingClientRect=()=>({x:0,y:0,width:750,height:1142.492});
  arrow.getBoundingClientRect=()=>({x:source[2],y:source[3]-removed,width:source[4],height:source[5]});
  arrow.style.translate='0px 0px';
  alignNativeLayers(root);
  assert.equal(arrow.style.translate,'0px 0px','the arrow stays inside its source send button');
  assert.equal(root.querySelector('[data-node-id="11:1215"]').style.width,'550px');
 }finally{env.cleanup();}
});
