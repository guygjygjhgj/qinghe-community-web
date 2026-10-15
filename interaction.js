export function textLimit(field,fallback=500){return Number(field?.maxLength)>0?Number(field.maxLength):fallback;}
export function postTitle(value){return value.title?.trim()||(value.type==='seed'?value.seedName?.trim():Array.from(value.body?.trim().split(/\n/)[0]||'').slice(0,20).join(''))||'我的种植近况';}
export function insertionContext(field){
 const length=field.value.length,start=Math.max(0,Math.min(length,field.selectionStart??length)),end=Math.max(start,Math.min(length,field.selectionEnd??start));
 return {start,end,max:textLimit(field),remaining:textLimit(field)-length+(end-start)};
}
export function insertText(value,text,context){
 const next=value.slice(0,context.start)+text+value.slice(context.end);
 if(next.length>context.max)throw Error(`插入后超过${context.max}字，请先精简文字`);
 return {value:next,caret:context.start+text.length};
}
export function validateText(value,max,label='内容',required=true){
 const text=String(value??'').trim();
 if(required&&!text)throw Error(`请填写${label}`);
 if(text.length>max)throw Error(`${label}最多${max}字`);
 return text;
}
export function syncFields(root){
 for(const form of root.querySelectorAll('form[data-form]')){
  for(const field of form.querySelectorAll('input[name],textarea[name]')){
   if(field.maxLength>0){const counter=form.querySelector(`[data-counter="${field.name}"]`);if(counter){const template=counter.dataset.counterTemplate||counter.textContent;counter.dataset.counterTemplate=template;const separator=template.match(/\d+(\s*\/\s*)\d+/)?.[1]||' / ';counter.textContent=`${field.value.length}${separator}${field.maxLength}`;counter.classList.toggle('over-limit',field.value.length>field.maxLength);}}
   if(field.matches('textarea[data-autosize]')){field.style.height='auto';if(field.scrollHeight)field.style.height=Math.min(180,Math.max(48,field.scrollHeight))+'px';}
  }
  const kind=form.dataset.form,button=form.querySelector('[type="submit"]');
  if(button&&['chat','comment','search'].includes(kind)){const field=form.elements.namedItem(kind==='search'?'q':'text');button.disabled=!field?.value.trim()||field.value.length>textLimit(field);}
 }
}
export function calendarFile(activity){
 const date=activity.date.replaceAll('-',''),times=activity.time.match(/\d{1,2}:\d{2}/g)||['09:00','10:00'];
 const stamp=time=>date+'T'+time.padStart(5,'0').replace(':','')+'00';
 const escape=value=>String(value??'').replaceAll('\\','\\\\').replace(/\r?\n/g,'\\n').replaceAll(';','\\;').replaceAll(',','\\,');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Qinghe//Community//ZH','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${escape(activity.id)}@qinghe.local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART;TZID=Asia/Shanghai:${stamp(times[0])}`,`DTEND;TZID=Asia/Shanghai:${stamp(times[1]||times[0])}`,`SUMMARY:${escape(activity.title)}`,`LOCATION:${escape(activity.location)}`,'DESCRIPTION:青禾社区活动，实际时间与地点以活动详情为准。','END:VEVENT','END:VCALENDAR',''].join('\r\n');
}
