import {isPhone,reviewLink} from './demo-auth.js';

// Connection controls live outside the Figma artboard and never alter its geometry.
export function createAuthBridge({document,window,auth,getPhone,onLogin,onIssued}){
 const controls=document.createElement('span');controls.className='auth-bridge-controls';controls.hidden=true;
 const progress=document.createElement('button');progress.type='button';progress.textContent='审核进度';
 const review=document.createElement('a');review.textContent='管理审核 ↗';review.target='_blank';review.rel='noopener noreferrer';review.href=reviewLink();
 controls.append(progress,review);document.querySelector('.presentation-toolbar')?.append(controls);
 const overlay=document.createElement('div');overlay.className='auth-bridge-overlay';overlay.hidden=true;
 overlay.innerHTML='<section class="auth-bridge-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-bridge-title"><h2 id="auth-bridge-title">验证码审核进度</h2><p class="auth-bridge-phone"></p><p role="status" aria-live="polite" class="auth-bridge-status"></p><p class="auth-bridge-code" role="status"></p><p class="auth-bridge-error" role="alert"></p><div class="auth-bridge-actions"><button type="button" class="auth-bridge-refresh">刷新审核状态</button><a class="auth-bridge-admin" target="_blank" rel="noopener noreferrer">打开审核端（管理员） ↗</a><button type="button" class="auth-bridge-return">返回登录</button></div><p class="auth-bridge-note">验证码由管理员审核后发放，在本网页领取，不发送真实短信。审核端仅网站所有者可访问。</p></section>';
 document.body.append(overlay);
 const status=overlay.querySelector('.auth-bridge-status'),error=overlay.querySelector('.auth-bridge-error'),refresh=overlay.querySelector('.auth-bridge-refresh'),back=overlay.querySelector('.auth-bridge-return');
 let phone='',timer=null,epoch=0,previousFocus=null,lastResult=null;
 const messages={pending:'验证码申请已提交，等待管理员审核发放。此窗口会自动更新。',approved:'后台已审核并发放验证码，请返回登录页填写下方验证码。',rejected:'申请已驳回。请返回登录页核对信息，再重新申请验证码。'};
 function cancel(){epoch++;if(timer!==null)window.clearTimeout(timer);timer=null;}
 function close(){cancel();overlay.hidden=true;previousFocus?.focus?.({preventScroll:true});}
 async function check(){
  if(overlay.hidden)return;cancel();const current=epoch;error.textContent='';refresh.disabled=true;
  try{const result=await auth.reviewStatus(phone);if(current!==epoch||overlay.hidden)return;lastResult=result;status.textContent=result.deliveryExpired?'验证码已过期或已使用，请返回登录页重新申请后台发放。':messages[result.status];overlay.dataset.status=result.status;overlay.querySelector('.auth-bridge-code').textContent=result.challenge?'后台发放验证码：'+result.challenge.code+'（发放后10分钟有效）':'';onIssued?.(result.challenge||null);}
  catch(e){if(current===epoch&&!overlay.hidden)error.textContent=e.message;}
  finally{if(current===epoch&&!overlay.hidden){refresh.disabled=false;if(overlay.dataset.status!=='approved'&&overlay.dataset.status!=='rejected')timer=window.setTimeout(()=>{if(document.hidden)timer=window.setTimeout(check,5000);else check();},5000);}}
 }
 function show(value=getPhone()||auth.pendingRequest()?.phone){
  phone=isPhone(value)?value:'';cancel();lastResult=null;previousFocus=document.activeElement;overlay.hidden=false;delete overlay.dataset.status;
  overlay.querySelector('.auth-bridge-phone').textContent=phone?'申请手机号：'+phone:'请先在登录页填写手机号';
  overlay.querySelector('.auth-bridge-admin').href=reviewLink(phone,auth.pendingRequest(phone)?.requestId);overlay.querySelector('.auth-bridge-code').textContent='';status.textContent=phone?'正在连接审核服务…':'填写手机号并提交申请后，可查询审核结果。';error.textContent='';refresh.disabled=!phone;back.focus({preventScroll:true});if(phone)check();
 }
 progress.addEventListener('click',()=>show());refresh.addEventListener('click',check);back.addEventListener('click',()=>{const value=phone;close();onLogin(value,lastResult);});
 overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
 overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const items=[...overlay.querySelectorAll('button:not(:disabled),a[href]')];if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0]?.focus();}}});
 window.addEventListener('focus',()=>{if(!overlay.hidden&&phone)check();});window.addEventListener('pagehide',close);
 function sync(){const form=document.querySelector('form[data-form=login]'),query=new URL(window.location.hash.slice(1)||'/','https://qinghe.local').searchParams,pending=auth.pendingRequest(query.get('request')||undefined);controls.hidden=!form;if(!form&&!overlay.hidden)close();if(form&&pending&&query.get('request')===pending.requestId&&!getPhone())form.elements.namedItem('phone').value=pending.phone;const selected=getPhone()||pending?.phone;review.href=reviewLink(selected,auth.pendingRequest(selected)?.requestId);}
 document.addEventListener('input',e=>{if(e.target.matches?.('form[data-form=login] [name=phone]'))sync();});
 return {show,sync,close};
}
