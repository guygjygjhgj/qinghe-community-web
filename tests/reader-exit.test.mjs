import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,waitFor} from './helpers/browser.mjs';
function speech(){const spoken=[];let cancelled=0;return {spoken,cancelled:()=>cancelled,engine:{paused:false,getVoices:()=>[{lang:'zh-CN'}],cancel(){cancelled++;},resume(){this.paused=false;},pause(){this.paused=true;},speak(value){spoken.push(value);}}};}
test('direct reader entry closes from the whole close circle or stop button without speech support',async()=>{
 for(const name of ['close-disc','stop-button']){const e=await setup('/settings/speech');try{await e.click('#main [data-name="'+name+'"]');await waitFor(()=>e.routeNow()==='/me');assert.notEqual(document.querySelector('#main .native-canvas').dataset.screen,'reader');}finally{e.cleanup();}}
});
test('closing a started reader exits both layers and cancels pending speech callbacks',async()=>{
 const s=speech(),e=await setup('/me',undefined,{synthesis:s.engine});try{await e.click('[data-route="/settings/speech"]');await e.click('#main [data-action="reader-start"]');assert.ok(document.querySelector('#modal-root .native-canvas'));assert.ok(s.spoken.length);const old=s.spoken.at(-1);await e.click('#modal-root [data-name="close-disc"]');await waitFor(()=>e.routeNow()==='/me');assert.equal(document.querySelector('#modal-root').children.length,0);assert.ok(s.cancelled());const count=s.spoken.length;old.onend();assert.equal(s.spoken.length,count);}finally{e.cleanup();}
});
test('Escape exits an idle or active reader page',async()=>{
 for(const active of [false,true]){const s=speech(),e=await setup('/settings/speech',undefined,{synthesis:s.engine});try{if(active)await e.click('#main [data-action="reader-start"]');document.body.dispatchEvent(new e.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await waitFor(()=>e.routeNow()==='/me');assert.equal(document.querySelector('#modal-root').children.length,0);}finally{e.cleanup();}}
});
test('browser back from the active settings reader returns to its entry page',async()=>{
 const s=speech(),e=await setup('/me',undefined,{synthesis:s.engine});try{await e.click('[data-route="/settings/speech"]');await e.click('#main [data-action="reader-start"]');e.w.history.back();await waitFor(()=>e.routeNow()==='/me');assert.equal(document.querySelector('#modal-root').children.length,0);assert.ok(s.cancelled());}finally{e.cleanup();}
});
test('a stale self-referencing history entry cannot trap the reader close action',async()=>{
 const e=await setup('/settings/speech');try{e.w.history.replaceState({qinghe:true,from:'/settings/speech'},'','#/settings/speech');await e.click('#main [data-name="close-disc"]');await waitFor(()=>e.routeNow()==='/me');}finally{e.cleanup();}
});
test('a reader opened from a post closes only the popup and preserves the post',async()=>{
 const s=speech(),e=await setup('/post/scallion',undefined,{synthesis:s.engine});try{await e.click('[data-action="read"]');await e.click('#modal-root [data-name="stop-button"]');await waitFor(()=>document.querySelector('#modal-root').children.length===0);assert.equal(e.routeNow(),'/post/scallion');assert.equal(document.querySelector('#main .native-canvas').dataset.screen,'post');assert.ok(s.cancelled());}finally{e.cleanup();}
});
