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
async function contextFor(browser){
 const ctx=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true,ignoreHTTPSErrors:true,serviceWorkers:'block'});
 await ctx.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(!ALLOWED.has(url.origin))return route.abort('blockedbyclient');
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
async function create(page,kind){
 assert.equal(await save(page),null,'fresh QA origin starts empty');
 await page.locator('#fixture').selectOption(kind);
 assert.equal(await page.locator('#start').isDisabled(),true);
 await page.locator('#consent').check();
 assert.equal(await page.locator('#start').isEnabled(),true);
 await Promise.all([page.waitForURL(/\/index\.html\?entry=continue$/,{timeout:30000}),page.locator('#start').click()]);
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
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>window.TarotGardenContinueTransit?.ok===true,null,{timeout:30000});
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
  // Observe actual browser runtime migration, not direct test invocation.
  await page.waitForFunction(key=>{
   try{return JSON.parse(localStorage.getItem(key))?.completedEvents?.includes('garden_star_sand_route_known')===true}catch(_){return false}
  },KEY,{timeout:40000});
  const migrated=JSON.parse(await save(page));
  assert.equal(migrated.completedEvents.filter(x=>x==='garden_star_sand_route_known').length,1);
  await page.reload({waitUntil:'load'});
  assert.equal(JSON.parse(await save(page)).completedEvents.filter(x=>x==='garden_star_sand_route_known').length,1);
  const second=await ctx.newPage();await open(second,QA_A);
  assert.equal(await save(second),null,'same WebKit context, distinct synthetic host must stay empty');
  await second.close();await page.close();
 }finally{await ctx.close()}
}));
