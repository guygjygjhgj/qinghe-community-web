import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
test('所有 Figma 图片都保持下载时的原始内容且不存在临时地址',()=>{
 const catalog=JSON.parse(readFileSync(new URL('assets.json',root),'utf8'));const files=new Set(Object.values(catalog).flatMap(s=>Object.values(s).map(a=>a.file)));
 for(const file of files){assert.ok(file?.startsWith('assets/'));const bytes=readFileSync(new URL(file,root));assert.ok(bytes.length>0);const expected=file.split('/').pop().split('.')[0];assert.equal(createHash('sha1').update(bytes).digest('hex'),expected,file);}
 for(const name of readdirSync(new URL('native/',root))){const code=readFileSync(new URL('native/'+name,root),'utf8');assert.ok(!code.includes('/api/mcp/asset/'),name);}
});
test('全部原稿画板保留实际宽高，包含所有 57 张页面',()=>{
 const shapes=JSON.parse(readFileSync(new URL('design-source.json',root),'utf8'));assert.equal(Object.keys(shapes).length,57);
 assert.equal(shapes.home.width,750);assert.equal(shapes['plant-new'].width,848);assert.equal(shapes.profile.width,850);assert.equal(shapes.following.width,851);assert.equal(shapes.success.width,852);
 assert.equal(shapes.home.height,1659);assert.equal(shapes.profile.height,1850);
});
