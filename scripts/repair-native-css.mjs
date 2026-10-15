import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

// Tailwind's underscore-as-space shorthand must not rewrite custom-property names.
// Use only identifiers present in the exported Figma source; never guess a replacement.
export function repairNativeCSS(css,sources){
 const aliases=new Map();
 for(const source of sources)for(const [,name]of source.matchAll(/var\((--[\w-]+)/g)){
  const alias=name.replaceAll('_',' '),known=aliases.get(alias);
  if(known&&known!==name)throw Error('Ambiguous source custom property: '+alias);
  aliases.set(alias,name);
 }
 let repaired=0;
 const result=css.replace(/var\(\s*(--[^,()]+)(?=[,)])/g,(match,raw)=>{
  const name=raw.trim();if(!/\S\s+\S/.test(name))return match;
  const original=aliases.get(name);if(!original)throw Error('Unknown broken custom property: '+name);
  repaired++;return 'var('+original;
 });
 return {css:result,repaired};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const base=new URL('../',import.meta.url),file=new URL('native-layers.css',base);
 const sources=readdirSync(new URL('native/',base)).filter(n=>n.endsWith('.js')).map(n=>readFileSync(new URL('native/'+n,base),'utf8'));
 const result=repairNativeCSS(readFileSync(file,'utf8'),sources);if(result.repaired)writeFileSync(file,result.css);
 console.log(JSON.stringify({repaired:result.repaired}));
}
