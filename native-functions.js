import {mediaSource} from './community-media.js';
import {geometry} from './native-geometry.js';
import {myPlants,searchItems,seedCounts} from './domain.js';
import {completeRuntimeData} from './native-runtime-data.js';
import {completeActivities,syncActivitySelections} from './native-activities.js';
import {completeEditorTypeChips} from './editor-type-chips.js';
const cleanIds=root=>{for(const e of [root,...root.querySelectorAll('[data-node-id]')]){delete e.dataset.nodeId;delete e.dataset.route;delete e.dataset.action;e.removeAttribute('role');e.removeAttribute('tabindex');}};
export function completeNativeFunctions(root,{name,state,vm,url,assets}){
 const leaves=()=>[...root.querySelectorAll('p')].filter(e=>!e.children.length);
 const labels=text=>leaves().filter(e=>e.textContent.trim()===text);
 const bind=(e,props)=>{if(!e)return;delete e.dataset.route;delete e.dataset.action;Object.assign(e.dataset,props);e.role='button';e.tabIndex=0;e.classList.add('native-control');e.setAttribute('aria-label',e.textContent.trim()||e.dataset.name||'打开');};
 const text=(label,props)=>{for(const e of labels(label))bind(e,props);};
 const select=(label,key,options,value,action)=>{const old=labels(label)[0];if(!old)return;for(const duplicate of root.querySelectorAll('input[type=hidden][name="'+key+'"]'))duplicate.remove();const el=document.createElement('select');el.className=old.className+' native-input';el.style.cssText=old.style.cssText;el.dataset.nodeId=old.dataset.nodeId;el.dataset.nativeSelect=action;el.name=key;el.setAttribute('aria-label',label);for(const [v,t]of [['',label],...options]){const o=document.createElement('option');o.value=v;o.textContent=t;el.append(o);}el.value=value||'';for(const option of el.options)if(option.value===el.value)option.setAttribute('selected','');old.replaceWith(el);};
 if(name==='home'){
  for(const e of root.querySelectorAll('[data-route="/article/chrysanthemum"]'))if(!e.closest('[data-node-id="11:1520"]'))bind(e,{route:'/seasonal'});
  const board=root.querySelector('[data-node-id="11:1520"]');if(board){for(const e of board.querySelectorAll('[data-route],[data-action]')){delete e.dataset.action;e.dataset.route='/games/chrysanthemum';}
   const badge=labels('轻松体验')[0];if(badge){select('轻松体验','game',['chrysanthemum','osmanthus','luffa','corn','ginkgo','cotton'].map((g,i)=>[g,['菊花花礼','桂花松糕','丝瓜生活','秋收玉米','银杏留秋','秋棉体验'][i]]),'','games');const menu=board.querySelector('select');if(menu){delete menu.dataset.nativeSelect;menu.dataset.gameSelect='true';}}
   for(const el of board.children)if(!el.contains(board.querySelector('select'))&&el.tagName!=='SELECT')bind(el,{route:'/games/chrysanthemum'});
  }
 }
 if(name==='editor'||name==='help-editor'||name==='seed-editor'){
  const form=root.querySelector('form');if(form){for(const field of form.querySelectorAll('textarea[name=body],input[name=name],input[name=seedName]')){field.readOnly=false;const saved=vm.forms[url.pathname+url.search+'|'+form.dataset.form];if(form.dataset.form==='publish'&&vm.composer?.nativeInitialized){field.value=vm.composer[field.name]??field.value;if(field.tagName==='TEXTAREA')field.textContent=field.value;else field.setAttribute('value',field.value);}else if(saved?.[field.name]){field.value=saved[field.name];if(field.tagName==='TEXTAREA')field.textContent=field.value;}}
   if(form.dataset.form==='publish'){
    select('选择其他','plantId',myPlants(state).map(p=>[p.id,p.name]),vm.composer?.plantId,'plant');
    select('选择话题','topic',['阳台近况','种植小收获','邻里种苗','养护交流'].map(t=>[t,t]),vm.composer?.topic,'topic');
    for(const p of root.querySelectorAll('p'))if(p.textContent==='小葱'&&vm.composer?.plantId)p.textContent=state.plants.find(p=>p.id===vm.composer.plantId)?.name||p.textContent;
   }
  }
  for(const e of root.querySelectorAll('[data-action="choose-plant"],[data-action="choose-topic"]')){e.dataset.action='focus-native-select';e.dataset.select=e.textContent.includes('话题')?'topic':'plantId';}
 }
 if(name==='plant-new')for(const field of root.querySelectorAll('input[name=name],input[name=date]'))field.readOnly=false;
 for(const e of root.querySelectorAll('[data-action="plant-source"],[data-action="plant-location"],[data-action="seed-kind"],[data-action="exchange"],[data-action="help-kind"],[data-action="native-font"]')){const value=e.dataset.value,selected=({ 'plant-source':vm.plantSource||'自己种的','plant-location':vm.plantLocation||'阳台','seed-kind':vm.composer?.seedKind||'种子','exchange':vm.composer?.exchange||'免费赠送','help-kind':vm.composer?.helpKind||'植物救助','native-font':vm.fontChoice||'large'})[e.dataset.action];e.setAttribute('aria-pressed',String(value===selected));}
 if(name==='seed-editor'&&vm.composer?.quantity)labels('3').forEach(p=>{p.textContent=String(vm.composer.quantity);if(p.textContent.length>1)p.dataset.fitNumber='true';});
 if(name==='chat'||name==='chat-complete'){
  const form=root.querySelector('form[data-form=chat]');if(form){form.dataset.enterSubmit='true';const old=form.elements.namedItem('text');if(old?.tagName==='INPUT'){const area=document.createElement('textarea');for(const a of old.attributes)area.setAttribute(a.name,a.value);area.removeAttribute('type');area.value=old.value;area.textContent=area.value;area.setAttribute('aria-label','聊天消息');old.replaceWith(area);}}
  const group=name==='chat'?root.querySelector('[data-node-id="11:1218"]'):root.querySelector('[data-node-id="3:4673"]');
  if(group){
   const own=[...group.children].filter(e=>e.dataset.name?.startsWith('avatar-li')||e.dataset.name?.startsWith('李阿姨聊天气泡')||e.textContent===state.users[state.userId].name);
   const incoming=[...group.children].filter(e=>e.dataset.name?.startsWith('avatar-chen')||e.dataset.name?.startsWith('陈爷爷聊天气泡')||e.textContent==='陈爷爷');
   if(name==='chat-complete'){own.splice(2,0,group.querySelector('[data-node-id="3:4679"]'));incoming.push(group.querySelector('[data-node-id="3:4682"]'));}
   const bubbles=[...group.querySelectorAll('[data-name]')].filter(e=>/气泡/.test(e.dataset.name));
   if(bubbles.length||name==='chat-complete'){
    const pane=document.createElement('div');pane.dataset.scrollRegion='chat';pane.className='native-chat-scroll';pane.tabIndex=0;pane.setAttribute('aria-label','聊天历史，可上下滚动');Object.assign(pane.style,{position:'absolute',inset:'0 auto auto 0',width:'750px',height:'630px',overflowY:'auto',overflowX:'hidden',overscrollBehavior:'contain'});
    const stream=document.createElement('div');stream.className='chat-history';Object.assign(stream.style,{position:'relative',width:'750px',height:'630px'});pane.append(stream);
    const original=name==='chat'?[...group.children].slice(0,9):[...group.children].filter(e=>['3:4677','3:4678','3:4679','3:4680','3:4681','3:4682','3:4683','3:4684','3:4685'].includes(e.dataset.nodeId));for(const el of original){if(state.cloud)el.remove();else stream.append(el);}group.prepend(pane);
    const messages=state.chats.filter(m=>m.conversation===url.pathname.split('/')[2]);
    for(let i=0;i<messages.length;i++){
     const message=messages[i],out=message.author===state.userId,template=out?own:incoming;
     const row=document.createElement('div');row.className='chat-message';row.dataset.messageId=message.id;Object.assign(row.style,{position:'absolute',left:'0',top:((state.cloud?0:630)+i*220)+'px',width:'750px',height:'220px'});
     for(const base of template.filter(Boolean).slice(0,3)){const clone=base.cloneNode(true),isBubble=base.querySelector('p');cleanIds(clone);clone.style.translate='none';clone.style.top=isBubble?'40px':clone.querySelector('img')?'20px':'0';if(state.cloud&&clone.querySelector('img')){const photo=state.users[message.author]?.avatar,[screen,key]=(photo||'').split(':'),src=/^https:\/\//.test(photo||'')?mediaSource(photo):assets[screen]?.[key]?.file;if(src)clone.querySelector('img').src=src;}if(clone.tagName==='P')clone.textContent=state.users[message.author]?.name||'邻居';if(isBubble){const ps=[...clone.querySelectorAll('p')];ps.forEach((p,j)=>{p.textContent=j===0?message.text:'';Object.assign(p.style,{whiteSpace:'pre-wrap',overflowY:'auto',height:j===0?'92px':'0',maxHeight:'92px',width:'calc(100% - 48px)'});});bind(clone,{action:'copy-bubble',text:message.text});}row.append(clone);}stream.append(row);
    }
    stream.style.height=(state.cloud?Math.max(630,messages.length*220):630+messages.length*220)+'px';
   }
  }
 }
 if(name==='following'){
  const owners=['wang','chen'];labels('已关注').forEach((e,i)=>{const owner=owners[i];bind(e,{action:'follow',id:owner});if(!state.following.includes(owner))e.textContent='关注';});
  for(const [label,owner]of [['王阿姨','wang'],['陈爷爷','chen']])text(label,{route:'/chat/neighbor-'+owner});
 }
 if(name==='profile-edit'){
  const parts=leaves().filter(p=>/^喜欢在阳台种点花草，|^和邻居交流种植近况。/.test(p.textContent));
  const intro=state.users[state.userId].intro,originalIntro=parts.map(p=>p.textContent).join('');parts.forEach((p,i)=>{const input=document.createElement('textarea');input.className=p.className+' native-input';input.style.cssText=p.style.cssText;input.dataset.nodeId=p.dataset.nodeId;input.name='intro'+i;input.setAttribute('aria-label','个人介绍第'+(i+1)+'行');input.rows=1;const row=geometry[name].find(m=>m[0]===p.parentElement.dataset.nodeId);Object.assign(input.style,{display:'block',width:'100%',height:(row?.[7]?.value||55.6265983581543)+'px',lineHeight:(row?.[7]?.value||55.6265983581543)+'px'});input.maxLength=i?99:100;input.value=intro.includes('\n')?(intro.split('\n')[i]||''):intro===originalIntro?p.textContent:i?'':intro;input.textContent=input.value;p.replaceWith(input);});
  for(const label of ['花卉','香草','蔬菜'])text(label,{action:'profile-interest',value:label});
 }
 if(name==='records'||name==='record-help'||name==='record-seed'){
  const old=labels('展开全部  ›')[0]||labels('展开全部')[0];if(old){const label=old.textContent.trim();select(label,'kind',[['share','分享'],['help','求助'],['seed','种苗']],url.searchParams.get('kind'),'records');const el=root.querySelector('select[name=kind]');if(el){delete el.dataset.nativeSelect;el.dataset.recordSelect='true';}}
 }
 if(name==='chat'||name==='chat-complete'){
  const a=state.agreements.find(a=>a.id===url.pathname.split('/')[2]);if(a){text('记下种苗来源',{action:'add-seed-plant',id:a.id});if(a.status==='requested'||a.pending)text('双方已确认约定',{action:'reserve',id:a.id});
   if(vm.editAgreementId===a.id){const ps=leaves(),time=ps.find(p=>/10月11日.*15:00/.test(p.textContent)),place=ps.find(p=>p.textContent==='青禾社区花园入口');for(const [p,key,value]of [[time,'agreementTime',a.date+' '+a.time],[place,'agreementLocation',a.location]])if(p){const field=document.createElement('input');field.className=p.className+' native-input';field.dataset.nodeId=p.dataset.nodeId;field.style.cssText=p.style.cssText;field.name=key;field.value=value;field.setAttribute('value',value);field.setAttribute('aria-label',key==='agreementTime'?'约定日期和时间':'约定地点');p.replaceWith(field);}}
  }
 }
 if(name==='help'&&url.searchParams.get('topic')==='privacy'){
  const p=leaves().find(p=>/第一次|验证码|功能|退出/.test(p.textContent)&&p.textContent.length>20);if(p){p.textContent='本设备数据保存在浏览器内；头像、照片、聊天与游戏进度不发送给邻居。';p.style.overflowY='auto';}
 }
 if(name==='chat')for(const e of root.querySelectorAll('[data-name*="聊天气泡"]'))bind(e,{action:'copy-bubble',text:e.textContent});
 if(name==='notifications'){
  const old=labels('22:00 — 07:00')[0];if(old){const input=document.createElement('input');input.className=old.className+' native-input';input.style.cssText=old.style.cssText;input.dataset.nodeId=old.dataset.nodeId;input.dataset.nativeQuiet='true';input.setAttribute('aria-label','安静时段，格式22:00 — 07:00');input.value=state.settings.quietStart+' — '+state.settings.quietEnd;input.setAttribute('value',input.value);old.replaceWith(input);}
  for(const e of root.querySelectorAll('[data-action=notification-switch]')){const on=state.settings.notifications[e.dataset.key];e.setAttribute('aria-pressed',String(on));if(e.dataset.name?.includes('黄色底色'))e.style.backgroundColor=on?'#ffcd37':'#dddddb';if(e.dataset.name?.includes('白色滑块')){e.style.transform=on?'none':'translateX(-54px)';e.dataset.nativeOffsetX=on?'0':'-54';}}
 }
 if(name==='font'){const choice=vm.fontChoice;if(choice){labels(choice==='large'?'大号':choice==='extra'?'特大':'标准').forEach(e=>e.setAttribute('aria-pressed','true'));const preview=labels('阳台上的小葱长高了，').at(-1);if(preview)preview.style.fontSize=({standard:28,large:36,extra:44})[choice]+'px';}}
 if(name==='reader'){text('停止朗读',{action:'back'});text('慢速',{action:'reader-start',rate:'.75'});text('正常',{action:'reader-start',rate:'1'});text('稍快',{action:'reader-start',rate:'1.25'});}
 if(name==='messages'){for(const [label,kind]of [['求助回复','comment'],['分享回复','comment'],['活动提醒','activity']])labels(label).forEach(e=>{const msg=state.messages.find(m=>m.kind===kind&&!m.read);if(msg)bind(e,{action:'notification',id:msg.id});});}
 if(['post','help-post','seed-post','help-resolved'].includes(name)){const id=url.pathname.split('/')[2];for(const e of root.querySelectorAll('[data-action=like]'))e.setAttribute('aria-pressed',String(state.liked.includes(id)));for(const e of root.querySelectorAll('[data-action=favorite]'))e.setAttribute('aria-pressed',String(state.favorites.includes('post:'+id)));}
 if(name==='plants')for(const e of root.querySelectorAll('[data-name^="service-"]')){const route={favorite:'/favorites',draft:'/drafts',font:'/settings/font',voice:'/settings/speech',reminder:'/settings/notifications',feedback:'/feedback',help:'/help'};const key=Object.keys(route).find(k=>e.dataset.name.includes(k));if(key)bind(e,{route:route[key]});}
 if(name==='plant-detail'){for(const e of root.querySelectorAll('[data-name="14／返回、标题与更多"]')){const arrow=e.querySelector('[data-name*="back"]');bind(arrow,{action:'back'});}}
 completeRuntimeData(root,{name,state,vm,url,assets});
 completeActivities(root,{name,state,vm,url});
 completeEditorTypeChips(root,{name,vm,url});
 return root;
}

export function expandNativeHitAreas(root){
 if(!root)return;const controls=[...root.querySelectorAll('[data-action],[data-route]')];
 const candidates=[...root.querySelectorAll('[data-name]')].filter(e=>!e.dataset.action&&!e.dataset.route&&/按钮底|按钮背景|button-background|button-bg|保存资料|报名按钮/.test(e.dataset.name||''));
 const bounds=new Map(),rect=e=>{if(!bounds.has(e))bounds.set(e,e.getBoundingClientRect());return bounds.get(e);};
 for(const label of controls){if(label.querySelector('img')||!label.textContent.trim())continue;const b=label.getBoundingClientRect();if(!b.width)continue;
  const box=candidates.find(e=>{if(e===label||e.contains(label)||e.dataset.action||e.dataset.route)return false;const r=rect(e);return r.x<=b.x&&r.y<=b.y&&r.right>=b.right&&r.bottom>=b.bottom;});
  if(box){for(const [k,v]of Object.entries(label.dataset))if(!['nodeId','name'].includes(k))box.dataset[k]=v;box.role='button';box.tabIndex=0;box.setAttribute('aria-label',label.textContent.trim());box.classList.add('native-control');}
 }
}
export function syncNativeSelections(root){
 if(!root)return;
 syncActivitySelections(root);
 if(root.dataset.screen==='plant-new'){
  for(const action of ['plant-location','plant-source']){
   const boxes=[...root.querySelectorAll('[data-action="'+action+'"]')].filter(e=>e.dataset.name?.endsWith('选项背景'));if(boxes.length<2||!boxes[0].getBoundingClientRect().width)continue;
   const first=boxes[0],selected=boxes.find(e=>e.getAttribute('aria-pressed')==='true')||first;if(selected===first)continue;const a=getComputedStyle(first),b=getComputedStyle(boxes[1]),colors=[a.backgroundColor,a.borderColor,b.backgroundColor,b.borderColor],base=first.getBoundingClientRect();
   boxes.forEach(e=>{e.style.backgroundColor=e===selected?colors[0]:colors[2];e.style.borderColor=e===selected?colors[1]:colors[3];});
   if(selected!==first){const target=selected.getBoundingClientRect();for(const mark of root.querySelectorAll('[data-name="选择圆形背景"],[data-name="选择勾"]')){const r=mark.getBoundingClientRect();if(r.left<base.left-20||r.left>base.right+20||r.top<base.top-25||r.top>base.bottom+10)continue;const old=mark.style.translate.split(' ').map(parseFloat);mark.style.translate=((old[0]||0)+target.left-base.left)+'px '+((old[1]||0)+target.top-base.top)+'px';mark.dataset.action=action;mark.dataset.value=selected.dataset.value;}}
  }
 }
 if(root.dataset.screen==='seed-editor'){
  const have=root.querySelector('#node-3_6835'),wanted=root.querySelector('#node-3_6841');if(have&&wanted?.getAttribute('aria-pressed')==='true'&&have.getBoundingClientRect().width){const a=have.getBoundingClientRect(),b=wanted.getBoundingClientRect();have.style.backgroundColor='#fdfdfd';have.style.borderColor='#d7d4e8';wanted.style.backgroundColor='#fff8e8';wanted.style.borderColor='#ff9300';for(const id of ['3:6838','3:6839','3:6816']){const mark=root.querySelector('[data-node-id="'+id+'"]');if(!mark)continue;const old=mark.style.translate.split(' ').map(parseFloat);mark.style.translate=((old[0]||0)+b.left-a.left)+'px '+((old[1]||0)+b.top-a.top)+'px';}}
  const template=root.querySelector('[data-name="seed-radio-dot"]');if(template)for(const action of ['seed-kind','exchange'])for(const e of root.querySelectorAll('[data-action="'+action+'"]')){
   const group=e.closest('[data-name^="16／"]')||e.parentElement,circle=group?.querySelector('[data-name="单选按钮槽"]>div');if(!circle)continue;const selected=e.getAttribute('aria-pressed')==='true';let dot=circle.querySelector('[data-name="seed-radio-dot"]');if(selected&&!dot){dot=template.cloneNode(true);for(const n of [dot,...dot.querySelectorAll('[data-node-id]')])n.removeAttribute('data-node-id');circle.append(dot);}if(dot)dot.style.visibility=selected?'visible':'hidden';
  }
 }
 if(root.dataset.screen==='profile-edit'&&root.querySelector('[data-choice-selected]')){
  const chips=['3:6082','3:6084','3:6086'].map(id=>root.querySelector('[data-node-id="'+id+'"]')),template=chips[0]?.querySelector('[data-name="青禾／第19张／PNG图标/icon-check"]');
  for(const chip of chips){if(!chip?.hasAttribute('data-choice-selected'))continue;const on=chip.dataset.choiceSelected==='true';chip.style.borderColor=on?'#ffc900':'#e4e3e2';chip.style.backgroundImage=on?'linear-gradient(#fff6bf,#fff0a1)':'linear-gradient(#fafafa,#f8f8f8)';const check=chip.querySelector('[data-name="青禾／第19张／PNG图标/icon-check"]');if(check)check.style.visibility=on?'visible':'hidden';
   const empty=chip.querySelector('[data-name=herb-unchecked]');if(empty&&on&&template&&empty.getBoundingClientRect().width){empty.style.visibility='hidden';const copy=template.cloneNode(true);for(const e of [copy,...copy.querySelectorAll('[data-node-id]')])e.removeAttribute('data-node-id');Object.assign(copy.style,{left:'159.204px',top:'-12.465px',visibility:'visible'});chip.append(copy);}
  }
 }
}
