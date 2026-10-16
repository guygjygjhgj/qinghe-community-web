import {initialState} from './domain.js';

export const exampleChats=[
 {id:'example-chen',person:'chen',name:'陈爷爷',preview:'15点在社区花园入口见。',avatar:'seed-post:imgGpt1'},
 {id:'example-wang',person:'wang',name:'王阿姨',preview:'点击查看历史对话。',avatar:'post:imgGpt11'}
];
export const exampleChat=id=>exampleChats.find(c=>c.id===id);

export function prepareExampleChat(root,example,assets){
 const defaults=initialState(),person=defaults.users[example.person];
 root.dataset.exampleChat=example.id;root.setAttribute('aria-label',example.name+'的历史对话，仅供浏览');
 for(const p of root.querySelectorAll('p'))if(p.textContent.includes('陈爷爷'))p.textContent=p.textContent.replaceAll('陈爷爷',example.name);
 const title=root.querySelector('[data-node-id="11:1215"]');if(title){title.textContent=example.name+'（已归档）';title.dataset.chatTitle='true';}
 if(example.person!=='chen'){
  root.dataset.chatKind='direct';
  for(const id of ['11:1239','11:1263','11:1234','11:1235','11:1236','11:1237'])root.querySelector('[data-node-id="'+id+'"]')?.setAttribute('hidden','');
  const [screen,key]=person.avatar.split(':'),src=assets[screen]?.[key]?.file;
  if(src)for(const img of root.querySelectorAll('[data-name^="avatar-chen"] img'))img.src=src;
 }
 const bind=(el,action)=>{el.dataset.action=action;el.setAttribute('role','button');el.tabIndex=0;el.classList.add('native-control');};
 for(const el of root.querySelectorAll('[data-name]')){
  if(el.dataset.name.includes('返回图标')){bind(el,'back');el.setAttribute('aria-label','返回消息');}
  else if(/发送圆按钮|发送图标|未交接禁用按钮|修改约定边框|取消约定边框/.test(el.dataset.name)){bind(el,'example-chat');el.setAttribute('aria-label','此对话已归档，仅供浏览');}
 }
 return root;
}
