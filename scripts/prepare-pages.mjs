import {readdirSync,readFileSync,writeFileSync,statSync,existsSync,mkdirSync,copyFileSync,rmSync} from 'node:fs';
import {resolve,relative,dirname,extname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const workspace=fileURLToPath(new URL('../',import.meta.url));
const gameFolders='figma|fonts|osmanthus|luffa-r7|luffa|chrysanthemum|ginkgo';

// Resolve from the runtime bundle, so both / and /repository/ deployments work.
export function adaptGameBundle(source,siteRoot='../../'){
 const literals=new RegExp('(["\'])/('+gameFolders+')/([^"\'\\r\\n]*)\\1','g');
 let count=0;
 source=source.replace(literals,(_,quote,folder,path)=>{count++;return '(__qingheGameBase + '+JSON.stringify(folder+'/'+path)+')';});
 source=source.replace(new RegExp('`/('+gameFolders+')/','g'),(_,folder)=>{count++;return '`${__qingheGameBase}'+folder+'/';});
 return count?'const __qingheGameBase = new URL('+JSON.stringify(siteRoot)+', import.meta.url).pathname;\n'+source:source;
}

export function buildPages(destination='dist'){
 const out=resolve(workspace,destination),rel=relative(workspace,out).split(sep).join('/');
 if(!['dist','.local/pages-site'].includes(rel))throw Error('Build output must be dist or .local/pages-site inside this workspace');
 const marker=resolve(out,'.qinghe-build');
 if(existsSync(out)){if(!existsSync(marker))throw Error('Refusing to replace a folder not created by this build');rmSync(out,{recursive:true,force:true});}
 mkdirSync(out,{recursive:true});writeFileSync(marker,'Owned by scripts/prepare-pages.mjs\n');
 const folders=['assets','native','games','cognitive','osmanthus','luffa','luffa-r7','chrysanthemum','ginkgo','figma','fonts'];
 const extensions=new Set(['.js','.mjs','.css','.html','.json','.svg','.png','.jpg','.jpeg','.gif','.webp','.avif','.ico','.mp4','.webm','.mp3','.wav','.ogg','.m4a','.woff','.woff2','.ttf','.txt']);
 const excludedNames=new Set(['review.html','motion-preview.html','structure-audit.html','process-audit.json']);
 let count=0,bytes=0;
 const copy=(path)=>{const source=resolve(workspace,path),target=resolve(out,path),size=statSync(source).size;if(size>100*1024*1024)throw Error('File exceeds GitHub file limit: '+path);mkdirSync(dirname(target),{recursive:true});copyFileSync(source,target);const siteRoot='../'.repeat(path.split('/').length-1)||'./';if(/\.(js|mjs)$/.test(path)){const original=readFileSync(target,'utf8'),patched=adaptGameBundle(original,siteRoot);if(patched!==original)writeFileSync(target,patched);}else if(path.endsWith('.css')){const original=readFileSync(target,'utf8'),patched=original.replace(new RegExp('url\\((["\\\']?)/('+gameFolders+')/','g'),(_,quote,folder)=>'url('+quote+siteRoot+folder+'/');if(patched!==original)writeFileSync(target,patched);}count++;bytes+=size;};
 for(const item of readdirSync(workspace,{withFileTypes:true}))if(item.isFile()&&(/\.(js|css|html|svg)$/.test(item.name)||['assets.json','design-source.json'].includes(item.name)))copy(item.name);
 function walk(folder){for(const item of readdirSync(resolve(workspace,folder),{withFileTypes:true})){const path=folder+'/'+item.name;if(item.isDirectory()){if(!item.name.startsWith('.')&&item.name!=='node_modules')walk(path);}else if(item.isFile()&&extensions.has(extname(item.name))&&!excludedNames.has(item.name))copy(path);}}
 for(const folder of folders)walk(folder);
 // One release token covers the module graph, preventing an old cached dependency
 // from mixing local-only handlers with the newly deployed shared service.
 const modules=readdirSync(out).filter(f=>f.endsWith('.js')).concat(readdirSync(resolve(out,'native')).filter(f=>f.endsWith('.js')).map(f=>'native/'+f)).sort();
 const release=createHash('sha256');for(const file of modules)release.update(file).update(readFileSync(resolve(out,file)));
 const token=release.digest('hex').slice(0,16),imports={};
 for(const file of modules){imports['./'+file]='./'+file+'?release='+token;const source=readFileSync(resolve(out,file),'utf8');for(const match of source.matchAll(/(?:from\s*|import\s*\()(['"])(\.\/[^'"]+\.js\?[^'"]+)\1/g))if(!file.includes('/'))imports[match[2]]=match[2].split('?')[0]+'?release='+token;}
 const htmlPath=resolve(out,'index.html');let html=readFileSync(htmlPath,'utf8');html=html.replace('</head>','<script type="importmap">'+JSON.stringify({imports})+'</script></head>').replace(/src="app\.js[^\"]*"/,'src="app.js?release='+token+'"').replace(/href="([^"?]+\.css)"/g,'href="$1?release='+token+'"');writeFileSync(htmlPath,html);
 writeFileSync(resolve(out,'.nojekyll'),'');
 const appSha256=createHash('sha256').update(readFileSync(resolve(out,'app.js'))).digest('hex');
 writeFileSync(resolve(out,'build-info.json'),JSON.stringify({commit:process.env.GITHUB_SHA||'local',appSha256,builtAt:new Date().toISOString()},null,2)+'\n');
 if(bytes>1_000_000_000)throw Error('Published site exceeds the 1 GB Pages limit');
 return {output:rel,files:count,bytes,appSha256};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(buildPages(process.argv[2]||'dist')));
