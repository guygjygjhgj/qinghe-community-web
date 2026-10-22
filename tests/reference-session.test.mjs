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
 for(const route of ['/login?returnTo=%2Fpublish','/register']){
  const e=await setup(route,undefined,{reference:true,noAuthSession:true});try{assert.equal(e.routeNow(),route.includes('publish')?'/publish':'/me');assert.equal(document.querySelector('form[data-form=login]'),null);}finally{e.cleanup();}
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
