// Shared, versioned contract for the elder app and the community reader.
// This describes the original QH tasks; it is not a clinical scale conversion.
export const COGNITIVE_SCHEMA='qinghe-cognitive-assessment/v1';
export const ELDER_STORAGE_KEY='qinghe-community-v1';
export const TASKS=[
 ['scene','看图识记','immediate_memory',2,'正确题数 / 2；15秒观察后选择识别'],
 ['sequence','数字顺序','executive',null,'正确点击 / 全部点击；允许纠正，另列错误点击'],
 ['recall','稍后回忆','delayed_memory',3,'正确题数 / 3；有选择线索，需完成看图识记'],
 ['position','翻牌记忆','visuospatial',3,'位置对应正确 / 3；仅覆盖位置记忆'],
 ['repetition','重复图片','immediate_memory',12,'识别正确 / 12；另列重复命中和非重复误认'],
 ['arithmetic','简单计算','attention',4,'正确题数 / 4；计算表现，不能单独代表注意能力'],
 ['orientation','今天的日期',null,4,'正确题数 / 4；以开始时设备本地日期核对'],
 ['naming','擦图识物','language',3,'选择命名正确 / 3；显示图片辅助单列'],
 ['target','看到 1 就点','attention',20,'有效试次中：命中或正确等待 / 有效试次；中断排除']
].map(([id,name,domain,count,rule])=>({id,name,domain,count,rule}));
export const DOMAINS=[['immediate_memory','即刻记忆与学习'],['delayed_memory','延迟记忆'],['attention','注意'],['language','语言与语义信息使用'],['executive','执行功能'],['social','社交认知'],['visuospatial','视空间与构建']];
const num=(v,max=86400000)=>Number.isFinite(v)&&v>=0&&v<=max?v:null;
const str=(v,n=300)=>typeof v==='string'?v.slice(0,n):'';
const date=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():null;
const itemKeys=['question','answer','expected','correct','latencyMs','label','clicked','atMs','image','repeated','responseRepeated','assistedReveal','trial','digit','target','responded','clicks','reactionMs','interrupted','outcome'];
function item(raw){if(!raw||typeof raw!=='object')throw Error('逐题记录格式不正确');return Object.fromEntries(itemKeys.filter(k=>['string','number','boolean'].includes(typeof raw[k])||raw[k]===null).map(k=>[k,typeof raw[k]==='string'?str(raw[k]):raw[k]]));}
export function normalizeAssessment(raw){
 if(!raw||raw.prototype!=='QH-DEMO-1.0'||!Array.isArray(raw.tasks)||raw.tasks.length!==9)throw Error('不支持的测验版本或任务数；需要 QH-DEMO-1.0 的九项原始记录');
 const startedAt=date(raw.startedAt),completedAt=date(raw.completedAt||raw.exportedAt);
 if(!startedAt||!completedAt||Date.parse(completedAt)<Date.parse(startedAt))throw Error('测评开始或完成时间无效');
 if(!/^[\w-]{8,100}$/.test(raw.assessmentId||''))throw Error('测评缺少有效记录编号，请重新导出新版记录');
 const records=raw.tasks.map((t,i)=>{const r=t.record;if(t.name!==TASKS[i].name||!r||!Array.isArray(r.items)||r.items.length>500)throw Error('任务名称、顺序或逐题记录无效');
  const status=['completed','skipped','unavailable','not_started'].includes(r.status)?r.status:r.completed===true?'completed':'not_started';
  const items=r.items.map(item),completed=status==='completed'&&r.completed===true;
  if(completed&&(TASKS[i].count!==null&&items.length!==TASKS[i].count||!items.length))throw Error(`${TASKS[i].name}的完成状态与题数不一致`);
  return {id:TASKS[i].id,name:TASKS[i].name,record:{completed,status,label:completed?'已完成':({skipped:'已跳过',unavailable:'前置任务未完成',not_started:'未完成'}[status]||'未完成'),startedAt:date(r.startedAt),completedAt:date(r.completedAt),durationMs:num(r.durationMs),items,notes:Array.isArray(r.notes)?r.notes.slice(0,12).map(x=>str(x,500)):[]}};
 });
 return {schema:COGNITIVE_SCHEMA,assessmentId:raw.assessmentId,prototype:'QH-DEMO-1.0',startedAt,completedAt,referenceLocalDate:str(raw.referenceLocalDate,20),tourMode:raw.tourMode===true,activeMs:num(raw.activeMs),pauseCount:num(raw.pauseCount,100000),hiddenCount:num(raw.hiddenCount,100000),sound:typeof raw.sound==='boolean'?raw.sound:null,clinicalScore:null,clinicalClassification:null,tasks:records};
}
export function storeAssessment(state,userId,raw){
 if(!state.loggedIn||state.userId!==userId||!Object.hasOwn(state.users,userId))throw Error('登录账号已变化，未保存至其他居民');
 const value=normalizeAssessment(raw),user=state.users[userId];
 const history=Array.isArray(user.cognitiveAssessments)?user.cognitiveAssessments:[];
 const existing=history.find(x=>x.assessmentId===value.assessmentId);
 if(existing){if(JSON.stringify(normalizeAssessment(existing))!==JSON.stringify(value))throw Error('同一测评编号的内容冲突，保留已保存记录');return false;}
 user.cognitiveAssessments=[...history,value];return true;
}
export function taskScore(assessment,index){
 const task=TASKS[index],r=assessment.tasks[index].record;
 const base={...task,status:r.status,completed:r.completed,score:null,numerator:0,denominator:0,excluded:0,errors:null,assisted:0,medianMs:null,issues:[]};
 if(!r.completed)return base;
 if(index===2&&!assessment.tasks[0].record.completed)return {...base,issues:['看图识记未完成，不解释延迟回忆'],status:'unavailable'};
 let items=r.items;
 if(index===8){
  const valid=items.filter(x=>x.interrupted===false&&typeof x.responded==='boolean'&&Number.isInteger(x.digit)&&x.digit>=1&&x.digit<=9);
  base.excluded=items.length-valid.length;base.hits=valid.filter(x=>x.digit===1&&x.responded).length;base.targets=valid.filter(x=>x.digit===1).length;
  base.misses=base.targets-base.hits;base.falseAlarms=valid.filter(x=>x.digit!==1&&x.responded).length;
  base.numerator=valid.filter(x=>(x.digit===1)===x.responded).length;base.denominator=valid.length;
  const times=valid.filter(x=>x.digit===1&&x.responded&&num(x.reactionMs,1200)!==null).map(x=>x.reactionMs).sort((a,b)=>a-b);
  if(times.length)base.medianMs=times.length%2?times[(times.length-1)/2]:(times[times.length/2-1]+times[times.length/2])/2;
 }else{
  if(index===1){let expected=1;items=items.map(x=>{const valid=Number.isInteger(x.clicked)&&x.clicked>=1&&x.clicked<=9&&expected<=9,correct=valid&&x.clicked===expected;const result={...x,expected:valid?expected:null,valid};if(correct)expected++;return result;});if(expected!==10)base.issues.push('顺序流程未完整完成');}
  items=items.filter(x=>index===1?x.valid:x.answer!==undefined&&x.expected!==undefined&&x.expected!==null);
  // Recompute from raw answers instead of trusting imported correct flags or percentages.
  base.numerator=items.filter(x=>String(index===1?x.clicked:x.answer)===String(x.expected)).length;
  base.denominator=items.length;base.errors=items.length-base.numerator;base.excluded=r.items.length-items.length;
  if(index===7)base.assisted=items.filter(x=>x.assistedReveal===true).length;
 }
 if(base.denominator)base.score=base.numerator/base.denominator*100;
 if(base.excluded)base.issues.push(`${base.excluded}条中断或缺少依据的记录未计入`);
 return base;
}
export function domainCoverage(assessment){return DOMAINS.map(([key,label])=>({key,label,tasks:TASKS.map((t,i)=>({...taskScore(assessment,i),index:i})).filter(t=>t.domain===key),note:key==='social'?'现有九项任务未覆盖社交认知':key==='visuospatial'?'位置记忆有材料；构建能力未覆盖':key==='executive'?'顺序搜索有材料；不等同于完整执行功能评估':''}));}
export function comparableTask(a,b,index){
 if(a.prototype!==b.prototype||a.tourMode||b.tourMode)return false;
 if(index===8&&(a.sound===null||b.sound===null||a.sound!==b.sound))return false;
 if(index===7){const signature=x=>x.tasks[7].record.items.map(v=>typeof v.assistedReveal==='boolean'?v.assistedReveal:null);const left=signature(a),right=signature(b);if(left.includes(null)||right.includes(null)||JSON.stringify(left)!==JSON.stringify(right))return false;}
 return true;
}
export function assessmentResidents(raw){
 if(!raw?.users||typeof raw.users!=='object')return {residents:[],issues:[]};
 const residents=[],issues=[];
 for(const [id,u]of Object.entries(raw.users)){
  if(!u||typeof u!=='object')continue;const assessments=[];
  for(const value of Array.isArray(u.cognitiveAssessments)?u.cognitiveAssessments:[])try{const a=normalizeAssessment(value);if(!assessments.some(x=>x.assessmentId===a.assessmentId))assessments.push(a);}catch(err){issues.push(`${str(u.name||id,60)}：${err.message}`);}
  if(!assessments.length&&!u.cognitiveOnboarding)continue;
  assessments.sort((a,b)=>a.completedAt.localeCompare(b.completedAt));
  residents.push({id:'elder:'+id,sourceUserId:id,name:str(u.name,60)||'未命名居民',age:Number.isInteger(u.age)&&u.age>=0&&u.age<=130?u.age:null,education:str(u.education,100)||null,onboarding:u.cognitiveOnboarding?{status:['finished','deferred'].includes(u.cognitiveOnboarding.status)?u.cognitiveOnboarding.status:'unknown',seenAt:date(u.cognitiveOnboarding.seenAt)}:null,assessments});
 }
 return {residents,issues};
}
export function exportAssessmentPackage(resident,assessments=resident.assessments){return {schema:'qinghe-cognitive-transfer/v1',exportedAt:new Date().toISOString(),resident:{sourceUserId:resident.sourceUserId,name:resident.name,age:resident.age,education:resident.education},assessments:assessments.map(normalizeAssessment)};}
export function readAssessmentPackage(value){
 if(value?.schema!=='qinghe-cognitive-transfer/v1'||!value.resident||typeof value.resident.sourceUserId!=='string'||!/^[\w:-]{1,150}$/.test(value.resident.sourceUserId)||!Array.isArray(value.assessments)||!value.assessments.length||value.assessments.length>200)throw Error('请选择带居民编号的青禾测评资料包；不能仅凭姓名自动关联');
 const r=value.resident;if(typeof r.name!=='string'||!r.name.trim())throw Error('居民姓名缺失');
 return {id:'elder:'+r.sourceUserId,sourceUserId:r.sourceUserId,name:str(r.name,60),age:Number.isInteger(r.age)&&r.age>=0&&r.age<=130?r.age:null,education:str(r.education,100)||null,assessments:value.assessments.map(normalizeAssessment)};
}
