/* Optional Chromium/WebKit QA; requires Playwright and a local static server. Not a device PASS. */
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const output=process.env.CARITAS_QA_OUTPUT||'/tmp/caritas-special-browser';fs.mkdirSync(output,{recursive:true});
const C=require('../caritas-battle-core.js'),S=require('../caritas-special-state.js');
(async()=>{
 const engine=process.env.CARITAS_QA_BROWSER||'chromium';
 assert.ok(['chromium','webkit'].includes(engine));
 const browser=await (engine==='webkit'?webkit.launch({headless:true}):chromium.launch({executablePath:process.env.CARITAS_BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']}));
 const results=[];
 for(const viewport of [{width:390,height:844},{width:844,height:390}])for(const [i,card] of C.CARDS.entries()){
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,reducedMotion:i===2?'reduce':'no-preference'});
  const label=engine+'-'+viewport.width+'x'+viewport.height+'-'+i;
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const seed=S.create({...C.newGame(),phase:'finisher',resonance:100,dark:42},'browser-'+i);
  await context.addInitScript(r=>{if(!localStorage.getItem('tb:dev:hoshisuna:caritas-full-reading-v1'))localStorage.setItem('tb:dev:hoshisuna:caritas-full-reading-v1',JSON.stringify(r));},seed);
  await page.goto((process.env.CARITAS_QA_URL||'http://127.0.0.1:8765/hoshisuna-main.html?dev=hoshisuna'));
  await page.locator('.cb-skill').click();await page.locator('.cb-special-card').nth(i).click();
  await page.evaluate(()=>{
   const root=document.querySelector('#caritas-event');window.specialPhases=[];window.artFrames=[];
   const sample=()=>{
    if(root.dataset.special!=='ART_PLAYBACK'||root.dataset.artReady!=='true')return;
    const el=root.querySelector('.cb-special-foreground'),r=el.getBoundingClientRect(),area=root.querySelector('.cb-special-art').getBoundingClientRect(),css=getComputedStyle(el);
    window.artFrames.push({width:r.width,height:r.height,x:r.x,y:r.y,area:{width:area.width,height:area.height},transform:css.transform,fit:css.objectFit});
    requestAnimationFrame(sample);
   };
   new MutationObserver(()=>{
    const phase=root.dataset.special;if(phase&&window.specialPhases.at(-1)!==phase)window.specialPhases.push(phase);
    if(root.dataset.artReady==='true'&&!window.artFrames.length)sample();
   }).observe(root,{attributes:true});
  });
  await page.getByRole('button',{name:'このカードの言葉を届ける',exact:true}).click();
  async function advance(){await page.waitForFunction(()=>document.querySelector('#dialogue-layer').classList.contains('visible')&&document.querySelector('.tb-dialogue-next').classList.contains('visible'));await page.locator('#dialogue-advance').click();}
  assert.equal(await page.locator('#dialogue-layer').getAttribute('data-actor'),'shion');
  assert.equal(await page.locator('.cb-cut-name').count(),0);
  async function assertEdgeToEdgeCutin(){
   const sections=await page.locator('.cb-cut-panel:visible').evaluateAll(elements=>elements.map(panel=>{
    const rect=panel.getBoundingClientRect(),image=panel.querySelector('.cb-cut-face'),imageRect=image.getBoundingClientRect();
    return {x:rect.x,width:rect.width,imageWidth:imageRect.width,fit:getComputedStyle(image).objectFit};
   }));
   assert.ok(sections.length>0);
   for(const cut of sections){
    assert.ok(Math.abs(cut.x)<1,'cut-in starts at viewport left edge');
    assert.ok(Math.abs(cut.width-viewport.width)<1,'cut-in spans full viewport width');
    assert.ok(Math.abs(cut.imageWidth-viewport.width)<1,'cut-in image spans full viewport width');
    assert.equal(cut.fit,'cover','cut-in image fills its panel without side margins');
   }
  }
  assert.equal(await page.locator('.cb-cut-shioriel').isVisible(),false);
  await assertEdgeToEdgeCutin();
  await page.waitForTimeout(650);await page.screenshot({path:path.join(output,'shion-'+label+'.png')});await advance();
  assert.equal(await page.locator('#dialogue-layer').getAttribute('data-actor'),'shioriel');
  assert.equal(await page.locator('.cb-cut-shion').isVisible(),false);
  await assertEdgeToEdgeCutin();
  await page.waitForTimeout(650);await page.screenshot({path:path.join(output,'shioriel-'+label+'.png')});await advance();
  assert.equal(await page.locator('#dialogue-layer').getAttribute('data-actor'),'shion-shioriel');
  assert.equal(await page.locator('.cb-cut-shion').isVisible(),true);assert.equal(await page.locator('.cb-cut-shioriel').isVisible(),true);
  await assertEdgeToEdgeCutin();
  await page.waitForFunction(()=>/星幻迷宮|星獣咆哮|星望祈願/.test(document.querySelector('#dialogue-text').textContent));
  await page.waitForTimeout(650);await page.screenshot({path:path.join(output,'dual-'+label+'.png')});await advance();
  await page.waitForFunction(()=>document.querySelector('#caritas-event').dataset.artReady==='true');
  assert.equal(await page.locator('#dialogue-layer').isVisible(),false);
  assert.equal(await page.locator('.cb-controls').isVisible(),false);
  const image=await page.locator('.cb-special-foreground').evaluate(el=>({src:el.src,width:el.naturalWidth,height:el.naturalHeight,fit:getComputedStyle(el).objectFit,rect:{width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}}));
  assert.ok(image.width>0);assert.equal(image.fit,'cover');
  assert.equal(await page.locator('.cb-special-title').count(),0);
  assert.equal((await page.locator('.cb-special-art').innerText()).trim(),'');
  await page.screenshot({path:path.join(output,'art-'+label+'.png')});await page.waitForTimeout(350);
  const frames=await page.evaluate(()=>window.artFrames);assert.ok(frames.length>2);
  const first=frames[0];
  assert.ok(first.width>=viewport.width-.5&&first.width<viewport.width*1.025,'art initially covers full screen width');
  assert.ok(first.height>=viewport.height-.5&&first.height<viewport.height*1.025,'art initially covers full screen height');
  for(const f of frames){
   assert.equal(f.fit,'cover');
   assert.ok(f.width>=viewport.width-.5&&f.height>=viewport.height-.5,'art always covers the viewport');
  }
  if(i===2){
   assert.ok(frames.every(f=>f.transform==='none'),'reduced-motion keeps art stationary');
  }else{
   assert.ok(frames.some(f=>f.width>first.width+viewport.width*.004),'art slowly grows beyond its already-fullscreen initial size');
   assert.ok(frames.every(f=>f.width<=viewport.width*1.081),'art zoom remains subtle');
  }
  await page.waitForFunction(()=>window.CaritasEncounterDebug.getState().special.phase==='CARITAS_REPLY');
  await advance();await advance();await page.waitForFunction(()=>window.CaritasEncounterDebug.getState().done);
  const phases=await page.evaluate(()=>window.specialPhases);
  assert.deepEqual(phases,['SHION_LINE','SHIORIEL_LINE','DUAL_INCANTATION','ART_PLAYBACK','PURIFICATION','CARITAS_REPLY','FAREWELL','RETURNING','DONE']);
  await page.reload();await page.waitForFunction(()=>window.CaritasEncounterDebug.getState().done);
  const done=await page.evaluate(()=>({state:window.CaritasEncounterDebug.getState(),departed:document.body.classList.contains('caritas-departed')}));
  assert.equal(done.departed,true);assert.equal(done.state.special.phase,'DONE');assert.equal(done.state.battle.dark,0);assert.deepEqual(errors,[]);
  results.push({engine,viewport,card:card.id,reducedMotion:i===2,image,initialFrame:first,sampledFrames:frames.length,phases,done:true,errors});console.log(label+' PASS');await context.close();
 }
 fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
