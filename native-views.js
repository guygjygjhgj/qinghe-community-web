import {completeSeasonal} from './native-seasonal.js';
import {screens,sizes} from './native-screens.js';
import {geometry} from './native-geometry.js';
import {createViews as legacy,esc,today,typeName} from './legacy-views.js';
import {myPlants,myDrafts,activityState,searchItems,unread} from './domain.js';
import {editorSourceExists} from './routing.js';
import {preserveDesign} from './strict-bindings.js';
import {completeNativeFunctions} from './native-functions.js';
import {completeAuthControls} from './demo-auth.js';
export {esc,today,typeName};
const norm=s=>s.replace(/\s+/g,'').replace(/›/g,'');
function nativeIndex(root){
 const data=new Map(),ids=new Map(),suffix=new Map(),order=new Map();let i=0;
 const add=(map,key,el)=>{if(!key)return;if(!map.has(key))map.set(key,[]);map.get(key).push(el);};
 for(const el of root.querySelectorAll('[data-node-id],[id]')){order.set(el,i++);add(data,el.dataset.nodeId,el);add(ids,el.id,el);if(el.dataset.nodeId?.includes(';'))add(suffix,el.dataset.nodeId.split(';').pop(),el);}
 return (full,instances=false)=>{const id=full.split(';').pop();return [...new Set([...(data.get(full)||[]),...(data.get(id)||[]),...(instances?suffix.get(id)||[]:[]),...(ids.get('node-'+id.replace(':','_'))||[])])].sort((a,b)=>order.get(a)-order.get(b));};
}
export function createViews(getState,assets,homeScene){
 const helpers=legacy(getState,assets,homeScene);
 const templates=new Map();
 function canvas(name){if(!screens[name])name='home';if(templates.has(name))return templates.get(name).cloneNode(true);const root=screens[name](),d=sizes[name];root.classList.add('native-canvas');Object.assign(root.style,{width:d.width+'px',height:d.height+'px'});root.dataset.screen=name;root.setAttribute('aria-label','青禾社区');const nodes=nativeIndex(root);
  for(const m of geometry[name]||[]){if(m[1]!=='T')continue;for(const el of nodes(m[0])){
   if(typeof m[6]==='number')el.style.fontSize=m[6]+'px';if(m[7]?.unit==='PIXELS')el.style.lineHeight=m[7].value+'px';if(m[7]?.unit==='PERCENT')el.style.lineHeight=m[7].value/100+'em';if(m[8]?.unit==='PIXELS')el.style.letterSpacing=m[8].value+'px';else if(m[8]?.unit==='PERCENT')el.style.letterSpacing=m[8].value/100+'em';
   const font=m[9];if(font?.family)el.style.fontFamily='"'+font.family+'","Noto Sans SC",sans-serif';if(font?.variationSettings?.wght)el.style.fontWeight=font.variationSettings.wght;
   if(m[5]<=((m[7]?.unit==='PIXELS'?m[7].value:0)||m[6]*1.5)*1.25)el.style.whiteSpace='pre';
   if(m[11])el.style.textAlign=m[11].toLowerCase();
  }}templates.set(name,root);return root.cloneNode(true);}
 function wire(root,vm,url,name){
  const s=getState(),path=url.pathname,itemId=path.split('/')[2],post=s.posts.find(p=>p.id===itemId),plant=s.plants.find(p=>p.id===itemId),activity=s.activities.find(p=>p.id===itemId);
  const textNodes=[...root.querySelectorAll('p,span')];
  const leaves=()=>textNodes.filter(e=>root.contains(e)&&!e.children.length&&e.textContent.trim());
  const find=t=>leaves().filter(e=>norm(e.textContent)===norm(t));
  const bind=(el,props)=>{if(!el)return;if(props.action)delete el.dataset.route;if(props.route)delete el.dataset.action;Object.assign(el.dataset,props);el.setAttribute('role','button');el.tabIndex=0;el.setAttribute('aria-label',el.textContent.trim()||el.dataset.name?.split('｜')[0]||'打开');el.classList.add('native-control');};
  const node=(pattern,props)=>{for(const el of root.querySelectorAll('[data-name]'))if(pattern.test(el.dataset.name))bind(el,props);};
  const text=(label,props)=>{for(const el of find(label)){bind(el,props);let g=el.parentElement;for(let depth=0;g&&g!==root&&depth<4;depth++,g=g.parentElement){if([...g.querySelectorAll('[data-action]')].some(e=>e.dataset.action!==props.action)||[...g.querySelectorAll('[data-route]')].some(e=>e.dataset.route!==props.route))break;if(norm(g.textContent)===norm(label)){bind(g,props);for(const child of g.querySelectorAll('[role=button]')){child.removeAttribute('role');child.tabIndex=-1;}}else break;}}for(const n of root.querySelectorAll('[data-name]'))if(n!==root&&(n.dataset.name===label||n.dataset.name.startsWith(label+'｜')||n.dataset.name.startsWith(label+'按钮')))bind(n,props);};
  const route=(t,to)=>text(t,{route:to}),action=(t,a,attrs={})=>text(t,{action:a,...attrs}),replace=(a,b)=>find(a).forEach(e=>{e.textContent=b;for(let n=e;n&&n!==root;n=n.parentElement)if(norm(n.getAttribute('aria-label')||'')===norm(a))n.setAttribute('aria-label',b);});
  const imageSource=photo=>{if(!photo)return null;const split=photo.indexOf(':');return assets[photo.slice(0,split)]?.[photo.slice(split+1)]?.file||photo;};
  const image=(pattern,photo)=>{const src=imageSource(photo);if(!src)return;for(const el of root.querySelectorAll('[data-name]'))if(pattern.test(el.dataset.name)){const img=el.querySelector('img');if(img)img.src=src;}};
  const choices=(labels,value)=>{let base,target;for(const label of labels){for(const e of find(label))e.setAttribute('aria-pressed',String(label===value));const bg=[...root.querySelectorAll('[data-name]')].find(e=>e.dataset.name===label+'｜选项背景');if(bg){if(label===labels[0])base=bg;if(label===value)target=bg;bg.style.backgroundColor=label===value?'#fff5c3':'#f9f9f9';bg.style.borderColor=label===value?'#e5c51f':'#dddddb';bind(bg,{action:labels.includes('阳台')?'plant-location':'plant-source',value:label});}}if(base&&target&&value!==labels[0]){const x=e=>Number(/left-\[([\d.]+)px\]/.exec(e.className)?.[1]||0),first=base.parentElement;for(const mark of first.querySelectorAll('[data-name="选择圆形背景"],[data-name="选择勾"]')){const copy=mark.cloneNode(true);for(const e of [copy,...copy.querySelectorAll('[data-node-id]')])e.removeAttribute('data-node-id');copy.style.transform='translateX('+(x(target)-x(base))+'px)';mark.style.visibility='hidden';root.append(copy);}}};
  const managed=(items,kind,label)=>{const capacity=kind==='drafts'?2:3,circles=[...root.querySelectorAll('[data-name]')].filter(e=>['选择圆形背景','未选中单选圆圈'].includes(e.dataset.name));circles.forEach((el,i)=>{const value=items[i],all=i===capacity,selected=all?items.length>0&&items.every(x=>vm.selected.has(x)):vm.selected.has(value);if(!all&&!value){el.style.visibility='hidden';return;}bind(el,all?{action:'select-all-'+kind}:{action:kind==='drafts'?'select-draft':'select-favorite',...(kind==='drafts'?{id:value}:{key:value})});el.setAttribute('aria-pressed',String(selected));el.style.backgroundColor=selected?'#fe951b':'transparent';el.style.border='3px solid '+(selected?'#fe951b':'#8d8d91');});const check=root.querySelector('[data-name="选择勾"]');if(check)check.style.visibility=vm.selected.has(items[0])?'visible':'hidden';replace('1',String(vm.selected.size));replace(label+'（1）',label+'（'+vm.selected.size+'）');};
  const form=(kind,id)=>{const f=document.createElement('form');f.dataset.form=kind;if(id)f.dataset.id=id;f.className='native-form';while(root.firstChild)f.append(root.firstChild);root.append(f);return f;};
  const input=(f,label,key,value,{type='text',multiline=false,placeholder='',max=500,required=false}={})=>{const old=find(label)[0];if(!old)return;const el=document.createElement(multiline?'textarea':'input');el.className=old.className+' native-input';el.style.cssText=old.style.cssText;el.dataset.nodeId=old.dataset.nodeId;el.setAttribute('aria-label',({q:'搜索关键词',title:'标题',body:'正文',name:'植物名称',text:'留言内容',phone:'手机号',code:'验证码'})[key]||label);el.name=key;if(!multiline)el.type=type;el.value=value??'';if(multiline)el.textContent=el.value;else el.setAttribute('value',el.value);el.placeholder=placeholder||label;el.maxLength=max;el.required=required;if(type==='date')el.max=today();old.replaceWith(el);return el;};
  const submit=(label,f)=>text(label,{action:'submit-native',form:f.dataset.form});
  const hidden=(f,key,value)=>{const e=document.createElement('input');e.type='hidden';e.name=key;e.value=value??'';f.append(e);};
  const upload=(label,target)=>{action(label,'upload-native',{target});node(/添加照片.*底色|照片添加|照片上传/, {action:'upload-native',target});const e=document.createElement('input');e.type='file';e.accept='image/*';e.hidden=true;e.dataset.uploadTarget=target;e.multiple=target==='post'||target==='feedback';root.append(e);};
  // Binding actions preserves every image, label and shape's original coordinates.
  [['首页','/'],['植物圈','/community'],['发布','/publish'],['消息','/messages'],['我的','/me']].forEach(([t,r])=>{if(!['profile','plants','records'].includes(name)||t!=='我的')route(t,r);node(new RegExp('^'+t+'[｜].*(导航|图标)|^导航.*'+t),{route:r});});
  action('返回','back');node(/icon-back|back-arrow|返回.*图标|返回箭头|返回按钮|返回｜/,{action:'back'});
  [['编辑资料','/profile/edit'],['我的植物','/me'],['我的记录','/me?tab=records'],['我的收藏','/favorites'],['发布草稿','/drafts'],['字号设置','/settings/font'],['消息提醒','/settings/notifications'],['意见反馈','/feedback'],['使用帮助','/help'],['我的关注','/following'],['隐私设置','/settings/privacy']].forEach(([t,r])=>route(t,r));
  route('社区','/community');route('去植物圈看看','/community');route('看回复','/messages');route('社区活动','/activities');route('当季推荐','/article/chrysanthemum');route('添加第一盆植物','/plant/new');node(/^添加.*植物.*(按钮|图标)/,{route:'/plant/new'});
  [['交流','feed'],['资讯','info'],['附近','near']].forEach(([t,v])=>route(t,'/community?tab='+v));route('关注动态','/following?tab=feed');route('关注的邻居','/following?tab=neighbors');action('筛选','filter');node(/筛选.*(图标|按钮)/,{action:'filter'});
  if(name==='home'){
   replace('2',String(unread(s)));replace('32人已报名',activityState(s,'herbs').count+'人已报名');replace('18人已报名',activityState(s,'repot').count+'人已报名');
   node(/菊花.*(照片|卡片)|当季推荐.*(照片|卡片)/,{route:'/article/chrysanthemum'});
   node(/搜索框|搜索入口/,{route:'/search'});route('搜本社区的植物帖子或活动','/search');
   ['查看活动','立即报名'].forEach((t,i)=>route(t,'/activity/'+(i?'repot':'herbs')));
   node(/^(活动1|活动一|香草|秋日).*(照片|封面|卡片)/,{route:'/activity/herbs'});node(/^(活动2|活动二|换盆).*(照片|封面|卡片)/,{route:'/activity/repot'});
  }
  if(['circle','circle-info','circle-near','following','search','favorites','records','record-help','record-seed'].includes(name)){
   [['我家的小葱','scallion'],['阳台上的小葱长高了','scallion'],['薄荷又长高了','mint'],['绿萝叶子发黄','pothos'],['绿萝最近有些黄叶','pothos'],['生菜种子送给邻居','lettuce'],['生菜种子，送给邻居','lettuce'],['今天的番茄可以摘了。','tomato']].forEach(([t,id])=>route(t,'/post/'+id));
   const ids=name==='record-help'?['pothos']:name==='record-seed'?['lettuce']:name==='favorites'?['mint','lettuce','herbs']:['scallion','pothos','lettuce','tomato'];
   ['查看原帖','查看内容','查看进展','查看约定'].forEach(t=>find(t).forEach((e,i)=>bind(e,{route:t==='查看约定'?'/chat/seed-demo':ids[i]==='herbs'?'/activity/herbs':'/post/'+ids[i%ids.length]})));
   route('编辑内容','/publish?post=scallion');route('补充情况','/publish?post=pothos');route('联系陈爷爷','/chat/seed-demo');route('关注','/following');route('立即发布','/publish');route('立即查看','/following');
   if(name==='circle-info'){route('番茄成长','/article/tomato-story');node(/资讯.*(卡片|照片|插画)/,{route:'/article/tomato-story'});}
   [...root.querySelectorAll('[data-name]')].filter(e=>e.querySelector('img')&&/(帖子.*照片|植物照片|小葱.*照片|卡片.*照片|番茄照片|主图)/.test(e.dataset.name)).forEach((e,i)=>bind(e,{route:'/post/'+ids[i%ids.length]}));
  }
  if(name==='search'||name==='search-empty'){
   const f=form('search'),q=url.searchParams.get('q')??'番茄';input(f,'番茄','q',q,{placeholder:'搜索植物帖子或活动'});input(f,'搜索植物帖子、活动或邻居','q',q,{placeholder:'搜索植物帖子、活动或邻居'});submit('搜索',f);
   ['全部','帖子','活动','邻居'].forEach((t,i)=>route(t,'/search?q='+encodeURIComponent(q)+'&type='+['all','posts','activities','neighbors'][i]));
   ['番茄','生菜','社区活动'].forEach(t=>{if(t!==q)route(t,'/search?q='+encodeURIComponent(t));});
  }
  if(['profile','profile-old','plants','records'].includes(name)){
   replace('李阿姨',s.users[s.userId].name);
   if(name==='plants'){node(/植物.*(卡片|照片)|薄荷|番茄/,{route:'/plant/'+(myPlants(s)[0]?.id||'mint-reference')});node(/添加植物|添加按钮/,{route:'/plant/new'});for(const p of myPlants(s))route(p.name,'/plant/'+p.id);}
   route('展开全部','/me?tab=records');route('展开全部  ›','/me?tab=records');
  }
  if(['activity','activity-full','activity-booked'].includes(name)){
   const a=activity||s.activities[0],st=activityState(s,a.id);replace('8人',st.remaining+'人');replace('8',String(st.remaining));replace('20人',a.capacity+'人');replace('20',String(a.capacity));action('报名参加','book',{id:a.id});action('立即报名','book',{id:a.id});action('取消报名','cancel-booking',{id:a.id});route('返回查看其他活动','/activities');route('查看其他活动','/activities');node(/报名.*按钮|报名按钮/,{action:st.mine?'cancel-booking':'book',id:a.id});
  }
  if(name==='messages'){
   action('全部标为已读','read-all');action('全部已读','read-all');route('种苗约定','/chat/seed-demo');route('查看约定','/chat/seed-demo');route('查看活动','/activity/herbs');route('查看回复','/post/pothos');find('查看评论').forEach((el,i)=>bind(el,{route:['/post/pothos','/post/scallion','/activity/herbs','/post/scallion'][i%4]}));route('查看聊天','/chat/seed-demo');action('语音播报','read',{kind:'messages'});route('互动消息','/messages?tab=interaction');route('种苗消息','/messages?tab=seed');route('系统消息','/messages?tab=system');node(/种苗.*(卡片|消息)|陈爷爷.*(头像|消息)/,{route:'/chat/seed-demo'});node(/活动.*卡片/,{route:'/activity/herbs'});
  }
  if(['post','help-post','help-resolved','seed-post'].includes(name)){
   const p=post||s.posts.find(p=>p.type===(name==='seed-post'?'seed':name.startsWith('help')?'help':'share'));if(p.author===s.userId)route('编辑','/publish?post='+p.id);const latest=p.comments.slice(-2);if(p.comments.length!==2||!['scallion','pothos','lettuce'].includes(p.id)){replace('2条',p.comments.length+'条');replace('长得真精神！',latest[0]?.text||'');replace('我也想试着种一盆。',latest[1]?.text||'');replace('陈爷爷',latest[0]?s.users[latest[0].author]?.name||'邻居':'');replace('王阿姨',latest[1]?s.users[latest[1].author]?.name||'邻居':'');}
   action('收藏','favorite',{key:'post:'+p.id});action('已收藏','favorite',{key:'post:'+p.id});node(/收藏.*(图标|按钮)/,{action:'favorite',key:'post:'+p.id});node(/点赞|赞图标|爱心/,{action:'like',id:p.id});
   ['语音朗读','朗读','听一听'].forEach(t=>action(t,'read',{kind:'post',id:p.id}));['我想领取','申请领取','领取种苗'].forEach(t=>action(t,'request-seed',{id:p.id}));node(/领取.*按钮/,{action:'request-seed',id:p.id});action('标记已解决','resolve',{id:p.id});['留言问问','写留言','留言','说两句'].forEach(t=>action(t,'focus-comment'));
   const entry=leaves().find(e=>/说点|聊聊|写下|和邻居.*聊|留个言/.test(e.textContent));if(entry){const f=form('comment',p.id);input(f,entry.textContent,'text','',{placeholder:entry.textContent,required:true});submit('发送',f);f.id='comments';}
   if(!['scallion','pothos','lettuce','mint','tomato'].includes(p.id)){replace('阳台上的小葱长高了，已经能剪来做菜啦。',p.body);replace('和大家分享这份小收获！','');for(const el of find(p.body)){el.style.whiteSpace='pre-wrap';el.style.overflow='auto';el.dataset.lines='2';}replace('我家的小葱',p.title);replace('绿萝叶子发黄',p.title);replace('生菜种子，送给邻居',p.title);}
  }
  if(name==='plant-new'){
   const f=form('plant');input(f,'小番茄','name','小番茄',{required:true,max:40});input(f,'2026年10月13日','date','2026年10月13日',{required:true,max:20});hidden(f,'source',vm.plantSource||'自己种的');hidden(f,'location',vm.plantLocation||'阳台');['阳台','院子','室内'].forEach(v=>action(v,'plant-location',{value:v}));['自己种的','邻居送的'].forEach(v=>action(v,'plant-source',{value:v}));choices(['阳台','院子','室内'],vm.plantLocation||'阳台');choices(['自己种的','邻居送的'],vm.plantSource||'自己种的');upload('更换照片','plant');submit('保存植物',f);image(/^植物照片｜/,vm.plantPhoto);
  }
  if(name==='plant-success'){const id=plant?.id||myPlants(s)[0]?.id||'mint-reference';route('查看我的植物','/me');route('记录第一条近况','/plant/'+id+'/record');if(plant){replace('小番茄',plant.name);replace('小番茄已加入我的植物',plant.name+'已加入我的植物');replace('阳台 · 自己种的',plant.location+' · '+plant.source);const date=plant.date?.split('-');if(date?.length===3)replace('10月13日种下',Number(date[1])+'月'+Number(date[2])+'日种下');image(/^已添加番茄照片/,plant.photo);}}
  if(name==='plant-detail'){const id=plant?.id||'mint-reference';route('记录近况','/plant/'+id+'/record');route('分享给邻居','/publish?type=share&plant='+id);route('请邻居帮忙','/publish?type=help&plant='+id);if(plant){replace('薄荷盆栽',plant.name);replace('阳台',plant.location);replace('自己栽种',plant.source);image(/^photo-mint-pot／/,plant.photo);const date=plant.date?.split('-');if(date?.length===3)replace('9月12日种下',Number(date[1])+'月'+Number(date[2])+'日种下');const r=(plant.records||[]).slice(-2);for(let i=0;i<2;i++){for(const [field,key]of [['date','date'],['title','title'],['body','body']]){const p=root.querySelector('[data-name="event'+(i+1)+'-'+field+'／文字行"] p');if(p)p.textContent=r[i]?.[key]||'';}const pic=root.querySelector('[data-name="'+(i?'photo-mint-leaf':'photo-mint-planting')+'／独立PNG"]');if(pic)pic.style.visibility=r[i]?'visible':'hidden';}image(/^photo-mint-planting／/,r[0]?.photo||plant.photo);image(/^photo-mint-leaf／/,r[1]?.photo||plant.photo);}}
  if(['editor','help-editor','seed-editor'].includes(name)){
   const isRecord=/^\/plant\/[^/]+\/record$/.test(path),d=isRecord?{}:vm.composer||{},f=form(isRecord?'record':'publish',isRecord?itemId:null),title=leaves().find(e=>/请输入.*标题|给.*标题/.test(e.textContent));if(title)input(f,title.textContent,'title',d.title,{placeholder:title.textContent,max:100,required:true});
   const body=leaves().find(e=>e.textContent.trim().length>12&&/小葱|叶子|邻居|种子|黄叶/.test(e.textContent)&&!/(发布后|拍张照片|社区|标题)/.test(e.textContent));if(body){if(!isRecord&&!d.nativeInitialized){d.body=d.body||body.textContent;if(!d.photos?.length)d.photos=name==='seed-editor'?['seed-editor:imgPhotoLettucePng']:name==='help-editor'?['help-editor:imgPhoto1','help-editor:imgPhoto2']:['editor:imgPlantThumbnailPng','editor:imgPhotoHarvestPng'];d.nativeInitialized=true;}input(f,body.textContent,'body',d.body,{placeholder:body.textContent,multiline:true,max:name==='seed-editor'?200:500,required:true});}hidden(f,'title',d.title||'');
   ['分享','晒一晒','我来分享'].forEach(t=>action(t,'editor-type',{type:'share'}));['求助','提个问','需要帮助'].forEach(t=>action(t,'editor-type',{type:'help'}));['种苗','我有种苗','送种苗'].forEach(t=>action(t,'editor-type',{type:'seed'}));['按住说，转成文字','按一下说，转成文字','按住说话','按住说'].forEach(t=>action(t,'voice',{target:'publish'}));node(/语音.*按钮|麦克风.*按钮/,{action:'voice',target:'publish'});
   const photoSlots=[...root.querySelectorAll('[data-name]')].filter(e=>/^(photo-scallions|photo-harvest|photo-lettuce)／|^photo[12]／/.test(e.dataset.name));
   photoSlots.forEach((slot,i)=>{const photo=isRecord?vm.recordPhoto:d.photos?.[i],img=slot.querySelector('img');if(img&&photo)img.src=imageSource(photo);slot.style.visibility=photo?'visible':'hidden';});
   root.querySelectorAll('[data-name="photo-remove-background"]').forEach((el,i)=>el.style.visibility=(isRecord?vm.recordPhoto:d.photos?.[i])?'visible':'hidden');
   const removers=[...root.querySelectorAll('[data-name]')].filter(e=>/photo-remove[12]／|^photo[12]-remove／|^photo-remove$/.test(e.dataset.name)&&!e.closest('[data-name="seed-name-remove"]'));
   removers.forEach((el,i)=>{const index=/photo2/.test(el.dataset.name)?1:Math.min(i,photoSlots.length-1);bind(el,{action:'remove-photo',target:isRecord?'record':'post',index:String(index)});el.style.visibility=(isRecord?vm.recordPhoto:d.photos?.[index])?'visible':'hidden';});
   replace('2 / 9',(isRecord?(vm.recordPhoto?1:0):d.photos?.length||0)+' / 9');
   node(/quantity-minus/,{action:'quantity',delta:'-1'});node(/quantity-plus/,{action:'quantity',delta:'1'});if(!isRecord){action('预览','preview');action('存草稿','save-draft');action('保存草稿','save-draft');['选择植物','关联我的植物'].forEach(t=>action(t,'choose-plant'));['选择话题','添加话题'].forEach(t=>action(t,'choose-topic'));}submit('立即发布',f);submit('发布',f);upload('添加照片',isRecord?'record':'post');
   if(isRecord){hidden(f,'date',today());replace('发布帖子','记录近况');replace('立即发布','保存近况');replace('小葱',plant?.name||'');replace('我家的小葱',plant?.name||'');submit('保存近况',f);root.querySelectorAll('[data-action="editor-type"]').forEach(e=>{delete e.dataset.action;e.removeAttribute('role');});root.querySelectorAll('[data-action="voice"]').forEach(e=>e.dataset.target='record');}
   if(name==='seed-editor'){replace('3',String(d.quantity||3));hidden(f,'quantity',d.quantity||3);input(f,'生菜种子','seedName',d.seedName||'生菜种子',{required:true,max:40});['种子','秧苗'].forEach(v=>action(v,'seed-kind',{value:v}));['免费赠送','商量互换'].forEach(v=>action(v,'exchange',{value:v}));for(const [labels,value]of [[['种子','秧苗'],d.seedKind||'种子'],[['免费赠送','商量互换'],d.exchange||'免费赠送']]){const template=root.querySelector('[data-name="seed-radio-dot"]');for(const label of labels){const group=root.querySelector('[data-name="16／'+label+'选项"]'),radio=group?.querySelector('[data-name="单选按钮槽"]>div');if(!radio)continue;group.setAttribute('aria-pressed',String(value===label));radio.style.borderColor=label===value?'#ff9000':'#a39ec5';let dot=radio.querySelector('[data-name="seed-radio-dot"]');if(label===value&&!dot&&template){dot=template.cloneNode(true);dot.removeAttribute('data-node-id');radio.append(dot);}if(dot)dot.style.visibility=label===value?'visible':'hidden';}}action('−','quantity',{delta:'-1'});action('+','quantity',{delta:'1'});}
  }
  if(name==='success'){if(post){replace('我家的小番茄红了',post.title);replace('今天摘下两颗，和邻居分享一下。',post.body);}route('返回植物圈','/community');route('查看帖子','/post/'+itemId);route('查看我发布的帖子','/post/'+itemId);route('回到植物圈','/community');route('继续发布','/publish');}
  if(['drafts','drafts-manage','delete','drafts-empty'].includes(name)){
   action('管理','manage');action('完成','manage');const ds=myDrafts(s);find('继续编辑').forEach((e,i)=>bind(e,{route:'/publish?draft='+ds[i%ds.length]?.id}));find('删除').forEach((e,i)=>bind(e,{action:'delete-draft',id:ds[i%ds.length]?.id}));action('删除草稿（1）','delete-draft');route('写一条帖子','/publish');if(name==='drafts-manage'){action('全选','select-all-drafts');managed(ds.slice(0,2).map(d=>d.id),'drafts','删除草稿');}
   if(name==='drafts')for(let i=0;i<2;i++){const d=ds[i],card=root.querySelector('[data-name="draft'+(i+1)+'／双图、正文与操作"]');if(!card)continue;if(!d){card.style.visibility='hidden';continue;}if(!['draft-help','draft-seed'].includes(d.id)){const title=card.querySelector('[data-name="draft'+(i+1)+'-title／文字行"] p'),body=card.querySelector('[data-name="draft'+(i+1)+'-description／文字行"] p');if(title)title.textContent=d.title||d.seedName||d.body?.slice(0,20)||'';if(body)body.textContent=d.body||'';const ps=[...card.querySelectorAll('p')];for(const p of ps){if(/今天.*编辑|昨天.*编辑/.test(p.textContent))p.textContent=d.updated;if(['求助','分享','种苗'].includes(p.textContent))p.textContent=typeName[d.type];}const photos=[...card.querySelectorAll('[data-name]')].filter(e=>/^photo-/.test(e.dataset.name));photos.forEach((el,index)=>{const img=el.querySelector('img');if(img&&d.photos?.[index])img.src=imageSource(d.photos[index]);el.style.visibility=d.photos?.[index]?'visible':'hidden';});}}
   if(name==='drafts-manage'){const children=[...root.children],starts=children.map((e,i)=>/^(绿萝最近有些黄叶|想分享一些生菜小苗)卡片｜/.test(e.dataset.name||'')?i:-1).filter(i=>i>=0),panel=children.findIndex(e=>e.dataset.name==='管理底部操作面板');starts.forEach((start,i)=>{const nodes=children.slice(start,starts[i+1]??panel),d=ds[i];if(!d){nodes.forEach(e=>e.style.visibility='hidden');return;}if(['draft-help','draft-seed'].includes(d.id))return;const ps=nodes.flatMap(e=>e.matches('p')?[e]:[...e.querySelectorAll('p')]);for(const p of ps){if(/^(绿萝最近有些黄叶|想分享一些生菜小苗)$/.test(p.textContent))p.textContent=d.title||d.seedName||d.body?.slice(0,20)||'';else if(/^(想请邻居帮忙看看…|家里多育了几棵…)$/.test(p.textContent))p.textContent=d.body;else if(/今天.*编辑|昨天.*编辑/.test(p.textContent))p.textContent=d.updated;else if(['求助','种苗'].includes(p.textContent))p.textContent=typeName[d.type];}for(const n of nodes){const img=n.querySelector('img');if(img&&/照片/.test(n.dataset.name||'')){if(d.photos?.[0])img.src=imageSource(d.photos[0]);else n.style.visibility='hidden';}}});}
  }
  if(name==='favorites'||name==='favorites-manage'){action('管理','manage');action('完成','manage');action('取消收藏（1）','batch-favorite');action('全选','select-all-favorites');if(name==='favorites-manage')managed(s.favorites.slice(0,3),'favorites','取消收藏');}
  if(name==='article'){action('语音朗读','read',{kind:'article',id:itemId||'tomato-story'});action('收藏文章','favorite',{key:'article:'+(itemId||'tomato-story')});}
  if(name==='chat'||name==='chat-complete'){
   const a=s.agreements.find(a=>a.id===itemId);if(a){if(a.status==='requested'){replace('双方已确认约定','双方已确认约定');action('双方已确认约定','reserve',{id:a.id});}node(/未交接禁用按钮/,{action:'handoff',id:a.id,role:a.receiverConfirmed?'sender':'receiver',demo:a.receiverConfirmed?'true':''});if(a.receiverConfirmed)replace('双方均未确认','您已确认，等待对方确认');action('我已收到','handoff',{id:a.id,role:'receiver'});action('确认收到','handoff',{id:a.id,role:'receiver'});action('对方确认','handoff',{id:a.id,role:'sender',demo:'true'});action('修改约定','edit-agreement',{id:a.id});action('取消约定','cancel-agreement',{id:a.id});}
   const entry=leaves().find(e=>/发消息|输入消息|说点什么|和.*聊/.test(e.textContent));if(entry){const f=form('chat',itemId);input(f,entry.textContent,'text','',{placeholder:entry.textContent,required:true});submit('发送',f);node(/发送圆按钮|发送图标/,{action:'submit-native',form:f.dataset.form});}
  }
  if(name==='login'||name==='one-click-login'){
   const f=form('login'),phone=leaves().find(e=>/请输入.*手机|1\*+/.test(e.textContent));if(phone)input(f,phone.textContent,'phone','',{placeholder:'请输入手机号',max:11,required:true});const code=leaves().find(e=>/输入验证码/.test(e.textContent));if(code)input(f,code.textContent,'code','',{placeholder:'请输入验证码',max:6,required:true});hidden(f,'agree','on');action('获取验证码','get-code');input(f,'李阿姨','name',s.users[s.userId].name,{required:true,max:30});submit('登录',f);submit('登录并加入',f);submit('登录并进入',f);action('本机号码一键登录','demo-login');action('一键登录','demo-login');action('其他手机号登录','demo-login');
  }
  if(name==='feedback'){const counter=find('0/300')[0];if(counter)counter.dataset.counter='body';const f=form('feedback');input(f,'请说说遇到的情况…','body',vm.feedbackBody||'',{placeholder:'请说说遇到的情况…',multiline:true,max:300,required:true});input(f,'手机号或其他联系方式','contact',vm.feedbackContact||'',{max:100});['功能问题','使用建议','其他'].forEach(v=>action(v,'feedback-type',{value:v}));upload('添加照片','feedback');submit('提交反馈',f);action('按住说，转成文字','voice',{target:'feedback'});}
  if(name==='profile-edit'){const f=form('profile');input(f,'李阿姨','name',s.users[s.userId].name,{max:30,required:true});const intro=leaves().find(e=>/喜欢种|喜欢养|一起聊/.test(e.textContent));if(intro)input(f,intro.textContent,'intro',s.users[s.userId].intro,{max:100});submit('保存',f);submit('保存修改',f);upload('更换头像','avatar');}
  if(name==='notifications'){const labels=['邻居回复','种苗约定','活动提醒','新聊天消息'],keys=['reply','seed','activity','chat'];labels.forEach((label,i)=>{const track=root.querySelector('[data-name="'+label+'开关黄色底色"]'),knob=root.querySelector('[data-name="'+label+'开关白色滑块"]'),on=s.settings.notifications[keys[i]];if(track){bind(track,{action:'notification-switch',key:keys[i]});track.setAttribute('aria-label',label);track.setAttribute('aria-pressed',String(on));track.style.backgroundColor=on?'#ffcd37':'#dddddb';}if(knob){bind(knob,{action:'notification-switch',key:keys[i]});if(!on)knob.style.transform='translateX(-54px)';}});}
  if(name==='filter'){const mask=root.querySelector('[data-name="弹窗遮罩｜独立可编辑"]');if(!url.searchParams.has('filter')){if(mask){let tail=mask;while(tail){const next=tail.nextSibling;tail.remove();tail=next;}}find('查看详情').forEach((el,i)=>bind(el,{route:'/activity/'+(i?'repot':'herbs')}));}else{const f=form('filter');for(const k of ['time','kind','status'])hidden(f,k,vm.filter?.[k]||'all');const entries=[['本周','time','week'],['本月','time','month'],['种植交流','kind','种植交流'],['认知小游戏','kind','认知小游戏'],['可以报名','status','available'],['我已报名','status','mine']];entries.forEach(([t,k,value])=>action(t,'filter-choice',{key:k,value}));find('全部').forEach((el,i)=>bind(el,{action:'filter-choice',key:['time','kind','status'][i],value:'all'}));submit('确认筛选',f);action('重置','native-reset-filter');node(/关闭叉/,{route:'/activities'});}}
  if(name==='font'){['标准','大号','特大'].forEach((t,i)=>action(t,'native-font',{value:['standard','large','extra'][i]}));action('恢复默认','native-font',{value:'standard'});action('应用字号','native-apply-font');}
  if(name==='help'){[['怎样发布帖子','publish'],['怎样领取种苗','seed'],['怎样记录植物成长','plants'],['怎样调大文字','font']].forEach(([t,v])=>action(t,'tutorial',{kind:v}));action('收不到验证码怎么办？','help-code');action('不小心退出，内容还在吗？','help-draft');}
  if(name==='filter'&&!url.searchParams.has('filter')){
   const labels=find('查看详情'),boxes=[...root.querySelectorAll('[data-name="查看详情｜按钮底色"]')];boxes.forEach((box,i)=>{bind(box,{route:'/activity/'+(i?'repot':'herbs')});if(i&&labels[0]){const copy=labels[0].cloneNode(true);copy.removeAttribute('data-node-id');Object.assign(copy.style,{left:'50%',top:'50%',width:'max-content',height:'auto',transform:'translate(-50%,-50%)',translate:'none'});copy.dataset.route='/activity/repot';box.append(copy);}});
   const children=[...root.children],starts=children.map((e,i)=>/^活动卡片 [12]｜卡片底色$/.test(e.dataset.name||'')?i:-1).filter(i=>i>=0),week=new Date();week.setDate(week.getDate()+((7-week.getDay())%7));const endWeek=week.getFullYear()+'-'+String(week.getMonth()+1).padStart(2,'0')+'-'+String(week.getDate()).padStart(2,'0');
   s.activities.slice(0,2).forEach((a,i)=>{const time=url.searchParams.get('time')||'all',kind=url.searchParams.get('kind')||'all',status=url.searchParams.get('status')||'all',st=activityState(s,a.id),ok=(kind==='all'||kind===a.type)&&(time==='all'||(time==='week'?a.date<=endWeek:a.date.slice(0,7)===today().slice(0,7)))&&(status==='all'||(status==='mine'?st.mine:!st.full));if(!ok&&starts[i]!=null)children.slice(starts[i],starts[i+1]??children.length).forEach(e=>e.remove());});
  }
  return root;
 }
 function choose(url,vm){
  const s=getState(),p=url.pathname,q=url.searchParams,id=p.split('/')[2];
  if(p==='/seasonal')return'seasonal';if(p==='/')return'home';if(p==='/community')return q.get('tab')==='info'?'circle-info':q.get('tab')==='near'?'circle-near':'circle';if(p==='/messages')return'messages';if(p==='/following'||p.startsWith('/neighbor/'))return'following';if(p==='/me')return q.get('tab')==='records'?q.get('kind')==='help'?'record-help':q.get('kind')==='seed'?'record-seed':'records':q.has('empty')?'profile':'plants';
  if(p==='/plant/new')return'plant-new';if(/^\/plant\/[^/]+\/success$/.test(p))return'plant-success';if(/^\/plant\/[^/]+\/record$/.test(p))return'editor';if(p.startsWith('/plant/'))return'plant-detail';if(p==='/publish')return vm.composer?.type==='seed'?'seed-editor':vm.composer?.type==='help'?'help-editor':'editor';
  if(p.startsWith('/success/'))return'success';if(p.startsWith('/post/')){const post=s.posts.find(p=>p.id===id);return post?.type==='seed'?'seed-post':post?.type==='help'?post.status==='resolved'?'help-resolved':'help-post':'post';}if(p==='/search')return q.get('q')&&!searchItems(s,q.get('q'),q.get('type')||'all').length?'search-empty':'search';
  if(p==='/favorites')return s.favorites.length?vm.manage?'favorites-manage':'favorites':'favorites-empty';if(p==='/drafts')return myDrafts(s).length?vm.manage?'drafts-manage':'drafts':'drafts-empty';if(p==='/activities')return'filter';if(p.startsWith('/activity/'))return activityState(s,id).mine?'activity-booked':activityState(s,id).full?'activity-full':'activity';
  if(p.startsWith('/chat/'))return s.agreements.find(a=>a.id===id)?.status==='completed'?'chat-complete':'chat';if(p.startsWith('/article/'))return'article';if(p==='/login')return q.get('method')==='quick'?'one-click-login':'login';if(p==='/profile/edit')return'profile-edit';if(p==='/help')return'help';if(p==='/feedback')return'feedback';if(p==='/settings/notifications')return'notifications';if(p==='/settings/font')return'font';if(p==='/settings/speech')return'reader';if(p==='/plant-records')return'records';if(p==='/settings')return'profile';if(p.startsWith('/design/'))return p.slice(8);return'network';
 }
 function render(route,vm){
  const url=new URL(route,'https://qinghe.local');if(url.pathname==='/register')url.pathname='/login';
  if(url.pathname.startsWith('/games/')){const game=url.pathname.split('/')[2];const paths={corn:'corn/index.html',cotton:'cotton/index.html',chrysanthemum:'runtime/index.html?game=chrysanthemum',osmanthus:'runtime/index.html?game=osmanthus',luffa:'runtime/index.html?game=luffa',ginkgo:'runtime/index.html?game=ginkgo'};if(paths[game])return{html:'<iframe id="game-frame" title="植物小乐趣" src="games/'+paths[game]+'" style="width:100vw;height:100vh;border:0;display:block"></iframe>',className:'game-host',nav:'',desktop:''};}
  let name;try{name=choose(url,vm);}catch{name='network';}
  const target=url.pathname.split('/')[2],s=getState();
  const missing=(url.pathname.startsWith('/post/')||url.pathname.startsWith('/success/'))&&!s.posts.some(p=>p.id===target)||url.pathname.startsWith('/activity/')&&!s.activities.some(a=>a.id===target)||url.pathname.startsWith('/plant/')&&target!=='new'&&target!=='reference-mint'&&!s.plants.some(p=>p.id===target)||url.pathname.startsWith('/chat/')&&!s.agreements.some(a=>a.id===target)&&!['neighbor-wang','neighbor-chen','neighbor-li'].includes(target)||url.pathname.startsWith('/article/')&&!s.articles.some(a=>a.id===target);if(missing)name='network';
  if(url.pathname==='/publish'&&!editorSourceExists(getState(),url))name='network';
  const root=canvas(name);
  if(name==='seasonal'&&!url.pathname.startsWith('/design/'))completeSeasonal(root,{state:getState(),url,assets});
  else if(!url.pathname.startsWith('/design/')){
   const bindingUrl=new URL(url);if(name==='filter')bindingUrl.searchParams.set('filter','1');
   const wired=wire(canvas(name),vm,bindingUrl,name);
   preserveDesign(root,wired,{name,state:getState(),vm,assets,url});
   if(name==='filter'&&url.searchParams.get('filter')!=='1'){
    const mask=root.querySelector('[data-name="弹窗遮罩｜独立可编辑"]');let tail=mask;while(tail){const next=tail.nextSibling;tail.remove();tail=next;}
   }
   completeNativeFunctions(root,{name,state:getState(),vm,assets,url});
   if(name==='login')completeAuthControls(root);
  }
  return {html:root.outerHTML,className:'native-host',nav:'',desktop:''};
 }
 function nativeDialog(name,context={}){
  const root=canvas(name);root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  const ps=[...root.querySelectorAll('p')],get=t=>ps.find(e=>norm(e.textContent)===norm(t));
  const bind=(t,action,attrs={})=>{for(const e of ps.filter(e=>norm(e.textContent)===norm(t))){Object.assign(e.dataset,{action,...attrs});e.role='button';e.tabIndex=0;e.classList.add('native-control');const parent=e.parentElement;if(parent.classList.contains('contents'))Object.assign(parent.dataset,{action,...attrs});}};
  if(name==='exit'){bind('保存草稿并退出','save-exit');bind('继续编辑','close');bind('不保存并退出','discard-exit');}
  if(name==='delete'){bind('确认删除','confirm-delete-draft');bind('继续编辑','edit-selected-draft');bind('取消','close');}
  if(name==='publish-failed'){bind('重新发布','publish-preview');bind('存为草稿','save-draft');bind('继续编辑','close');}
  const edit=(el,id,second)=>{if(!el)return;const area=document.createElement('textarea');area.id=id;area.className=el.className+' native-input';area.style.cssText=el.style.cssText;area.dataset.nodeId=el.dataset.nodeId;area.placeholder=el.textContent;area.value=context.text||'';area.textContent=area.value;area.setAttribute('aria-label','转写文字');if(second){area.dataset.lines='2';second.id=id+'-continuation';second.hidden=!!area.value.trim();}el.replaceWith(area);};
  if(name==='speech'){bind('完成录音','finish-recording');bind('取消录音','close');const timer=get('00:08');if(timer){timer.id='recording-timer';timer.textContent='00:00';}const status=get('正在听您说');if(status)status.id='recording-status';edit(ps.find(e=>/今天家里的小番茄红了/.test(e.textContent)),'speech-text',ps.find(e=>norm(e.textContent)==='想和邻居分享一下。'));}
  if(name==='speech-confirm'){bind('播放录音','play-speech');bind('使用这段文字','use-speech');bind('重新录音','re-record');bind('取消','close');edit(ps.find(e=>/今天家里的小番茄红了/.test(e.textContent)),'confirmed-speech',ps.find(e=>norm(e.textContent)==='邻居分享一下。'));if(context.elapsed!==undefined){const duration=get('录音 00:18');if(duration)duration.textContent=context.recorded?'录音 '+String(Math.floor(context.elapsed/60)).padStart(2,'0')+':'+String(context.elapsed%60).padStart(2,'0'):'文字输入';}}
  if(name==='reader'){bind('上一句','reader-prev');bind('下一句','reader-next');bind('暂停朗读','reader-toggle');bind('停止朗读','close');[['稍慢',.75],['慢速',.75],['正常',1],['稍快',1.25]].forEach(([t,v])=>bind(t,'reader-rate',{value:String(v)}));const content=ps.find(e=>e.textContent.includes('阳台上的小葱长高了，已经能剪来做菜啦。'));if(content){content.id='reading-sentence';content.style.whiteSpace='pre-wrap';content.style.overflow='auto';}const pos=get('00:12 / 00:38');if(pos)pos.id='reading-position';}
  if(name==='editor'){bind('立即发布','publish-preview');bind('预览','close');bind('存草稿','save-draft');bind('返回','close');const pictures=[...root.querySelectorAll('[data-name]')].filter(el=>/^(photo-scallions|photo-harvest)／/.test(el.dataset.name));pictures.forEach((el,i)=>{const photo=context.photos?.[i];if(photo?.startsWith('data:image/'))el.querySelector('img').src=photo;});if(context.body!==undefined){const body=root.querySelector('[data-node-id="3:6507"]');if(body){body.textContent=context.body;body.style.whiteSpace='pre-wrap';body.style.overflow='auto';}}}
  if(name==='speech'){
   const microphone=[...root.querySelectorAll('[data-name]')].find(el=>/录音麦克风图标/.test(el.dataset.name));
   if(microphone){microphone.dataset.action='start-recording';microphone.role='button';microphone.tabIndex=0;microphone.setAttribute('aria-label','开始录音');}
  }
  for(const element of root.querySelectorAll('p'))if(element.textContent.includes('李阿姨'))element.textContent=element.textContent.replaceAll('李阿姨',getState().users[getState().userId].name);
  const iconActions=name==='reader'?[[/icon-previous/,'reader-prev'],[/icon-next/,'reader-next'],[/icon-pause/,'reader-toggle'],[/icon-close/,'close']]:name==='speech-confirm'?[[/播放录音|icon-play/,'play-speech']]:name==='editor'?[[/icon-preview/,'close'],[/icon-save/,'save-draft']]:[];
  for(const [pattern,action]of iconActions)for(const e of root.querySelectorAll('[data-name]'))if(pattern.test(e.dataset.name)){e.dataset.action=action;e.role='button';e.tabIndex=0;if(name==='editor')e.setAttribute('aria-label',action==='close'?'关闭预览':'存草稿');}
  if(name==='editor')for(const e of root.querySelectorAll('[data-node-id="3:6450"],[data-node-id="3:6451"]')){e.dataset.action='close';e.role='button';e.tabIndex=0;e.setAttribute('aria-label','关闭预览');}
  return root.outerHTML;
 }
 return {...helpers,render,nativeCanvas:canvas,nativeDialog};
}
// Match the original Figma text boxes after fonts settle, at source scale.
// Only the source's own layer coordinates and sizes are used; images are never fitted to the viewport.
export function alignNativeLayers(root){
 const rows=geometry[root?.dataset.screen]||[],origin=root?.getBoundingClientRect();if(!origin)return;
 const used=new Set(),nodes=nativeIndex(root);
 for(const m of rows){const all=nodes(m[0],true).filter(e=>!used.has(e));if(!all.length)continue;
  if(all.length>1){const distance=e=>{const b=e.getBoundingClientRect();return Math.abs(b.x-origin.x-m[2])+Math.abs(b.y-origin.y-m[3]);};all.sort((a,b)=>distance(a)-distance(b));}const el=all[0];used.add(el);
  if(el.closest('[data-editor-type-chip]'))continue;
  if(m[1]==='I'&&el.tagName!=='svg'){el.style.width=m[4]+'px';el.style.height=m[5]+'px';}
  if(m[1]==='T'){
   el.style.width=m[4]+'px';el.style.height=(el.dataset.lines?m[5]*Number(el.dataset.lines):m[5])+'px';
   if(el.dataset.fitNumber&&el.textContent.length>1)el.style.fontSize=m[6]*Math.min(1,m[4]/(el.textContent.length*m[6]*.62))+'px';
   if(m[7]?.unit==='AUTO'){
    let lines=1;if(el.tagName!=='INPUT'&&el.tagName!=='TEXTAREA'){const range=document.createRange();range.selectNodeContents(el);const tops=[...range.getClientRects()].map(r=>Math.round(r.top*10));lines=Math.max(1,new Set(tops).size);}el.style.lineHeight=m[5]/lines+'px';
   }
   if(m[7]?.unit==='PERCENT')el.style.lineHeight=m[6]*m[7].value/100+'px';
  }
  const b=el.getBoundingClientRect(),pane=el.closest('[data-scroll-region]'),x=origin.x+m[2]+Number(el.dataset.nativeOffsetX||0)-b.x-(pane?.scrollLeft||0),y=origin.y+m[3]-b.y-(pane?.scrollTop||0);
  if(Math.abs(x)>.02||Math.abs(y)>.02)el.style.translate=x+'px '+y+'px';
 }
}
export function applyNativeTextSize(root,font){
 const factor={large:1.12,extra:1.25}[font];if(!factor||!root)return;
 for(const m of geometry[root.dataset.screen]||[]){if(m[1]!=='T'||!m[6])continue;const id=m[0].split(';').pop();for(const e of root.querySelectorAll('[data-node-id="'+m[0]+'"],[data-node-id="'+id+'"]')){if(e.closest('[data-editor-type-chip]'))continue;e.style.fontSize=m[6]*factor+'px';e.style.overflow='auto';}}
 for(const chip of root.querySelectorAll('[data-editor-type-chip]')){const label=chip.querySelector('p');if(label)label.style.fontSize=(chip.getAttribute('aria-pressed')==='true'?29.848:30.953)*factor+'px';}
}
