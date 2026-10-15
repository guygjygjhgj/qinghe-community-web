import {activityState,ACTIVITY_LIST_IDS} from './domain.js';

// The defaults are the choices painted in the original Figma filter sheet.
export const activityFilterDefaults={time:'all',kind:'种植交流',status:'available',community:'current'};
const options={time:['all','week','month'],kind:['all','种植交流','认知小游戏'],status:['all','available','mine'],community:['current','all']};
export function readActivityFilter(params,defaults=activityFilterDefaults){
 return Object.fromEntries(Object.entries(options).map(([key,values])=>[key,values.includes(params.get(key))?params.get(key):defaults[key]]));
}
const dayKey=date=>date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
export function matchesActivity(state,id,filter,now=new Date()){
 const a=activityState(state,id,now),start=new Date(now.getFullYear(),now.getMonth(),now.getDate()),end=new Date(start);
 if(filter.time==='week'){start.setDate(start.getDate()-((start.getDay()+6)%7));end.setTime(start.getTime());end.setDate(start.getDate()+6);}
 if(filter.time==='month'){start.setDate(1);end.setMonth(start.getMonth()+1,0);}
 return (filter.community!=='current'||!a.communityId||a.communityId==='qinghe')&&(filter.kind==='all'||filter.kind===a.type)&&(filter.status==='all'||filter.status==='mine'&&a.mine||filter.status==='available'&&!a.full&&!a.ended)&&(filter.time==='all'||a.date>=dayKey(start)&&a.date<=dayKey(end));
}
const filterGroups=[['time',['39:2213','39:2217','39:2220'],['39:2214','39:2218','39:2221'],'39:2256',0,'39:2216'],['kind',['39:2225','39:2228','39:2232'],['39:2226','39:2229','39:2233'],'39:2257',1,'39:2231'],['status',['39:2237','39:2240','39:2244'],['39:2238','39:2241','39:2245'],'39:2258',1,'39:2243']];

