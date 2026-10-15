import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {setup,waitFor} from '../helpers/browser.mjs';
import {initialState,addPlantRecord,updatePlant,bookActivity,activityEnded,validDate} from '../../domain.js';
import {weekDates} from '../../experience-views.js';
import {calendarFile,insertText} from '../../interaction.js';

const date=()=>new Date().toLocaleDateString('sv-SE');
function state(){const s=initialState();s.loggedIn=true;s.plants=[{id:'mint-pot',owner:'li',name:'薄荷盆栽',date:'2026-10-01',location:'阳台',source:'自己种的',photo:'plants:imgSideCardLeft',records:[{id:'r1',date:date(),body:'今天长出两片新叶。',title:'新叶'}]},{id:'tomato-pot',owner:'li',name:'小番茄',date:'2026-10-01',location:'院子',source:'邻居送的',photo:'plant-success:img7',records:[]}];return s;}
class Recognition{static last;constructor(){Recognition.last=this;this.started=false;}start(){this.started=true;this.onstart?.();}stop(){this.stopped=true;}abort(){this.aborted=true;}}

test('personal card has every service; switching plants and dates uses the selected plant',async()=>{
 const t=await setup('/me',state());assert.equal(t.w.document.querySelectorAll('.personal-service-grid a').length,8);
 assert.equal(t.w.document.querySelector('[data-plant-position]').textContent,'1 / 2');
 await t.click('[data-action="plant-step"][data-delta="1"]');assert.equal(t.w.document.querySelector('.plant-card-track').dataset.activePlantId,'tomato-pot');assert.equal(t.w.document.querySelector('[data-plant-position]').textContent,'2 / 2');
 await t.click('[data-action="plant-date"][data-id="mint-pot"][data-date="'+date()+'"]');assert.match(t.w.document.querySelector('[data-plant-id="mint-pot"] .plant-daily-record').textContent,/今天长出两片新叶/);
 await t.click('[data-action="plant-week"][data-id="mint-pot"][data-delta="-1"]');assert.equal(t.w.document.querySelectorAll('[data-plant-id="mint-pot"] .plant-day').length,7);t.cleanup();
});

test('plant editing updates one existing plant while keeping its records and identifier',async()=>{
 const t=await setup('/plant/mint-pot',state());await t.click('[data-route="/plant/mint-pot/edit"]');
 assert.equal(t.w.document.querySelector('form').dataset.form,'plant-edit');t.fill('plant-edit','name','家里的薄荷');await t.submit('plant-edit');
 assert.equal(t.stored().plants.length,2);assert.equal(t.stored().plants[0].name,'家里的薄荷');assert.equal(t.stored().plants[0].records.length,1);assert.equal(t.routeNow(),'/plant/mint-pot');t.cleanup();
});

test('chat history paginates without losing the current draft; input is outside the scrolling pane',async()=>{
 const s=state();s.chats=Array.from({length:80},(_,i)=>({id:'m'+i,conversation:'neighbor-chen',author:i%2?'li':'chen',text:'历史消息 '+i,createdAt:Date.now()-600000+i*1000}));
 const t=await setup('/chat/neighbor-chen',s);const form=t.w.document.querySelector('form[data-form="chat"]');assert.ok(!t.w.document.querySelector('[data-scroll-region]').contains(form));assert.equal(t.w.document.querySelectorAll('.chat-message').length,30);
 t.fill('chat','text','还没发送的文字\n第二行');await t.click('[data-action="chat-older"]');assert.equal(t.w.document.querySelectorAll('.chat-message').length,60);assert.equal(t.w.document.querySelector('[name="text"]').value,'还没发送的文字\n第二行');assert.equal(t.w.document.querySelector('.chat-message').dataset.messageId,'m20');t.cleanup();
});

test('IME Enter and Shift Enter do not send; ordinary Enter saves once and clears the composer',async()=>{
 const t=await setup('/chat/neighbor-chen',state());t.fill('chat','text','中文输入完成');const field=t.w.document.querySelector('[name="text"]');
 field.dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true}));assert.equal(t.stored().chats.length,0);
 field.dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'Enter',shiftKey:true,bubbles:true,cancelable:true}));assert.equal(t.stored().chats.length,0);
 field.dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await delay(40);assert.equal(t.stored().chats.length,1);assert.equal(t.stored().chats[0].text,'中文输入完成');assert.equal(t.w.document.querySelector('[name="text"]').value,'');assert.ok(t.w.document.querySelector('[type="submit"]').disabled);t.cleanup();
});

