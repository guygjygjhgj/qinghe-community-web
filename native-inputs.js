// Editable controls fill the existing Figma input surfaces, not the placeholder's text box.
// Insets are in source-artboard pixels; backgrounds, illustrations and button positions stay fixed.
const slots={
 editor:{body:['3:6506',[19.12,26.57,19.12,26.57]]},
 'seed-editor':{seedName:['3:6853',[24.16,14.61,60,14.61]],body:['3:6868',[24.16,19.72,24.16,19.72]]},
 post:{text:['3:4541',[26.16,17.24,26.16,17.24]]},
 'help-post':{text:['11:1202',[26.55,17.08,26.55,17.08]]},
 'help-resolved':{text:['3:5326',[27.02,12.75,27.02,12.75]]},
 'seed-post':{text:['3:4609',[152.19,69.53,24,6]]},
 chat:{text:['11:1280',[39.35,27.37,116.85,27.37]]},
 'chat-complete':{text:['3:4724',[33.2,18.06,114.57,18.06]]},
 feedback:{body:['39:1687',[33.03,21.53,33.03,21.53]],contact:['39:1706',[31,16,31,16]]},
 'profile-edit':{name:['I3:6014;3:6048',[28.77,24.67,28.77,24.67]]},
 'plant-new':{name:['39:935',[29,10,29,10]],date:['39:957',[29,9.5,29,9.5]]},
 login:{phone:['3:6951',[27.78,18.95,27.78,18.95]],code:['3:6959',[27.78,21.06,27.78,21.06]],name:['3:6970',[28.71,16,28.71,16]]},
 search:{q:['39:990',[94,12,24,12]]},
 'search-empty':{q:['39:1058',[100,12,177,12]]}
};

export function inputRect(frame,insets,lineHeight){
 const [left,top,right,bottom]=insets,available=Math.max(1,frame.height-top-bottom);
 const height=Math.min(Math.max(available,lineHeight+4),Math.max(1,frame.height-8));
 return {x:frame.x+left,y:frame.y+top-(height-available)/2,width:Math.max(1,frame.width-left-right),height};
}

export function fitNativeInputs(root,{force=false}={}){
 if(!root)return;
 const origin=root.getBoundingClientRect();if(!origin.width)return;
 const scale=parseFloat(getComputedStyle(root).zoom)||1,screen=root.dataset.screen;
 const rect=e=>{const b=e.getBoundingClientRect();return {x:(b.x-origin.x)/scale,y:(b.y-origin.y)/scale,width:b.width/scale,height:b.height/scale};};
 for(const field of root.querySelectorAll('textarea.native-input,input.native-input:not([type=hidden]):not([type=file])')){
  if(field.readOnly)continue;
  if(field.id==='speech-text'||field.id==='confirmed-speech'){const continuation=root.querySelector('#'+field.id+'-continuation');if(continuation)continuation.hidden=document.activeElement===field||!!field.value.trim();}
  const helpBody=screen==='help-editor'&&field.name==='body';
  const expanded=helpBody&&(document.activeElement===field||field.dataset.userEdited==='true'||field.value!==(field.dataset.designText||field.defaultValue));
  // Repeated sizing while typing can reset the browser's internal caret scroll.
  if(!force&&field.dataset.nativeInputSized==='true'&&(!helpBody||field.dataset.inputExpanded===String(expanded)))continue;
  const current=rect(field),lineHeight=parseFloat(getComputedStyle(field).lineHeight)||parseFloat(getComputedStyle(field).fontSize)*1.4;
  let target,frame,config=slots[screen]?.[field.name];
  if(config){const surface=root.querySelector('[data-node-id="'+config[0]+'"]');if(surface){frame=rect(surface);target=inputRect(frame,config[1],lineHeight);}}
  if(helpBody){
   const hint=root.querySelector('[data-node-id="11:1404"]');
   target={x:42.097,y:622.166,width:665.8,height:expanded?125:Math.max(42,lineHeight+4)};
   if(hint)hint.style.visibility=expanded?'hidden':'';
   field.dataset.inputExpanded=String(expanded);
  }
  if(!target)target={...current,width:Math.max(1,Math.min(current.width,parseFloat(root.style.width)-current.x-32)),height:Math.max(current.height,lineHeight)};
  // Size first, then compensate any flex alignment movement in the original parent.
  Object.assign(field.style,{width:target.width+'px',height:target.height+'px',minWidth:'0',maxWidth:'none',boxSizing:'border-box',flexShrink:'0'});
  const moved=rect(field),old=field.style.translate.split(/\s+/).map(parseFloat);
  field.style.translate=((old[0]||0)+target.x-moved.x)+'px '+((old[1]||0)+target.y-moved.y)+'px';
  field.dataset.nativeInputSized='true';
  if(field.tagName==='TEXTAREA'){field.wrap='soft';field.style.whiteSpace='pre-wrap';field.style.overflowWrap='anywhere';field.style.overflowX='hidden';field.style.overflowY='auto';}
  if(['phone','code'].includes(field.name))field.inputMode='numeric';
 }
}