export function completeActivities(root,{name,state,vm,url}){
 if(name!=='filter'&&!['activity','activity-booked','activity-full'].includes(name))return;
 const at=id=>root.querySelector('[data-node-id="'+id+'"]');
 const bind=(e,props,label)=>{if(!e)return;delete e.dataset.route;delete e.dataset.action;Object.assign(e.dataset,props);e.setAttribute('role','button');e.tabIndex=0;e.classList.add('native-control');e.setAttribute('aria-label',label||e.textContent.trim()||e.dataset.name||'打开');};
 const set=(id,value)=>{const e=at(id);if(!e||e.textContent===String(value))return;e.textContent=value;e.title=String(value);e.dataset.activityValue='true';if(typeof value==='number')e.dataset.fitNumber='true';};
 if(name==='filter'){
  const open=url.searchParams.get('filter')==='1',applied=readActivityFilter(url.searchParams),draft=vm.filter||applied;
  const form=root.querySelector('form');
  if(open&&form){for(const key of Object.keys(options)){let field=form.elements.namedItem(key);if(!field){field=document.createElement('input');field.type='hidden';field.name=key;form.append(field);}field.value=draft[key]||activityFilterDefaults[key];}}
  if(!open&&form){delete form.dataset.form;delete form.dataset.id;}
  bind(at('39:2178'),{action:'filter'},'社区活动，打开活动筛选');
  const children=[...(form||root).children],first=children.findIndex(e=>e.dataset.nodeId==='39:2184'),second=children.findIndex(e=>e.dataset.nodeId==='39:2196'),end=children.findIndex(e=>e.dataset.nodeId==='39:2206');
  let visible=0;
  const cloudRows=state.cloud?state.activities.filter(a=>!['status','kind','time','community'].some(k=>url.searchParams.has(k))||matchesActivity(state,a.id,applied)).sort((a,b)=>Number(!!a.sample)-Number(!!b.sample)||(a.id==='vegetable-day'?-1:a.id==='vegetable-meeting'?-1:1)):[];
  const chosen=cloudRows.find(a=>a.id===vm.cloudActivityId)||cloudRows[0],listIds=state.cloud?[chosen?.id,cloudRows.find(a=>a.id!==chosen?.id)?.id]:ACTIVITY_LIST_IDS;
  listIds.forEach((id,i)=>{
   const a=state.activities.find(a=>a.id===id);
   const start=i?second:first,stop=i?(end<0?children.length:end):second,nodes=children.slice(start,stop);
   if(!a){if(state.cloud)nodes.forEach(e=>{e.hidden=true;});return;}
   // Apply the same predicate before and after opening the sheet, without removing layers.
   const show=!['status','kind','time','community'].some(k=>url.searchParams.has(k))||matchesActivity(state,id,applied);
   nodes.forEach(e=>{e.hidden=!show;});if(show)visible++;
   const prefix='/activity/'+id;
   for(const key of i?['39:2196','39:2197','39:2198','39:2199','39:2200','39:2204']:['39:2184','39:2185','39:2186','39:2187','39:2188','39:2193','39:2194','39:2195'])bind(at(key),{route:prefix},'查看详情：'+a.title);
   for(const key of i?['39:2201','39:2202']:['39:2189','39:2190'])bind(at(key),{action:'activity-calendar',id},'添加活动到日历：'+a.title);
   for(const key of i?['39:2203','39:2205']:['39:2191','39:2192'])bind(at(key),{action:'copy-location',id},'复制活动地点：'+a.location);
   if(state.cloud){set(i?'39:2198':'39:2186',a.title);set(i?'39:2199':'39:2187',a.type);set(i?'39:2200':'39:2188',a.organizer);set(i?'39:2202':'39:2190',a.date+' '+a.time);set(i?'39:2203':'39:2192',a.location);if(!i&&cloudRows.length>1){const old=at('39:2186'),select=document.createElement('select');select.className=old.className+' native-input';select.style.cssText=old.style.cssText;select.dataset.nodeId=old.dataset.nodeId;select.dataset.cloudActivitySelect='true';select.setAttribute('aria-label','选择社区活动');for(const a of cloudRows){const option=document.createElement('option');option.value=a.id;option.textContent=a.title;option.selected=a.id===id;select.append(option);}old.replaceWith(select);}}
  });
  root.dataset.activityResults=String(visible);root.setAttribute('aria-label','社区活动，'+visible+'场活动');
  if(open){
   for(const [key,boxes,labels,mark,,circle]of filterGroups){
    boxes.forEach((id,i)=>{const props={action:'filter-choice',key,value:options[key][i]},label=at(labels[i])?.textContent;for(const e of [at(id),at(labels[i])]){bind(e,props,label);if(e)e.setAttribute('aria-pressed',String(draft[key]===props.value));}});
    const value=draft[key],index=options[key].indexOf(value);for(const id of [mark,circle])bind(at(id),{action:'filter-choice',key,value},at(labels[index])?.textContent);
   }
   for(const id of ['39:2206','39:2209','39:2208'])bind(at(id),{action:'activity-filter-close'},'关闭活动筛选');
   const current=(draft.community||'current')==='current';
   for(const id of ['39:2248','39:2249','39:2259']){const e=at(id);bind(e,{action:'filter-choice',key:'community',value:current?'all':'current'},'只查看当前社区的活动');if(e){e.setAttribute('aria-pressed',String(current));if(id==='39:2248'){e.setAttribute('role','checkbox');e.setAttribute('aria-checked',String(current));if(!current){e.style.backgroundColor='transparent';e.style.boxShadow='inset 0 0 0 2px #dedbd7';}}if(id==='39:2259'&&!current)e.style.visibility='hidden';}}
   // The mask covers the list in the source composition; keep underlying controls out of Tab order.
   for(const node of children.slice(0,end)){node.setAttribute('inert','');for(const e of [node,...node.querySelectorAll('[tabindex]')]){if(e.hasAttribute('tabindex'))e.tabIndex=-1;}}
  }
  return;
 }
 const id=url.pathname.split('/')[2],a=state.activities.find(a=>a.id===id);if(!a)return;
 const st=activityState(state,id),booked=name==='activity-booked',full=name==='activity-full';
 const ids=booked?{title:'11:1827',organizer:'11:1841',capacity:'11:1849',remaining:'11:1855',date:'11:1861',time:'11:1862',location:'11:1863'}:full?{title:'3:5735',organizer:'3:5732',capacity:'3:5739',remaining:'3:5741',date:'3:5736',location:'3:5737'}:{title:'3:6145',organizer:'3:6142',capacity:'3:6149',remaining:'3:6151',date:'3:6146',location:'3:6147'};
 const date=Number(a.date.slice(5,7))+'月'+Number(a.date.slice(8))+'日';
 // The fixed four-character heading and illustrated hero remain the original design.
 root.setAttribute('aria-label',a.title+'，'+(st.ended?'活动已结束':st.mine?'已报名':st.full?'名额已满':'可以报名'));
 set(ids.organizer,state.cloud&&!a.sample?a.title+' · '+a.organizer:a.organizer);set(ids.capacity,booked?a.capacity:a.capacity+'人');set(ids.remaining,booked?st.remaining:st.remaining+'人');set(ids.date,date+(booked?'':' '+a.time));if(booked)set(ids.time,a.time);set(ids.location,a.location);
 for(const e of root.querySelectorAll('[data-name]')){
  const n=e.dataset.name;
  if(/icon-back|header-back/.test(n))bind(e,{action:'back'},'返回');
  if(/calendar/.test(n))bind(e,{action:'activity-calendar',id},'添加活动到日历');
  if(/icon-(location|pin)|event-(location|pin)|location-pin/.test(n))bind(e,{action:'copy-location',id},'复制活动地点');
  if(/speech-bubble|confirmation-speech|flower.*bubble/.test(n))bind(e,{action:'activity-info',id,kind:booked?'booking':full||st.ended?'text':'welcome',text:st.ended?'活动已结束':'本场名额已满'},'查看活动提示');
  if(/icon-(people|person)/.test(n))bind(e,{action:'activity-info',id,kind:'capacity'},'查看报名名额');
  const step=/step-tile-(\d)|step([123])(?:[／-]|$)|step-(herb|transplant|care)/.exec(n);
  if(step){const index=step[1]||step[2]||({herb:1,transplant:2,care:3})[step[3]];bind(e,{action:'activity-info',id,kind:'step',index:String(Number(index)-1)},a.steps[Number(index)-1]);}
 }
 const stepIds=booked?['11:1884','11:1888','11:1893']:full?['3:5767','3:5768','3:5769']:['3:6177','3:6178','3:6179'];
 stepIds.forEach((key,i)=>bind(at(key),{action:'activity-info',id,kind:'step',index:String(i)},a.steps[i]));
 const arrows=[...root.querySelectorAll('[data-name]')].filter(e=>/step-arrow/.test(e.dataset.name)&&!e.parentElement.closest('[data-name*="step-arrow"]'));
 arrows.forEach((e,i)=>{for(const target of [e,...e.querySelectorAll('[data-name]')])bind(target,{action:'activity-info',id,kind:'step',index:String(i+1)},'下一步：'+a.steps[i+1]);});
 for(const e of root.querySelectorAll('p'))if(/^(准备|参与|参加须知|参与须知|花园见!|欢迎报名参加|社区提供种苗和工具)$/.test(e.textContent))bind(e,{action:'activity-info',id,kind:'text',text:e.textContent});
 for(const key of [ids.date,ids.time].filter(Boolean))bind(at(key),{action:'activity-calendar',id},'添加活动到日历：'+date+' '+a.time);
 bind(at(ids.location),{action:'copy-location',id},'复制活动地点：'+a.location);
 for(const key of [ids.capacity,ids.remaining])bind(at(key),{action:'activity-info',id,kind:'capacity'},'查看报名名额');
 for(const key of booked?['11:1847','11:1853']:[])bind(at(key),{action:'activity-info',id,kind:'capacity'},'查看报名名额');
 // Every state owns different Figma node IDs, including the cancel background and reminder bubble.
 if(booked){for(const key of ['11:1919','11:1920','11:1921'])bind(at(key),{action:'cancel-booking',id},'取消报名');bind(at('11:1922'),{action:'activity-info',id,kind:'booking'},'查看报名状态');}
 for(const e of root.querySelectorAll('[data-action=book]')){const disabled=st.ended||st.full;e.setAttribute('aria-disabled',String(disabled));e.dataset.disabled=String(disabled);}
 if(st.ended&&!booked){set(full?'3:5805':'3:6215','活动已结束');if(full){set('3:5759','本场活动已结束');set('3:5760','可以看看其他社区活动');}}
 for(const key of full?['3:5805','3:5759']:[]){bind(at(key),{action:'activity-info',id,kind:'text',text:st.ended?'活动已结束':'本场名额已满'},st.ended?'活动已结束':'名额已满');at(key)?.setAttribute('aria-disabled','true');}
}

