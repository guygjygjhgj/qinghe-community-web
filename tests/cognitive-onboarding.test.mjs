import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {setup,waitFor} from './helpers/browser.mjs';
import {initialState} from '../domain.js';
import {needsCognitiveWelcome,createCognitiveOnboarding} from '../cognitive-onboarding.js';
const state=()=>({...initialState(),loggedIn:true});
const frame=()=>document.querySelector('#cognitive-frame');
function send(env,status='deferred',overrides={}){
 const f=frame(),data={source:'qinghe-cognitive',type:'exit',version:1,session:new URL(f.src).searchParams.get('session'),status};
 env.w.dispatchEvent(new env.w.MessageEvent('message',{origin:env.w.location.origin,source:f.contentWindow,data,...overrides}));
}
test('only authenticated first-time home visits show the delivered game',()=>{
 const s=state();assert.equal(needsCognitiveWelcome(s,'/'),true);assert.equal(needsCognitiveWelcome(initialState(),'/'),false);
 for(const route of ['/me','/login','/activities','/publish','/games/corn'])assert.equal(needsCognitiveWelcome(s,route),false);
 for(const status of ['finished','deferred']){s.users.li.cognitiveOnboarding={version:1,status};assert.equal(needsCognitiveWelcome(s,'/'),false);}
 s.users.li.cognitiveOnboarding={version:1,status:'unrecognized'};assert.equal(needsCognitiveWelcome(s,'/'),true);
});
test('authenticated home opens the isolated game and securely accepts only its current exit message',async()=>{
 const e=await setup('/',state());try{
  assert.ok(frame());assert.match(frame().src,/\/cognitive\/index.html\?session=/);assert.equal(document.querySelector('.app-shell').hasAttribute('inert'),true);
  send(e,'deferred',{origin:'https://other.example'});assert.ok(frame());
  send(e,'deferred',{source:e.w});assert.ok(frame());
  send(e,'deferred',{data:{source:'qinghe-cognitive',version:1,type:'exit',session:'wrong-session',status:'deferred'}});assert.ok(frame());
  send(e,'forged');assert.ok(frame());
  send(e,'deferred');assert.equal(frame(),null);assert.equal(e.stored().users.li.cognitiveOnboarding.status,'deferred');assert.equal(e.routeNow(),'/');
  assert.equal(document.querySelector('.app-shell').hasAttribute('inert'),false);assert.equal(document.querySelector('.native-canvas').dataset.screen,'home');
  assert.equal(document.body.classList.contains('cognitive-onboarding-active'),false);
 }finally{e.cleanup();}
});
test('finished and deferred dispositions survive reload, and do not store task answers',async()=>{
 for(const status of ['finished','deferred']){
  const e=await setup('/',state());let saved;try{
   send(e,status);saved=e.stored();assert.deepEqual(Object.keys(saved.users.li.cognitiveOnboarding).sort(),['seenAt','status','version']);
  }finally{e.cleanup();}
  const again=await setup('/',saved);try{assert.equal(frame(),null);}finally{again.cleanup();}
 }
});
test('plain successful login enters home with onboarding; existing return destinations remain intact',async()=>{
 for(const route of ['/login','/login?returnTo=%2Factivity%2Fherbs']){
  const e=await setup(route);try{
   e.fill('login','phone','19900000001');await e.click('[data-action=login-consent]');await e.click('[data-action=get-code]');await e.click('.auth-bridge-return');e.fill('login','code','123456');await e.submit('login');
   if(route==='/login'){assert.equal(e.routeNow(),'/');assert.ok(frame());}
   else{assert.equal(e.routeNow(),'/activity/herbs');assert.equal(frame(),null);e.w.location.hash='#/';await waitFor(()=>frame());}
  }finally{e.cleanup();}
 }
});
test('a different account does not inherit the template account onboarding marker',async()=>{
 const s=initialState();s.users.li.cognitiveOnboarding={version:1,status:'finished'};
 const account={id:'new-neighbor',nickname:'新邻居',phone:'19900000002',status:'approved'};
 const e=await setup('/login',s,{authFetch:async(path,init)=>({ok:true,json:async()=>path==='login'?{token:'approved',expiresAt:Date.now()+600000,account}:{requestId:'request',proof:'proof',account,challenge:{phone:'19900000002',purpose:'login',challengeId:'challenge',code:'123456',expiresAt:Date.now()+600000}}})});
 try{e.fill('login','phone','19900000002');await e.click('[data-action=login-consent]');await e.click('[data-action=get-code]');await e.click('.auth-bridge-return');e.fill('login','code','123456');await e.submit('login');assert.equal(e.stored().userId,'new-neighbor');assert.ok(frame());send(e,'deferred');assert.equal(e.stored().users.li.cognitiveOnboarding.status,'finished');assert.equal(e.stored().users['new-neighbor'].cognitiveOnboarding.status,'deferred');}finally{e.cleanup();}
});
test('leaving home removes the frame and restores focusability without marking an unfinished game',async()=>{
 const e=await setup('/',state());try{e.w.location.hash='#/me';await waitFor(()=>e.routeNow()==='/me'&&!frame());assert.equal(frame(),null);assert.equal(document.querySelector('.app-shell').hasAttribute('inert'),false);assert.equal(e.stored().users.li.cognitiveOnboarding,undefined);e.w.history.back();await waitFor(()=>frame());}finally{e.cleanup();}
});
test('project-prefixed deployment resolves the game and its assets without an absolute-root path',()=>{
 const dom=new JSDOM('<div class="app-shell"><main id="main" tabindex="-1"></main></div>',{url:'https://demo.github.io/qinghe-community-web/#/'}),s=state();
 const bridge=createCognitiveOnboarding({document:dom.window.document,window:dom.window,getState:()=>s,getRoute:()=>'/',markSeen:()=>{}});
 try{bridge.sync();assert.equal(new URL(dom.window.document.querySelector('iframe').src).pathname,'/qinghe-community-web/cognitive/index.html');}finally{bridge.dispose();dom.window.close();}
});
test('full local storage cannot trap the user in onboarding or immediately reopen it',()=>{
 const dom=new JSDOM('<div class="app-shell"><main id="main" tabindex="-1"></main></div>',{url:'https://demo.github.io/qinghe-community-web/#/'}),s=state(),errors=[];
 const bridge=createCognitiveOnboarding({document:dom.window.document,window:dom.window,getState:()=>s,getRoute:()=>'/',markSeen:()=>{throw Error('Storage full');},onError:e=>errors.push(e.message)});
 try{bridge.sync();const f=dom.window.document.querySelector('iframe');dom.window.dispatchEvent(new dom.window.MessageEvent('message',{origin:dom.window.location.origin,source:f.contentWindow,data:{source:'qinghe-cognitive',type:'exit',version:1,session:new URL(f.src).searchParams.get('session'),status:'deferred'}}));assert.equal(dom.window.document.querySelector('iframe'),null);bridge.sync();assert.equal(dom.window.document.querySelector('iframe'),null);assert.deepEqual(errors,['Storage full']);}finally{bridge.dispose();dom.window.close();}
});

