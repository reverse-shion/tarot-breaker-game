const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Nav = require('../navigation.js');

function harness(search = '', saved = {}) {
  const elements = new Map(), audio = [], lines = [], timers = [], frames = [], listeners = {};
  const storage = new Map([['tarot-breaker:map-journey-v1', JSON.stringify(saved)]]);
  const store = { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) };
  const canvas = new Proxy({}, {get: (_, key) => key === 'measureText' ? () => ({width: 1}) : () => {}});
  function element(key) {
    if (!elements.has(key)) {
      const classes = new Set();
      elements.set(key, {
        hidden: false, dataset: {}, style: {setProperty(){}}, textContent:'', listeners:{},
        classList: {add:(...ks)=>ks.forEach(k=>classes.add(k)), remove:(...ks)=>ks.forEach(k=>classes.delete(k)), contains:k=>classes.has(k), toggle:(k,v)=>v ? classes.add(k) : classes.delete(k)},
        addEventListener(type, fn){(this.listeners[type] ||= []).push(fn);},
        setAttribute(){}, appendChild(){}, replaceChildren(){}, querySelector:k=>element(k), getContext:()=>canvas,
        getBoundingClientRect:()=>({left:0,top:0,width:1448,height:1086}),
      });
    }
    return elements.get(key);
  }
  class Audio {
    constructor(src){this.src=src;this.paused=true;this.currentTime=0;this.duration=10;this.playCalls=0;this.volume=1;this.listeners={};audio.push(this);}
    setAttribute(){} addEventListener(t,f){this.listeners[t]=f;} pause(){this.paused=true;}
    play(){this.playCalls++;this.paused=false;return this.reject ? Promise.reject(new Error('gesture required')) : Promise.resolve();}
  }
  const h = {console,URLSearchParams,Math,JSON,Promise,Event, Audio, Image:class {constructor(){this.complete=true;this.naturalWidth=1536;this.naturalHeight=512;} decode(){return Promise.resolve();}},
    location:{search,href:''}, innerWidth:1448, innerHeight:1086, performance:{now:()=>10000},
    localStorage:store,sessionStorage:store,requestAnimationFrame:f=>(frames.push(f),frames.length),cancelAnimationFrame(){},
    setTimeout:f=>(timers.push(f),timers.length),clearTimeout(){},
    addEventListener:(type,fn)=>(listeners[type] ||= []).push(fn), dispatchEvent:e=>(listeners[e.type]||[]).forEach(f=>f(e)),
    document:{body:element('body'),documentElement:element('root'),hidden:false,currentScript:{dataset:{}},
      getElementById:element,querySelector:element,querySelectorAll:()=>[],addEventListener:(type,fn)=>(listeners[type] ||= []).push(fn)},
    fetch:async(url)=>{
      const clean=String(url).split('?')[0].replace(/^\.\//,'');
      if (clean === 'assets/maps/star-landing/collision.json' || clean === 'assets/maps/star-landing/passage-layers.json') {
        return {ok:true,json:async()=>JSON.parse(fs.readFileSync(clean,'utf8'))};
      }
      return {ok:false};
    }, TarotDialogueUI:{bind:options=>({show:line=>lines.push(line),hide(){}})},
  };
  h.window=h;vm.createContext(h);vm.runInContext(fs.readFileSync('map-journey.js','utf8'),h);
  return {h,e:element,audio,lines,timers,frames,listeners,run:code=>vm.runInContext(code,h), async flush(){for(let i=0;i<8;i++){timers.splice(0).forEach(f=>f());await Promise.resolve();}}};
}
function inline(file){return [...fs.readFileSync(file,'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];}
async function landing(search, saved){
  const t=harness(search,saved);
  t.run(inline('star-country-landing.html').replace('      boot();', `window.testMap = {boot, player, ride, companion, loop, beginBoarding, finishArrival, leaveForGarden, updateCompanion, isGroundWalkable, get memoryDone(){return devilEventStarted}, advance(){storyAdvanceResolve?.(); storyAdvanceResolve=null;}};`));
  await t.h.testMap.boot();return t;
}
const event = extra => ({preventDefault(){},target:{closest:()=>null},button:0,pointerId:1,clientX:724,clientY:500,...extra});

test('BGM waits for movement, is one looping instance, retries rejection and never rewinds', async()=>{
  const t=harness();t.run(fs.readFileSync('audio.js','utf8'));t.run(fs.readFileSync('audio.js','utf8'));
  assert.equal(t.audio.length,1);const bgm=t.audio[0];assert.equal(bgm.playCalls,0);assert.equal(bgm.loop,true);
  assert.equal(bgm.src,'./assets/audio/bgm/hoshi-no-kioku_toki-no-inori.mp3');
  assert.equal(t.e('audio-toggle').hidden,true);
  t.h.TarotAudio.startFromMovement();assert.equal(bgm.playCalls,1); // synchronous gesture stack
  await t.flush();bgm.currentTime=42;
  t.h.TarotAudio.startFromMovement();assert.equal(bgm.playCalls,1);assert.equal(bgm.currentTime,42);
  t.h.dispatchEvent(new Event('tarot-breaker:interaction-start'));t.h.dispatchEvent(new Event('tarot-breaker:interaction-end'));
  assert.equal(bgm.currentTime,42);assert.equal(bgm.playCalls,1);
  bgm.pause();bgm.reject=true;t.h.TarotAudio.startFromMovement();await t.flush();bgm.paused=true;bgm.reject=false;
  t.h.TarotAudio.startFromMovement();assert.equal(bgm.playCalls,3);
});

test('PAD return enters the real north path, does not replay memory or immediately leave', async()=>{
  const t=await landing('?from=garden');const m=t.h.testMap;
  assert.equal(m.player.y,257);assert.equal(m.player.dir,'down');assert.equal(m.memoryDone,true);
  assert.ok(m.isGroundWalkable(m.player.x,m.player.y));
  for(let i=1;i<10;i++)m.loop(10000+i*16);await t.flush();assert.equal(t.h.location.href,'');
  // Walk back north over the existing entrance, rather than touching a corner.
  m.player.target={x:724,y:200};for(let i=1;i<90;i++)m.loop(10200+i*16);
  await t.flush();assert.equal(t.h.location.href,'./index.html?from=landing');
});

test('companion farewell finishes before boarding, stays on ground during flight and rejoins on return',async()=>{
  const t=await landing('?from=garden',{companion:{mode:'following'}});const m=t.h.testMap;
  m.player.target={x:725,y:788};
  for(let i=1;i<500 && !t.lines.length;i++)m.loop(10000+i*16);
  assert.equal(t.lines[0]?.text,'しおぽんはここで待ってるぴょん！');
  assert.equal(m.ride.mode,'ground');assert.equal(m.companion.following,false);
  assert.ok(Math.hypot(m.companion.x-725,m.companion.y-788)>66);
  const waiting={x:m.companion.x,y:m.companion.y};
  m.advance();await t.flush();assert.equal(t.lines[1]?.text,'シオンさん、いってらっしゃい');
  assert.equal(t.lines[1]?.speaker,'しおぽん');assert.equal(m.ride.mode,'ground');
  m.advance();await t.flush();assert.equal(m.ride.mode,'boarding');
  for(let i=1;i<80;i++)m.loop(20000+i*16);assert.equal(m.ride.mode,'flying');
  m.player.target={x:725,y:1050};for(let i=1;i<250;i++)m.loop(22000+i*16);
  await t.flush();assert.equal(t.h.location.href,'./alenon.html?from=landing-return');
  assert.equal(m.companion.x,waiting.x);assert.equal(m.companion.y,waiting.y);
  assert.equal(t.h.TarotJourney.get('companion').mode,'waiting');
  assert.ok(t.audio.filter(a=>a.playCalls>0).length>=2,'activation and movement SE still play');
  const back=await landing('?from=alenon',{companion:t.h.TarotJourney.get('companion'),landingMemoryDone:true});
  assert.equal(back.h.testMap.companion.following,false);
  back.h.testMap.finishArrival();assert.equal(back.h.testMap.companion.following,true);
  assert.ok(back.audio.some(a=>a.src.includes('land') && a.playCalls>0),'landing SE still plays');
});

test('solo boarding has no farewell; walking at the south edge cannot teleport off the island',async()=>{
  const t=await landing('?from=garden');const m=t.h.testMap;
  m.player.x=600;m.player.y=1048;m.loop(10016);await t.flush();assert.equal(t.h.location.href,'');
  m.player.x=725;m.player.y=724;await m.beginBoarding();assert.equal(m.ride.mode,'boarding');assert.equal(t.lines.length,0);
});

test('PAD accepted pointer and keyboard gestures invoke the shared manager',async()=>{
  const t=await landing('?from=garden');t.run(fs.readFileSync('audio.js','utf8'));const bgm=t.audio.at(-1);
  assert.equal(bgm.playCalls,0);t.e('viewport').listeners.pointerdown[0](event());assert.equal(bgm.playCalls,1);
  await t.flush();bgm.currentTime=12;t.listeners.keydown[0](event({key:'ArrowDown'}));assert.equal(bgm.currentTime,12);assert.equal(bgm.playCalls,1);
});

test('Alenon return bypasses prologue and spawns behind its authored PAD; title still starts prologue',()=>{
  for(const from of ['landing-return','title']){
    const t=harness('?from='+from);
    t.run(inline('alenon.html').replace('      initRuinDrift();', '      window.testMap = {player, story, layout, resetPlayer, preparePrologue}; return;'));
    const m=t.h.testMap;m.resetPlayer();m.preparePrologue();
    if(from==='landing-return'){
      assert.equal(m.story.completed,true);assert.equal(m.story.locked,false);assert.equal(t.e('prologue-overlay').hidden,true);
      assert.equal(m.player.x,m.layout.pad.x);assert.equal(m.player.y,m.layout.pad.y-68);
      const data=JSON.parse(fs.readFileSync('assets/maps/alenon-collision.json'));data.map='star-country-gate-garden';
      assert.ok(Nav.createCollision(data).isWalkable(m.player.x,m.player.y));
    }else{assert.equal(m.story.completed,false);assert.equal(t.e('prologue-overlay').hidden,false);assert.equal(m.player.x,716);assert.equal(m.player.y,330);}
  }
});

function alenonOrb(search) {
  const t=harness(search);
  t.run(inline('alenon.html').replace('      initRuinDrift();',
    '      window.testOrb = {player, story, ride, layout, orbInteraction, resetPlayer, preparePrologue, updateOrbInteractionRange, finishPadLanding}; return;'));
  const m=t.h.testOrb;
  m.resetPlayer();
  m.preparePrologue();
  return {t,m};
}

test('completed intro resume stays silent until leaving the Orb outer radius and re-entering',()=>{
  const {t,m}=alenonOrb('?skipPrologue=1'); // Existing runtime bypass, never a durable completion.
  assert.deepEqual([m.player.x,m.player.y],[716,330]);
  assert.equal(m.story.completed,true);
  assert.equal(m.orbInteraction.armed,false);
  for(let frame=0;frame<240;frame++) m.updateOrbInteractionRange();
  assert.equal(m.orbInteraction.promptOpen,false,'waiting in place never opens the Orb');

  m.player.y=m.layout.orb.y+130; // Outside enter radius, still inside re-arm radius.
  m.updateOrbInteractionRange();
  assert.equal(m.orbInteraction.armed,false);
  m.player.y=m.layout.orb.y+155;
  m.updateOrbInteractionRange();
  assert.equal(m.orbInteraction.armed,true);
  assert.equal(m.orbInteraction.promptOpen,false);
  m.player.y=m.layout.orb.y+140;
  m.updateOrbInteractionRange();
  assert.equal(m.orbInteraction.promptOpen,false,'hysteresis avoids boundary chatter');
  m.player.y=m.layout.orb.y+117;
  m.updateOrbInteractionRange();
  assert.equal(m.orbInteraction.promptOpen,true,'intentional re-entry opens the Orb');
  assert.equal(m.orbInteraction.armed,false);
  assert.equal(t.e('orb-interaction-choice').hidden,false);
});

test('title prologue can re-arm the Orb after its existing final walk without changing control release',()=>{
  const {m}=alenonOrb('?from=title');
  assert.equal(m.story.completed,false);
  assert.equal(m.story.locked,true);
  assert.equal(m.orbInteraction.armed,false);
  // The authored prologue moves from y=330 to y=494 before releasing control.
  m.player.y=494;
  m.story.completed=true;
  m.story.locked=false;
  m.updateOrbInteractionRange();
  assert.equal(m.orbInteraction.armed,true);
  m.player.y=m.layout.orb.y+117;
  m.updateOrbInteractionRange();
  assert.equal(m.orbInteraction.promptOpen,true);
});

test('PAD return retains landing, dismount, and Orb suppression without an immediate reboard',()=>{
  const {m}=alenonOrb('?from=landing-return');
  assert.equal(m.ride.mode,'landing');
  assert.equal(m.story.completed,true);
  assert.equal(m.story.locked,false);
  assert.equal(m.orbInteraction.armed,true,'landing starts outside Orb');
  m.updateOrbInteractionRange();
  assert.equal(m.orbInteraction.promptOpen,false);
  m.finishPadLanding();
  assert.equal(m.ride.mode,'ground');
  assert.equal(m.player.x,m.layout.pad.x);
  assert.equal(m.player.y,m.layout.pad.y-68);
  assert.ok(Math.hypot(m.player.x-m.layout.pad.x,m.player.y-m.layout.pad.y)>64);
  assert.ok(m.ride.reboardLockedUntil>10000);
  m.updateOrbInteractionRange();
  assert.equal(m.orbInteraction.promptOpen,false);
});

test('garden return trigger lies on the current collision path and has spawn clearance',()=>{
  const c=Nav.createCollision(JSON.parse(fs.readFileSync('assets/maps/star-country-gate-garden-collision.json')));
  const exit=c.nearestWalkable({x:724,y:1015});const spawn=c.nearestWalkable({x:exit.x,y:exit.y-16});
  assert.ok(c.segmentClear(spawn,{x:exit.x,y:exit.y-3}));assert.ok(spawn.y<exit.y-8);
});

test('journey progress survives a new page and title reset clears only this journey',()=>{
  const t=harness();t.h.localStorage.setItem('unrelated','keep');t.h.TarotJourney.set('gardenStory',{shioponDone:true,lumiereDone:true,joined:true});
  t.run('delete window.TarotJourney');t.run(fs.readFileSync('map-journey.js','utf8'));
  assert.equal(t.h.TarotJourney.get('gardenStory').lumiereDone,true);t.h.TarotJourney.reset();assert.equal(t.h.TarotJourney.get('gardenStory'),undefined);assert.equal(t.h.localStorage.getItem('unrelated'),'keep');
});

function garden(saved = {}) {
  const t=harness('?from=landing',saved);
  t.h.TarotDialogueUI.create=()=>({hide(){},setState(){},show(){},isTyping:()=>false});
  for(const f of ['navigation.js','blocked-collision.js','controls.js','dialogue.js','story-event-guard.js']) t.run(fs.readFileSync(f,'utf8'));
  let source=fs.readFileSync('game.js','utf8');
  source=source.slice(0,source.indexOf('  (async () => {'))+`
    window.testMap = {player, shiopon, updatePlayer, startShioponFollow,
      init(data){ rebuildCollision(data); spawnRef=findNearestSpawnRef(); gardenExitRef={...spawnRef};
        spawnRef=collision.nearestWalkable({x:spawnRef.x,y:spawnRef.y-16});
        player.x=spawnRef.x;player.y=spawnRef.y;ready=true;running=true; },
      get controls(){return controls}, get entrance(){return gardenExitRef},
    };
  })();`;
  // Keep production navigation and input; expose only the closure to the test.
  source=source.replace('rebuildCollision(data);','collision=createCollision(data);walkAreas=collision.areas;navigation=createNavigator(collision,16);controls=createControls(collision,navigation);');
  t.run(source);t.h.testMap.init(JSON.parse(fs.readFileSync('assets/maps/star-country-gate-garden-collision.json')));return t;
}

test('garden uses real controls to return through its reachable entrance exactly once',()=>{
  const t=garden({gardenStory:{shioponDone:true,lumiereDone:true,joined:true}});const m=t.h.testMap;
  m.startShioponFollow();for(let i=0;i<5;i++)m.updatePlayer(.016);
  assert.equal(t.h.location.href,'');assert.equal(t.h.TarotDialogue.getState().active,false);
  m.controls.keyDown('ArrowDown');for(let i=0;i<30;i++)m.updatePlayer(.016);
  assert.equal(t.h.location.href,'./star-country-landing.html?from=garden');
  assert.equal(t.h.TarotJourney.get('companion').mode,'following');
  const atExit=m.player.y;m.updatePlayer(.05);assert.equal(m.player.y,atExit);
});

test('new garden arrival can turn back without triggering the first event; revisits retain completed events',()=>{
  const first=garden();const m=first.h.testMap;m.updatePlayer(.016);
  assert.equal(first.h.TarotDialogue.getState().active,false);
  m.controls.keyDown('ArrowDown');for(let i=0;i<30;i++)m.updatePlayer(.016);
  assert.equal(first.h.location.href,'./star-country-landing.html?from=garden');
  const returned=garden({gardenStory:{shioponDone:true,lumiereDone:true,joined:true}});
  const r=returned.h.testMap;r.player.x=810;r.player.y=800;r.updatePlayer(.016);
  assert.equal(returned.h.TarotDialogue.getState().active,false);
  r.player.y=212;r.updatePlayer(.016);assert.equal(returned.h.TarotDialogue.getState().active,false);
});

test('garden keyboard movement starts the same looping BGM without a title click',async()=>{
  const t=garden();t.run(fs.readFileSync('audio.js','utf8'));const bgm=t.audio[0];
  assert.equal(bgm.playCalls,0);t.listeners.keydown[0](event({key:'ArrowDown'}));assert.equal(bgm.playCalls,1);
  await t.flush();bgm.currentTime=24;t.listeners.keydown[0](event({key:'ArrowDown'}));assert.equal(bgm.playCalls,1);assert.equal(bgm.currentTime,24);
});
