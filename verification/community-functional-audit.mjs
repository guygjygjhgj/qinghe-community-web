import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {setup,waitFor} from '../tests/helpers/browser.mjs';
const backend=pathToFileURL(resolve(process.argv[2]||'../qinghe-registration-service')+'/');
const {fixture}=await import(new URL('tests/community-fixture.mjs',backend)),{handleApi}=await import(new URL('lib/registration.mjs',backend));
const f=await fixture(),results=[];let e;
const open=async(route,index=0)=>{if(e)e.cleanup();e=await setup(route,await f.bootstrap(f.users[index]),{community:true,token:f.users[index].token,communityFetch:(url,init)=>handleApi(new Request(url,init),f.env)});return e;};
const change=async(selector,value)=>{const el=document.querySelector(selector);assert.ok(el,selector);el.value=value;el.dispatchEvent(new e.w.Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,50));};
const done=name=>results.push({feature:name,result:'PASS'});
try{
 await open('/profile/edit');e.fill('profile','name','实际资料昵称');await e.submit('profile');assert.equal((await f.bootstrap()).users['resident-0'].name,'实际资料昵称');done('资料编辑、账号恢复');
 const plant=(await f.command('plant.save',null,{name:'真实薄荷',date:'2026-01-01',location:'阳台'})).data.result;
 for(const type of ['share','help','seed']){await open('/publish?type='+type);e.fill('publish','body','实际发布的'+type+'内容');if(type==='seed')e.fill('publish','seedName','邻居的桂花');await e.submit('publish');assert.ok(e.routeNow().startsWith('/success/'),document.body.textContent.slice(-150));}
 const mine=(await f.bootstrap()).posts.filter(p=>p.author==='resident-0');assert.equal(mine.length,3);done('分享、求助、种苗从原稿表单真实发布');
 await open('/me?tab=records&kind=');const card=()=>document.querySelector('[data-record-card]');assert.ok(card());const seen=new Set();for(let i=0;i<3;i++){seen.add(card().dataset.recordCard);card().dispatchEvent(new e.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,40));}assert.equal(seen.size,3);assert.ok([...seen].every(key=>mine.some(p=>key==='post:'+p.id)));done('全部记录轮播仅操作本人真实分享、求助、种苗');
 const share=mine.find(p=>p.type==='share');await open('/publish?post='+share.id);e.fill('publish','body','编辑后保存的正文');await e.submit('publish');assert.equal((await f.bootstrap()).posts.find(p=>p.id===share.id).body,'编辑后保存的正文');done('编辑实际帖子');
 await open('/publish');e.fill('publish','body','继续保留的草稿');await e.click('[data-action=save-draft]');assert.equal((await f.bootstrap()).drafts[0].body,'继续保留的草稿');done('保存草稿到本人账号');
 for(let i=0;i<4;i++)await f.command('draft.save',null,{type:'share',title:'草稿'+i,body:'草稿正文',photos:[]});await open('/drafts');await e.click('[data-action=manage]');await e.click('[data-action=select-all-drafts]');await e.click('[data-action=delete-draft]');await e.click('[data-action=confirm-delete-draft]');assert.equal((await f.bootstrap()).drafts.length,0);done('跨屏草稿全选、批量删除');
 for(const p of mine)await f.command('favorite.set','post:'+p.id,{active:true});await f.command('favorite.set','activity:herbs',{active:true});await open('/favorites');await e.click('[data-action=manage]');await e.click('[data-action=select-all-favorites]');await e.click('[data-action=batch-favorite]');assert.equal((await f.bootstrap()).favorites.length,0);done('跨屏收藏全选、批量取消');
 await open('/following');await change('[data-route-picker]','/chat/neighbor-resident-1');assert.ok(e.routeNow().startsWith('/chat/'));const cid=e.routeNow().slice(6);e.fill('chat','text','真实邻居入口收发');await e.submit('chat');assert.ok((await f.bootstrap(f.users[1])).chats.some(m=>m.text==='真实邻居入口收发'));done('真实邻居入口打开对话并送达独立账号');
 await open('/settings/notifications');const toggle=document.querySelector('[data-action=notification-switch]');assert.ok(toggle);const key=toggle.dataset.key,before=(await f.bootstrap()).settings.notifications[key];await e.click('[data-action=notification-switch]');assert.equal((await f.bootstrap()).settings.notifications[key],!before);await change('[data-native-quiet]','21:30 — 08:30');assert.equal((await f.bootstrap()).settings.quietStart,'21:30');done('通知开关、安静时段保存恢复');
 await open('/feedback');e.fill('feedback','body','功能验收反馈');await e.submit('feedback');const fb=(await f.bootstrap()).feedback[0];assert.equal(fb.body,'功能验收反馈');await f.command('admin.feedback',fb.id,{status:'resolved',reply:'已经核对并修复'},{admin:true});await open('/feedback');assert.ok(document.body.textContent.includes('已经核对并修复'));done('反馈提交、后台处理、居民查看结果');
 await open('/plant/'+plant.id);assert.ok(document.body.textContent.includes('真实薄荷'));await open('/search?q='+encodeURIComponent('实际发布'));assert.ok(document.querySelector('[data-route^="/post/"]'));done('私人植物查看与真实帖子搜索');
 await open('/help?topic=privacy');assert.ok(document.body.textContent.includes('私聊仅对参与者可见'));done('共享模式隐私说明');
 await open('/publish');e.fill('publish','body','退出应保留在恢复提示或草稿中');await e.click('[data-action=back]');assert.ok(document.querySelector('#modal-root [data-action=save-exit]'));await e.click('[data-action=save-exit]');await waitFor(()=>!e.routeNow().startsWith('/publish'));assert.ok((await f.bootstrap()).drafts.some(d=>d.body==='退出应保留在恢复提示或草稿中'));done('发布页返回、保存并退出');
 assert.ok((await f.call('conversations/'+cid+'/messages',null,{user:f.users[2]})).status===403);done('第三方账号不能读取私聊');
 await open('/plant/'+plant.id);await change('[data-plant-action-picker]','remove');assert.ok(document.querySelector('#modal-root [data-action=delete-plant]'));await e.click('#modal-root [data-action=close]');await waitFor(()=>!document.querySelector('#modal-root .native-canvas'));assert.equal((await f.bootstrap()).plants.length,1);await change('[data-plant-action-picker]','remove');await e.click('#modal-root [data-action=delete-plant]');await waitFor(()=>e.routeNow()==='/me');assert.equal((await f.bootstrap()).plants.length,0);done('植物移除入口、保留取消、确认删除实际记录');
 console.log(JSON.stringify({checks:results.length,results},null,2));
}finally{if(e)e.cleanup();f.close();}
