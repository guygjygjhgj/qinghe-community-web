import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptGameBundle,buildPages} from '../scripts/prepare-pages.mjs';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';

test('game paths resolve inside the GitHub project prefix and preserve root-path saved works',()=>{
 const source='const photo="/figma/p.png";const audio="/osmanthus/audio/"+name;const template=`/osmanthus/${key}.webp`;';
 const fixed=adaptGameBundle(source);
 assert.ok(fixed.includes('new URL("../../", import.meta.url).pathname'));
 assert.ok(fixed.includes('(__qingheGameBase + "figma/p.png")'));
 assert.ok(fixed.includes('`${__qingheGameBase}osmanthus/${key}.webp`'));
 assert.equal(new URL('../../', 'https://demo.github.io/qinghe-community-web/games/runtime/bundle.js').pathname,'/qinghe-community-web/');
 assert.equal(new URL('../../', 'http://localhost/games/runtime/bundle.js').pathname,'/');
 assert.ok(adaptGameBundle("const image='/luffa-r7/a.png';",'../').includes('new URL("../", import.meta.url)'));
});

test('Pages output preserves source art and excludes local files and dependencies',()=>{
 const report=buildPages('.local/pages-site'),output=new URL('../.local/pages-site/',import.meta.url);
 assert.ok(report.files>1500);assert.ok(report.bytes<1_000_000_000);
 for(const file of ['index.html','app.js','native/seasonal.js','games/runtime/bundle.js','games/corn/index.html','games/cotton/index.html','cognitive/index.html','cognitive/app.js','cognitive/bridge.js','cognitive/style.css','cognitive/assets/qinghe-deer.png','cognitive/assets/cloud-leaves.png','.nojekyll','build-info.json'])assert.ok(existsSync(new URL(file,output)),file);
 for(const file of ['.git','.local','node_modules','tests','tools','server.cjs','.env','games/runtime/entry.tsx'])assert.ok(!existsSync(new URL(file,output)),file);
 const assets=JSON.parse(readFileSync(new URL('../assets.json',import.meta.url)));
 for(const key of ['imgBannerDeerPng','imgPhotoStep1png']){const file=assets.seasonal[key].file;assert.equal(createHash('sha256').update(readFileSync(new URL(file,output))).digest('hex'),createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex'));}
 const js=readFileSync(new URL('games/runtime/bundle.js',output),'utf8'),css=readFileSync(new URL('games/runtime/bundle.css',output),'utf8');
 assert.ok(!/(["'`])\/(figma|fonts|osmanthus|luffa-r7|luffa|chrysanthemum|ginkgo)\//.test(js));
 assert.ok(css.includes('url(../../figma/fonts/'));assert.ok(!css.includes('url(/figma/'));
 for(const file of ['ginkgo/game.mjs','ginkgo/scene.mjs','luffa-r7/material-v9.mjs'])assert.ok(!/(["'`])\/(figma|fonts|osmanthus|luffa-r7|luffa|chrysanthemum|ginkgo)\//.test(readFileSync(new URL(file,output),'utf8')),file);
 assert.equal(JSON.parse(readFileSync(new URL('build-info.json',output))).appSha256,report.appSha256);
 const html=readFileSync(new URL('index.html',output),'utf8'),map=JSON.parse(/<script type="importmap">(.+?)<\/script>/.exec(html)[1]);
 assert.match(map.imports['./community-client.js'],/^\.\/community-client\.js\?release=[a-f0-9]{16}$/);
 assert.equal(map.imports['./cognitive-onboarding.js?v=assessment-link-1'],map.imports['./cognitive-onboarding.js']);
 assert.match(html,/src="app\.js\?release=[a-f0-9]{16}"/);
 assert.ok(html.includes('src="asset-cache-registration.js"'));
 const worker=readFileSync(new URL('asset-worker.js',output),'utf8');
 assert.ok(!worker.includes('__STATIC_FONT_REVISION__'));
 assert.match(worker,/lezhi-community-art-/);
 const bundle=readFileSync(new URL('app.js',output),'utf8');
 assert.ok(report.bundledModules>50,'The source screen modules should be included in one entry request');
 assert.ok(!/^import\s.+from\s/m.test(bundle),'No eager module waterfall should remain');
 const manifest=JSON.parse(readFileSync(new URL('../assets/optimized/manifest.json',import.meta.url),'utf8'));
 for(const [source,item] of Object.entries(manifest.images)){
  for(const [file,hash] of [[source,item.originalSha256],[item.file,item.sha256]])assert.equal(createHash('sha256').update(readFileSync(new URL(file,output))).digest('hex'),hash,file);
  assert.ok(item.bytes<item.originalBytes);assert.ok(item.width>0&&item.height>0);
 }
 assert.equal(readFileSync(new URL('style.css',output),'utf8'),readFileSync(new URL('../style.css',import.meta.url),'utf8'));
 assert.equal(createHash('sha256').update(readFileSync(new URL('assets/fonts/NotoSansSC.woff2',output))).digest('hex'),createHash('sha256').update(readFileSync(new URL('../assets/fonts/NotoSansSC.woff2',import.meta.url))).digest('hex'));
});

test('build output cannot overwrite source or arbitrary folders',()=>{
 for(const path of ['.','assets','../other-project','C:/Windows'])assert.throws(()=>buildPages(path),/inside this workspace/);
});
