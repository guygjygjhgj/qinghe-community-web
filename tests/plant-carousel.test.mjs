import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,waitFor} from './helpers/browser.mjs';
import {initialState} from '../domain.js';
import {screens} from '../native-screens.js';
import {geometry} from '../native-geometry.js';
const fixture=()=>{const s=initialState();s.loggedIn=true;s.plants=['薄荷盆栽','番茄盆栽','桂花盆栽'].map((name,i)=>({id:'carousel-'+i,owner:'li',name,date:'2026-10-10',location:i===2?'客厅':'阳台',source:'自己种的',records:[],photo:i===2?'data:image/png;base64,aGVsbG8=':null}));s.plants.push({id:'other-owner',owner:'wang',name:'其他人的植物',records:[]});return s;};
const root=()=>document.querySelector('#main .native-canvas');
const photo=()=>root().querySelector('[data-name^="plant-photo／"]');
const active=()=>photo().dataset.route;
function pointer(env,type,target,x,y){const e=new env.w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,isPrimary:true,button:0,clientX:x,clientY:y});target.dispatchEvent(e);return e;}
function swipe(env,dx,dy=0,cancel=false){const target=photo();pointer(env,'pointerdown',target,350,800);const moved=pointer(env,'pointermove',target,350+dx,800+dy);pointer(env,cancel?'pointercancel':'pointerup',root(),350+dx,800+dy);return moved;}

test('left/right drags select actual saved plants, wrap, bind dates and persist selection',async()=>{
 const e=await setup('/me',fixture());try{
  assert.equal(active(),'/plant/carousel-0');swipe(e,-140);await waitFor(()=>active()==='/plant/carousel-1');
  assert.equal(document.querySelector('.native-plant-runtime-title').textContent,'番茄盆栽');
  assert.equal(root().querySelector('[data-name^="day1／"]').dataset.route,'/plant/carousel-1?date=2026-09-10');
  assert.equal(JSON.parse(e.w.sessionStorage.getItem('qinghe-form-recovery')).activePlantId,'carousel-1');
  swipe(e,140);await waitFor(()=>active()==='/plant/carousel-0');swipe(e,140);await waitFor(()=>active()==='/plant/carousel-2');
  assert.equal(document.querySelector('[data-node-id="11:1994"]').textContent,'客厅');assert.equal(photo().querySelector('img').getAttribute('src'),'data:image/png;base64,aGVsbG8=');
  assert.equal(e.stored().plants.length,4);assert.equal(e.routeNow(),'/me');
 }finally{e.cleanup();}
});

test('drag-generated clicks are swallowed after canvas replacement; a normal tap still opens the correct plant',async()=>{
 const e=await setup('/me',fixture());try{
  const oldPhoto=photo();swipe(e,-150);await waitFor(()=>active()==='/plant/carousel-1');
  oldPhoto.click();photo().click();assert.equal(e.routeNow(),'/me');
  await new Promise(r=>setTimeout(r,520));await e.click('[data-name^="plant-photo／"]');assert.equal(e.routeNow(),'/plant/carousel-1');
 }finally{e.cleanup();}
});

test('vertical movement, small drags, cancellation and nonprimary pointers do not change cards',async()=>{
 const e=await setup('/me',fixture());try{
  assert.equal(swipe(e,20,150).defaultPrevented,false);assert.equal(active(),'/plant/carousel-0');
  swipe(e,-40);assert.equal(active(),'/plant/carousel-0');assert.equal(root().querySelector('[data-native-plant-motion]').style.transform,'translateX(0px)');
  swipe(e,-200,0,true);assert.equal(active(),'/plant/carousel-0');
  const down=new e.w.Event('pointerdown',{bubbles:true});Object.assign(down,{pointerId:2,button:2,clientX:350,clientY:800});photo().dispatchEvent(down);
  assert.equal(swipe(e,0,100).defaultPrevented,false);assert.equal(active(),'/plant/carousel-0');
 }finally{e.cleanup();}
});

test('transferring touch capture from a photo to its canvas does not cancel the swipe',async()=>{
 const e=await setup('/me',fixture());try{
  const target=photo();pointer(e,'pointerdown',target,350,800);pointer(e,'pointermove',target,200,800);
  const lost=new e.w.Event('lostpointercapture',{bubbles:true});Object.assign(lost,{pointerId:1});target.dispatchEvent(lost);
  pointer(e,'pointerup',root(),200,800);await waitFor(()=>active()==='/plant/carousel-1');
 }finally{e.cleanup();}
});

