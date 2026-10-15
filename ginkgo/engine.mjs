export const SAVE_KEY='plant-ginkgo-r1';
export const CARD={x:213,y:240,w:440,h:518};
export const PRESS={x:135,y:245,w:480,h:525};
export const GOOD=['a','b','c','d','e'];
export const LEAF_SIZE={a:[182,191],b:[158,173],c:[137,146],d:[183,192],e:[172,181],torn:[159,164],dark:[167,174]};
export const ART_SEED={a:{x:350,y:375,r:-12},b:{x:313,y:462,r:-46},c:{x:331,y:545,r:-83},d:{x:522,y:524,r:29},e:{x:513,y:362,r:28}};
export const PRESS_SEED={a:{x:247,y:385,r:0},b:{x:413,y:371,r:0},c:{x:525,y:395,r:0},d:{x:290,y:588,r:0},e:{x:489,y:603,r:0}};
const clone=s=>structuredClone(s);
export function fresh(id){return {version:1,id:id||globalThis.crypto?.randomUUID?.()||'ginkgo-'+Date.now(),stage:0,leaves:[...GOOD,'torn','dark'].map((id,i)=>({id,good:i<5,selected:false,moisture:['a','d'].includes(id),dryZones:[],flat:false,press:null,art:null,fixed:false})),pressPhase:'spread',waitMs:0,glue:[],brushLoaded:false,framePhase:'secure',framePlaced:null,complete:false,saved:false};}
export function selected(s){return s.leaves.filter(l=>l.selected&&l.good)}
function contained(p,size,box){if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.r))return false;const a=p.r*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [[-.25,-.5],[.25,-.5],[-.5,-.2],[.5,-.2],[-.3,.12],[.3,.12],[.2,.5]].every(([u,v])=>{const x=p.x+u*size[0]*c-v*size[1]*s,y=p.y+u*size[0]*s+v*size[1]*c;return x>=box.x-8&&x<=box.x+box.w+8&&y>=box.y-8&&y<=box.y+box.h+8;});}
function overlap(p,q,size,other){return Math.hypot((p.x-q.x)/((size[0]+other[0])*0.24),(p.y-q.y)/((size[1]+other[1])*0.22))<1;}
export function layoutProblem(s,id,p,kind='art'){const size=LEAF_SIZE[id],box=kind==='art'?CARD:PRESS;if(!size||!contained(p,size,box))return '叶片要完整留在纸上，再往里挪一点。';if(kind==='art'&&(p.y>620||p.y<327))return '留出下方的树干，把叶片放在枝干周围。';if(selected(s).some(l=>l.id!==id&&l[kind]&&overlap(p,l[kind],size,LEAF_SIZE[l.id])))return kind==='press'?'这两片叠得太多，分开一点再压。':'叶片叠得太多，稍微分开一点。';return '';}
export function stemFacing(p){const rad=p.r*Math.PI/180,dx=Math.sin(-rad),dy=Math.cos(rad),tx=427-p.x,ty=606-p.y;return (dx*tx+dy*ty)/Math.max(1,Math.hypot(tx,ty))>0.24;}
export function ready(s){switch(s.stage){case 1:return selected(s).length===5&&!s.leaves.some(l=>l.selected&&!l.good);case 2:return selected(s).length===5&&selected(s).every(l=>!l.moisture);case 3:return s.pressPhase==='done'&&selected(s).every(l=>l.flat);case 4:return s.glue.length===3;case 5:return selected(s).length===5&&selected(s).every(l=>l.art&&stemFacing(l.art)&&!layoutProblem(s,l.id,l.art));case 6:return s.framePhase==='closed'&&selected(s).every(l=>l.fixed);case 7:return s.framePlaced!=null;default:return false;}}
export function advance(s){if(!ready(s))return s;const n=clone(s);n.stage++;if(n.stage===8)n.complete=true;return n;}
export function act(s,action){const n=clone(s);let message='',sound='leaf',ok=true;const l=n.leaves.find(x=>x.id===action.id);const bad=m=>{ok=false;message=m};
 switch(action.type){
 case 'start':if(n.stage===0)n.stage=1;else bad('');break;
 case 'choose':if(n.stage!==1||!l){bad('');break;}if(!l.good&&action.value!==false){bad(l.id==='torn'?'这片边缘破损较大，先留在原盘。中央的天然缺口不用担心。':'这片有一大块深色斑，换一片清楚的叶子。');break;}l.selected=action.value!==false;message=l.selected?'这片放好了，还可以继续挑。':'已经放回原盘。';break;
 case 'dry':if(n.stage!==2||!l?.selected){bad('');break;}if(!l.moisture){message='这片已经干了，看看还有水珠的叶片。';sound=null;break;}if(![0,1].includes(action.zone)){bad('');break;}l.dryZones=Array.from(new Set([...l.dryZones,action.zone]));l.moisture=l.dryZones.length<2;message=l.moisture?'这半边干了，再按一下另一边。':'这片的水珠已经吸干。';sound='cloth';break;
 case 'dryWhole':if(n.stage!==2||!l?.selected){bad('');break;}l.dryZones=[0,1];l.moisture=false;sound='cloth';message='水珠已经吸干。';break;
 case 'placePress':if(n.stage!==3||n.pressPhase!=='spread'||!l?.selected||l.moisture){bad('先把叶片擦干。');break;}message=layoutProblem(n,l.id,action.pos,'press');if(message){ok=false;break;}l.press=action.pos;break;
 case 'cover':if(n.stage!==3||n.pressPhase!=='spread'||selected(n).some(l=>!l.press||layoutProblem(n,l.id,l.press,'press'))){bad('五片叶子要先铺开，不能叠在一起。');break;}n.pressPhase='book';sound='paper';message='上层纸盖好了，再把书放上去。';break;
 case 'book':if(n.stage!==3||n.pressPhase!=='book'){bad('');break;}n.pressPhase='waiting';n.waitMs=0;sound='wood';message='模拟压叶过程。现实里，需要让叶片慢慢压平。';break;
 case 'wait':if(n.stage===3&&n.pressPhase==='waiting'){n.waitMs=Math.min(6200,n.waitMs+Math.max(0,Math.min(500,Number(action.ms)||0)));if(n.waitMs===6200)n.pressPhase='lift';sound=null;}else bad('');break;
 case 'liftBook':if(n.stage!==3||n.pressPhase!=='lift'){bad('');break;}n.pressPhase='uncover';sound='wood';message='书拿开了，揭起上层纸看看。';break;
 case 'uncover':if(n.stage!==3||n.pressPhase!=='uncover'){bad('');break;}n.pressPhase='done';selected(n).forEach(l=>l.flat=true);sound='paper';message='叶片压平了，接着准备底纸。';break;
 case 'loadBrush':if(n.stage!==4){bad('');break;}n.brushLoaded=true;sound=null;message='刷子蘸好胶，薄薄刷在树冠位置。';break;
 case 'glue':if(n.stage!==4||!n.brushLoaded){bad('先让刷子蘸一点胶。');break;}if(![0,1,2].includes(action.zone)){bad('胶刷在上方树冠位置，留出纸边和树干。');break;}n.glue=Array.from(new Set([...n.glue,action.zone]));sound='brush';message=n.glue.length===3?'树冠位置刷好了，可以摆叶片。':'这一处刷好了，再看看旁边。';break;
 case 'placeArt':if(n.stage!==5||!l?.selected||!l.flat){bad('');break;}message=layoutProblem(n,l.id,action.pos);if(message){ok=false;break;}if(!stemFacing(action.pos)){bad('转一转叶片，让叶柄朝向枝干。');break;}l.art=action.pos;message='放好了。每一片的位置，都可以自己调整。';break;
 case 'returnArt':if(n.stage!==5||!l?.selected){bad('');break;}l.art=null;message='拿回盘里了，可以重新摆。';break;
 case 'rotate':if(n.stage!==5||!l?.art){bad('先选一片放在纸上的叶子。');break;}l.art.r=((l.art.r+(action.degrees||15)+180)%360)-180;message=stemFacing(l.art)?'叶柄朝向枝干了。':'再转一转，让叶柄朝向枝干。';break;
 case 'secure':if(n.stage!==6||n.framePhase!=='secure'||!l?.art){bad('');break;}l.fixed=true;sound='paper';message='这片按牢了。';if(selected(n).every(l=>l.fixed)){n.framePhase='base';message='叶片都贴稳了，把画纸放进木框底座。';}break;
 case 'frameCard':if(n.stage!==6||n.framePhase!=='base'){bad('');break;}n.framePhase='close';sound='paper';message='画纸放进槽里了，把木框前沿合上。';break;
 case 'closeFrame':if(n.stage!==6||n.framePhase!=='close'){bad('');break;}n.framePhase='closed';sound='wood';message='木框合好了，再找一个稳当的位置。';break;
 case 'standFrame':if(n.stage!==7){bad('');break;}n.standOpen=true;sound='wood';message='支架打开了，把画框放在桌面中间。';break;
 case 'placeFrame':if(n.stage!==7||!n.standOpen){bad('先打开背面的支架，再放稳。');break;}if(!Number.isFinite(action.x)||action.x<300||action.x>450||!Number.isFinite(action.y)||action.y<420||action.y>560){bad('再向桌面中间挪一点，离边缘远一些。');break;}n.framePlaced={x:action.x,y:action.y||515};sound='wood';message='稳稳放好了，秋天留在这里。';break;
 default:bad('');
 }
 return {state:ok?n:s,ok,message,sound:ok?sound:null};
}
export function restore(raw){try{const s=typeof raw==='string'?JSON.parse(raw):clone(raw);if(s?.version!==1||typeof s.id!=='string'||!Number.isInteger(s.stage)||s.stage<0||s.stage>8||s.leaves?.length!==7||new Set(s.leaves.map(l=>l.id)).size!==7||[...GOOD,'torn','dark'].some(id=>!s.leaves.some(l=>l.id===id))||!Array.isArray(s.glue))return null;const base=fresh(s.id);s.leaves.forEach(l=>{l.good=GOOD.includes(l.id);if(!l.good)l.selected=false;for(const key of ['art','press'])if(l[key]&&(!Number.isFinite(l[key].x)||!Number.isFinite(l[key].y)||!Number.isFinite(l[key].r)))l[key]=null;});return {...base,...s,complete:s.stage===8};}catch{return null;}}
export function demo(stage,variant='default'){let s=fresh('preview-'+stage+'-'+variant);s.stage=stage;if(stage>=2)s.leaves.forEach(l=>l.selected=l.good);if(stage>=3)selected(s).forEach(l=>{l.moisture=false;l.dryZones=[0,1]});if(stage>=4){selected(s).forEach(l=>{l.flat=true;l.press=PRESS_SEED[l.id]});s.pressPhase='done';}if(stage>=5)s.glue=[0,1,2];if(stage>=6)selected(s).forEach(l=>l.art=clone(ART_SEED[l.id]));if(stage>=7){selected(s).forEach(l=>l.fixed=true);s.framePhase='closed';}if(stage===8){s.standOpen=true;s.framePlaced={x:375,y:515};s.complete=true;}if(stage===5&&variant!=='empty')selected(s).forEach(l=>{if(l.id!=='e'||variant==='done')l.art=clone(ART_SEED[l.id])});if(stage===3&&variant!=='default'){selected(s).forEach(l=>l.press=clone(PRESS_SEED[l.id]));s.pressPhase=variant==='waiting'?'waiting':variant==='reveal'?'uncover':variant==='covered'?'book':'spread';}if(stage===4&&variant==='partial'){s.brushLoaded=true;s.glue=[0]};if(stage===6&&variant==='close'){selected(s).forEach(l=>l.fixed=true);s.framePhase='close';}return s;}
