'use strict';
// Synthetic browser origins only. Every request is intercepted and served from
// checkout bytes; no production, RawGitHack or deployed QA data is accessed.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path');
const {webkit}=require('playwright');
const ROOT=path.resolve(__dirname,'../../..');
const QA_A='https://east-a.playwright.test',QA_B='https://east-b.playwright.test';
const PREVIEW='https://raw.githack.com',PRODUCTION='https://reverse-shion.github.io';
const ALLOWED=new Set([QA_A,QA_B,PREVIEW,PRODUCTION]);
const KEY='tarot-breaker:progress-v1';
const MIMES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ogg':'audio/ogg','.mp3':'audio/mpeg','.woff2':'font/woff2'};
async function contextFor(browser,{missingCollisionOnContinue=false}={}){
 const ctx=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true,ignoreHTTPSErrors:true,serviceWorkers:'block'});
 await ctx.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(!ALLOWED.has(url.origin))return route.abort('blockedbyclient');
  // Negative control applies only to the real resumed gameplay URL.
  if(missingCollisionOnContinue && url.pathname==='/assets/maps/star-country-gate-garden-collision.json' &&
     route.request().frame()?.url().includes('entry=continue'))
   return route.fulfill({status:404,body:'QA injected missing collision resource'});
  const file=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(ROOT+path.sep))return route.fulfill({status:403,body:'Forbidden'});
  if(url.pathname.endsWith('/qa/east-passage/approved-origin.js')){
   // Origin permission is injected IN TEST NETWORK ONLY; checked-in source stays locked.
   const approved=url.origin===QA_A||url.origin===QA_B?url.origin:'';
   return route.fulfill({status:200,contentType:'text/javascript',body:'window.TarotEastPassageQAApprovedOrigin='+JSON.stringify(approved)+';'});
  }
  try{
   const data=await fs.readFile(file);
   return route.fulfill({status:200,body:data,contentType:MIMES[path.extname(file).toLowerCase()]||'application/octet-stream',headers:{'cache-control':'no-store'}});
  }catch(e){
   if(e.code==='ENOENT'||e.code==='EISDIR')return route.fulfill({status:404,body:'Not found'});
   throw e;
  }
 });
 return ctx;
}
async function open(page,origin){await page.goto(origin+'/qa/east-passage/index.html',{waitUntil:'load'});}
async function save(page){return page.evaluate(key=>localStorage.getItem(key),KEY);}
async function assertGardenReady(page,expectedKnown,label){
 // A Continue handoff token alone is NOT a scene/render/interaction pass.
 await page.waitForFunction(()=>{
  const canvas=document.getElementById('game'),r=canvas?.getBoundingClientRect();
  const actor=window.TarotStage?.getState?.().actors?.shion;
  return document.body.classList.contains('scene-ready') &&
   !document.body.classList.contains('scene-load-error') &&
   document.getElementById('start-screen')?.hidden===true &&
   canvas?.width>200 && canvas?.height>200 && r?.width>150 && r?.height>150 &&
   Number.isFinite(actor?.x)&&Number.isFinite(actor?.y);
 },null,{timeout:30000});
 const state=await page.evaluate(()=>{
  const canvas=document.getElementById('game');
  const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  let painted=0;
  for(let i=3;i<data.length;i+=4)if(data[i]>10)painted++;
  const passage=window.TarotGardenEastPassage;
  const state=window.TarotStarGateProgress;
  const line=passage?.B_LINE;
  const known=passage?.routeKnown(state);
  return {painted,known,line,
   blocks:passage?.wouldBlock({x:1393,y:800},{x:1410,y:800},line,known),
   persisted:state?.getCurrentState?.()?.persisted,
   error:window.__lastGardenBootError||null};
 });
 assert.ok(state.painted>100,label+': transparent or unrendered canvas');
 assert.equal(state.error,null,label+': Garden initialization error');
 assert.equal(state.persisted,true,label+': Progress has not persisted');
 assert.deepEqual(state.line,{a:{x:1398,y:740},b:{x:1398,y:844}},label+': approved B line changed');
 assert.equal(state.known,expectedKnown,label+': route knowledge mismatch');
 assert.equal(state.blocks,!expectedKnown,label+': B line crossing decision incorrect');
 return state;
}
async function assertTouchMovement(page,label){
 const before=await page.evaluate(()=>window.TarotStage.getState().actors.shion);
 const anchor=await page.evaluate(()=>window.TarotActorScreenAnchor.get('shion'));
 const rect=await page.locator('#game').boundingBox();
 assert.ok(rect&&anchor,label+': missing actor anchor or canvas');
 const x=Math.max(rect.x+10,Math.min(rect.x+rect.width-10,rect.x+anchor.x));
 const y=Math.max(rect.y+10,Math.min(rect.y+rect.height-10,rect.y+anchor.feetY-68));
 await page.touchscreen.tap(x,y);
 await page.waitForFunction(prev=>{
  const now=window.TarotStage?.getState?.().actors?.shion;
  return now&&Math.hypot(now.x-prev.x,now.y-prev.y)>3;
 },before,{timeout:8000});
 const after=await page.evaluate(()=>window.TarotStage.getState().actors.shion);
 assert.ok(Math.hypot(after.x-before.x,after.y-before.y)>3,label+': touchscreen tap did not move actor');
}
async function create(page,kind){
 assert.equal(await save(page),null,'fresh QA origin starts empty');
 await page.locator('#fixture').selectOption(kind);
 assert.equal(await page.locator('#start').isDisabled(),true);
 await page.locator('#consent').check();
 assert.equal(await page.locator('#start').isEnabled(),true);
 await Promise.all([page.waitForURL(/\/index\.html$/,{timeout:30000}),page.locator('#start').click()]);
 // Use the real Title controller, which issues the one-shot session token.
 const continueButton=page.locator('#continue');
 await continueButton.waitFor({state:'visible',timeout:30000});
 await Promise.all([page.waitForURL(/\/index\.html\?entry=continue$/,{timeout:30000}),continueButton.click()]);
 const raw=await save(page);
 assert.ok(raw,'seed persists over real same-origin navigation');
 return JSON.parse(raw);
}
async function withBrowser(fn){const browser=await webkit.launch({headless:true});try{await fn(browser)}finally{await browser.close()}}

