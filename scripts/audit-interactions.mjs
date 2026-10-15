import {readFileSync,writeFileSync} from 'node:fs';
import {setup} from '../tests/helpers/browser.mjs';
import {initialState} from '../domain.js';
import {createViews} from '../native-views.js';
import {screens,sizes} from '../native-screens.js';
const env=await setup('/');
const assets=JSON.parse(readFileSync(new URL('../assets.json',import.meta.url)));
const actions=new Set([...readFileSync(new URL('../app.js',import.meta.url),'utf8').matchAll(/case '([^']+)':/g)].map(m=>m[1]));
const routes={article:'/article/tomato-story',home:'/',plants:'/me',records:'/me?tab=records','record-help':'/me?tab=records&kind=help','record-seed':'/me?tab=records&kind=seed',profile:'/me?empty=1',circle:'/community','circle-info':'/community?tab=info','circle-near':'/community?tab=near',messages:'/messages',following:'/following',post:'/post/scallion','help-post':'/post/pothos','help-resolved':'/post/pothos','seed-post':'/post/lettuce',editor:'/publish','help-editor':'/publish?type=help','seed-editor':'/publish?type=seed',search:'/search','search-empty':'/search?q=不存在的内容',activity:'/activity/herbs','activity-booked':'/activity/herbs','activity-full':'/activity/herbs',filter:'/activities?filter=1',drafts:'/drafts','drafts-manage':'/drafts','drafts-empty':'/drafts',favorites:'/favorites','favorites-manage':'/favorites','favorites-empty':'/favorites',login:'/login','one-click-login':'/login?method=quick','profile-edit':'/profile/edit',help:'/help',feedback:'/feedback',font:'/settings/font',notifications:'/settings/notifications',reader:'/settings/speech','plant-new':'/plant/new','plant-detail':'/plant/reference-mint','plant-success':'/plant/reference-mint/success',success:'/success/scallion',chat:'/chat/a','chat-complete':'/chat/a',network:'/missing-page'};
const dialogs=new Set(['exit','delete','publish-failed','speech','speech-confirm']);
routes.seasonal='/seasonal';
const report={generated:'2026-10-15',sourceScreens:Object.keys(screens).length,unknownActions:[],screens:[]};
for(const name of Object.keys(screens)){
 const state=initialState();state.loggedIn=true;
 const vm={forms:{},selected:new Set(),composer:{type:name==='seed-editor'?'seed':name==='help-editor'?'help':'share',body:'',title:'',photos:[],quantity:3}};
 if(name.includes('manage')){vm.manage=true;vm.selected.add(name.startsWith('draft')?'draft-help':'post:mint');}
 if(name==='drafts-empty')state.drafts=[];if(name==='favorites-empty')state.favorites=[];
 if(name==='help-resolved')state.posts.find(p=>p.id==='pothos').status='resolved';
 if(name==='activity-full')state.activities[0].otherBooked=20;
 if(name==='activity-booked')state.bookings.push({activityId:'herbs',userId:'li'});
 if(name==='plant-success')state.plants.push({id:'reference-mint',owner:'li',name:'小番茄',date:'2026-10-13',location:'阳台',source:'自己种的',records:[]});
 state.agreements.push({id:'a',postId:'lettuce',sender:'chen',receiver:'li',date:'2026-10-18',time:'15:00',location:'青禾社区花园入口',status:name==='chat-complete'?'completed':'reserved'});
 const views=createViews(()=>state,assets,'');const holder=document.createElement('div');
 holder.innerHTML=routes[name]?views.render(routes[name],vm).html:dialogs.has(name)?views.nativeDialog(name,{text:'',ids:['draft-help']}):views.render('/design/'+name,vm).html;
 const root=holder.querySelector('.native-canvas');
 if(root?.dataset.screen!==name)throw Error('错误的状态页面：'+name+' -> '+root?.dataset.screen);
 const controls=[...root.querySelectorAll('[data-action],[data-route],input:not([type=hidden]):not([type=file]),textarea,select')].map(e=>({node:e.dataset.nodeId||null,name:e.dataset.name||e.getAttribute('aria-label')||e.name||e.textContent.trim().slice(0,80),action:e.dataset.action||null,route:e.dataset.route||null,field:e.name||null,select:Object.keys(e.dataset).filter(k=>k.endsWith('Picker')||k.endsWith('Select'))}));
 for(const c of controls)if(c.action&&!actions.has(c.action))report.unknownActions.push({screen:name,...c});
 report.screens.push({screen:name,figmaNode:sizes[name].nodeId,width:sizes[name].width,height:sizes[name].height,entry:routes[name]||'/design/'+name,mode:routes[name]?'operational':dialogs.has(name)?'dialog':'archived-design-reference',controls});
}
report.operational=report.screens.filter(s=>s.mode==='operational').length;report.dialogs=report.screens.filter(s=>s.mode==='dialog').length;report.references=report.screens.filter(s=>s.mode==='archived-design-reference').length;report.controlBindings=report.screens.reduce((sum,s)=>sum+s.controls.length,0);
writeFileSync(new URL('../interaction-audit.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({screens:report.sourceScreens,operational:report.operational,dialogs:report.dialogs,references:report.references,bindings:report.controlBindings,unknownActions:report.unknownActions.length}));
env.cleanup();if(report.unknownActions.length)process.exitCode=1;
