'use strict';
// Native-media reduction of the touch/reload failure. No game, Progress or token.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),{webkit}=require('playwright');
const {observe,report}=require('./reload-diagnostics.cjs');
const ORIGIN='https://media.playwright.test';
test('WebKit native media: playing MP3 pause on pagehide returns and reload commits a new document',{timeout:80000},async()=>{
 const browser=await webkit.launch({headless:true});
 try{
  const ctx=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
  const trace=await observe(ctx);
  const media=await fs.readFile(path.resolve(__dirname,'../../../assets/audio/bgm/hoshi-no-kioku_toki-no-inori.mp3'));
  await ctx.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.origin!==ORIGIN)return route.abort('blockedbyclient');
   if(u.pathname==='/bgm.mp3')return route.fulfill({status:200,contentType:'audio/mpeg',body:media});
   if(u.pathname!=='/index.html')return route.fulfill({status:404,body:'Not found'});
   return route.fulfill({status:200,contentType:'text/html',body:`<button id="play">Play</button><script>
    const audio=new Audio('/bgm.mp3');audio.preload='auto';audio.loop=true;
    play.onclick=()=>audio.play().then(()=>window.playing=true);
    addEventListener('pagehide',()=>audio.pause());
   </script>`});
  });
  const page=await ctx.newPage();await page.goto(ORIGIN+'/index.html');
  await page.locator('#play').tap();await page.waitForFunction(()=>window.playing===true);
  const original=await page.evaluate(()=>window.__qaDocument),start=trace.entries.length;
  trace.record('reload-start',{method:'playwright',url:page.url()});
  try{
   await page.reload({waitUntil:'domcontentloaded',timeout:45000});
   assert.match(page.url(),/\/index\.html$/);
   assert.notEqual(await page.evaluate(()=>window.__qaDocument),original);
   assert.ok(trace.entries.slice(start).some(x=>x.message?.includes('pause-return')),'native pause must return');
   await page.locator('#play').waitFor({state:'visible'});
   await report(page,'native-media-pause',start);
  }catch(e){await report(page,'native-media-pause',start,{failed:true});throw e}
  await ctx.close();
 }finally{await browser.close()}
});
