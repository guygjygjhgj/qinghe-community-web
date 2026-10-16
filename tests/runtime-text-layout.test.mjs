import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setup} from './helpers/browser.mjs';
import {initialState} from '../domain.js';
import {createViews,alignNativeLayers} from '../native-views.js';
import {geometry} from '../native-geometry.js';
const assets=JSON.parse(readFileSync(new URL('../assets.json',import.meta.url)));

test('real notifications occupy their author, message, quote and date slots without squeezing multiple lines together',async()=>{
 const state=initialState();state.loggedIn=true;const env=await setup('/',state);
 try{
  state.cloud=true;state.users.chen.name='互聊监测验收B';state.conversations=[{id:'real-chat',peerId:'chen'}];
  state.messages=Array.from({length:3},(_,i)=>({id:'notice-'+i,kind:'chat',title:'互聊监测验收B发来消息',text:'这是一条超过原稿单行长度的真实聊天消息。'.repeat(4),createdAt:new Date('2026-10-16T01:52:00Z').getTime(),read:true,route:'/chat/real-chat'}));
  const host=document.createElement('div');host.innerHTML=createViews(()=>state,assets,'').render('/messages',{forms:{},selected:new Set()}).html;
  const root=host.firstElementChild,at=id=>root.querySelector('[data-node-id="'+id+'"]');
  assert.equal(at('11:1712').textContent,'互聊监测验收B');
  assert.equal(at('11:1713').textContent,state.messages[0].text);
  assert.equal(at('11:1706').textContent,'邻居私聊');
  assert.equal(at('11:1747').textContent,'发来新消息');
  assert.match(at('11:1748').textContent,/^\d{2}:\d{2}$/);
  assert.equal(at('11:1750').textContent,'10/16');
  alignNativeLayers(root);
  for(const id of ['11:1712','11:1713','11:1706','11:1730','11:1731','11:1746','11:1747']){
   const el=at(id),source=geometry.messages.find(r=>r[0]===id);
   assert.equal(el.style.whiteSpace,'nowrap',id);
   assert.equal(el.style.overflowY,'hidden',id);
   assert.equal(el.style.textOverflow,'ellipsis',id);
   assert.equal(el.style.lineHeight,source[5]+'px',id+' retains one original text line');
   assert.equal(el.style.height,source[5]+'px');
   assert.equal(el.title,el.textContent,'the full text remains available');
  }
  assert.equal(at('11:1698').dataset.id,'notice-0');
  assert.equal(at('11:1716').dataset.id,'notice-1');
  assert.equal(at('11:1734').dataset.id,'notice-2');
 }finally{env.cleanup();}
});

test('feed names, type pills and activity titles retain source single lines and plus artwork',async()=>{
 const state=initialState();state.loggedIn=true;const env=await setup('/',state);
 try{
  state.cloud=true;state.conversations=[];state.posts.forEach(p=>p.sample=true);
  const views=createViews(()=>state,assets,'');
  for(const [route,screen,ids,key]of [
   ['/community','circle',['11:1641','11:1635','11:1628'],'mint'],
   ['/community?tab=near','circle-near',['3:5627','I3:5611;3:5670','I3:5612;3:5664'],'lettuce'],
   ['/','home',['11:1494','11:1516','11:1496','11:1518'],null]
  ]){
   const host=document.createElement('div');host.innerHTML=views.render(route,{forms:{},selected:new Set(),cloudFeedKeys:{[screen]:key}}).html;const root=host.firstElementChild;
   alignNativeLayers(root);
   for(const id of ids){const el=root.querySelector('[data-node-id="'+id+'"]');assert.equal(el.style.whiteSpace,'nowrap',id+' stays on one source line');}
   if(key){const plus=root.querySelector('[data-name="follow-plus／独立生成图片"],[data-name="icon-follow-plus"]');assert.ok(plus.querySelector('img'),'source plus is not replaced by text');assert.equal(plus.textContent,'');}
   else{assert.equal(root.querySelector('[data-node-id="11:1495"]').textContent,'10月18日 09:00');assert.equal(root.querySelector('[data-node-id="11:1517"]').textContent,'10月25日');}
  }
 }finally{env.cleanup();}
});
