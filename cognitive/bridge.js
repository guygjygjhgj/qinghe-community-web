'use strict';
// Only the current authenticated host may receive task records or acknowledge saving.
const cognitiveSession=new URLSearchParams(location.search).get('session');
if(new URLSearchParams(location.search).get('demoTools')==='1')document.body.classList.remove('screen-only');
const cognitiveEmbedded=window.parent!==window&&!!cognitiveSession;
window.qingheCognitiveReport=()=>{
 if(!cognitiveEmbedded)return;
 window.parent.postMessage({source:'qinghe-cognitive',type:'result',version:1,session:cognitiveSession,result:buildReport()},location.origin);
};
window.addEventListener('message',event=>{
 const d=event.data;if(!cognitiveEmbedded||event.origin!==location.origin||event.source!==window.parent||d?.source!=='qinghe-community'||d.session!==cognitiveSession)return;
 if(d.type==='context'&&typeof d.resident?.sourceUserId==='string')window.qingheCognitiveResident={sourceUserId:d.resident.sourceUserId,name:String(d.resident.name||'未命名居民').slice(0,60)};
 const status=document.querySelector('#save-status');
 if(d.type==='saved'&&d.assessmentId===state.assessmentId&&status){status.textContent='已保存至当前账号。社区端可在同一浏览器查看；跨设备请导出记录。';document.querySelector('#retry-save')?.remove();}
 if(d.type==='save-error'&&status){status.textContent='未能保存。请导出本次记录保留备份，或重试保存。';if(!document.querySelector('#retry-save')){const b=document.createElement('button');b.id='retry-save';b.type='button';b.className='outline';b.textContent='重试保存';b.onclick=window.qingheCognitiveReport;status.after(b);}}
});
function stopCognitiveMedia(){
 stopTick();state.paused=true;
 if('speechSynthesis' in window)window.speechSynthesis.cancel();
 if(state.audio&&state.audio.state!=='closed')state.audio.close().catch(()=>{});
}
window.qingheCognitiveExit=status=>{
 stopCognitiveMedia();
 if(cognitiveEmbedded)window.parent.postMessage({source:'qinghe-cognitive',type:'exit',version:1,session:cognitiveSession,status},location.origin);
 else location.assign(new URL('../#/',location.href).href);
};
const cognitiveBack=document.createElement('button');
cognitiveBack.type='button';cognitiveBack.className='icon-button';cognitiveBack.id='community-return';
cognitiveBack.textContent='‹';cognitiveBack.style.fontSize='24px';cognitiveBack.style.lineHeight='1';
cognitiveBack.setAttribute('aria-label','返回社区首页');
document.querySelector('.mini-brand').prepend(cognitiveBack);
cognitiveBack.onclick=()=>{
 if(state.mode==='welcome'){window.qingheCognitiveExit('deferred');return;}
 if(state.mode==='report'){window.qingheCognitiveExit('finished');return;}
 openInfo('先返回社区首页？','<p>本次作答只保留在当前页面，退出后会清空。可以继续体验，或稍后再来。</p><div class="actions"><button class="primary" id="exit-community">稍后体验，返回首页</button><button class="outline" id="keep-experience">继续体验</button></div>');
 document.querySelector('#exit-community').onclick=()=>window.qingheCognitiveExit('deferred');
 document.querySelector('#keep-experience').onclick=()=>{document.querySelector('#info-dialog').close();resume();};
};
window.addEventListener('pagehide',stopCognitiveMedia);
if(cognitiveEmbedded)window.parent.postMessage({source:'qinghe-cognitive',type:'ready',version:1,session:cognitiveSession},location.origin);
