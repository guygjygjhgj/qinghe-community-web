import {KEY,fresh,restore,reduce,coverage} from './engine.mjs';
import {finishedMix} from './material-v9.mjs';
import {guidance} from './guidance.mjs?v=loofah-v9';
const $=id=>document.getElementById(id),scene=$('scene'),fruit=$('fruit'),tool=$('shears'),grip=$('peel-grip');
let g=fresh(),drag=null,paused=false,ready=false,readOnly=new URLSearchParams(location.search).has('work'),initialized=false,saved=false,saving=false,scale=1,elapsed=0,lastStage='',settle=0,lastSave=0,voice=false,announced='',storageError='',toolPos={x:32,y:385};
const embedded=parent!==window,cut={x:229,y:107},home={x:32,y:385};
const waterline={x:185,top:195,bottom:485};
const poses={harvest:[177,94,0,1],landed:[65,499,-78,.72],peel:[154,190,-55,.9],clear:[154,190,-55,.9],wash:[232,185,-15,.76],place:[146,300,-55,.7],dry:[150,154,-60,.66],try:[150,154,-60,.66],scrub:[180,220,-48,.52],rinse:[232,185,-15,.76],return:[146,300,-55,.7],complete:[150,158,-65,.9]};
const text={
 harvest:['把老丝瓜摘下来','把剪口拖到瓜柄上，再松手。','这根长老了，绿皮已经开始泛黄。','对准时会轻轻吸住，不用着急。'],
 landed:['接住这根老丝瓜','轻轻落进竹盘，接着揭开绿皮。','剪断了，慢慢放稳。','还是刚才藤上的这一根。'],
 peel:['慢慢揭开绿皮','捏住翘皮，沿丝瓜慢慢拉。','绿皮松开了，纤维还湿润着。','松手就停，接着拖就能继续。'],
 clear:['让瓜籽慢慢松开','按住丝瓜，轻轻来回抖动。','里面还留着瓜籽和少量果瓤。','籽落在竹盘里，不用逐粒拾取。'],
 wash:['让清水穿过纤维','点开水龙头，拖丝瓜到水下。','让水带走剩下的果瓤。','冲过一面，会轻轻翻过来。'],
 place:['还湿着，放哪里？','把丝瓜拖到合适的放置处。','底面还挂着水滴，先别收起来。','看看哪里能让空气流过去。'],
 dry:['通风晾着，慢慢变干','看看颜色和水滴怎样变化。','这里用光线变化表示时间经过。','现实中要等内外充分干燥。'],
 try:['晾好了，拿来试试','把丝瓜络拖到下面的碗里。','颜色变浅，纤维也干燥蓬松了。','做个家里的小帮手。'],
 scrub:['沿着残留，轻轻擦','按住丝瓜络，在碗面来回擦。','擦到哪里，哪里的残留就消失。','看看还有哪处没有擦干净。'],
 rinse:['用完，也要冲干净','点开水龙头，拖到清水下。','把纤维里留下的东西冲掉。','松手会放回，水龙头可以关。'],
 return:['冲净了，放回哪里？','把丝瓜络放回通风的地方。','用过以后，也要让它充分晾干。','湿着就收起来，不容易干。'],
 complete:['丝瓜络做好了','果皮去净了，留下蓬松的纤维。','一块能用来擦洗的丝瓜络，做好了。','用后冲净，放在通风处晾干。']};