test('speech insertion preserves text on both sides of the cursor and supports manual fallback',async()=>{
 const t=await setup('/publish',state());t.fill('publish','body','左边右边');t.w.document.querySelector('[name="body"]').setSelectionRange(2,2);
 await t.click('[data-action="voice"][data-target="publish"]');assert.match(t.w.document.querySelector('#recording-status').textContent,/不支持/);
 const field=t.w.document.querySelector('#speech-text');field.value='插入';field.dispatchEvent(new t.w.Event('input',{bubbles:true}));await t.click('[data-action="finish-recording"]');await t.click('[data-action="use-speech"]');
 await waitFor(()=>!t.w.document.querySelector('#confirmed-speech'));assert.equal(t.w.document.querySelector('[name="body"]').value,'左边插入右边');assert.equal(t.w.document.querySelector('[data-counter="body"]').textContent,'6 / 500');t.cleanup();
});

test('voice completion waits for the final result; no recognition starts merely from opening the dialog',async()=>{
 Recognition.last=null;const t=await setup('/feedback',state(),{Recognition});await t.click('[data-action="voice"][data-target="feedback"]');assert.equal(Recognition.last,null);
 await t.click('[data-action="start-recording"]');const engine=Recognition.last;engine.onresult({results:[[{transcript:'第一句'}]]});await t.click('[data-action="finish-recording"]');assert.ok(!t.w.document.querySelector('#confirmed-speech'));
 engine.onresult({results:[[{transcript:'第一句和最后一句'}]]});engine.onend();assert.equal(t.w.document.querySelector('#confirmed-speech').value,'第一句和最后一句');
 await t.click('[data-action="use-speech"]');assert.equal(t.w.document.querySelector('form[data-form="feedback"] [name="body"]').value,'第一句和最后一句');t.cleanup();
});

test('voice permission errors retain editable text and closing prevents late callbacks changing another screen',async()=>{
 const t=await setup('/publish',state(),{Recognition});await t.click('[data-action="voice"][data-target="publish"]');const area=t.w.document.querySelector('#speech-text');area.value='手动保留的内容';area.dispatchEvent(new t.w.Event('input',{bubbles:true}));
 await t.click('[data-action="start-recording"]');const engine=Recognition.last,lateResult=engine.onresult;engine.onerror({error:'not-allowed'});assert.match(t.w.document.querySelector('#recording-status').textContent,/权限/);assert.equal(t.w.document.querySelector('#speech-text').value,'手动保留的内容');assert.equal(t.w.document.querySelector('#speech-text').readOnly,false);
 await t.click('[data-action="close"]');lateResult({results:[[{transcript:'迟到的结果'}]]});assert.ok(!t.w.document.querySelector('#speech-text'));assert.equal(t.w.document.querySelector('[name="body"]').value,'');t.cleanup();
});

test('voice can edit a personal introduction without inserting into an unrelated body field',async()=>{
 const t=await setup('/profile/edit',state());t.fill('profile','intro','我喜欢');const field=t.w.document.querySelector('[name="intro"]');field.setSelectionRange(3,3);
 await t.click('[data-action="voice"][data-target="profile"]');const area=t.w.document.querySelector('#speech-text');area.value='种薄荷';area.dispatchEvent(new t.w.Event('input',{bubbles:true}));await t.click('[data-action="finish-recording"]');await t.click('[data-action="use-speech"]');assert.equal(t.w.document.querySelector('[name="intro"]').value,'我喜欢种薄荷');t.cleanup();
});

test('form recovery restores text and checkbox choices; a saved plant form does not reappear as a new unsaved copy',async()=>{
 const recovery={forms:{'/profile/edit|profile':{name:'小李',intro:'未保存的简介',interest:['花卉','香草']}}};const t=await setup('/profile/edit',state(),{session:{'qinghe-form-recovery':recovery}});
 assert.equal(t.w.document.querySelector('[name="intro"]').value,'未保存的简介');assert.equal(t.w.document.querySelector('input[value="花卉"]').checked,true);assert.equal(t.w.document.querySelector('input[value="蔬菜"]').checked,false);await t.submit('profile');assert.equal(t.stored().users.li.name,'小李');t.cleanup();
 const p=await setup('/plant/new',state());p.fill('plant','name','仅保存一次');await p.submit('plant');const cached=JSON.parse(p.w.sessionStorage.getItem('qinghe-form-recovery'));assert.ok(!cached.forms['/plant/new|plant']);p.cleanup();
});

