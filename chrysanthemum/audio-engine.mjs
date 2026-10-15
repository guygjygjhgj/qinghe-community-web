// Recorded Foley only. No UI tones, music or randomized pitch.
const files=['leaf-pick','leaf-trim','stem-insert','water-pour','scissor-close','glass-set'];
export class GameAudio {
  constructor(){
    this.context=null;this.master=null;this.buffers=new Map();this.active=new Set();this.pauses=new Set();this.muted=false;this.ducked=false;this.last=new Map();
    try{this.muted=localStorage.getItem('chrysanthemum-muted')==='1'}catch{}
    this.raw=new Map();
    this.ready=Promise.all(files.map(async name=>{try{const r=await fetch(`audio/${name}.wav`);if(r.ok)this.raw.set(name,await r.arrayBuffer())}catch{}}));
  }
  async unlock(){
    if(!this.context){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;this.context=new AC();this.context.onstatechange=()=>this.report();this.master=this.context.createGain();this.master.connect(this.context.destination);this.updateGain();this.decoding=this.ready.then(()=>Promise.all([...this.raw].map(async([name,bytes])=>{try{this.buffers.set(name,await this.context.decodeAudioData(bytes.slice(0)))}catch{}}))).then(()=>this.report());}
    if(!this.pauses.size)await this.context.resume().catch(()=>{});
    await this.decoding;
  }
  updateGain(){if(this.master)this.master.gain.setTargetAtTime(this.muted?0:this.ducked?.12:.72,this.context.currentTime,.025)}
  report(){Object.assign(document.documentElement.dataset,{audioState:this.context?.state||'locked',audioReady:String(this.buffers.size),audioActive:[...this.active].filter(v=>!v.stopped).map(v=>v.name).join(','),audioMuted:String(this.muted)})}
  setMuted(value){this.muted=value;this.updateGain();this.report();try{localStorage.setItem('chrysanthemum-muted',value?'1':'0')}catch{}}
  duck(value){this.ducked=value;this.updateGain()}
  play(name,{gain=.7,delay=0,loop=false}={}){
    if(!this.context||this.context.state!=='running'||this.muted||this.pauses.size||!this.buffers.has(name))return null;
    const now=this.context.currentTime;if(now-(this.last.get(name)??-10)<.12)return null;this.last.set(name,now);
    if(this.active.size>=4)return null;
    const source=this.context.createBufferSource(),level=this.context.createGain();source.buffer=this.buffers.get(name);source.loop=loop;
    if(loop){source.loopStart=.12;source.loopEnd=source.buffer.duration-.12;}
    source.connect(level);level.connect(this.master);
    const at=now+delay;level.gain.setValueAtTime(0,at);level.gain.linearRampToValueAtTime(gain,at+.025);
    const voice={name,source,level,stopped:false};this.active.add(voice);
    source.onended=()=>{this.active.delete(voice);source.disconnect();level.disconnect();this.report()};source.start(at);this.report();
    return voice;
  }
  stop(voice,fade=.06){if(!voice||voice.stopped||!this.context)return;voice.stopped=true;const now=this.context.currentTime;voice.level.gain.cancelScheduledValues(now);voice.level.gain.setValueAtTime(voice.level.gain.value,now);voice.level.gain.linearRampToValueAtTime(0,now+fade);try{voice.source.stop(now+fade+.01)}catch{}this.report()}
  stopAll(){for(const voice of this.active)this.stop(voice,0)}
  pause(reason){this.pauses.add(reason);if(this.context?.state==='running')this.context.suspend().catch(()=>{})}
  resume(reason){this.pauses.delete(reason);if(!this.pauses.size)this.context?.resume().catch(()=>{})}
}
