import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {JSDOM} from 'jsdom';
import {initialState,STORAGE_KEY} from '../../domain.js';
const root=new URL('../../',import.meta.url);
let sequence=0;
export async function waitFor(check){for(let i=0;i<50;i++){if(check())return;await delay(20);}assert.ok(check(),'Navigation did not settle');}
export async function setup(route='/',state=initialState(),options={}){
 const dom=new JSDOM(readFileSync(new URL('index.html',root),'utf8'),{url:'http://127.0.0.1:4180/#'+route,pretendToBeVisual:true}),w=dom.window;
 w.localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
 for(const [key,value]of Object.entries(options.session||{}))w.sessionStorage.setItem(key,typeof value==='string'?value:JSON.stringify(value));
 for(const name of ['window','document','Node','location','history','localStorage','sessionStorage','FormData','FileReader','Event','PopStateEvent'])globalThis[name]=name==='window'?w:w[name];
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:w.navigator});
 let clipboard='';Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>{clipboard=text;}}});
 if(options.Recognition)w.SpeechRecognition=options.Recognition;
 if(options.synthesis){w.speechSynthesis=options.synthesis;globalThis.speechSynthesis=options.synthesis;globalThis.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};}
 document.fonts={ready:options.fontsReady||Promise.resolve()};w.HTMLImageElement.prototype.decode=options.decodeImage||(()=>Promise.resolve());
 w.Element.prototype.scrollIntoView=()=>{};w.Range.prototype.getClientRects=()=>[];w.scrollTo=()=>{};
 globalThis.requestAnimationFrame=fn=>{fn();return 1;};
 globalThis.fetch=async file=>({ok:true,json:async()=>JSON.parse(readFileSync(new URL(file,root),'utf8')),text:async()=>readFileSync(new URL(file,root),'utf8')});
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
