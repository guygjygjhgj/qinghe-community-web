export const AUTH_SERVICE='https://qinghe-registration-service.hebaixuan01111123.chatgpt.site/api/';
export const AUTH_SESSION_KEY='qinghe-approved-session-v1';
export const AUTH_REQUEST_KEY='qinghe-registration-request-v1';
export function completeAuthControls(root){
 const form=root.querySelector('form[data-form=login]');if(!form)return;
 const phone=form.elements.namedItem('phone'),code=form.elements.namedItem('code'),name=form.elements.namedItem('name');
 if(phone){phone.type='tel';phone.inputMode='numeric';phone.autocomplete='tel-national';phone.pattern='1990000[0-9]{4}';phone.setAttribute('aria-label','手机号');}
 if(code){code.inputMode='numeric';code.autocomplete='one-time-code';code.pattern='[0-9]{6}';code.setAttribute('aria-label','验证码');}
 if(name){name.autocomplete='nickname';name.setAttribute('aria-label','昵称');}
 for(const [selector,action,label] of [['#node-3_7007','submit-native','登录并进入'],['#node-3_7004','get-code','获取验证码']]){
  const button=root.querySelector(selector);if(!button)continue;
  for(const el of button.querySelectorAll('[data-action]')){delete el.dataset.action;delete el.dataset.form;el.removeAttribute('role');el.removeAttribute('tabindex');}
  Object.assign(button.dataset,{action,form:'login'});button.setAttribute('role','button');button.setAttribute('aria-label',label);button.tabIndex=0;
 }
 const row=root.querySelector('[data-node-id="3:6958"]');if(row?.dataset.action==='get-code'){delete row.dataset.action;row.removeAttribute('role');row.removeAttribute('tabindex');}
}
export function createDemoAuth({storage,fetchImpl=(...args)=>fetch(...args)}){
 let session=null;try{session=JSON.parse(storage.getItem(AUTH_SESSION_KEY));}catch{}
 async function request(path,{data,token=session?.token}={}){
  let response;try{response=await fetchImpl(AUTH_SERVICE+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(12000)});}catch{throw Error('暂时无法连接注册审核服务，请稍后重试');}
  let result;try{result=await response.json();}catch{throw Error('注册审核服务暂时不可用，请稍后重试');}if(!response.ok)throw Object.assign(Error(result.error||'操作失败，请稍后重试'),{status:response.status});return result;
 }
 return {
  async restore(){if(!session?.token)return null;if(session.expiresAt<=Date.now()){session=null;storage.removeItem(AUTH_SESSION_KEY);return null;}try{return (await request('session')).account;}catch(e){if(e.status===401){session=null;storage.removeItem(AUTH_SESSION_KEY);}return null;}},
  hasSession(){return !!session?.token&&session.expiresAt>Date.now();},
  challenge(phone){return request('challenge',{data:{phone,purpose:'entry'}});},
  async submit(values,challenge){
   if(!challenge||challenge.phone!==values.phone||challenge.expiresAt<=Date.now())throw Error('请先为当前手机号获取演示验证码');
   const data={...values,challengeId:challenge.challengeId,nickname:values.name};
   const result=await request(challenge.purpose==='register'?'register':'login',{data});
   if(challenge.purpose==='register'){storage.setItem(AUTH_REQUEST_KEY,JSON.stringify({requestId:result.requestId,proof:result.proof,phone:values.phone}));return {pending:true,...result};}
   session=result;storage.setItem(AUTH_SESSION_KEY,JSON.stringify(result));return result;
  },
  async status(){let pending;try{pending=JSON.parse(storage.getItem(AUTH_REQUEST_KEY));}catch{}return pending?(await request('status',{data:pending})).account:null;},
  async logout(){const token=session?.token;session=null;storage.removeItem(AUTH_SESSION_KEY);if(token)try{await request('logout',{data:{},token});}catch{}},
 };
}
