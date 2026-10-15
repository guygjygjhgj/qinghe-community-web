import {renderCushion,setSeamProgress,attachZippers} from './original-materials.js';
let clipSerial=0;
export function wrapClips(el,clips){let wrap=el;for(const paths of clips||[]){const id='cotton-clip-'+(++clipSerial),outer=document.createElement('div'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),defs=document.createElementNS(svg.namespaceURI,'defs'),cp=document.createElementNS(svg.namespaceURI,'clipPath');outer.style.cssText='position:absolute;inset:0;pointer-events:none;clip-path:url(#'+id+')';svg.setAttribute('width','0');svg.setAttribute('height','0');svg.style.position='absolute';cp.id=id;cp.setAttribute('clipPathUnits','userSpaceOnUse');for(const x of paths){for(const data of x.paths||[{data:`M0 0 H${x.rect[0]} V${x.rect[1]} H0 Z`}]){const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',data.data);path.setAttribute('transform','matrix('+x.m.join(' ')+')');cp.append(path);}}defs.append(cp);svg.append(defs);outer.append(svg,wrap);wrap=outer;}return wrap;}
export const maskPath='M95 697 C160 620 252 581 343 574 C440 575 542 591 625 605 L674 917 C516 919 328 951 130 995 Z';
export function nodeStyle(n){return {width:n.w+'px',height:n.h+'px',transform:`matrix(${n.m.join(',')})`,opacity:n.opacity??1,borderRadius:(n.r||0)+'px',background:n.asset||n.text?'transparent':n.color||undefined,color:n.color||'#183c29',fontFamily:'CottonSerif, "Noto Serif SC", SimSun, serif',fontSize:(n.size||30)+'px',fontWeight:n.font?.style==='Bold'?700:400,letterSpacing:(n.spacing?.unit==='PIXELS'?n.spacing.value:0)+'px',lineHeight:n.line?.unit==='PIXELS'?n.line.value+'px':'1.2',textAlign:(n.align||'left').toLowerCase()};}
// Figma CROP maps destination UV to source UV. Invert that mapping inside
// the node's clipping box; never squeeze the complete reference into it.
export function cropMatrix(n){const [[a,c,tx],[b,d,ty]]=n.imageTransform,det=a*d-b*c;if(Math.abs(det)<1e-9)return null;return [d/det,-b/det*n.h/n.w,-c/det*n.w/n.h,a/det,(-d*tx+c*ty)/det*n.w,(b*tx-a*ty)/det*n.h];}
export function makeLayer(n){const crop=n.asset&&n.mode==='CROP'&&n.imageTransform;const el=document.createElement(n.asset&&!crop&&!n.cushionSeam?'img':'div');el.className='layer';el.dataset.name=n.name;Object.assign(el.style,nodeStyle(n));if(n.cushionSeam){renderCushion(el,n);}else if(n.asset){const img=crop?document.createElement('img'):el;img.src=n.asset;img.alt='';img.draggable=false;if(crop){el.style.overflow='hidden';Object.assign(img.style,{width:'100%',height:'100%',display:'block',maxWidth:'none',transformOrigin:'0 0',transform:'matrix('+cropMatrix(n).join(',')+')'});el.append(img);}else{el.style.objectFit=n.mode==='FIT'?'contain':'cover';}}else if(n.text){el.style.background='none';el.textContent=n.text;}else if(n.paths?.length){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('width',n.w);svg.setAttribute('height',n.h);svg.setAttribute('viewBox',`0 0 ${n.w} ${n.h}`);for(const p of n.paths){const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',p.data);path.setAttribute('fill',n.color||'none');if(n.stroke){path.setAttribute('stroke',n.stroke);path.setAttribute('stroke-width',n.strokeWidth||1);}svg.append(path);}el.append(svg);el.style.background='none';}if(n.type==='ELLIPSE')el.style.borderRadius='50%';let wrap=el;if(n.mask){wrap=document.createElement('div');wrap.className='clip';wrap.append(el);}wrap=wrapClips(wrap,n.clips);return {el,wrap,n};}
export const sceneCache=new Map();
export async function prepareScene(s){await Promise.all(s.nodes.filter(n=>n.asset).map(n=>{if(!sceneCache.has(n.asset)){const img=new Image();img.src=n.asset;sceneCache.set(n.asset,img.decode().catch(e=>{sceneCache.delete(n.asset);throw e;}));}return sceneCache.get(n.asset);}));}
export function keyNodes(s){let counts={};return s.nodes.map(n=>{let k=n.asset?'img:'+n.asset+':'+(n.mask?'clip':'free')+':'+JSON.stringify([n.clips||[],n.mode,n.mode==='CROP'?n.imageTransform:null]):n.text?'text:'+n.m[5].toFixed(0):n.name;return {...n,key:k+'#'+(counts[k]=(counts[k]||0)+1)};});}
export function renderScene(host,s){host.replaceChildren();const result=[];for(const n of keyNodes(s)){const l=makeLayer(n);host.append(l.wrap);result.push(l);}attachZippers(result);return result;}
export async function morphScene(host,previous,s,duration=600){
  const next=[], used=new Set(), animations=[];
  const nodes=keyNodes(s);
  const pairs=nodes.map(n=>{const l=previous.find(x=>!used.has(x)&&x.n.key===n.key);if(l)used.add(l);return {n,l};});
  // Remove outgoing props before mounting the destination. In particular,
  // a table bowl must never fade over the chair scene.
  for(const l of previous){l.el.getAnimations().forEach(a=>a.cancel());if(!used.has(l))l.wrap.remove();}
  for(let {n,l} of pairs){
    if(l){const old=nodeStyle(l.n), now=nodeStyle(n);l.n=n;Object.assign(l.el.style,now);if(n.text)l.el.textContent=n.text;if(n.cushionSeam)setSeamProgress(l.el,n.cushionSeam.progress);
      animations.push(l.el.animate([{transform:old.transform,width:old.width,height:old.height,opacity:old.opacity},{transform:now.transform,width:now.width,height:now.height,opacity:now.opacity}],{duration,easing:'cubic-bezier(.25,.1,.25,1)'}));
    }else{l=makeLayer(n);if(!(n.asset&&n.w>=740&&n.h>=1400))animations.push(l.el.animate([{opacity:0},{opacity:n.opacity??1}],{duration,easing:'ease-out'}));}
    host.append(l.wrap);next.push(l);
  }
  const finished=animations.map(a=>a.finished.catch(()=>{}));
  attachZippers(next);
  await Promise.all(finished);
  return next;
}
