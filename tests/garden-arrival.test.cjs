// Deterministic dependency/frame tests. Physical Safari paint remains a device check.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
const scene = fs.readFileSync('scene-effects.js', 'utf8');
const collision = require('../assets/maps/star-country-gate-garden-collision.json');
const manifest = require('../assets/sprites/shion/shion_sprite_manifest.json');
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
function deferred() { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; }
function harness({arrival=true, imageDelay, decodeDelay, decodeMissing=false, badImage=false, sceneDelay, badJson=false}={}) {
  const frames=[], timers=new Map(), draws=[], errors=[], events=[];
  let timerId=0, now=0;
  class Element {
    constructor(){ this.listeners={}; this.style={}; this.dataset={}; this.hidden=false; this.classes=new Set(); this.classList={add:(...v)=>v.forEach(k=>this.classes.add(k)),remove:(...v)=>v.forEach(k=>this.classes.delete(k)),contains:k=>this.classes.has(k)}; }
    addEventListener(t,f){(this.listeners[t] ||= []).push(f);}
    removeEventListener(t,f){this.listeners[t]=(this.listeners[t]||[]).filter(x=>x!==f);}
    emit(t,e={}){for(const f of this.listeners[t]||[])f({type:t,preventDefault(){},...e});}
    appendChild(e){elements[e.id]=e;}
    getBoundingClientRect(){return {left:0,top:0,width:390,height:844};}
    setAttribute(){} getContext(){return context;}
  }
  const context=new Proxy({}, {get:(_,k)=>k==='drawImage'? (...args)=>draws.push(args):k.includes('Gradient')?()=>({addColorStop(){}}):()=>{},set:()=>true});
  const elements=Object.fromEntries(['game','map-layer','start','start-screen','load-note','guide','joystick','joystick-knob','game-shell','load-error'].map(k=>[k,new Element()]));
  elements['load-error'].hidden=true;
  Object.assign(elements['map-layer'],{complete:true,naturalWidth:1448,naturalHeight:1086,src:'map.webp'});
  const document=new Element();document.body=new Element();document.body.classList.add('scene-booting');
  document.currentScript={dataset:{}};document.getElementById=k=>elements[k];document.createElement=()=>new Element();
  const images=[];
  class Image extends Element {
    constructor(){super();this.complete=false;this.naturalWidth=0;this.naturalHeight=0;images.push(this);if(decodeMissing)this.decode=undefined;}
    set src(v){this.url=v;this._src=v;Promise.resolve(imageDelay?.promise).then(()=>{this.complete=true;this.naturalWidth=badImage?0:v.includes('lumiere')?2172:1536;this.naturalHeight=v.includes('lumiere')?724:512;this.emit(badImage?'error':'load');});}
    get src(){return this._src;}
    decode(){return decodeDelay?.promise || Promise.resolve();}
  }
  const window=new Element();window.devicePixelRatio=2;window.dispatchEvent=e=>{events.push(e.type);window.emit(e.type,e);};
  const sandbox={document,window,Image,URLSearchParams,CustomEvent:class {constructor(type,init){this.type=type;this.detail=init?.detail;}},location:{search:arrival?'?from=landing&navDebug=1':'?navDebug=1',href:''},performance:{now:()=>now},console:{error:e=>errors.push(e),warn(){},log(){}},requestAnimationFrame:f=>frames.push(f),setTimeout:(f,ms)=>{timers.set(++timerId,{f,ms});return timerId;},clearTimeout:id=>timers.delete(id),fetch:async url=>({ok:!badJson,json:async()=>url.includes('manifest')?manifest:collision})};
  Object.assign(window,{setTimeout:sandbox.setTimeout,clearTimeout:sandbox.clearTimeout});
  vm.createContext(sandbox);
  vm.runInContext([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1],sandbox);
  // Run the actual shared image helper, including its load/decode/fallback paths.
  vm.runInContext(scene.slice(scene.indexOf('async function waitImage'),scene.indexOf('// Event-only art')),sandbox);
  window.TarotSceneEffects={ready:sceneDelay?.promise || Promise.resolve(),waitImage:sandbox.waitImage,syncCamera(){},drawMaskedActor(ctx,actor,scale,dpr,draw){draw(ctx);},drawDebug(){}};
  const run=()=>{for(const file of ['navigation.js','blocked-collision.js','controls.js','game.js'])vm.runInContext(fs.readFileSync(file,'utf8'),sandbox,{filename:file});};
  const tick=async()=>{now+=16;frames.splice(0).forEach(f=>f(now));await flush();};
  return {run,tick,window,document,elements,images,draws,errors,events,timers,sandbox,ready:()=>document.body.classList.contains('scene-ready')};
}

