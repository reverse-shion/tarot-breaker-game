/* Optional desktop Chromium QA; requires Playwright and a local static server. Not a device PASS. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const output=process.env.CARITAS_QA_OUTPUT||'/tmp/caritas-special-browser';fs.mkdirSync(output,{recursive:true});
const C=require('../caritas-battle-core.js'),S=require('../caritas-special-state.js');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CARITAS_BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const results=[];
 for(const [i,card] of C.CARDS.entries()){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:i===2?'reduce':'no-preference'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const seed=S.create({...C.newGame(),phase:'finisher',resonance:100,dark:42},'browser-'+i);
  await context.addInitScript(r=>{if(!localStorage.getItem('tb:dev:hoshisuna:caritas-full-reading-v1'))localStorage.setItem('tb:dev:hoshisuna:caritas-full-reading-v1',JSON.stringify(r));},seed);
  await page.goto((process.env.CARITAS_QA_URL||'http://127.0.0.1:8765/hoshisuna-main.html?dev=hoshisuna'));
  await page.locator('.cb-skill').click();await page.locator('.cb-special-card').nth(i).click();await page.getByRole('button',{name:'このカードの言葉を届ける',exact:true}).click();
  async function advance(){const b=page.locator('#dialogue-advance');await page.waitForFunction(()=>document.querySelector('#dialogue-layer').classList.contains('visible'));if(!await page.locator('.tb-dialogue-next').evaluate(e=>e.classList.contains('visible')))await b.click();await b.click();}
  await advance();await advance();
  assert.equal(await page.locator('#dialogue-layer').getAttribute('data-actor'),'shion-shioriel');
  await page.waitForTimeout(650);await page.screenshot({path:path.join(output,'dual-'+i+'.png')});await advance();
  await page.waitForFunction(()=>document.querySelector('#caritas-event').dataset.artReady==='true');
  assert.equal(await page.locator('#dialogue-layer').isVisible(),false);
  assert.equal(await page.locator('.cb-controls').isVisible(),false);
  const image=await page.locator('.cb-special-foreground').evaluate(el=>({src:el.src,width:el.naturalWidth,height:el.naturalHeight,fit:getComputedStyle(el).objectFit,rect:{width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}}));
  assert.ok(image.width>0);assert.equal(image.fit,'contain');await page.screenshot({path:path.join(output,'art-'+i+'.png')});
  await page.waitForFunction(()=>window.CaritasEncounterDebug.getState().special.phase==='CARITAS_REPLY');
  await advance();await advance();await page.waitForFunction(()=>window.CaritasEncounterDebug.getState().done);
  await page.reload();await page.waitForFunction(()=>window.CaritasEncounterDebug.getState().done);
  const done=await page.evaluate(()=>({state:window.CaritasEncounterDebug.getState(),departed:document.body.classList.contains('caritas-departed')}));
  assert.equal(done.departed,true);assert.equal(done.state.special.phase,'DONE');assert.equal(done.state.battle.dark,0);assert.deepEqual(errors,[]);
  results.push({card:card.id,reducedMotion:i===2,image,done:true,errors});await context.close();
 }
 fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
