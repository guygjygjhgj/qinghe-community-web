import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {repairNativeCSS} from '../scripts/repair-native-css.mjs';
const root=new URL('../',import.meta.url);

test('Figma corner_radius and stroke_float identifiers survive CSS generation unchanged',()=>{
 const source='rounded-[var(--s17-corner_radius-49-3980,49.398px)] border-[var(--s15-stroke_float-1-8519,1.852px)]';
 const bad='.rounded_corner{border-radius:var(--s17-corner radius-49-3980,49.398px);border-width:var(--s15-stroke float-1-8519,1.852px);color:var(--normal,#fff)}';
 const result=repairNativeCSS(bad,[source]);assert.equal(result.repaired,2);
 assert.equal(result.css,'.rounded_corner{border-radius:var(--s17-corner_radius-49-3980,49.398px);border-width:var(--s15-stroke_float-1-8519,1.852px);color:var(--normal,#fff)}');
 assert.deepEqual(repairNativeCSS(result.css,[source]),{css:result.css,repaired:0});
 assert.throws(()=>repairNativeCSS('a{border-radius:var(--unknown broken,5px)}',[source]),/Unknown/);
});

test('every generated custom-property reference is a valid CSS identifier',()=>{
 const css=readFileSync(new URL('native-layers.css',root),'utf8');let count=0;
 for(const [,name]of css.matchAll(/var\(\s*(--[^,()]+)(?=[,)])/g)){assert.match(name.trim(),/^--[\w-]+$/);count++;}
 assert.ok(count>100);
 const sources=readdirSync(new URL('native/',root)).filter(n=>n.endsWith('.js')).map(n=>readFileSync(new URL('native/'+n,root),'utf8'));
 assert.equal(repairNativeCSS(css,sources).repaired,0);
});