function post(type,data={}){if(embedded)parent.postMessage({source:'luffa-game',type,...data},location.origin);}
function fit(){scale=Math.min(1,document.documentElement.clientWidth/420,document.documentElement.clientHeight/900);$('phone').style.transform=`translateX(-50%) scale(${scale})`;}
addEventListener('resize',fit);fit();
function persist(){if(readOnly)return true;try{localStorage.setItem(KEY,JSON.stringify(g));storageError='';return true;}catch{storageError='进度暂未保存，请保留此页。';note(storageError);return false;}}
function note(s,detail){$('status').textContent=s;if(detail!==undefined)$('subhint').textContent=detail;}
let cue=null,cueKey='',cueTimer=0;
const cueNodes=['shears','target','peel-grip','fruit','faucet','rack','bowl','stream','collect'];
function refreshGuidance(){
 cue=guidance(g,{paused,ready,readOnly,saved});
 if(cue&&g.stage==='scrub'&&coverage(g.paths)>=.92)cue={text:'碗擦干净了，稍等片刻。'};
 for(const id of cueNodes){$(id).classList.toggle('cue-source',cue?.source===id&&!drag);$(id).classList.toggle('cue-target',cue?.target===id);}
 const key=cue?g.stage+':'+cue.text:'';
 if(key!==cueKey){cueKey=key;clearTimeout(cueTimer);$('instruction').classList.remove('cue-instruction');
  // Light appears first; the short instruction follows without locking interaction.
  if(cue){$('instruction').textContent=cue.text;void $('instruction').offsetWidth;$('instruction').classList.add('cue-instruction');
   if(voice&&cue.source)cueTimer=setTimeout(()=>post('voice',{text:cue.text}),350);}
 }
 if(cue?.label)$('object-label').textContent=cue.label;
 if(cue?.source==='fruit')fruit.setAttribute('aria-label',cue.text);
 $('object-label').style.visibility=cue?.source&&cue.source!=='collect'&&!drag?'visible':'hidden';
 scene.dataset.cue=cue?.source||'';scene.classList.toggle('has-cue',!!cue?.source);$('gesture-guide').style.visibility=cue?.source&&cue.source!=='collect'?'visible':'hidden';
}
function drawGuidance(){
 const overlay=$('gesture-guide');if(!cue?.source||cue.source==='collect'||paused||!ready||readOnly){overlay.style.visibility='hidden';return;}
 const r=scene.getBoundingClientRect();
 const center=id=>{const b=$(id).getBoundingClientRect();return {x:(b.left+b.width/2-r.left)/scale,y:(b.top+b.height/2-r.top)/scale};};
 let a=center(cue.source),b=cue.target?center(cue.target):null;
 // Point to the actual handle, fully inside the scene.
 if(cue.source==='faucet')a={x:52,y:203};
 if(cue.source==='shears')a={x:toolPos.x+64,y:toolPos.y+34};
 if(cue.target==='stream')b={x:waterline.x,y:335};
 if(cue.gesture==='peel')b={x:Math.min(377,a.x+95),y:Math.min(490,a.y+67)};
 if(cue.gesture==='sway'){b={x:a.x+48,y:a.y+13};a={x:a.x-48,y:a.y-13};}
 if(cue.gesture==='wipe'){a={x:185,y:390};b={x:305,y:411};}
 const moving=!!drag,path=$('guide-path'),dot=$('guide-dot'),ring=$('guide-ring');
 const end=b||a;ring.setAttribute('cx',end.x);ring.setAttribute('cy',end.y);ring.setAttribute('r',cue.target==='stream'?38:cue.target==='bowl'?43:27);
 ring.style.display=cue.gesture==='sway'||cue.gesture==='peel'||cue.gesture==='wipe'?'none':'';
 path.style.display=b&&!moving?'':'none';dot.style.display=moving?'none':'';
 if(b){path.setAttribute('d',`M${a.x} ${a.y} L${b.x} ${b.y}`);const reduceMotion=document.body.classList.contains('reduce')||matchMedia('(prefers-reduced-motion: reduce)').matches;let t=reduceMotion?.5:(performance.now()%2600)/2600;if(cue.gesture==='sway'||cue.gesture==='wipe')t=(1-Math.cos(t*Math.PI*2))/2;dot.setAttribute('cx',a.x+(b.x-a.x)*t);dot.setAttribute('cy',a.y+(b.y-a.y)*t);}
 else{dot.setAttribute('cx',a.x);dot.setAttribute('cy',a.y);}
}
function act(a){const old=g.stage;g=reduce(g,a);if(g.stage!==old){drag=null;elapsed=0;settle=1100;saving=false;render(true);persist();}else render(false);}
function point(e){const r=scene.getBoundingClientRect();return{x:(e.clientX-r.left)/scale,y:(e.clientY-r.top)/scale};}
function showObject(id,show,active=false){const e=$(id);e.style.opacity=show?'1':'0';e.style.pointerEvents=active&&!readOnly?'auto':'none';e.setAttribute('aria-hidden',!show);e.tabIndex=active&&!readOnly?0:-1;}
function pose(){let p=[...poses[g.stage]],dx=drag?.kind==='material'?drag.dx:0,dy=drag?.kind==='material'?drag.dy:0;
 if(g.stage==='clear'&&drag?.kind==='material'){p[2]+=Math.max(-12,Math.min(12,dx*.25-dy*.2));p[1]+=Math.max(-12,Math.min(12,dy*.15));}
 else if(drag?.kind==='material'){p[0]+=dx;p[1]+=dy;}
 if(g.stage==='scrub'&&drag?.kind==='material')p=[drag.px-50,drag.py-170,-48,.52];
 fruit.style.left=p[0]+'px';fruit.style.top=p[1]+'px';fruit.style.transformOrigin=g.stage==='harvest'||g.stage==='landed'?'50% 10%':'50% 50%';
 fruit.style.transform=`rotate(${p[2]}deg) scale(${p[3]})${g.stage==='wash'&&g.wash>=.5?' rotateY(180deg)':''}`;
 fruit.classList.toggle('held',!!drag);return p;
}
function render(changed=false){const s=g.stage;scene.dataset.stage=s;
 if(changed||s!==lastStage){lastStage=s;const t=text[s];$('title').textContent=t[0];$('instruction').textContent=t[1];note(storageError||t[2],t[3]);$('object-label').style.visibility='';}
 const table=['harvest','landed','peel','clear'].includes(s),wash=['wash','rinse'].includes(s),choice=['place','return'].includes(s),onRack=['dry','try','complete'].includes(s);
 scene.classList.toggle('tabletop',table);scene.classList.toggle('near',!['harvest','landed'].includes(s));scene.classList.toggle('water-on',g.water&&!paused);scene.classList.toggle('moving',!!drag);
 showObject('shears',s==='harvest'||s==='landed',s==='harvest');showObject('target',s==='harvest');showObject('vine',s==='harvest');
 tool.classList.toggle('closed',s!=='harvest');
 showObject('tray',table);showObject('tray-front',s==='harvest'||s==='landed');
 showObject('bowl',wash||['try','scrub'].includes(s));showObject('dirt',s==='scrub'||s==='try');
 showObject('rack',choice||onRack);showObject('cabinet',choice);showObject('faucet',wash,wash);showObject('stream',wash&&g.water);showObject('seed-field',s==='clear');
 $('faucet').disabled=!wash||!ready||readOnly||paused;$('faucet').setAttribute('aria-pressed',String(g.water));
 $('faucet').setAttribute('aria-label',g.water?'水龙头已打开，点一下把手关水':'水龙头已关闭，点一下把手开水');
 $('faucet-state').textContent=g.water?'水开了，再点关水':'点把手，开水';
 $('bowl').style.top=s==='try'?'425px':'315px';$('bowl').style.width=s==='try'?'270px':'360px';$('bowl').style.left=s==='try'?'75px':'30px';
 $('rack').classList.toggle('choice',choice);$('cabinet').classList.toggle('choice',choice);
 $('green').style.opacity=table&&s!=='clear'?'1':'0';$('pulpy').style.opacity=s==='peel'?'1':s==='clear'?String(1-g.clear):'0';
 const prepared=finishedMix(g);fruit.dataset.prepared=String(prepared===1);$('finished-fiber').style.opacity=String(prepared);$('finished-fiber').setAttribute('aria-hidden',prepared===0);$('fruit-raw').style.opacity=String(1-prepared);$('finished-fiber').style.filter=['scrub','rinse','return'].includes(s)?'brightness(.94) saturate(.88)':'none';
 const y=38+g.peel*1498;$('skin-path').setAttribute('d',s==='harvest'||s==='landed'?'M370 0H685V1536H370Z':`M370 ${y+15}Q520 ${y-24} 685 ${y+28}V1536H370Z`);
 const edge=13+g.peel*316;$('peel').style.opacity=s==='peel'||s==='clear'?'1':'0';$('peel').classList.toggle('detached',g.peel===1);$('peel').style.top=edge+'px';$('peel').style.height=50+g.peel*160+'px';$('peel').style.transform=`rotate(${-5+g.peel*155}deg)`;
 grip.style.top=Math.min(302,edge+23)+'px';showObject('peel-grip',s==='peel'&&g.peel<1,s==='peel'&&g.peel<1);grip.setAttribute('aria-valuenow',Math.round(g.peel*100));
 const active=['clear','wash','place','try','scrub','rinse','return'].includes(s);if(active)fruit.setAttribute('role','slider');else fruit.removeAttribute('role');fruit.style.pointerEvents=active&&!readOnly?'auto':'none';fruit.tabIndex=active&&!readOnly?0:-1;fruit.setAttribute('aria-label',text[s][1]);fruit.setAttribute('aria-valuenow',Math.round((g[s]||0)*100));
 pose();$('sunlight').style.opacity=s==='dry'?String(.18+Math.sin(g.dry*Math.PI)*.2):'0';$('sunlight').style.transform=`translateX(${g.dry*150-80}px) rotate(-22deg)`;
 $('object-label').textContent=s==='harvest'?'拿起剪刀':s==='peel'?(g.peel?'接着慢慢剥':'从翘起的皮开始'):s==='clear'?'轻轻抖动':wash?(g.water?'移到水流下':'点开水龙头'):choice?'放在哪里？':s==='try'?'拖到碗里':s==='scrub'?'沿残留来回擦':'';
 $('object-label').style.opacity=['harvest','peel','clear','wash','place','try','scrub','rinse','return'].includes(s)?'1':'0';
 $('collect').hidden=s!=='complete';$('replay').hidden=s!=='complete';$('collect').textContent=readOnly||saved?'去作品收藏看看':'收进作品收藏';
 $('collect').disabled=saving;$('pause').hidden=readOnly;$('seed-field').querySelectorAll('img').forEach((el,i)=>{el.classList.toggle('fallen',g.clear>(i+1)/13);});
 if(s==='scrub'){$('wiped-paths').innerHTML=g.paths.map(p=>p.length?`<path d="M${p.map(q=>q.join(',')).join(' L')}"/>`:'').join('');$('dirt').style.opacity=coverage(g.paths)>=.92?'0':'1';}
 refreshGuidance();
}
function toolMove(x,y){const near=Math.hypot(x+64-cut.x,y+34-cut.y)<39;toolPos=near?{x:165,y:73}:{x:Math.max(0,Math.min(294,x)),y:Math.max(0,Math.min(497,y))};tool.style.left=toolPos.x+'px';tool.style.top=toolPos.y+'px';$('target').classList.toggle('aligned',near);return near;}
function bindDrag(el,kind){el.addEventListener('pointerdown',e=>{if(paused||!ready||readOnly||drag||e.button!==0||settle>0)return;e.preventDefault();e.stopPropagation();el.setPointerCapture(e.pointerId);const p=point(e);drag={kind,id:e.pointerId,x:p.x,y:p.y,px:p.x,py:p.y,dx:0,dy:0,p:g.peel,ox:toolPos.x,oy:toolPos.y,moved:false,start:true};if(kind==='cut')tool.classList.add('dragging');render();});
 el.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId||drag.kind!==kind)return;const p=point(e),d=drag,delta=Math.hypot(p.x-d.px,p.y-d.py);d.dx=p.x-d.x;d.dy=p.y-d.y;d.px=p.x;d.py=p.y;d.moved ||= Math.hypot(d.dx,d.dy)>5;
  if(kind==='cut'){const near=toolMove(d.ox+d.dx,d.oy+d.dy);note(near?'对准了，松手就能剪断。':'把剪口靠近细细的瓜柄。');}
  else if(kind==='peel'){act({type:'peel',value:d.p+Math.max(0,d.dy*.574+d.dx*.819)/275});note('果皮随手指慢慢离开。','松手就停，剥开的部分会留下。');}
  else if(g.stage==='clear'&&d.moved){act({type:'loosen',distance:delta});note('籽在往下落，果瓤也渐渐松开。','轻轻抖动就好，松手可以歇一歇。');}
  else if(g.stage==='scrub'&&d.moved){act({type:'wipe',x:p.x-30,y:p.y-315,start:d.start});d.start=false;}
  render();});
 const release=(e,cancel=false)=>{if(drag?.id!==e.pointerId||drag.kind!==kind)return;const d=drag;drag=null;tool.classList.remove('dragging');if(kind==='cut'){if(!cancel&&toolMove(toolPos.x,toolPos.y))act({type:'cut',aligned:true});else{tool.classList.add('returning');toolMove(home.x,home.y);setTimeout(()=>tool.classList.remove('returning'),450);note('还没对准，丝瓜仍然挂在藤上。');}}
  if(kind==='material'&&!cancel&&d.moved){const s=g.stage;if(['place','return'].includes(s)){if(d.px>178&&d.py>210&&d.py<405)act({type:'place',target:'rack'});else note('还湿着，敞开放更容易干。','试着放到右边有空隙的竹架上。');}if(s==='try'){if(d.py>422&&d.px>45&&d.px<385)act({type:'try',target:'bowl'});else note('把丝瓜络移到下面的碗里。');}}
  render();persist();};el.addEventListener('pointerup',e=>release(e));el.addEventListener('pointercancel',e=>release(e,true));el.addEventListener('lostpointercapture',e=>release(e,true));
}
bindDrag(tool,'cut');bindDrag(grip,'peel');bindDrag(fruit,'material');
$('faucet').onclick=()=>{if(readOnly||paused||!ready||!['wash','rinse'].includes(g.stage))return;act({type:'water'});note(g.water?'水开了，把丝瓜移到水流下。':'水关好了，需要时再打开。');};
let kbTool=false,kbGrab=false;
tool.onkeydown=e=>{if(readOnly||paused||g.stage!=='harvest')return;if(['Enter',' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape'].includes(e.key))e.preventDefault();if(e.key==='Enter'||e.key===' '){if(!kbTool){kbTool=true;note('剪刀拿起来了。','用方向键移到瓜柄，再按回车剪断。');}else if(toolMove(toolPos.x,toolPos.y)){kbTool=false;act({type:'cut',aligned:true});}}if(kbTool&&e.key.startsWith('Arrow'))toolMove(toolPos.x+(e.key==='ArrowRight'?16:e.key==='ArrowLeft'?-16:0),toolPos.y+(e.key==='ArrowDown'?16:e.key==='ArrowUp'?-16:0));if(e.key==='Escape'){kbTool=false;toolMove(home.x,home.y);}};
grip.onkeydown=e=>{if(readOnly||paused||g.stage!=='peel')return;if(['ArrowDown','ArrowRight'].includes(e.key)){e.preventDefault();act({type:'peel',value:g.peel+.07});}};
fruit.onkeydown=e=>{if(readOnly||paused||settle>0)return;if(['Enter',' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape'].includes(e.key))e.preventDefault();if(['Enter',' '].includes(e.key)){kbGrab=!kbGrab;if(kbGrab){const p=poses[g.stage];drag={kind:'material',id:-1,x:p[0]+50,y:p[1]+170,px:p[0]+50,py:p[1]+170,dx:0,dy:0,start:true};note('材料拿起来了。','方向键移动，回车放下。');}else if(drag){const d=drag;drag=null;if(['place','return'].includes(g.stage)&&d.px>178&&d.py<405)act({type:'place',target:'rack'});if(g.stage==='try'&&d.py>422)act({type:'try',target:'bowl'});render();}}
 if(e.key.startsWith('Arrow')&&drag?.id===-1){const dx=e.key==='ArrowRight'?18:e.key==='ArrowLeft'?-18:0,dy=e.key==='ArrowDown'?18:e.key==='ArrowUp'?-18:0;drag.dx+=dx;drag.dy+=dy;drag.px+=dx;drag.py+=dy;if(g.stage==='clear')act({type:'loosen',distance:18});if(g.stage==='scrub'){act({type:'wipe',x:drag.px-30,y:drag.py-315,start:drag.start});drag.start=false;}render();}if(e.key==='Escape'){drag=null;kbGrab=false;render();}};
