import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {setup,waitFor} from '../helpers/browser.mjs';
import {initialState,STORAGE_KEY} from '../../domain.js';
import {normalizeRoute,loginReturn,fallbackBack} from '../../routing.js';
import {createViews} from '../../native-views.js';

const root=new URL('../../',import.meta.url);
test('returnTo stays internal; direct detail links have a useful back destination',()=>{
 assert.equal(normalizeRoute('//example.com'),'/');
 assert.equal(normalizeRoute('/activity/herbs/'),'/activity/herbs');
 assert.equal(loginReturn('/login?returnTo=https%3A%2F%2Fexample.com'),'/me');
 assert.equal(loginReturn('/login?returnTo=%2Flogin'),'/me');
 assert.equal(loginReturn('/login?returnTo=%2Fpublish%3Fdraft%3Ddraft-help'),'/publish?draft=draft-help');
 assert.equal(fallbackBack('/activity/herbs'),'/activities');
 assert.equal(fallbackBack('/plant/p1/record'),'/plant/p1');
});

test('login returns to the selected activity; booking and cancellation update the same activity',async()=>{
 const t=await setup('/activity/repot');
 await t.click('[data-action="book"]');assert.match(t.routeNow(),/^\/login\?returnTo=/);
 await t.click('[data-action="demo-login"]');assert.equal(t.routeNow(),'/activity/repot');
 await t.click('[data-action="book"]');assert.equal(t.stored().bookings[0].activityId,'repot');
 await t.click('[data-action="cancel-booking"]');await t.click('[data-action="confirm-cancel-booking"]');
 assert.equal(t.stored().bookings.length,0);assert.equal(t.routeNow(),'/activity/repot');
 await t.click('[data-action="back"]');assert.equal(t.routeNow(),'/activities');t.cleanup();
});

test('publish -> preview -> success -> actual post; new post appears in community and records',async()=>{
 const state=initialState();state.loggedIn=true;const t=await setup('/publish',state);
 t.fill('publish','title','自动回归：阳台新叶');t.fill('publish','body','今天长出了两片新叶。');
 await t.click('[data-action="preview"]');await t.click('[data-action="publish-preview"]');
 const post=t.stored().posts.find(p=>p.title==='自动回归：阳台新叶');assert.ok(post);assert.equal(t.routeNow(),'/success/'+post.id);
 await t.click('[data-route="/post/'+post.id+'"]');assert.match(t.w.document.querySelector('#main').textContent,/今天长出了两片新叶/);
 await t.click('[data-route="/community"]');assert.ok(t.w.document.querySelector('[data-route="/post/'+post.id+'"]'));
 await t.click('[data-route="/me"]');await t.click('[data-route="/me?tab=records"]');assert.ok(t.w.document.querySelector('[data-route="/post/'+post.id+'"]'));t.cleanup();
});

test('draft exit persists contents; resume updates one post and removes only its source draft',async()=>{
 const state=initialState();state.loggedIn=true;const t=await setup('/publish',state);
 t.fill('publish','title','回归草稿');t.fill('publish','body','尚未发布的文字');
 await t.click('[data-route="/me"]');assert.ok(t.w.document.querySelector('[data-action="save-exit"]'));
 await t.click('[data-action="save-exit"]');assert.equal(t.routeNow(),'/me');
 const draft=t.stored().drafts.find(d=>d.title==='回归草稿');assert.ok(draft);
 await t.click('[data-route="/drafts"]');await t.click('[data-route="/publish?draft='+draft.id+'"]');
 assert.equal(t.w.document.querySelector('[name="body"]').value,'尚未发布的文字');
 await t.submit('publish');assert.ok(!t.stored().drafts.some(d=>d.id===draft.id));assert.equal(t.stored().drafts.length,2);t.cleanup();
});

test('add a plant -> first record -> detail -> my plants all use the new identifier',async()=>{
 const state=initialState();state.loggedIn=true;const t=await setup('/plant/new',state);
 t.fill('plant','name','回归薄荷');await t.submit('plant');
 const plant=t.stored().plants.find(p=>p.name==='回归薄荷');assert.ok(plant);assert.equal(t.routeNow(),'/plant/'+plant.id+'/success');
 await t.click('[data-route="/plant/'+plant.id+'/record"]');t.fill('record','body','长出了新芽');await t.submit('record');
 assert.equal(t.routeNow(),'/plant/'+plant.id);assert.equal(t.stored().plants[0].records[0].body,'长出了新芽');
 await t.click('[data-route="/me"]');assert.ok(t.w.document.querySelector('[data-route="/plant/'+plant.id+'"]'));t.cleanup();
});

