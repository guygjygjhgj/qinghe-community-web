import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,waitFor} from './helpers/browser.mjs';
import {initialState} from '../domain.js';
const state=()=>({...initialState(),loggedIn:true});

test('the source publish back arrow can leave an untouched page',async()=>{
 const e=await setup('/community',state());try{await e.click('[data-route="/publish"]');await e.click('[data-action=back]');await waitFor(()=>e.routeNow()==='/community');}finally{e.cleanup();}
});
test('discarding from the original exit dialog returns to the actual source page',async()=>{
 const e=await setup('/community',state());try{await e.click('[data-route="/publish"]');e.fill('publish','body','用于退出验证的文字');await e.click('[data-action=back]');await e.click('#modal-root [data-action=discard-exit]');await waitFor(()=>e.routeNow()==='/community');assert.equal(document.querySelector('#modal-root').children.length,0);assert.equal(e.stored().drafts.length,2);}finally{e.cleanup();}
});
test('save and exit preserves the draft and returns to the actual source page',async()=>{
 const e=await setup('/community',state());try{await e.click('[data-route="/publish"]');e.fill('publish','body','保存草稿并退出验证');await e.click('[data-action=back]');await e.click('#modal-root [data-action=save-exit]');await waitFor(()=>e.routeNow()==='/community');assert.ok(e.stored().drafts.some(d=>d.body==='保存草稿并退出验证'));}finally{e.cleanup();}
});
test('keyboard activation of Back opens only one confirmation and Continue stays in the editor',async()=>{
 const e=await setup('/community',state());try{await e.click('[data-route="/publish"]');e.fill('publish','body','继续编辑验证');const before=e.w.history.length,back=document.querySelector('[data-action=back]');back.dispatchEvent(new e.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await waitFor(()=>document.querySelector('#modal-root [data-action=close]'));await e.click('#modal-root [data-action=close]');await waitFor(()=>!document.querySelector('#modal-root .native-canvas'));assert.equal(e.routeNow(),'/publish');assert.equal(e.w.history.length,before+1);assert.equal(document.querySelector('[name=body]').value,'继续编辑验证');}finally{e.cleanup();}
});

test('guest save-and-exit saves only a local draft and does not trap the user in login',async()=>{
 const e=await setup('/publish',initialState());try{e.fill('publish','body','未登录时保存到本机的草稿');await e.click('[data-action=back]');await e.click('#modal-root [data-action=save-exit]');await waitFor(()=>e.routeNow()==='/community');assert.equal(e.stored().loggedIn,false);assert.ok(e.stored().drafts.some(d=>d.body==='未登录时保存到本机的草稿'));assert.equal(e.w.sessionStorage.getItem('qinghe-editor-recovery'),null);}finally{e.cleanup();}
});
test('browser Back with unsaved text can continue, then discard and leave without reopening confirmation',async()=>{
 const e=await setup('/community',state());try{await e.click('[data-route="/publish"]');e.fill('publish','body','浏览器返回的退出验证');e.w.history.back();await waitFor(()=>document.querySelector('#modal-root [data-action=discard-exit]'));await e.click('#modal-root [data-action=close]');await waitFor(()=>!document.querySelector('#modal-root .native-canvas'));assert.equal(e.routeNow(),'/publish');assert.equal(document.querySelector('[name=body]').value,'浏览器返回的退出验证');await e.click('[data-action=back]');await e.click('#modal-root [data-action=discard-exit]');await waitFor(()=>e.routeNow()==='/community');assert.equal(document.querySelector('#modal-root').children.length,0);}finally{e.cleanup();}
});

test('the white back-icon image on the help editor returns to the originating plant',async()=>{
 const s=state();s.plants.push({id:'back-plant',owner:'li',name:'薄荷盆栽',date:'2026-10-13',location:'阳台',source:'自己种的',records:[]});
 const e=await setup('/plant/back-plant',s);try{
  await e.click('[data-route="/publish?type=help&plant=back-plant"]');
  const arrow=document.querySelector('[data-node-id="11:1368"]');assert.ok(arrow);assert.equal(arrow.dataset.action,'back');
  await e.click('[data-node-id="11:1368"] img');await waitFor(()=>e.routeNow()==='/plant/back-plant');
 }finally{e.cleanup();}
});
test('the help back-icon image also opens exit confirmation after typing',async()=>{
 const e=await setup('/publish?type=help&plant=reference-mint',state());try{
  e.fill('publish','body','检查求助页面白色箭头');await e.click('[data-node-id="11:1368"] img');
  assert.ok(document.querySelector('#modal-root [data-action=discard-exit]'));await e.click('#modal-root [data-action=discard-exit]');await waitFor(()=>e.routeNow()==='/community');
 }finally{e.cleanup();}
});
