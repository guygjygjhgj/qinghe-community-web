// Only request priority changes here; never alter a picture or its geometry.
export function prioritizeImages(root,window){
 if(!root)return;
 const frame=root.getBoundingClientRect(),hasFrame=frame.bottom>frame.top;
 const top=hasFrame?Math.max(0,frame.top):0,bottom=hasFrame?Math.min(window.innerHeight,frame.bottom):window.innerHeight;
 let urgent=0;
 for(const image of root.querySelectorAll('img')){
  const box=image.parentElement.getBoundingClientRect();
  const visible=!image.closest('[hidden]')&&box.width>0&&box.height>0&&box.bottom>=top&&box.top<=bottom&&box.right>=0&&box.left<=window.innerWidth;
  image.loading=visible?'eager':'lazy';
  image.fetchPriority=visible?(urgent++<3?'high':'auto'):'low';
 }
}
