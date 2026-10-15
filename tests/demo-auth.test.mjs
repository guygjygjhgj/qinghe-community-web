import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,waitFor} from './helpers/browser.mjs';
import {initialState} from '../domain.js';
import {createDemoAuth,AUTH_SESSION_KEY} from '../demo-auth.js';
const response=(data,status=200)=>({ok:status<400,status,json:async()=>data});
test('registration uses the original Figma login fields and stays signed out pending approval',async()=>{
 const calls=[],env=await setup('/register?returnTo=%2Factivity%2Fherbs',initialState(),{authFetch:async(path,init)=>{calls.push(path);const f=init?.body&&JSON.parse(init.body);if(path==='challenge')return response({challengeId:'registration',phone:f.phone,purpose:'register',code:'738291',expiresAt:Date.now()+600000});if(path==='register')return response({requestId:'r1',proof:'request-proof',account:{id:'r1',phone:f.phone,nickname:f.nickname,status:'pending'}},201);throw Error('Unexpected API path '+path);}});
 try{assert.equal(document.querySelector('.native-canvas').dataset.screen,'login');env.fill('login','phone','19900000003');env.fill('login','name','测试邻居');await env.click('[data-action=get-code]');assert.match(document.querySelector('#toast').textContent,/738291/);env.fill('login','code','738291');await env.click('[data-action=login-consent]');await env.submit('login');assert.equal(env.stored().loggedIn,false);assert.equal(env.w.localStorage.getItem(AUTH_SESSION_KEY),null);assert.match(document.querySelector('#toast').textContent,/等待管理员/);assert.deepEqual(calls,['challenge','register']);}finally{env.cleanup();}
});
test('an unapproved account cannot use a static code or the old quick login shortcut',async()=>{
 const env=await setup('/login',initialState(),{authFetch:async()=>response({error:'账号尚未审批通过'},403)});
 try{env.fill('login','phone','19900000001');env.fill('login','code','123456');await env.click('[data-action=login-consent]');await env.submit('login');assert.equal(env.stored().loggedIn,false);assert.match(document.querySelector('#toast').textContent,/获取演示验证码/);await env.click('[data-action=get-code]');assert.match(document.querySelector('#toast').textContent,/审批/);assert.equal(env.stored().loggedIn,false);}finally{env.cleanup();}
});
test('approved login returns to the requested page and uses the assigned account identity',async()=>{
 const env=await setup('/login?returnTo=%2Factivity%2Fherbs',initialState(),{authFetch:async(path,init)=>path==='challenge'?response({challengeId:'c2',phone:JSON.parse(init.body).phone,purpose:'login',code:'846291',expiresAt:Date.now()+600000}):response({token:'approved-neighbor-token',expiresAt:Date.now()+3600000,account:{id:'demo-neighbor',phone:'19900000002',nickname:'王阿姨',status:'approved'}})});
 try{env.fill('login','phone','19900000002');await env.click('[data-action=get-code]');env.fill('login','code','846291');await env.click('[data-action=login-consent]');await env.submit('login');await waitFor(()=>env.routeNow()==='/activity/herbs');assert.equal(env.stored().userId,'demo-neighbor');assert.equal(env.stored().users['demo-neighbor'].name,'王阿姨');assert.ok(env.w.localStorage.getItem(AUTH_SESSION_KEY));}finally{env.cleanup();}
});
test('old local loggedIn flags do not grant an approved session',async()=>{
 const state=initialState();state.loggedIn=true;const env=await setup('/activity/herbs',state,{noAuthSession:true});try{assert.equal(env.stored().loggedIn,false);await env.click('[data-action=book]');assert.match(env.routeNow(),/^\/login/);}finally{env.cleanup();}
});
test('session validation fails closed and never treats an offline response as approval',async()=>{
 const map=new Map([[AUTH_SESSION_KEY,JSON.stringify({token:'invalid',expiresAt:Date.now()+60000})]]),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const auth=createDemoAuth({storage,fetchImpl:async()=>response({error:'登录已失效'},401)});assert.equal(await auth.restore(),null);assert.equal(auth.hasSession(),false);assert.equal(map.has(AUTH_SESSION_KEY),false);
});
