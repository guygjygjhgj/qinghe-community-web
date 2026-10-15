import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setup,waitFor} from './helpers/browser.mjs';
import {initialState} from '../domain.js';
const state=()=>({...initialState(),loggedIn:true});

test('home seasonal icon opens the new source page and keeps the leisure block independent',async()=>{
 const env=await setup('/',state());try{
  await env.click('[data-node-id="11:1470"]');assert.equal(env.routeNow(),'/seasonal');
  assert.equal(document.querySelector('.native-canvas').dataset.screen,'seasonal');
  assert.equal(document.querySelector('.native-canvas').style.width,'750px');
  assert.equal(document.querySelector('.native-canvas').style.height,'1532.3426513671875px');
  const cards=document.querySelectorAll('[data-name^=game][data-name$="-card"]');assert.equal(cards.length,5);
  assert.deepEqual([...cards].map(c=>c.dataset.route),['osmanthus','cotton','luffa','corn','ginkgo'].map(g=>'/games/'+g));
  assert.equal(document.querySelector('[data-scroll-region=seasonal-games]').style.overflowX,'auto');
  assert.equal(document.querySelector('[data-game-select]').options.length,6);
  assert.equal(document.querySelectorAll('img').length,46);
  await env.click('[data-name="导航/首页"]');assert.equal(env.routeNow(),'/');
  assert.equal(document.querySelector('[data-node-id="11:1520"] [data-route]').dataset.route,'/games/chrysanthemum');
 }finally{env.cleanup();}
});

test('seasonal likes and replies persist without inserting posts into other boards',async()=>{
 const initial=state(),env=await setup('/seasonal',initial);try{
  await env.click('[data-action=seasonal-like]');assert.equal(document.querySelector('[data-node-id="1004:1096"]').textContent,'13');
  assert.equal(env.stored().settings.seasonalLiked,true);
  await env.click('[data-action=seasonal-like]');assert.equal(document.querySelector('[data-node-id="1004:1096"]').textContent,'12');
  await env.click('[data-node-id="1004:1099"]');env.fill('seasonal-comment','text','桂花香，秋天的好收获！\n下次我也试试。');await env.submit('seasonal-comment');
  assert.equal(env.stored().settings.seasonalReplies.length,1);assert.equal(document.querySelector('[data-node-id="1004:1104"]').textContent,'4');
  assert.ok(document.querySelector('.seasonal-reply').textContent.includes('下次我也试试。'));
  assert.equal(document.querySelector('[aria-label=游戏圈留言]').value,'');
  assert.deepEqual(env.stored().posts,initial.posts);
 }finally{env.cleanup();}
});

test('all four source photos can be viewed and game exits return to the seasonal entry',async()=>{
 const env=await setup('/seasonal',state());try{
  await env.click('#node-1004_808');const source=document.querySelector('.seasonal-work-photo').getAttribute('src');
  await env.click('.seasonal-detail [data-route*="photo=1"]');assert.notEqual(document.querySelector('.seasonal-work-photo').getAttribute('src'),source);
  await env.click('.seasonal-detail [data-route*="photo=2"]');await env.click('.seasonal-detail [data-route*="photo=3"]');
  assert.equal(document.querySelector('.seasonal-detail .inline-actions button:last-of-type').disabled,true);
  await env.click('.seasonal-detail [data-route="/seasonal"]');await env.click('[data-name="game1-card"]');assert.equal(env.routeNow(),'/games/osmanthus');
  const frame=document.querySelector('#game-frame');env.w.dispatchEvent(new env.w.MessageEvent('message',{source:frame.contentWindow,origin:env.w.location.origin,data:{source:'qinghe-games',type:'exit'}}));
  await waitFor(()=>env.routeNow()==='/seasonal');assert.equal(document.querySelector('.native-canvas').dataset.screen,'seasonal');
 }finally{env.cleanup();}
});

test('new assets remain local and the source text and source image classes are preserved',()=>{
 const source=readFileSync(new URL('../native/seasonal.js',import.meta.url),'utf8').replace(/\\u([\da-f]{4})/gi,(_,code)=>String.fromCharCode(parseInt(code,16))),catalog=JSON.parse(readFileSync(new URL('../assets.json',import.meta.url)));
 assert.equal(Object.keys(catalog.seasonal).length,38);assert.ok(!source.includes('/api/mcp/asset/'));
 assert.ok(source.includes('今天做了两盒桂花糕，挑桂花、配糕点，'));assert.ok(source.includes('05.14-05.26'));
 assert.ok(source.includes('w-[323.427px]'));assert.ok(source.includes('h-[158.217px]'));assert.ok(source.includes('object-cover'));
});