test('WebKit mobile viewport: known preview and production hosts cannot enable QA seeding or overwrite storage',{timeout:60000},async()=>withBrowser(async browser=>{
 const ctx=await contextFor(browser);
 try{
  for(const origin of [PREVIEW,PRODUCTION]){
   const page=await ctx.newPage();await open(page,origin);
   await page.evaluate(key=>localStorage.setItem(key,'EXISTING-MARKER'),KEY);
   await page.locator('#consent').check();
   assert.equal(await page.locator('#start').isDisabled(),true);
   assert.match(await page.locator('#status').innerText(),/安全ロック/);
   await page.locator('#start').evaluate(el=>el.click());
   assert.equal(await save(page),'EXISTING-MARKER');
   await page.close();
  }
 }finally{await ctx.close()}
}));

test('WebKit mobile viewport: pending Aftermath Continue and browser reload never create a route unlock',{timeout:110000},async()=>withBrowser(async browser=>{
 const ctx=await contextFor(browser);
 try{
  const page=await ctx.newPage();await open(page,QA_A);
  assert.match(await page.locator('#status').innerText(),/隔離オリジン確認済み/);
  const seeded=await create(page,'pending-aftermath');
  assert.equal(seeded.completedEvents.includes('garden_star_gate_anomaly'),false);
  assert.equal(seeded.completedEvents.includes('garden_star_sand_route_known'),false);
  await page.waitForFunction(()=>window.TarotGardenContinueTransit?.ok===true,null,{timeout:30000});
  await assertGardenReady(page,false,'pending-initial');
  await assertTouchMovement(page,'pending-initial');
  assert.match(page.url(),/\/index\.html\?entry=continue$/, 'touch input must not trigger another route before manual reload');
  // DOMContentLoaded plus explicit Title URL/Continue checks avoid a WebKit
  // load-event hang hiding whether the one-shot-token redirect succeeded.
  // Use the page's own browser reload (one-shot entry must redirect to Title).
  // Assert the destination explicitly rather than assuming Playwright's reload load event.
  await Promise.all([
   page.waitForURL(/\/index\.html$/,{waitUntil:'domcontentloaded',timeout:45000}),
   page.evaluate(()=>window.location.reload()),
  ]);
  // Reloading a one-shot internal runtime URL must fail closed to Title.
  // Resume through official Title once more rather than bypassing the token.
  await page.waitForURL(/\/index\.html$/,{timeout:30000});
  const resume=page.locator('#continue');
  await resume.waitFor({state:'visible',timeout:30000});
  await Promise.all([page.waitForURL(/\/index\.html\?entry=continue$/,{timeout:30000}),resume.click()]);
  await page.waitForFunction(()=>window.TarotGardenContinueTransit?.ok===true,null,{timeout:30000});
  await assertGardenReady(page,false,'pending-reload');
  const current=JSON.parse(await save(page));
  assert.equal(current.completedEvents.includes('garden_star_sand_route_known'),false);
  assert.equal(current.checkpoint.mapId,'star_gate_garden');
  await page.close();
 }finally{await ctx.close()}
}));

