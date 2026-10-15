// One next action at a time. Decorative and automatic stages have no touch cue.
export function guidance(g,{paused=false,ready=true,readOnly=false,saved=false}={}){
 if(paused||!ready||readOnly)return null;
 const s=g.stage;
 if(['peel','clear','wash','rinse'].includes(s)&&g[s]>=1)return {text:'做好了，稍等片刻。'};
 switch(s){
 case 'harvest':return {source:'shears',target:'target',gesture:'drag',text:'按住剪刀，把剪口移到光圈。',label:'按住剪刀，向上拖'};
 case 'landed':return {text:'正在放进竹盘，暂时不用操作。'};
 case 'peel':return {source:'peel-grip',gesture:'peel',text:'按住翘皮，顺着箭头慢慢拉。',label:'按住翘皮，向右下拉'};
 case 'clear':return {source:'fruit',gesture:'sway',text:'按住丝瓜，轻轻来回移动。',label:'按住丝瓜，来回抖动'};
 case 'wash':case 'rinse':return g.water
  ?{source:'fruit',target:'stream',gesture:'drag',text:'拖到水流光圈里，按住冲洗。',label:'拖到水下，按住冲洗'}
  :{source:'faucet',gesture:'tap',text:'先点一下发光的水龙头把手。',label:'点把手，打开水'};
 case 'place':case 'return':return {source:'fruit',target:'rack',gesture:'drag',text:'按住丝瓜，拖到右边竹架上。',label:'拖到竹架，松手放下'};
 case 'dry':return {text:'正在晾干，不用操作。'};
 case 'try':return {source:'fruit',target:'bowl',gesture:'drag',text:'按住丝瓜络，拖到下面碗里。',label:'按住丝瓜络，向下拖'};
 case 'scrub':return {source:'fruit',gesture:'wipe',text:'按住丝瓜络，沿碗里残留擦。',label:'沿着残留，来回擦'};
 case 'complete':return {source:'collect',gesture:'tap',text:saved?'作品收好了，可以去收藏里看看。':'点一下发光的“收进作品收藏”。'};
 default:return null;
 }
}
