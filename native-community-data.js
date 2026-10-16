import {mediaSource} from './community-media.js';
import {seedCounts,activityState,initialState} from './domain.js';
import {exampleChat,exampleChats} from './example-chats.js';
const labels={share:'分享',help:'求助',seed:'种苗赠送'};
export function completeCommunityData(root,{name,state,vm,url,assets}){
 if(!state.cloud)return;
 const at=id=>root.querySelector('[data-node-id="'+id+'"]'),named=pattern=>[...root.querySelectorAll('[data-name]')].filter(e=>pattern.test(e.dataset.name));
 const put=(e,value)=>{if(!e||e.matches('input,textarea,select'))return;e.textContent=value??'';Object.assign(e.style,{whiteSpace:'pre-wrap',overflowY:'auto'});};
 const set=(id,value)=>put(at(id),value);
 const bind=(e,props,label)=>{if(!e)return;delete e.dataset.action;delete e.dataset.route;Object.assign(e.dataset,props);e.setAttribute('role','button');e.tabIndex=0;e.classList.add('native-control');e.setAttribute('aria-label',label||e.textContent||e.dataset.name||'打开');};
 const image=(el,photo)=>{const img=el?.querySelector('img');if(!img||!photo)return;const [screen,key]=photo.split(':'),src=/^(data:image\/|https:\/\/)/.test(photo)?mediaSource(photo):assets[screen]?.[key]?.file;if(src)img.src=src;};
 const picker=(old,options,kind,label)=>{if(!old||!options.length)return;const e=document.createElement('select');e.className=old.className+' native-input';e.style.cssText=old.style.cssText;e.dataset.nodeId=old.dataset.nodeId;e.dataset[kind]='true';e.setAttribute('aria-label',label);for(const [value,text]of [['',kind==='messagePicker'?'互动通知':kind==='cloudConversationSelect'?'邻居聊天':old.options?.[0]?.textContent||old.textContent],...options]){const o=document.createElement('option');o.value=value;o.textContent=text;e.append(o);}old.replaceWith(e);return e;};
 for(const e of root.querySelectorAll('[data-action=follow]'))if(['li','wang','chen'].includes(e.dataset.id))e.dataset.id='sample-'+e.dataset.id;
 const pid=url.pathname.split('/')[2],post=state.posts.find(p=>p.id===pid);
 if(name==='home'){const featured=['herbs','repot'].map(id=>state.activities.find(a=>a.id===id));for(const [i,ids]of [['11:1476','11:1480','11:1494','11:1495','11:1496','11:1497'],['11:1498','11:1502','11:1516','11:1517','11:1518','11:1519']].entries()){const a=featured[i],card=at(ids[0]);if(!a){if(card)card.hidden=true;continue;}const st=activityState(state,a.id),date=/^\d{4}-(\d{2})-(\d{2})$/.exec(a.date),day=date?Number(date[1])+'月'+Number(date[2])+'日':a.date;set(ids[1],a.organizer==='青禾社区官方组织'?'青禾社区':a.organizer);set(ids[2],a.title);set(ids[3],day+(i===0?' '+a.time.split(/[—–-]/)[0]:''));if(at(ids[3]))at(ids[3]).title=a.date+' '+a.time;set(ids[4],a.location);set(ids[5],st.count+'人已报名');for(const e of card.querySelectorAll('[data-route],[data-action]'))bind(e,{route:'/activity/'+a.id},'查看活动：'+a.title);}}
 if(['profile','plants','records','record-help','record-seed','profile-edit'].includes(name))for(const e of named(/头像|^avatar-photo/))if(!/描边|border|底色/.test(e.dataset.name))image(e,vm.avatarPhoto||state.users[state.userId]?.avatar);
 if(name==='circle'||name==='circle-near'){
  const near=name==='circle-near',posts=state.posts.filter(p=>!near||p.type==='seed').sort((a,b)=>Number(!!a.sample)-Number(!!b.sample)||(b.createdAt||0)-(a.createdAt||0)||(a.id===(near?'lettuce':'mint')?-1:1));
  const selected=posts.find(p=>p.id===vm.cloudFeedKeys?.[name])||posts[0];
  if(selected){
   root.dataset.cloudFeedPost=selected.id;const u=state.users[selected.author];
   set(near?'3:5627':'11:1641',u?.name||'邻居');
   if(!selected.sample||selected.id!==(near?'lettuce':'mint')){set(near?'3:5628':'11:1642',selected.date);set(near?'3:5629':'11:1643',selected.body||selected.title);}
   set(near?'3:5630':'11:1644',selected.likes);set(near?'3:5631':'11:1645',selected.comments.length);
   put(near?at('I3:5611;3:5670'):at('11:1635'),labels[selected.type]);
   const group=at(near?'3:5605':'11:1615');for(const e of group?.querySelectorAll('[data-action=like]')||[])bind(e,{action:'like',id:selected.id},state.liked.includes(selected.id)?'取消点赞':'点赞');
   for(const e of group?.querySelectorAll('[data-action=follow]')||[])bind(e,{action:'follow',id:selected.author},'关注'+u?.name);
   put(at(near?'I3:5612;3:5664':'11:1628'),state.following.includes(selected.author)?'已关注':'关注');
   for(const e of group?.querySelectorAll('[data-route]')||[])if(e.dataset.route.startsWith('/post/'))bind(e,{route:'/post/'+selected.id+(e.dataset.route.includes('comments')?'?comments=1':'')},selected.title);
   for(const e of named(near?/^avatar-chen／/:/^author-avatar／/)){image(e,u?.avatar);bind(e,{route:'/chat/neighbor-'+selected.author},'与'+u?.name+'聊天');}
   bind(at(near?'3:5627':'11:1641'),{route:'/chat/neighbor-'+selected.author},'与'+u?.name+'聊天');
   const slots=named(near?/^lettuce-(trays|close|handoff|neighbors)/:/^post-photo/);if(!selected.sample)slots.forEach((e,i)=>{if(selected.photos[i])image(e,selected.photos[i]);else e.hidden=true;bind(e,{route:'/post/'+selected.id},'查看'+selected.title);});
   picker(at(near?'I3:5607;3:5675':'11:1638'),posts.map(p=>[p.id,p.title]),'cloudPostSelect','选择植物圈帖子');
  }
 }
 if(['post','help-post','help-resolved','seed-post'].includes(name)&&post){
  const u=state.users[post.author],author=name==='post'?'3:4480':name==='seed-post'?'3:4572':name==='help-resolved'?'3:5290':'11:1153';set(author,u?.name||'邻居');bind(at(author),{route:'/chat/neighbor-'+post.author},'与'+u?.name+'聊天');
  for(const e of root.querySelectorAll('[data-route^="/publish?post="]'))if(post.author!==state.userId)e.hidden=true;
  for(const e of named(/author-avatar|作者头像/))image(e,u?.avatar);
  if(name==='post')set('3:4504',post.likes);else if(name.startsWith('help'))set('11:1184',post.likes);
  if(name==='seed-post'){const counts=seedCounts(state,post.id);set('3:4592',counts.available);set('3:4594',counts.reserved);set('3:4578','共'+counts.total+'份');}
  const comments=post.comments,latest=comments.find(c=>c.id===vm.selectedCommentId)||comments.at(-1),prior=comments.at(-2);
  if(!post.sample){const slots=named(name==='post'?/^照片／小葱正文|^照片／手拿小葱/:name==='seed-post'?/^照片／生菜种子|^照片／种子散落/:/^pothos-(window|yellow-leaf|soil|cover|leaf)／/),offset=vm.postPhotoOffsets?.[pid]||0;slots.forEach((e,i)=>{const photo=post.photos[(offset+i)%post.photos.length];if(photo){image(e,photo);bind(e,{action:'photo-next',id:pid},'翻看帖子照片');}else e.hidden=true;});}
  for(const [id,c]of name==='post'?[['3:4515',prior],['3:4520',latest],['3:4533',prior],['3:4537',latest]]:name==='help-post'?[['11:1191',latest],['11:1193',latest]]:name==='seed-post'?[['3:4610',latest],['3:4611',latest]]:[['3:5314',prior],['3:5320',latest]]){const e=at(id);if(!e)continue;if(c){image(e,state.users[c.author]?.avatar);bind(e,{route:'/chat/neighbor-'+c.author},'与留言邻居聊天');}else{delete e.dataset.route;delete e.dataset.action;e.removeAttribute('role');e.removeAttribute('tabindex');}}
  if(name==='post'){set('3:4513',comments.length+'条');set('3:4533',prior?state.users[prior.author]?.name:'');set('3:4535',prior?.text||(!latest?'还没有留言':''));set('3:4537',latest?state.users[latest.author]?.name:'');set('3:4539',latest?.text||'');set('3:4518',prior?'刚刚':'');set('3:4523',latest?'刚刚':'');}
  if(name==='help-post'){set('11:1189','邻居留言 · '+comments.length+'条');set('11:1193',latest?state.users[latest.author]?.name:'');set('11:1194',latest?.text||'还没有留言');set('11:1195','');}
  if(name==='seed-post'){set('3:4608','邻居留言 · '+comments.length+'条');set('3:4611',latest?state.users[latest.author]?.name:'暂无留言');set('3:4613',latest?'刚刚':'');}
  const targets=comments.map(c=>[c.id,(state.users[c.author]?.name||'邻居')+'：'+c.text]);if(targets.length>1)picker(at(name==='post'?'3:4511':name==='seed-post'?'3:4608':name==='help-resolved'?'3:5308':'11:1189'),targets,'commentPicker','翻看全部留言');
 }
 if(name==='messages'){
  const all=state.messages.filter(n=>url.searchParams.get('tab')!=='seed'||n.kind==='seed').filter(n=>url.searchParams.get('tab')!=='system'||['system','activity'].includes(n.kind));
  const ids=[['11:1698','11:1703','11:1706','11:1712','11:1713','11:1714','11:1715'],['11:1716','11:1721','11:1724','11:1730','11:1731','11:1732','11:1733'],['11:1734','11:1739','11:1747','11:1746','11:1748','11:1749','11:1750']];
  ids.forEach(([card,badge,quote,user,title,read,time],i)=>{
   const n=all[i],node=at(card);if(!node)return;if(!n){node.hidden=true;return;}
   const actor=Object.values(state.users).find(u=>u.name&&n.title?.startsWith(u.name)),date=new Date(n.createdAt);
   set(badge,{chat:'邻居消息',seed:'种苗约定',like:'收到点赞',activity:'活动提醒',comment:'收到留言',system:'社区通知'}[n.kind]||'社区通知');
   set(user,actor?.name||'青禾社区');
   if(i<2){set(title,n.text||n.title);set(quote,n.kind==='chat'?'邻居私聊':n.title);set(read,n.read?'已读':'未读');}
   else{
    // The third original card has a clock and location row, not a reply quote.
    set(quote,n.kind==='chat'?'发来新消息':n.title);
    set(title,date.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}));
    set(read,n.read?'已读':'未读');
   }
   set(time,(date.getMonth()+1)+'/'+date.getDate());
   for(const e of [node,...node.querySelectorAll('[data-route],[data-action]')])bind(e,{action:'notification',id:n.id},n.title);
   for(const dot of node.querySelectorAll('[data-name*="unread-dot"]'))dot.hidden=n.read;
  });
  picker(at('11:1755'),all.map(n=>[n.id,n.title]),'messagePicker','查看全部通知');
  if(!all.length)set('11:1755','暂无新通知');
  const conversations=[...(state.conversations||[])].sort((a,b)=>Math.max(b.createdAt||0,...state.chats.filter(m=>m.conversation===b.id).map(m=>m.createdAt))-Math.max(a.createdAt||0,...state.chats.filter(m=>m.conversation===a.id).map(m=>m.createdAt))),example=exampleChat(vm.cloudConversationId)||(!conversations.length?exampleChats[0]:null),c=example?null:conversations.find(c=>c.id===vm.cloudConversationId)||conversations[0],chat=at('11:1757');
  if(example){set('11:1766',example.name);set('11:1767',example.preview);set('11:1761','历史对话');set('11:1768','已归档');for(const e of [chat,...chat.querySelectorAll('[data-route],[data-action]')])bind(e,{route:'/chat/'+example.id},'查看'+example.name+'历史对话');const avatar=state.users['sample-'+example.person]?.avatar||example.avatar;image(named(/^chat-avatar／/)[0],avatar);}
  if(chat&&!example){if(!c)chat.hidden=true;else{const other=state.users[c.peerId],last=state.chats.filter(m=>m.conversation===c.id).at(-1),a=state.agreements.find(a=>a.id===c.id);set('11:1766',other?.name||'邻居');set('11:1767',last?.text||'还没有消息，点击开始交流');set('11:1761',a?(state.posts.find(p=>p.id===a.postId)?.seedName||'种苗约定'):'邻居私聊');set('11:1768',last&&last.author!==state.userId&&last.createdAt>c.readAt?'未读':'已读');for(const e of [chat,...chat.querySelectorAll('[data-route],[data-action]')])bind(e,{route:'/chat/'+c.id},'查看与'+other?.name+'的聊天');image(named(/^chat-avatar／/)[0],other?.avatar);}}
  const conversationPicker=picker(at('11:1770'),[...conversations.map(c=>[c.id,state.users[c.peerId]?.name||'邻居']),...exampleChats.map(c=>[c.id,c.name+'（已归档）'])],'cloudConversationSelect','选择邻居对话');if(conversationPicker&&vm.cloudConversationId){conversationPicker.value=vm.cloudConversationId;for(const option of conversationPicker.options)option.selected?option.setAttribute('selected',''):option.removeAttribute('selected');}
  const own=state.posts.find(p=>p.author===state.userId),share=at('11:1772');if(share){if(!own)share.hidden=true;else{set('11:1784',state.users[state.userId].name);set('11:1785',own.title);set('11:1786',own.body);set('11:1787','');set('11:1788','');for(const e of share.querySelectorAll('[data-route]'))bind(e,{route:'/post/'+own.id},'查看我的帖子');}}
 }
 if(name==='chat'||name==='chat-complete'){
  const c=state.conversations.find(c=>c.id===pid),other=state.users[c?.peerId],a=state.agreements.find(a=>a.id===pid),header=at(name==='chat'?'11:1215':'3:4676');put(header,other?.name||'邻居');
  if(header&&(other?.name||'邻居').length>3)header.dataset.chatTitle='true';
  if(!a)root.dataset.chatKind='direct';
  const input=root.querySelector('form[data-form=chat] [name=text]');if(input)input.placeholder='给'+(other?.name||'邻居')+'发消息...';
  if(!a){for(const id of ['11:1239','11:1263','11:1234','11:1235','11:1236','11:1237'])if(at(id))at(id).hidden=true;}
  else if(name==='chat'){
   const post=state.posts.find(p=>p.id===a.postId),isSender=a.sender===state.userId,confirmed=a[(isSender?'sender':'receiver')+'Confirmed'],otherConfirmed=a[(isSender?'receiver':'sender')+'Confirmed'],pending=!!a.pending;
   set('11:1243',post?.seedName||post?.title||'种苗');set('11:1244',(state.users[a.sender]?.name||'邻居')+'赠送');set('11:1252',a.status==='cancelled'?'约定已取消':a.status==='requested'?'申请中 · 1份':a.status==='completed'?'交接已完成':'已约好领取 · 1份');set('11:1253',a.status==='requested'?'双方确认时间地点后才会预留':'当前约定的种苗已预留');
   const value=a.pending||a;set('11:1256',value.date?value.date+' '+value.time:'请先提出时间');set('11:1258',value.location||'请先提出地点');
   const status=at('11:1235');put(status,a.status==='cancelled'?'约定已取消':pending?a.proposedBy===state.userId?'等待对方确认时间地点':'请确认新的时间地点':a.status==='requested'?'请先修改约定时间地点':'双方已确认约定');
   if(pending&&a.proposedBy!==state.userId)bind(status,{action:'reserve',id:a.id},'确认当前时间地点');else{delete status.dataset.action;delete status.dataset.route;status.removeAttribute('role');status.tabIndex=-1;}
   set('11:1265',a.status==='completed'?'交接确认：双方均已确认':confirmed?'您已确认，等待对方确认':otherConfirmed?'对方已确认，请核实交接':'交接确认：双方均未确认');set('11:1267',confirmed?'您已确认交接':isSender?'见面交接后，我确认送出':'见面交接后，我确认收到');
   for(const e of root.querySelectorAll('[data-action=handoff]')){e.dataset.id=a.id;delete e.dataset.demo;e.dataset.role=isSender?'sender':'receiver';const disabled=pending||confirmed||!['reserved','single-confirmed'].includes(a.status);e.setAttribute('aria-disabled',String(disabled));e.setAttribute('aria-label',confirmed?'您已确认交接':isSender?'确认送出种苗':'确认收到种苗');}
   if(vm.editAgreementId===a.id){for(const [id,key,label,text]of [['11:1256','agreementTime','约定日期和时间',(value.date||new Date().toLocaleDateString('en-CA'))+' '+(value.time||'15:00')],['11:1258','agreementLocation','约定地点',value.location||'']]){let field=root.querySelector('[name='+key+']');if(!field){const old=at(id);if(!old)continue;field=document.createElement('input');field.className=old.className+' native-input';field.style.cssText=old.style.cssText;field.dataset.nodeId=old.dataset.nodeId;field.name=key;field.setAttribute('aria-label',label);old.replaceWith(field);}field.value=text;field.setAttribute('value',text);}}
   for(const e of root.querySelectorAll('[data-action=reserve],[data-action=handoff],[data-action=edit-agreement],[data-action=cancel-agreement]'))e.dataset.version=String(a.version);
  }
  if(a&&name==='chat-complete'){const p=state.posts.find(p=>p.id===a.postId);if(p&&p.seedName!=='生菜种子'){const title=at('3:4694');put(title,p.seedName);if(title)Object.assign(title.style,{fontSize:'48px',fontWeight:'700',color:'#ff6a00'});}set('3:4696',(state.users[a.sender]?.name||'邻居')+'赠送');set('3:4704','已完成交接 · '+a.quantity+'份');set('3:4706',a.date+' '+a.time);set('3:4708',a.location);set('3:4716',state.users[a.receiver]?.name);set('3:4719',state.users[a.sender]?.name);set('3:4718','');set('3:4721','');for(const e of root.querySelectorAll('[data-action=add-seed-plant]')){e.dataset.id=a.id;if(a.receiver!==state.userId)e.hidden=true;}if(a.receiver!==state.userId)set('3:4742','双方已完成交接');if(p?.photos[0])image(at('3:4702'),p.photos[0]);}
 }
 if(name==='following'){
  const followed=state.following.map(id=>state.users[id]).filter(Boolean),chosen=followed.find(u=>u.id===vm.cloudFollowingId)||followed[0],people=chosen?[chosen,...followed.filter(u=>u.id!==chosen.id)]:[],available=Object.values(state.users).filter(u=>!u.sample&&!u.disabled&&u.id!==state.userId&&u.id!=='guest');
  picker(at('39:1206'),available.map(u=>['/chat/neighbor-'+u.id,u.name]),'routePicker','选择邻居聊天');
  if(followed.length>2)picker(at('39:1204'),followed.map(u=>[u.id,u.name]),'cloudFollowingSelect','翻看关注的邻居');
  for(let i=0;i<2;i++){const u=people[i],p=u&&state.posts.find(p=>p.author===u.id),first=i?1222:1207,last=i?1236:1221;for(let n=first;n<=last;n++){const e=at('39:'+n);if(e)e.hidden=!u;}if(!u)continue;const avatar=at(i?'39:1223':'39:1208'),photo=at(i?'39:1231':'39:1216');image(avatar,u.avatar);bind(avatar,{route:'/chat/neighbor-'+u.id},'与'+u.name+'聊天');if(p?.photos[0]){image(photo,p.photos[0]);bind(photo,{route:'/post/'+p.id},'查看'+p.title);}else if(photo)photo.hidden=true;for(const n of i?[1227,1228,1229]:[1212,1213,1214]){const e=at('39:'+n);if(p)bind(e,{action:'favorite',key:'post:'+p.id},'收藏'+p.title);else if(e)e.hidden=true;}}
  if(!people.length)set('39:1200','还没有关注邻居，可从植物圈或搜索找到邻居。');
  for(const [i,ids]of [['39:1209','39:1211','39:1215','39:1217','39:1218','39:1219','39:1220','39:1221'],['39:1224','39:1226','39:1230','39:1232','39:1233','39:1234','39:1235','39:1236']].entries()){
   const u=people[i],p=u&&state.posts.find(p=>p.author===u.id);set(ids[0],u?.name||'');set(ids[1],u?'已关注':'');set(ids[2],p?.body||(!people.length&&i===0?'还没有关注邻居，可从植物圈作者或搜索进入':''));set(ids[3],p?.date||'');set(ids[5],p?.likes||'');set(ids[7],p?.comments.length||'');if(u){bind(at(ids[0]),{route:'/chat/neighbor-'+u.id},'与'+u.name+'聊天');bind(at(ids[1]),{action:'follow',id:u.id},'取消关注'+u.name);}if(p){bind(at(ids[4]),{action:'like',id:p.id},'点赞');bind(at(ids[6]),{route:'/post/'+p.id+'?comments=1'},'查看留言');}else{for(const id of [ids[4],ids[6]])if(at(id))at(id).hidden=true;}}
 }
 if(name==='help'&&url.searchParams.get('topic')==='privacy'){set('39:1727','私聊仅对参与者可见；隐私选项控制个人介绍。');root.querySelector('[data-privacy-picker]')?.setAttribute('aria-label','个人介绍和兴趣的可见范围');}
 if(name==='help'&&url.searchParams.get('topic')==='policy'){set('39:1763','账号和社区记录由共享服务保存；验证码由管理员审核发放，不发送真实短信。');}
 if(name==='feedback'&&state.feedback.length){const latest=state.feedback[0];set('39:1708','最近反馈：'+({pending:'待处理',processing:'处理中',resolved:'已解决'}[latest.status]||latest.status)+(latest.reply?' · '+latest.reply:''));if(state.feedback.length>1)picker(at('39:1686'),state.feedback.map(f=>[f.id,f.body.slice(0,20)+' · '+({pending:'待处理',processing:'处理中',resolved:'已解决'}[f.status]||f.status)+(f.reply?'：'+f.reply:'')]),'feedbackStatusSelect','查看反馈处理状态');}
}