function game(){
 const html=readFileSync(new URL('../cognitive/index.html',import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:'https://demo.github.io/qinghe-community-web/cognitive/index.html?session=test-session',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,messages=[];
 let now=0,timer;w.scrollTo=()=>{};w.performance.now=()=>now;w.setInterval=fn=>{timer=fn;return 1;};
 Object.defineProperty(w,'parent',{value:{postMessage:(data,origin)=>messages.push({data:JSON.parse(JSON.stringify(data)),origin})}});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const context={fillRect(){},fillText(){},clearRect(){},beginPath(){},arc(){},fill(){},getImageData:()=>({data:new Uint8ClampedArray(16)})};w.HTMLCanvasElement.prototype.getContext=()=>context;
 w.eval(readFileSync(new URL('../cognitive/app.js',import.meta.url),'utf8')+'\n'+readFileSync(new URL('../cognitive/bridge.js',import.meta.url),'utf8'));
 const click=selector=>{const el=w.document.querySelector(selector);assert.ok(el,selector);assert.equal(el.disabled,false,selector+' disabled');el.click();};
 const choose=text=>{const el=[...w.document.querySelectorAll('#screen [data-option]')].find(e=>e.lastChild.textContent.trim()===text);assert.ok(el,text);el.click();click('#choice-confirm');};
 return {w,messages,click,choose,advance(ms){for(let n=0;n<ms;n+=40){now+=40;timer();}},close:()=>dom.window.close()};
}
test('delivered welcome deferral exits to the real community rather than the package placeholder',()=>{
 const g=game();try{assert.equal(g.messages[0].data.type,'ready');g.click('#later');assert.deepEqual(g.messages.at(-1).data,{source:'qinghe-cognitive',type:'exit',version:1,session:'test-session',status:'deferred'});assert.equal(g.messages.at(-1).origin,'https://demo.github.io');assert.ok(!g.w.document.querySelector('#home-report'));}finally{g.close();}
});
test('practice, all nine tasks, record report and finish run through the supplied game without changing task rules',()=>{
 const g=game();try{
  g.click('#start');g.click('[data-id=cup]');g.click('#practice-confirm');assert.match(g.w.document.querySelector('#practice-note').textContent,/再试/);g.click('[data-id=leaf]');g.click('#practice-confirm');g.click('#begin');
  g.click('#task-start');g.click('#pause');g.advance(1000);assert.match(g.w.document.querySelector('#scene-time').textContent,/15/);g.click('#resume');g.advance(15000);g.choose('2 盆');g.choose('橙黄色');g.click('#next-task');
  g.click('#task-start');for(let n=1;n<=9;n++)g.click('[data-number="'+n+'"]');g.click('#next-task');
  g.click('#task-start');for(const answer of ['小猫','陶土色','有'])g.choose(answer);g.click('#next-task');
  g.click('#task-start');g.advance(8000);for(let n=0;n<3;n++)g.click('[data-card="0"]');g.click('#next-task');
  g.click('#task-start');for(let n=0;n<12;n++)g.click('#repeat-new');g.click('#next-task');
  g.click('#task-start');for(const answer of ['8','9','8','9'])g.choose(answer);g.click('#next-task');
  g.click('#task-start');const d=new Date(),days=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];for(const answer of [d.getFullYear()+' 年',(d.getMonth()+1)+' 月',d.getDate()+' 日',days[d.getDay()]])g.choose(answer);g.click('#next-task');
  g.click('#task-start');for(const answer of ['杯子','雨伞','剪刀']){g.click('#reveal');const el=[...g.w.document.querySelectorAll('[data-name]')].find(e=>e.dataset.name===answer);assert.ok(el);el.click();g.click('#scratch-submit');}g.click('#next-task');
  g.click('#task-start');g.advance(3000);for(let n=0;n<20;n++){if(g.w.document.querySelector('#digit').textContent==='1')g.click('#attention-tap');g.advance(1200);}g.click('#next-task');
  assert.equal(g.w.document.querySelectorAll('.result-card').length,9);assert.equal([...g.w.document.querySelectorAll('.result-card .status')].filter(e=>e.textContent==='已完成').length,9);g.click('#go-home');assert.equal(g.messages.at(-1).data.status,'finished');assert.equal(Object.keys(g.messages.at(-1).data).length,5);
 }finally{g.close();}
});
test('the header exit cancels an active game after confirmation and lets the user continue when cancelled',()=>{
 const g=game();try{g.click('#start');g.click('[data-id=leaf]');g.click('#practice-confirm');g.click('#begin');g.click('#task-start');g.click('#community-return');assert.equal(g.w.document.querySelector('#info-dialog').open,true);g.click('#keep-experience');g.advance(1000);assert.match(g.w.document.querySelector('#scene-time').textContent,/14/);g.click('#community-return');g.click('#exit-community');assert.equal(g.messages.at(-1).data.status,'deferred');const before=g.w.document.querySelector('#scene-time').textContent;g.advance(16000);assert.equal(g.w.document.querySelector('#scene-time').textContent,before);}finally{g.close();}
});
