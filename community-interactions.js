import {createCommunityClient} from './community-client.js';
import {createMonitorClient} from './monitor-client.js';
import {postTitle,validateText} from './interaction.js';

export function installSharedCommunity(h){
 const {store,auth,vm,getRoute,navigate,refresh,toast,capture,values,completeForm,closeModal,getModal,fieldError,finishEditorExit,goBack}=h;
 let pendingRender=false,renderTimer=null,readConversation=null,readPending=false,chatDirty=false,historyBusy=false;const older=new Map(),historyEnded=new Set();
 const preserve=next=>{let saved;try{saved=JSON.parse(localStorage.getItem('qinghe-shared-device:'+next.userId))?.users?.[next.userId];}catch{}for(const [id,u]of Object.entries(next.users))for(const key of ['cognitiveOnboarding','cognitiveAssessments']){if(id!==next.userId||!next.loggedIn){delete u[key];continue;}const value=store.data.users[id]?.[key]??(id===next.userId?saved?.[key]:undefined);if(key==='cognitiveAssessments'){if(value||u[key])u[key]=[...new Map([...(value||[]),...(u[key]||[])].map(a=>[a.assessmentId,a])).values()];}else if(value&&(!u[key]||value.seenAt>u[key].seenAt))u[key]=value;}return next;};
 const client=createCommunityClient({auth,storage:sessionStorage,getRoute,onState(next,source){
  const previous=store.data;for(const [cid,messages]of older){if(!next.conversations.some(c=>c.id===cid)){older.delete(cid);continue;}next.chats=[...new Map([...messages,...next.chats].map(m=>[m.id,m])).values()].sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id));}
  store.data=preserve(next);if(previous.loggedIn&&previous.userId!==next.userId){vm.forms={};vm.composer=null;vm.composerKey=null;vm.dirty=false;}
  if(source==='sync'||source==='bootstrap'&&document.querySelector('.native-canvas')){pendingRender=true;chatDirty=true;renderWhenSafe();markRead();}
 },onError(error){toast(error.message);}});
 function renderWhenSafe(){if(!pendingRender||!document.querySelector('#main'))return;if(document.activeElement?.matches('input,textarea,select')||document.querySelector('[data-plant-dragging=true]')||client.busy||getModal()){
  if(chatDirty&&getRoute().startsWith('/chat/')&&!getModal()&&!client.busy){const stream=document.querySelector('.chat-history');if(stream&&h.renderNative){const parent=stream.parentElement,scroll=parent.scrollTop,follow=vm.chatFollow,container=document.createElement('div');container.innerHTML=h.renderNative(getRoute(),vm).html;const next=container.querySelector('.chat-history');if(next){stream.replaceChildren(...next.childNodes);stream.style.height=next.style.height;chatDirty=false;if(follow)h.scrollToChatLatest();else parent.scrollTop=scroll;}}}
  clearTimeout(renderTimer);renderTimer=setTimeout(renderWhenSafe,300);return;}pendingRender=false;capture();const follow=vm.chatFollow;refresh();vm.chatFollow=follow;}
 function login(){if(store.data.loggedIn&&auth.hasSession())return true;navigate('/login?returnTo='+encodeURIComponent(getRoute()));return false;}
 const version=id=>store.data.agreements.find(a=>a.id===id)?.version;
 const displayedVersion=e=>e.dataset.version!==undefined?Number(e.dataset.version):version(e.dataset.id);
 async function run(type,id,payload={},v){if(!login())throw Error('请登录后继续');const input=document.querySelector('form [data-input-mode=voice_transcript]'),context={page:new URL(getRoute(),'https://qinghe.local').pathname,inputMode:input?'voice_transcript':'typed',authorship:type==='post.save'&&!vm.composer?.bodyEdited?'unknown':'self_reported',cue:'present'};try{return await client.command(type,id,payload,v,context);}catch(error){if(!type.startsWith('monitor.'))monitor.event('ui_error',{page:context.page});throw error;}}
 const settings=p=>run('settings.save',null,p);
 async function saveDraft(){capture();const draft=await run('draft.save',vm.composer.draftId||null,vm.composer);vm.composer.draftId=draft.id;vm.dirty=false;h.preserveRecovery();toast('草稿已保存至账号');return draft;}
 async function publish(){capture();if(!login())return;vm.composer.title=postTitle(vm.composer);const wasEdit=!!vm.composer.postId;const post=await run('post.save',vm.composer.postId||null,vm.composer);vm.dirty=false;sessionStorage.removeItem(h.recoveryKey('qinghe-editor-recovery'));vm.composer=null;vm.composerKey=null;if(getModal())closeModal(false);navigate(wasEdit?'/post/'+post.id:'/success/'+post.id,{replace:true,allow:true});toast(wasEdit?'修改已保存':'发布成功');}
 async function chatRoute(route){if(!login())return;if(route.startsWith('/chat/neighbor-')){let target=route.slice('/chat/neighbor-'.length);if(!store.data.users[target]&&store.data.users['sample-'+target])target='sample-'+target;const c=await run('chat.open',target);navigate('/chat/'+c.id);return;}const id=route.slice(6).split('?')[0];if(!store.data.conversations.some(c=>c.id===id))throw Error('这是原稿示例入口，请从真实邻居或种苗申请进入对话');navigate(route);}
 const actions={
  'like':e=>run('post.like',e.dataset.id,{active:!store.data.liked.includes(e.dataset.id)}),
  'favorite':e=>run('favorite.set',e.dataset.key,{active:!store.data.favorites.includes(e.dataset.key)}),
  'follow':e=>run('follow.set',e.dataset.id,{active:!store.data.following.includes(e.dataset.id)}),
  'seasonal-like':()=>run('seasonal.like',null,{active:!store.data.settings.seasonalLiked}),
  'book':e=>run('activity.book',e.dataset.id),
  'cancel-booking':e=>run('activity.cancel',e.dataset.id),
  'confirm-cancel-booking':async e=>{await run('activity.cancel',e.dataset.id);closeModal();},
  'resolve':e=>run('post.resolve',e.dataset.id,{resolved:store.data.posts.find(p=>p.id===e.dataset.id)?.status!=='resolved'}),
  'request-seed':async e=>{const a=await run('seed.request',e.dataset.id);navigate('/chat/'+a.id);},
  'open-seed-chat':async e=>{const a=await run('seed.request',e.dataset.id);navigate('/chat/'+a.id);},
  'reserve':e=>run('agreement.accept',e.dataset.id,{},displayedVersion(e)),
  'handoff':e=>run('agreement.handoff',e.dataset.id,{},displayedVersion(e)),
  'confirm-handoff':async e=>{await run('agreement.handoff',e.dataset.id,{},version(e.dataset.id));closeModal();},
  'cancel-agreement':e=>run('agreement.cancel',e.dataset.id,{},version(e.dataset.id)),
  'confirm-cancel-agreement':async e=>{await run('agreement.cancel',e.dataset.id,{},version(e.dataset.id));closeModal();},
  'edit-agreement':async e=>{const id=e.dataset.id;if(vm.editAgreementId!==id){vm.editAgreementId=id;return;}const datetime=document.querySelector('[name=agreementTime]')?.value||'',m=/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})$/.exec(datetime),location=document.querySelector('[name=agreementLocation]')?.value||'';if(!m)throw Error('请输入日期和时间，例如2026-10-20 15:00');await run('agreement.propose',id,{date:m[1],time:m[2],location},displayedVersion(e));vm.editAgreementId=null;},
  'add-seed-plant':async e=>{const p=await run('plant.from-agreement',e.dataset.id,{},version(e.dataset.id));navigate('/plant/'+p.id);},
  'delete-plant':async e=>{await run('plant.delete',e.dataset.id);closeModal(false);navigate('/me',{replace:true});},
  'save-draft':saveDraft,
  'save-exit':async()=>{await saveDraft();finishEditorExit();},
  'publish-preview':async()=>{if(getModal()?.context.form==='record'){closeModal(false);document.querySelector('form[data-form=record]')?.requestSubmit();}else await publish();},
  'confirm-delete-draft':async()=>{await run('draft.delete',null,{ids:getModal().context.ids});vm.selected.clear();closeModal();},
  'batch-favorite':async()=>{await run('favorites.remove',null,{targets:[...vm.selected]});vm.selected.clear();},
  'read-all':()=>run('notifications.read',null),
  'notification':async e=>{const n=store.data.messages.find(m=>m.id===e.dataset.id);if(!n)throw Error('通知不存在');await run('notifications.read',n.id);navigate(n.to);},
  'notification-switch':e=>settings({notifications:{...store.data.settings.notifications,[e.dataset.key]:!store.data.settings.notifications[e.dataset.key]}}),
  'native-apply-font':async()=>{await settings({font:vm.fontChoice||store.data.settings.font,fontSaved:true});goBack();},
  'apply-font':async()=>{await settings({font:getModal().context.value,fontSaved:true});closeModal();},
  'reset-font':async()=>{await settings({font:'standard',fontSaved:true});closeModal();},
  'speech-rate':e=>settings({speechRate:Number(e.dataset.value)}),
  'privacy':e=>settings({privacy:e.dataset.value}),
  'save-record-draft':()=>{const form=document.querySelector('form[data-form=record]');return settings({recordDrafts:{...store.data.recordDrafts,[form.dataset.id]:values(form)}});},
  'chat-older':async e=>{const id=e.dataset.id,all=store.data.chats.filter(m=>m.conversation===id);const pane=h.scrollPane(),y=pane?.scrollTop||0,height=pane?.scrollHeight||0;const data=await client.older(id,all.length?all[0].createdAt+'|'+all[0].id:Number.MAX_SAFE_INTEGER);older.set(id,[...new Map([...(older.get(id)||[]),...data.messages].map(m=>[m.id,m])).values()]);store.data.chats=[...new Map([...data.messages,...store.data.chats].map(m=>[m.id,m])).values()].sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id));vm.chatVisible={...vm.chatVisible,[id]:(vm.chatVisible?.[id]||30)+30};refresh();const current=h.scrollPane();if(current)current.scrollTop=y+(current.scrollHeight-height);},
  'reset-data':()=>{toast('云端记录按账号保存，不会恢复为虚构数据。退出登录可清除当前会话。');},
  'confirm-reset':async()=>{await client.bootstrap();closeModal(false);navigate('/',{replace:true,allow:true});},
  'logout':async()=>{capture();h.preserveRecovery();const revocation=auth.logout();vm.forms={};vm.composer=null;vm.composerKey=null;vm.dirty=false;vm.authChallenge=null;vm.loginAgree=false;sessionStorage.removeItem(h.recoveryKey('qinghe-editor-recovery'));store.data={...store.data,userId:'guest',loggedIn:false,plants:[],drafts:[],bookings:[],agreements:[],messages:[],chats:[],conversations:[],favorites:[],liked:[],following:[],feedback:[],recordDrafts:{}};navigate('/login',{allow:true});void revocation;client.bootstrap().then(()=>refresh()).catch(()=>{});}
 };
 const onClick=event=>{
  if(event.target.closest('input,textarea,select'))return;const e=event.target.closest('[data-action],[data-route]');if(!e)return;
  if(event.target.closest('[data-record-card],[data-native-plant-motion]')&&Date.now()<Number(document.documentElement.dataset.swipeUntil||0)){event.preventDefault();event.stopImmediatePropagation();return;}
  const route=e.dataset.route,fn=actions[e.dataset.action];if(['reader-rate','reader-start'].includes(e.dataset.action)){const rate=Number(e.dataset.value||e.dataset.rate);if(rate&&auth.hasSession())settings({speechRate:rate}).catch(error=>toast(error.message));return;}if(!fn&&!route?.startsWith('/chat/'))return;event.preventDefault();event.stopImmediatePropagation();capture();
  if(e.getAttribute('aria-disabled')==='true'||e.disabled)return;
  if(!['logout','reset-data','confirm-reset'].includes(e.dataset.action)&&!login())return;
  const actionRoute=getRoute();e.setAttribute('aria-busy','true');Promise.resolve().then(()=>fn?fn(e):chatRoute(route)).then(()=>{if(getRoute()===actionRoute&&!['chat-older','save-draft','save-record-draft','reset-data'].includes(e.dataset.action))refresh();}).catch(error=>toast(error.message)).finally(()=>e.removeAttribute('aria-busy'));
 };
 const forms=new Set(['publish','plant','plant-edit','record','comment','chat','seasonal-comment','agreement','profile','feedback','quiet-time']);
 async function submit(form){capture();if(!login())return;const f=values(form),kind=form.dataset.form,id=form.dataset.id,route=getRoute();
  switch(kind){
   case 'publish':await publish();return;
   case 'plant':{const p=await run('plant.save',null,{name:f.name,date:f.date.replace(/年|月/g,'-').replace('日',''),location:vm.plantLocation||f.location,source:f.source,photo:vm.plantPhoto||'plant-new:img2'});vm.plantPhoto=null;vm.plantLocation='阳台';navigate('/plant/'+p.id+'/success',{replace:true});break;}
   case 'plant-edit':{const old=store.data.plants.find(p=>p.id===id);await run('plant.save',id,{name:f.name,date:f.date,location:vm.plantLocation||f.location,source:f.source,photo:vm.plantPhoto||old?.photo});vm.plantPhoto=null;navigate('/plant/'+id,{replace:true});break;}
   case 'record':{let target=id;if(id==='reference-mint'||id==='mint-reference'){const p=await run('plant.save',null,{name:'薄荷盆栽',date:'2026-09-12',location:'阳台',source:'自己种的',photo:'plant-detail:imgPhotoMintPotPng'});target=p.id;}await run('plant.record',target,{title:f.title||f.body?.slice(0,20),date:f.date,body:f.body,photo:vm.recordPhoto});vm.recordPhoto=null;navigate('/plant/'+target,{replace:true});break;}
   case 'comment':await run('post.comment',id,{text:validateText(f.text,500,'留言')});break;
   case 'chat':await run('chat.send',id,{text:validateText(f.text,500,'消息')});vm.chatFollow=true;break;
   case 'seasonal-comment':await run('seasonal.comment',String(vm.seasonalWorkIndex||0),{text:validateText(f.text,500,'留言')});break;
   case 'agreement':await run('agreement.propose',id,{date:f.date,time:f.time,location:f.location},version(id));closeModal();break;
   case 'profile':{const old=store.data.users[store.data.userId];await run('profile.save',null,{name:f.name,intro:f.intro0!==undefined?[f.intro0,f.intro1].join('\n'):old.intro,interests:vm.profileInterests||old.interests,avatar:vm.avatarPhoto||old.avatar});vm.avatarPhoto=null;navigate('/me',{replace:true});break;}
   case 'feedback':await run('feedback.send',null,{type:vm.feedbackType,body:f.body,contact:f.contact,photos:vm.feedbackPhotos});vm.feedbackBody='';vm.feedbackContact='';vm.feedbackPhotos=[];toast('反馈已提交，社区管理后台可以查看');break;
   case 'quiet-time':await settings({quietStart:f.start,quietEnd:f.end});break;
  }
  completeForm(form);delete vm.forms[route+'|'+kind];form.reset();if(getRoute()===route)refresh();if(kind==='chat')h.scrollToChatLatest();
 }
 const onSubmit=event=>{if(!forms.has(event.target.dataset.form))return;event.preventDefault();event.stopImmediatePropagation();const form=event.target;if(form.dataset.cloudSubmitting)return;form.dataset.cloudSubmitting='true';submit(form).catch(error=>{fieldError(form,error.message);toast(error.message);}).finally(()=>delete form.dataset.cloudSubmitting);};
 const onChange=event=>{const e=event.target;if(e.dataset.cloudFollowingSelect){event.stopImmediatePropagation();vm.cloudFollowingId=e.value;refresh();return;}if(e.dataset.routePicker&&e.value.startsWith('/chat/')){event.stopImmediatePropagation();chatRoute(e.value).catch(error=>toast(error.message));return;}if(!e.matches('[data-privacy-picker],[data-native-quiet],[data-message-picker]'))return;event.stopImmediatePropagation();capture();let task;if(e.dataset.privacyPicker)task=settings({privacy:e.value});else if(e.dataset.nativeQuiet){const m=/^(\d{2}:\d{2})\s*[—–-]\s*(\d{2}:\d{2})$/.exec(e.value);if(!m){toast('请输入有效的安静时段');return;}task=settings({quietStart:m[1],quietEnd:m[2]});}else{const n=store.data.messages.find(n=>n.id===e.value);if(!n)return;task=run('notifications.read',n.id).then(()=>navigate(n.to));}Promise.resolve(task).catch(error=>toast(error.message));};
 document.addEventListener('click',onClick,true);document.addEventListener('submit',onSubmit,true);document.addEventListener('change',onChange,true);
 const monitor=createMonitorClient({client,auth,getState:()=>store.data,onSaved:h.cognitiveSaved,onError:error=>toast(error.message)});
 async function bootstrapMonitoring(){const next=await client.bootstrap();if(next?.loggedIn){const stored=new Set(client.state.users[next.userId]?.cognitiveAssessments?.map(a=>a.assessmentId)||[]);for(const result of store.data.users[next.userId]?.cognitiveAssessments||[])if(!stored.has(result.assessmentId))void monitor.assessment(next.userId,result).catch(error=>toast(error.message));}return next;}
 const onLogin=async()=>{vm.forms={};vm.composer=null;vm.composerKey=null;vm.dirty=false;sessionStorage.removeItem(h.recoveryKey('qinghe-editor-recovery'));await bootstrapMonitoring();void monitor.flush();};
 window.addEventListener('pagehide',()=>{monitor.dispose();client.dispose();clearTimeout(renderTimer);pendingRender=false;},{once:true});
 function markRead(){const cid=/^\/chat\/([^?]+)/.exec(getRoute())?.[1],c=store.data.conversations.find(c=>c.id===cid);if(!c){readConversation=null;return;}const unread=store.data.chats.some(m=>m.conversation===cid&&m.author!==store.data.userId&&m.createdAt>c.readAt);if(!readPending&&(readConversation!==cid||unread)&&!document.hidden){readPending=true;readConversation=cid;client.read(cid).then(()=>{pendingRender=true;renderWhenSafe();}).catch(error=>toast(error.message)).finally(()=>{readPending=false;});}}
 let lastMonitorRoute='';function rendered(){client.routeChanged();if(getRoute()!==lastMonitorRoute){lastMonitorRoute=getRoute();monitor.event('page_view',{page:new URL(getRoute(),'https://qinghe.local').pathname});}markRead();const pane=h.scrollPane(),cid=/^\/chat\/([^?]+)/.exec(getRoute())?.[1];if(pane&&cid&&!pane.dataset.cloudHistory){pane.dataset.cloudHistory='true';pane.addEventListener('scroll',async()=>{const messages=store.data.chats.filter(m=>m.conversation===cid);if(pane.scrollTop>30||vm.chatFollow||messages.length<30||historyBusy||historyEnded.has(cid))return;historyBusy=true;capture();try{const cursor=messages[0].createdAt+'|'+messages[0].id,data=await client.older(cid,cursor);if(!data.hasMore)historyEnded.add(cid);const y=pane.scrollTop,height=pane.scrollHeight;older.set(cid,[...new Map([...(older.get(cid)||[]),...data.messages].map(m=>[m.id,m])).values()]);store.data.chats=[...new Map([...data.messages,...store.data.chats].map(m=>[m.id,m])).values()].sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id));refresh();const next=h.scrollPane();if(next)next.scrollTop=y+next.scrollHeight-height;}catch(error){toast(error.message);}finally{historyBusy=false;}});}}
 // Keep the pre-cloud device database intact; local-only markers use a separate cache.
 store.storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem('qinghe-shared-device:'+store.data.userId,value)};
 const onGame=event=>{if(event.key!=='qinghe-game-works-v1'||event.storageArea!==localStorage||!getRoute().startsWith('/games/'))return;try{const rows=JSON.parse(event.newValue||'[]');monitor.event('game_saved',{page:new URL(getRoute(),'https://qinghe.local').pathname,game:new URL(getRoute(),'https://qinghe.local').pathname.split('/')[2],itemCount:Array.isArray(rows)?rows.length:0});}catch{}};
 const onVoice=event=>monitor.event(event.detail.type,{page:new URL(getRoute(),'https://qinghe.local').pathname,elapsedMs:event.detail.elapsedMs,revisionCount:event.detail.revisionCount});window.addEventListener('storage',onGame);document.addEventListener('qinghe-voice-event',onVoice);
 return {client,monitor,ready:bootstrapMonitoring(),onLogin,rendered,start(){client.start();void monitor.flush();},dispose(){monitor.dispose();client.dispose();clearTimeout(renderTimer);window.removeEventListener('storage',onGame);document.removeEventListener('qinghe-voice-event',onVoice);document.removeEventListener('click',onClick,true);document.removeEventListener('submit',onSubmit,true);document.removeEventListener('change',onChange,true);}};
}
