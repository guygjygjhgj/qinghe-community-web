const cache=new Map();
export const mediaSource=url=>cache.get(url)||url;
export function clearPrivateMedia(){for(const url of cache.values())URL.revokeObjectURL(url);cache.clear();}
export async function preparePrivateMedia(state,fetchImpl,token){
 if(!token)return;
 const urls=new Set();for(const p of state.plants||[]){urls.add(p.photo);for(const r of p.records||[])urls.add(r.photo);}for(const d of state.drafts||[])for(const photo of d.photos||[])urls.add(photo);
 await Promise.all([...urls].filter(url=>typeof url==='string'&&url.includes('/api/community/v1/media/')&&!cache.has(url)).map(async url=>{const response=await fetchImpl(url,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('图片暂时加载失败，请刷新重试');cache.set(url,URL.createObjectURL(await response.blob()));}));
}
