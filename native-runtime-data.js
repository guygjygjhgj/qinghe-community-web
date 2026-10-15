import {myPlants,myDrafts,searchItems,seedCounts,unread} from './domain.js';

// Runtime values occupy the existing Figma slots; source art and geometry stay intact.
export function completeRuntimeData(root,{name,state,vm,url,assets}){
 const id=url.pathname.split('/')[2],post=state.posts.find(p=>p.id===id);
 const at=id=>root.querySelector('[data-node-id="'+id+'"]');
 const named=pattern=>[...root.querySelectorAll('[data-name]')].filter(e=>pattern.test(e.dataset.name));
 const leaves=()=>[...root.querySelectorAll('p')].filter(e=>!e.children.length);
 const put=(e,value)=>{if(e){e.textContent=value??'';e.style.overflowY='auto';e.style.whiteSpace='pre-wrap';if(e.getAttribute('role')==='button')e.setAttribute('aria-label',e.textContent);if(typeof value==='number'&&String(value).length>1)e.dataset.fitNumber='true';}};
 const bind=(e,props)=>{if(!e)return;delete e.dataset.action;delete e.dataset.route;Object.assign(e.dataset,props);e.role='button';e.tabIndex=0;e.classList.add('native-control');e.setAttribute('aria-label',e.textContent.trim()||e.dataset.name||'打开');};
 const text=(label,props)=>leaves().filter(e=>e.textContent.trim()===label).forEach(e=>bind(e,props));
 const field=(old,key,label)=>{if(!old)return;const f=document.createElement('textarea');f.className=old.className+' native-input';f.style.cssText=old.style.cssText;f.dataset.nodeId=old.dataset.nodeId;f.name=key;f.placeholder=old.textContent;f.setAttribute('aria-label',label);f.maxLength=500;old.replaceWith(f);return f;};
 const form=(kind)=>{let f=root.querySelector('form');if(!f){f=document.createElement('form');f.className='native-form';while(root.firstChild)f.append(root.firstChild);root.append(f);}f.dataset.form=kind;f.dataset.id=id;return f;};
 const picker=(old,choices,props,label)=>{if(!old)return;const select=document.createElement('select');select.className=old.className+' native-input';select.style.cssText=old.style.cssText;select.dataset.nodeId=old.dataset.nodeId;Object.assign(select.dataset,props);select.setAttribute('aria-label',label);for(const [value,content]of [['',old.textContent.trim()],...choices]){const option=document.createElement('option');option.value=value;option.textContent=content;select.append(option);}old.replaceWith(select);return select;};
 for(const e of named(/图标／返回白色|返回.*图标|返回箭头|^back-icon(?:[／/]|$)/)){bind(e,{action:'back'});e.setAttribute('aria-label','返回');}
 if(name==='home')for(const [pattern,route]of [[/hero-cta-arrow/,'/community'],[/reply-badge/,'/messages'],[/activity1-arrow/,'/activity/herbs'],[/activity2-arrow/,'/activity/repot']])for(const e of named(pattern))bind(e,{route});
 // Every navigation icon uses the same destination as its associated source label.
 for(const e of named(/^(nav-home|nav-plants|nav-leaf-white|nav-circle|nav-message|nav-mine|nav-publish|nav-mic-white|nav-mic)(／|$)|^底栏点击区[／/]message$/)){
  const n=e.dataset.name;bind(e,{route:/home/.test(n)?'/':/plants|leaf|circle/.test(n)?'/community':/message/.test(n)?'/messages':/mine/.test(n)?'/me':'/publish'});
 }
 for(const e of named(/icon-search|search-icon/))bind(e,{route:'/search'});
 if(['circle','circle-info','circle-near','following'].includes(name)){
  for(const e of named(/publish-(card|button|arrow)|^入口／发到植物圈/))bind(e,{route:'/publish'});
  for(const e of named(/follow-(card|entry-button|arrow|bubbles)|^入口／只看关注/))bind(e,{route:'/following'});
  for(const e of named(/topic-arrow/))bind(e,{route:'/publish?topic=阳台近况'});
  text('推荐',{route:'/community'});text('交流',{route:'/community'});
  text('一起晒晒身边的绿色角落',{route:'/publish?topic=阳台近况'});
  const owner=name==='circle-near'?'chen':'wang',pid=name==='circle-near'?'lettuce':'mint';
  for(const e of named(/icon-follow-plus|post-follow|follow-plus/))bind(e,{action:'follow',id:owner});
  text('关注',{action:'follow',id:owner});if(state.followTouched?.[owner])for(const e of leaves())if(e.textContent==='关注')put(e,state.following.includes(owner)?'已关注':'关注');
  for(const e of named(/icon-heart|post-heart/))bind(e,{action:'like',id:pid});
  for(const e of named(/icon-comment|post-comment/))bind(e,{route:'/post/'+pid+'?comments=1'});
  for(const e of named(/^author-avatar／/))bind(e,{route:'/chat/neighbor-'+owner});
  for(const e of named(/^(post-photo|lettuce-(trays|close|handoff|neighbors)|tomato-photo)/))bind(e,{route:'/post/'+pid});
  text('王阿姨',{route:'/chat/neighbor-wang'});text('陈爷爷',{route:'/chat/neighbor-chen'});
  if(name==='circle-info'){for(const e of named(/tomato|article-1-button|article.*(photo|card)|资讯.*(照片|卡片)/))bind(e,{route:'/article/tomato-story'});for(const e of named(/^article-1$|article-1-button|article-pothos/))bind(e,{route:'/article/pothos-guide'});for(const e of named(/^article-2$|article-2-button|article-garden/))bind(e,{route:'/article/pocket-garden'});text('阅读科普',{route:'/article/pothos-guide'});text('查看新闻',{route:'/article/pocket-garden'});}
 }
 if(name==='plants'){
  const plants=myPlants(state),selected=plants.find(p=>p.id===vm.activePlantId)||plants[0],pid=selected?.id||'reference-mint';
  for(const e of named(/^plant-photo／|^plant-heading／|^plant-tagline／/)){bind(e,{route:'/plant/'+pid});e.setAttribute('aria-label',selected?.name||'薄荷盆栽');}
  for(const e of named(/^side-card-left／|^side-card-right／/))bind(e,{action:'native-plant-step',delta:e.dataset.name.includes('left')?'-1':'1'});
  const month=vm.calendarMonth||'2026-09';
  for(const e of named(/^day\d／/)){const day=[...e.querySelectorAll('p')].find(p=>/^\d+$/.test(p.textContent))?.textContent||'12';bind(e,{route:'/plant/'+pid+'?date='+month+'-'+day.padStart(2,'0')});if(vm.calendarMonth){const weekday=[...e.querySelectorAll('p')].find(p=>/^周/.test(p.textContent));put(weekday,'周'+['日','一','二','三','四','五','六'][new Date(month+'-'+day.padStart(2,'0')+'T12:00:00').getDay()]);}}
  for(const e of named(/^edit-profile(／|-bg)/))bind(e,{route:'/profile/edit'});
  for(const e of named(/^服务入口／/)){const key=e.dataset.name.split('／')[1],routes={favorite:'/favorites',draft:'/drafts',font:'/settings/font',voice:'/settings/speech',reminder:'/settings/notifications',privacy:'/help?topic=privacy',feedback:'/feedback',help:'/help'};if(routes[key])bind(e,{route:routes[key]});}
  // Plant names embedded in source art are preserved; this existing location slot chooses actual records.
  if(plants.length>1){const select=picker(at('11:1994'),plants.map(p=>[p.id,p.name]),{plantPicker:'true'},'选择我的植物');if(select&&vm.activePlantId)for(const option of select.options)if(option.value===vm.activePlantId)option.setAttribute('selected','');}
  const monthSelect=picker(at('11:1983'),Array.from({length:12},(_,i)=>['2026-'+String(i+1).padStart(2,'0'),(i+1)+'月']),{monthPicker:'true'},'选择记录月份');if(monthSelect&&vm.calendarMonth)for(const option of monthSelect.options)if(option.value===vm.calendarMonth)option.setAttribute('selected','');
 }
 if(name==='plant-detail'){
  const plant=state.plants.find(p=>p.id===id),date=url.searchParams.get('date');
  if(plant){
   text('记录近况',{route:'/plant/'+id+'/record'+(date?'?date='+date:'')});
   const records=(plant.records||[]).filter(r=>!date||r.date===date);
   for(let i=0;i<2;i++)for(const key of ['date','title','body']){const container=named(new RegExp('^event'+(i+1)+'-'+key+'／'))[0],e=container?.querySelector('p');if(e&&(records.length||plant.records.length)){put(e,records[i]?.[key]||'');container.style.overflowY='auto';}}
   if(records.length>2){const old=named(/^event1-title／/)[0]?.querySelector('p');picker(old,records.map(r=>[r.id,r.title||r.date]),{recordPicker:'true'},'翻看成长记录');}
   put(at('3:6597'),plant.name);put(at('3:6639'),plant.location);put(at('3:6632'),plant.source);
   put(at('3:6592'),Number(plant.date.slice(5,7))+'月'+Number(plant.date.slice(8))+'日种下');
   if(!records.length){put(at('3:6673'),'');put(at('3:6676'),'还没有保存近况');put(at('3:6684'),'');put(at('3:6687'),'');for(const e of named(/^event[12]-body／/))put(e.querySelector('p'),'');}
   for(const [i,pattern]of [[0,/^photo-mint-planting／/],[1,/^photo-mint-leaf／/]])if(!records[i])for(const e of named(pattern))e.style.visibility='hidden';
  }
  for(const [pattern,target]of [[/icon-record/,'/plant/'+id+'/record'],[/icon-share/,'/publish?plant='+id],[/icon-help/,'/publish?type=help&plant='+id]])for(const e of named(pattern))bind(e,{route:target});
  const more=at('3:6599');if(more){const choices=[['/plant/'+id+'/record','记录近况'],['/publish?plant='+id,'分享给邻居'],['/publish?type=help&plant='+id,'请邻居帮忙']];const select=document.createElement('select');select.dataset.routePicker='true';select.setAttribute('aria-label','植物更多操作');Object.assign(select.style,{position:'absolute',inset:'0',width:'100%',height:'100%',opacity:'0',cursor:'pointer'});for(const [value,label]of [['','植物更多操作'],...choices]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}more.append(select);}
 }
 if(name==='plant-success'){const plant=state.plants.find(p=>p.id===id);if(plant){put(at('39:734'),plant.name+'已加入我的植物');put(at('39:739'),plant.name);put(at('39:741'),plant.location+' · '+plant.source);put(at('39:743'),Number(plant.date.slice(5,7))+'月'+Number(plant.date.slice(8))+'日种下');}}
 if(['editor','help-editor','seed-editor'].includes(name)){
  const publishForm=root.querySelector('form');
  if(publishForm&&!publishForm.elements.namedItem('body')){const old=leaves().find(p=>/自家留的生菜种子/.test(p.textContent));if(old){const input=field(old,'body','正文');input.maxLength=200;input.value=vm.composer?.body||old.textContent;input.textContent=input.value;input.required=true;}}
  if(name==='seed-editor'){for(const e of named(/quantity-minus/))bind(e,{action:'quantity',delta:'-1'});for(const e of named(/quantity-plus/))bind(e,{action:'quantity',delta:'1'});for(const e of named(/seed-name-remove/))bind(e,{action:'clear-seed-name'});text('我有种苗',{action:'seed-mode',value:'offer'});text('我想找种苗',{action:'seed-mode',value:'wanted'});const mode=vm.composer?.seedMode||'offer';for(const [key,value]of [['node-3_6835','offer'],['node-3_6841','wanted']]){const box=root.querySelector('[id="'+key+'"]');bind(box,{action:'seed-mode',value});if(box)box.setAttribute('aria-pressed',String(mode===value));}}
  if(name==='help-editor')for(const value of ['植物救助','借用工具','种植指导']){text(value,{action:'help-kind',value});for(const e of named(new RegExp('help-'+({'植物救助':'rescue','借用工具':'tools','种植指导':'guide'})[value]+'-surface')))bind(e,{action:'help-kind',value});}
  for(const e of named(/voice-microphone|icon-microphone/))bind(e,{action:'voice',target:'publish'});
  for(const e of named(/draft-icon|icon-save/))bind(e,{action:'save-draft'});
  for(const e of named(/preview-icon|icon-preview/))bind(e,{action:'preview'});
  for(const e of named(/publish-surface/))bind(e,{action:'submit-native',form:'publish'});
  for(const e of named(/plant-remove/))bind(e,{action:'unlink-plant'});
  for(const e of named(/icon-chevron/))bind(e,{action:'focus-native-select',select:'plantId'});
  if(name==='editor')for(const e of named(/icon-plus/))bind(e,{action:'focus-native-select',select:'topic'});
  if(name==='editor'){
   const photos=named(/^photo-scallions／|^photo-harvest／/);
   const offset=vm.sharePhotoOffset||0;
   if(publishForm?.dataset.form==='publish'){photos.forEach((e,i)=>{const photo=vm.composer?.photos?.[offset+i],img=e.querySelector('img');if(!photo)e.style.visibility='hidden';else if(img){const [screen,key]=photo.split(':');const src=photo.startsWith('data:image/')?photo:assets[screen]?.[key]?.file;if(src)img.src=src;}bind(e,{action:'upload-native',target:'post',index:String(offset+i)});});
    const counter=at('3:6419');if(counter&&vm.composer?.photos?.length!==2)put(counter,(vm.composer?.photos?.length||0)+' / 9');if(counter&&vm.composer?.photos?.length>2)picker(counter,vm.composer.photos.map((p,i)=>[String(i),'第'+(i+1)+'张照片']),{photoPicker:'true'},'翻看分享图片');
   }
   const removers=named(/^photo-remove1／/);removers.slice(0,2).forEach((e,i)=>bind(e,{action:'remove-photo',target:'post',index:String(offset+i)}));
   const topic=at('3:6518');if(topic&&vm.composer?.topic)put(topic,'# '+vm.composer.topic);
   const topicRemove=at('3:6518')?.parentElement?.querySelector('[data-name="photo-remove1／独立PNG"]')||removers[2];if(topicRemove)bind(topicRemove,{action:'unlink-topic'});if(vm.composer?.topicRemoved){if(topic)topic.hidden=true;if(topicRemove)topicRemove.hidden=true;}if(vm.composer?.plantRemoved){const item=at('3:6508');if(item)item.hidden=true;}
  }
  if(url.pathname.includes('/record')){const f=root.querySelector('form');if(f){const date=f.elements.namedItem('date'),draft=state.recordDrafts?.[id];if(date&&url.searchParams.has('date'))date.value=url.searchParams.get('date');if(draft?.body){f.elements.namedItem('body').value=draft.body;f.elements.namedItem('body').textContent=draft.body;}for(const e of root.querySelectorAll('[data-action=voice]'))e.dataset.target='record';
   for(const e of root.querySelectorAll('[data-action=remove-photo],[data-action=unlink-plant],[data-action=focus-native-select]'))bind(e,{action:'fixed-art'});
   text('存草稿',{action:'save-record-draft'});text('预览',{action:'record-preview'});for(const e of named(/icon-save/))bind(e,{action:'save-record-draft'});for(const e of named(/icon-preview/))bind(e,{action:'record-preview'});
   put(at('3:6395'),'记录近况');put(at('3:6505'),'保存近况');
  }}
 }
 if(['post','help-post','seed-post','help-resolved'].includes(name)&&post){
  const commentForm=root.querySelector('form[data-form=comment]'),entry=commentForm?.elements.namedItem('text');
  if(entry?.tagName==='INPUT'){
   const area=document.createElement('textarea');for(const attribute of entry.attributes)area.setAttribute(attribute.name,attribute.value);area.removeAttribute('type');area.value=entry.value;area.textContent=area.value;entry.replaceWith(area);commentForm.dataset.enterSubmit='true';
  }
  if(name==='post'&&post.photos?.length){const offset=vm.postPhotoOffsets?.[id]||0,slots=named(/^照片／小葱正文|^照片／手拿小葱/);slots.forEach((e,i)=>{const photo=post.photos[(offset+i)%post.photos.length],img=e.querySelector('img');if(img&&(offset||id!=='scallion'||photo.startsWith('data:image/'))){const [screen,key]=photo.split(':');const src=photo.startsWith('data:image/')?photo:assets[screen]?.[key]?.file;if(src)img.src=src;}bind(e,{action:'photo-next',id});e.setAttribute('aria-label','切换分享照片，第'+((offset+i)%post.photos.length+1)+'张，共'+post.photos.length+'张');});}
  if(!root.querySelector('form[data-form=comment]')&&['help-post','seed-post','help-resolved'].includes(name)){
   const f=form('comment');field(name==='seed-post'?at('3:4612'):name==='help-resolved'?at('I3:5326;3:5362'):at('11:1203'),'text','留言内容');f.dataset.enterSubmit='true';text('发送',{action:'submit-native',form:'comment'});
  }
  if(name==='help-post')text('交流中',{action:'resolve',id});if(name==='help-resolved')text('已解决',{action:'resolve',id});
  text('去留言',{action:'focus-comment'});text('继续交流',{action:'focus-comment'});
  text('继续观察',{action:'focus-comment'});
  for(const e of named(/小葱长高了分享卡片/))bind(e,{action:'read',kind:'post',id});
  for(const e of named(/icon-bulb/))bind(e,{action:'read-inline',text:'种植小提示：发芽前保持土壤湿润。'});
  for(const e of named(/icon-chat|icon-comment|arrow-down-orange/))bind(e,{action:'focus-comment'});
  for(const e of named(/icon-sprout/))bind(e,{action:'request-seed',id:post.id});
  for(const e of named(/icon-heart|灰色实心心形/))bind(e,{action:'like',id:post.id});
  for(const e of named(/icon-menu/))bind(e,post.author===state.userId?{route:'/publish?post='+post.id}:{action:'favorite',key:'post:'+post.id});
  for(const e of named(/avatar-wang|头像／王阿姨/))bind(e,{route:'/chat/neighbor-wang'});
  for(const e of named(/头像／陈爷爷/))bind(e,{route:'/chat/neighbor-chen'});
  const initial=['scallion','pothos','lettuce'].includes(post.id),updated=!initial||post.postId||post.date==='刚刚发布';
  if(updated){
   if(name==='post'){put(at('3:4477'),post.title);put(at('3:4494'),post.body);put(at('3:4495'),'');put(at('3:4480'),state.users[post.author]?.name||'邻居');}
   if(name==='help-post'||name==='help-resolved'){put(at('11:1150'),post.title);put(at('11:1151'),'');put(at('11:1179'),post.body);put(at('11:1180'),'');}
   if(name==='seed-post'){put(at('3:4568'),post.seedName||post.title);put(at('3:4569'),'');put(at('3:4598'),post.body);put(at('3:4599'),'');}
  }
  if(state.liked.includes(post.id)||updated){if(name==='post')put(at('3:4504'),post.likes);else if(name.startsWith('help'))put(at('11:1184'),post.likes);}
  if(name==='seed-post'&&(updated||state.agreements.some(a=>a.postId===post.id))){const counts=seedCounts(state,post.id);put(at('3:4592'),counts.available);put(at('3:4594'),counts.reserved);put(at('3:4578'),'共'+counts.total+'份');}
  const extra=post.comments.filter(c=>!/^c\d+$/.test(c.id));
  if(extra.length){const c=post.comments.find(c=>c.id===vm.selectedCommentId)||extra.at(-1),u=state.users[c.author];if(name==='post'){put(at('3:4513'),post.comments.length+'条');put(at('3:4537'),u?.name);put(at('3:4539'),c.text);at('3:4539').id='comment-'+c.id;}
   if(name==='help-post'){put(at('11:1189'),'邻居留言 · '+post.comments.length+'条');put(at('11:1193'),u?.name);put(at('11:1194'),c.text);put(at('11:1195'),'');at('11:1194').id='comment-'+c.id;}
   if(name==='help-resolved'){put(at('3:5308'),'邻居留言 · '+post.comments.length+'条');put(at('3:5321'),u?.name);put(at('3:5322'),c.text);put(at('3:5323'),'');at('3:5322').id='comment-'+c.id;}
   if(name==='seed-post'){put(at('3:4608'),'邻居留言 · '+post.comments.length+'条');const old=at('3:4611');picker(old,post.comments.map(c=>[c.id,(state.users[c.author]?.name||'邻居')+'：'+c.text]),{commentPicker:'true'},'翻看邻居留言');}
  }
  if(extra.length&&name==='post')picker(at('3:4511'),post.comments.map(c=>[c.id,(state.users[c.author]?.name||'邻居')+'：'+c.text]),{commentPicker:'true'},'翻看邻居留言');
 }
 if(name==='success'){const p=state.posts.find(p=>p.id===id);if(p)for(const e of leaves()){if(e.textContent==='我家的小番茄红了')put(e,p.title);if(e.textContent==='今天摘下两颗，和邻居分享一下。')put(e,p.body);}}
 if(name==='search'){
  const q=url.searchParams.get('q');if(q===null){[['39:1015','39:1005','39:1009'],['39:1026','39:1018','39:1022'],['39:1041','39:1029','39:1033']].forEach((keys,i)=>keys.forEach(key=>bind(at(key),{route:['/post/tomato','/post/tomato-seed','/activity/vegetable-search'][i]})));}if(q!==null){const results=searchItems(state,q,url.searchParams.get('type')||'all');put(at('39:1003'),'找到'+results.length+'条相关内容');const titleIds=['39:1009','39:1022','39:1033'],bodyIds=['39:1010','39:1023','39:1034'],buttons=['39:1015','39:1026','39:1041'];
   results.slice(0,3).forEach((result,i)=>{put(at(titleIds[i]),result.title);put(at(bodyIds[i]),result.body||result.location||result.intro);const target='/'+(result.kind==='post'?'post':result.kind==='activity'?'activity':'chat')+'/'+(result.kind==='neighbor'?'neighbor-':'')+result.id;bind(at(buttons[i]),{route:target});bind(at(titleIds[i]),{route:target});});
   for(let i=results.length;i<3;i++){for(const key of [titleIds[i],bodyIds[i],buttons[i]])if(at(key))at(key).hidden=true;}
   if(results.length>3)picker(at('39:1003'),results.map(r=>['/'+(r.kind==='neighbor'?'chat/neighbor-':r.kind+'/')+r.id,r.title]),{routePicker:'true'},'全部搜索结果');
  }
  for(const e of named(/^关闭叉$/))bind(e,{action:'clear-search'});
 }
 if(name==='search-empty'){
  const f=root.querySelector('form');if(f&&!f.elements.namedItem('q')){const old=at('39:1060');if(old){const input=document.createElement('input');input.type='search';input.name='q';input.className=old.className+' native-input';input.style.cssText=old.style.cssText;input.dataset.nodeId=old.dataset.nodeId;input.setAttribute('aria-label','搜索关键词');input.value=url.searchParams.get('q')||old.textContent;input.setAttribute('value',input.value);old.replaceWith(input);}}
 }
 if(name==='messages'){
  if(unread(state)!==2)put(at('11:1691'),unread(state));
  ['n1','n2','n3'].forEach((key,i)=>{const card=named(new RegExp('^'+key+'／'))[0],msg=state.messages.find(m=>m.id===key);if(!card||!msg)return;
   for(const e of card.querySelectorAll('[data-route],[data-action]'))bind(e,{action:'notification',id:msg.id});
   bind(card.querySelector('[data-name="'+key+'-button／背景与文字独立点击区"]'),{action:'notification',id:msg.id});
   if(msg.read){for(const e of card.querySelectorAll('[data-name*="unread-dot"]'))e.hidden=true;for(const e of card.querySelectorAll('p'))if(e.textContent==='未读')put(e,'已读');}
  });
  text('查看聊天',{route:'/chat/'+(state.agreements.find(a=>a.status!=='cancelled')?.id||'neighbor-chen')});
  for(const e of named(/^share-button／/))bind(e,{route:'/post/scallion?comments=1'});
  if(state.messages.length>3)picker(at('11:1755'),state.messages.map(m=>[m.id,m.title]),{messagePicker:'true'},'全部互动通知');
 }
 if(name==='home'&&unread(state)!==2){for(const e of leaves())if(e.textContent==='2')put(e,unread(state));}
 if(name==='following'){for(const e of named(/avatar-(wang|chen)/)){const owner=e.dataset.name.includes('chen')?'chen':'wang';bind(e,{route:'/chat/neighbor-'+owner});}['39:1218','39:1233'].forEach((key,i)=>bind(at(key),{action:'like',id:i?'lettuce':'mint'}));['39:1220','39:1235'].forEach((key,i)=>bind(at(key),{route:'/post/'+(i?'lettuce':'mint')+'?comments=1'}));['39:1212','39:1213','39:1214'].forEach(key=>bind(at(key),{action:'favorite',key:'post:mint'}));['39:1227','39:1228','39:1229'].forEach(key=>bind(at(key),{action:'favorite',key:'post:lettuce'}));}
 if(name==='chat'||name==='chat-complete'){
  const agreement=state.agreements.find(a=>a.id===id),neighbor=id.startsWith('neighbor-')?state.users[id.slice(9)]:null;
  if(neighbor){const header=name==='chat'?at('11:1215'):at('3:4676');put(header,neighbor.name);}
  if(agreement){for(const e of leaves()){if(/10月11日.*15:00/.test(e.textContent))put(e,Number(agreement.date.slice(5,7))+'月'+Number(agreement.date.slice(8))+'日 '+agreement.time);if(e.textContent==='青禾社区花园入口')put(e,agreement.pending?.location||agreement.location);if(e.textContent==='双方均未确认'&&agreement.receiverConfirmed)put(e,'您已确认，等待对方确认');if(e.textContent==='双方已确认约定'&&agreement.status==='cancelled')put(e,'约定已取消');}
   if(name==='chat'){
    if(agreement.status==='requested'){put(at('11:1235'),'确认领取约定');put(at('11:1252'),'待确认领取 · 1份');put(at('11:1253'),'确认约定后再为您预留');}
    if(agreement.pending){put(at('11:1235'),'确认修改约定');put(at('11:1256'),Number(agreement.pending.date.slice(5,7))+'月'+Number(agreement.pending.date.slice(8))+'日 '+agreement.pending.time);}
    if(agreement.receiverConfirmed){put(at('11:1265'),'您已确认收到，等待对方确认');put(at('11:1267'),'演示对方确认送出');}else if(agreement.senderConfirmed)put(at('11:1265'),'对方已确认送出，等待您确认');
    if(agreement.status==='cancelled'){put(at('11:1252'),'领取约定已取消');put(at('11:1253'),'原预留份数已释放');}
   }
   for(const e of root.querySelectorAll('[data-action=handoff]'))e.setAttribute('aria-label',agreement.receiverConfirmed?'演示对方确认送出':'确认收到种苗');
  }
  for(const e of named(/icon-send|发送图标|发送圆按钮/))bind(e,{action:'submit-native',form:'chat'});
  for(const e of named(/icon-record/))if(agreement)bind(e,{action:'add-seed-plant',id});
 }
 if(name==='help'){text('联系社区工作人员',{route:'/feedback'});for(const e of named(/联系客服耳麦/))bind(e,{route:'/feedback'});
  for(const [keys,route]of [[['39:1729','39:1730','39:1734'],'/publish'],[['39:1735','39:1736','39:1739'],'/post/lettuce'],[['39:1740','39:1741','39:1744'],'/me'],[['39:1745','39:1748','39:1764','39:1765'],'/settings/font'],[['39:1755','39:1757'],'/drafts'],[['39:1759'],'/feedback']])keys.forEach(key=>bind(at(key),{route}));['39:1752','39:1754'].forEach(key=>bind(at(key),{action:'help-code'}));
  if(url.searchParams.get('topic')==='privacy'){put(at('39:1724'),'隐私设置');put(at('39:1727'),'本设备保存，不向其他设备发送。');picker(at('39:1763'),[['community','社区内可见'],['private','仅自己可见']],{privacyPicker:'true'},'本设备隐私偏好');}
  if(url.searchParams.get('topic')==='policy'){put(at('39:1724'),'体验说明');put(at('39:1727'),'演示账号仅在本浏览器内使用。');put(at('39:1763'),'新增数据在本设备保存；不发送短信，也不与其他居民同步。');}
 }
 if(name==='login'||name==='one-click-login'){
  for(const label of ['《用户协议》','《会员服务协议》'])text(label,{route:'/help?topic=policy'});for(const label of ['《隐私政策》','《隐私协议》'])text(label,{route:'/help?topic=privacy'});
  if(name==='one-click-login')text('使用其他手机号登录',{route:'/login'+(url.searchParams.has('returnTo')?'?returnTo='+encodeURIComponent(url.searchParams.get('returnTo')):'')});
  const consent=at('3:6982');if(consent){bind(consent,{action:'login-consent'});consent.setAttribute('aria-label','我已阅读体验说明');consent.setAttribute('aria-pressed',String(!!vm.loginAgree));const agree=root.querySelector('input[name=agree]');if(agree)agree.value=vm.loginAgree?'on':'';if(vm.loginAgree){const tick=document.createElement('span');tick.textContent='✓';Object.assign(tick.style,{position:'absolute',left:'3px',top:'-4px',fontSize:'34px',color:'#fa8b17',pointerEvents:'none'});consent.append(tick);}}
 }
 if(name==='profile-edit'){
  const selected=vm.profileInterests||(state.users[state.userId].interestsCustomized?state.users[state.userId].interests:null);
  for(const [key,value]of [['3:6082','花卉'],['3:6084','香草'],['3:6086','蔬菜']]){const chip=at(key);bind(chip,{action:'profile-interest',value});if(selected){chip.dataset.choiceSelected=String(selected.includes(value));chip.setAttribute('aria-pressed',String(selected.includes(value)));}}
 }
 if(name==='font'&&vm.fontChoice)for(const e of named(/^font-(standard|large|extra)-card$/)){const selected=e.dataset.name.includes(vm.fontChoice);e.style.borderColor=selected?'#ff680b':'#f2e4c8';e.style.backgroundColor=selected?'#ffeec9':'#fdf3dd';e.setAttribute('aria-pressed',String(selected));}
 if(['drafts','drafts-manage'].includes(name)){const drafts=myDrafts(state);if(name==='drafts'){for(let i=0;i<2;i++){const draft=drafts[i],card=at(i?'3:6331':'3:6308');if(!draft){if(card)card.hidden=true;continue;}if(['draft-help','draft-seed'].includes(draft.id))continue;put(at(i?'3:6339':'3:6316'),draft.title||draft.seedName||draft.body?.slice(0,20));put(at(i?'3:6342':'3:6319'),draft.body);}}
  if(name==='drafts-manage')for(let i=0;i<2;i++){const draft=drafts[i];if(draft&&!['draft-help','draft-seed'].includes(draft.id)){put(at(i?'39:1956':'39:1946'),draft.title||draft.body?.slice(0,20));put(at(i?'39:1957':'39:1947'),draft.body);}}
  if(drafts.length>2){const heading=leaves().find(e=>/发布草稿|管理草稿/.test(e.textContent));picker(heading,drafts.map(d=>['/publish?draft='+d.id,d.title||d.seedName||d.body?.slice(0,20)||'未命名草稿']),{routePicker:'true'},'全部发布草稿');}}
 if(name==='records'||name==='record-help'||name==='record-seed'){
  const posts=state.posts.filter(p=>p.author===state.userId&&(!url.searchParams.has('kind')||p.type===url.searchParams.get('kind')));
  if(posts.some(p=>!['scallion','pothos','tomato'].includes(p.id)))picker(leaves().find(e=>e.textContent==='我的记录'),posts.map(p=>['/post/'+p.id,p.title]),{routePicker:'true'},'全部我的帖子');
  for(const e of named(/^服务图标／/)){const routes={'我的收藏':'/favorites','发布草稿':'/drafts','字号设置':'/settings/font','语音朗读':'/settings/speech','消息提醒':'/settings/notifications','隐私设置':'/help?topic=privacy','意见反馈':'/feedback','使用帮助':'/help'};bind(e,{route:routes[e.dataset.name.split('／')[1]]||'/me'});}
  bind(at('11:1318'),{route:'/publish?post=scallion'});bind(at('11:1320'),{route:'/post/scallion'});bind(at('11:1324'),{action:'like',id:'scallion'});bind(at('11:1325'),{route:'/post/scallion?comments=1'});
 }
 if(name==='favorites'){
  const entries=state.favorites.map(key=>{const [kind,id]=key.split(':');const data=state[kind==='post'?'posts':kind==='activity'?'activities':'articles'].find(x=>x.id===id);return data?{key,data,route:'/'+kind+'/'+id}:null;}).filter(Boolean);
  const buttons=leaves().filter(e=>e.textContent==='查看内容');buttons.forEach((e,i)=>{if(entries[i])bind(e,{route:entries[i].route});else e.hidden=true;});
  ['3:5877','3:5879','3:5881'].forEach((key,i)=>{const card=at(key);if(!card)return;if(!entries[i]){card.hidden=true;return;}bind(card,{route:entries[i].route});const initial=['post:mint','post:lettuce','activity:herbs'][i];if(entries[i].key!==initial){const p=[...card.querySelectorAll('p')].find(e=>/薄荷又长高了|生菜种子送给邻居|秋日一起种香草/.test(e.textContent));put(p,entries[i].data.title);}});
  if(entries.length>3)picker(leaves().find(e=>e.textContent==='我的收藏'),entries.map(e=>[e.route,e.data.title]),{routePicker:'true'},'全部我的收藏');
 }
 if(name==='font')for(const e of named(/icon-close/))bind(e,{action:'back'});
 if(name==='reader')for(const [pattern,props]of [[/icon-close/,{action:'back'}],[/icon-previous/,{action:'reader-start',step:'-1'}],[/icon-next/,{action:'reader-start',step:'1'}],[/icon-pause/,{action:'reader-start'}],[/icon-more/,{route:'/settings/font'}]])for(const e of named(pattern))bind(e,props);
 if(name==='article'&&id!=='tomato-story'){
  const article=state.articles.find(a=>a.id===id);if(article){put(at('39:2038'),article.title);put(at('39:2039'),'');const paragraphs=article.body.split(/(?<=[。！])/).filter(Boolean);['39:2051','39:2056','39:2061'].forEach((key,i)=>put(at(key),paragraphs[i]||''));}
 }
 if(name==='article')for(const e of named(/文章顶部收藏书签/))bind(e,{action:'favorite',key:'article:'+id});
 if(name==='drafts-manage'||name==='favorites-manage'){
  const controls=[...root.querySelectorAll('[data-action=select-draft],[data-action=select-favorite],[data-action^="select-all-"]')];
  for(const e of controls){const selected=e.dataset.action.startsWith('select-all')?controls.filter(c=>c.dataset.id||c.dataset.key).every(c=>vm.selected.has(c.dataset.id||c.dataset.key)):vm.selected.has(e.dataset.id||e.dataset.key);e.setAttribute('aria-pressed',String(selected));e.style.backgroundColor=selected?'#fe951b':'transparent';}
  const first=controls.find(c=>c.dataset.id||c.dataset.key);for(const e of named(/^选择勾$/))e.style.visibility=first&&vm.selected.has(first.dataset.id||first.dataset.key)?'visible':'hidden';
  for(const e of leaves())if(e.textContent==='1')put(e,vm.selected.size);else if(/取消收藏（1）|删除草稿（1）/.test(e.textContent))put(e,e.textContent.replace('（1）','（'+vm.selected.size+'）'));
 }
 return root;
}
