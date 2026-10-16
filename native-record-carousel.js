import {mediaSource} from './community-media.js';
import {seedCounts} from './domain.js';
import {bindNativeCardCarousel} from './native-plant-carousel.js';

export const recordScreen=type=>type==='help'?'record-help':type==='seed'?'record-seed':'records';
export const recordKind=url=>['share','help','seed'].includes(url.searchParams.get('kind'))?url.searchParams.get('kind'):'all';
export function nativeRecordCards(state,kind='all'){
 if(!['share','help','seed'].includes(kind))kind='all';
 if(kind==='all'){
  // Show each original card type before continuing with additional records.
  // Empty types keep their read-only design example, just like their filter.
  const groups=['share','help','seed'].map(type=>nativeRecordCards(state,type)),cards=[];
  for(let i=0;i<Math.max(...groups.map(group=>group.length));i++)for(const group of groups)if(group[i])cards.push(group[i]);
  return cards;
 }
 const cards=state.posts.filter(p=>p.author===state.userId&&(kind==='all'||p.type===kind)).map(post=>({key:'post:'+post.id,type:post.type,post}));
 if(kind==='all'||kind==='seed')for(const agreement of state.agreements){
  if(agreement.status==='cancelled'||![agreement.sender,agreement.receiver].includes(state.userId))continue;
  const post=state.posts.find(p=>p.id===agreement.postId);if(post?.type==='seed')cards.push({key:'agreement:'+agreement.id,type:'seed',post,agreement});
 }
 if(cards.length||state.cloud)return cards;
 // Keep the original source example in an empty category. It never grants edit
 // permission or invents a seed agreement for someone else's post.
 const type=kind==='all'?'share':kind,id={share:'scallion',help:'pothos',seed:'lettuce'}[type],post=state.posts.find(p=>p.id===id);
 return post?[{key:'reference:'+type,type,post,reference:true}]:[];
}
export function recordSelection(state,vm,url){
 const kind=recordKind(url),cards=nativeRecordCards(state,kind),index=Math.max(0,cards.findIndex(c=>c.key===vm.recordCarouselKeys?.[kind]));
 return {kind,cards,index,selected:cards[index]};
}

