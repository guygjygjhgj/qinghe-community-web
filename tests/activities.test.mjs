import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,waitFor} from './helpers/browser.mjs';
import {initialState,bookActivity} from '../domain.js';
import {readActivityFilter,matchesActivity,activityFilterDefaults} from '../native-activities.js';
const state=()=>({...initialState(),loggedIn:true});
const node=id=>'[data-node-id="'+id+'"]';
const isHidden=id=>document.querySelector(node(id)).hidden;

test('filter defaults agree with the source selected bubbles; week means Monday through Sunday',()=>{
 assert.deepEqual(readActivityFilter(new URLSearchParams()),activityFilterDefaults);
 assert.deepEqual(readActivityFilter(new URLSearchParams('kind=bogus&time=bogus&status=bogus')),activityFilterDefaults);
 const s=state(),a=s.activities.find(a=>a.id==='vegetable-day'),now=new Date(2026,9,15,12),f={time:'week',kind:'all',status:'all'};
 for(const [date,expected]of [['2026-10-11',false],['2026-10-12',true],['2026-10-18',true],['2026-10-19',false]]){a.date=date;assert.equal(matchesActivity(s,a.id,f,now),expected,date);}
 a.date='2026-09-30';assert.equal(matchesActivity(s,a.id,{...f,time:'month'},now),false);
 a.date='2026-10-01';assert.equal(matchesActivity(s,a.id,{...f,time:'month'},now),true);
 a.date='2026-10-14';assert.equal(matchesActivity(s,a.id,{...f,time:'all',status:'available'},now),false);
});

test('both source card backgrounds, pictures, titles and detail buttons open the matching activity',async()=>{
 for(const [id,target]of [['39:2184','vegetable-day'],['39:2185','vegetable-day'],['39:2186','vegetable-day'],['39:2193','vegetable-day'],['39:2194','vegetable-day'],['39:2196','vegetable-meeting'],['39:2197','vegetable-meeting'],['39:2198','vegetable-meeting'],['39:2204','vegetable-meeting']]){
  const e=await setup('/activities',state());try{await e.click(node(id));assert.equal(e.routeNow(),'/activity/'+target);assert.equal(document.querySelector(node('3:6145')).textContent,'社区活动');}finally{e.cleanup();}
 }
});

