import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inputRect} from '../native-inputs.js';
import {setup,waitFor} from './helpers/browser.mjs';
import {initialState} from '../domain.js';

test('input sizing uses the existing surface and leaves room for text and adjacent controls',()=>{
 const frame={x:31.29,y:1395.69,width:530.03,height:76.8};
 const r=inputRect(frame,[26.55,17.08,26.55,17.08],38.2111);
 assert.ok(r.width>476&&r.width<477);assert.ok(r.height>=42.2111);
 assert.ok(r.x>frame.x&&r.x+r.width<frame.x+frame.width);
 assert.ok(r.y>frame.y&&r.y+r.height<frame.y+frame.height);
 const large=inputRect(frame,[26.55,17.08,26.55,17.08],56);
 assert.equal(large.height,60);assert.ok(large.y>frame.y&&large.y+large.height<frame.y+frame.height);
 const chat=inputRect({x:25.15,y:2153.75,width:699.7,height:101.68},[39.35,27.37,116.85,27.37],44.06);
 assert.ok(chat.x+chat.width<624.26); // The original send button remains free.
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.match(css,/textarea\.native-input\{[^}]*white-space:pre-wrap!important/);
 assert.match(css,/textarea\.native-input\{[^}]*overflow-x:hidden/);
});

test('every post reply supports multiline editing and sends the original text without breaking IME input',async()=>{
 for(const route of ['/post/scallion','/post/pothos','/post/lettuce']){
  const state=initialState();state.loggedIn=true;
  const e=await setup(route,state);try{
   const area=document.querySelector('form[data-form=comment] textarea[name=text]');assert.ok(area,route);
   const postId=route.split('/').at(-1),before=e.stored().posts.find(p=>p.id===postId).comments.length;
   e.fill('comment','text','第一行\n第二行很长，也保留换行。');
   area.dispatchEvent(new e.w.KeyboardEvent('keydown',{bubbles:true,key:'Enter',isComposing:true}));
   assert.equal(e.stored().posts.find(p=>p.id===postId).comments.length,before);
   await e.submit('comment');await waitFor(()=>e.stored().posts.find(p=>p.id===postId).comments.length===before+1);
   assert.equal(e.stored().posts.find(p=>p.id===postId).comments.at(-1).text,'第一行\n第二行很长，也保留换行。');
   assert.equal(document.querySelector('textarea[name=text]').value,'');
  }finally{e.cleanup();}
 }
});
