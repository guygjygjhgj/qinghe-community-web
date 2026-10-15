import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setup,waitFor} from './helpers/browser.mjs';
import {initialState} from '../domain.js';
import {createViews} from '../native-views.js';
import {screens,sizes} from '../native-screens.js';
const assets=JSON.parse(readFileSync(new URL('../assets.json',import.meta.url),'utf8'));
const reference=()=>{const s=initialState();s.loggedIn=true;return s;};
const images=root=>[...root.querySelectorAll('img')].map(el=>({src:el.getAttribute('src'),class:el.className,style:el.getAttribute('style'),slot:el.closest('[data-node-id]')?.dataset.nodeId}));
test('all 57 source canvases retain their exact source image slots and dimensions',async()=>{
 const env=await setup('/me',reference());
 try{const views=createViews(reference,assets,'');for(const [name,screen] of Object.entries(screens)){
  const source=screen(),container=document.createElement('div');container.innerHTML=views.render('/design/'+name,{}).html;
  const actual=container.firstElementChild;assert.deepEqual(images(actual),images(source),name+' image changed');
  assert.equal(actual.style.width,sizes[name].width+'px');assert.equal(actual.style.height,sizes[name].height+'px');
  assert.equal(actual.textContent,source.textContent,name+' text changed');
 }}finally{env.cleanup();}
});
test('operational pages use the source DOM instead of any replacement cards, nav or images',async()=>{
 const env=await setup('/me',reference());
 try{const state=reference(),views=createViews(()=>state,assets,'');const cases=[
  ['/','home'],['/me','plants'],['/me?tab=records','records'],['/me?empty=1','profile'],['/community','circle'],['/community?tab=info','circle-info'],['/community?tab=near','circle-near'],
  ['/activity/herbs','activity'],['/activities?filter=1','filter'],['/post/scallion','post'],['/post/pothos','help-post'],['/post/lettuce','seed-post'],['/plant/new','plant-new'],['/plant/reference-mint','plant-detail'],
  ['/messages','messages'],['/drafts','drafts'],['/favorites','favorites'],['/profile/edit','profile-edit'],['/settings/font','font'],['/settings/notifications','notifications'],['/settings/speech','reader'],['/help','help'],['/feedback','feedback'],['/login','login'],['/following','following']
 ];
 for(const [route,name] of cases){const vm={forms:{},selected:new Set()},container=document.createElement('div');container.innerHTML=views.render(route,vm).html;
  assert.equal(container.firstElementChild.dataset.screen,name,route);assert.deepEqual(images(container),images(screens[name]()),route+' source images changed');
  assert.equal(container.querySelector('.flow-content,.flow-nav,.personal-stats,.plant-card-track'),null,route+' replacement layout');
 }
 }finally{env.cleanup();}
});
test('only nickname and avatar update the personal profile while introduction remains source copy',async()=>{
 const env=await setup('/profile/edit',reference());
 try{const before=env.stored().users.li;const intro=document.querySelector('form[data-form=profile] [name=intro]');assert.ok(!intro||intro.readOnly);
 env.fill('profile','name','张阿姨');await env.submit('profile');assert.equal(env.stored().users.li.name,'张阿姨');assert.equal(env.stored().users.li.intro,before.intro);assert.equal(env.routeNow(),'/me');assert.equal(document.querySelector('.native-canvas').dataset.screen,'plants');
 }finally{env.cleanup();}
});
test('login returns to the source activity; booking and cancellation use the original state canvases',async()=>{
 const state=initialState(),env=await setup('/activity/herbs',state);
 try{await env.click('[data-action=book]');assert.match(env.routeNow(),/^\/login/);env.fill('login','phone','19900000001');await env.click('[data-action=get-code]');env.fill('login','code','123456');await env.click('[data-action=login-consent]');await env.submit('login');
 assert.equal(env.routeNow(),'/activity/herbs');await env.click('[data-action=book]');assert.equal(document.querySelector('.native-canvas').dataset.screen,'activity-booked');assert.ok(env.stored().bookings.some(b=>b.activityId==='herbs'&&b.userId==='li'));
 await env.click('[data-action=cancel-booking]');assert.equal(document.querySelector('.native-canvas').dataset.screen,'activity');assert.ok(!env.stored().bookings.some(b=>b.activityId==='herbs'&&b.userId==='li'));
 }finally{env.cleanup();}
});
test('share publishing changes images in source slots and retains every decoration and card position',async()=>{
 const env=await setup('/publish',reference());
 try{const form=document.querySelector('form[data-form=publish]');assert.ok(form);const body=form.elements.namedItem('body');assert.ok(body);assert.equal(body.readOnly,false);assert.ok(body.value.trim());
 const source=images(screens.editor());assert.deepEqual(images(document).filter(i=>!i.slot?.startsWith('editor-chip:')),source);await env.submit('publish');assert.match(env.routeNow(),/^\/success\//);assert.equal(document.querySelector('.native-canvas').dataset.screen,'success');
 const p=env.stored().posts[0];assert.ok(p.body);assert.ok(p.photos.length);await env.click('[data-route^="/post/"]');assert.equal(document.querySelector('.native-canvas').dataset.screen,'post');
 }finally{env.cleanup();}
});
test('chat sends from the original input box; messages preserve the original card DOM',async()=>{
 const state=reference();state.agreements.push({id:'strict-chat',postId:'lettuce',sender:'chen',receiver:'li',status:'reserved',quantity:1,date:'2026-10-14',time:'15:00',location:'青禾社区花园入口'});
 const env=await setup('/chat/strict-chat',state);
 try{assert.deepEqual(images(document),images(screens.chat()));env.fill('chat','text','您好，社区花园见。');await env.submit('chat');assert.ok(env.stored().chats.some(m=>m.text==='您好，社区花园见。'));assert.deepEqual(images(document).filter(i=>i.slot!=='11:1218'),images(screens.chat()));assert.ok(document.querySelector('.chat-message').textContent.includes('您好，社区花园见。'));}
 finally{env.cleanup();}
});
const upload=async(env,target)=>{
 const control=document.querySelector('[data-upload-target="'+target+'"]');assert.ok(control);
 const file=new env.w.File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGQAAAABJRU5ErkJggg==','base64')],'fixture.png',{type:'image/png'});
 Object.defineProperty(control,'files',{configurable:true,value:[file]});control.dispatchEvent(new env.w.Event('change',{bubbles:true}));
 await waitFor(()=>[...document.images].some(i=>i.src.startsWith('data:image/')));
};
test('replacing a share photo updates that original slot, not an invisible extra thumbnail',async()=>{
 const env=await setup('/publish',reference());
 try{const before=images(document);await env.click('[data-action="upload-native"][data-index="1"]');await upload(env,'post');
 const slots=[...document.querySelectorAll('[data-name]')].filter(el=>/^(photo-scallions|photo-harvest)／/.test(el.dataset.name));
 assert.equal(slots[0].querySelector('img').getAttribute('src'),before.find(i=>i.slot==='3:6485').src);
 assert.ok(slots[1].querySelector('img').src.startsWith('data:image/png'));assert.equal(slots[1].querySelector('img').className,before.find(i=>i.slot==='3:6488').class);
 await env.submit('publish');assert.equal(env.stored().posts[0].photos.length,2);assert.ok(env.stored().posts[0].photos[1].startsWith('data:image/png'));
 }finally{env.cleanup();}
});
test('avatar replacement preserves its Figma wrapper and propagates with the saved nickname',async()=>{
 const env=await setup('/profile/edit',reference());
 try{const before=document.querySelector('[data-name="profile-avatar／独立PNG"]');const originalClass=before.className;await upload(env,'avatar');assert.equal(document.querySelector('[data-name="profile-avatar／独立PNG"]').className,originalClass);
 env.fill('profile','name','测试昵称');await env.submit('profile');assert.ok(env.stored().users.li.avatar.startsWith('data:image/png'));assert.equal(document.querySelector('[data-name="avatar-photo／独立生成图片"] img').src,env.stored().users.li.avatar);
 }finally{env.cleanup();}
});
test('voice and text confirmation use the original screens without dropping microphone or decorative images',async()=>{
 const env=await setup('/feedback',reference());
 try{await env.click('[data-action="voice"]');assert.equal(document.querySelector('#modal-root .native-canvas').dataset.screen,'speech');assert.deepEqual(images(document.querySelector('#modal-root')),images(screens.speech()));
 const area=document.querySelector('#speech-text');area.value='按钮点击后没有响应';area.dispatchEvent(new env.w.Event('input',{bubbles:true}));await env.click('[data-action="finish-recording"]');assert.equal(document.querySelector('#modal-root .native-canvas').dataset.screen,'speech-confirm');assert.deepEqual(images(document.querySelector('#modal-root')),images(screens['speech-confirm']()));
 await env.click('[data-action="use-speech"]');assert.equal(document.querySelector('#modal-root').children.length,0);assert.equal(document.querySelector('form[data-form="feedback"] [name="body"]').value,'按钮点击后没有响应');
 }finally{env.cleanup();}
});
test('the original add-plant and record actions save against real identifiers',async()=>{
 const env=await setup('/plant/new',reference());
 try{assert.equal(document.querySelector('.native-canvas').dataset.screen,'plant-new');await env.submit('plant');const p=env.stored().plants[0];assert.ok(p);assert.equal(env.routeNow(),'/plant/'+p.id+'/success');
 await env.click('[data-route$="/record"]');assert.ok(document.querySelector('form[data-form="record"]'));await env.submit('record');assert.equal(env.routeNow(),'/plant/'+p.id);assert.equal(env.stored().plants[0].records.length,1);
 }finally{env.cleanup();}
});
