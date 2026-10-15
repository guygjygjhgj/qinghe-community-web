// Geometry corrections only: the original photographic assets are unchanged.
export function foldMatrix(node, openness) {
  const m = [...node.m], pivot = node.h * .15;
  const scale = 1 - .55 * Math.max(0, Math.min(1, openness));
  m[4] += m[2] * pivot * (1 - scale);
  m[5] += m[3] * pivot * (1 - scale);
  m[2] *= scale;
  m[3] *= scale;
  return m;
}

// Slider head follows the visible opening in the existing cushion photo.
export const zipperTravel = [337*574.96/1024, -24*574.96/1024];
export const zipperStart = [472, 892];
export function zipperProgress(dx, dy) {
  const [x, y] = zipperTravel;
  return Math.max(0, Math.min(1, (dx*x + dy*y)/(x*x + y*y)));
}

// The opening is baked into the original photo. Close only this narrow area,
// using adjacent fabric from that same photo, while retaining the whole asset.
let seamSerial=0;
export function renderCushion(el,n){
  const id='seam-'+(++seamSerial);
  el.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style="width:100%;height:100%;display:block;overflow:hidden">
    <defs>
      <clipPath id="${id}-opening"><path d="M956 820 C1080 816 1234 774 1356 775 L1356 799 C1246 840 1104 839 956 828 Z"/></clipPath>
      <clipPath id="${id}-progress"><rect class="seam-progress" x="950" y="750" width="0" height="110"/></clipPath>
    </defs>
    <image href="${n.asset}" width="1536" height="1024"/>
    <g clip-path="url(#${id}-progress)"><g clip-path="url(#${id}-opening)">
      <image href="${n.asset}" width="1536" height="1024" transform="translate(0 52)"/>
      <path d="M954 825 C1098 827 1247 818 1354 790" fill="none" stroke="#414339" stroke-width="2.5"/>
      <path d="M954 828 C1098 830 1247 821 1354 793" fill="none" stroke="#c1bea3" stroke-width="1.5" stroke-dasharray="2 2"/>
    </g></g>
  </svg>`;
  setSeamProgress(el,n.cushionSeam.progress);
}
export function setSeamProgress(el,progress){
  const p=Math.max(0,Math.min(1,progress));
  el.dataset.closed=String(p);
  el.querySelector('.seam-progress')?.setAttribute('width',p===0?0:56+350*p);
}
export function attachZippers(layers){
  for(const zip of layers.filter(l=>l.n.zipParent)){
    const parent=layers.find(l=>l.n.name===zip.n.zipParent);
    if(!parent)continue;
    zip.el.getAnimations().forEach(a=>a.cancel());
    zip.el.style.transform='matrix('+zip.n.localMatrix.join(',')+')';
    parent.el.append(zip.wrap);
  }
}
export function positionZipper(cushion,zip,closed){
  const scale=Math.max(cushion.w/1536,cushion.h/1024);
  const px=(cushion.w-1536*scale)/2,py=(cushion.h-1024*scale)/2;
  const x=px+(1006+337*closed)*scale-zip.w*.293;
  const y=py+(819-24*closed)*scale-zip.h*.169;
  zip.localMatrix=[1,0,0,1,x,y];zip.zipParent=cushion.name;
  const m=cushion.m;zip.m=[m[0],m[1],m[2],m[3],m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
  cushion.cushionSeam={progress:closed};
}
