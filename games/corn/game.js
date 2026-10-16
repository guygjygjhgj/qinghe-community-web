import {META,SCENES,REDO} from './art.js';
import {CELLS,maskFor,completedCells,HARVEST_SLOTS,landing,countKernels} from './materials.js';
import {fresh,validate,clone,reduce,LABELS,RACK_GOALS,grainCount} from './engine.js';
import {unlockAudio,sound,stopAudio,speak,soundEnabled} from './audio.js';
import {animate,hold,travel,restore,snapshot,dissolve,pauseMotion,kernelPath,reduced} from './motion.js';
const $=s=>document.querySelector(s), scene=$('#scene'), actions=$('#stage-actions'), controls=$('#controls'), modal=$('#modal');
const preview=location.pathname.endsWith('motion-preview.html');const KEY=preview?'autumn-motion-preview':'autumn-corn-progress-v1',WORKS=preview?'autumn-motion-preview-works':'autumn-corn-works-v1';
let state=fresh(),history=[],selected=null,drag=null,phaseAge=0,lastTime=performance.now(),saveTime=0,toastUntil=0,modalFocus=null,storageOK=true;
let busy=false,release=null;
try{const saved=preview?null:JSON.parse(localStorage.getItem(KEY));if(validate(saved?.state)){state=saved.state;history=(saved.history||[]).filter(validate).slice(-25);}soundEnabled(localStorage.getItem('autumn-sound')!=='off');}catch{}
if(preview){const phase=location.hash.slice(1);state.phase=['shell','sort','pour'].includes(phase)?phase:'harvest';if(state.phase!=='harvest'){state.harvested=[0,1,2];state.peels=[4,4,4];}if(['sort','pour'].includes(phase)){state.grains=Array.from({length:3},()=>Array(6).fill(true));state.shellIndex=2;}if(phase==='pour')state.sorted=[0,1,2];}
function save(){if(preview)return;try{localStorage.setItem(KEY,JSON.stringify({state,history}));}catch{storageOK=false;}}
function notice(t){$('#detail').textContent=t;$('#sr-status').textContent=t;toastUntil=performance.now()+3500;}
function element(tag,cls,parent=scene){const e=document.createElement(tag);if(cls)e.className=cls;parent.append(e);return e;}
function box(e,o){Object.assign(e.style,{left:o.x+'px',top:o.y+'px',width:o.w+'px',height:o.h+'px'});}
function art(o,z=10){const e=element('div','sprite');box(e,o);e.style.zIndex=o.clip?Math.max(z,40):z;if(o.rotation)e.style.transform=`rotate(${o.rotation}deg)`;if(o.opacity!==undefined)e.style.opacity=o.opacity;if(o.clip)e.style.clipPath=`polygon(${o.clip.map(p=>p.map(v=>v*100+'%').join(' ')).join(',')})`;
 if(o.r3){e.dataset.contour=JSON.stringify(o.points.map(p=>[p[0]/o.w*100,p[1]/o.h*100]));const sh=element('div','shade',e);sh.style.cssText='inset:0;filter:blur(6px);transform:translate(6px,9px);opacity:.30';sh.innerHTML=`<svg width="${o.w}" height="${o.h}" style="overflow:visible"><polygon points="${o.points.map(p=>p.join(',')).join(' ')}" fill="#5c3a16"/></svg>`;}
 const img=element('img','art',e);img.src=`assets/${o.asset}.png`;img.alt='';img.draggable=false;img.addEventListener('error',()=>notice('有一张素材未载入，请刷新重试。'),{once:true});
 if(o.r3){box(img,{x:o.tx,y:o.ty,w:o.rawW,h:o.rawH});img.style.transformOrigin='0 0';img.style.transform=`rotate(${o.angle}deg)`;}else{const m=META[o.asset],b=m.bounds,s=Math.min(o.w/(b[2]-b[0]),o.h/(b[3]-b[1]));box(img,o.fit||{x:(o.w-(b[2]-b[0])*s)/2-b[0]*s,y:(o.h-(b[3]-b[1])*s)/2-b[1]*s,w:m.width*s,h:m.height*s});}
 return e;}
