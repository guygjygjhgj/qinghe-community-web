export const COGNITIVE_VERSION=1;
export function needsCognitiveWelcome(state,route){
 const seen=state.users[state.userId]?.cognitiveOnboarding;
 return !!state.loggedIn&&new URL(route,'https://qinghe.local').pathname==='/'&&!(seen?.version===COGNITIVE_VERSION&&['finished','deferred'].includes(seen.status));
}

export function createCognitiveOnboarding({document,window,getState,getRoute,markSeen,onError}){
 let host=null,frame=null,account=null,session=null,timer=null,previousFocus=null;
 const backgrounds=new Map(),handledThisSession=new Set();
 function close(){
  if(!host)return;
  window.clearTimeout(timer);host.remove();host=frame=null;account=session=null;
  document.body.classList.remove('cognitive-onboarding-active');
  for(const [el,wasInert]of backgrounds)if(!wasInert)el.removeAttribute('inert');backgrounds.clear();
  if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
 }
 function exit(status){
  const s=getState();if(!host||!s.loggedIn||s.userId!==account)return;
  let failure;
  try{markSeen(account,{version:COGNITIVE_VERSION,status,seenAt:new Date().toISOString()});}
  catch(error){failure=error;}
  // Storage exhaustion must never trap someone in the first-login experience.
  handledThisSession.add(account);close();document.querySelector('#main')?.focus({preventScroll:true});
  if(failure)onError?.(failure);
 }
 function receive(event){
  const data=event.data;
  if(!host||event.origin!==window.location.origin||event.source!==frame.contentWindow||data?.source!=='qinghe-cognitive'||data.version!==COGNITIVE_VERSION||data.session!==session)return;
  if(data.type==='ready'){window.clearTimeout(timer);host.querySelector('.cognitive-loading').hidden=true;}
  if(data.type==='exit'&&['finished','deferred'].includes(data.status))exit(data.status);
 }
 function sync(){
  const s=getState();if(!needsCognitiveWelcome(s,getRoute())||handledThisSession.has(s.userId)){close();return;}
  if(host&&account===s.userId)return;
  close();account=s.userId;session=window.crypto.randomUUID();previousFocus=document.activeElement;
  host=document.createElement('section');host.className='cognitive-onboarding-host';host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-label','首次登录认知小体验');
  frame=document.createElement('iframe');frame.title='青禾社区认知测评小游戏';frame.id='cognitive-frame';
  const url=new URL('cognitive/index.html',document.baseURI);url.searchParams.set('session',session);frame.src=url.href;
  const loading=document.createElement('div');loading.className='cognitive-loading';loading.setAttribute('role','status');
  const text=document.createElement('p');text.textContent='正在打开认知小体验…';
  const retry=document.createElement('button');retry.type='button';retry.textContent='重新打开';retry.hidden=true;retry.onclick=()=>{frame.src=url.href;};
  const later=document.createElement('button');later.type='button';later.textContent='稍后体验，进入首页';later.onclick=()=>exit('deferred');
  loading.append(text,retry,later);host.append(frame,loading);
  for(const el of document.querySelectorAll('.app-shell,.presentation-toolbar,#modal-root,.skip-link')){backgrounds.set(el,el.hasAttribute('inert'));el.setAttribute('inert','');}
  document.body.classList.add('cognitive-onboarding-active');document.body.append(host);frame.focus();
  timer=window.setTimeout(()=>{if(host){text.textContent='小游戏加载较慢，可以重新打开或稍后体验。';retry.hidden=false;}},12000);
 }
 window.addEventListener('message',receive);
 return {sync,dispose(){close();window.removeEventListener('message',receive);}};
}
