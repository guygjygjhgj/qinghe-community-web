import test from 'node:test';
import assert from 'node:assert/strict';
import {fitArtboard,fixedViewport} from '../presentation.js';
import {setup,waitFor} from './helpers/browser.mjs';

test('desktop fitting keeps the whole source artboard within narrow and wide windows',()=>{
 for(const [w,h]of [[319,668],[1280,720],[1920,1080]])for(const [aw,ah]of [[750,1659],[850,1850],[750,2424]]){
  const scale=fitArtboard(aw,ah,w,h);assert.ok(scale>0&&scale<=1);assert.ok(aw*scale<=w-16+.01);assert.ok(ah*scale<=h-56+.01);
 }
 assert.equal(fitArtboard(750,1659,2000,2500),1);
 assert.equal(fitArtboard(0,1659,319,668),1);
});

test('demo zoom preserves edited input and fits both the publishing page and exit dialog',async()=>{
 const e=await setup('/publish');try{
  e.w.matchMedia=()=>({matches:true});e.w.dispatchEvent(new e.w.Event('resize'));
  const root=document.querySelector('#main .native-canvas'),width=root.style.width,height=root.style.height;
  assert.ok(parseFloat(root.style.zoom)<1);assert.equal(document.querySelector('.presentation-toolbar').hidden,false);
  e.fill('publish','body','演示缩放时保留这段输入');
  await e.click('[data-presentation="actual"]');assert.equal(root.style.zoom,'');assert.equal(document.querySelector('[name=body]').value,'演示缩放时保留这段输入');
  await e.click('[data-presentation="fit"]');assert.ok(parseFloat(root.style.zoom)<1);assert.equal(root.style.width,width);assert.equal(root.style.height,height);
  await e.click('#main [data-action="back"]');assert.ok(document.querySelector('#modal-root .native-canvas').style.zoom);
  await e.click('#modal-root [data-action="close"]');assert.equal(document.querySelector('[name=body]').value,'演示缩放时保留这段输入');
 }finally{e.cleanup();}
});

test('touch devices retain the original mobile view and no demo toolbar',async()=>{
 const e=await setup('/');try{
  e.w.matchMedia=()=>({matches:false});e.w.dispatchEvent(new e.w.Event('resize'));
  assert.equal(document.querySelector('.presentation-toolbar').hidden,true);assert.equal(document.querySelector('.native-canvas').style.zoom,'');assert.equal(document.body.classList.contains('desktop-presentation'),false);
 }finally{e.cleanup();}
});

test('fixed demo window keeps one width across routes and restores its own scroll on return',async()=>{
 assert.deepEqual(fixedViewport(1280,900),{width:390,height:780});
 assert.deepEqual(fixedViewport(800,600),{width:390,height:536});
 const e=await setup('/');try{
  e.w.matchMedia=()=>({matches:true});e.w.dispatchEvent(new e.w.Event('resize'));
  assert.ok(document.body.classList.contains('fixed-presentation'));
  const main=document.querySelector('#main');main.scrollTop=250;
  await e.click('#main [data-route="/activities"]');
  assert.equal(main.scrollTop,0);assert.ok(document.body.classList.contains('fixed-presentation'));
  assert.equal(parseFloat(main.querySelector('.native-canvas').style.zoom),390/parseFloat(main.querySelector('.native-canvas').style.width));
  e.w.history.back();await new Promise(resolve=>setTimeout(resolve,60));
  assert.equal(e.routeNow(),'/');assert.equal(main.scrollTop,250);
 }finally{e.cleanup();}
});

test('new routes receive their scale before fonts settle and slow image decoding never blocks controls',async()=>{
 let releaseFonts;const fontsReady=new Promise(resolve=>{releaseFonts=resolve;});
 const e=await setup('/',undefined,{fontsReady,decodeImage:()=>new Promise(()=>{})});try{
  e.w.matchMedia=()=>({matches:true});e.w.dispatchEvent(new e.w.Event('resize'));
  assert.equal(document.querySelector('#main').dataset.ready,'false');
  assert.ok(parseFloat(document.querySelector('.native-canvas').style.zoom)<1);
  await e.click('#main [data-route="/activities"]');
  assert.ok(document.body.classList.contains('fixed-presentation'));
  assert.ok(parseFloat(document.querySelector('.native-canvas').style.zoom)<1);
  releaseFonts();await waitFor(()=>document.querySelector('#main').dataset.ready==='true');
  assert.equal(e.routeNow(),'/activities');
  assert.ok(document.querySelector('#main').dataset.renderMs);
  await e.click('#main [data-action="back"]');
  assert.equal(e.routeNow(),'/');
 }finally{releaseFonts();e.cleanup();}
});

test('demo zoom controls preserve content position and entered text without rebuilding the page',async()=>{
 const e=await setup('/publish');try{
  e.w.matchMedia=()=>({matches:true});e.w.dispatchEvent(new e.w.Event('resize'));
  const root=document.querySelector('.native-canvas'),main=document.querySelector('#main');
  e.fill('publish','body','放大缩小时保留内容');main.scrollTop=120;
  const nativePosition=main.scrollTop/parseFloat(root.style.zoom);
  await e.click('[data-presentation-step="30"]');
  assert.equal(document.querySelector('.native-canvas'),root);
  assert.equal(document.body.style.getPropertyValue('--demo-width'),'420px');
  assert.ok(Math.abs(main.scrollTop/parseFloat(root.style.zoom)-nativePosition)<.01);
  assert.equal(document.querySelector('[name=body]').value,'放大缩小时保留内容');
  await e.click('[data-presentation-step="-30"]');
  assert.equal(document.body.style.getPropertyValue('--demo-width'),'390px');
  assert.equal(e.w.sessionStorage.getItem('qinghe-presentation-width'),'390');
 }finally{e.cleanup();}
});

test('the original preview icon and header arrow close the scaled preview without losing input',async()=>{
 const e=await setup('/publish');try{
  e.w.matchMedia=()=>({matches:true});e.w.dispatchEvent(new e.w.Event('resize'));
  e.fill('publish','body','关闭预览后继续编辑');
  await e.click('#main [data-action="preview"]');
  const icon=document.querySelector('#modal-root [data-name="icon-preview／独立PNG"]');
  assert.equal(icon.dataset.action,'close');await e.click('#modal-root [data-name="icon-preview／独立PNG"]');
  await waitFor(()=>!document.querySelector('#modal-root .native-canvas'));
  assert.equal(document.querySelector('[name=body]').value,'关闭预览后继续编辑');
  await e.click('#main [data-action="preview"]');await e.click('#modal-root [data-node-id="3:6450"]');
  await waitFor(()=>!document.querySelector('#modal-root .native-canvas'));
  assert.equal(e.routeNow(),'/publish');assert.equal(document.querySelector('[name=body]').value,'关闭预览后继续编辑');
 }finally{e.cleanup();}
});