test('cached arrival waits for final actor draw and two frames, without a fixed extra delay',async()=>{
  const h=harness();h.run();await flush();
  assert.equal(h.ready(),false);assert.equal(h.errors.length,0,h.errors.map(String).join("\n"));assert.ok(h.draws.length>0);
  assert.ok(h.events.includes('tarot-breaker:world-enter'));
  assert.ok(h.document.body.classList.contains('scene-rendered'));
  await h.tick();assert.equal(h.ready(),false);
  await h.tick();assert.equal(h.ready(),true);
  assert.ok(![...h.timers.values()].some(t=>t.ms===45000));
  assert.equal(h.errors.length,0);
});

test('uncached sprites and delayed decode stay covered even if scene canvases are ready first',async()=>{
  const imageDelay=deferred(),decodeDelay=deferred();const h=harness({imageDelay,decodeDelay});h.run();await flush();
  await h.tick();assert.equal(h.ready(),false);assert.equal(h.draws.length,0);
  imageDelay.resolve();await flush();await h.tick();assert.equal(h.ready(),false);assert.equal(h.draws.length,0);
  decodeDelay.resolve();await flush();await h.tick();await h.tick();assert.equal(h.ready(),true);
});

test('late scene/canvas dependency stays covered after sprites finish',async()=>{
  const sceneDelay=deferred();const h=harness({sceneDelay});h.run();await flush();await h.tick();
  assert.ok(h.images.every(i=>i.complete));assert.equal(h.ready(),false);assert.equal(h.draws.length,0);
  sceneDelay.resolve();await flush();await h.tick();await h.tick();assert.equal(h.ready(),true);
});

test('image failure and JSON failure enter the existing visible error state',async()=>{
  for(const options of [{badImage:true},{badJson:true}]){
    const h=harness(options);h.run();await flush();
    assert.ok(h.document.body.classList.contains('scene-load-error'));
    assert.equal(h.elements['load-error'].hidden,false);assert.equal(h.ready(),false);
    assert.ok(![...h.timers.values()].some(t=>t.ms===45000));
  }
});

test('stalled load times out and a late success cannot remove the error',async()=>{
  const sceneDelay=deferred();const h=harness({sceneDelay});h.run();await flush();
  [...h.timers.values()].find(t=>t.ms===45000).f();
  sceneDelay.resolve();await flush();await h.tick();await h.tick();
  assert.ok(h.document.body.classList.contains('scene-load-error'));
  assert.equal(h.elements['load-error'].hidden,false);assert.equal(h.ready(),false);assert.equal(h.draws.length,0);
});

test('load-only browser fallback and rejected Safari decode with a drawable image both complete',async()=>{
  for(const options of [{decodeMissing:true},{decodeDelay:{promise:Promise.reject(new Error('decode unavailable for loaded image'))}}]){
    const h=harness(options);h.run();await flush();await h.tick();await h.tick();
    assert.equal(h.ready(),true);assert.equal(h.errors.length,0);
  }
});

test('already failed image rejects immediately, and failed decode fallback propagates canvas errors',async()=>{
  const h=harness();
  await assert.rejects(h.sandbox.waitImage({complete:true,naturalWidth:0,src:'broken.webp'}));
  h.document.createElement=()=>({getContext:()=>({drawImage(){throw new Error('canvas failure');}})});
  await assert.rejects(h.sandbox.waitImage({complete:true,naturalWidth:10,src:'broken.webp',decode:async()=>{throw new Error('decode failure');}}),/canvas failure/);
});

test('normal TOUCH TO START still resets journey and opens the prologue, without an arrival timer',async()=>{
  const h=harness({arrival:false});let resets=0;h.window.TarotJourney={reset:()=>resets++};h.run();await flush();
  assert.equal(h.ready(),true);assert.equal(h.elements['start'].disabled,false);
  assert.equal(h.events.includes('tarot-breaker:world-enter'),false);
  h.elements.start.emit('click');assert.equal(resets,1);assert.equal(h.sandbox.location.href,'./alenon.html?from=title&build=6bc2a38e');
  assert.equal(h.timers.size,0);
});

