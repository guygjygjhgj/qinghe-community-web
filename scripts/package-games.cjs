const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const target=path.resolve(__dirname,'..'),sites=path.resolve(target,'../sites'),source=path.join(sites,'laoyousuozhi-app');
for(const folder of ['osmanthus','luffa-r7','luffa','chrysanthemum','ginkgo','figma','fonts']){
 const from=path.join(source,'public',folder),to=path.join(target,folder);if(fs.existsSync(from))fs.cpSync(from,to,{recursive:true});
}
for(const [name,folder]of [['corn','autumn-corn-game'],['cotton','autumn-cotton']]){
 const from=path.join(sites,folder,'dist');if(fs.existsSync(from))fs.cpSync(from,path.join(target,'games',name),{recursive:true});
}
// Only portal exit behavior is adapted; scenes, art, gameplay and storage keep their source implementation.
const cornFile=path.join(target,'games/corn/game.js');
if(fs.existsSync(cornFile)){const code=fs.readFileSync(cornFile,'utf8').replace("[['继续游戏',close],['我的秋粮',showWorks]","[['继续游戏',close],['返回社区',()=>{save();parent.postMessage({source:'qinghe-games',type:'exit'},location.origin);}],['我的秋粮',showWorks]");fs.writeFileSync(cornFile,code);}
const cottonFile=path.join(target,'games/cotton/app.js');
if(fs.existsSync(cottonFile)){const code=fs.readFileSync(cottonFile,'utf8').replaceAll("state=fresh();draw();}","state=fresh();draw();if(parent!==window)parent.postMessage({source:'qinghe-games',type:'exit'},location.origin);}");fs.writeFileSync(cottonFile,code);}
esbuild.build({entryPoints:[path.join(target,'games/runtime/entry.tsx')],outfile:path.join(target,'games/runtime/bundle.js'),bundle:true,platform:'browser',format:'esm',external:['/fonts/*','/figma/*'],jsx:'automatic',nodePaths:[path.join(source,'node_modules')],alias:{'@game':path.join(source,'app')},plugins:[{name:'local-context',setup(build){build.onResolve({filter:/^\.\/app-context$/},()=>({path:path.join(target,'games/runtime/context.tsx')}));}}],loader:{'.webp':'file','.png':'file','.svg':'file','.woff2':'file'},define:{'process.env.NODE_ENV':'"production"'}}).catch(error=>{console.error(error);process.exitCode=1;});
fs.writeFileSync(path.join(target,'games/catalog.json'),JSON.stringify({source:'Existing local games; original UI and assets retained',games:[{id:'chrysanthemum',title:'菊花花礼',file:'runtime/index.html?game=chrysanthemum'},{id:'osmanthus',title:'桂花松糕',file:'runtime/index.html?game=osmanthus'},{id:'luffa',title:'丝瓜生活',file:'runtime/index.html?game=luffa'},{id:'corn',title:'秋收玉米',file:'corn/index.html'},{id:'ginkgo',title:'银杏留秋',file:'runtime/index.html?game=ginkgo'},{id:'cotton',title:'秋棉体验',file:'cotton/index.html'}]},null,2));
