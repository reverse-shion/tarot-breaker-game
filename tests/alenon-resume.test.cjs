const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Core=require('../progress.js'),Resume=require('../alenon-resume.js'),Registry=require('../dev-checkpoints.js');
const page=require('./helpers/alenon-page-runtime.cjs');
const prefix='?dev=alenon-resume-';
const plain=value=>JSON.parse(JSON.stringify(value));
const event=extra=>({preventDefault(){},target:{closest:()=>null},button:0,pointerId:1,clientX:195,clientY:422,...extra});
function noProductionWrites(t){assert.equal(t.accesses.filter(([op,label,key])=>op!=='read' && (label==='production'||!key.includes(':dev:'))).length,0);assert.equal(t.accesses.filter(([op,label])=>op==='read'&&label==='production').length,0);}

test('all real Alenon entries validate v1, boot without writes and use exact detached projections',async()=>{
  for(const definition of Registry.list().filter(definition=>definition.event==='alenon-resume')){
    assert.equal(Core.validateRecord(definition.temporaryState).ok,true);
    const t=page('?dev='+definition.id);await t.flush();const m=t.h.testAlenon;
    assert.equal(m.ready,true,definition.id);assert.equal(m.story.completed,definition.id!=='alenon-resume-intro-incomplete');
    assert.equal(m.orbInteraction.hasInspected,false);assert.equal(m.ride.mode,'ground');assert.equal(m.ride.lift,0);
    assert.equal(t.accesses.filter(([op])=>op!=='read').length,0);
    assert.equal(t.h.TarotJourney.get('companion').x,999,'legacy singleton unchanged');
    const p=plain(m.session.projection),waiting=definition.id.endsWith('-waiting');
    assert.deepEqual(p,{landingMemoryDone:waiting,gardenStory:{shioponDone:waiting,lumiereDone:waiting,joined:waiting},companion:waiting?{mode:'waiting'}:null});
    noProductionWrites(t);
  }
});

test('pad Continue uses authored safe ground spawn, reset and cooldown without landing audio or boarding',async()=>{
  const t=page(prefix+'pad-return');await t.flush();const m=t.h.testAlenon;
  assert.deepEqual([m.player.x,m.player.y],[730.9,789.3]);assert.equal(m.ride.homeArmed,false);
  assert.equal(m.ride.reboardLockedUntil,10900);assert.equal(m.story.started,false);
  m.player.x=800;m.resetPlayer();assert.deepEqual([m.player.x,m.player.y],[730.9,789.3]);
  for(let i=0;i<8;i++)await t.tick();assert.equal(m.ride.mode,'ground');
  assert.equal(t.audio.filter(a=>a.src.includes('pad')&&a.playCalls).length,0);noProductionWrites(t);
});

test('strict readiness blocks input, triggers and prologue until collision AND decoded images settle',async()=>{
  const t=page(prefix+'intro-incomplete',{deferCollision:true,deferImages:true});const m=t.h.testAlenon;
  await t.flush();assert.equal(m.ready,false);assert.equal(m.story.locked,true);assert.equal(t.e('viewport').listeners.pointerdown,undefined);
  await m.runPrologue();assert.equal(m.story.started,false);m.updateOrbInteractionRange();assert.equal(m.orbInteraction.promptOpen,false);
  t.releaseImages();await t.flush();assert.equal(m.ready,false);t.releaseCollision();await t.flush();assert.equal(m.ready,true);assert.equal(m.story.locked,true);assert.equal(m.story.started,false);
  noProductionWrites(t);
});

test('image/decode/fetch/invalid collision/unsafe spawn failures expose retry and remain locked without rewriting bytes',async()=>{
  const bad=JSON.parse(fs.readFileSync('assets/maps/alenon-collision.json'));bad.walkAreas=[{type:'poly',points:[[1,1],[2,1],[2,2]]}];
  const invalid=plain(bad);invalid.walkAreas[0].points[0][0]=null;
  for(const options of [{imageError:true},{decodeError:true},{fetchError:true},{collision:{...bad,walkAreas:[]}},{collision:invalid},{collision:{...bad,walkAreas:[{type:'poly',points:[[716,300],[716,330],[716,360]]}]}},{collision:bad}]){
    const t=page(prefix+'intro-complete',options);await t.flush();const m=t.h.testAlenon;
    assert.equal(m.ready,false);assert.equal(m.story.locked,true);assert.equal(m.collisionReady,false);assert.equal(t.e('viewport').listeners.pointerdown,undefined);
    const panel=t.e('alenon-resume-status');assert.ok(panel.children.some(x=>x.textContent==='再試行'));assert.ok(panel.children.some(x=>x.href==='./index.html'));
    noProductionWrites(t);assert.equal(t.accesses.filter(([op])=>op!=='read').length,0);
  }
});

