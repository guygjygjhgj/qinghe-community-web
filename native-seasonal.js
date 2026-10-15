// Runtime bindings for the original seasonal games / friends-circle Figma frame.
export function completeSeasonal(root,{state,url,assets}){
 const at=id=>root.querySelector('[data-node-id="'+id+'"]');
 const named=name=>root.querySelector('[data-name="'+name+'"]');
 const bind=(el,props,label)=>{if(!el)return;Object.assign(el.dataset,props);el.classList.add('native-control');el.role='button';el.tabIndex=0;el.setAttribute('aria-label',label||el.textContent.trim());};
 const route=(el,to,label)=>bind(el,{route:to},label);
 const games=['osmanthus','cotton','luffa','corn','ginkgo'];
 const labels=['桂花','棉花','丝瓜','玉米','银杏'];
 games.forEach((game,i)=>route(named('game'+(i+1)+'-card'),'/games/'+game,'进入'+labels[i]+'游戏'));
 const strip=at('1004:942');if(strip){Object.assign(strip.style,{width:'729.02px',overflowX:'auto',overflowY:'hidden',scrollbarWidth:'none',overscrollBehaviorX:'contain'});strip.dataset.scrollRegion='seasonal-games';strip.tabIndex=0;strip.setAttribute('aria-label','植物游戏，可左右滚动');}
 const rests=named('位置/rest-pill');if(rests){const select=document.createElement('select');select.className='seasonal-game-select';select.dataset.gameSelect='true';select.setAttribute('aria-label','休息选择，选择植物游戏');for(const [value,label]of [['','休息选择'],...games.map((v,i)=>[v,labels[i]])]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}rests.append(select);}
 const leaf=text=>[...root.querySelectorAll('p')].find(e=>e.textContent.trim()===text);
 route(leaf('广场'),'/community');route(leaf('游戏'),'/seasonal');
 route(root.querySelector('#node-1004_806'),'/games/osmanthus','立即加入桂花游戏');
 route(root.querySelector('#node-1004_807'),'/games/osmanthus','我也来做桂花糕');
 route(root.querySelector('#node-1004_808'),'/seasonal?panel=work&comments=1','查看桂花糕作品');
 for(const name of ['banner-speech-left','banner-speech-right'])route(named(name),'/games/osmanthus','加入桂花游戏');
 for(const label of ['来出发吧!','一起玩呀!'])route(leaf(label),'/games/osmanthus','加入桂花游戏');
 route(named('autumn-bubble'),'/seasonal?panel=work&comments=1','查看秋日小收获');
 route(leaf('秋日小收获'),'/seasonal?panel=work&comments=1');
 route(leaf('桂花小游戏 · 制作成果'),'/games/osmanthus');
 const like=!!state.settings.seasonalLiked;
 for(const id of ['1004:1091','1004:1095']){const el=at(id);bind(el,{action:'seasonal-like'},like?'取消点赞':'点赞');el?.setAttribute('aria-pressed',String(like));}
 at('1004:1096').textContent=String(12+Number(like));
 for(const id of ['1004:1099','1004:1103'])route(at(id),'/seasonal?panel=comments&comments=1','查看和写留言');
 at('1004:1104').textContent=String(3+(state.settings.seasonalReplies?.length||0));
 ['1004:1084','1004:1086','1004:1088','1004:1089'].forEach((id,i)=>route(at(id),'/seasonal?panel=work&photo='+i+'&comments=1','查看制作过程第'+(i+1)+'张照片'));
 for(const [label,to]of [['首页','/'],['动态','/community'],['信息','/messages'],['我的','/me']])route(named('导航/'+label),to,label);
 route(named('nav-mic-disc'),'/publish','发布帖子');
 route(root.querySelector('[data-name="青禾／游戏圈／PNG图标/nav-mic"]'),'/publish','发布帖子');
 const panel=url.searchParams.get('panel');
 if(panel==='work'||panel==='comments'){
  const section=document.createElement('section');section.id='comments';section.className='seasonal-detail';
  const back=document.createElement('button');back.type='button';back.className='btn btn-outline';back.dataset.route='/seasonal';back.textContent='返回游戏圈';section.append(back);
  const heading=document.createElement('h2');heading.textContent=panel==='work'?'桂花小游戏 · 制作成果':'写留言';section.append(heading);
  if(panel==='work'){
   const requested=Number(url.searchParams.get('photo')||0),index=Number.isInteger(requested)?Math.max(0,Math.min(3,requested)):0;
   const image=document.createElement('img');image.src=assets.seasonal['imgPhotoStep'+(index+1)+'png'].file;image.alt='李大爷的桂花糕制作成果，第'+(index+1)+'张';image.className='seasonal-work-photo';section.append(image);
   const controls=document.createElement('div');controls.className='inline-actions';
   for(const [text,next]of [['上一张',index-1],['下一张',index+1]]){const button=document.createElement('button');button.type='button';button.className='btn btn-outline';button.textContent=text;button.disabled=next<0||next>3;button.dataset.route='/seasonal?panel=work&photo='+next+'&comments=1';controls.append(button);}
   const position=document.createElement('span');position.textContent=(index+1)+' / 4';controls.append(position);section.append(controls);
  }else{
   for(const reply of state.settings.seasonalReplies||[]){const item=document.createElement('p');item.className='seasonal-reply';item.textContent=(state.users[reply.author]?.name||'邻居')+'：'+reply.text;section.append(item);}
   const form=document.createElement('form');form.dataset.form='seasonal-comment';
   const input=document.createElement('textarea');input.name='text';input.required=true;input.maxLength=500;input.placeholder='和邻居聊聊这份秋日收获…';input.setAttribute('aria-label','游戏圈留言');
   const button=document.createElement('button');button.type='submit';button.className='btn btn-primary';button.textContent='发送';form.append(input,button);section.append(form);
  }
  const replyHeight=(state.settings.seasonalReplies||[]).reduce((sum,reply)=>sum+Math.max(1,Math.ceil(reply.text.length/23)+reply.text.split('\n').length-1)*39+30,0);
  root.append(section);root.style.height=(1532.3426513671875+(panel==='work'?780:450+replyHeight))+'px';
 }
}