test('WebKit mobile viewport: legacy save migrates in real Garden Continue; isolated origins share no progress',{timeout:110000},async()=>withBrowser(async browser=>{
 const ctx=await contextFor(browser);
 try{
  const page=await ctx.newPage();await open(page,QA_B);
  const legacy=await create(page,'legacy-completed');
  assert.equal(legacy.completedEvents.includes('garden_star_gate_anomaly'),true);
  assert.equal(legacy.completedEvents.includes('garden_star_sand_route_known'),false);
  await page.waitForFunction(()=>window.TarotGardenContinueTransit?.ok===true,null,{timeout:30000});
  await assertGardenReady(page,true,'legacy-initial');
  await assertTouchMovement(page,'legacy-initial');
  // Observe actual browser runtime migration, not direct test invocation.
  await page.waitForFunction(key=>{
   try{return JSON.parse(localStorage.getItem(key))?.completedEvents?.includes('garden_star_sand_route_known')===true}catch(_){return false}
  },KEY,{timeout:40000});
  const migrated=JSON.parse(await save(page));
  assert.equal(migrated.completedEvents.filter(x=>x==='garden_star_sand_route_known').length,1);
  assert.match(page.url(),/\/index\.html\?entry=continue$/, 'touch input must not trigger another route before manual reload');
  // DOMContentLoaded plus explicit Title URL/Continue checks avoid a WebKit
  // load-event hang hiding whether the one-shot-token redirect succeeded.
  // Use the page's own browser reload (one-shot entry must redirect to Title).
  // Assert the destination explicitly rather than assuming Playwright's reload load event.
  await Promise.all([
   page.waitForURL(/\/index\.html$/,{waitUntil:'domcontentloaded',timeout:45000}),
   page.evaluate(()=>window.location.reload()),
  ]);
  await page.waitForURL(/\/index\.html$/,{timeout:30000});
  const resume=page.locator('#continue');
  await resume.waitFor({state:'visible',timeout:30000});
  await Promise.all([page.waitForURL(/\/index\.html\?entry=continue$/,{timeout:30000}),resume.click()]);
  await page.waitForFunction(()=>window.TarotGardenContinueTransit?.ok===true,null,{timeout:30000});
  await assertGardenReady(page,true,'legacy-reload');
  assert.equal(JSON.parse(await save(page)).completedEvents.filter(x=>x==='garden_star_sand_route_known').length,1);
  const second=await ctx.newPage();await open(second,QA_A);
  assert.equal(await save(second),null,'same WebKit context, distinct synthetic host must stay empty');
  await second.close();await page.close();
 }finally{await ctx.close()}
}));

// A missing required resource must never be reported as successful visual Continue.
test('WebKit negative control: missing Garden collision JSON prevents scene readiness',{timeout:110000},async()=>withBrowser(async browser=>{
 const ctx=await contextFor(browser,{missingCollisionOnContinue:true});
 try{
  const page=await ctx.newPage();await open(page,QA_A);
  await create(page,'pending-aftermath');
  await page.waitForFunction(()=>document.body.classList.contains('scene-load-error'),null,{timeout:30000});
  const result=await page.evaluate(()=>({error:window.__lastGardenBootError,
   ready:document.body.classList.contains('scene-ready'),
   displayed:!document.getElementById('load-error')?.hidden}));
  assert.match(result.error||'',/当たり判定データを読み込めません/);
  assert.equal(result.ready,false);
  assert.equal(result.displayed,true);
  assert.equal(JSON.parse(await save(page)).completedEvents.includes('garden_star_sand_route_known'),false);
  await page.close();
 }finally{await ctx.close()}
}));