function update(dt){if(!ready||paused||readOnly||document.hidden)return;if(settle>0){settle=Math.max(0,settle-dt);return;}const s=g.stage;
 if(s==='landed'||s==='peel'&&g.peel===1||s==='clear'&&g.clear===1||s==='wash'&&g.wash===1||s==='scrub'&&coverage(g.paths)>=.92||s==='rinse'&&g.rinse===1||s==='dry'&&g.dry===1){elapsed+=dt;if(elapsed>1200)act({type:({landed:'settle',peel:'next-peel',clear:'next-clear',wash:'next-wash',scrub:'next-scrub',rinse:'next-rinse',dry:'next-dry'})[s]});return;}
 if(s==='dry')act({type:'dry',ms:dt});
 if(['wash','rinse'].includes(s)&&g.water&&drag?.kind==='material'){const p=poses[s],cx=p[0]+50+drag.dx,cy=p[1]+170+drag.dy;const under=Math.abs(cx-waterline.x)<54&&cy>waterline.top&&cy<waterline.bottom;act({type:'rinse',ms:dt,under});if(under)note(s==='wash'&&g.wash>=.5?'这一面也让清水穿过去。':'水正穿过纤维，慢慢冲净。','松手可以停下来。');}
}
let before=performance.now();function tick(now){const dt=Math.min(80,now-before);before=now;update(dt);drawGuidance();if(now-lastSave>700){if(!readOnly)persist();lastSave=now;}requestAnimationFrame(tick);}requestAnimationFrame(tick);
function pause(){paused=true;drag=null;render();persist();$('pause-dialog').showModal();}
function resume(){paused=false;$('pause-dialog').close();render();}
function leave(){if(persist())post('navigate',{route:readOnly?'S37':'S01'});}
$('pause').onclick=pause;$('back').onclick=()=>readOnly||g.complete?post('navigate',{route:'S37'}):pause();$('resume').onclick=resume;$('leave').onclick=leave;
$('pause-dialog').addEventListener('cancel',()=>{paused=false;render();});$('restart').onclick=()=>{$('pause-dialog').close();$('restart-dialog').showModal();};$('cancel-restart').onclick=()=>{$('restart-dialog').close();paused=false;render();};$('restart-dialog').addEventListener('cancel',()=>{paused=false;render();});
function restart(){g=fresh();readOnly=false;saved=false;saving=false;drag=null;paused=false;elapsed=0;settle=0;toolMove(home.x,home.y);$('restart-dialog').close();render(true);persist();if(new URLSearchParams(location.search).has('work'))post('replay');}
$('confirm-restart').onclick=restart;$('replay').onclick=()=>{paused=true;render();$('restart-dialog').showModal();};
$('collect').onclick=()=>{if(readOnly||saved){post('navigate',{route:'S37'});return;}if(saving||!g.complete)return;if(!embedded){note('请从原应用打开，作品才能收进原来的收藏。');return;}saving=true;render();note('正在收进作品收藏…');post('save',{state:g});};
$('listen').onclick=()=>{post('voice',{text:guidance(g,{saved})?.text||text[g.stage][1]});};
addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin||e.data?.source!=='luffa-app')return;const m=e.data;if(m.type==='init'){voice=!!m.voice;document.body.classList.toggle('reduce',!!m.reduce);if(!initialized){if(m.readOnly){readOnly=true;const old=restore(m.state);if(old){g=old;saved=true;}else{note('这份作品暂未载入。','请返回作品收藏后再打开。');return;}}initialized=true;render(true);}}if(m.type==='saved'){saving=false;saved=!!m.ok;render();note(m.ok?(m.local?'作品已收好，保存在本机。':'作品已收进收藏。'):'收藏未成功，作品仍在这里。','已经收藏的作品不会因重新体验而删除。');}});
addEventListener('visibilitychange',()=>{if(document.hidden){drag=null;persist();render();}});addEventListener('pagehide',persist);
for(let i=0;i<12;i++){const el=document.createElement('img');el.src='assets/seed.webp';el.style.left=75+(i*29%255)+'px';el.style.top=405+(i%3)*14+'px';el.style.setProperty('--turn',i*43+'deg');$('seed-field').append(el);}
async function load(){ready=false;$('loading').hidden=false;$('retry-load').hidden=true;try{await Promise.all(['mature-green.png','fiber.png','fiber-pulpy.png','loofah-finished-v9.png','peel-flap.png','courtyard.png','tray.png','bowl-clean.webp','bowl-dirty.webp','rack.webp','faucet-v8.webp','cabinet-closed.webp','seed.webp'].map(f=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>i.decode().then(resolve).catch(resolve);i.onerror=reject;i.src='assets/'+f;})));ready=true;$('loading').hidden=true;render();}catch{$('loading').querySelector('h2').textContent='还有素材没载入';$('loading').querySelector('p').textContent='重新载入后，接着刚才的进度。';$('retry-load').hidden=false;}}
$('retry-load').onclick=load;
if(!readOnly){try{const old=restore(localStorage.getItem(KEY));if(old)g=old;}catch{storageError='无法读取本机存档。';}}
render(true);load();post('ready');requestAnimationFrame(()=>requestAnimationFrame(()=>document.body.classList.remove('initializing')));