test('seed request creates a real agreement; both confirmations unlock source-to-plant flow',async()=>{
 const state=initialState();state.loggedIn=true;const t=await setup('/post/lettuce',state);
 await t.click('[data-action="request-seed"]');const agreement=t.stored().agreements[0];assert.ok(agreement);assert.equal(t.routeNow(),'/chat/'+agreement.id);
 await t.click('[data-action="reserve"]');assert.equal(t.stored().agreements[0].status,'reserved');
 await t.click('[data-action="handoff"][data-role="receiver"]');await t.click('[data-action="confirm-handoff"]');
 await t.click('[data-action="handoff"][data-role="sender"]');await t.click('[data-action="confirm-handoff"]');
 assert.equal(t.stored().agreements[0].status,'completed');assert.ok(t.w.document.querySelector('[data-route^="/plant/new?name="]'));
 await t.click('[data-route^="/plant/new?name="]');assert.equal(t.w.document.querySelector('[name="name"]').value,'生菜种子');t.cleanup();
});

test('search renders the actual query results; favorites follow actual saved IDs',async()=>{
 const state=initialState();state.loggedIn=true;state.favorites=['post:pothos'];const t=await setup('/search?q=香草&type=activities',state);
 assert.ok(t.w.document.querySelector('[data-route="/activity/herbs"]'));assert.ok(!t.w.document.querySelector('[data-route="/post/scallion"]'));
 await t.click('[data-route="/me"]');await t.click('[data-route="/favorites"]');assert.ok(t.w.document.querySelector('[data-route="/post/pothos"]'));assert.ok(!t.w.document.querySelector('[data-route="/post/mint"]'));t.cleanup();
});

test('missing content and stale draft links show recovery instead of a wrong example or a blank page',async()=>{
 for(const route of ['/activity/missing','/plant/missing','/chat/seed-demo','/post/missing','/publish?draft=undefined','/settings/missing','/not-a-page']){
  const t=await setup(route);assert.match(t.w.document.querySelector('#main').textContent,/找不到/);t.cleanup();
 }
});

test('filter confirmation and closing a tutorial preserve back history without duplicate modal entries',async()=>{
 const state=initialState();state.loggedIn=true;const t=await setup('/activities',state);
 await t.click('[data-action="filter"]');const f=t.w.document.querySelector('form[data-form="filter"]');f.elements.namedItem('status').value='mine';await t.submit('filter');
 assert.match(t.routeNow(),/status=mine/);assert.match(t.w.document.querySelector('#main').textContent,/当前条件下没有活动/);
 await t.click('[data-action="back"]');assert.equal(t.routeNow(),'/activities');t.cleanup();
});

test('browser back from a dirty editor can continue or discard without duplicating previous pages',async()=>{
 const state=initialState();state.loggedIn=true;const t=await setup('/community',state);
 await t.click('[data-route="/publish"]');t.fill('publish','body','仍在编辑的内容');
 t.w.history.back();await delay(80);assert.ok(t.w.document.querySelector('[data-action="discard-exit"]'));
 await t.click('[data-action="close"]');assert.equal(t.routeNow(),'/publish');assert.equal(t.w.document.querySelector('[name="body"]').value,'仍在编辑的内容');
 await t.click('[data-action="back"]');await t.click('[data-action="discard-exit"]');await waitFor(()=>t.routeNow()==='/community');assert.equal(t.routeNow(),'/community');
 assert.equal(t.w.history.state?.from,undefined);await t.click('[data-route="/"]');assert.equal(t.routeNow(),'/');t.cleanup();
});

