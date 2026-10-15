import {readFileSync,writeFileSync} from 'node:fs';
import {transform} from 'esbuild';
import {JSDOM} from 'jsdom';
const base=new URL('../',import.meta.url);
let source=readFileSync(new URL('figma-source/seasonal.tsx',base),'utf8');
const assets=JSON.parse(readFileSync(new URL('assets.json',base),'utf8')).seasonal;
for(const [,name]of source.matchAll(/function (png\w+)\(/g))source=source.replaceAll(name,name[0].toUpperCase()+name.slice(1));
const result=await transform(source,{loader:'tsx',jsxFactory:'h',jsxFragment:'Fragment',format:'esm'});
writeFileSync(new URL('native/seasonal.js',base),'// Figma 8hkTaJl8DnvJ51QVKU6ofp / 1000:823. Original assets and geometry.\nimport {h,Fragment} from "../native-runtime.js";\n'+result.code);
const dom=new JSDOM();globalThis.document=dom.window.document;globalThis.Node=dom.window.Node;
const {default:screen}=await import('../native/seasonal.js?build='+Date.now());const root=screen();
const classes=new Set([root,...root.querySelectorAll('*')].flatMap(e=>[...e.classList]));
const plain={relative:'position:relative',absolute:'position:absolute',block:'display:block',flex:'display:flex',contents:'display:contents','inset-0':'inset:0','left-0':'left:0','top-0':'top:0','size-full':'width:100%;height:100%','max-w-none':'max-width:none','object-contain':'object-fit:contain','object-cover':'object-fit:cover','pointer-events-none':'pointer-events:none','border-solid':'border-style:solid','font-bold':'font-weight:700','font-black':'font-weight:900','font-medium':'font-weight:500','font-normal':'font-weight:400','shrink-0':'flex-shrink:0','flex-none':'flex:none','content-stretch':'align-content:stretch','items-start':'align-items:flex-start','items-center':'align-items:center','justify-center':'justify-content:center','flex-col':'flex-direction:column','overflow-clip':'overflow:clip','bg-gradient-to-b':'background-image:linear-gradient(to bottom,var(--seasonal-from),var(--seasonal-to))','bg-gradient-to-r':'background-image:linear-gradient(to right,var(--seasonal-from),var(--seasonal-to))','-rotate-5':'transform:rotate(-5deg)','rotate-4':'transform:rotate(4deg)','mb-0':'margin-bottom:0'};
const css=[];
for(const cls of classes){
 let declaration=plain[cls];
 if(!declaration){const m=cls.match(/^([\w-]*)\[(.*)\]$/);if(!m)throw Error('Unsupported class '+cls);let [,kind,v]=m;
  const vars=[];v=v.replace(/var\((--[\w-]+)/g,(_,name)=>'var('+String.fromCharCode(0xe000+vars.push(name)-1));v=v.replaceAll('_',' ').replace(/[\ue000-\uefff]/g,c=>vars[c.charCodeAt(0)-0xe000]);
  const props={'h-':'height','w-':'width','left-':'left','top-':'top','rounded-':'border-radius','leading-':'line-height','tracking-':'letter-spacing','bg-':'background-color','pl-':'padding-left','pt-':'padding-top','inset-':'inset','gap-':'gap','from-':'--seasonal-from','to-':'--seasonal-to'};
  if(props[kind])declaration=props[kind]+':'+v;
  else if(kind==='size-')declaration='width:'+v+';height:'+v;
  else if(kind==='border-')declaration=(/^[\d.]+px$/.test(v)?'border-width':'border-color')+':'+v;
  else if(kind==='text-')declaration=(v.startsWith('color:')?v.replace(/^color:/,'color:'):'font-size:'+v);
  else if(kind==='font-')declaration='font-family:'+JSON.stringify(v.replace(/^['"]|['"]$/g,'').split(':')[0])+',sans-serif';
  else if(kind==='drop-shadow-')declaration='filter:drop-shadow('+v+')';
  else if(kind==='')declaration=v;
  else throw Error('Unsupported class '+cls);
 }
 const escaped=cls.replace(/[^a-zA-Z0-9_-]/g,c=>'\\'+c);
 css.push('[data-screen="seasonal"].'+escaped+',[data-screen="seasonal"] .'+escaped+'{'+declaration+'}');
}
writeFileSync(new URL('native-seasonal.css',base), '/* Scoped to the new Figma page; existing screens are untouched. */\n'+css.join('\n')+'\n');
console.log(JSON.stringify({assets:Object.keys(assets).length,classes:classes.size}));
