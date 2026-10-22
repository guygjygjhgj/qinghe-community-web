// JSX is compiled to DOM nodes. The generated Figma stylesheet retains every layer's geometry.
export const Fragment=({children})=>children;
export function h(tag,props,...children){
  props=props||{};if(typeof tag==='function')return tag({...props,children});
  const el=document.createElement(tag);
  // Detached Figma templates should not download pictures that are removed or
  // hidden before the finished page is mounted. Visible slots are promoted later.
  if(tag==='img'){el.loading='lazy';el.decoding='async';}
  for(const [key,value] of Object.entries(props)){
    if(value==null)continue;
    if(key==='className'){el.className=value;if(value.includes('via-[')&&!value.includes('via-[84%]'))el.style.backgroundImage='linear-gradient(to bottom,var(--native-from),var(--native-via) var(--native-via-position,50%),var(--native-to))';}
    else if(key==='style')Object.assign(el.style,value);
    else if(key!=='children')el.setAttribute(key,value);
  }
  const append=v=>{if(v==null||typeof v==='boolean')return;if(Array.isArray(v))v.forEach(append);else el.append(v instanceof Node?v:document.createTextNode(String(v)));};children.forEach(append);return el;
}
