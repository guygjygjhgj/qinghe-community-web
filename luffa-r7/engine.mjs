export const KEY='plant-luffa-r7';
export const stages=['harvest','landed','peel','clear','wash','place','dry','try','scrub','rinse','return','complete'];
const unit=v=>Math.max(0,Math.min(1,Number(v)||0));
export function fresh(){return {version:7,id:'luffa-r7-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),stage:'harvest',peel:0,clear:0,wash:0,dry:0,rinse:0,water:false,paths:[],events:[],complete:false};}
export function restore(raw){try{const s=typeof raw==='string'?JSON.parse(raw):raw;if(!s||s.version!==7||!/^luffa-r7-[\w-]+$/.test(s.id)||!stages.includes(s.stage))return null;const n=fresh();n.id=s.id;n.stage=s.stage==='landed'?'peel':s.stage;for(const k of ['peel','clear','wash','dry','rinse'])n[k]=unit(s[k]);n.water=false;n.paths=Array.isArray(s.paths)?s.paths.slice(-80).map(p=>Array.isArray(p)?p.slice(-500).filter(q=>Array.isArray(q)&&q.length===2&&q.every(Number.isFinite)).map(q=>[Math.max(0,Math.min(360,q[0])),Math.max(0,Math.min(240,q[1]))]):[]):[];n.events=Array.isArray(s.events)?s.events.filter(e=>typeof e==='string').map(e=>e.slice(0,90)).slice(-12):[];n.complete=n.stage==='complete';return n;}catch{return null;}}
// Samples follow the visible food residue, not mandatory invisible clickable zones.
const dirtPoints=Array.from({length:7},(_,r)=>Array.from({length:10},(_,c)=>[138+c*16,42+r*13])).flat().filter(([x,y])=>((x-218)/90)**2+((y-84)/59)**2<1);
function segmentDistance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
export function coverage(paths){return dirtPoints.filter(p=>paths.some(path=>path.some((q,i)=>i?segmentDistance(p,path[i-1],q)<38:Math.hypot(p[0]-q[0],p[1]-q[1])<38))).length/dirtPoints.length;}
export function reduce(s,a){let n={...s,paths:s.paths.map(p=>p.map(q=>[...q])),events:[...s.events]};const go=(stage,event)=>{n.stage=stage;n.water=false;if(event&&!n.events.includes(event))n.events.push(event);};
 switch(a.type){
 case 'cut':if(s.stage==='harvest'&&a.aligned)go('landed','对准瓜柄，摘下成熟的绿皮老丝瓜');break;
 case 'settle':if(s.stage==='landed')go('peel');break;
 case 'peel':if(s.stage==='peel')n.peel=Math.max(s.peel,unit(a.value));break;
 case 'next-peel':if(s.stage==='peel'&&s.peel===1)go('clear','顺着松开的果皮，露出湿润纤维');break;
 case 'loosen':if(s.stage==='clear')n.clear=unit(s.clear+Math.max(0,Math.min(50,Number(a.distance)||0))/260);break;
 case 'next-clear':if(s.stage==='clear'&&s.clear===1)go('wash','轻轻抖动，清理附着的籽和果瓤');break;
 case 'water':if(['wash','rinse'].includes(s.stage))n.water=!s.water;break;
 case 'rinse':if(s.water&&a.under&&['wash','rinse'].includes(s.stage)){const key=s.stage==='wash'?'wash':'rinse';n[key]=unit(s[key]+Math.min(100,Math.max(0,Number(a.ms)||0))/(key==='wash'?5600:2800));}break;
 case 'next-wash':if(s.stage==='wash'&&s.wash===1)go('place','让水穿过纤维，两面都冲净');break;
 case 'place':if(a.target==='rack'){if(s.stage==='place')go('dry','观察水滴，把湿丝瓜络放到通风架');if(s.stage==='return'){go('complete','用后冲净，再放回通风架');n.complete=true;}}break;
 case 'dry':if(s.stage==='dry')n.dry=unit(s.dry+Math.min(100,Math.max(0,Number(a.ms)||0))/7500);break;
 case 'next-dry':if(s.stage==='dry'&&s.dry===1)go('try','观察纤维从湿润变得干燥蓬松');break;
 case 'try':if(s.stage==='try'&&a.target==='bowl')go('scrub');break;
 case 'wipe':if(s.stage==='scrub'&&Number.isFinite(a.x)&&Number.isFinite(a.y)&&a.x>=50&&a.x<=330&&a.y>=18&&a.y<=160){if(a.start||!n.paths.length)n.paths.push([]);let p=n.paths[n.paths.length-1];if(p.length<500&&n.paths.length<=80)p.push([a.x,a.y]);}break;
 case 'next-scrub':if(s.stage==='scrub'&&coverage(s.paths)>=.92)go('rinse','沿看得见的残留擦洗，检查碗面是否干净');break;
 case 'next-rinse':if(s.stage==='rinse'&&s.rinse===1)go('return','用过的丝瓜络也要冲洗干净');break;
 }return n;
}