test('malformed, unsupported, unavailable, other-map and bypass-combination entries fail before gameplay',async()=>{
  for(const search of ['?dev=unknown',prefix+'intro-complete&from=title',prefix+'intro-complete&skipPrologue=1',prefix+'intro-complete&edit=1',prefix+'intro-complete&objects=1',prefix+'intro-complete&collision=1',prefix+'intro-complete&dev=alenon-resume-pad-return']){
    const t=page(search);await t.flush();assert.equal(t.h.testAlenon,undefined);assert.equal(t.audio.length,0);noProductionWrites(t);
  }
  const definition=Registry.get('alenon-resume-intro-complete');
  for(const raw of ['bad',JSON.stringify({...definition.temporaryState,version:2}),JSON.stringify({...definition.temporaryState,checkpoint:{mapId:'star_country_landing',spawnId:'pad_ground'}})]){
    const key='tarot-breaker:dev:alenon-resume:v1:'+definition.id,session=new Map([[key,raw]]);
    const t=page('?dev='+definition.id,{session});await t.flush();assert.equal(t.h.testAlenon,undefined);assert.equal(session.get(key),raw);noProductionWrites(t);
  }
  const t=page(prefix+'intro-complete',{readError:true});await t.flush();assert.equal(t.h.testAlenon,undefined);noProductionWrites(t);
  assert.equal(Resume.receive({status:'none'}).ok,false);
});

test('incomplete Continue executes authored Devil prologue and writes only at real completion; reload suppresses replay',async()=>{
  const t=page(prefix+'intro-incomplete');await t.flush();const m=t.h.testAlenon;
  assert.equal(t.accesses.filter(([op])=>op==='write').length,0);
  t.e('prologue-start').listeners.click[0]();await t.flush();assert.equal(m.story.started,true);assert.equal(m.story.completed,false);
  for(let i=0;i<700&&!m.story.completed;i++)await t.tick();
  assert.equal(m.story.completed,true);assert.equal(m.story.locked,false);assert.ok(t.lines.length>8);
  assert.ok(t.e('prologue-tarot-front').src.includes('15-the-devil.webp'));
  assert.equal(t.accesses.filter(([op])=>op==='write').length,1);noProductionWrites(t);
  const back=page(prefix+'intro-incomplete',{session:t.session,production:t.production});await back.flush();
  assert.equal(back.h.testAlenon.story.completed,true);assert.equal(back.h.testAlenon.story.started,false);assert.equal(back.lines.length,0);noProductionWrites(back);
});

test('failed dev completion persistence keeps gameplay and reports nonpersistent status with no production fallback',async()=>{
  const t=page(prefix+'intro-incomplete',{writeError:true});await t.flush();const m=t.h.testAlenon;m.runPrologue();
  for(let i=0;i<700&&!m.story.completed;i++)await t.tick();assert.equal(m.story.completed,true);assert.equal(m.story.locked,false);
  assert.ok(t.e('alenon-resume-status').children[0].textContent.includes('保存されていません'));noProductionWrites(t);
});

test('completed intro preserves actual 118/154 hysteresis, native gesture retry and sandbox containment',async()=>{
  const t=page(prefix+'intro-complete');await t.flush();const m=t.h.testAlenon;
  for(let i=0;i<300;i++)m.updateOrbInteractionRange();assert.equal(m.orbInteraction.armed,false);assert.equal(m.orbInteraction.promptOpen,false);
  m.player.y=m.layout.orb.y;m.player.x=m.layout.orb.x+154;m.updateOrbInteractionRange();assert.equal(m.orbInteraction.armed,true);
  m.player.y=m.layout.orb.y;m.player.x=m.layout.orb.x+118;m.updateOrbInteractionRange();assert.equal(m.orbInteraction.promptOpen,true);
  const wind=t.audio.find(a=>a.src.includes('wind-ambience')),orb=t.audio.find(a=>a.src.includes('orb-resonance'));
  t.h.dispatchEvent(new Event('pointerdown'));await t.flush();assert.ok(wind.playCalls);assert.ok(orb.playCalls);
  wind.pause();orb.pause();t.h.dispatchEvent(new Event('pointerdown'));await t.flush();assert.ok(wind.playCalls>=2);assert.ok(orb.playCalls>=2);
  m.ride.mode='flying';m.beginPadExit();await t.flush();assert.equal(t.h.location.href,'');assert.equal(m.ride.mode,'ground');noProductionWrites(t);
});

