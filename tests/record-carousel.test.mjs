import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,waitFor} from './helpers/browser.mjs';
import {initialState} from '../domain.js';
import {nativeRecordCards} from '../native-record-carousel.js';
import {screens} from '../native-screens.js';
const state=()=>({...initialState(),loggedIn:true});
const root=()=>document.querySelector('#main .native-canvas');
const card=()=>root().querySelector('[data-record-card]');
const key=()=>card().dataset.recordCard;
function pointer(e,type,target,x,y){const event=new e.w.Event(type,{bubbles:true,cancelable:true});Object.assign(event,{pointerId:1,button:0,isPrimary:true,clientX:x,clientY:y});target.dispatchEvent(event);return event;}
function swipe(e,dx,dy=0,cancel=false){const target=card().querySelector('[data-record-role=photo]');pointer(e,'pointerdown',target,350,900);const move=pointer(e,'pointermove',target,350+dx,900+dy);pointer(e,cancel?'pointercancel':'pointerup',root(),350+dx,900+dy);return move;}
const arrow=direction=>card().dispatchEvent(new window.KeyboardEvent('keydown',{key:direction,bubbles:true,cancelable:true}));
test('all records rotate share, help and seed designs, then retain additional records',()=>{
 const s=state();assert.deepEqual(nativeRecordCards(s,''),nativeRecordCards(s));assert.deepEqual(nativeRecordCards(s).map(c=>c.key),['post:scallion','post:pothos','reference:seed','post:tomato']);
 assert.deepEqual(nativeRecordCards(s).slice(0,3).map(c=>c.type),['share','help','seed']);assert.equal(nativeRecordCards(s)[2].reference,true);assert.equal(s.agreements.length,0);
 s.agreements.push({id:'mine',postId:'lettuce',sender:'chen',receiver:'li',status:'reserved'},{id:'cancelled',postId:'lettuce',sender:'chen',receiver:'li',status:'cancelled'},{id:'other',postId:'lettuce',sender:'chen',receiver:'wang',status:'reserved'});
 assert.deepEqual(nativeRecordCards(s,'seed').map(c=>c.key),['agreement:mine']);assert.deepEqual(nativeRecordCards(s).map(c=>c.key),['post:scallion','post:pothos','agreement:mine','post:tomato']);assert.ok(!nativeRecordCards(s).some(c=>c.key==='post:lettuce'));
});
test('record cards swipe across original share/help canvases, wrap and persist their selection',async()=>{
 const e=await setup('/me?tab=records&kind=',state());try{
  assert.equal(key(),'post:scallion');swipe(e,-140);await waitFor(()=>key()==='post:pothos');assert.equal(root().dataset.screen,'record-help');assert.equal(card().querySelector('[data-record-role=edit]').dataset.route,'/publish?post=pothos');
  swipe(e,-140);await waitFor(()=>key()==='reference:seed');assert.equal(root().dataset.screen,'record-seed');assert.equal(card().querySelector('[data-record-role=view]').dataset.route,'/post/lettuce');assert.equal(e.stored().agreements.length,0);
  swipe(e,140);await waitFor(()=>key()==='post:pothos');swipe(e,-140);await waitFor(()=>key()==='reference:seed');
  swipe(e,-140);await waitFor(()=>key()==='post:tomato');assert.equal(root().dataset.screen,'records');assert.equal(card().querySelector('.native-record-runtime-title').textContent,'我家的番茄红了');
  swipe(e,-140);await waitFor(()=>key()==='post:scallion');swipe(e,140);await waitFor(()=>key()==='post:tomato');assert.equal(e.routeNow(),'/me?tab=records&kind=');
  assert.equal(JSON.parse(e.w.sessionStorage.getItem('qinghe-form-recovery')).recordCarouselKeys.all,'post:tomato');
 }finally{e.cleanup();}
});
test('dragging a photo or edit button does not accidentally open a post or editor',async()=>{
 const e=await setup('/me?tab=records',state());try{
  const edit=card().querySelector('[data-record-role=edit]');pointer(e,'pointerdown',edit,350,900);pointer(e,'pointermove',edit,200,900);pointer(e,'pointerup',root(),200,900);await waitFor(()=>key()==='post:pothos');card().querySelector('[data-record-role=view]').click();assert.equal(e.routeNow(),'/me?tab=records');
  await new Promise(r=>setTimeout(r,520));await e.click('[data-record-role=view]');assert.equal(e.routeNow(),'/post/pothos');
 }finally{e.cleanup();}
});
test('vertical scrolling, short drags and pointer cancellation retain the current record',async()=>{
 const e=await setup('/me?tab=records',state());try{assert.equal(swipe(e,-10,120).defaultPrevented,false);assert.equal(key(),'post:scallion');swipe(e,-30);assert.equal(key(),'post:scallion');swipe(e,-200,0,true);assert.equal(key(),'post:scallion');assert.equal(root().querySelector('[data-native-record-motion]').style.transform,'translateX(0px)');}finally{e.cleanup();}
});
test('keyboard focus survives record type changes; filters remember independent selections',async()=>{
 const e=await setup('/me?tab=records',state());try{
  card().focus();arrow('ArrowRight');await waitFor(()=>key()==='post:pothos');assert.equal(document.activeElement.dataset.recordRole,'card');arrow('ArrowRight');await waitFor(()=>key()==='reference:seed');assert.equal(document.activeElement.dataset.recordRole,'card');arrow('ArrowRight');await waitFor(()=>key()==='post:tomato');
  let select=document.querySelector('[data-record-select]');select.value='share';select.dispatchEvent(new e.w.Event('change',{bubbles:true}));await waitFor(()=>e.routeNow()==='/me?tab=records&kind=share'&&key()==='post:scallion');arrow('ArrowLeft');await waitFor(()=>key()==='post:tomato');
  select=document.querySelector('[data-record-select]');select.value='';select.dispatchEvent(new e.w.Event('change',{bubbles:true}));await waitFor(()=>e.routeNow()==='/me?tab=records&kind='&&key()==='post:tomato');
 }finally{e.cleanup();}
});
test('the selected share edits, opens, likes and comments on its actual post',async()=>{
 for(const action of ['edit','view','comments','like']){
  const e=await setup('/me?tab=records',state(),{session:{'qinghe-form-recovery':{forms:{},recordCarouselKeys:{all:'post:tomato'}}}});try{
   const before=e.stored().posts.find(p=>p.id==='tomato').likes;await e.click('[data-record-role='+action+']');
   if(action==='like'){assert.equal(e.stored().posts.find(p=>p.id==='tomato').likes,before+1);assert.equal(e.stored().posts.find(p=>p.id==='scallion').likes,8);assert.equal(key(),'post:tomato');}
   else assert.equal(e.routeNow(),action==='edit'?'/publish?post=tomato':action==='comments'?'/post/tomato?comments=1':'/post/tomato');
  }finally{e.cleanup();}
 }
});
test('published seed cards and participation cards retain their distinct, correct actions',async()=>{
 const s=state();s.posts.push({id:'my-seed',author:'li',type:'seed',title:'桂花小苗',seedName:'桂花',quantity:3,exchange:'免费赠送',body:'自己育的桂花小苗。',photos:[],likes:0,comments:[],date:'今天'});s.agreements.push({id:'seed-real',postId:'lettuce',sender:'chen',receiver:'li',status:'reserved',date:'2026-10-18',time:'15:00',location:'社区花园'});
 const e=await setup('/me?tab=records&kind=seed',s);try{
  assert.equal(root().dataset.screen,'record-seed');assert.equal(key(),'post:my-seed');assert.equal(card().querySelector('[data-record-role=edit]').dataset.route,'/publish?post=my-seed');assert.equal(card().querySelector('[data-record-role=view]').dataset.route,'/post/my-seed');
  arrow('ArrowRight');await waitFor(()=>key()==='agreement:seed-real');assert.equal(card().querySelector('[data-record-role=view]').dataset.route,'/chat/seed-real');assert.equal(card().querySelector('[data-record-role=contact]').dataset.route,'/chat/seed-real');await e.click('[data-record-role=view]');assert.equal(e.routeNow(),'/chat/seed-real');assert.notEqual(root().dataset.screen,'network');
 }finally{e.cleanup();}
});
test('original share card keeps every image source and style, and preserves its default visible copy',async()=>{
 const e=await setup('/me?tab=records',state());try{
  const source=screens.records().querySelector('[data-name="记录卡片"]');for(const img of source.querySelectorAll('img')){const id=img.closest('[data-node-id]').dataset.nodeId,copy=card().querySelector('[data-node-id="'+id+'"] img');assert.ok(copy,id);assert.equal(copy.getAttribute('src'),img.getAttribute('src'),id);assert.equal(copy.getAttribute('style'),img.getAttribute('style'),id);}
  assert.equal(card().textContent,source.textContent);assert.equal(card().style.width,'702.1875px');assert.equal(card().style.height,'510px');
 }finally{e.cleanup();}
});
test('empty-category source examples do not invent agreements or expose editing other users posts',async()=>{
 const s=state();s.userId='wang';const e=await setup('/me?tab=records&kind=help',s);try{assert.equal(key(),'reference:help');await e.click('[data-record-role=edit]');assert.equal(e.routeNow(),'/publish?type=help');assert.equal(e.stored().agreements.length,0);}finally{e.cleanup();}
});