export function completeRecordCard(root,{state,vm,url,assets}){
 const {cards,index,selected}=recordSelection(state,vm,url);
 const card=root.querySelector('[data-name="记录卡片"],[data-name="post-card"]');if(!card)return;
 if(!selected){card.hidden=true;return;}
 const {post,agreement,reference}=selected,type=selected.type;
 card.dataset.recordCard=selected.key;card.dataset.recordRole='card';card.tabIndex=0;card.setAttribute('role','group');card.setAttribute('aria-roledescription','轮播卡片');card.setAttribute('aria-label',(reference?'尚无个人记录，':'')+'我的记录，第'+(index+1)+'张，共'+cards.length+'张，可左右滑动');
 for(const e of card.querySelectorAll('[data-route],[data-action]')){delete e.dataset.route;delete e.dataset.action;e.removeAttribute('role');e.removeAttribute('tabindex');}
 const at=id=>card.querySelector('[data-node-id="'+id+'"]');
 const named=name=>card.querySelector('[data-name="'+name+'"]');
 const put=(e,value)=>{if(e&&e.textContent!==String(value??'')){e.textContent=value??'';e.style.whiteSpace='pre-wrap';e.style.overflowY='auto';}};
 const bind=(e,props,role,label)=>{if(!e)return;Object.assign(e.dataset,props);e.dataset.recordRole=role;e.role='button';e.tabIndex=0;e.classList.add('native-control');if(label)e.setAttribute('aria-label',label);};
 const button=(id,label,props,role)=>{const el=at(id);bind(el,props,role,label);const p=[...card.querySelectorAll('p')].find(e=>e.textContent===label);if(p)bind(p,props,role,label);};
 const image=(el,photo)=>{if(!el||!photo)return;const [screen,key]=photo.split(':'),src=/^(data:image\/|https:\/\/)/.test(photo)?mediaSource(photo):assets[screen]?.[key]?.file,img=el.querySelector('img');if(src&&img)img.src=src;};
 const title=(el,value,width)=>{if(!el)return;for(const img of el.querySelectorAll('img'))img.style.visibility='hidden';const span=document.createElement('span');span.className='native-record-runtime-title';span.textContent=value;span.style.fontSize=Math.min(48,width/Math.max(1,value.length))+'px';el.append(span);};
 const own=post.author===state.userId,edit=own?'/publish?post='+post.id:'/publish?type='+type,view='/post/'+post.id;
 const initial=!post.postId&&post.date!=='刚刚发布';
 if(type==='share'){
  const original=post.id==='scallion'&&initial;
  if(!original){title(at('11:1323'),post.title||'分享近况',256);put(at('11:1315'),post.date?.includes('发布')?post.date:(post.date||'')+'发布');const body=post.body||'';put(at('11:1316'),body.slice(0,10));put(at('11:1322'),body.slice(10,20)+(body.length>20?'…':''));image(at('11:1313'),post.photos?.[0]);}
  put(at('11:1326'),post.likes+' 赞');put(at('11:1327'),post.comments.length+' 评论');
  button('11:1318','编辑内容',{route:edit},'edit');button('11:1320','查看原帖',{route:view},'view');
  bind(at('11:1323'),{route:view},'title',post.title);bind(at('11:1313'),{route:view},'photo','查看'+post.title);
  bind(at('11:1324'),{action:'like',id:post.id},'like','点赞');bind(at('11:1326'),{action:'like',id:post.id},'like','点赞');
  bind(at('11:1325'),{route:view+'?comments=1'},'comments','查看评论');bind(at('11:1327'),{route:view+'?comments=1'},'comments','查看评论');
 }else if(type==='help'){
  if(post.id!=='pothos'||!initial){title(at('3:4789'),post.title||'请邻居帮忙',338);image(at('3:4794'),post.photos?.[0]);put(at('3:4795'),post.date?.includes('发布')?post.date:(post.date||'')+'发布');const last=post.comments.at(-1);put(at('3:4796'),last?(state.users[last.author]?.name||'邻居')+'：'+last.text:post.body?.slice(0,16)||'');put(at('3:4797'),last?'有'+post.comments.length+'条新回复。':'');}
  if(post.status==='resolved')put(at('3:4787'),'已解决');
  if(post.id==='pothos'&&initial&&(post.comments.length!==1||post.comments[0]?.id!=='c4')){const last=post.comments.at(-1);put(at('3:4796'),last?(state.users[last.author]?.name||'邻居')+'：'+last.text:'');put(at('3:4797'),last?'有'+post.comments.length+'条新回复。':'');}
  button('3:4798','补充情况',{route:edit},'edit');button('3:4799','查看进展',{route:view},'view');
  bind(at('3:4789'),{route:view},'title',post.title);bind(at('3:4794'),{route:view},'photo','查看'+post.title);
 }else{
  const original=post.id==='lettuce'&&initial;
  if(!original){title(at('3:4948'),post.seedName||post.title||'种苗分享',264);image(at('3:4953'),post.photos?.[0]);}
  if(agreement){
   const owner=state.users[post.author]?.name||'邻居',quantity=agreement.quantity||1,status={requested:'申请中',reserved:'待交接','single-confirmed':'待交接',completed:'已交接'}[agreement.status]||'待交接';
   put(at('3:4946'),status);put(at('3:4949'),agreement.sender===state.userId?'为'+(state.users[agreement.receiver]?.name||'邻居')+'预留'+quantity+'份':owner+'为你留了'+quantity+'份');put(at('3:4955'),(agreement.date||'').replace(/^\d{4}-0?(\d+)-0?(\d+)$/,'$1月$2日')+' '+(agreement.time||''));put(at('3:4957'),agreement.location);put(at('3:4958'),(agreement.status==='requested'?'已提交申请':'已约好领取')+' · '+quantity+'份');if(agreement.status==='completed')put(at('3:4959'),'交接已完成');
   button('3:4960','联系陈爷爷',{route:'/chat/'+agreement.id},'contact');button('3:4961','查看约定',{route:'/chat/'+agreement.id},'view');
   const contact=at('I3:4960;3:5049');if(contact){put(contact,'联系'+(state.users[agreement.sender===state.userId?agreement.receiver:agreement.sender]?.name||'邻居'));bind(contact,{route:'/chat/'+agreement.id},'contact',contact.textContent);}
  }else if(own){
   put(at('3:4946'),'已发布');put(at('3:4949'),'我的种苗分享');put(at('3:4955'),post.date||'');put(at('3:4957'),post.exchange||'');put(at('3:4958'),'可分享 · '+seedCounts(state,post.id).available+'份');put(at('3:4959'),post.body?.slice(0,12)||'');
   button('3:4960','联系陈爷爷',{route:edit},'edit');button('3:4961','查看约定',{route:view},'view');put(at('I3:4960;3:5049'),'编辑内容');put(at('I3:4961;3:5051'),'查看原帖');
  }else{
   button('3:4960','联系陈爷爷',{route:'/chat/neighbor-'+post.author},'contact');button('3:4961','查看约定',{route:view},'view');
  }
  bind(at('3:4948'),{route:view},'title',post.title);bind(at('3:4953'),{route:view},'photo','查看'+post.title);
 }
 for(const el of card.querySelectorAll('[data-record-role="edit"],[data-record-role="view"],[data-record-role="contact"]')){const label=el.tagName==='P'?el.textContent:el.querySelector('p')?.textContent;if(label)el.setAttribute('aria-label',label);}
 // Move the entire original card in its existing parent's coordinate system.
 const motion=document.createElement('div');motion.dataset.nativeRecordMotion='true';motion.className='native-plant-motion native-record-motion';
 Object.assign(motion.style,{position:'absolute',left:'0',top:'0',width:'750px',height:root.style.height,pointerEvents:'none',touchAction:'pan-y pinch-zoom',transform:'translateX(0px)'});
 card.before(motion);motion.append(card);
}
export function bindNativeRecordCarousel(args){return bindNativeCardCarousel({...args,motionSelector:'[data-native-record-motion]',cardSelector:'[data-record-card]'});}
