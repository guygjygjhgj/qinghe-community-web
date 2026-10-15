'use strict';
// Only the onboarding disposition crosses the frame boundary, never task answers.
const cognitiveSession=new URLSearchParams(location.search).get('session');
const cognitiveEmbedded=window.parent!==window&&!!cognitiveSession;
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
