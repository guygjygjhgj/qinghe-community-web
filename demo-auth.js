export const AUTH_SERVICE='https://qinghe-registration-service.hebaixuan01111123.chatgpt.site/api/';
export const AUTH_SESSION_KEY='qinghe-approved-session-v1';
export const AUTH_REQUEST_KEY='qinghe-registration-request-v1';
export const AUTH_REQUESTS_KEY='qinghe-registration-requests-v2';
export const AUTH_REVIEW_URL='https://qinghe-registration-review.hebaixuan01111123.chatgpt.site/';
export const isDemoPhone=value=>/^1990000\d{4}$/.test(value||'');
export const isPhone=value=>/^1[3-9]\d{9}$/.test(value||'');
export function reviewLink(phone,requestId){const url=new URL(AUTH_REVIEW_URL);if(/^[\w-]{1,80}$/.test(requestId||''))url.searchParams.set('request',requestId);else if(isDemoPhone(phone))url.searchParams.set('phone',phone);return url.href;}
export function completeAuthControls(root){
 const form=root.querySelector('form[data-form=login]');if(!form)return;
 const phone=form.elements.namedItem('phone'),code=form.elements.namedItem('code'),name=form.elements.namedItem('name');
 if(phone){phone.type='tel';phone.inputMode='numeric';phone.autocomplete='tel-national';phone.pattern='1[3-9][0-9]{9}';phone.setAttribute('aria-label','手机号');}
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
  async requestCode(values){const pending=this.pendingRequest(values.phone),result=await request('request-access',{data:{phone:values.phone,nickname:values.name,agree:values.agree,...(pending?{requestId:pending.requestId,proof:pending.proof}:{})}});const saved={requestId:result.requestId,proof:result.proof,phone:values.phone};let all={};try{all=JSON.parse(storage.getItem(AUTH_REQUESTS_KEY))||{};}catch{}const old=this.pendingRequest();if(old)all[old.phone]=old;all[values.phone]=saved;storage.setItem(AUTH_REQUESTS_KEY,JSON.stringify(all));storage.setItem(AUTH_REQUEST_KEY,JSON.stringify(saved));return result;},
  pendingRequest(value){try{const current=JSON.parse(storage.getItem(AUTH_REQUEST_KEY))||null;if(!value||value===current?.phone||value===current?.requestId)return current;const all=JSON.parse(storage.getItem(AUTH_REQUESTS_KEY))||{};return all[value]||Object.values(all).find(r=>r.requestId===value)||null;}catch{return null;}},
  async reviewStatus(phone){if(!isPhone(phone))throw Error('请先填写申请验证码时的手机号');const pending=this.pendingRequest(phone);if(!pending)throw Error('请先点击获取验证码提交申请；审核进度仅在提交申请的浏览器查看');const result=await request('status',{data:pending});if(!['pending','approved','rejected'].includes(result.account?.status))throw Error('审核状态暂时不可用，请稍后重试');return {...result,phone,status:result.account.status,deliveryExpired:result.deliveryExpired||result.account.status==='approved'&&!result.challenge};},
  async submit(values,challenge){
   if(!challenge||challenge.phone!==values.phone||challenge.expiresAt<=Date.now()||challenge.purpose!=='login')throw Error('请先申请后台审核发放验证码，再输入验证码登录');
   const data={...values,challengeId:challenge.challengeId,nickname:values.name};
   const result=await request('login',{data});
   session=result;storage.setItem(AUTH_SESSION_KEY,JSON.stringify(result));return result;
  },
  async status(){let pending;try{pending=JSON.parse(storage.getItem(AUTH_REQUEST_KEY));}catch{}return pending?(await request('status',{data:pending})).account:null;},
  async logout(){const token=session?.token;session=null;storage.removeItem(AUTH_SESSION_KEY);if(token)try{await request('logout',{data:{},token});}catch{}},
 };
}
