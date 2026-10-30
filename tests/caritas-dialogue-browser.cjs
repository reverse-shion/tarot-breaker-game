/* Real event + canonical main UI comparison. Optional Playwright QA, not device PASS. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg','.ogg':'audio/ogg'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(bytes);});
});
function snapshot(){
 const props=['backgroundImage','backgroundColor','color','borderTopWidth','borderTopColor','borderRadius','boxShadow','fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','padding','minHeight','width','textShadow','backdropFilter'];
 return Object.fromEntries(['.tb-dialogue-window','.tb-dialogue-speaker','.tb-dialogue-text'].map(selector=>{const s=getComputedStyle(document.querySelector(selector));return [selector,Object.fromEntries(props.map(p=>[p,s[p]]))];}));
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CARITAS_BROWSER_EXECUTABLE||chromium.executablePath(),headless:true,args:['--no-sandbox']});
 try{
 for(const viewport of [{width:390,height:844},{width:844,height:390}])for(const reduced of [false,true]){
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,reducedMotion:reduced?'reduce':'no-preference'});
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/hoshisuna-main.html?dev=hoshisuna&preview=manifestation`);
  await page.waitForFunction(()=>window.CaritasEncounterDebug?.getState().story==='notice');
  await page.locator('#dialogue-advance').waitFor({state:'visible'});
  const reference=await context.newPage();
  await reference.setContent('<main id="game-shell"></main>');
  for(const file of ['game.css','dialogue.css','shared-dialogue.css'])await reference.addStyleTag({path:path.join(root,file)});
  await reference.addScriptTag({path:path.join(root,'shared-dialogue.js')});
  await reference.evaluate(()=>{window.qaDialogue=TarotDialogueUI.create({mount:document.getElementById('game-shell')});});
  async function compare(label){
   const line=await page.locator('#dialogue-layer').evaluate(el=>({speaker:el.dataset.speaker,actor:el.dataset.actor,text:el.querySelector('.tb-dialogue-text').textContent}));
   await reference.evaluate(line=>{qaDialogue.show(line);qaDialogue.revealAll();},line);
   assert.deepEqual(await page.evaluate(snapshot),await reference.evaluate(snapshot),label+' must match unchanged main computed styles');
   assert.equal(await page.locator('.tb-dialogue-layer').count(),1,'one dialogue component');
  }
  await compare('first notice');
  // First click reveals remaining text, next click advances, just like main.
  async function advance(){
   await page.locator('#dialogue-advance').click();

  }
  while(await page.evaluate(()=>CaritasEncounterDebug.getState().story)==='notice')await advance();
  await compare('inspection choice');
  const bounds=await page.evaluate(()=>({dialogue:document.querySelector('#dialogue-advance').getBoundingClientRect().toJSON(),actions:document.querySelector('#caritas-interaction-choice').getBoundingClientRect().toJSON()}));
  assert.ok(bounds.actions.bottom<=bounds.dialogue.top,'choices do not cover dialogue');
  assert.ok(bounds.actions.top>=0,'choices remain on-screen');
  assert.equal(await page.locator('#caritas-interaction-text').count(),0,'no custom speech window');
  await page.getByRole('button',{name:'離れる',exact:true}).click();
  assert.equal(await page.locator('#dialogue-layer').isVisible(),false);
  // Fresh context route reaches the actual inspect/start path without seeded saves.
  await page.reload();await page.waitForFunction(()=>window.CaritasEncounterDebug?.getState().story==='notice');
  while(await page.evaluate(()=>CaritasEncounterDebug.getState().story)==='notice')await advance();
  await page.getByRole('button',{name:'調べる',exact:true}).click();
  await compare('Caritas introduction');
  assert.equal(await page.locator('#caritas-interaction-choice').isVisible(),false);
  // No encounter stylesheet may override any shared dialogue speaker.
  const stylesheet=fs.readFileSync(path.join(root,'caritas-battle-event.css'),'utf8');
  assert.doesNotMatch(stylesheet,/\.tb-dialogue|#dialogue-|--speaker-|\.cb-intro/);
  assert.deepEqual(errors,[]);
  const output=process.env.CARITAS_QA_OUTPUT;
  if(output){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,`dialogue-${viewport.width}-${reduced}.png`)});}
  await context.close();console.log(`PASS ${viewport.width}x${viewport.height} reduced=${reduced}: notice/choice/intro styles identical to main, leave/inspect, no overlap, page errors 0`);
 }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
