/* Optional real-browser presentation QA; isolated dev storage only, never device PASS. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const C=require('../caritas-battle-core.js'),S=require('../caritas-special-state.js');
const root=path.resolve(__dirname,'..'),output=process.env.CARITAS_QA_OUTPUT;
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(file,(err,bytes)=>{
  if(err){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(bytes);
 });
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CARITAS_BROWSER_EXECUTABLE||chromium.executablePath(),headless:true,args:['--no-sandbox']});
 try{
  for(const viewport of [{width:390,height:844},{width:844,height:390}])for(const reduced of [false,true]){
   const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,reducedMotion:reduced?'reduce':'no-preference'});
   await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   const url=`http://127.0.0.1:${server.address().port}/hoshisuna-main.html?dev=hoshisuna`;
   async function seed(dark,phase='read'){
    const record=S.create({...C.newGame(),dark,phase,resonance:phase==='finisher'?100:0},'reaction-qa');
    await page.goto(url);
    await page.evaluate(record=>localStorage.setItem('tb:dev:hoshisuna:caritas-full-reading-v1',JSON.stringify(record)),record);
    await page.reload();await page.waitForFunction(()=>window.CaritasEncounterDebug?.getState().story==='battle'&&document.body.classList.contains('scene-ready'));
    await page.waitForTimeout(350);
    console.log('seed',viewport.width,reduced,dark,phase);
   }
   async function pose(name){
    await page.waitForFunction(name=>{
     const r=document.querySelector('#caritas-event'),img=r.querySelector('.cb-beast');
     return r.dataset.caritasPose===name&&img.complete&&img.naturalWidth>0&&img.src.endsWith(name==='normal'?'caritas-battle.webp':`_${name}.webp`);
    },name);
   }
   async function alignment(){
    const v=await page.evaluate(()=>{
     const b=document.querySelector('.cb-beast'),v=document.querySelector('.cb-abyss');
     const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
     return {beast:rect(b),veil:rect(v),object:getComputedStyle(b).objectPosition,mask:getComputedStyle(v).maskPosition};
    });
    for(const k of ['x','y','width','height'])assert.ok(Math.abs(v.beast[k]-v.veil[k])<.6,`mask follows actor ${k}`);
    assert.equal(v.object,v.mask,'object-fit and alpha mask alignment');
   }
   async function shot(label){if(output){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,`${viewport.width}-${reduced}-${label}.png`)});}}
   async function advance(){
    await page.waitForFunction(()=>document.querySelector('#dialogue-layer').classList.contains('visible')&&document.querySelector('#dialogue-next').classList.contains('visible'));
    await page.locator('#dialogue-advance').click();
   }
   await seed(100);await pose('closed');await alignment();await shot('dense');
   const before=await page.locator('.cb-abyss i').first().evaluate(e=>getComputedStyle(e).transform);
   await page.waitForTimeout(160);
   const after=await page.locator('.cb-abyss i').first().evaluate(e=>getComputedStyle(e).transform);
   assert.equal(before===after,reduced,'CSS smoke moves except Reduced Motion');
   for(const [dark,name] of [[80,'guarded'],[60,'resist'],[40,'hesitate'],[25,'notice'],[10,'resolve']]){
    await seed(dark);await pose(name);await alignment();
   }
   // Deliver a real three-card reading, observe its reply and the real counter.
   await seed(40);await page.locator('.cb-reading-start-button').click();
   for(let i=0;i<3;i++){
    await page.locator('.cb-card-button').nth(i).click();
    await page.locator('.cb-modal-word').nth(i===2?1:0).click();
   }
   await page.locator('.cb-read').click();await advance();await advance();await advance();
   await page.waitForFunction(()=>CaritasEncounterDebug.getState().story==='word-strike');
   assert.equal(await page.locator('.cb-bar.dark i').evaluate(e=>e.style.width),'40%','hold visible meter during strike');
   await pose('accept');await shot('reply');await advance();
   await page.waitForFunction(()=>CaritasEncounterDebug.getState().story==='enemy-turn');
   await pose('resist');await alignment();
   await page.waitForFunction(()=>CaritasEncounterDebug.getState().story==='battle');
   // Run actual special transaction through purification and zero commit.
   await seed(42,'finisher');await page.locator('.cb-skill').click();
   await page.locator('.cb-special-card').nth(2).click();
   await page.getByRole('button',{name:'このカードの言葉を届ける',exact:true}).click();
   await advance();await advance();await advance();
   await page.waitForFunction(()=>CaritasEncounterDebug.getState().special.phase==='PURIFICATION');
   await pose('relief');assert.equal(await page.locator('#caritas-event').getAttribute('data-dark-cleared'),'false');
   await pose('normal');
   assert.equal(await page.locator('.cb-bar.dark i').evaluate(e=>e.style.width),'0%');
   const cleared=await page.locator('.cb-abyss').evaluate(e=>({opacity:getComputedStyle(e).opacity,visibility:getComputedStyle(e).visibility}));
   assert.deepEqual(cleared,{opacity:'0',visibility:'hidden'});await shot('released');
   await page.reload();await pose('normal');
   assert.equal(await page.locator('#caritas-event').getAttribute('data-dark-cleared'),'true','reload stays freed');
   assert.deepEqual(errors,[]);console.log(`PASS ${viewport.width}x${viewport.height} reduced=${reduced}: eight poses, reading/reply/counter, mask alignment, smoke motion, zero and reload; errors=0`);
   await context.close();
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
