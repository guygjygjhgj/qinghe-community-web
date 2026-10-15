export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const W=560,H=480;
export const phasePage={prepare:'P07',open:'P08',fill:'P09',spread:'R05',press:'R07',fix:'R08',zip:'P14',carry:'T10',place:'P15',complete:'P16',saved:'P17'};
export const workshopPages=new Set(['P07','P08','T05','P09','T06','R05','R06','P10','P11','P12','P13','T07','R07','T08','R08','R09','T09','P14','T10','T11','P15','P16','T12','P17']);
const trayCenters=[[443,1175],[576,1160],[676,1216],[467,1310],[602,1328]];
export function createMaterial(page='P07'){
 const phase=({P08:'open',T05:'fill',P09:'fill',T06:'fill',R05:'spread',R06:'spread',P10:'spread',P11:'spread',P12:'spread',P13:'spread',T07:'spread',R07:'press',T08:'press',R08:'fix',R09:'press',T09:'zip',P14:'zip',T10:'carry',T11:'place',P15:'place',P16:'complete',T12:'complete',P17:'saved'})[page]||'prepare';
 const particles=trayCenters.flatMap(([x,y],portion)=>Array.from({length:3},(_,part)=>({id:portion*3+part,portion,space:'tray',x:x+(part-1)*19,y:y+(part%2?15:-7),loose:0})));
 const m={version:2,phase,lid:0,zip:0,particles,pressed:[],camera:0,chairOffset:{x:38,y:-58},lift:0,carryPose:0,history:[]};
 if(!['prepare','open','fill'].includes(phase)){
  particles.slice(0,9).forEach((p,i)=>{p.space='inside';p.x=110+i%3*170;p.y=95+Math.floor(i/3)*145;p.loose=phase==='spread'||phase==='fix'?.35:1;});
 }
 m.lid=['fill','spread','fix'].includes(phase)?1:0;
 if(['carry','place','complete','saved'].includes(phase))m.zip=1;
 if(['place','complete','saved'].includes(phase)){m.camera=m.carryPose=1;m.lift=phase==='place'?45:0;}
 if(['complete','saved'].includes(phase))m.chairOffset={x:0,y:0};
 return m;
}
export function amounts(m){const inside=m.particles.filter(p=>p.space==='inside').length;return{inside:inside/3,tray:(m.particles.length-inside)/3,total:m.particles.length/3};}
export function pointOnZip(t){const x=13,y=12,right=W-13,bottom=H-12,L=(bottom-y)*2+right-x;let d=clamp(t)*L;if(d<=bottom-y)return{x,y:y+d,angle:0};d-=bottom-y;if(d<=right-x)return{x:x+d,y:bottom,angle:-90};return{x:right,y:bottom-(d-(right-x)),angle:180};}
export function zipAtPoint(x,y,current){const top=12,bottom=H-12,left=13,right=W-13,v=bottom-top,h=right-left,L=2*v+h;const candidates=[{x:left,y:clamp(y,top,bottom),t:(clamp(y,top,bottom)-top)/L},{x:clamp(x,left,right),y:bottom,t:(v+clamp(x,left,right)-left)/L},{x:right,y:clamp(y,top,bottom),t:(v+h+bottom-clamp(y,top,bottom))/L}];const best=candidates.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];return Math.hypot(best.x-x,best.y-y)<105&&Math.abs(best.t-current)<.3?best.t:current;}
export function bodyPose(m){const t=m.carryPose||0;return{a:1-.14*t,b:-.10+.055*t,c:.14-.34*t,d:.86-.21*t,x:85+90*t+m.chairOffset.x*t,y:650+65*t+m.chairOffset.y*t-(m.lift||0)};}
export function project(p,x,y){return{x:p.a*x+p.c*y+p.x,y:p.b*x+p.d*y+p.y};}
export function unproject(p,x,y){const det=p.a*p.d-p.b*p.c,dx=x-p.x,dy=y-p.y;return{x:(p.d*dx-p.c*dy)/det,y:(-p.b*dx+p.a*dy)/det};}
export function lidScale(open){const a=clamp(open)*100*Math.PI/180;return Math.cos(a)-.47*Math.sin(a);}
export function lidForEdgeY(y,pose){let lo=0,hi=1;for(let i=0;i<24;i++){const mid=(lo+hi)/2,py=project(pose,W/2,H*lidScale(mid)).y;if(py>y)lo=mid;else hi=mid;}return(lo+hi)/2;}
export const insidePoint=(p)=>p.x>=32&&p.x<=W-32&&p.y>=28&&p.y<=H-28;
export function regions(m){const ps=m.particles.filter(p=>p.space==='inside');return Array.from({length:9},(_,i)=>{const x=110+i%3*170,y=95+Math.floor(i/3)*145;let density=0;for(const p of ps)density+=Math.exp(-((p.x-x)**2+(p.y-y)**2)/(2*(55+p.loose*42)**2));return{x,y,density};});}
export function quality(m){const amount=amounts(m),cells=regions(m),min=Math.min(...cells.map(c=>c.density)),max=Math.max(...cells.map(c=>c.density));return{...amount,min,max,ready:amount.inside>=2.99&&amount.inside<=3.67&&min>.45&&max<2.9,thin:cells.filter(c=>c.density<=.45),hard:cells.filter(c=>c.density>=2.9),over:amount.inside>3.67};}
export function firmness(m,x,y){let density=0;for(const p of m.particles.filter(p=>p.space==='inside'))density+=Math.exp(-((p.x-x)**2+(p.y-y)**2)/(2*(55+p.loose*42)**2));return density>2.9?'hard':density<.45?'thin':'soft';}
export function moveParticles(m,ids,space,positions){ids.forEach((id,i)=>{const p=m.particles.find(p=>p.id===id);if(p){p.space=space;p.x=positions[i].x;p.y=positions[i].y;if(space==='inside')p.loose=clamp(p.loose+(positions[i].loosen||0));}});}
