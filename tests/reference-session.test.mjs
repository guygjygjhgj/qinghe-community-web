import test from 'node:test';import assert from 'node:assert/strict';
import {initialState,STORAGE_KEY,Store} from '../domain.js';
import {REFERENCE_STORAGE_KEY,referenceStorage,useReferenceIdentity,referenceRoute} from '../reference-session.js';
import {setup} from './helpers/browser.mjs';

test('Li example uses separate persistent data without importing or changing authenticated residents',()=>{
 const values=new Map([[STORAGE_KEY,JSON.stringify({...initialState(),userId:'private-resident',loggedIn:true,cloud:true,privateNote:'existing private account'})]]),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const original=values.get(STORAGE_KEY),store=new Store(referenceStorage(storage));useReferenceIdentity(store.data);
 assert.equal(store.data.userId,'li');assert.equal(store.data.users.li.name,'李阿姨');assert.equal(store.data.cloud,false);assert.equal(store.data.privateNote,undefined);
 store.commit(s=>{s.posts[0].body='留在示例资料中的新记录';});
 assert.equal(values.get(STORAGE_KEY),original);assert.ok(values.has(REFERENCE_STORAGE_KEY));
 const reopened=useReferenceIdentity(new Store(referenceStorage(storage)).data);assert.equal(reopened.posts[0].body,'留在示例资料中的新记录');assert.equal(reopened.userId,'li');
});

test('public pages open as Li without restoring a login or contacting account services',async()=>{
 for(const route of ['/','/messages','/me','/me?tab=records&kind=']){
  let authRequests=0;const e=await setup(route,initialState(),{reference:true,noAuthSession:true,authFetch:async()=>{authRequests++;throw Error('No account request expected');}});try{
   assert.equal(e.routeNow(),route);assert.equal(document.querySelector('form[data-form=login]'),null);assert.equal(document.querySelector('#cognitive-frame'),null);assert.equal(authRequests,0);assert.ok(!document.querySelector('#main').textContent.includes('游客'));
   if(route==='/me')assert.match(document.querySelector('#main').textContent,/李阿姨/);
   if(route==='/messages')assert.equal(document.querySelector('[data-node-id="11:1784"]').textContent,'李阿姨');
  }finally{e.cleanup();}
 }
});

test('old login and registration links continue to the requested page without a login screen',async()=>{
 assert.equal(referenceRoute('/login?returnTo=%2Fmessages'),'/messages');assert.equal(referenceRoute('/register'),'/me');assert.equal(referenceRoute('/login?returnTo=%2Flogin'),'/me');
 for(const route of ['/login?returnTo=%2Fpublish','/register','/login?method=quick','/design/login','/design/one-click-login','/register?returnTo=%2Fdesign%2Flogin','/design/login?returnTo=%2Fdesign%2Fone-click-login']){
  const e=await setup(route,undefined,{reference:true,noAuthSession:true});try{assert.equal(e.routeNow(),route.includes('publish')?'/publish':'/me');assert.equal(document.querySelector('form[data-form=login]'),null);}finally{e.cleanup();}
 }
});

test('public business pages never require account services or reveal account entry controls',async()=>{
 const routes=['/community','/community?tab=near','/community?tab=info','/publish','/publish?type=help','/publish?type=seed','/plant/new','/plant/mint-reference','/plant/mint-reference/record','/post/scallion','/post/pothos','/post/lettuce','/messages','/chat/seed-demo','/activities','/activity/herbs','/me','/me?tab=records','/favorites','/drafts','/profile/edit','/following','/search','/settings','/settings/font','/settings/notifications','/settings/speech','/help','/feedback'];
 for(const route of routes){
  let calls=0;const e=await setup(route,undefined,{reference:true,noAuthSession:true,authFetch:async()=>{calls++;throw Error('Account service must stay unused');}});
  try{
   assert.equal(e.routeNow(),route);assert.equal(calls,0);assert.equal(document.querySelector('form[data-form=login]'),null);
   const visible=el=>!el.closest('[hidden]');
   for(const el of document.querySelectorAll('[data-action="logout"],[data-action="demo-login"],[data-action="get-code"],[data-route="/login"],[data-route="/register"]'))assert.equal(visible(el),false,route);
   const copy=[...document.querySelectorAll('#main p,#main span,#main button,#main a')].filter(visible).map(el=>el.textContent).join(' ');
   assert.doesNotMatch(copy,/登录|注册|游客/,route);
  }finally{e.cleanup();}
 }
});

test('liking, personal editing and message navigation work without authentication and preserve original screen geometry',async()=>{
 const e=await setup('/post/scallion',undefined,{reference:true,noAuthSession:true});try{
  const root=document.querySelector('.native-canvas'),geometry=[root.style.width,root.style.height],before=document.querySelector('[data-action=like]').getAttribute('aria-pressed');
  await e.click('[data-action=like]');assert.equal(e.routeNow(),'/post/scallion');assert.deepEqual([document.querySelector('.native-canvas').style.width,document.querySelector('.native-canvas').style.height],geometry);
  const saved=JSON.parse(e.w.localStorage.getItem(REFERENCE_STORAGE_KEY));assert.equal(saved.userId,'li');assert.ok(saved.liked.includes('scallion'));assert.notEqual(document.querySelector('[data-action=like]').getAttribute('aria-pressed'),before);
  e.w.location.hash='#/profile/edit';await new Promise(r=>setTimeout(r,80));e.fill('profile','name','李阿姨');await e.submit('profile');assert.equal(e.routeNow(),'/me');assert.match(document.querySelector('#main').textContent,/李阿姨/);
  e.w.location.hash='#/messages';await new Promise(r=>setTimeout(r,80));assert.equal(e.routeNow(),'/messages');assert.equal(document.querySelector('form[data-form=login]'),null);
 }finally{e.cleanup();}
});