function item(asset,x,y,w,h,extra={}){return{asset,x,y,w,h,...extra};}
function backdrop(name){const img=element('img','background');img.src=`assets/${name}.png`;img.alt='';}
function staticScene(id,filter=()=>true){const s=REDO[id]||SCENES[id];backdrop(s.bg);s.items.filter(filter).forEach((o,i)=>art(o,10+i));}
function button(text,fn,parent=controls,cls=''){const e=element('button',cls,parent);e.type='button';e.textContent=text;e.onclick=()=>{if(busy&&!modal.contains(e))return;unlockAudio();fn();};return e;}
function local(text,fn,x=410,y=1190){const e=button(text,fn,actions,'local-action');box(e,{x,y,w:290,h:76});return e;}
function target(label,o,fn){const e=button('',fn,scene,'target');e.setAttribute('aria-label',label);box(e,o);e.style.zIndex=7;return e;}
function point(ev){const r=$('#game').getBoundingClientRect();return{x:(ev.clientX-r.left)*750/r.width,y:(ev.clientY-r.top)*1594/r.height};}
function within(p,b){return p.x>b.x&&p.x<b.x+b.w&&p.y>b.y&&p.y<b.y+b.h;}
function interactive(e,label,key,click,drop){e.classList.add('interactive');e.dataset.key=key;if(selected===key)e.classList.add('chosen');const b=button('',()=>{if(b.suppress){b.suppress=false;return;}click();},e,'object-hit');b.setAttribute('aria-label',label);if(e.dataset.contour)b.style.clipPath='polygon('+JSON.parse(e.dataset.contour).map(p=>p[0]+'% '+p[1]+'%').join(',')+')';
 e.dataset.restTransform=e.style.transform;
 b.onpointerdown=ev=>{if(busy||!modal.hidden||ev.button!==0)return;unlockAudio();const p=point(ev);drag={e,b,key,start:p,last:p,base:e.style.transform,drop};b.setPointerCapture(ev.pointerId);};
 b.onpointermove=ev=>{if(!drag||drag.b!==b)return;drag.last=point(ev);let dx=drag.last.x-drag.start.x,dy=drag.last.y-drag.start.y;if(Math.hypot(dx,dy)>12){drag.moved=true;e.classList.add('dragging');if(key==='leaf'){e.style.transform=`translate(${dx*.025}px,${Math.min(12,dy*.035)}px) ${drag.base} rotate(${Math.min(2,dy*.007)}deg)`;}else{if(key==='pour'){dx=Math.max(-85,Math.min(55,dx*.22));dy=Math.max(-25,Math.min(75,dy*.18));}const tug=key.startsWith('ear')?Math.max(-7,Math.min(7,dx*.045)):0;e.style.transform=`translate(${dx}px,${dy}px) ${drag.base} rotate(${tug}deg)`;}}};
 b.onpointerup=async ev=>{if(!drag||drag.b!==b)return;const d=drag;drag=null;if(d.moved){b.suppress=true;release=d;const accepted=await d.drop?.(d.last,{x:d.last.x-d.start.x,y:d.last.y-d.start.y},d);if(!accepted&&e.isConnected)await restore(e);release=null;}else e.classList.remove('dragging');};
 b.onpointercancel=()=>{if(drag?.b===b){drag=null;restore(e);}};
 b.onkeydown=ev=>{if(state.phase==='rack'&&/^Arrow/.test(ev.key)){ev.preventDefault();const i=Number(key.split('-')[1]),p={...state.rack[i]};p.x+=ev.key==='ArrowLeft'?-20:ev.key==='ArrowRight'?20:0;p.y+=ev.key==='ArrowUp'?-20:ev.key==='ArrowDown'?20:0;act({type:'RACK_MOVE',index:i,point:p},'basket');requestAnimationFrame(()=>document.querySelector(`[data-key="${key}"] button`)?.focus());}};
 return e;}
