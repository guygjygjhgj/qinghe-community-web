import {demo,selected,ART_SEED,PRESS_SEED} from './engine.mjs';
import {objects,STAGES,getHint} from './scene.mjs';
const copy=x=>structuredClone(x);
export const DESIGNS=[
[0,'default','认识'],[0,'touch','触碰反馈'],[0,'observe','观察近景'],
[1,'default','未选择'],[1,'one','选好一片'],[1,'drag','拖动中'],[1,'partial','部分选择'],[1,'bad','待整理叶提示'],[1,'corrected','修正选择'],[1,'done','五片选好'],
[2,'default','观察湿叶'],[2,'cloth','选吸水布'],[2,'drying','正在吸水'],[2,'half','局部吸干'],[2,'done','全部干燥'],
[3,'default','开始铺叶'],[3,'partial','部分铺开'],[3,'overlap','叠压待调整'],[3,'spread','叶片铺开'],[3,'coverMoving','盖纸过程'],[3,'bookMoving','落书过程'],[3,'waiting','重书压叶'],[3,'lift','拿开重书'],[3,'done','五片压平'],
[4,'default','准备涂胶'],[4,'brush','选中刷子'],[4,'partial','涂胶中'],[4,'done','树冠胶面完成'],
[5,'empty','开始拼画'],[5,'selected','选中第一片'],[5,'lift','叶片离盘'],[5,'landing','落到画纸'],[5,'partial','部分树冠'],[5,'outside','超出纸边提示'],[5,'overlap','重叠待调整'],[5,'four','四片已放'],[5,'default','最后一片'],[5,'done','拼画完成'],
[6,'default','逐片按牢'],[6,'press','按压中'],[6,'fixed','五片已固定'],[6,'base','装入底座'],[6,'putIn','画纸入槽过程'],[6,'close','合上前沿'],[6,'closed','装框完成'],
[7,'default','打开支架'],[7,'moving','画框移动与阴影'],[7,'placed','画框放稳'],[8,'default','制作完成'],[8,'saved','收藏完成'],[8,'saveError','保存异常']
];
export function designState(stage,variant='default'){
 const s=demo(stage,variant);const leaves=selected(s);const art=n=>{leaves.forEach((l,i)=>l.art=i<n?copy(ART_SEED[l.id]):null)};const spread=n=>{leaves.forEach((l,i)=>l.press=i<n?copy(PRESS_SEED[l.id]):null)};
 if(stage===0&&variant==='touch')s.picked='a';if(stage===0&&variant==='observe')s.dialog={kind:'observe',title:'一片银杏叶',text:'像小扇子的叶片，叶脉向外展开。中央的天然小缺口，也可以放心留下来。'};
 if(stage===1){const n={one:1,partial:3,corrected:2,done:5}[variant]||0;s.leaves.forEach((l,i)=>l.selected=l.good&&i<n);if(variant==='drag'){s.picked='a';s.dragView={id:'a',x:400,y:330,w:135,h:145};}if(variant==='bad')s.feedback='这片边缘破损较大，先留在原盘。中央的天然缺口不用担心。';}
 if(stage===2){if(['cloth','drying'].includes(variant))s.picked='cloth';if(['half','drying'].includes(variant))leaves[0].dryZones=[0];if(variant==='drying')s.dragView={id:'cloth',x:160,y:278,w:180,h:150};if(variant==='done')leaves.forEach(l=>{l.moisture=false;l.dryZones=[0,1]});}
 if(stage===3){s.pressPhase='spread';spread(variant==='default'?0:['partial','overlap'].includes(variant)?2:5);if(variant==='overlap')s.feedback='这两片叠得太多，分开一点再压。';if(['coverMoving'].includes(variant)){s.pressPhase='book';s.pose={upperPaper:{x:350,y:166,w:350,h:355}};}if(['bookMoving','waiting'].includes(variant)){s.pressPhase='waiting';s.waitMs=2800;if(variant==='bookMoving')s.pose={book:{x:73,y:159,w:377,h:454}};}if(variant==='lift'){s.pressPhase='uncover';s.pose={book:{x:79,y:144,w:370,h:436,lift:true,z:8}};}if(variant==='done'){s.pressPhase='done';leaves.forEach(l=>l.flat=true);}}
 if(stage===4){if(variant==='brush')s.picked='brush';if(variant==='done'){s.glue=[0,1,2];s.brushLoaded=true;}}
 if(stage===5){art(['partial','outside','overlap'].includes(variant)?2:variant==='landing'?1:['four','default'].includes(variant)?4:variant==='done'?5:0);if(['selected','lift'].includes(variant))s.picked='a';if(variant==='lift')s.dragView={id:'a',x:265,y:270,w:182,h:191};if(variant==='landing')s.pose={a:{x:245,y:284,w:182,h:191,r:-12}};if(variant==='outside')s.feedback='叶片要完整留在纸上，再往里挪一点。';if(variant==='overlap')s.feedback='叶片叠得太多，稍微分开一点。';}
 if(stage===6){if(variant==='press'){s.picked='pressSheet';leaves[0].fixed=true;leaves[1].fixed=true;s.dragView={id:'pressSheet',x:291,y:448,w:160,h:180};}if(['fixed','base','putIn','close','closed'].includes(variant)){leaves.forEach(l=>l.fixed=true);s.framePhase=['fixed','base','putIn'].includes(variant)?'base':variant==='closed'?'closed':'close';}if(variant==='putIn')s.dragAssembly={x:24,y:-32};}
 if(stage===7&&variant!=='default'){s.standOpen=true;if(variant==='placed')s.framePlaced={x:375,y:515};if(variant==='moving'){s.dragAssembly={x:-34,y:-18};s.picked='frameFront';}}
 if(stage===8&&variant==='saved')s.saved=true;if(stage===8&&variant==='saveError')s.feedback='刚才没有保存好，作品还在，可以再试一次。';
 return s;
}
export function designView(stage,variant='default'){const state=designState(stage,variant);const group=['artCard',...selected(state).map(l=>l.id),...(stage>=7?['frameFront','stand']:[])];const dx=(stage>=7&&state.framePlaced?state.framePlaced.x-436:0)+(state.dragAssembly?.x||0),dy=(stage>=7&&state.framePlaced?state.framePlaced.y-497:0)+(state.dragAssembly?.y||0);const nodes=objects(state).map(n=>({...n,...state.pose?.[n.id],...(state.dragView?.id===n.id?{...state.dragView,z:40,lift:true,glow:true}:{}),...(group.includes(n.id)?{x:n.x+dx,y:n.y+dy,lift:!!state.dragAssembly}: {})}));return {state,nodes,branchAt:{x:213+dx,y:240+dy},title:STAGES[stage][0],subtitle:STAGES[stage][1],hint:state.feedback||getHint(state)};}