test('side controls, keyboard and horizontal wheel switch cards; vertical wheel and month picker stay native',async()=>{
 const e=await setup('/me',fixture());try{
  await e.click('[data-name^="side-card-right／"]');assert.equal(active(),'/plant/carousel-1');
  photo().focus();photo().dispatchEvent(new e.w.KeyboardEvent('keydown',{bubbles:true,key:'ArrowRight',cancelable:true}));await waitFor(()=>active()==='/plant/carousel-2');assert.equal(document.activeElement,photo(),'keyboard focus survives replacement');
  document.activeElement.dispatchEvent(new e.w.KeyboardEvent('keydown',{bubbles:true,key:'ArrowRight',cancelable:true}));await waitFor(()=>active()==='/plant/carousel-0');
  document.activeElement.dispatchEvent(new e.w.KeyboardEvent('keydown',{bubbles:true,key:'ArrowLeft',cancelable:true}));await waitFor(()=>active()==='/plant/carousel-2');
  photo().dispatchEvent(new e.w.WheelEvent('wheel',{bubbles:true,deltaX:-70,deltaY:0,cancelable:true}));await waitFor(()=>active()==='/plant/carousel-1');
  photo().dispatchEvent(new e.w.WheelEvent('wheel',{bubbles:true,deltaX:-70,deltaY:0,cancelable:true}));assert.equal(active(),'/plant/carousel-1','trackpad inertia must not skip another card');
  const vertical=new e.w.WheelEvent('wheel',{bubbles:true,deltaY:90,cancelable:true});photo().dispatchEvent(vertical);assert.equal(vertical.defaultPrevented,false);
  const month=root().querySelector('[data-month-picker]');month.dispatchEvent(new e.w.KeyboardEvent('keydown',{bubbles:true,key:'ArrowRight'}));assert.equal(active(),'/plant/carousel-1');
  pointer(e,'pointerdown',month,350,800);pointer(e,'pointermove',month,100,800);pointer(e,'pointerup',root(),100,800);assert.equal(active(),'/plant/carousel-1');
 }finally{e.cleanup();}
});

test('reference-only and one saved card spring back without inventing records or navigating to add plant',async()=>{
 for(const s of [initialState(),{...fixture(),plants:fixture().plants.slice(0,1)}]){
  const e=await setup('/me',s);try{const original=active();swipe(e,-200);assert.equal(active(),original);await e.click('[data-name^="side-card-right／"]');assert.equal(e.routeNow(),'/me');assert.equal(e.stored().plants.length,s.plants.length);}finally{e.cleanup();}
 }
});

test('default card retains every original image, coordinate and text slot',async()=>{
 const e=await setup('/me',initialState());try{
  const source=screens.plants(),actual=root();
  for(const img of source.querySelectorAll('img')){const id=img.closest('[data-node-id]').dataset.nodeId,copy=actual.querySelector('[data-node-id="'+id+'"] img');assert.ok(copy,id);assert.equal(copy.getAttribute('src'),img.getAttribute('src'),id);assert.equal(copy.getAttribute('style'),img.getAttribute('style'),id);}
  for(const id of ['11:1950','11:1984','11:1985','11:1986','11:1989','11:1947','11:1948']){const el=actual.querySelector('[data-node-id="'+id+'"]'),g=geometry.plants.find(row=>row[0]===id);assert.equal(parseFloat(el.style.width),g[4]);assert.equal(parseFloat(el.style.height),g[5]);assert.equal(el.style.translate,g[2]+'px '+g[3]+'px');}
 }finally{e.cleanup();}
});

test('restored active plant remains selected when returning to my plants',async()=>{
 const e=await setup('/me',fixture(),{session:{'qinghe-form-recovery':{forms:{},activePlantId:'carousel-2'}}});try{assert.equal(active(),'/plant/carousel-2');await e.click('[data-name^="plant-photo／"]');assert.equal(e.routeNow(),'/plant/carousel-2');await e.click('[data-action=back]');assert.equal(active(),'/plant/carousel-2');}finally{e.cleanup();}
});
