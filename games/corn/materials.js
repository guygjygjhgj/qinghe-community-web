// Small, staggered cells follow the diagonal ear. They are never removed as bands.
const ROWS=27,COLS=21,step=26;
const point=(r,c)=>({x:156+r*12.3+c*step*.848,y:47+r*20.3-c*step*.53});
export const CELLS=Array.from({length:ROWS*COLS},(_,id)=>{
 const r=Math.floor(id/COLS),c=id%COLS-10,p=point(r,c+(r%2)*.32);
 const corners=[[-.57,-.55],[.48,-.62],[.59,.49],[-.5,.59]].map(([a,b])=>point(r+a,c+b+(r%2)*.32));
 // Small overlaps prevent seams between the retained photograph fragments.
 return{id,row:r,segment:Math.min(2,Math.floor(r/9)),x:p.x,y:p.y,visible:Math.abs(c)<3.8*Math.sin(Math.PI*(r+4)/(ROWS+7))+.7,path:corners.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')};
});
export function maskFor(removed){return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='620' height='663'><rect width='620' height='663' fill='white'/>${CELLS.filter(c=>removed.has(c.id)).map(c=>`<polygon points='${c.path}' fill='black' stroke='black' stroke-width='1.4'/>`).join('')}</svg>`)}")`;}
export function completedCells(grains,face){return new Set(CELLS.filter(c=>grains[face*3+c.segment]).map(c=>c.id));}
export function countKernels(state){return state.grains.reduce((sum,grain)=>sum+grain.reduce((n,done,i)=>n+(done?CELLS.filter(c=>c.visible&&c.segment===i%3).length:0),0),0);}
export const HARVEST_SLOTS=[{x:139,y:914,w:185,h:265,rotation:-23},{x:289,y:912,w:185,h:265,rotation:-10},{x:433,y:920,w:185,h:265,rotation:8}];
const random=i=>{let x=Math.imul(i+91,0x45d9f3b);x=Math.imul(x^(x>>>16),0x45d9f3b);return((x^(x>>>16))>>>0)/4294967296;};
export function landing(i){const angle=random(i)*Math.PI*2,rad=Math.min(215,22*Math.sqrt(i+1))*Math.sqrt(random(i+711));return{x:373+Math.cos(angle)*rad,y:910+Math.sin(angle)*rad*.32,angle:random(i+303)*360};}
