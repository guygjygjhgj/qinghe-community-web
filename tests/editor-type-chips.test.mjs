import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './helpers/browser.mjs';
import {screens} from '../native-screens.js';
import {initialState} from '../domain.js';
const state=()=>({...initialState(),loggedIn:true});
const imageInfo=e=>({src:e.getAttribute('src'),class:e.className,style:e.getAttribute('style')});

test('all three publish pages use the help pill artwork and the same label metrics',async()=>{
 for(const type of ['share','help','seed']){
  const e=await setup('/publish?type='+type,state());try{
   const source=screens['help-editor'](),selected=source.querySelector('[data-node-id="11:1387"] img').getAttribute('src'),normal=source.querySelector('[data-node-id="11:1385"] img').getAttribute('src');
   const chips=[...document.querySelectorAll('[data-editor-type-chip]')];assert.equal(chips.length,3);assert.deepEqual(chips.map(c=>c.textContent),['分享','求助','种苗']);
   for(const chip of chips){const on=chip.dataset.type===type;assert.equal(chip.getAttribute('aria-pressed'),String(on));assert.equal(chip.querySelector('img').getAttribute('src'),on?selected:normal);assert.equal(chip.style.height,'59.923px');assert.equal(chip.querySelector('p').style.fontSize,on?'29.848px':'30.953px');}
  }finally{e.cleanup();}
 }
});

test('unified chips retain text while switching, and the chosen type is actually published',async()=>{
 const e=await setup('/publish',state());try{
  e.fill('publish','body','统一气泡后仍保留我的输入');
  for(const type of ['help','seed','share']){await e.click('[data-editor-type-chip="'+type+'"]');assert.equal(document.querySelector('[name=body]').value,'统一气泡后仍保留我的输入');assert.equal(document.querySelector('[data-editor-type-chip="'+type+'"]').getAttribute('aria-pressed'),'true');}
  await e.submit('publish');assert.equal(e.stored().posts[0].type,'share');assert.equal(e.stored().posts[0].body,'统一气泡后仍保留我的输入');
 }finally{e.cleanup();}
});

test('only the three requested category backgrounds change; other image slots stay original',async()=>{
 for(const [type,name]of [['share','editor'],['help','help-editor'],['seed','seed-editor']]){
  const e=await setup('/publish?type='+type,state());try{
   const actual=[...document.querySelectorAll('#main img')].filter(i=>!i.closest('[data-editor-type-chip]')).map(imageInfo);
   const source=[...screens[name]().querySelectorAll('img')].filter(i=>!i.closest('[data-name^="tab-share-surface"],[data-name^="tab-help-surface"],[data-name^="tab-seed-surface"]')).map(imageInfo);
   assert.deepEqual(actual,source,name);
  }finally{e.cleanup();}
 }
});