function select(key){selected=selected===key?null:key;document.querySelectorAll('.chosen').forEach(e=>e.classList.remove('chosen'));if(selected)document.querySelector(`[data-key="${key}"]`)?.classList.add('chosen');notice(selected?'已选中，点一下要放的位置。':'已取消选择。');}
async function act(event,noise=''){
 if(busy)return false;const next=reduce(state,event);if(next===state){if(event.type==='RACK_MOVE')notice('这一处超出晾架了，再往里面放一点。');return false;}
 busy=true;$('#game').classList.add('in-motion');const previous=clone(state);
 try{await beforeAction(event,next);if(noise&&event.type!=='GRAIN')sound(noise);history.push(previous);history=history.slice(-25);state=next;selected=null;phaseAge=0;if(state.phase==='done')collect();save();await present(previous,event);return true;}
 finally{busy=false;$('#game').classList.remove('in-motion');release=null;}
}
async function auto(type){if(busy)return;busy=true;const previous=clone(state);state=reduce(state,{type});phaseAge=0;selected=null;save();try{await present(previous,{type});}finally{busy=false;}}
const findObject=key=>scene.querySelector(`[data-key="${key}"]`);
async function beforeAction(event,next){
 const dragDrop=!!release,ms=dragDrop?380:900;
 switch(event.type){
 case'HARVEST':{
  const e=findObject('ear'+event.index),slot=state.harvested.length,dest=HARVEST_SLOTS[slot];
  notice(dragDrop?'轻轻放下，让玉米在篮里停稳。':'握住玉米，轻轻掰下，再放进篮里。');
  await travel(e,{x:dest.x+dest.w/2,y:dest.y+dest.h/2},{duration:dragDrop?420:1100,lift:dragDrop?12:48,angle:dest.rotation,scale:dest.w/parseFloat(e.style.width),detach:!dragDrop});
  sound('basket');await hold(280);break;
 }
 case'RACK_MOVE':{const e=findObject('rack-'+event.index),p=state.rack[event.index];await travel(e,{x:parseFloat(e.style.left)+parseFloat(e.style.width)/2+event.point.x-p.x,y:parseFloat(e.style.top)+parseFloat(e.style.height)/2+event.point.y-p.y},{duration:dragDrop?260:650,lift:dragDrop?5:24});await hold(180);break;}
 case'POSITION':await travel(findObject('position'),{x:421,y:697},{duration:ms,lift:40,angle:25,scale:1.1});await hold(200);break;
 case'PEEL':{
  const leaf=art(item('husk-leaf',state.peelFlipped?140:385,550,215,410,{rotation:state.peelFlipped?15:-12}),36);
  notice('顺着叶片往下剥，收在一旁。');sound('peel');
  await animate(leaf,[{opacity:0,transform:'rotate(-10deg)'},{opacity:1,transform:'translate(20px,55px) rotate(9deg)'}],300);
  await travel(leaf,{x:600,y:1210},{duration:620,lift:20,angle:55,scale:.52});await hold(160);break;
 }
 case'FLIP_PEEL':{const e=findObject('peel-hero')||findObject('leaf');await animate(e,[{transform:'scaleX(1)'},{transform:'scaleX(.04)'}],260,'ease-in');break;}
 case'SILK':await travel(findObject('silk'),{x:605,y:1210},{duration:ms,lift:25,angle:20,scale:.4});sound('peel');await hold(180);await travel(findObject('peel-hero'),{x:157+state.peelIndex*150,y:1147},{duration:650,lift:30,angle:-28,scale:.29});await hold(300);break;
 case'FLIP_SHELL':await Promise.all([...scene.querySelectorAll('[data-shell-part]')].map(e=>animate(e,[{transform:`scaleX(${state.face?-1:1})`},{transform:`scaleX(${state.face?-.04:.04})`}],260,'ease-in')));break;
 case'GRAIN':{
  await loosenKernels(event.index);
  if(next.phase!==state.phase){notice('这一穗干净了，先把玉米芯放到一旁。');await hold(650);await travel(findObject('grains'),{x:100+state.shellIndex*82,y:375+(state.shellIndex%2)*75},{duration:850,lift:35,angle:-65,scale:.34});await hold(450);}break;
 } case'SORT':await travel(findObject('scrap-'+event.index),{x:585+event.index*35,y:1175+event.index*27},{duration:ms,lift:40,angle:0,scale:event.index===1?.43:.42});await hold(next.phase==='pour'?500:130);break;
 case'POUR':{const tray=findObject('pour');if(tray)await animate(tray,[{transform:tray.style.transform||'none'},{transform:'translate(-25px,25px) rotate(-5deg)'}],350);const update=(async()=>{for(let step=1;step<=9;step++){await hold(100);updatePourMaterial(state.poured+(next.poured-state.poured)*step/9);}})();await Promise.all([dropKernels({x:440,y:570},{x:385,y:790},Math.round(countKernels(state)*(next.poured-state.poured)/100)),update]);await hold(150);if(next.phase==='done')await hold(650);break;}
 }
}
const SCENE_BACKGROUND={intro:'garden',harvest:'garden',harvested:'garden',peel:'table',peeled:'basket',rack:'rack',racked:'rack',dry:'rack',position:'table',shell:'table',shelled:'table',sort:'table',pour:'table',done:'table'};
async function present(previous,event){
 const changed=previous.phase!==state.phase;
 const flip=event.type==='FLIP_PEEL'||event.type==='FLIP_SHELL';
 if(flip){render();const nodes=event.type==='FLIP_PEEL'?[findObject('peel-hero')||findObject('leaf')]:[...scene.querySelectorAll('[data-shell-part]')];const sign=event.type==='FLIP_PEEL'||state.face?-1:1;await Promise.all(nodes.map(e=>animate(e,[{transform:`scaleX(${sign*.04})`},{transform:`scaleX(${sign})`}],300,'ease-out')));return;}
 // Keep fixed surfaces stationary during repeated actions. Only a change of workspace gets a full transition.
 const cross=changed||event.type==='PEEL'||event.type==='SILK';
 if(!cross){render();return;}
 const old=snapshot(scene);
 const caption=changed&&SCENE_BACKGROUND[previous.phase]!==SCENE_BACKGROUND[state.phase]?({peel:'把采好的玉米带到桌边',peeled:'三穗整理好了，一起收进篮里',rack:'把玉米搬到有秋阳的晾架上',position:'晾好了，回到桌边慢慢脱粒'}[state.phase]||''):'';
 render();await dissolve(scene,old,{caption,duration:caption?850:changed?640:420});
}
function grainPile(id,count,geometry,parent=scene,z=26){
 const e=element('div','sprite',parent);e.id=id;e.style.zIndex=z;box(e,{x:0,y:0,w:750,h:1594});e.dataset.pileGeometry=JSON.stringify(geometry);updateGrainPile(e,count);return e;
}
function updateGrainPile(e,count){
 if(!e)return;const g=JSON.parse(e.dataset.pileGeometry),wanted=Math.max(0,Math.round(count));
 while(e.childElementCount>wanted)e.lastElementChild.remove();
 for(let i=e.childElementCount;i<wanted;i++){const p=landing(i),x=g.x+(p.x-373)*g.rx/215,y=g.y+(p.y-910)*g.ry/69;const grain=art(item('kernel',x,y,12+i%4,15+i%4,{rotation:p.angle}),1);e.append(grain);grain.classList.add('settled-kernel');}
}
function updatePourMaterial(percent){const total=countKernels(state);updateGrainPile($('#pour-fill'),total*percent/100);updateGrainPile($('#pour-source'),total*(1-percent/100));}
async function dropKernels(from,to,count=18){
 const jobs=Array.from({length:count},async(_,i)=>{await hold(i*900/count+(i%3)*9);return singleKernel({x:from.x+(i%4-1.5)*8,y:from.y+(i%3)*5},{x:to.x+Math.sin(i*2.4)*80,y:to.y+Math.cos(i*1.7)*26},i,{size:13+i%4,persist:false});});await Promise.all(jobs);
}function renderSettledKernels(count){
 for(let i=0;i<count;i++){const p=landing(i);const e=art(item('kernel',p.x,p.y,12+i%4,15+i%4,{rotation:p.angle}),26);e.classList.add('settled-kernel');}
}
async function singleKernel(from,to,index,{persist=true,size=15}={}){
 const e=art(item('kernel',from.x,from.y,size,size*1.18),38);e.classList.add('falling-kernel');
 if(!reduced())await animate(e,kernelPath(from,to,index),390+(index%7)*22,'linear');
 const dx=to.x-from.x,dy=to.y-from.y,turn=(index*137.5)%360;
 const finish=`translate(${dx}px,${dy}px) rotate(${turn}deg)`;
 if(!reduced())await animate(e,[{transform:finish},{transform:`translate(${dx+3}px,${dy-3-index%3}px) rotate(${turn+18}deg)`,offset:.4},{transform:finish}],110+index%4*14);
 e.style.transform=finish;e.getAnimations().forEach(a=>a.cancel());e.style.zIndex=26;
 e.classList.remove('falling-kernel');e.classList.add('settled-kernel');if(index%7===0)sound('grain');
 if(!persist)e.remove();return e;
}
async function loosenKernels(segment){
 const coat=scene.querySelector('[data-shell-coat]'),removed=completedCells(state.grains[state.shellIndex],state.face);
 const cells=CELLS.filter(c=>c.segment===segment),visible=cells.filter(c=>c.visible);
 cells.filter(c=>!c.visible).forEach(c=>removed.add(c.id));
 const count=countKernels(state);
 const jobs=visible.map(async(c,i)=>{await hold(25+i*13+(i%4)*11);removed.add(c.id);coat.style.maskImage=maskFor(removed);
  const x=state.face?111+620-c.x:111+c.x;await singleKernel({x,y:366+c.y},landing(count+i),count+i,{size:12+i%5});
 });
 await Promise.all(jobs);cells.forEach(c=>removed.add(c.id));coat.style.maskImage=maskFor(removed);
 if(state.grains[state.shellIndex].slice(state.face*3,state.face*3+3).filter(Boolean).length===2)await animate(coat,[{opacity:1},{opacity:0}],180);
 await hold(150);
}
function undo(){if(busy||!history.length)return;state=history.pop();state.undoCount=(state.undoCount||0)+1;phaseAge=0;selected=null;save();render();notice('已退回刚才的一步。');}
function reserve(count,clean=false){art(item('tray',440,110,465,410),12);for(let i=0;i<count;i++)art(item(clean?'corn-clean-low':'corn-husked',460+i*145,150-i*20,clean?360:240,clean?240:310,{rotation:clean?0:-22}),13+i);const rim=SCENES.C03.items.find(o=>o.clip);art(rim,17);}
function cobs(n){for(let i=0;i<n;i++)art(item('corn-bare',25+i*82,250+(i%2)*75,150,250,{rotation:-65}),18+i);}
const stageText=()=>{
 const p=state.phase,n=state.peels[state.peelIndex];
 return({intro:['秋收玉米','收几穗玉米，慢慢做成一篮秋粮。','不计分，不催促，随时可以休息。'],harvest:['把秋天收进篮子','把成熟的玉米，放进竹篮。',`已采收 ${state.harvested.length} / 3 穗 · 可拖动，或先点玉米再点篮子`],harvested:['三穗玉米，都收好了','玉米已稳稳放进篮里。','带着这一篮秋收，去桌边慢慢整理。'],peel:['慢慢剥开苞叶',n===2&&!state.peelFlipped?'翻过来看看，还有没有苞叶？':n===3?'把穗尖的玉米须轻轻理掉。':'从松开的叶边，轻轻往下剥。',`第 ${state.peelIndex+1} / 3 穗 · ${n===3?'点一下玉米须，也能理净':n===2&&!state.peelFlipped?'点「翻过来看看」检查背面':'拖向下方，或点一下苞叶'}`],peeled:['三穗都剥干净了','叶和须收在一旁，玉米准备去晾晒。','稍作停留，接着摆上晾架。'],rack:['给玉米留点空隙','挤在一起的地方，可以挪一挪。','拖动玉米；也可选中后点晾架空处'],racked:['这样摆，能透透气','都放稳了，也留出了空隙。','再让秋阳晒一会儿。'],dry:['让时间慢慢过去','游戏中的时间正在流逝。',`还需 ${Math.ceil(state.dryLeft/1000)} 秒 · 这是晾晒过程的简化体验`],position:['先把玉米放稳','把玉米移到盆上，再慢慢脱粒。',`第 ${state.shellIndex+1} / 3 穗 · 先点玉米，再点接粮盆也可以`],shell:['慢慢脱下玉米粒',state.grains[state.shellIndex].slice(state.face*3,state.face*3+3).every(Boolean)?'这一面干净了，翻过来再看看。':'沿着玉米粒轻轻滑动，松手就停。',`第 ${state.shellIndex+1} / 3 穗 · ${state.face===0?'正面':'背面'} · 也可逐段点掉籽粒`],shelled:['三穗都脱完粒了','看看盆里，还要再收拾一下。','玉米芯放在一边，粮粒留在盆里。'],sort:['把粮粒收拾干净','看看里面，哪些需要移出来？',`叶片和玉米须放到右下小碟 · 已整理 ${state.sorted.length} / 3 处`],pour:['慢慢把秋粮收好','把托盘移到篮口，粮粒就会落下。',`已收好 ${Math.round(state.poured)}% · 松手就停，也可点托盘再点篮子`],done:['收好一篮秋粮','三穗玉米，收成一篮秋粮。','这次秋收已记入「我的秋粮」。']})[p];
};
function render(){scene.replaceChildren();actions.replaceChildren();controls.replaceChildren();const [title,copy,detail]=stageText();$('#title').textContent=title;$('#instruction').textContent=copy;$('#detail').textContent=storageOK?detail:'本次进度暂时无法保存；当前仍可继续游玩。';toastUntil=0;$('#game').dataset.phase=state.phase;
 switch(state.phase){
 case'intro':staticScene('C01');button('开始秋收',()=>act({type:'START'}),controls,'primary');button('我的秋粮',showWorks);break;
 case'harvest':case'harvested':{backdrop('garden');const b=SCENES.C01.items[0];art(b,10);const targetBox={x:105,y:940,w:535,h:270};target('把选中的玉米放入竹篮',targetBox,()=>{if(selected?.startsWith('ear'))act({type:'HARVEST',index:Number(selected.slice(-1))},'basket');else notice('先选一穗成熟的玉米。');});SCENES.C01.items.slice(1,4).forEach((o,i)=>{if(!state.harvested.includes(i))interactive(art(o,20+i),`采收第${i+1}穗玉米`,`ear${i}`,()=>select(`ear${i}`),p=>within(p,targetBox)?act({type:'HARVEST',index:i},'basket'):notice('把玉米放进下方的竹篮里。'));});state.harvested.forEach((i,k)=>{const e=art({asset:'corn-husked',...HARVEST_SLOTS[k]},27+k);e.dataset.basketEar=i;e.classList.add('in-basket');});art(SCENES.C01.items.at(-1),33);break;}
 case'peel':{backdrop('table-exact');art(SCENES.C03.items[0]);reserve(2-state.peelIndex);art(item('tray',435,1130,520,400),11);cobs(0);for(let i=0;i<state.peelIndex;i++)art(item('corn-clean-low',40+i*150,1070,235,155),20+i);const n=state.peels[state.peelIndex],asset=n===0?'corn-husked':n===1?'corn-half-exact':n===2?'corn-lastleaf-exact':'corn-clean';art(SCENES.C03.items.find(o=>o.asset==='corn-shadow'),22);const hero=art(item(asset,25,338,690,800),25);hero.dataset.key='peel-hero';
 if(state.peelFlipped)hero.style.transform='scaleX(-1)';
 if(n<3)interactive(hero,'剥开当前玉米的苞叶','leaf',()=>n===2&&!state.peelFlipped?notice('先翻过来，检查背面的叶片。'):act({type:'PEEL'},'peel'),(p,d)=>d.y>35?act({type:'PEEL'},'peel'):notice('沿着苞叶向下轻轻剥。'));
 if(n===2&&!state.peelFlipped)local('翻过来看看',()=>act({type:'FLIP_PEEL'},'turn'));
 if(n===3)interactive(art(item('silk',state.peelFlipped?420:90,325,250,180),30),'理掉穗尖的玉米须','silk',()=>act({type:'SILK'},'peel'),()=>act({type:'SILK'},'peel'));
 if(n>0)art(item('husk-open',450,1130,280,150),24);break;}
 case'peeled':staticScene('C05b');break;
 case'rack':case'racked':case'dry':{const s=REDO.C06;backdrop(s.bg);target('晾架上空着的位置',{x:70,y:820,w:170,h:170},()=>{if(selected?.startsWith('rack-')){const i=Number(selected.slice(-1));act({type:'RACK_MOVE',index:i,point:RACK_GOALS[i]},'basket');}else notice('先点选挤在一起的玉米，再点这里。');});const initial=[{x:228,y:654},{x:635,y:643},{x:262,y:634}];s.items.forEach((o,i)=>{const pos=state.rack[i],e=art({...o,x:o.x+pos.x-initial[i].x,y:o.y+pos.y-initial[i].y},20+i);if(state.phase==='rack')interactive(e,`晾架上的第${i+1}穗玉米`,`rack-${i}`,()=>select(`rack-${i}`),(p,d)=>act({type:'RACK_MOVE',index:i,point:{x:pos.x+d.x,y:pos.y+d.y}},'basket'));});break;}
 case'position':case'shell':case'shelled':{const shell=state.phase!=='position';backdrop('table-exact');art(SCENES.C09.items[0]);reserve(state.phase==='shelled'?0:2-state.shellIndex,true);cobs(state.phase==='shelled'?3:state.shellIndex);const bowl=SCENES.C10.items.find(o=>o.asset==='bowl');art(bowl,25);renderSettledKernels(countKernels(state));if(state.phase==='position'){const area={x:100,y:650,w:550,h:430};target('把选中的玉米放到接粮盆上',area,()=>selected==='position'?act({type:'POSITION'},'basket'):notice('先点一下上方的玉米。'));const e=art(item('corn-clean-low',60,312,494,305),30);interactive(e,'准备脱粒的玉米','position',()=>select('position'),p=>within(p,area)?act({type:'POSITION'},'basket'):notice('移到下方的接粮盆上，粮粒才不会散落。'));}
 if(state.phase==='shell'){const n=state.grains[state.shellIndex].filter(Boolean).length;art(item('corn-shadow',122,407,595,615,{opacity:.3}),27);const hero=art(item('corn-bare',111,366,620,663),30);hero.dataset.key='grains';hero.dataset.shellPart='true';if(state.face)hero.style.transform='scaleX(-1)';const coat=art(item('corn-clean',111,366,620,663),31);coat.dataset.shellCoat='true';coat.dataset.shellPart='true';coat.style.maskImage=maskFor(completedCells(state.grains[state.shellIndex],state.face));coat.style.maskSize='620px 663px';if(state.face)coat.style.transform='scaleX(-1)';if(state.grains[state.shellIndex].slice(state.face*3,state.face*3+3).every(Boolean))coat.style.opacity=0;const zones=[[170,435,190,190],[315,620,190,190],[480,795,185,190]];zones.forEach((r,i)=>{if(state.grains[state.shellIndex][state.face*3+i])return;const b=button('',()=>grain(i,r),actions,'grain-hit');b.setAttribute('aria-label',`脱下${state.face?'背':'正'}面第${i+1}段玉米粒`);box(b,{x:state.face?842-r[0]-r[2]:r[0],y:r[1],w:r[2],h:r[3]});b.onpointerdown=ev=>{if(busy)return;unlockAudio();b.start=point(ev);b.setPointerCapture(ev.pointerId);};b.onpointermove=ev=>{if(b.start&&Math.hypot(point(ev).x-b.start.x,point(ev).y-b.start.y)>25){b.start=null;grain(i,r);}};b.onpointerup=b.onpointercancel=()=>b.start=null;});local('翻一面',()=>act({type:'FLIP_SHELL'},'turn'));}
 art({...bowl,clip:[[0,.63],[.12,.75],[.3,.83],[.5,.855],[.7,.83],[.88,.75],[1,.63],[1,1.3],[0,1.3]]},40);break;}
 case'sort':{staticScene('C12',o=>!['scrap','silk','kernels'].includes(o.asset));grainPile('sort-grain',countKernels(state),{x:375,y:747,rx:270,ry:133},scene,27);const trash=SCENES.C12.items.filter(o=>['scrap','silk'].includes(o.asset));const area={x:465,y:1040,w:285,h:265};target('把选中的杂物放到右下小碟',area,()=>selected?.startsWith('scrap-')?act({type:'SORT',index:Number(selected.slice(-1))},'sort'):notice('先选出叶片或玉米须。'));trash.forEach((o,i)=>{if(state.sorted.includes(i))art(item(o.asset,535+i*35,1140+i*27,100,70),45+i);else interactive(art(o,40+i),i===2?'粮粒里的玉米须':`粮粒里的第${i+1}片碎叶`,`scrap-${i}`,()=>select(`scrap-${i}`),p=>within(p,area)?act({type:'SORT',index:i},'sort'):notice('杂物放进右下的小碟，粮粒留在托盘里。'));});break;}
 case'pour':{staticScene('C12b',o=>!['kernel'].includes(o.asset)&&!(o.asset==='tray'&&o.y<100)&&!(o.asset==='kernels'));const fill=grainPile('pour-fill',Math.round(countKernels(state)*state.poured/100),{x:385,y:785,rx:164,ry:58},scene,25);const group=element('div','sprite');box(group,{x:398,y:15,w:680,h:632});group.style.zIndex=45;const tray=SCENES.C12b.items.find(o=>o.asset==='tray'&&o.y<100);const t=art({...tray,x:0,y:0},1);group.append(t);const k=grainPile('pour-source',Math.round(countKernels(state)*(1-state.poured/100)),{x:250,y:460,rx:185,ry:82},group,2);const area={x:160,y:600,w:475,h:430};target('把选中的粮粒倒入收粮篮',area,()=>selected==='pour'?pourOnce():notice('先点选上方装粮粒的托盘。'));interactive(group,'装着粮粒的托盘','pour',()=>select('pour'),(p,delta,d)=>d.poured?render():within(p,area)?pourOnce():notice('把托盘移向下方的篮口。'));break;}
 case'done':staticScene('C13',o=>o.asset!=='kernels');grainPile('finished-grain',countKernels(state),{x:375,y:800,rx:240,ry:140},scene,26);button('我的秋粮',showWorks,controls,'primary');button('再收一篮',restart);local('回看秋收步骤',review,230,1170);break;
 }
 if(!['intro','done'].includes(state.phase)){const u=button('↶ 撤回',undo);u.disabled=!history.length;button('ⓘ 看看做法',help);if(state.phase==='dry')button('跳过等待',()=>act({type:'SKIP_DRY'}));}save();
}
function grain(i,r){return act({type:'GRAIN',index:i});}
function particles(x,y){if(reduced())return;const index=Math.round(state.poured*3);void singleKernel({x,y},{x:375+Math.sin(index*2.4)*70,y:785+Math.cos(index*1.7)*26},index,{size:13+index%4});}function pourOnce(continuous=false,amount=25){
 if(continuous){
  if(!drag?.recorded){history.push(clone(state));history=history.slice(-25);if(drag)drag.recorded=true;}
  if(drag)drag.poured=true;state=reduce(state,{type:'POUR',amount});updatePourMaterial(state.poured);
  $('#detail').textContent=`已收好 ${Math.round(state.poured)}% · 松手就停`;
  if(performance.now()-saveTime>130){sound('pour');particles(435,570);saveTime=performance.now();save();}
  if(state.phase==='done'){drag=null;collect();save();render();sound('done');}
 }else return act({type:'POUR',amount:25},'pour');
}
function dialog(title,body,opts){if(drag){drag.e.style.transform=drag.base;drag.e.classList.remove('dragging');drag=null;}document.querySelectorAll('#scene,header,#stage-actions,footer').forEach(e=>e.inert=true);pauseMotion(true);stopAudio();modalFocus=document.activeElement;modal.hidden=false;modal.innerHTML='';const d=element('section','dialog',modal);d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-label',title);const h=element('h2','',d);h.textContent=title;const p=element('p','',d);p.textContent=body;const row=element('div','buttons',d);opts.forEach(([text,fn],i)=>button(text,fn,row,i===0?'primary':''));requestAnimationFrame(()=>row.querySelector('button')?.focus());save();return d;}
function close(){pauseMotion(document.hidden);document.querySelectorAll('#scene,header,#stage-actions,footer').forEach(e=>e.inert=false);modal.hidden=true;modal.replaceChildren();lastTime=performance.now();modalFocus?.isConnected&&modalFocus.focus();unlockAudio();}
function pause(){dialog('歇一歇，秋天不着急','进度已经留在这里。回来的时候，我们接着做。',[['继续秋收',close],['听觉设置',settings],['我的秋粮',showWorks]]);}
function settings(){dialog('听一听秋收的声音',`操作音效目前${soundEnabled()?'开启':'关闭'}。也可以请语音读出当前做法。`,[[soundEnabled()?'关闭音效':'开启音效',()=>{soundEnabled(!soundEnabled());try{localStorage.setItem('autumn-sound',soundEnabled()?'on':'off');}catch{}settings();}],['读出做法',()=>{if(!speak(stageText().slice(1).join('。')))notice('当前浏览器没有可用的朗读功能。');}],['返回游戏',close]]);}
const HOW={harvested:'三穗玉米已经在篮里放稳，稍后一起带到桌边整理。',intro:'从田里收下三穗玉米，逐穗整理、晾晒、脱粒，把秋粮收入篮中。',harvest:'选一穗玉米，拖到下方竹篮里。也可以点玉米，再点竹篮。',peel:'先剥开正面苞叶，再翻过来检查背面。最后理净穗尖的玉米须，才算整理好这一穗。',peeled:'三穗玉米都已去叶、去须，稍后会一起送到晾架上。',rack:'把压在一起的玉米分开，让每一穗都留在晾架内，彼此之间留出空隙。可选玉米，再点下方空处；键盘方向键也能微调。',racked:'玉米已经分开。接下来让秋阳慢慢晒一会儿。',dry:'等一小会儿，也可跳过等待。离开页面或打开休息菜单时，时间会停下。实际晾晒需要结合天气和干燥程度判断。',position:'先把玉米移到接粮盆上，让脱下来的籽粒都落在盆里。',shell:'在玉米有籽粒的三段位置轻轻滑动，或逐段点一下。处理完这一面，翻过来处理另一面。三穗都完成后再分拣。',shelled:'三穗玉米都已经脱粒，下一步把粮粒里的碎叶和玉米须挑出来。',sort:'粮粒要留下。找出两片碎叶和一团玉米须，移到右下角的小碟里。',pour:'把上方托盘向篮口拖动，在篮口上保持按住就会落粮，松手停止。也可点托盘，再点篮子，每次倒入一部分。',done:'这篮秋粮已保存。你可以回看步骤，或再收一篮。'};
function help(){state.hints=(state.hints||0)+1;save();dialog('看看做法',HOW[state.phase],[['我来试试',close],['提示操作物件',()=>{close();document.querySelectorAll('.sprite.interactive').forEach(e=>e.classList.add('hinted'));setTimeout(()=>document.querySelectorAll('.hinted').forEach(e=>e.classList.remove('hinted')),4500);if(state.phase==='shell')notice('从穗尖到穗尾，逐段处理有籽粒的位置。');}],['看看手势',()=>{close();demo();}]]);}
function demo(){const e=document.querySelector('.sprite.interactive')||document.querySelector('[data-key="grains"]');if(!e)return;const hand=element('div','demo-hand',$('#effects'));hand.style.left=(parseFloat(e.style.left)+70)+'px';hand.style.top=(parseFloat(e.style.top)+80)+'px';setTimeout(()=>hand.remove(),4200);notice('请跟随手势了解操作方法，材料和进度保持原样。');}
function works(){try{const a=JSON.parse(localStorage.getItem(WORKS)||'[]');return Array.isArray(a)?a.filter(x=>x&&typeof x.id==='string').slice(-30):[];}catch{return[];}}
function collect(){const a=works();if(a.some(w=>w.id===state.id))return;a.push({id:state.id,date:new Date().toISOString(),seconds:Math.round(state.playMs/1000)});try{localStorage.setItem(WORKS,JSON.stringify(a.slice(-30)));}catch{storageOK=false;}}
function showWorks(){const a=works();const d=dialog('我的秋粮',a.length?`已经收好 ${a.length} 篮秋粮。每一篮，都是慢慢做成的。`:'第一篮秋粮，还在等你慢慢收好。',[['返回游戏',close]]);a.slice().reverse().forEach(w=>{const c=element('div','work-card',d);c.textContent='一篮秋粮 · 三穗玉米';const s=element('small','',c);s.textContent=new Date(w.date).toLocaleDateString('zh-CN')+' · 已完成采收、整理、晾晒、脱粒与收粮';});}
function review(){dialog('这一篮，是这样收好的','采收三穗 → 逐穗剥叶、翻面、理须 → 分开晾晒 → 盆上脱粒、翻面检查 → 挑出碎叶和玉米须 → 收粮入篮。',[['收好这份秋天',close]]);}
function restart(){if(busy){close();notice("先等手中的动作完成，再重新开始。");return;}state=fresh();history=[];selected=null;phaseAge=0;close();save();render();}
$('#pause').onclick=pause;$('#back').onclick=()=>dialog('秋收玉米',`当前：${LABELS[state.phase]}。进度会自动保存到这个浏览器。`,[['继续游戏',close],['返回社区',()=>{save();parent.postMessage({source:'qinghe-games',type:'exit'},location.origin);}],['我的秋粮',showWorks],['重新开始',()=>dialog('再从田边开始','当前这一轮会重新开始，已经完成的秋粮仍保留。',[['保留进度',close],['重新开始',restart]])]]);
document.addEventListener('keydown',ev=>{if(!modal.hidden){if(ev.key==='Escape'){ev.preventDefault();close();}if(ev.key==='Tab'){const a=[...modal.querySelectorAll('button')],first=a[0],last=a.at(-1);if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus();}else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus();}}}});
document.addEventListener('visibilitychange',()=>{save();lastTime=performance.now();pauseMotion(document.hidden||!modal.hidden);if(document.hidden)stopAudio();});window.addEventListener('pagehide',save);
function fit(){const available=document.documentElement.clientWidth,mobile=available<=600,s=mobile?Math.min(available/750,(innerHeight||1594)/1594):Math.min((innerHeight-68)/1594,500/750);$('#viewport').style.width=750*s+'px';$('#viewport').style.height=1594*s+'px';$('#game').style.transform=`scale(${s})`;}
window.addEventListener('resize',fit);fit();render();if(!preview&&state.phase!=='intro'&&state.phase!=='done')dialog('秋粮还在，接着慢慢做','上次做到「'+LABELS[state.phase]+'」。材料和进度都留着。',[['接着上次继续',close],['看看做法',help]]);
function tick(now){const dt=Math.min(now-lastTime,1000);lastTime=now;if(!busy&&modal.hidden&&!document.hidden&&!['intro','done'].includes(state.phase)){if(drag?.key==='pour'&&drag.moved&&within(drag.last,{x:160,y:600,w:475,h:430}))pourOnce(true,dt/55);const old=state.phase;state=reduce(state,{type:'TICK',ms:dt});phaseAge+=dt;if(state.phase!==old){const prior={...state,phase:old};busy=true;phaseAge=0;save();present(prior,{type:'DRY_END'}).finally(()=>busy=false);}else if(state.phase==='dry'&&now>toastUntil)$('#detail').textContent=stageText()[2];const transition={harvested:'PEEL_BEGIN',peeled:'RACK_BEGIN',racked:'DRY_BEGIN',shelled:'SORT_BEGIN'}[state.phase];if(transition&&phaseAge>(state.phase==='harvested'?3200:2300))auto(transition);if(now-saveTime>1500){save();saveTime=now;}}requestAnimationFrame(tick);}requestAnimationFrame(tick);












