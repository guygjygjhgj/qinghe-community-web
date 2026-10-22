import {initialState,STORAGE_KEY} from './domain.js';
import {normalizeRoute,loginReturn} from './routing.js';

export const REFERENCE_STORAGE_KEY='qinghe-reference-li-v1';

// Public example edits stay separate from authenticated residents' device data.
export function referenceStorage(storage){return {
 getItem:key=>storage.getItem(key===STORAGE_KEY?REFERENCE_STORAGE_KEY:key),
 setItem:(key,value)=>storage.setItem(key===STORAGE_KEY?REFERENCE_STORAGE_KEY:key,value),
 removeItem:key=>storage.removeItem(key===STORAGE_KEY?REFERENCE_STORAGE_KEY:key)
};}

export function useReferenceIdentity(state){
 const defaults=initialState();state.userId='li';state.loggedIn=true;state.cloud=false;
 state.users.li={...defaults.users.li,...state.users.li,id:'li'};
 return state;
}

export function referenceRoute(route){
 route=normalizeRoute(route);const path=new URL(route,'https://qinghe.local').pathname;
 return ['/login','/register'].includes(path)?loginReturn(route):route;
}

export function removeReferenceLoginControls(root,user){
 for(const el of root.querySelectorAll('[data-action="logout"],[data-action="demo-login"],[data-action="get-code"],[data-action="login-consent"]'))el.hidden=true;
 for(const el of root.querySelectorAll('[data-route]'))if(['/login','/register'].includes(new URL(el.dataset.route,'https://qinghe.local').pathname))el.hidden=true;
 if(root.querySelector('.native-canvas')?.dataset.screen==='messages'){
  const ownName=root.querySelector('[data-node-id="11:1784"]');if(ownName)ownName.textContent=user?.name||'李阿姨';
 }
}
