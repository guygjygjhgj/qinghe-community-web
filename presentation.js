// Scale the completed artboard as a whole, after source geometry is aligned.
// CSS zoom also scales its layout box and browser hit testing together.
export function fitArtboard(width,height,viewportWidth,viewportHeight){
 if(![width,height,viewportWidth,viewportHeight].every(n=>Number.isFinite(n)&&n>0))return 1;
 return Math.min(1,Math.max(1,viewportWidth-16)/width,Math.max(1,viewportHeight-56)/height);
}

export function fixedViewport(viewportWidth,viewportHeight,preferredWidth=390,verticalInset=64){
 return {width:Math.max(1,Math.min(preferredWidth,viewportWidth-16)),height:Math.max(1,Math.min(780,viewportHeight-verticalInset))};
}

export function createPresentation({main,modalRoot,document,window}){
 const showTools=new URL(window.location.href).searchParams.get('demoTools')==='1';
 const toolbar=document.createElement('div');toolbar.className='presentation-toolbar';toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','电脑演示缩放');toolbar.hidden=true;
 toolbar.innerHTML='<button type="button" data-presentation="fixed">固定窗口</button><button type="button" data-presentation="fit">完整页面</button><button type="button" data-presentation="actual">原始尺寸</button><button type="button" data-presentation-step="-30" aria-label="缩小演示窗口">−</button><output aria-label="页面缩放比例"></output><button type="button" data-presentation-step="30" aria-label="放大演示窗口">+</button>';
 document.body.append(toolbar);
 const ready=new WeakSet();
 let mode='fixed';try{const saved=window.sessionStorage.getItem('qinghe-presentation');if(['fixed','fit','actual'].includes(saved))mode=saved;}catch{}
 if(!showTools)mode='fixed';
 let preferredWidth=390;try{const saved=Number(window.sessionStorage.getItem('qinghe-presentation-width'));if(Number.isFinite(saved)&&saved>=270&&saved<=600)preferredWidth=saved;}catch{}
 const desktop=()=>!!(window.matchMedia?.('(hover: hover) and (pointer: fine)').matches||window.matchMedia?.('(min-width: 600px)').matches);
 function update(){
  const roots=[main.querySelector('.native-canvas'),modalRoot.querySelector('.native-canvas')].filter(root=>root&&ready.has(root)),active=desktop()&&roots.length>0;
  toolbar.hidden=!active||!showTools;document.body.classList.toggle('desktop-presentation',active);
  document.body.classList.toggle('screen-only-presentation',active&&!showTools);
  document.body.classList.toggle('fixed-presentation',active&&mode==='fixed');
  const frame=fixedViewport(window.innerWidth,window.innerHeight,preferredWidth,showTools?64:16);
  document.body.style.setProperty('--demo-width',frame.width+'px');document.body.style.setProperty('--demo-height',frame.height+'px');document.body.style.setProperty('--demo-scale',String(frame.width/750));
  let scale=1;
  for(const root of roots){
   const width=parseFloat(root.style.width),height=parseFloat(root.style.height);
   const next=active&&mode==='fixed'?Math.min(1,frame.width/width):active&&mode==='fit'?fitArtboard(width,height,window.innerWidth,window.innerHeight):1;
   root.style.zoom=next===1?'':String(next);
   scale=next;
  }
  toolbar.querySelector('output').textContent=Math.round(scale*100)+'%';
  for(const button of toolbar.querySelectorAll('[data-presentation]'))button.setAttribute('aria-pressed',String(button.dataset.presentation===mode));
  toolbar.querySelector('[data-presentation-step="-30"]').disabled=frame.width<=270;
  toolbar.querySelector('[data-presentation-step="30"]').disabled=frame.width>=Math.min(600,window.innerWidth-16);
 }
 toolbar.addEventListener('click',event=>{
  const button=event.target.closest('[data-presentation],[data-presentation-step]');if(!button||button.disabled)return;
  const root=main.querySelector('.native-canvas'),oldScale=parseFloat(root?.style.zoom)||1;
  const position=(document.body.classList.contains('fixed-presentation')?main.scrollTop:window.scrollY)/oldScale;
  if(button.hasAttribute('data-presentation-step')){preferredWidth=Math.max(270,Math.min(600,fixedViewport(window.innerWidth,window.innerHeight,preferredWidth).width+Number(button.dataset.presentationStep)));mode='fixed';}
  else mode=button.dataset.presentation;
  try{window.sessionStorage.setItem('qinghe-presentation',mode);window.sessionStorage.setItem('qinghe-presentation-width',String(preferredWidth));}catch{}
  update();const nextPosition=position*(parseFloat(root?.style.zoom)||1);
  if(document.body.classList.contains('fixed-presentation')){main.scrollTop=nextPosition;window.scrollTo(0,0);}else{main.scrollTop=0;window.scrollTo(0,nextPosition);}
 });
 return {update,prepare(root){if(root)ready.add(root);update();},ready(root){if(root)ready.add(root);update();}};
}
