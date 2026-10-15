// All motion shares a pauseable clock; material state commits only after contact.
const live=new Set();
let paused=false;
export const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
export function pauseMotion(value){paused=value;for(const a of live)value?a.pause():a.play();}
export async function animate(node,frames,duration=480,easing='cubic-bezier(.22,.7,.25,1)'){
 if(!node?.isConnected)return;
 const a=node.animate(frames,{duration:reduced()?45:duration,easing,fill:'forwards'});
 live.add(a);if(paused)a.pause();
 try{await a.finished;}catch{}finally{live.delete(a);}
 return a;
}
export async function hold(ms){const node=document.createElement('i');node.hidden=true;document.body.append(node);await animate(node,[{opacity:0},{opacity:0}],ms,'linear');node.remove();}
export function restore(node){if(!node?.isConnected)return Promise.resolve();const from=node.style.transform||'none',to=node.dataset.restTransform||'none';return animate(node,[{transform:from},{transform:to}],360).then(a=>{node.style.transform=to==='none'?'':to;a?.cancel();node.classList.remove('dragging');});}
export async function travel(node,to,{duration=850,lift=70,angle=0,scale=1,detach=false}={}){
 if(!node)return;const start=node.style.transform||'translate(0px,0px)',base=node.dataset.restTransform||'';
 const dx=to.x-(parseFloat(node.style.left)+parseFloat(node.style.width)/2),dy=to.y-(parseFloat(node.style.top)+parseFloat(node.style.height)/2);
 node.classList.remove('chosen','hinted','dragging');node.style.zIndex=35;
 if(detach){node.style.transformOrigin='50% 88%';await animate(node,[{transform:start},{transform:`${start} rotate(9deg)`,offset:.55},{transform:`${start} rotate(-3deg)`}],240);node.style.transformOrigin='50% 50%';}
 const current=new DOMMatrix(getComputedStyle(node).transform),sx=current.m41,sy=current.m42,flip=current.a*current.d-current.b*current.c<0?-1:1;
 const final=`translate(${dx}px,${dy}px) rotate(${angle}deg) scale(${scale*flip},${scale})`,midScale=1+(scale-1)*.5;
 await animate(node,[{transform:start,offset:0},{transform:`translate(${sx+(dx-sx)*.55}px,${sy+(dy-sy)*.5-lift}px) rotate(${angle*.5}deg) scale(${midScale*flip},${midScale})`,offset:.52},{transform:`translate(${dx}px,${dy-5}px) rotate(${angle-1}deg) scale(${scale*flip},${scale})`,offset:.9},{transform:final,offset:1}],duration,'cubic-bezier(.3,.08,.3,1)');
 // Keep one animation owner; finished transforms must not override later motion.
 await animate(node,[{transform:final},{transform:`translate(${dx+2}px,${dy+3}px) rotate(${angle+1}deg) scale(${scale*flip},${scale})`,offset:.45},{transform:final}],180);
 node.style.transform=final;node.getAnimations().forEach(a=>a.cancel());
}
export function snapshot(scene){const old=scene.cloneNode(true);old.removeAttribute('id');old.className='outgoing-scene';old.setAttribute('aria-hidden','true');old.inert=true;old.querySelectorAll('button').forEach(b=>b.remove());scene.parentElement.append(old);return old;}
export async function dissolve(scene,old,{caption='',duration=720}={}){
 const waits=[...scene.querySelectorAll('img')].map(i=>i.decode().catch(()=>{}));await Promise.all(waits);
 let cue;if(caption){cue=document.createElement('div');cue.className='transition-cue';cue.textContent=caption;scene.parentElement.append(cue);await animate(cue,[{opacity:0,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],220);await hold(420);}
 const incoming=animate(scene,[{opacity:0},{opacity:1}],duration);
 await animate(old,[{opacity:1},{opacity:0}],duration,'ease-in-out');old.remove();(await incoming)?.cancel();
 if(cue){await animate(cue,[{opacity:1},{opacity:0}],240);cue.remove();}
}
export function kernelPath(from,to,index=0){
 // Ballistic descent, with a small upward release velocity and a damped contact.
 const up=16+(index%3)*7,turn=(index*137.5)%360,spin=45+index%7*13;
 return Array.from({length:17},(_,k)=>{const t=k/16;return{offset:t,transform:`translate(${(to.x-from.x)*t}px,${(to.y-from.y+up)*t*t-up*t}px) rotate(${turn-spin*(1-t)}deg)`};});
}
