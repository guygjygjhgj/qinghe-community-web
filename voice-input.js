import {VoiceSession} from './voice-session.js';
import {insertionContext,insertText} from './interaction.js';
import {esc} from './legacy-views.js';

export function createVoiceInput({getForm,openModal,closeModal,toast,helpers}){
 let session=null,context=null,recorder=null,stream=null,clip=null,audio=null,captureTicket=0,generation=0,pending=false,rawStarted=0,rawElapsed=0,rawTimer=null,hadAudio=false,recognizedText='';
 const stopAudio=()=>{if(rawTimer!==null)window.clearInterval(rawTimer);rawTimer=null;if(rawStarted){rawElapsed=Math.floor((Date.now()-rawStarted)/1000);rawStarted=0;}if(recorder?.state==='recording')recorder.stop();stream?.getTracks().forEach(t=>t.stop());stream=null;};
 const input=()=>getForm(context?.form)?.elements.namedItem(context?.field);
 function update(snapshot){
  const area=document.querySelector('#speech-text');if(!area)return;
  const busy=['requesting','listening','stopping'].includes(snapshot.state);
  if(snapshot.state==='error')stopAudio();
  area.readOnly=busy;if(busy&&area.value!==snapshot.text)area.value=snapshot.text;
  const continuation=document.querySelector('#speech-text-continuation');if(continuation)continuation.hidden=!!area.value.trim();
  const status=document.querySelector('#recording-status');
  if(snapshot.error)toast(snapshot.error);if(snapshot.error)status.textContent=snapshot.error;else if(['idle','unsupported'].includes(snapshot.state))status.textContent='可以录音，也可以直接输入';status.setAttribute('aria-label',snapshot.error||({idle:'可以录音，也可以直接输入。录音结束后可校对文字。',unsupported:'此浏览器不支持语音识别，您可以直接输入文字。',requesting:'等待麦克风权限，请在浏览器提示中选择。',listening:'正在听您说，点击“停止录音”结束。',stopping:'正在处理最后一句，请稍候。'})[snapshot.state]||'');
  const elapsed=rawStarted?Math.floor((Date.now()-rawStarted)/1000):rawElapsed||snapshot.elapsed;
  document.querySelector('#recording-timer').textContent=String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(elapsed%60).padStart(2,'0');
  document.querySelector('#voice-wave')?.classList.toggle('hidden',snapshot.state!=='listening');
  const start=document.querySelector('[data-action="start-recording"]');if(start){start.disabled=busy||pending||recorder?.state==='recording';start.setAttribute('aria-disabled',String(start.disabled));}
  const stop=document.querySelector('[data-action="stop-recording"]');if(stop)stop.disabled=!['requesting','listening'].includes(snapshot.state);
  const finish=document.querySelector('[data-action="finish-recording"]');finish.disabled=snapshot.state==='requesting'||snapshot.state==='stopping'||(!area.value.trim()&&recorder?.state!=='recording')||area.value.length>context.remaining;
  const count=document.querySelector('#speech-counter');if(count)count.textContent=`${area.value.length} / ${context.remaining} 字可插入`;count?.classList.toggle('over-limit',area.value.length>context.remaining);
  if(area.value.length>context.remaining)toast(`文字超过可插入的${context.remaining}字，停止录音后请精简。`);
 }
 function confirmation(text){
  if(!context)return;
  recognizedText=text;
  captureTicket++;pending=false;stopAudio();
  if(text.length>context.remaining){toast(`请将文字精简到${context.remaining}字以内`);return;}
  session?.close();const h=helpers();
  openModal('', 'voice-confirm', {text,elapsed:rawElapsed||session?.elapsed||0,recorded:hadAudio||session?.startedAt!=null}, true);
  document.querySelector('#confirmed-speech').addEventListener('input',event=>{const counter=document.querySelector('#confirmed-counter');if(counter)counter.textContent=`${event.target.value.length} / ${context.remaining}`;document.querySelector('[data-action="use-speech"]').disabled=!event.target.value.trim()||event.target.value.length>context.remaining;});
 }
 function open(form,field,initialText='',keepContext=false){
  generation++;captureTicket++;pending=false;stopAudio();clip=null;hadAudio=false;rawElapsed=0;
  session?.close();
  if(!keepContext){const target=getForm(form)?.elements.namedItem(field||(['chat','comment'].includes(form)?'text':'body'));if(!target||typeof target.value!=='string')throw Error('请先打开可以输入文字的页面');context={form,field:target.name,...insertionContext(target)};}
  if(context.remaining<=0){toast('输入框已达到字数上限，请先删减一些文字');return;}
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition,h=helpers();
  openModal('', 'voice', {text:initialText}, keepContext);
  session=new VoiceSession(Recognition,{onChange:update,onFinish:confirmation});session.text=initialText;session.emit();
  document.querySelector('#speech-text').addEventListener('input',event=>session.edit(event.target.value));
 }
 function insert(){
  const target=input(),text=document.querySelector('#confirmed-speech')?.value;
  if(!target||!text?.trim())throw Error('请填写要插入的文字');
  const result=insertText(target.value,text,context);target.value=result.value;target.dataset.inputMode=hadAudio||session?.startedAt!=null?'voice_transcript':'typed';target.dispatchEvent(new Event('input',{bubbles:true}));if(hadAudio||session?.startedAt!=null)document.dispatchEvent(new window.CustomEvent('qinghe-voice-event',{detail:{type:text===recognizedText?'voice_transcript':'voice_corrected',elapsedMs:(rawElapsed||session?.elapsed||0)*1000,revisionCount:text===recognizedText?0:1}}));
  closeModal();target.focus({preventScroll:true});target.setSelectionRange(result.caret,result.caret);toast('文字已插入，可以继续修改');
 }
 return {open,start:async()=>{
   if(pending||recorder?.state==='recording')return;
   const ticket=++captureTicket,opened=generation,button=document.querySelector('[data-action=start-recording]');pending=true;if(button)button.disabled=true;
   if(window.MediaRecorder&&navigator.mediaDevices?.getUserMedia){try{const received=await navigator.mediaDevices.getUserMedia({audio:true});if(ticket!==captureTicket||!context){received.getTracks().forEach(t=>t.stop());return;}pending=false;stream=received;const chunks=[];recorder=new window.MediaRecorder(stream);const localRecorder=recorder;recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>{if(context&&opened===generation)clip=new Blob(chunks,{type:localRecorder.mimeType});};recorder.start();hadAudio=true;rawStarted=Date.now();rawTimer=window.setInterval(()=>{if(Date.now()-rawStarted>=60000){stopAudio();session?.stop();}session?.emit();},250);}catch(error){if(ticket===captureTicket){pending=false;stopAudio();if(button)button.disabled=false;toast(error.name==='NotAllowedError'?'麦克风权限未开启，可以直接输入文字。':'录音暂不可用，可以继续输入文字。');}return;}}
   pending=false;
   session?.start(document.querySelector('#speech-text')?.value);
   session?.emit();
  },stop:()=>{captureTicket++;pending=false;stopAudio();session?.stop();session?.emit();},finish:()=>{captureTicket++;pending=false;stopAudio();session?.finish(document.querySelector('#speech-text')?.value);},insert,
  play:()=>{if(clip?.size){if(audio){audio.pause();URL.revokeObjectURL(audio.src);}audio=new Audio(URL.createObjectURL(clip));audio.play().catch(()=>toast('录音暂时无法播放'));return;}if(hadAudio){toast('录音正在处理，请稍后再播放');return;}const text=document.querySelector('#confirmed-speech')?.value;if(text&&window.speechSynthesis){speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='zh-CN';speechSynthesis.speak(utterance);toast('当前没有录音文件，正在朗读转写文字');}else toast('当前没有可播放的录音');},
  rerecord:()=>{open(context.form,context.field,'',true);},
  close:()=>{generation++;captureTicket++;pending=false;session?.close();session=null;context=null;stopAudio();if(audio){audio.pause();URL.revokeObjectURL(audio.src);audio=null;}clip=null;}};
}
