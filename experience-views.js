import {myPlants, activityState, seedCounts} from './domain.js';
import {esc, today} from './legacy-views.js';

function localDate(date) {
  return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
}
export function weekDates(anchor=today(),offset=0) {
  const date=new Date(anchor+'T12:00:00');
  date.setDate(date.getDate()-((date.getDay()+6)%7)+offset*7);
  return Array.from({length:7},(_,index)=>{const day=new Date(date);day.setDate(day.getDate()+index);return {date:localDate(day),day:day.getDate(),weekday:'周'+'日一二三四五六'[day.getDay()]};});
}
export function createExperienceViews(getState,assets,h) {
  const {art,pict,avatar,button,link,top}=h;
  const source=(key)=>{if(key?.startsWith('data:'))return key;const [screen,name]=String(key||'').split(':');return assets[screen]?.[name]?.file||'';};
  const counter=(name,max)=>`<p class="input-counter" data-counter="${name}" aria-live="polite">0 / ${max}</p>`;
  const voice=(form,field='body',label='语音转文字')=>button(art('editor','imgIconMicrophonePng')+label,'voice','voice-button',`data-target="${form}" data-field="${field}"`);
  const services=()=>`<section class="personal-services"><h2>常用服务</h2><div class="personal-service-grid">${[
    ['imgServiceFavorite','我的收藏','/favorites'],['imgServiceDraft','发布草稿','/drafts'],['imgServiceFont','字号设置','/settings/font'],['imgServiceVoice','语音朗读','/settings/speech'],
    ['imgServiceReminderClapper','消息提醒','/settings/notifications'],['imgServicePrivacy','隐私设置','/settings/privacy'],['imgServiceFeedback','意见反馈','/feedback'],['imgServiceHelp','使用帮助','/help']
  ].map(([asset,title,route])=>link(art('plants',asset)+`<span>${title}</span>`,route)).join('')}</div></section>`;

  function personalHeader(hasPlants) {
    const s=getState(),u=s.users[s.userId];
    return `<header class="personal-card ${hasPlants?'personal-filled':'personal-empty'}" data-figma-node="${hasPlants?'11:1928':'39:1766'}">
      <div class="personal-backdrop">${hasPlants?art('plants','imgHeaderBackground'):art('profile','img')}</div>
      <h1>我的</h1>${link((hasPlants?'':art('profile','img4'))+'编辑资料','/profile/edit','personal-edit')}
      ${hasPlants?`<div class="personal-avatar-border">${art('plants','imgAvatarBorder')}</div>`:''}
      <div class="personal-avatar">${avatar(s.userId)}</div><h2 title="${esc(u.name)}">${esc(u.name)}</h2>
      <span class="personal-badge">${hasPlants?`<span class="personal-badge-bg">${art('plants','imgBadgeBackground')}</span>`:''}${art(hasPlants?'plants':'profile',hasPlants?'imgBadgeSprout':'img6')}种植爱好者</span>
      ${hasPlants?'':`<div class="personal-mascot">${art('profile','img3')}</div>`}
    </header>`;
  }

  function calendar(plant,vm) {
    const dates=weekDates(today(),vm.plantWeeks?.[plant.id]||0),selected=vm.plantDates?.[plant.id]||today();
    return `<div class="plant-calendar" aria-label="${esc(plant.name)}的成长日期">
      <div class="calendar-heading">${button('上一周','plant-week','calendar-arrow',`data-id="${plant.id}" data-delta="-1" aria-label="上一周"`)}<span class="calendar-month">${art('plants','imgMonthBg')}<span>${Number(dates[0].date.slice(5,7))}月${dates[0].date.slice(5,7)===dates[6].date.slice(5,7)?'':' / '+Number(dates[6].date.slice(5,7))+'月'}</span></span>${button('下一周','plant-week','calendar-arrow',`data-id="${plant.id}" data-delta="1" aria-label="下一周"`)}</div>
      <div class="plant-days">${dates.map(day=>{const active=day.date===selected,hasRecord=plant.records?.some(r=>r.date===day.date);return `<button type="button" class="plant-day ${active?'selected':''}" data-action="plant-date" data-id="${plant.id}" data-date="${day.date}" aria-label="${day.date}${hasRecord?'，有成长记录':''}" aria-pressed="${active}"><span class="day-art">${art('plants',active?'imgDay3Bg':'imgDay1Bg')}</span><small>${day.weekday}</small><strong>${day.day}</strong>${hasRecord?art('plants','imgSelectedSprout','day-sprout'):'<span class="day-placeholder"></span>'}</button>`;}).join('')}</div>
    </div>`;
  }

  function plantCard(plant,vm) {
    const selected=vm.plantDates?.[plant.id]||today(),records=(plant.records||[]).filter(r=>r.date===selected);
    const isMint=plant.name==='薄荷盆栽';
    return `<article class="plant-slide" data-plant-id="${plant.id}" aria-label="${esc(plant.name)}植物卡片" data-figma-node="11:1949">
      <div class="plant-card-background">${art('plants','imgPlantCardBg')}</div>
      <div class="plant-card-heading">${isMint?art('plants','imgPlantHeading','plant-title-art'):`<h3>${esc(plant.name)}</h3>`}${isMint?art('plants','imgPlantTagline','plant-tagline-art'):'<p>记下每一次小变化</p>'}<div class="plant-card-deer">${art('plants','imgPlantDeer')}</div>${art('plants','imgPlantEmphasis1','plant-emphasis one')}${art('plants','imgPlantEmphasis1','plant-emphasis two')}</div>
      <div class="plant-photo-wrap">${link(pict(plant.photo||'plant-new:img2'),'/plant/'+plant.id,'plant-card-photo')}<span class="plant-location">${art('plants','imgLocationPin')}${esc(plant.location)}</span></div>
      ${calendar(plant,vm)}
      <div class="plant-daily-record"><div class="section-title"><strong>${selected.slice(5).replace('-','月')}日的近况</strong><span>${records.length}条记录</span></div>${records.length?records.map(r=>`<p>${esc(r.body||r.title||'记录了一张植物照片')}</p>`).join(''):'<p class="muted">这一天还没有记录，可以拍张照片，记下今天的样子。</p>'}<div class="inline-actions">${link('记录近况','/plant/'+plant.id+'/record','btn btn-primary btn-sm')}${link('打开植物档案','/plant/'+plant.id,'btn btn-outline btn-sm')}</div></div>
    </article>`;
  }

  function profile(url,vm) {
    const s=getState(),plants=myPlants(s),tab=url.searchParams.get('tab')||'plants',recordCount=plants.reduce((n,p)=>n+(p.records?.length||0),0);
    const existing=h.render('/me?tab=records',vm).html;
    const recordRoot=document.createElement('div');recordRoot.innerHTML=existing;
    const recordNodes=[...recordRoot.querySelectorAll('.record-card,.activity-card')];
    return `${personalHeader(plants.length>0)}<p class="personal-bio">${esc(s.users[s.userId].intro||'和邻居一起种植，记录日常的小收获。')}</p>
      <div class="personal-stats">${link(`<strong>${plants.length}</strong><span>我的植物</span>`,'/me?tab=plants')}${link(`<strong>${recordCount}</strong><span>成长记录</span>`,'/plant-records')}${link(`<strong>${s.favorites.length}</strong><span>我的收藏</span>`,'/favorites')}</div>
      <div class="personal-tabs" role="tablist" aria-label="个人内容">${link(art('profile','img7')+'我的植物','/me?tab=plants',tab==='plants'?'active':'')}${link(art('profile','img8')+'我的记录','/me?tab=records',tab==='records'?'active':'')}</div>
      ${tab==='plants'?plants.length?`<div class="plant-deck"><div class="plant-deck-tools">${button('上一盆','plant-step','text-link',`data-delta="-1" aria-label="上一盆植物" ${plants.length<2?'disabled':''}`)}<span data-plant-position aria-live="polite">${Math.max(0,plants.findIndex(p=>p.id===vm.activePlantId))+1} / ${plants.length}</span>${button('下一盆','plant-step','text-link',`data-delta="1" aria-label="下一盆植物" ${plants.length<2?'disabled':''}`)}</div><div class="plant-card-track" role="region" aria-label="左右滑动切换植物" tabindex="0">${plants.map(p=>plantCard(p,vm)).join('')}</div><p class="deck-hint">左右滑动切换植物，点日期查看当天近况</p>${link('+ 添加一盆植物','/plant/new','btn btn-outline wide')}</div>`:`<section class="personal-plant-empty">${art('profile','img9','empty-leaf')}${art('profile','img10','empty-deer')}<h2>还没有添加植物</h2><p>家里的一盆葱、一株番茄，<br>都可以记下来。</p>${link('添加第一盆植物','/plant/new','btn btn-primary wide')}</section>`:`<section class="personal-records"><div class="section-title"><h2>我的发布与参与</h2>${link('展开全部','/records','text-link')}</div>${recordNodes.length?recordNodes.map(e=>e.outerHTML).join(''):'<p class="list-empty">发布帖子、领取种苗或报名活动后，会显示在这里。</p>'}</section>`}
      ${services()}<div class="personal-account">${link('账户与数据','/settings','text-link')}${!s.loggedIn?link('进入体验账号','/login','text-link'):''}</div>`;
  }

  function chat(url,vm) {
    const s=getState(),id=url.pathname.split('/')[2],a=s.agreements.find(x=>x.id===id&&(x.sender===s.userId||x.receiver===s.userId)),neighbor=a?(a.sender===s.userId?a.receiver:a.sender):id.replace('neighbor-',''),u=s.users[neighbor];
    if(!u||(!a&&!id.startsWith('neighbor-')))return h.render(url.pathname,vm);
    const all=s.chats.filter(m=>m.conversation===id),visible=vm.chatVisible?.[id]||30,start=Math.max(0,all.length-visible),messages=all.slice(start),post=a?s.posts.find(p=>p.id===a.postId):null;
    const root=document.createElement('div');root.innerHTML=h.render(url.pathname,vm).html;
    const oldCard=root.querySelector('.conversation-card');
    let agreement='';
    if(oldCard){
      oldCard.querySelector('.hero-art')?.remove();
      const title=oldCard.querySelector('h2');if(title)title.remove();
      const artHeader=document.createElement('div');artHeader.className='seed-agreement-heading';artHeader.innerHTML=`<div><span class="tag seed">种苗赠送</span><h2>${esc(post?.seedName||post?.title||'领取约定')}</h2><p>${esc(s.users[a.sender]?.name)}赠送</p></div>${art('chat','imgSpeechSeedPromiseV3','seed-promise')}${art('chat','imgMascotSeeds','seed-mascot')}`;
      oldCard.prepend(artHeader);oldCard.insertAdjacentHTML('afterbegin',art('chat','imgCardSeedBackground','seed-card-background'));
      artHeader.insertAdjacentHTML('beforeend',[['a',3,14],['b',6,27],['c',24,14],['d',39,61]].map(([name,top,left])=>`<span class="seed-sparkle ${name}" style="top:${top}%;left:${left}%">${art('chat','imgDecorSparkle')}</span>`).join(''));
      const counts=seedCounts(s,a.postId),detail=document.createElement('div');detail.className='seed-agreement-details';detail.innerHTML=`${pict(post?.photos?.[0])}<div><strong>${a.status==='requested'?'申请领取 · 尚未预留':a.status==='cancelled'?'约定已取消':a.status==='completed'?'交接完成 · 1份':'为您预留 · 1份'}</strong><p>当前可申请 ${counts.available} 份</p><p>${a.date} ${a.time}</p><p>${esc(a.location)}</p>${link('查看种苗原帖','/post/'+a.postId,'text-link')}</div>`;
      artHeader.after(detail);agreement=oldCard.outerHTML;
    }
    const header=`<div class="topbar chat-topbar">${button('返回','back','back')}<div>${link(avatar(u.id),'/neighbor/'+u.id)}<strong>${esc(u.name)}</strong><span>青禾社区邻居</span></div>${link('资料','/neighbor/'+u.id,'text-link')}</div>`;
    const content=`${header}<p class="chat-local-note">聊天记录保存在本设备，尚未连接邻居的设备。</p>${start?button('查看更早的 '+Math.min(30,start)+' 条消息','chat-older','chat-older',`data-id="${id}"`):''}<div class="chat-history" role="log" aria-label="聊天记录" aria-live="polite" aria-relevant="additions">${messages.map((m,i)=>{const previous=messages[i-1],date=m.createdAt?new Date(m.createdAt).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}):'';const showTime=date&&(!previous||!previous.createdAt||m.createdAt-previous.createdAt>300000);return `${showTime?`<p class="chat-time">${date}</p>`:''}<article class="chat-message ${m.author===s.userId?'mine':''}" data-message-id="${m.id}">${avatar(m.author)}<div><small>${esc(s.users[m.author]?.name||'邻居')}</small><p>${esc(m.text)}</p>${m.author===s.userId?'<span class="chat-saved">已保存在本设备</span>':''}</div></article>`;}).join('')}${!messages.length?'<div class="chat-empty"><h2>和邻居聊聊吧</h2><p>可以先打个招呼，再商量时间和地点。</p></div>':''}</div>${agreement}<div id="chat-latest" aria-hidden="true"></div>`;
    const footer=`<footer class="chat-composer"><button type="button" class="chat-to-latest" data-action="chat-latest" hidden>回到最新消息</button><form data-form="chat" data-id="${id}" data-enter-submit><label class="sr-only" for="chat-text">聊天消息</label><textarea id="chat-text" name="text" rows="1" aria-label="聊天消息" placeholder="给${esc(u.name)}发消息…" maxlength="500" required data-autosize></textarea><div class="composer-tools">${voice('chat','text')}${counter('text',500)}<button type="submit" class="btn btn-primary btn-sm">发送</button></div><p class="composer-help">Enter 发送，Shift + Enter 换行</p></form></footer>`;
    return {html:content,footer,hideNav:true,view:'chat'};
  }

  function activity(url,vm) {
    const result=h.render(url.pathname,vm),root=document.createElement('div');root.innerHTML=result.html;
    const id=url.pathname.split('/')[2];let state;try{state=activityState(getState(),id);}catch{return result;}
    const primary=root.querySelector('[data-action="book"],[data-action="cancel-booking"],button[disabled]');
    if(state.ended&&primary&&!state.mine){primary.textContent='活动已结束';primary.disabled=true;primary.removeAttribute('data-action');}
    const returnLink=root.querySelector('a[data-route="/activities"].wide');returnLink?.remove();
    const footer=document.createElement('footer');footer.className='activity-action-bar';if(primary)footer.append(primary);
    if(state.mine)footer.insertAdjacentHTML('beforeend',button('加入日历','activity-calendar','btn btn-primary',`data-id="${id}"`));
    root.querySelector('.card')?.insertAdjacentHTML('beforeend',`<div class="activity-extra-actions">${button('复制活动地点','copy-location','text-link',`data-id="${id}"`)}${link('查看其他活动','/activities','text-link')}</div>`);
    return {html:root.innerHTML,footer:footer.outerHTML,view:'activity'};
  }

  function decorateForms(result) {
    const root=document.createElement('div');root.innerHTML=result.html;
    for(const form of root.querySelectorAll('form[data-form]')){
      for(const field of form.querySelectorAll('textarea,input[type=text],input:not([type])')){
        if(field.tagName==='TEXTAREA')field.dataset.autosize='';
        if(field.maxLength>0&&!form.querySelector(`[data-counter="${field.name}"]`))field.insertAdjacentHTML('afterend',counter(field.name,field.maxLength));
      }
      if(form.dataset.form==='profile')form.querySelector('[name="intro"]')?.insertAdjacentHTML('afterend',voice('profile','intro'));
      if(form.dataset.form==='comment'){
        form.dataset.enterSubmit='';const old=form.querySelector('[name="text"]');
        if(old){const area=document.createElement('textarea');for(const attr of old.attributes)if(attr.name!=='type')area.setAttribute(attr.name,attr.value);area.rows=1;area.dataset.autosize='';old.replaceWith(area);area.insertAdjacentHTML('afterend',voice('comment','text'));}
      }
    }
    for(const element of root.querySelectorAll('[data-action="voice"]')){
      const text=[...element.childNodes].filter(n=>n.nodeType===3);for(const node of text)node.textContent=' 语音转文字';
    }
    return {...result,html:root.innerHTML};
  }

  function render(route,vm) {
    const url=new URL(route,'https://qinghe.local'),path=url.pathname;
    if(path==='/me')return {html:profile(url,vm),view:'personal'};
    if(path==='/plant-records'){
      const plants=myPlants(getState()),records=plants.flatMap(plant=>(plant.records||[]).map(record=>({...record,plant}))).sort((a,b)=>b.date.localeCompare(a.date));
      return {html:top('全部成长记录')+`<h1>成长记录</h1><p class="muted">${records.length}条记录，来自${plants.length}盆植物。</p>`+(records.length?records.map(record=>`<article class="record-card"><span class="tag">${esc(record.date)}</span><h2>${esc(record.plant.name)}</h2><h3>${esc(record.title||'今天的小变化')}</h3><p class="detail-copy">${esc(record.body)}</p>${record.photo?pict(record.photo):''}<div class="inline-actions">${link('植物档案','/plant/'+record.plant.id,'btn btn-outline btn-sm')}${link('继续记录','/plant/'+record.plant.id+'/record','btn btn-primary btn-sm')}</div></article>`).join(''):`<section class="empty"><h2>还没有成长记录</h2><p>打开一盆植物，拍张照片或写下今天的变化。</p>${link('去我的植物','/me?tab=plants','btn btn-primary')}</section>`)};
    }
    if(/^\/plant\/[^/]+\/edit$/.test(path)){
      const id=path.split('/')[2],plant=getState().plants.find(p=>p.id===id&&p.owner===getState().userId);if(!plant)return h.render('/plant/missing',vm);
      if(vm.plantEditId!==id){vm.plantEditId=id;vm.plantLocation=plant.location;vm.plantPhoto=null;}
      const result=h.render('/plant/new?name='+encodeURIComponent(plant.name),vm),root=document.createElement('div');root.innerHTML=result.html;
      const form=root.querySelector('form[data-form="plant"]');form.dataset.form='plant-edit';form.dataset.id=id;form.elements.namedItem('date').value=plant.date;form.elements.namedItem('source').value=plant.source;
      const photo=form.querySelector('.photo');if(photo)photo.outerHTML=pict(vm.plantPhoto||plant.photo||'plant-new:img2');form.querySelector('[type="submit"]').textContent='保存修改';root.querySelector('.topbar strong').textContent='编辑植物';root.querySelector('h1').textContent='编辑植物';
      return decorateForms({...result,html:root.innerHTML});
    }
    if(path.startsWith('/chat/'))return chat(url,vm);
    if(path.startsWith('/activity/'))return decorateForms(activity(url,vm));
    const result=decorateForms(h.render(route,vm));
    if(path.startsWith('/neighbor/')){const user=getState().users[path.split('/')[2]];if(user&&user.id!==getState().userId){const root=document.createElement('div');root.innerHTML=result.html;root.querySelector('.author.card')?.insertAdjacentHTML('afterend',link('给'+esc(user.name)+'发消息','/chat/neighbor-'+user.id,'btn btn-primary wide'));result.html=root.innerHTML;}}
    if(/^\/plant\/[^/]+$/.test(path)){
      const id=path.split('/')[2],plant=getState().plants.find(p=>p.id===id&&p.owner===getState().userId);
      if(plant)result.html=result.html.replace('</h1>',`</h1>${link('编辑植物','/plant/'+id+'/edit','text-link')}`);
    }
    return result;
  }
  return {render,source};
}
