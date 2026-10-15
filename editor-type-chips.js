import {screens} from './native-screens.js';

// All publishing types share the existing help editor's pill artwork and typography.
// Keep the enclosing row in its original page position, and leave raw design canvases intact.
export function completeEditorTypeChips(root,{name,vm,url}){
 if(url.pathname!=='/publish'||!['editor','help-editor','seed-editor'].includes(name))return;
 const reference=screens['help-editor'](),selected=vm.composer?.type||({editor:'share','help-editor':'help','seed-editor':'seed'})[name];
 const active=reference.querySelector('[data-node-id="11:1387"]'),inactive=reference.querySelector('[data-node-id="11:1385"]');
 const types=[['share','分享','3:6471','11:1386','3:6827',220.361],['help','求助','3:6474','11:1388','3:6830',215.528],['seed','种苗','3:6477','11:1390','3:6833',220.361]];
 for(const [type,label,shareId,helpId,seedId,width]of types){
  const id=name==='editor'?shareId:name==='help-editor'?helpId:seedId,p=root.querySelector('[data-node-id="'+id+'"]');if(!p)continue;
  const box=name==='help-editor'?p.parentElement:p.parentElement.parentElement,isSelected=type===selected;
  if(name!=='help-editor'){
   box.parentElement.style.columnGap='0px';
   for(const spacer of box.parentElement.children)if(!spacer.textContent.trim()&&!spacer.querySelector('img'))Object.assign(spacer.style,{width:'10.639px',flexShrink:'0'});
  }
  box.dataset.editorTypeChip=type;box.dataset.action='editor-type';box.dataset.type=type;delete box.dataset.route;
  box.setAttribute('role','button');box.setAttribute('aria-label',label);box.setAttribute('aria-pressed',String(isSelected));box.tabIndex=0;
  box.classList.add('native-control');
  Object.assign(box.style,{width:width+'px',height:'59.923px',flexShrink:'0',border:'0',background:'transparent',backgroundImage:'none',borderRadius:'29.962px',overflow:'visible'});
  const art=(isSelected?active:inactive).firstElementChild.cloneNode(true);art.dataset.nodeId='editor-chip:'+type;art.dataset.name='求助页分类气泡原图／'+type;art.style.pointerEvents='none';
  for(const e of art.querySelectorAll('[data-node-id]'))e.removeAttribute('data-node-id');
  p.removeAttribute('data-action');p.removeAttribute('data-route');p.removeAttribute('role');p.removeAttribute('tabindex');p.removeAttribute('aria-pressed');
  p.className='';p.removeAttribute('style');
  Object.assign(p.style,{position:'absolute',inset:'0',width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'"Noto Sans SC",sans-serif',fontSize:(isSelected?29.848:30.953)+'px',fontWeight:isSelected?'700':'400',lineHeight:'normal',letterSpacing:(isSelected?0.9664:-0.1433)+'px',color:isSelected?'#450000':'#000023',whiteSpace:'nowrap',pointerEvents:'none'});
  box.replaceChildren(art,p);
 }
}
