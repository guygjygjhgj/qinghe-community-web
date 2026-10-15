// Functional bindings are copied onto the original Figma DOM, never its replacement layout.
export function preserveDesign(root, wired, {name, state, vm, assets, url}) {
  const index = new Map();
  for (const element of wired.querySelectorAll('[data-node-id]')) {
    const key = element.dataset.nodeId;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(element);
  }
  const fields = [];
  for (const element of root.querySelectorAll('[data-node-id]')) {
    const source = index.get(element.dataset.nodeId)?.shift();
    if (!source) continue;
    for (const [key, value] of Object.entries(source.dataset)) {
      if (!['nodeId', 'name', 'lines'].includes(key)) element.dataset[key] = value;
    }
    if (source.hasAttribute('role')) element.setAttribute('role', source.getAttribute('role'));
    if (source.hasAttribute('tabindex')) element.tabIndex = source.tabIndex;
    if (source.dataset.action || source.dataset.route) element.classList.add('native-control');
    if (source.matches('input:not([type=hidden]),textarea')) {
      const field = source.cloneNode(true);
      field.style.cssText = element.style.cssText;
      field.className = element.className + ' native-input';
      field.dataset.designText = element.textContent;
      if(field.name==='name'&&name==='profile-edit')field.setAttribute('aria-label','昵称');
      // Static design copy stays exact. Editable messages and credentials use the existing input slot.
      if ((['body', 'intro', 'name', 'date', 'seedName'].includes(field.name) && field.name !== 'name' || field.name === 'name' && name !== 'profile-edit' && name !== 'login') && name !== 'feedback') {
        field.value = element.textContent;
        field.readOnly = true;
      }
      if (field.name === 'intro') field.value = element.textContent;
      if(field.tagName==='TEXTAREA')field.textContent=field.value;else field.setAttribute('value',field.value);
      element.replaceWith(field);
      fields.push(field);
    }
  }
  const sourceForm = wired.querySelector('form[data-form]');
  if (sourceForm) {
    const form = document.createElement('form');
    form.className = 'native-form';
    Object.assign(form.dataset, sourceForm.dataset);
    while (root.firstChild) form.append(root.firstChild);
    root.append(form);
    for (const hidden of sourceForm.querySelectorAll('input[type=hidden]')) {
      if (!form.elements.namedItem(hidden.name)) form.append(hidden.cloneNode(true));
    }
  }
  for (const upload of wired.querySelectorAll('input[type=file]')) root.append(upload.cloneNode(true));
  const bind = (element, props) => { if (!element) return; delete element.dataset.route; delete element.dataset.action; Object.assign(element.dataset, props); element.setAttribute('role', 'button'); element.tabIndex = 0; element.classList.add('native-control'); };
  const text = (value, props) => { for (const el of root.querySelectorAll('p,span,[data-name]')) if (el.textContent.trim() === value && (el.hasAttribute('data-name')||!el.children.length)) bind(el, props); };
  for (const element of root.querySelectorAll('[data-name]')) {
    const match = /^底栏点击区[／/](home|circle|publish|messages|mine)$/.exec(element.dataset.name);
    if (match) bind(element, {route: {home:'/',circle:'/community',publish:'/publish',messages:'/messages',mine:'/me'}[match[1]]});
  }
  text('保存资料', {action:'submit-native',form:'profile'});
  if(['plants','profile','profile-old','records'].includes(name))text('语音朗读', {route:'/settings/speech'});
  text('隐私设置', {action:'design-privacy'});
  text('重新加载',{action:'retry'});
  text('返回上一页',{action:'back'});
  if(name==='filter')for(const el of root.querySelectorAll('[data-route="/activities"]'))el.dataset.route='/activities?filter=0';
  for (const el of root.querySelectorAll('[data-route]')) {
    if(el.dataset.route==='/settings/privacy')bind(el,{action:'design-privacy'});
    if ((el.dataset.route||'').includes('seed-demo')) bind(el, {action:'open-seed-chat',id:'lettuce'});
    if ((el.dataset.route||'').includes('mint-reference') && !state.plants.some(p=>p.id==='mint-reference')) el.dataset.route=el.dataset.route.replace('mint-reference','reference-mint');
  }
  if (name === 'plants') {
    text('我的植物', {route:'/me'});
    text('我的记录', {route:'/me?tab=records'});
    for (const element of root.querySelectorAll('[data-name="plant-photo／独立生成图片"]')) bind(element, {route:'/plant/'+(state.plants[0]?.id || 'reference-mint')});
    for (const element of root.querySelectorAll('[data-name]')) if (/^day\d／/.test(element.dataset.name)) bind(element, {action:'design-day',day:element.textContent.trim()});
  }
  if (name === 'chat' || name === 'chat-complete') {
    const form = root.querySelector('form[data-form="chat"]');
    const send = root.querySelector('[data-name="发送圆按钮"]') || [...root.querySelectorAll('[data-name]')].find(el => /发送/.test(el.dataset.name));
    bind(send, {action:'submit-native',form:'chat'});
    if (form) form.elements.namedItem('text')?.setAttribute('aria-label','聊天消息');
  }
  if (name === 'reader') {
    text('暂停朗读',{action:'reader-start'});
    text('上一句',{action:'reader-start',step:'-1'});
    text('下一句',{action:'reader-start',step:'1'});
  }
  // Only the three user-authorized visual fields may replace source content.
  const user = state.users[state.userId];
  for (const element of root.querySelectorAll('p')) {
    if (!element.children.length && element.textContent.includes('李阿姨')) element.textContent = element.textContent.replaceAll('李阿姨', user.name);
  }
  const imageSource = photo => { if (!photo) return ''; if (photo.startsWith('data:image/')) return photo; const [screen,key] = photo.split(':'); return assets[screen]?.[key]?.file || ''; };
  const replacePhoto = (element, photo) => { const img = element?.querySelector('img'), src = imageSource(photo); if (img && src) { img.src=src; if(photo.startsWith('data:image/'))img.style.objectFit='cover'; } };
  if (vm.avatarPhoto || user.avatar?.startsWith('data:image/')) {
    for (const el of root.querySelectorAll('[data-name]')) if (/^(avatar-photo|avatar-li|profile-avatar|李阿姨头像|用户头像图标|发布者头像)/.test(el.dataset.name)) replacePhoto(el, vm.avatarPhoto || user.avatar);
  }
  const post = state.posts.find(p=>p.id===url.pathname.split('/')[2]);
  if (name === 'editor' && url.pathname==='/publish') {
    const slots = [...root.querySelectorAll('[data-name]')].filter(el=>/^(photo-scallions|photo-harvest)／/.test(el.dataset.name));
    slots.forEach((el,i)=>{ if (vm.composer?.photos?.[i]) replacePhoto(el,vm.composer.photos[i]); bind(el,{action:'upload-native',target:'post',index:String(i)}); });
  }
  if (name === 'post' && post?.type === 'share') {
    const slots = [...root.querySelectorAll('[data-name]')].filter(el=>/^照片／/.test(el.dataset.name));
    slots.forEach((el,i)=>{if(post.photos[i===0?0:i-1]?.startsWith('data:image/'))replacePhoto(el,post.photos[i===0?0:i-1]);});
  }
  if (name === 'success' && post?.type === 'share' && post.photos[0]?.startsWith('data:image/')) {
    replacePhoto(root.querySelector('[data-name^="已发布番茄照片"]'),post.photos[0]);
  }
  // Do not expose image changes on help, seed, plant, or feedback screens.
  for (const el of root.querySelectorAll('[data-action="upload-native"]')) {
    if (!(el.dataset.target === 'avatar' || el.dataset.target === 'post' && name === 'editor')) {
      bind(el,{action:'fixed-art'});
    }
  }
  if(name!=='editor')for(const el of root.querySelectorAll('[data-action=remove-photo]'))bind(el,{action:'fixed-art'});
  return root;
}
