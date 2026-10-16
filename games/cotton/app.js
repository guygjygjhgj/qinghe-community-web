import {foldMatrix,zipperTravel,zipperStart,zipperProgress,positionZipper,setSeamProgress} from './original-materials.js';
import {prepareScene,renderScene,morphScene} from './renderer.js';
const $=s=>document.querySelector(s),wait=ms=>new Promise(r=>setTimeout(r,ms));
const scenes=await fetch('scenes.json').then(r=>r.json()),by=Object.fromEntries(scenes.map(s=>[s.id,s]));
const MAIN=['P01','P02','P03','P04','T01','P05','T02','R01','R02','R03','T03','R04','T04','P07','P08','T05','P09','R05','R06','P10','P11','P12','T07','R07','T08','R08','R09','T09','P14','T10','T11','P15','P16','T12','P17'];
const fresh=()=>({version:1,page:'P01',counts:{},handled:{},events:[],saved:false,previous:[]});let state=fresh(),layers=[],busy=false,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches,helpLevel=0,returnPage='P01',lastFocus=null,saveOK=true;
const storageKey='autumn-cotton-progress-v1';let saved=null;try{saved=JSON.parse(localStorage.getItem(storageKey));if(saved?.version!==1||!by[saved.page])saved=null;}catch{}
// An isolated inspection session never reads or writes the player's progress.
const inspectionPage=new URLSearchParams(location.search).get('inspect');
const inspecting=Boolean(inspectionPage&&by[inspectionPage]);
if(inspecting){state.page=inspectionPage;saved=null;}
const defs={
P01:['从一朵棉絮开始','一起认识秋棉，把它变成一只厚薄合适的小坐垫。没有倒计时，随时可以休息。','开始体验','P02'],
P02:['先看看，哪一朵成熟了','裂开的棉铃已经露出白色棉絮。紧闭的青铃还要留在枝上。','我看好了，去采收','P03'],
P03:['选一朵已经吐絮的棉铃','按住白色棉絮，把它拖入布篮。青铃先留下。','采下一朵棉絮','P04'],
P04:['再把另一朵放进篮里','枝头留下空壳，棉絮收进篮中。','采下另一朵','T01'],
T01:['采收完成，带到桌边','两朵棉絮都在篮中，青铃和空壳留在原处。','提篮到桌边','P05'],
P05:['把叶屑和壳屑挑出来','把一片杂物拖到右下方小碟里。棉絮留在篮中。','挑出一片杂物','T02'],
T02:['原料整理好了','叶屑与棉絮分开了。接下来处理一小团带籽棉。','拿一小团仔细看看','R01'],
R01:['拨开棉团，找找棉籽','轻轻把表面的纤维向两边拨开，看到棉籽后再分离。','拨开表面纤维','R02'],
R02:['固定棉籽，拨开纤维','棉籽取到小碟中，纤维留在桌面。把棉籽拖进小碟后松手。','分离这一粒棉籽','R03'],
R03:['再翻开一点，复查遗漏','左边已经检查过，右边还藏着一粒。找到它，再放进小碟。','取出遗漏的棉籽','T03'],
T03:['这一小团检查好了','两粒棉籽都在小碟中。接下来把紧实棉团轻轻松开。','开始松棉','R04'],
R04:['从边缘慢慢松开','分三次向外拨松。棉量不会增加，只让压紧的纤维舒展开。','向外拨松一次','T04'],
T04:['棉团变得蓬松了','这一小团已经去籽、开松。接下来使用事先处理好的其余填料。','合并准备好的填料','P07'],
P07:['填料准备好了','刚才体验的是处理一小团棉的过程。做完整坐垫需要加入事先准备好的足量填料。','拿出布套','P08'],
P08:['找到布套的开口','先掀起翻片，看清内衬的位置。棉絮要从开口放进去。','慢慢掀起翻片','T05'],
T05:['布套已经打开','翻片停在上方，留出放入棉絮的空间。','开始分次放棉','P09'],
P09:['少量多次，先放三份','按住托盘里的棉絮，拖进布套内。每放一份，托盘减少一份。','放入一份棉絮','R05'],
R05:['先铺成一层','把中间的棉絮轻轻摊开，薄薄覆盖内衬。','向四周摊开','R06'],
R06:['照顾两边的角落','中间已经够了。把厚处的棉移向较薄的边角。','把厚处移向薄角','P10'],
P10:['比较中间与边角','看看哪一处鼓起、哪一处偏薄。先挪动已有的棉，避免越加越多。','把厚处移薄一些','P11'],
P11:['再铺匀一点','源位置变薄，角落变厚。其他地方的棉保持原位。','继续铺匀边角','P12'],
P12:['先检查，再合拢','边角已经铺到。下一步合拢试压，确认里面有没有紧实的硬团。','检查铺填结果','T07'],
T07:['铺匀了，合拢试压','先盖上翻片，暂时不拉上拉链。发现问题还可以重新打开。','合拢坐垫','R07'],
R07:['按一按，比较软硬','轻按不同位置。中间下陷较少，可能还有结团。','按下再松手','T08'],
T08:['这里有一团比较硬','中间的纤维还没有完全松开。打开刚才的位置处理它。','打开并找出硬团','R08'],
R08:['只处理这一处硬团','向外轻轻拨松中央的密团，其他区域保留。只把硬团挪开不能解决结块。','松解中央硬团','R09'],
R09:['同一个位置，再试一次','重新合拢，轻按刚才的位置，再松手看回弹。','再按一次，观察回弹','T09'],
T09:['回弹更均匀了','里面的硬团已经松开。确认厚薄后，就可以收口。','确认并准备收口','P14'],
P13:['取回多余的一小团','把过量棉絮放回托盘。保留已经铺好的边角，不需要全部重来。','取回多余棉絮','P12'],
P14:['沿开口慢慢收好','把大拉片沿着布边移到另一端。到达末端后停住。','沿布边拉好开口','T10'],
T10:['开口已经收好了','接下来把坐垫从桌面移到椅上，落稳后再摆正。','轻轻放到椅子上','P15'],
T11:['坐垫正在落稳','等它贴住椅面，再轻轻调整。','继续检查','P15'],
P15:['在椅面上摆正','轻轻调整坐垫，让两侧都稳稳地留在椅面上。需要时可以回桌面修整。','摆正并检查完成','P16'],
P16:['一只秋日小坐垫，做好了','收好这次作品，回顾自己经历的去籽、松棉、铺填与试压。','收好作品','P17'],
T12:['正在收好这次作品','保留当前作品，正在写入本机收藏。','请稍候','P17'],
P17:['作品已经收好','这次作品保存在当前浏览器。可以查看过程，也可以再做一只。','看看制作过程','P18'],
P18:['回顾这一次的手作','这里只记录本局实际完成的步骤。看过示范不等于替你完成操作。','回到作品','P17'],
P06:['去籽动作示范','示范只说明方法。看完以后，回到原处继续自己的操作。','看完了，返回操作','R01']};
function currentDef(){return defs[state.page]||defs.P01;}function count(){return state.counts[state.page]||0;}function snap(){return JSON.parse(JSON.stringify({...state,previous:[]}));}
function persist(){if(inspecting){$('#save-status').textContent='检查模式，不修改游戏进度';return true;}try{localStorage.setItem(storageKey,JSON.stringify(state));saveOK=true;$('#save-status').textContent='进度已保存在当前浏览器';return true;}catch{saveOK=false;$('#save-status').textContent='暂时无法保存；当前画面仍然保留';return false;}}
function checkpoint(){state.previous.push(snap());if(state.previous.length>40)state.previous.shift();}
function hint(t){$('#hint').textContent=t;$('#hint').classList.add('show');setTimeout(()=>$('#hint').classList.remove('show'),2400);}
function sceneFor(){const s=structuredClone(by[state.page]);const c=count();if(['R07','T08','R09','T09','P15'].includes(state.page)){const footer=s.nodes.filter(n=>n.text&&n.m[5]>1450);footer.forEach((n,i)=>{n.text=i===0?'撤回':'看看做法';n.size=30;n.w=i===0?150:200;n.m[4]=i===0?135:475;n.align='CENTER';n.spacing={unit:'PIXELS',value:0};});}if(state.page==='P04'&&state.firstHarvest?.includes('右侧')){const right=s.nodes.findIndex(n=>n.name.includes('可采收'));const left=by.P03.nodes.find(n=>n.name.includes('可采收')&&n.name.includes('左侧'));if(right>=0&&left)s.nodes[right]=structuredClone(left);}if(state.page==='P15'){s.nodes.filter(n=>n.name.includes('可试摆')).forEach(n=>{n.m[4]-=25;n.m[5]-=20;});}if(state.page==='R08'&&c){s.nodes.filter(n=>n.name.includes('可松解')).forEach(n=>{n.w*=1.12;n.h*=.9;n.m[4]-=12;});}if(state.page!=='P01'&&state.page!=='P02'){const title=s.nodes.find(n=>n.text&&n.m[5]>90&&n.m[5]<190),sub=s.nodes.filter(n=>n.text&&n!==title&&n.m[5]>170&&n.m[5]<420).sort((a,b)=>a.m[5]-b.m[5])[0];if(title){title.text=currentDef()[0];title.w=690;title.m[4]=30;title.size=title.text.length>15?37:42;title.align='CENTER';title.spacing={unit:'PIXELS',value:0};}if(sub){sub.text=instructions[state.page]||currentDef()[1];sub.w=710;sub.m[4]=20;sub.size=25;sub.align='CENTER';sub.spacing={unit:'PIXELS',value:0};}}if(state.page==='P05'){s.nodes.filter(n=>n.name.includes('可拖动')&&(state.handled?.P05||[]).includes(n.name)).forEach(n=>{n.m[4]=520+(n.name.includes('小')?50:0);n.m[5]=1110;n.w*=.35;n.h*=.35;});}if(state.page==='P09'){const parts=s.nodes.filter(n=>n.name.includes('份量'));parts.filter(n=>(state.handled?.P09||[]).includes(n.name)).forEach((n,i)=>{n.m[4]=220+i*115;n.m[5]=740+i*35;n.mask=true;});}if(state.page==='R04'&&c){s.nodes.filter(n=>n.name.includes('可拨松')).forEach(n=>{n.w*=1+c*.025;n.h*=1-c*.02;n.m[4]-=c*7;});}if(state.page==='R06'&&c){s.nodes.filter(n=>n.name.includes('可补足')).slice(0,c).forEach(n=>{n.w*=1.15;n.h*=1.1;});}// Keep the same flap dimensions and seam in every open-cover scene.
const flap=s.nodes.find(n=>n.name.includes('翻盖'));
if(flap){const original=by.P08.nodes.find(n=>n.name.includes('翻盖'));Object.assign(flap,{w:original.w,h:original.h,m:foldMatrix(original,state.page==='P08'?0:1)});}
const zip=s.nodes.find(n=>n.asset&&n.name.includes('拉片'));const cushion=s.nodes.find(n=>n.asset&&n.name.includes('可试压'));if(zip&&cushion)positionZipper(cushion,zip,state.page==='T10'?1:0);
return s;}
function size(){const w=Math.min(innerWidth,innerHeight*750/1625,750);$('#viewport').style.width=w+'px';$('#viewport').style.height=w*1625/750+'px';$('#canvas').style.transform=`scale(${w/750})`;}
addEventListener('resize',size);size();
function actionButton(text,fn){const b=document.createElement('button');b.textContent=text;b.onclick=()=>fn();return b;}
const instructions={P01:'轻触坐垫，开始秋日手作',P02:'轻触画面中的白色棉絮，仔细观察',P03:'按住白色棉絮，拖进布篮后松手',P04:'把另一朵白色棉絮也拖进篮里',T01:'轻触布篮，把采好的棉带到桌边',P05:'把叶屑、壳屑拖到右下方的小碟里',T02:'轻触篮中的棉絮，取一小团仔细看',R01:'按住棉团，向外拨开表面的纤维',R02:'把露出的棉籽拖入右侧小碟',R03:'找到遗漏的棉籽，也拖进小碟里',T03:'轻触棉团，开始松棉',R04:'按住棉团边缘，向外拨松三次',T04:'轻触蓬松的棉，和预处理填料合并',P07:'轻触左侧折叠布套，把它展开',P08:'按住翻片向上掀开',T05:'开口已露出，接下来少量多次放棉',P09:'把托盘里的棉絮，一份份拖进内衬',R05:'按住中间的棉絮，向四周摊开',R06:'把厚处的棉拖向两侧较薄的边角',P10:'轻触鼓起的厚处，判断要怎样调整',P11:'从厚处把棉轻轻移向薄处',P12:'轻触铺好的棉絮，检查边角',T07:'按住翻片向下合拢，先不拉拉链',R07:'按住坐垫片刻，松手比较回弹',T08:'轻触比较硬的位置，重新打开布套',R08:'按住中央硬团，向外拨松两次',R09:'在刚才的位置再按住片刻，然后松手',T09:'轻触坐垫，确认厚薄合适',P13:'把多余的棉絮拖回托盘',P14:'按住大拉片，沿前侧开口向右滑到末端',T10:'按住坐垫，轻轻向上提起',P15:'按住坐垫，拖到椅面中央摆正',P16:'轻触「收好作品」，保留这次成果',P17:'轻触坐垫，回顾这次手作'};
function updatePanel(){const [title]=currentDef();$('#task').textContent=title;$('#description').textContent=instructions[state.page]||currentDef()[1];const total={P05:3,R04:3,P09:3,R06:2,R08:2}[state.page];$('#touch-count').textContent=total?`${count()} / ${total}`:'';document.title=title+' · 秋棉触控游戏';$('#canvas').dataset.state=state.page;$('#canvas').dataset.busy=String(busy);}
function setBusy(v){busy=v;$('#hits').style.pointerEvents=v?'none':'auto';$('#canvas').dataset.busy=String(v);}
function rawBounds(n){const b=n.bounds||[0,0,1,1],pts=[[b[0]*n.w,b[1]*n.h],[b[2]*n.w,b[1]*n.h],[b[0]*n.w,b[3]*n.h],[b[2]*n.w,b[3]*n.h]].map(([x,y])=>[n.m[0]*x+n.m[2]*y+n.m[4],n.m[1]*x+n.m[3]*y+n.m[5]]);let x=Math.min(...pts.map(p=>p[0])),y=Math.min(...pts.map(p=>p[1])),w=Math.max(...pts.map(p=>p[0]))-x,h=Math.max(...pts.map(p=>p[1]))-y;const min=44/($('#viewport').clientWidth/750);return {x:x-Math.max(0,min-w)/2,y:y-Math.max(0,min-h)/2,w:Math.max(min,w),h:Math.max(min,h)};}
let activeGesture=null;
function guide(box,label){const g=$('#drop-guide');if(!box){g.classList.remove('show');return;}Object.assign(g.style,{left:box[0]+'px',top:box[1]+'px',width:(box[2]-box[0])+'px',height:(box[3]-box[1])+'px'});g.textContent=label||'放在这里';g.classList.add('show');}
function hotspot(rect,label,fn,layer,rule={type:'tap'}){const b=document.createElement('div');b.className=layer?'touch-material':'touch-control';b.setAttribute('role','button');b.setAttribute('aria-label',label);b.tabIndex=0;b.dataset.gesture=rule.type;Object.assign(b.style,{left:rect.x+'px',top:rect.y+'px',width:rect.w+'px',height:rect.h+'px'});const point=e=>{const r=$('#canvas').getBoundingClientRect(),sc=r.width/750;return{x:(e.clientX-r.left)/sc,y:(e.clientY-r.top)/sc};};let start=null,dx=0,dy=0,held=0,ghost=null;const seam=rule.type==='zip'?layers.find(x=>x.n.name===layer?.n.zipParent):null;const movingParts=layer?[layer,...(rule.type==='lift'?layers.filter(x=>x!==layer&&x.n.name.includes('拉片')&&!layer.el.contains(x.el)):[])]:[];
const reset=()=>{if(seam)setSeamProgress(seam.el,seam.n.cushionSeam.progress);for(const part of movingParts){part.el.style.translate='';part.el.style.scale='';part.el.style.transform='matrix('+(part.n.localMatrix||part.n.m).join(',')+')';part.el.classList.remove('moving');}if(ghost){ghost.remove();ghost=null;}guide(null);start=null;activeGesture=null;};
b.onpointerdown=e=>{if(busy||activeGesture)return;e.preventDefault();start=point(e);held=performance.now();dx=dy=0;activeGesture=b;b.setPointerCapture(e.pointerId);if(rule.drop)guide(rule.drop,rule.dropLabel);if(rule.piece){ghost=document.createElement('img');ghost.src=by.P09.nodes.find(n=>n.name.includes('份量1')).asset;ghost.style.cssText='position:absolute;width:180px;height:180px;pointer-events:none;z-index:32';ghost.style.left=(start.x-90)+'px';ghost.style.top=(start.y-90)+'px';$('#canvas').append(ghost);}if(layer){movingParts.forEach(part=>part.el.classList.add('moving'));if(rule.type==='press')layer.el.style.scale=state.page==='R07'?'1.005 .975':'1.02 .90';}};
b.onpointermove=e=>{if(!start)return;const p=point(e);dx=p.x-start.x;dy=p.y-start.y;if(ghost){ghost.style.translate=dx+'px '+dy+'px';return;}if(!layer)return;if(rule.type==='drag'||rule.type==='lift')for(const part of movingParts)part.el.style.translate=`${dx}px ${dy}px`;if(rule.type==='swipe'){layer.el.style.scale=`${1+Math.min(.13,Math.hypot(dx,dy)/700)} ${1-Math.min(.055,Math.hypot(dx,dy)/1600)}`;}if(rule.type==='flap'){const original=by.P08.nodes.find(n=>n.name.includes('翻盖'));const open=rule.direction==='down'?1-Math.max(0,dy)/110:Math.max(0,-dy)/110;layer.el.style.transform='matrix('+foldMatrix(original,open).join(',')+')';}if(rule.type==='zip'){const z=zipperProgress(dx,dy);if(seam)setSeamProgress(seam.el,z);layer.el.style.translate=`${zipperTravel[0]*z}px ${zipperTravel[1]*z}px`;}};
b.onpointercancel=reset;b.onlostpointercapture=()=>{if(start)reset();};
b.onpointerup=async e=>{if(!start)return;const p=point(e),dist=Math.hypot(dx,dy),elapsed=performance.now()-held;let ok=rule.type==='tap'?dist<35:rule.type==='press'?elapsed>=350&&dist<65:rule.type==='zip'?zipperProgress(dx,dy)>.9&&Math.abs(dy-dx*zipperTravel[1]/zipperTravel[0])<65:rule.type==='lift'?dy<-65:rule.type==='flap'?(rule.direction==='down'?dy>65:dy<-65):dist>55;if(rule.drop)ok=ok&&p.x>rule.drop[0]&&p.x<rule.drop[2]&&p.y>rule.drop[1]&&p.y<rule.drop[3];if(!ok){if(layer&&!reduced){for(const part of movingParts){const from=getComputedStyle(part.el);part.el.animate([{translate:from.translate,scale:from.scale},{translate:'0px 0px',scale:'1 1'}],{duration:250,easing:'ease-out'});}}reset();hint(rule.type==='press'?'按住片刻，再松手看回弹。':rule.type==='tap'?'轻轻点一下就可以。':rule.type==='zip'?'沿布边把拉片滑到另一端。':rule.drop?'拖到提示区域里，再松手。':instructions[state.page]);return;}if(rule.type==='press'&&layer&&!reduced){setBusy(true);layer.el.style.scale='';await layer.el.animate([{scale:state.page==='R07'?'1.005 .975':'1.02 .90'},{scale:'1 1'}],{duration:500,easing:'cubic-bezier(.2,.9,.3,1)'}).finished;setBusy(false);}if(rule.type==='zip'&&seam){seam.n.cushionSeam.progress=1;positionZipper(seam.n,layer.n,1);}if(layer&&!ghost&&['drag','lift'].includes(rule.type)){for(const part of movingParts){part.n.m[4]+=rule.type==='zip'?zipperTravel[0]:dx;part.n.m[5]+=rule.type==='zip'?zipperTravel[1]:dy;part.el.style.transform='matrix('+(part.n.localMatrix||part.n.m).join(',')+')';}}if(layer&&rule.type==='flap')layer.n.m=foldMatrix(by.P08.nodes.find(n=>n.name.includes('翻盖')),rule.direction==='down'?0:1);reset();await fn(layer,{dx,dy,x:p.x,y:p.y});};
b.onkeydown=e=>{if(e.key==='Escape'){reset();return;}if((e.key==='Enter'||e.key===' ')&&rule.type==='tap'){e.preventDefault();if(!busy)fn(layer);}};$('#hits').append(b);return b;}
function buildHits(){const host=$('#hits');host.replaceChildren();const p=state.page;for(const l of layers){const n=l.n;if(n.text){const t=n.text;let fn;if(t==='休息')fn=pause;if(t==='返回')fn=leave;if(t==='撤回')fn=undo;if(/看看做法|看看提示/.test(t))fn=help;if(t==='开始体验'||t==='关闭')fn=()=>go(p==='P01'?'P02':'P03');if(t==='收好作品')fn=saveWork;if(/再做一只|再体验一遍/.test(t))fn=restart;if(/制作过程|看看过程|查看我的作品/.test(t))fn=recap;if(t==='听介绍'||t==='听一听')fn=intro;if(fn)hotspot(rawBounds(n),t,fn);continue;}if(!n.asset||n.opacity===0)continue;const name=n.name;let rule=null;
if(['P03','P04'].includes(p)&&name.includes('可采收'))rule={type:'drag',drop:[70,1000,735,1390],dropLabel:'棉絮放入布篮'};
else if(['P03','P04'].includes(p)&&name.includes('未成熟')){hotspot(rawBounds(n),'观察青铃',()=>hint('青铃还没有裂开，先让它留在枝头。'),l);continue;}
else if(p==='P05'&&name.includes('可拖动')&&!(state.handled?.P05||[]).includes(name))rule={type:'drag',drop:[420,1020,745,1400],dropLabel:'杂物放进小碟'};
else if(p==='R01'&&name.includes('拨开对象'))rule={type:'swipe'};
else if(['R02','R03'].includes(p)&&/可取出|仍需取出/.test(name))rule={type:'drag',drop:[490,705,745,1010],dropLabel:'棉籽放入小碟'};
else if(p==='R04'&&name.includes('可拨松'))rule={type:'swipe'};
else if(p==='P08'&&name.includes('翻盖'))rule={type:'flap',direction:'up'};
else if(p==='T07'&&name.includes('翻盖'))rule={type:'flap',direction:'down'};
else if(p==='P09'&&name.includes('份量')&&!(state.handled?.P09||[]).includes(name))rule={type:'drag',drop:[90,585,675,1000],dropLabel:'棉絮放到内衬上'};
else if(p==='R05'&&name.includes('可铺开'))rule={type:'swipe'};
else if(p==='R06'&&name.includes('可铺开'))rule={type:'drag',piece:true,drop:count()===0?[70,610,290,820]:[460,590,690,820],dropLabel:count()===0?'补足左边角':'补足右边角'};
else if(p==='P10'&&name.includes('可铺匀'))rule={type:'tap'};
else if(p==='P11'&&name.includes('可铺匀'))rule={type:'swipe'};
else if(p==='P12'&&name.includes('可铺匀'))rule={type:'tap'};
else if(p==='P13'&&name.includes('可铺匀'))rule={type:'drag',piece:true,drop:[430,1030,745,1430],dropLabel:'多余棉絮放回托盘'};
else if(['R07','R09'].includes(p)&&name.includes('可试压'))rule={type:'press'};
else if(p==='R08'&&name.includes('可松解'))rule={type:'swipe'};
else if(p==='P14'&&name.includes('拉片'))rule={type:'zip'};
else if(p==='T10'&&name.includes('可试压'))rule={type:'lift'};
else if(p==='P15'&&name.includes('可试摆'))rule={type:'drag',drop:[100,650,690,1100],dropLabel:'摆到椅面中央'};
else if((p==='T01'&&name.includes('放置目标'))||(p==='T02'&&/静态背景|静态场景/.test(name))||(['T03'].includes(p)&&name.includes('拨开对象'))||(p==='T04'&&name.includes('可拨松'))||(p==='P07'&&name.includes('可打开'))||(['T08','T09'].includes(p)&&name.includes('可试压')))rule={type:'tap'};
else if(p==='P07'&&name.includes('可点按')){hotspot(rawBounds(n),'观察已经备好的填料',()=>hint('这里还加入了预先去籽、开松的足量填料。'),l);continue;}else if(['P16','P17'].includes(p)&&name.includes('可试摆')){hotspot(rawBounds(n),p==='P16'?'收藏这只坐垫':'回顾制作过程',p==='P16'?saveWork:recap,l);continue;}
if(rule)hotspot(p==='T02'?{x:80,y:620,w:590,h:510}:rawBounds(n),name.replaceAll('／',' · '),commitGesture,l,rule);
}
if(p==='P01')hotspot({x:230,y:700,w:500,h:490},'轻触坐垫开始体验',()=>go('P02'));
if(p==='P02')hotspot({x:70,y:390,w:610,h:810},'轻触白色棉絮观察成熟特征',()=>go('P03'));
if(['P10','P11','P12','R06'].includes(p)){for(const l of layers.filter(x=>/可取回|可取用/.test(x.n.name))){hotspot(rawBounds(l.n),'把托盘棉絮加入布套',()=>go('P13'),l,{type:'drag',drop:[100,585,675,1000],dropLabel:'放入布套，看看是否过量'});}}
}
async function commitGesture(l){if(busy)return;const p=state.page;checkpoint();state.events.push({page:p,label:currentDef()[0],time:Date.now()});if(p==='P03')state.firstHarvest=l.n.name;const total={P05:3,R04:3,P09:3,R06:2,R08:2}[p];if(total){state.handled||={};state.handled[p]||=[];state.handled[p].push(l.n.name);state.counts[p]=(state.counts[p]||0)+1;if(state.counts[p]<total){setBusy(true);try{await draw(450);persist();}finally{setBusy(false);}return;}}await go(currentDef()[3],false);}
async function draw(duration=600){const s=sceneFor();await prepareScene(s);layers=layers.length?await morphScene($('#layers'),layers,s,reduced?1:duration):renderScene($('#layers'),s);updatePanel();buildHits();if(state.page==='T05')setTimeout(()=>{if(state.page==='T05'&&!busy&&!$('#dialog').open)go('P09',false);},1600);}
const clips={'T01:P05':'harvest-table','T02:R01':'sort-seeds','T04:P07':'prepare-fill','P07:P08':'open-cover','T07:R07':'close-test','T08:R08':'reopen','R08:R09':'retest','T10:P15':'table-chair'};
async function playTransition(file,dest){const v=$('#movie'),wrap=$('#video-wrap');if(reduced)return false;v.src='videos/'+file+'.mp4?v=touch-final';wrap.hidden=false;v.load();let done;const ended=new Promise(r=>done=r);const timer=setTimeout(()=>done('timeout'),16000);v.onended=()=>done('ended');v.onerror=()=>done('error');$('#skip').onclick=()=>done('skip');try{await v.play();wrap.classList.add('show');await ended;}catch{}finally{clearTimeout(timer);v.pause();wrap.classList.remove('show');await wait(230);wrap.hidden=true;v.onended=null;v.onerror=null;}return true;}
async function go(id,record=true){if(busy)return;setBusy(true);const old=state.page;try{await prepareScene(by[id]);if(record){checkpoint();state.events.push({page:old,label:currentDef()[0],time:Date.now()});}// Old cross-scene movies contain baked-in outgoing bowls; use the live scene layers instead.
const background=page=>by[page].nodes.find(n=>n.asset&&n.w>=740&&n.h>=1400)?.asset;const hasZipper=page=>by[page].nodes.some(n=>n.asset&&n.name.includes('拉片'));const clip=background(old)===background(id)&&!hasZipper(old)&&!hasZipper(id)?clips[old+':'+id]:null;if(clip&&!reduced){const movie=playTransition(clip,id);await wait(450);state.page=id;await draw(1);await movie;}else{state.page=id;await draw();}persist();if(id==='T05')setTimeout(()=>{if(state.page==='T05'&&!$('#dialog').open)go('P09',false);},1200);}catch(e){state.page=old;loadError(()=>go(id,record));}finally{setBusy(false);}}
async function undo(){if(busy)return;if(!state.previous.length){hint('已经在开始的位置。');return;}const old=state.previous.pop(),history=state.previous;state={...old,previous:history};setBusy(true);try{await draw();persist();}finally{setBusy(false);}}
function openModal(title,copy,actions){lastFocus=document.activeElement;$('#modal-title').textContent=title;$('#modal-copy').textContent=copy;$('#modal-extra').replaceChildren();$('#modal-actions').replaceChildren(...actions.map(([t,f])=>actionButton(t,f)));if(!$('#dialog').open)$('#dialog').showModal();$('#modal-actions button')?.focus();}
function closeModal(){const vid=$('#modal-extra video');if(vid)vid.pause();$('#dialog').close();lastFocus?.focus();if(state.page==='T05')setTimeout(()=>go('P09',false),500);}
$('#close-dialog').onclick=closeModal;$('#dialog').addEventListener('cancel',()=>{const v=$('#modal-extra video');v?.pause();});
function pause(){if(busy){hint('这个动作正在落稳，马上就好。');return;}const ok=persist();openModal(ok?'先歇一会儿':'进度暂时没能保存',ok?'材料停在这里，进度已经保存在当前浏览器。回来时从这里接着做。':'当前画面和作品仍然保留。可以继续操作，或再试一次保存。',[['继续刚才的操作',closeModal],[ok?'保存并回到入口':'再试一次保存',()=>{if(persist()){closeModal();saved=structuredClone(state);state=fresh();draw();if(parent!==window)parent.postMessage({source:'qinghe-games',type:'exit'},location.origin);}}]]);}
function leave(){openModal('先收好进度再离开','当前材料位置会保留。下次可以从这里继续。',[['保存并回到入口',()=>{if(persist()){saved=structuredClone(state);closeModal();state=fresh();draw();if(parent!==window)parent.postMessage({source:'qinghe-games',type:'exit'},location.origin);}else $('#modal-copy').textContent='保存没有成功，请保留此页面并重试。';}],['继续操作',closeModal]]);}
function restart(){openModal('再做一只小坐垫？',state.saved?'已经收藏的作品会保留。新的体验会从认识棉铃开始。':'这次作品还没收藏。可以先返回收好作品，或明确放弃本次进度。',[['继续这一次',closeModal],['放弃本次进度，重新开始',async()=>{closeModal();state=fresh();await draw();persist();}]]);}
const clues={P05:'比较叶片、硬壳和柔软纤维。要挑出的是杂物。',P09:'先看托盘，再看布套开口。少量多次，就容易检查。',R03:'左边已检查，右边还可能藏着硬籽。',R06:'比较中间和两个上角的厚薄。',R07:'轻按中间，再与边角比较。',R08:'找到中央紧实的一团，把纤维拨开。'};
function help(){helpLevel=0;showHelp();}
function showHelp(){const title=['这一步要做什么','再给一点观察线索','看看局部动作'][helpLevel],copy=helpLevel===0?currentDef()[1]:helpLevel===1?(clues[state.page]||'先观察材料和目标位置，按住材料，沿提示方向移动；松手即可停下。'):'这段说明操作方法，材料和进度保持原样。';openModal(title,copy,[['回去自己试试',closeModal],...(helpLevel<2?[[helpLevel===0?'再给一点提示':'看看动作示范',()=>{helpLevel++;showHelp();}]]:[])]);if(helpLevel===2&&by[state.page].nodes.some(n=>n.asset&&n.name.includes('拉片'))){$('#modal-copy').textContent=state.page==='P14'?'按住前侧开口左端的拉片，沿布边向右移动到末端；拉过的位置会逐段闭合。':instructions[state.page]||currentDef()[1];return;}if(helpLevel===2){const v=document.createElement('video');v.controls=true;v.playsInline=true;v.muted=true;v.src='videos/'+(['R01','R02','R03'].includes(state.page)?'seed-demo':['P03','P04','P05'].includes(state.page)?'harvest-table':['R07','R08','R09','P14'].includes(state.page)?'retest':'fill-demo')+'.mp4?v=touch-final';$('#modal-extra').append(v);}}
function intro(){openModal('从棉铃到小坐垫','先认成熟棉铃，再挑杂、去籽和松棉。分次装填，照顾边角，试压调整后收口。完成的小坐垫可以收藏在这个浏览器里。',[['开始体验',()=>{closeModal();go('P02');}],['先看看',closeModal]]);}
function loadError(retry){openModal('材料还没有准备好','有一张素材暂时没能加载。当前进度仍然保留，重新加载后继续。',[['重新加载材料',()=>{closeModal();retry();}],['留在当前页面',closeModal]]);}
async function saveWork(){if(busy)return;if(inspecting){hint('检查模式，不写入作品收藏。');return;}setBusy(true);state.page='T12';await draw();await wait(reduced?20:700);try{const works=JSON.parse(localStorage.getItem('autumn-cotton-works-v1')||'[]');const work={id:Date.now(),title:'秋棉小坐垫',events:state.events};works.push(work);localStorage.setItem('autumn-cotton-works-v1',JSON.stringify(works));state.saved=true;state.page='P17';await draw();persist();}catch{state.page='P16';await draw();openModal('作品还没有收好','本次作品仍然保留。当前浏览器存储不可用，可以重试，或继续查看作品。',[['再试一次',()=>{closeModal();saveWork();}],['继续看作品',closeModal]]);}finally{setBusy(false);}}
function recap(){openModal('这一次，你这样完成','以下是本局真正发生的操作。',[['回到作品',closeModal],['再做一只',()=>{closeModal();restart();}]]);const ul=document.createElement('ol');ul.className='recap';const seen=new Set();for(const e of state.events){if(seen.has(e.label))continue;seen.add(e.label);const li=document.createElement('li');li.textContent=e.label;ul.append(li);}if(!seen.size){const li=document.createElement('li');li.textContent='还没有完成操作，先从认识棉铃开始。';ul.append(li);}$('#modal-extra').append(ul);}
await draw(1);if(saved){openModal('找回上次的进度','材料还停在上次的位置。要接着做，还是先留在入口？',[['接着上次做',async()=>{state=saved;closeModal();await draw();persist();}],['先留在入口',closeModal]]);}