test('activity operations stay outside the scrolling content; ended activities cannot be booked',async()=>{
 const s=state();s.activities[0].date='2000-01-01';const t=await setup('/activity/herbs',s);assert.ok(t.w.document.querySelector('.activity-action-bar'));assert.ok(!t.w.document.querySelector('[data-scroll-region]').contains(t.w.document.querySelector('.activity-action-bar')));assert.match(t.w.document.querySelector('.activity-action-bar').textContent,/活动已结束/);assert.ok(t.w.document.querySelector('.activity-action-bar button').disabled);assert.throws(()=>bookActivity(s,'herbs'),/结束/);t.cleanup();
});

test('calendar files use the actual activity details and safely escape multi-line titles',()=>{
 const file=calendarFile({...initialState().activities[0],title:'香草,种植;交流\n下一行'});assert.match(file,/DTSTART;TZID=Asia\/Shanghai:20261018T090000/);assert.match(file,/DTEND;TZID=Asia\/Shanghai:20261018T103000/);assert.ok(file.includes('SUMMARY:香草\\,种植\\;交流\\n下一行'));
});

test('calendar weeks cross months correctly; dates, names and records reject invalid or excessive input',()=>{
 const days=weekDates('2026-10-01');assert.equal(days[0].date,'2026-09-28');assert.equal(days[6].date,'2026-10-04');assert.equal(validDate('2026-02-31'),false);
 assert.equal(activityEnded({date:'2026-10-14',time:'09:00—10:30'},new Date('2026-10-14T10:31:00')),true);
 const s=state();assert.throws(()=>addPlantRecord(s,'mint-pot',{body:'x'.repeat(501),date:date()}),/500/);assert.throws(()=>updatePlant(s,'mint-pot',{name:'x'.repeat(41),date:date()}),/40/);
 assert.throws(()=>insertText('12345','123456',{start:0,end:0,max:10}),/超过/);
});

test('closing a dialog keeps the page scroll position and a gallery can move between all photos',async()=>{
 const t=await setup('/post/scallion',state());const pane=t.w.document.querySelector('[data-scroll-region]');pane.scrollTop=180;
 await t.click('[data-action="image"]');assert.match(t.w.document.querySelector('.gallery-controls').textContent,/1 \/ 2/);await t.click('[data-action="gallery-next"]');assert.match(t.w.document.querySelector('.gallery-controls').textContent,/2 \/ 2/);
 await t.click('[data-action="close"]');assert.equal(t.w.document.querySelector('[data-scroll-region]').scrollTop,180);t.cleanup();
});

test('an optional title works the same through native form submission and preview',async()=>{
 const t=await setup('/publish',state());assert.equal(t.w.document.querySelector('[name="title"]').required,false);t.fill('publish','body','这一句会作为标题。\n这是第二行正文。');
 t.w.document.querySelector('form[data-form="publish"]').requestSubmit();await delay(40);assert.equal(t.stored().posts[0].title,'这一句会作为标题。');t.cleanup();
});

test('growth record count opens a real record list and neighbor cards offer the correct conversation',async()=>{
 const t=await setup('/me',state());await t.click('[data-route="/plant-records"]');assert.match(t.w.document.querySelector('#main').textContent,/今天长出两片新叶/);assert.ok(t.w.document.querySelector('[data-route="/plant/mint-pot"]'));t.cleanup();
 const neighbor=await setup('/neighbor/wang',state());await neighbor.click('[data-route="/chat/neighbor-wang"]');assert.equal(neighbor.w.document.querySelector('form[data-form="chat"]').dataset.id,'neighbor-wang');neighbor.cleanup();
});

test('reading controls resume after pause and ignore an old utterance after skipping',async()=>{
 const spoken=[],synthesis={paused:false,getVoices:()=>[{lang:'zh-CN'}],cancel:()=>{},resume(){this.paused=false;},pause(){this.paused=true;},speak:value=>spoken.push(value)};
 const t=await setup('/post/scallion',state(),{synthesis});await t.click('[data-action="read"]');const old=spoken[0];await t.click('[data-action="reader-toggle"]');assert.equal(synthesis.paused,true);await t.click('[data-action="reader-next"]');assert.equal(synthesis.paused,false);const position=t.w.document.querySelector('#reading-position').textContent;old.onend();assert.equal(t.w.document.querySelector('#reading-position').textContent,position);await t.click('[data-action="close"]');spoken.at(-1).onend();assert.ok(!t.w.document.querySelector('#reading-position'));t.cleanup();
});
