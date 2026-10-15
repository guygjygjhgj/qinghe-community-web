import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {LocalGameContext} from './context';
import {loadGameRecords,saveGameRecord} from './store';
import Osmanthus from '@game/osmanthus-game';import Luffa from '@game/luffa-journey';import Chrysanthemum from '@game/chrysanthemum-game';import Ginkgo from '@game/ginkgo-game';import Works from '@game/works-page';
import '@game/globals.css';
function App(){
 const initial=new URLSearchParams(location.search),[query,setQuery]=useState(initial),[route,setRoute]=useState('S05'),[notice,setNotice]=useState('');
 const [records,setRecords]=useState(()=>loadGameRecords(localStorage));
 const [settings,setSettings]=useState({voice:false,reduce:false});
 const go=(id:string,params?:Record<string,string>)=>{if(['S01','S02','S28','S35','S36'].includes(id)){parent.postMessage({source:'qinghe-games',type:'exit'},location.origin);return;}if(params)setQuery(new URLSearchParams(params));setRoute(id);window.scrollTo(0,0)};
 const context={route,query,go,back:()=>go('S01'),open:()=>{},close:()=>{},settings,setSettings,toast:setNotice,online:false,user:{id:'local-games'},busy:false,records,list:(kind:string)=>records.filter((r:any)=>r.kind===kind&&!r.deleted),find:(id:string)=>records.find((r:any)=>r.id===id),
  save:async(record:any)=>{const {saved,records}=saveGameRecord(localStorage,record);setRecords(records);return saved;},
  voice:(text:string)=>{if(!window.speechSynthesis){setNotice('当前浏览器不支持朗读');return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';speechSynthesis.speak(u);}};
 const game=query.get('game')||'chrysanthemum';
 return <LocalGameContext.Provider value={context}><main>{route==='S37'?<Works/>:game==='osmanthus'?<Osmanthus/>:game==='luffa'?<Luffa/>:game==='ginkgo'?<Ginkgo/>:<Chrysanthemum/>}</main>{notice&&<div className="toast" role="status">{notice}</div>}</LocalGameContext.Provider>
}createRoot(document.getElementById('root')!).render(<App/>);