test('readiness retry recovers without changing history and registered module imports have no browser side effects',async()=>{
  const options={fetchError:true},t=page(prefix+'pad-return-waiting',options);await t.flush();options.fetchError=false;
  await t.h.testAlenon.bootAlenonContinue();assert.equal(t.h.testAlenon.ready,true);assert.equal(t.h.testAlenon.session.projection.companion.mode,'waiting');noProductionWrites(t);
  const sandbox={TarotProgressCore:Core,TarotProgressResume:require('../progress-resume.js'),TarotDevCheckpoints:Registry};
  for(const key of ['localStorage','sessionStorage','location','Date','crypto'])Object.defineProperty(sandbox,key,{get(){throw Error(key);}});
  vm.runInNewContext(fs.readFileSync('alenon-resume.js','utf8'),sandbox);assert.equal(typeof sandbox.TarotAlenonResume.receive,'function');
});


test('real Continue input cancels on reset and repeated successful boot cannot duplicate controls or ready signals',async()=>{
  const t=page(prefix+'pad-return');let signals=0;t.h.addEventListener('tarot-breaker:alenon-resume-ready',()=>signals++);await t.flush();const m=t.h.testAlenon;
  assert.equal(signals,1);assert.ok(t.e('.shion-actor').style.left);assert.ok(t.e('world').style.transform);
  const pointers=t.e('viewport').listeners.pointerdown.length,keyHandlers=t.listeners.keydown.length;
  await Promise.all([m.bootAlenonContinue(),m.bootAlenonContinue()]);assert.equal(signals,1);assert.equal(t.e('viewport').listeners.pointerdown.length,pointers);assert.equal(t.listeners.keydown.length,keyHandlers);
  const start=[m.player.x,m.player.y];
  t.listeners.keydown.forEach(fn=>fn(event({key:'ArrowUp'})));await t.tick();await t.tick();assert.notDeepEqual([m.player.x,m.player.y],start);
  t.e('viewport').listeners.pointerdown[0](event());t.e('viewport').listeners.pointermove[0](event({clientX:220,clientY:450}));assert.equal(t.e('move-joystick').hidden,false);
  m.resetPlayer();assert.equal(t.e('move-joystick').hidden,true);assert.equal(m.player.target,null);const reset=[m.player.x,m.player.y];await t.tick();assert.deepEqual([m.player.x,m.player.y],reset);noProductionWrites(t);
});

test('strict polygon validation rejects finite degenerate polygons instead of granting permissive readiness',()=>{
  for(const points of [[[1,1],[2,2],[3,3]],[[0,0],[0,0],[0,0]],[[0,0],[1,1],[null,3]]])assert.throws(()=>Resume.validateCollision({map:'alenon',referenceSize:{width:1448,height:1086},walkAreas:[{type:'poly',points}]}));
});


test('collision success alone and image load without completed decode cannot unlock real Continue',async()=>{
  for(const deferred of ['deferImages','deferDecode']){
    const t=page(prefix+'intro-complete',{[deferred]:true});await t.flush();const m=t.h.testAlenon;
    assert.equal(m.ready,false);assert.equal(m.story.locked,true);assert.equal(m.orbInteraction.promptOpen,false);
    m.beginBoarding();assert.equal(m.ride.mode,'ground');
    if(deferred==='deferImages')t.releaseImages();else t.releaseDecode();await t.flush();assert.equal(m.ready,true);noProductionWrites(t);
  }
});

test('receiver rejects valid other-map state and malformed or forged companion authority',()=>{
  const fixture=plain(Registry.get('alenon-resume-intro-complete').temporaryState);
  const landing={...fixture,checkpoint:{mapId:'star_country_landing',spawnId:'pad_ground'}};
  assert.equal(Core.validateRecord(landing).ok,true);assert.equal(Resume.receive({status:'valid',state:landing}).reason,'not-alenon');
  for(const state of [{...fixture,companion:'joined_with_shion'}, {...fixture,extra:true}, {...fixture,completedEvents:['garden_lumiere_gate']}])assert.equal(Resume.receive({status:'valid',state}).ok,false);
});