test('first-paint cover is opaque and guards the parent composite; error removes the cover',()=>{
  const css=html.match(/<style id="garden-arrival-guard">([\s\S]*?)<\/style>/)[1];
  assert.ok(html.indexOf('garden-arrival-guard')<html.indexOf('<body'));
  assert.match(css,/scene-booting:not\(\.scene-rendered\) #game-shell \{ opacity:0;/);
  assert.match(css,/transition:opacity \.3s/);assert.doesNotMatch(css,/rgba|transparent/);
  assert.match(css,/scene-load-error::after \{ display:none;/);
  assert.match(html,/<link[^>]+data-layer-order="v6"/);assert.match(html,/<link[^>]+data-gate-polish="v2"/);
});

function sceneHarness({foregroundDelay,decodeDelay,badCanvas=false}={}) {
  const draws=[];const shell={dataset:{}};
  const ctx=new Proxy({}, {get:(_,name)=>(...args)=>{if(badCanvas)throw new Error('canvas failed');draws.push(name);},set:()=>true});
  const canvas={getContext:()=>ctx};
  const img={src:'map.webp',complete:true,naturalWidth:1448,closest:()=>null,decode:()=>decodeDelay?.promise||Promise.resolve()};
  const eventImage={...img,closest:()=>({}),decode:()=>new Promise(()=>{})};
  const layout={foregroundReady:foregroundDelay?.promise,paintBackground:()=>ctx.drawImage(),paintForeground:()=>ctx.drawImage(),splitCrystal:()=>ctx.drawImage(),removeLegacyGate(){}};
  const document={getElementById:id=>id==='game-shell'?shell:img,currentScript:{dataset:{}},
    querySelectorAll:s=>s.includes('.scene-world-layer img')?[img,eventImage]:s==='.scene-waterfall'?[{style:{},querySelector:s=>s==='img'?img:canvas}]:[],
    querySelector:s=>s.includes(' img')?img:canvas};
  const window={TarotSceneLayout:layout,addEventListener(){},dispatchEvent(){}};
  vm.runInNewContext(scene,{document,window,URLSearchParams,location:{search:'',pathname:'/'},fetch:async()=>({ok:true,json:async()=>({})}),CustomEvent:class{},console});
  return {ready:window.TarotSceneEffects.ready,shell,draws};
}

test('real scene readiness waits for foreground polygons and image decode before painting all scene canvases',async()=>{
  const foregroundDelay=deferred(),decodeDelay=deferred();const h=sceneHarness({foregroundDelay,decodeDelay});
  await flush();assert.equal(h.shell.dataset.sceneReady,undefined);assert.equal(h.draws.length,0);
  decodeDelay.resolve();await flush();assert.equal(h.draws.length,0);
  foregroundDelay.resolve();await h.ready;assert.equal(h.shell.dataset.sceneReady,'true');
  assert.equal(h.draws.length,4); // background, foreground, waterfall, crystal split
});

test('real scene rejects foreground and canvas failures instead of announcing readiness',async()=>{
  const foregroundDelay=deferred();const h=sceneHarness({foregroundDelay});foregroundDelay.reject(new Error('depth failed'));
  await assert.rejects(h.ready,/depth failed/);assert.equal(h.shell.dataset.sceneReady,undefined);
  const broken=sceneHarness({badCanvas:true});await assert.rejects(broken.ready,/canvas failed/);
  assert.equal(broken.shell.dataset.sceneReady,undefined);
});

test('PAD gate audio remains one play, fixed 1800ms transfer, 180ms fade, volume .45',()=>{
  const source=fs.readFileSync('star-country-landing.html','utf8');
  const fn=source.slice(source.indexOf('      function leaveForGarden()'),source.indexOf('      function setTarget(',source.indexOf('      function leaveForGarden()')));
  const audio={playCalls:0,volume:0,currentTime:0,pause(){this.paused=true;},play(){this.playCalls++;this.paused=false;return Promise.resolve();}};
  const timers=[],frames=[];const location={href:''};
  const scope={leaving:false,companion:{following:true},savedCompanion:{mode:'following'},clearTarget(){},keys:new Set(),document:{body:{classList:{add(){}}}},status:{style:{}},guide:{},starGateAudio:audio,performance:{now:()=>0},requestAnimationFrame:f=>frames.push(f),location,window:{setTimeout:(f,ms)=>timers.push({f,ms})}};
  vm.createContext(scope);vm.runInContext(fn+';leaveForGarden();leaveForGarden();',scope);
  assert.equal(audio.playCalls,1);assert.equal(audio.volume,.45);assert.notEqual(audio.loop,true);
  assert.deepEqual(timers.map(t=>t.ms),[1620,1800]);
  timers[0].f();frames.shift()(180);assert.equal(audio.paused,true);
  timers[1].f();assert.equal(location.href,'./index.html?from=landing');assert.equal(audio.playCalls,1);
});