test('photo and form text survive the login return before a plant is saved',async()=>{
 const t=await setup('/plant/new');t.fill('plant','name','登录前的植物');
 const upload=t.w.document.querySelector('[data-upload-target="plant"]');
 Object.defineProperty(upload,'files',{value:[new t.w.File(['photo'],'plant.png',{type:'image/png'})]});
 upload.dispatchEvent(new t.w.Event('change',{bubbles:true}));await delay(60);
 await t.submit('plant');assert.match(t.routeNow(),/^\/login/);await t.click('[data-action="demo-login"]');
 assert.equal(t.w.document.querySelector('[name="name"]').value,'登录前的植物');await t.submit('plant');assert.match(t.stored().plants[0].photo,/^data:image\/png/);t.cleanup();
});

test('font page, community aliases, message categories and seasonal home entry resolve to their own content',async()=>{
 for(const [route,pattern] of [['/settings/font',/应用字号/],['/community?tab=info',/植物小课堂/],['/messages?tab=seed',/这里暂时没有消息/],['/article/chrysanthemum',/菊花花礼/]]){
  const t=await setup(route);assert.match(t.w.document.querySelector('#main').textContent,pattern);t.cleanup();
 }
});

test('offline local publishing succeeds because it does not depend on a remote service',async()=>{
 const state=initialState();state.loggedIn=true;const t=await setup('/publish',state);
 Object.defineProperty(t.w.navigator,'onLine',{value:false});t.fill('publish','title','离线发布');t.fill('publish','body','本设备仍可保存。');await t.submit('publish');
 assert.ok(t.stored().posts.find(p=>p.title==='离线发布'));assert.match(t.routeNow(),/^\/success\//);t.cleanup();
});

test('all operational pages generate links to existing content without fixed demo identifiers or duplicate form fields',async()=>{
 const state=initialState();state.loggedIn=true;
 state.plants.push({id:'p1',owner:'li',name:'薄荷',date:'2026-10-13',location:'阳台',source:'自己种的',photo:'plant-new:img2',records:[]});
 state.agreements.push({id:'a1',postId:'lettuce',sender:'chen',receiver:'li',status:'completed',date:'2026-10-18',time:'15:00',location:'社区花园',senderConfirmed:true,receiverConfirmed:true});
 const t=await setup('/me',state),view=createViews(()=>state,JSON.parse(readFileSync(new URL('assets.json',root),'utf8')),readFileSync(new URL('home-scene.html',root),'utf8'));
 const vm={composer:{type:'share',title:'',body:'',photos:[]},forms:{},manage:false,selected:new Set(),feedbackPhotos:[]};
 const routes=['/','/community','/community?tab=articles','/following','/following?tab=neighbors','/me','/me?tab=records','/records','/plant/new','/plant/p1','/plant/p1/record','/plant/p1/success','/publish','/success/scallion','/post/scallion','/post/pothos','/post/lettuce','/search?q=番茄','/favorites','/drafts','/activities','/activity/herbs','/messages','/chat/a1','/chat/neighbor-chen','/article/tomato-story','/article/chrysanthemum','/profile/edit','/feedback','/help','/settings','/settings/privacy','/settings/speech','/settings/font','/settings/notifications','/login','/topic/balcony'];
 for(const route of routes){
  const container=t.w.document.createElement('div');container.innerHTML=view.render(route,vm).html;
  assert.ok(!container.textContent.includes('找不到'),route);
  for(const el of container.querySelectorAll('[data-route]')){
   const target=el.dataset.route;assert.ok(!/undefined|seed-demo|mint-reference/.test(target),route+' -> '+target);
   const url=new URL(target,'https://qinghe.local'),parts=url.pathname.split('/').filter(Boolean);
   if(['post','success','plant','activity','article','neighbor'].includes(parts[0])&&parts[1]&&!(parts[0]==='plant'&&parts[1]==='new')){
    const key={post:'posts',success:'posts',plant:'plants',activity:'activities',article:'articles',neighbor:'users'}[parts[0]];
    assert.ok(key==='users'?state.users[parts[1]]:state[key].some(item=>item.id===parts[1]),route+' -> missing '+target);
   }
   if(url.pathname==='/publish'&&url.searchParams.has('draft'))assert.ok(state.drafts.some(d=>d.id===url.searchParams.get('draft')));
  }
  for(const form of container.querySelectorAll('form')){
   const names=[...form.elements].filter(el=>el.name&&el.type!=='checkbox').map(el=>el.name);
   assert.equal(names.length,new Set(names).size,'Duplicate fields on '+route);
  }
 }
 t.cleanup();
});