export function syncActivitySelections(root){
 if(root?.dataset.screen!=='filter')return;
 for(const [key,ids,labels,markId,sourceIndex,circleId]of filterGroups){
  const boxes=ids.map(id=>root.querySelector('[data-node-id="'+id+'"]')),mark=root.querySelector('[data-node-id="'+markId+'"]');if(!mark||!boxes[0]?.getBoundingClientRect().width)continue;
  const selected=boxes.find(e=>e?.getAttribute('aria-pressed')==='true')||boxes[sourceIndex];if(selected===boxes[sourceIndex])continue;
  const on=getComputedStyle(boxes[sourceIndex]),off=getComputedStyle(boxes[sourceIndex?0:1]),colors=[on.backgroundColor,on.borderColor,off.backgroundColor,off.borderColor];
  boxes.forEach(e=>{e.style.backgroundColor=e===selected?colors[0]:colors[2];e.style.borderColor=e===selected?colors[1]:colors[3];});
  const base=boxes[sourceIndex].getBoundingClientRect(),target=selected.getBoundingClientRect();for(const layer of [mark,root.querySelector('[data-node-id="'+circleId+'"]')].filter(Boolean)){const old=layer.style.translate.split(' ').map(parseFloat);layer.style.translate=((old[0]||0)+target.right-base.right)+'px '+((old[1]||0)+target.top-base.top)+'px';}
 }
}
