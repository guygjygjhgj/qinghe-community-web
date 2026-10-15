export const VERSION=1;
export const LABELS={intro:'开始秋收',harvest:'田边采收',harvested:'三穗已入篮',peel:'剥叶与检查',peeled:'三穗已整理',rack:'留出晾晒空隙',racked:'摆放完成',dry:'等一等秋阳',position:'把玉米移到盆上',shell:'脱粒与翻面',shelled:'三穗已脱粒',sort:'整理粮粒',pour:'收粮入篮',done:'收好一篮秋粮'};
export function fresh(){return{version:VERSION,id:Date.now().toString(36),phase:'intro',harvested:[],peels:[0,0,0],peelIndex:0,peelFlipped:false,rack:[{x:228,y:654},{x:635,y:643},{x:262,y:634}],dryLeft:9000,shellIndex:0,face:0,grains:[[false,false,false,false,false,false],[false,false,false,false,false,false],[false,false,false,false,false,false]],sorted:[],poured:0,playMs:0,hints:0,undoCount:0,actions:0};}
export function validate(s){return !!(s&&s.version===VERSION&&LABELS[s.phase]&&Array.isArray(s.harvested)&&new Set(s.harvested).size===s.harvested.length&&s.harvested.every(x=>Number.isInteger(x)&&x>=0&&x<3)&&Array.isArray(s.peels)&&s.peels.length===3&&s.peels.every(x=>Number.isInteger(x)&&x>=0&&x<=4)&&Number.isInteger(s.peelIndex)&&s.peelIndex>=0&&s.peelIndex<3&&Array.isArray(s.rack)&&s.rack.length===3&&s.rack.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))&&Number.isFinite(s.dryLeft)&&s.dryLeft>=0&&s.dryLeft<=9000&&Array.isArray(s.grains)&&s.grains.length===3&&s.grains.every(g=>Array.isArray(g)&&g.length===6&&g.every(v=>typeof v==='boolean'))&&Number.isInteger(s.shellIndex)&&s.shellIndex>=0&&s.shellIndex<3&&[0,1].includes(s.face)&&Array.isArray(s.sorted)&&new Set(s.sorted).size===s.sorted.length&&s.sorted.every(x=>Number.isInteger(x)&&x>=0&&x<3)&&Number.isFinite(s.poured)&&s.poured>=0&&s.poured<=100&&Number.isFinite(s.playMs)&&s.playMs>=0);}
export function clone(s){return structuredClone(s);}
export function grainCount(s){return s.grains.flat().filter(Boolean).length;}
export const RACK_GOALS=[{x:211,y:594},{x:635,y:643},{x:448,y:794}];
const GEOM=[{dx:115,dy:-133,r:35},{dx:49,dy:145,r:35},{dx:147,dy:124,r:43}];
function pointSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function segmentDistance(a,b,c,d){if(cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0)return 0;return Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b));}
function endpoints(p,i){const g=GEOM[i];return[{x:p.x-g.dx,y:p.y-g.dy},{x:p.x+g.dx,y:p.y+g.dy}];}
export function onRack(p,i){return endpoints(p,i).every(q=>((q.x-375)/465)**2+((q.y-670)/340)**2<1);}
export function rackReady(positions){if(!positions.every(onRack))return false;for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){if(segmentDistance(...endpoints(positions[i],i),...endpoints(positions[j],j))<GEOM[i].r+GEOM[j].r+16)return false;}return true;}
export function reduce(previous,event){const s=clone(previous);let changed=true;const {type,index}=event;
 switch(type){
 case'START':if(s.phase!=='intro')return previous;s.phase='harvest';break;
 case'HARVEST':if(s.phase!=='harvest'||!Number.isInteger(index)||index<0||index>2||s.harvested.includes(index))return previous;s.harvested.push(index);if(s.harvested.length===3)s.phase='harvested';break;
 case'PEEL_BEGIN':if(s.phase!=='harvested')return previous;s.phase='peel';break;
 case'PEEL':if(s.phase!=='peel')return previous;{const n=s.peels[s.peelIndex];if(n>=3||n===2&&!s.peelFlipped)return previous;s.peels[s.peelIndex]++;}break;
 case'FLIP_PEEL':if(s.phase!=='peel'||s.peels[s.peelIndex]!==2||s.peelFlipped)return previous;s.peelFlipped=true;break;
 case'SILK':if(s.phase!=='peel'||s.peels[s.peelIndex]!==3)return previous;s.peels[s.peelIndex]=4;if(s.peels.every(n=>n===4))s.phase='peeled';else{s.peelIndex++;s.peelFlipped=false;}break;
 case'RACK_BEGIN':if(s.phase!=='peeled')return previous;s.phase='rack';break;
 case'RACK_MOVE':if(s.phase!=='rack'||!Number.isInteger(index)||index<0||index>2||!event.point||!onRack(event.point,index))return previous;s.rack[index]={x:event.point.x,y:event.point.y};if(rackReady(s.rack))s.phase='racked';break;
 case'DRY_BEGIN':if(s.phase!=='racked')return previous;s.phase='dry';break;
 case'TICK':if(!Number.isFinite(event.ms)||event.ms<=0)return previous;s.playMs+=Math.min(event.ms,1000);if(s.phase==='dry'){s.dryLeft=Math.max(0,s.dryLeft-Math.min(event.ms,1000));if(!s.dryLeft)s.phase='position';}break;
 case'SKIP_DRY':if(s.phase!=='dry')return previous;s.dryLeft=0;s.phase='position';break;
 case'POSITION':if(s.phase!=='position')return previous;s.phase='shell';break;
 case'GRAIN':if(s.phase!=='shell'||!Number.isInteger(index)||index<0||index>2)return previous;{const k=s.face*3+index;if(s.grains[s.shellIndex][k])return previous;s.grains[s.shellIndex][k]=true;if(s.grains[s.shellIndex].every(Boolean)){if(s.shellIndex===2)s.phase='shelled';else{s.shellIndex++;s.face=0;s.phase='position';}}}break;
 case'FLIP_SHELL':if(s.phase!=='shell')return previous;s.face=1-s.face;break;
 case'SORT_BEGIN':if(s.phase!=='shelled')return previous;s.phase='sort';break;
 case'SORT':if(s.phase!=='sort'||!Number.isInteger(index)||index<0||index>2||s.sorted.includes(index))return previous;s.sorted.push(index);if(s.sorted.length===3)s.phase='pour';break;
 case'POUR':if(s.phase!=='pour'||!Number.isFinite(event.amount)||event.amount<=0)return previous;s.poured=Math.min(100,s.poured+Math.min(25,event.amount));if(s.poured===100)s.phase='done';break;
 default:changed=false;
 }if(!changed)return previous;if(type!=='TICK')s.actions++;return s;
}

