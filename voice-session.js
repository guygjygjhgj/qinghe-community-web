const errors={
 'not-allowed':'麦克风权限未开启。您可以在浏览器中允许使用麦克风，或直接输入文字。',
 'service-not-allowed':'浏览器没有启用语音识别服务，可以直接输入文字。',
 'audio-capture':'没有找到可用的麦克风，请检查设备连接。',
 'no-speech':'没有听到清晰的声音，可以重试或直接输入文字。',
 network:'语音识别服务连接失败，已保留文字，可以直接修改。',
 aborted:'录音已取消，已保留文字。'
};
export class VoiceSession{
 constructor(Recognition,{onChange=()=>{},onFinish=()=>{},clock=()=>Date.now(),interval=(fn)=>setInterval(fn,250),clear=clearInterval,timeout=(fn)=>setTimeout(fn,4000),cancelTimeout=clearTimeout,maxSeconds=60}={}){
  Object.assign(this,{Recognition,onChange,onFinish,clock,interval,clear,timeout,cancelTimeout,maxSeconds,state:Recognition?'idle':'unsupported',text:'',error:'',elapsed:0,epoch:0,engine:null,timer:null,stopTimeout:null,finishRequested:false});
 }
 snapshot(){return {state:this.state,text:this.text,error:this.error,elapsed:this.elapsed,supported:!!this.Recognition};}
 emit(){this.onChange(this.snapshot());}
 edit(text){if(!['listening','requesting','stopping','closed'].includes(this.state)){this.text=text;this.emit();}}
 stopTimer(){if(this.timer!==null)this.clear(this.timer);this.timer=null;}
 stopWaiting(){if(this.stopTimeout!==null)this.cancelTimeout(this.stopTimeout);this.stopTimeout=null;}
 start(initialText=this.text){
  if(!this.Recognition||['requesting','listening','stopping','closed'].includes(this.state))return;
  this.stopTimer();this.stopWaiting();const previous=this.engine,epoch=++this.epoch,engine=new this.Recognition();if(previous){try{previous.abort();}catch{}}this.engine=engine;this.prefix=initialText;this.text=initialText;this.error='';this.elapsed=0;this.startedAt=null;this.finishRequested=false;this.state='requesting';this.emit();
  const active=()=>epoch===this.epoch&&this.state!=='closed';
  Object.assign(engine,{lang:'zh-CN',continuous:true,interimResults:true});
  engine.onstart=()=>{if(!active())return;this.state='listening';this.startedAt=this.clock();this.emit();this.timer=this.interval(()=>{if(!active())return;this.elapsed=Math.floor((this.clock()-this.startedAt)/1000);this.emit();if(this.elapsed>=this.maxSeconds)this.stop();});};
  engine.onresult=event=>{if(!active()||this.state==='error')return;const results=Array.from(event.results||[]);if(!results.length)return;let result='';for(const item of results)result+=item[0]?.transcript||'';this.text=[this.prefix,result].filter(Boolean).join(this.prefix&&result?'\n':'');this.emit();};
  engine.onerror=event=>{if(!active())return;this.error=errors[event.error]||'录音暂时不可用，已保留文字，您可以手动修改。';this.state='error';this.finishRequested=false;this.stopTimer();this.stopWaiting();this.emit();};
  engine.onend=()=>{if(!active())return;this.stopTimer();this.stopWaiting();this.engine=null;if(this.startedAt!==null)this.elapsed=Math.floor((this.clock()-this.startedAt)/1000);if(this.state!=='error')this.state='idle';this.emit();if(this.finishRequested){this.finishRequested=false;this.finish();}};
  try{engine.start();}catch(error){if(active()){this.error=errors[error.name==='NotAllowedError'?'not-allowed':'aborted'];this.state='error';this.engine=null;this.emit();}}
 }
 stop(){
  if(!['requesting','listening'].includes(this.state))return;
  this.state='stopping';this.emit();
  try{this.engine?.stop();if(this.state==='stopping'){const epoch=this.epoch;this.stopTimeout=this.timeout(()=>{if(this.epoch!==epoch||this.state!=='stopping')return;++this.epoch;this.stopTimer();const engine=this.engine;this.engine=null;try{engine?.abort();}catch{}this.state='error';this.finishRequested=false;this.error='识别未能及时结束，已保留当前文字，请校对后继续。';this.emit();});}}catch{this.stopTimer();this.engine=null;this.state='idle';this.emit();if(this.finishRequested)this.finish();}
 }
 finish(manualText){
  if(this.state==='closed')return;
  if(['requesting','listening','stopping'].includes(this.state)){this.finishRequested=true;if(this.state!=='stopping')this.stop();return;}
  if(manualText!==undefined)this.text=manualText;
  if(!this.text.trim()){this.error='还没有文字，请先录音或手动输入。';this.emit();return;}
  this.onFinish(this.text);
 }
 close(){
  ++this.epoch;this.stopTimer();this.stopWaiting();this.state='closed';const engine=this.engine;this.engine=null;
  if(engine){engine.onstart=()=>{try{engine.abort();}catch{}};engine.onresult=null;engine.onerror=null;engine.onend=null;try{engine.abort();}catch{}}
 }
}