test('filter opening, draft choice, mask/close/Escape and reopening retain applied conditions',async()=>{
 const route='/activities?filter=0&time=month&kind=all&status=all',e=await setup(route,state());
 try{
  await e.click('[data-action=filter]');assert.equal(document.querySelector('form').elements.namedItem('time').value,'month');
  await e.click('[data-action=filter-choice][data-key=status][data-value=mine]');
  await e.click(node('39:2209'));assert.equal(e.routeNow(),route);
  await e.click('[data-action=filter]');assert.equal(document.querySelector('form').elements.namedItem('status').value,'all');
  await e.click(node('39:2206'));assert.equal(e.routeNow(),route);
  await e.click('[data-action=filter]');document.body.dispatchEvent(new e.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await waitFor(()=>e.routeNow()===route);
  assert.ok(!document.querySelector(node('39:2206')));
 }finally{e.cleanup();}
});

test('selection, reset, apply and direct reload use the same filter predicate',async()=>{
 const s=state();bookActivity(s,'vegetable-day');const e=await setup('/activities?filter=1',s);
 try{
  await e.click('[data-action=filter-choice][data-key=status][data-value=mine]');await e.submit('filter');
  assert.equal(isHidden('39:2184'),false);assert.equal(isHidden('39:2196'),true);
  await e.click('[data-action=filter]');assert.equal(document.querySelector('form').elements.namedItem('status').value,'mine');
  await e.click('[data-action=native-reset-filter]');for(const k of ['time','kind','status'])assert.equal(document.querySelector('form').elements.namedItem(k).value,'all');
  await e.submit('filter');assert.equal(isHidden('39:2184'),false);assert.equal(isHidden('39:2196'),false);
 }finally{e.cleanup();}
 const reload=await setup('/activities?filter=0&time=all&kind=all&status=mine',s);try{assert.equal(isHidden('39:2184'),false);assert.equal(isHidden('39:2196'),true);}finally{reload.cleanup();}
});

test('no-match results announce recovery and the original heading can reopen filtering',async()=>{
 const e=await setup('/activities?filter=1',state());try{await e.click('[data-action=filter-choice][data-key=kind][data-value="认知小游戏"]');await e.submit('filter');assert.equal(document.querySelector('.native-canvas').dataset.activityResults,'0');assert.match(document.querySelector('#toast').textContent,/没有符合条件/);await e.click(node('39:2178'));assert.equal(document.querySelector('form').elements.namedItem('kind').value,'认知小游戏');}finally{e.cleanup();}
});

test('booking on the second source card updates its own count, date, pin, bubble and cancel background',async()=>{
 const s=state(),e=await setup('/activity/vegetable-meeting',s);
 try{
  assert.equal(document.querySelector(node('3:6151')).textContent,'2人');await e.click('[data-action=book]');
  assert.equal(document.querySelector(node('11:1855')).textContent,'1');assert.equal(document.querySelector(node('11:1861')).textContent,'10月25日');
  assert.equal(document.querySelector(node('11:1862')).textContent,'14:00—15:30');assert.equal(document.querySelector(node('11:1863')).textContent,'青禾社区 · 活动中心');
  await e.click(node('11:1859'));assert.equal(e.clipboard(),'青禾社区 · 活动中心');
  await e.click(node('11:1876'));assert.match(document.querySelector('#toast').textContent,/已报名/);
  await e.click(node('11:1920'));assert.equal(document.querySelector('.native-canvas').dataset.screen,'activity');assert.equal(document.querySelector(node('3:6151')).textContent,'2人');assert.equal(e.stored().bookings.length,0);
 }finally{e.cleanup();}
});

test('full and ended states retain the selected activity data and prevent booking',async()=>{
 const full=state();full.activities.find(a=>a.id==='vegetable-meeting').otherBooked=20;
 let e=await setup('/activity/vegetable-meeting',full);try{assert.equal(document.querySelector('.native-canvas').dataset.screen,'activity-full');assert.equal(document.querySelector(node('3:5736')).textContent,'10月25日 14:00—15:30');await e.click(node('3:5805'));assert.equal(e.stored().bookings.length,0);assert.match(document.querySelector('#toast').textContent,/已满/);}finally{e.cleanup();}
 const ended=state();ended.activities.find(a=>a.id==='vegetable-day').date='2000-01-01';e=await setup('/activity/vegetable-day',ended);try{assert.equal(document.querySelector(node('3:6215')).textContent,'活动已结束');await e.click('[data-action=book]');assert.equal(e.stored().bookings.length,0);assert.match(document.querySelector('#toast').textContent,/结束/);}finally{e.cleanup();}
});

test('list calendar and location icons use their own activity, with the correct downloadable event',async()=>{
 const e=await setup('/activities',state()),original=URL.createObjectURL;let blob,filename;
 try{
  URL.createObjectURL=b=>{blob=b;return 'blob:activity-test';};e.w.HTMLAnchorElement.prototype.click=function(){filename=this.download;};
  await e.click(node('39:2201'));assert.equal(filename,'阳台蔬菜交流会.ics');assert.match(await blob.text(),/20261025T140000/);assert.match(await blob.text(),/青禾社区 · 活动中心/);
  await e.click(node('39:2205'));assert.equal(e.clipboard(),'青禾社区 · 活动中心');
  await e.click(node('39:2185'));await e.click('[data-action=activity-info][data-kind=step]');assert.match(document.querySelector('#toast').textContent,/认识香草/);
 }finally{URL.createObjectURL=original;e.cleanup();}
});

test('the current-community checkbox, its caption and check glyph toggle the real submitted filter',async()=>{
 const e=await setup('/activities?filter=1',state());try{
  await e.click(node('39:2259'));assert.equal(document.querySelector('form').elements.namedItem('community').value,'all');assert.equal(document.querySelector(node('39:2248')).getAttribute('aria-checked'),'false');
  await e.submit('filter');assert.match(e.routeNow(),/community=all/);
  await e.click('[data-action=filter]');assert.equal(document.querySelector('form').elements.namedItem('community').value,'all');
  await e.click(node('39:2249'));assert.equal(document.querySelector('form').elements.namedItem('community').value,'current');
  const box=document.querySelector(node('39:2248'));box.dispatchEvent(new e.w.KeyboardEvent('keydown',{key:' ',bubbles:true}));await waitFor(()=>document.querySelector('form').elements.namedItem('community').value==='all');
 }finally{e.cleanup();}
});
