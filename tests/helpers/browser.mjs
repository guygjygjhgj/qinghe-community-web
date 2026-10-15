import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {JSDOM} from 'jsdom';
import {initialState,STORAGE_KEY} from '../../domain.js';
import {AUTH_SERVICE,AUTH_SESSION_KEY} from '../../demo-auth.js';
const root=new URL('../../',import.meta.url);
let sequence=0;
export async function waitFor(check){for(let i=0;i<50;i++){if(check())return;await delay(20);}assert.ok(check(),'Navigation did not settle');}
export async function setup(route='/',state=initialState(),options={}){
 const dom=new JSDOM(readFileSync(new URL('index.html',root),'utf8'),{url:'http://127.0.0.1:4180/'+(options.presentationTools?'?demoTools=1':'')+'#'+route,pretendToBeVisual:true}),w=dom.window;
 w.localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
 if(state.loggedIn&&!options.noAuthSession)w.localStorage.setItem(AUTH_SESSION_KEY,JSON.stringify({token:'test-approved-session',expiresAt:Date.now()+86400000}));
 for(const [key,value]of Object.entries(options.session||{}))w.sessionStorage.setItem(key,typeof value==='string'?value:JSON.stringify(value));
 for(const name of ['window','document','Node','location','history','localStorage','sessionStorage','FormData','FileReader','Event','PopStateEvent'])globalThis[name]=name==='window'?w:w[name];
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:w.navigator});
 let clipboard='';Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>{clipboard=text;}}});
 if(options.Recognition)w.SpeechRecognition=options.Recognition;
 if(options.synthesis){w.speechSynthesis=options.synthesis;globalThis.speechSynthesis=options.synthesis;globalThis.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};}
 document.fonts={ready:options.fontsReady||Promise.resolve()};w.HTMLImageElement.prototype.decode=options.decodeImage||(()=>Promise.resolve());
 w.Element.prototype.scrollIntoView=()=>{};w.Range.prototype.getClientRects=()=>[];w.scrollTo=()=>{};
 globalThis.requestAnimationFrame=fn=>{fn();return 1;};
 globalThis.fetch=async(file,init)=>{if(String(file).startsWith(AUTH_SERVICE)){const route=String(file).slice(AUTH_SERVICE.length);if(options.authFetch)return options.authFetch(route,init);const account={id:state.userId,phone:'19900000001',nickname:state.users[state.userId].name,status:'approved'};const phone=init?.body&&JSON.parse(init.body).phone||'19900000001',challenge={challengeId:'test-challenge',phone,purpose:'login',code:'123456',expiresAt:Date.now()+600000};let data=route==='request-access'||route==='status'?{requestId:'test-request',proof:'test-proof',account,challenge,deliveryExpired:false}:route==='login'?{account,token:'test-approved-session',expiresAt:Date.now()+86400000}:{account};return {ok:true,status:200,json:async()=>data};}return {ok:true,json:async()=>JSON.parse(readFileSync(new URL(file,root),'utf8')),text:async()=>readFileSync(new URL(file,root),'utf8')};};
 const errors=[];w.addEventListener('error',e=>errors.push(e.error));
 await import('../../app.js?browser-test='+sequence++);await delay(10);
 assert.ok(document.querySelector('#main').children.length);
 return {w,clipboard:()=>clipboard,stored:()=>JSON.parse(w.localStorage.getItem(STORAGE_KEY)),routeNow:()=>w.location.hash.slice(1),
  click:async selector=>{const el=w.document.querySelector(selector);assert.ok(el,'Missing control: '+selector);el.click();await delay(40);},
  fill:(form,name,value)=>{const el=w.document.querySelector(`form[data-form="${form}"] [name="${name}"]`);assert.ok(el,'Missing field: '+name);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));},
  submit:async kind=>{const form=w.document.querySelector(`form[data-form="${kind}"]`);assert.ok(form,'Missing form: '+kind);form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await delay(40);},
  cleanup:()=>{assert.deepEqual(errors,[]);w.close();}
 };
}
