import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,waitFor} from './helpers/browser.mjs';
import {initialState} from '../domain.js';
import {createDemoAuth,AUTH_SESSION_KEY,AUTH_REQUEST_KEY,reviewLink} from '../demo-auth.js';
const response=(data,status=200)=>({ok:status<400,status,json:async()=>data});
const delivery=(phone,status='pending')=>({requestId:'request-fixture',proof:'private-proof',account:{id:'neighbor',phone,nickname:'新邻居',status},challenge:status==='approved'?{challengeId:'issued',phone,code:'738291',purpose:'login',expiresAt:Date.now()+600000}:null});
test('a freely entered phone requests manual issuance without receiving a code or signing in',async()=>{
 const calls=[],env=await setup('/register',initialState(),{authFetch:async(path,init)=>{calls.push(path);return response(delivery(JSON.parse(init.body).phone||'13800000000'));}});
 try{env.fill('login','phone','13800000000');await env.click('[data-action=login-consent]');await env.click('[data-action=get-code]');assert.equal(document.querySelector('.native-canvas').dataset.screen,'login');assert.deepEqual(calls,['request-access','status']);assert.equal(document.querySelector('.auth-bridge-overlay').dataset.status,'pending');assert.equal(document.querySelector('.auth-bridge-code').textContent,'');assert.equal(env.stored().loggedIn,false);assert.equal(env.w.localStorage.getItem(AUTH_SESSION_KEY),null);assert.ok(env.w.localStorage.getItem(AUTH_REQUEST_KEY));assert.match(document.querySelector('.auth-bridge-admin').href,/request=request-fixture/);assert.ok(!document.querySelector('.auth-bridge-admin').href.includes('13800000000'));}finally{env.cleanup();}
});
test('only an admin-issued code enables login and preserves the requested destination',async()=>{
 let status='pending';const env=await setup('/login?returnTo=%2Factivity%2Fherbs',initialState(),{authFetch:async(path,init)=>{if(path==='request-access'||path==='status')return response(delivery('13800000000',status));if(path==='login'){assert.equal(JSON.parse(init.body).code,'738291');return response({token:'approved-token',expiresAt:Date.now()+3600000,account:delivery('13800000000','approved').account});}throw Error('Unexpected '+path);}});
 try{env.fill('login','phone','13800000000');await env.click('[data-action=login-consent]');await env.click('[data-action=get-code]');status='approved';await env.click('.auth-bridge-refresh');assert.match(document.querySelector('.auth-bridge-code').textContent,/738291/);assert.equal(env.stored().loggedIn,false);await env.click('.auth-bridge-return');env.fill('login','code','738291');await env.submit('login');await waitFor(()=>env.routeNow()==='/activity/herbs');assert.equal(env.stored().loggedIn,true);assert.equal(env.stored().userId,'neighbor');assert.ok(document.querySelector('.auth-bridge-controls').hidden);}finally{env.cleanup();}
});
test('a phone alone cannot retrieve another applicant’s approval or code',async()=>{
 let calls=0;const env=await setup('/login',initialState(),{authFetch:async()=>{calls++;throw Error('Should not query without proof');}});try{env.fill('login','phone','13800000000');await env.click('.auth-bridge-controls button');assert.match(document.querySelector('.auth-bridge-error').textContent,/先点击获取验证码/);assert.equal(calls,0);assert.ok(!reviewLink('13800000000').includes('13800000000'));}finally{env.cleanup();}
});
test('rejected and unavailable issuance never grant approval',async()=>{
 let fail=false,status='pending';const env=await setup('/login',initialState(),{authFetch:async path=>path==='request-access'?response(delivery('13800000000')):fail?response({error:'审核服务暂不可用'},503):response(delivery('13800000000',status))});
 try{env.fill('login','phone','13800000000');await env.click('[data-action=login-consent]');await env.click('[data-action=get-code]');fail=true;await env.click('.auth-bridge-refresh');assert.match(document.querySelector('.auth-bridge-error').textContent,/暂不可用/);assert.notEqual(document.querySelector('.auth-bridge-overlay').dataset.status,'approved');fail=false;status='rejected';await env.click('.auth-bridge-refresh');assert.equal(document.querySelector('.auth-bridge-overlay').dataset.status,'rejected');assert.equal(env.stored().loggedIn,false);}finally{env.cleanup();}
});
test('static codes and old local login flags cannot bypass manual issuance',async()=>{
 const state=initialState();state.loggedIn=true;const env=await setup('/login',state,{noAuthSession:true});try{env.fill('login','phone','13800000000');env.fill('login','code','123456');await env.click('[data-action=login-consent]');await env.submit('login');assert.equal(env.stored().loggedIn,false);assert.match(document.querySelector('#toast').textContent,/后台审核发放/);}finally{env.cleanup();}
});
test('session validation fails closed',async()=>{
 const map=new Map([[AUTH_SESSION_KEY,JSON.stringify({token:'invalid',expiresAt:Date.now()+60000})]]),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};const auth=createDemoAuth({storage,fetchImpl:async()=>response({error:'登录已失效'},401)});assert.equal(await auth.restore(),null);assert.equal(auth.hasSession(),false);
});
test('switching phones preserves each request proof and keeps approvals separate',async()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)},phones=['13800000000','13900000000'];let next=0;const auth=createDemoAuth({storage,fetchImpl:async(url,init)=>{const f=JSON.parse(init.body);if(url.endsWith('request-access')){const i=next++;return response({...delivery(f.phone),requestId:'request-'+i,proof:'proof-'+i});}assert.equal(f.proof,f.requestId.replace('request','proof'));return response({...delivery(phones[Number(f.requestId.at(-1))]),challenge:null});}});await auth.requestCode({phone:phones[0],name:'一',agree:true});await auth.requestCode({phone:phones[1],name:'二',agree:true});assert.equal(auth.pendingRequest('request-0').phone,phones[0]);assert.equal((await auth.reviewStatus(phones[0])).status,'pending');assert.equal((await auth.reviewStatus(phones[1])).status,'pending');
});
