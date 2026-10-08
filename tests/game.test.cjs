// Execute the real scripts and event bindings with a deterministic DOM/canvas
// harness. Browser rendering and physical Safari are separate checks.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const collisionData = require('../assets/maps/star-country-gate-garden-collision.json');
const manifest = require('../assets/sprites/shion/shion_sprite_manifest.json');
const lumiereManifest = require('../assets/sprites/lumiere/lumiere_sprite_manifest.json');
const { gardenRuntime } = require('./helpers/garden-runtime.cjs');

async function boot({ width = 390, height = 844, spriteBase, shioponBase, lumiereBase, collisionUrl, badCollision = false,
  search = '?from=landing&navDebug=1', devTransit = null, dialogueState = null } = {}) {
  const rafQueue = []; let now = 1000;
  const { layout: sceneLayout, collision: runtimeCollision } = gardenRuntime();
  const drawDetails = []; const drawCalls = [], surfaceCalls = [], errors = [], captured = new Set(), inputTrace = [];
  class Element {
    constructor() { this.listeners = new Map(); this.style = {}; this.dataset = {}; this.hidden = false; }
    addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(fn); }
    emit(type, values = {}) {
      const event = { ...values, type, timeStamp: values.timeStamp ?? now, preventDefault() { this.defaultPrevented = true; } };
      for (const fn of this.listeners.get(type) || []) fn(event);
      if (type.startsWith('pointer')) inputTrace.push({ type, timeStamp: event.timeStamp, pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, captured: [...captured] });
      return event;
    }
    appendChild(child) { elements[child.id] = child; }
    getBoundingClientRect() { return { left: 34, top: 20, width, height }; }
    setPointerCapture(id) { captured.add(id); }
    hasPointerCapture(id) { return captured.has(id); }
    releasePointerCapture(id) { captured.delete(id); }
  }
  const elements = Object.fromEntries(['game', 'map-layer', 'start', 'start-screen', 'load-note', 'guide', 'joystick', 'joystick-knob', 'reset', 'game-shell', 'load-error'].map(id => [id, new Element()]));
  const contextState = {globalAlpha:1}, contextStack=[];
  const context = new Proxy(contextState, { get(target, key) {
    if (key === 'save') return () => contextStack.push({...target});
    if (key === 'restore') return () => Object.assign(target, contextStack.pop());
    if (key === 'globalAlpha') return target.globalAlpha;
    if (key === 'drawImage') return (...args) => {drawCalls.push(args);drawDetails.push({args,alpha:target.globalAlpha});};
    if (key === 'createRadialGradient') return () => ({ addColorStop() {} });
    return () => {};
  }, set(target,key,value) { target[key]=value;return true; } });
  elements.game.getContext = () => context;
  Object.assign(elements['map-layer'], { complete: true, naturalWidth: 1469, naturalHeight: 1071 });
  const document = new Element();
  document.body = new Element('body');
  const bodyClasses = new Set(['scene-booting']);
  document.body.classList = {
    contains(name) { return bodyClasses.has(name); },
    add(...names) { names.forEach(name => bodyClasses.add(name)); },
    remove(...names) { names.forEach(name => bodyClasses.delete(name)); },
  };
  document.currentScript = { dataset: { spriteBase, shioponBase, lumiereBase, collisionUrl } };
  document.getElementById = id => elements[id]; document.createElement = tag => {
    const element = new Element();
    if (tag === 'canvas') {
      element.url = 'cached_visual_effect';
      element.getContext = () => new Proxy({}, {
        get: (_, operation) => (...args) => {
          surfaceCalls.push({element, operation, args});
          if (operation === 'getImageData') return {data:new Uint8ClampedArray(element.width*element.height*4)};
          if (operation === 'createRadialGradient') return {addColorStop(){}};
        },
        set: () => true,
      });
    }
    return element;
  };
  const window = new Element(); window.devicePixelRatio = 3;
  window.dispatchEvent = event => window.emit(event.type, event);
  window.TarotSceneLayout = sceneLayout;
  if (devTransit) window.TarotGardenDevTransit = devTransit;
  if (dialogueState) window.TarotDialogue = {getState:()=>dialogueState};
  const journeyWrites=[];
  window.TarotJourney={set(...args){journeyWrites.push(args);}};
  window.TarotSceneEffects = {
    ready: Promise.resolve(),
    waitImage: async image => image,
    drawMaskedActor(_ctx, _actor, _scale, _density, draw) { draw(_ctx); },
    syncCamera() {},
    drawDebug() {},
  };
  class Image {
    naturalWidth = 1536; naturalHeight = 512;
    set src(src) {
      this.url = src;
      if (src.includes('lumiere_')) {
        const key = src.match(/lumiere_(idle|hover_down|hover_up|hover_left|hover_right|hover-back)\.webp$/)?.[1]?.replace('-', '_');
        const pose = lumiereManifest.poses[key];
        this.naturalWidth = pose.width;
        this.naturalHeight = pose.height;
      }
      queueMicrotask(() => this.onload?.());
    }
  }
  const fetched = [];
  const deterministicMath = Object.create(Math);
  deterministicMath.random = () => 0.5;
  const CustomEvent = class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
  window.CustomEvent = CustomEvent;
  const sandbox = vm.createContext({ window, document, Image, URLSearchParams, CustomEvent, location: { search },
    performance: { now: () => now }, requestAnimationFrame: fn => { rafQueue.push(fn); return rafQueue.length; }, setTimeout() { return 1; }, clearTimeout() {},
    fetch: async url => { fetched.push(url); return { ok: true, json: async () => url.includes('lumiere_sprite_manifest') ? lumiereManifest : url.includes('manifest') ? manifest : badCollision ? { ...collisionData, walkAreas: [] } : collisionData }; },
    Math: deterministicMath,
    console: { error: e => errors.push(e), warn() {}, log() {} } });
  for (const name of ['navigation.js', 'blocked-collision.js', 'controls.js']) vm.runInContext(fs.readFileSync(name, 'utf8'), sandbox, { filename: name });
  // Expose the exact Controls instance created by production game.js so tests can
  // distinguish input-state failures from render-time nav-status snapshots.
  const createControls = window.TarotControls.createControls;
  window.TarotControls.createControls = (...args) => {
    const instance = createControls(...args);
    window.__gardenControls = instance;
    return instance;
  };
  const gameSource = fs.readFileSync('game.js', 'utf8');
  const resetAnchor = '  function reset() {';
  assert.equal(gameSource.split(resetAnchor).length, 2);
  vm.runInContext(gameSource.replace('  const player = {','  const player = window.__gardenPlayer = {')
    .replace('  const lumiere = {','  const lumiere = window.__gardenLumiere = {')
    .replace('  function chooseShioponTarget() {','  window.__testGardenExit = {updatePlayer, arm(){gardenExitArmed=true;}};\n\n  function chooseShioponTarget() {')
    .replace(resetAnchor, '  window.__gardenReset = reset; window.__outlineMask = lumiereExteriorOutline;\n' + resetAnchor), sandbox, { filename: 'game.js' });
  for (let i = 0; i < 20 && !document.body.classList.contains('scene-ready'); i++) {
    await new Promise(setImmediate);
    now += 1000 / 60; rafQueue.splice(0).forEach(fn => fn(now));
  }
  if (!badCollision) assert.equal(document.body.classList.contains('scene-ready'), true, `Garden boot did not reach scene-ready; errors=${errors.map(String).join(' | ')}`);
  const tick = (frames = 1) => { for (let i = 0; i < frames; i++) { now += 1000 / 60; rafQueue.splice(0).forEach(fn => fn(now)); } };
  const state = () => JSON.parse(elements['nav-status'].dataset.state);

  const safeTarget = wanted => runtimeCollision.nearestWalkable(wanted) || wanted;
  const pointer = (type, x, y, extra = {}) => elements.game.emit(type, { pointerId: 1, clientX: 34 + x, clientY: 20 + y, button: 0, isPrimary: true, ...extra });
  const tapWorld = (x, y) => {
    const s = state(), sx = (x - s.origin.x) * s.camera.zoom, sy = (y - s.origin.y) * s.camera.zoom;
    const down = pointer('pointerdown', sx, sy);
    const afterDown = { ...state(), controls: { requested: window.__gardenControls?.state.requested, routeLength: window.__gardenControls?.state.route.length, suspended: window.__gardenControls?.state.suspended } };
    now += 80;
    const up = pointer('pointerup', sx, sy, { timeStamp: now });
    tick(); // nav-status is a render-time debug snapshot; refresh it after input mutation.
    const afterUp = { ...state(), controls: { requested: window.__gardenControls?.state.requested, routeLength: window.__gardenControls?.state.route.length, suspended: window.__gardenControls?.state.suspended } };
    return { sx, sy, down, up, afterDown, afterUp };
  };
  // Landing entry auto-starts the real Garden runtime. Do not click Start again:
  // a second begin() is intentionally ignored once running.
  tick(120);
  // The production game suppresses pointer input while dialogue is active.
  // This harness does not load the dialogue runtime, so provide its inactive contract.
  window.TarotDialogue ??= { getState: () => ({ active: false }) };
  return { lumiere: window.__gardenLumiere, elements, window, document, state, tick, tapWorld, pointer, fetched, errors, drawCalls, drawDetails, surfaceCalls, captured, safeTarget, inputTrace, controls: window.__gardenControls, collision: runtimeCollision, location:sandbox.location, journeyWrites };
}

test('390x844 boots with Shion + Shiopon + Lumiere, DPR cap, corrected spawn and actor sizes', async () => {
  const h = await boot(); const s = h.state();
  assert.equal(h.errors.length, 0); assert.equal(s.cssWidth, 390); assert.equal(s.cssHeight, 844);
  assert.equal(h.elements.game.width, 780); assert.equal(h.elements.game.height, 1688);
  assert.deepEqual(s.world, { w: 1448, h: 1086 });
  assert.deepEqual(s.scale, { x: 1, y: 1 });
  assert.equal(s.player.x, 724); assert.equal(s.player.y, 944);
  assert.equal(h.collision.isWalkable(s.player.x, s.player.y), true);
  assert.ok(Math.hypot(s.player.x - 724, s.player.y - 1015) <= 80);
  assert.ok(s.player.y < 960 - 8, 'Garden arrival clears the independently reviewed south exit');
  assert.equal(s.player.dir, 'up');
  assert.deepEqual(s.shiopon.homeRef,{x:810,y:800});
  assert.ok(h.collision.isWalkable(s.shiopon.homeRef.x, s.shiopon.homeRef.y));
  assert.ok(Math.hypot(s.shiopon.homeRef.x - 810, s.shiopon.homeRef.y - 800) <= 16);
  assert.equal(s.lumiere.homeRef.x, 810); assert.equal(s.lumiere.homeRef.y, 212);
  assert.equal(s.lumiere.moving, false); assert.equal(s.lumiereCollisionDistance, 32);
  assert.equal(s.actorCollisionDistance, 26); assert.ok(s.actorGap > s.actorCollisionDistance);
  const shionDraws = h.drawCalls.filter(call => call[0]?.url?.includes('shion_'));
  const shioponDraws = h.drawCalls.filter(call => call[0]?.url?.includes('shiopon_'));
  const lumiereDraws = h.drawCalls.filter(call => call[0]?.url?.includes('lumiere_'));
  assert.ok(shionDraws.length > 0); assert.ok(shionDraws.every(call => call[8] === 78));
  assert.ok(shioponDraws.length > 0); assert.ok(shioponDraws.every(call => call[8] === 76));
  assert.ok(shionDraws.length >= 12); assert.ok(shioponDraws.length >= 12);
  assert.ok(lumiereDraws.length > 0);
  for (const call of lumiereDraws) {
    const key=call[0].url.endsWith('lumiere_idle.webp')?'idle':'hover_down';
    const pose = lumiereManifest.poses[key];
    assert.ok(call[0].url.endsWith(`lumiere_${key}.webp`));
    assert.deepEqual(call.slice(1,5), [0,0,pose.width,pose.height]);
    assert.ok(Math.abs(call[8] * (pose.baseline_y - pose.body_top) / pose.height - 420*78/512) < 1e-6);
    assert.ok(Math.abs(call[7]/call[8] - pose.width/pose.height) < 1e-6);
  }

});
test('Garden direct Continue boots the real runtime at exact authored spawn with restored follower state',async()=>{
  const transit={ok:true,context:{mapId:'star_gate_garden',spawnId:'south_gate',companion:'joined_with_shion'},spawn:{x:724,y:944}};
  const h=await boot({search:'?dev=garden-resume-after-shiopon&navDebug=1',devTransit:transit,
    dialogueState:{active:false,joined:true}});
  const s=h.state();
  assert.equal(s.player.x,724);assert.equal(s.player.y,944);
  assert.equal(s.shiopon.following,true);
  assert.equal(h.collision.isWalkable(s.player.x,s.player.y),true);
  assert.equal(h.errors.length,0);
});
test('failed isolated Garden transit never falls back to production Journey or navigation',async()=>{
  const h=await boot({search:'?from=landing&dev=landing-resume-arrival&navDebug=1',
    devTransit:{ok:false,reason:'fixture-failure'},dialogueState:{active:false,joined:false}});
  h.window.__gardenPlayer.x=724;h.window.__gardenPlayer.y=1008;
  h.window.__testGardenExit.arm();
  h.controls.step=()=>({x:724,y:1012,moving:true,dx:0,dy:1});
  h.window.__testGardenExit.updatePlayer(.05);
  assert.equal(h.location.href,undefined);
  assert.equal(h.journeyWrites.length,0);
  assert.equal(h.controls.state.cancelReason,'dev-return-blocked');
  h.window.emit('keyup',{key:'s'});
});
test('Lumiere draws complete final poses and caches effects only at load', async () => {
  const h = await boot(); const generated=h.surfaceCalls.length;
  for (let i = 0; i < 420; i++) {
    const start = h.drawCalls.length;
    h.tick();
    const calls = h.drawCalls.slice(start).filter(call => call[0]?.url?.includes('lumiere_'));
    assert.ok(calls.length===1 || calls.length===2);
    assert.ok(/lumiere_(idle|hover_down)\.webp$/.test(calls[0][0].url));
    assert.deepEqual(calls[0].slice(1,5), [0,0,1254,1254]);
  }
  assert.equal(h.surfaceCalls.filter(c=>c.operation==='getImageData').length,6);
  assert.equal(h.surfaceCalls.length,generated,'no frame-time cache generation');
});
test('Lumiere preserves the smooth 2.4px / 5.2s bob without wing-frame cycling', async () => {
  const h = await boot(); const before = h.state().lumiere;
  let previous = before.bobOffsetY;
  const values=[];
  for (let i=0; i<624; i++) {
    h.tick(); const actor=h.state().lumiere; values.push(actor.bobOffsetY);
    assert.equal(actor.x,before.x); assert.equal(actor.y,before.y);
    assert.equal(actor.frame,0); assert.equal(actor.moving,false);
    assert.ok(Math.abs(actor.bobOffsetY)<=2.4);
    assert.ok(Math.abs(actor.bobOffsetY-previous)<0.05);
    previous=actor.bobOffsetY;
  }
  assert.ok(Math.max(...values)>2.39); assert.ok(Math.min(...values)<-2.39);
  for(let i=0;i<312;i++) assert.ok(Math.abs(values[i]-values[i+312])<1e-8);
});
test('Lumiere retains full sources, body scale and anchors in every direction and viewport', async () => {
  for (const [width,height] of [[390,844],[844,390]]) {
    const h=await boot({width,height});
    assert.ok(h.fetched.some(url=>url.endsWith('lumiere_sprite_manifest.json')));
    for(const dir of ['down','up','left','right']) {
      const point=h.state().lumiere;
      const delta={down:[0,10],up:[0,-10],left:[-10,0],right:[10,0]}[dir];
      await h.window.TarotStage.perform({type:'face',actor:'lumiere',target:{x:point.x+delta[0],y:point.y+delta[1]}}).promise;
      const start=h.drawCalls.length; h.tick();
      const actor=h.state().lumiere;
      const key=dir==='down'?(actor.bobRising?'idle':'hover_down'):dir==='up'?(actor.bobRising?'hover_back':'hover_up'):`hover_${dir}`;
      const pose=lumiereManifest.poses[key];
      const name=lumiereManifest.files[key];
      const call=h.drawCalls.slice(start).find(c=>c[0]?.url?.endsWith(name));
      assert.ok(call,`missing ${key}`);
      assert.deepEqual(call.slice(1,5),[0,0,pose.width,pose.height]);
      const ratio=call[8]/pose.height;
      assert.ok(Math.abs(call[7]/pose.width-ratio)<1e-8);
      assert.ok(Math.abs((pose.baseline_y-pose.body_top)*ratio-420*78/512)<1e-8);
      assert.ok(Math.abs(call[5]+pose.center_x*ratio-actor.x)<1e-8);
      assert.ok(Math.abs(call[6]+pose.baseline_y*ratio-(actor.y-2.7+actor.bobOffsetY))<1e-8);
    }
    const action=h.window.TarotStage.perform({type:'step',actor:'lumiere',direction:'down',distance:10,duration:1000});
    const start=h.drawCalls.length;h.tick();
    assert.equal(h.state().lumiere.moving,true);
    const expected=h.state().lumiere.bobRising?'lumiere_idle.webp':'lumiere_hover_down.webp';
    assert.ok(h.drawCalls.slice(start).some(c=>c[0]?.url?.endsWith(expected)));
    action.cancel();
  }
});
test('Lumiere front/back phase images follow velocity in both idle and stage movement', async () => {
  const h=await boot(); const phaseStep=2*Math.PI/(5.2*60);
  for (const moving of [false,true]) {
    for (const [dir,rising,expected] of [
      ['down',true,'idle'],['down',false,'hover_down'],
      ['up',true,'hover_back'],['up',false,'hover_up'],
      ['left',true,'hover_left'],['left',false,'hover_left'],
      ['right',true,'hover_right'],['right',false,'hover_right'],
    ]) {
      const delta={down:[0,10],up:[0,-10],left:[-10,0],right:[10,0]}[dir];
      let motion;
      if(moving) motion=h.window.TarotStage.perform({type:'step',actor:'lumiere',direction:dir,distance:10,duration:1000});
      else await h.window.TarotStage.perform({type:'face',actor:'lumiere',target:{x:h.lumiere.x+delta[0],y:h.lumiere.y+delta[1]}}).promise;
      h.lumiere.bobPhase=(rising?Math.PI:2*Math.PI)-phaseStep;
      h.tick(7); const start=h.drawCalls.length;h.tick();
      const actor=h.state().lumiere;
      assert.equal(actor.bobRising,rising);assert.equal(actor.moving,moving);
      const calls=h.drawCalls.slice(start).filter(c=>c[0]?.url?.includes('lumiere_'));
      assert.equal(calls.length,1);
      assert.ok(calls[0][0].url.endsWith(lumiereManifest.files[expected]));
      const pose=lumiereManifest.poses[expected], call=calls[0], ratio=call[8]/pose.height;
      assert.deepEqual(call.slice(1,5),[0,0,pose.width,pose.height]);
      assert.ok(Math.abs(ratio-call[7]/pose.width)<1e-8);
      assert.ok(Math.abs((pose.baseline_y-pose.body_top)*ratio-63.984375)<1e-8);
      assert.ok(Math.abs(call[5]+pose.center_x*ratio-actor.x)<1e-8);
      assert.ok(Math.abs(call[6]+pose.baseline_y*ratio-(actor.y-2.7+actor.bobOffsetY+actor.stageOffsetY))<1e-8);
      motion?.cancel();
    }
  }
});
test('Lumiere extrema retain the previous pose near zero speed, then switch once', async () => {
  const h=await boot();const step=2*Math.PI/(5.2*60);
  for (const [extremum,before,after] of [[Math.PI/2,false,true],[3*Math.PI/2,true,false]]) {
    for (const jitter of [-1e-8,0,1e-8]) {
      h.lumiere.bobPhase=extremum-step+jitter;h.lumiere.bobRising=before;h.tick();
      assert.equal(h.state().lumiere.bobRising,before);
    }
    h.tick(8);assert.equal(h.state().lumiere.bobRising,after);
    h.tick();assert.equal(h.state().lumiere.bobRising,after);
  }
  h.lumiere.bobPhase=0;h.lumiere.bobRising=false;
  const switches=[];let last=false;
  for(let i=1;i<=624;i++) {
    h.tick();const actor=h.state().lumiere;
    if(actor.bobRising!==last) {switches.push(i);last=actor.bobRising;}
    if(Math.abs(Math.cos(actor.bobPhase))>0.15) assert.equal(actor.bobRising,Math.cos(actor.bobPhase)<0);
  }
  assert.equal(switches.length,4);
  for(let i=1;i<switches.length;i++) assert.ok(Math.abs(switches[i]-switches[i-1]-156)<=1);
  h.window.__gardenReset();h.tick();assert.equal(h.state().lumiere.bobRising,false);
});
test('Lumiere has solid collision while remaining fixed at the gate', async () => {
  const h = await boot();
  for (const [x, y, frames] of [[880, 900, 180], [880, 650, 220], [860, 390, 260], [810, 212, 260]]) {
    h.tapWorld(x, y); h.tick(frames);
  }
  const s = h.state();
  assert.equal(s.reason, 'npc-blocked'); assert.equal(s.player.moving, false);
  assert.ok(s.lumiereGap >= s.lumiereCollisionDistance);
  assert.ok(s.lumiereGap < s.lumiereCollisionDistance + 8, `gap=${s.lumiereGap} reason=${s.reason}`);
  assert.equal(s.lumiere.x, 810); assert.equal(s.lumiere.y, 212);
});

test('Lumiere crossfade shares current body anchors and only interpolates opacity for 100ms', async () => {
  for (const dir of ['down','up']) {
    const h=await boot();
    h.lumiere.dir=dir;h.lumiere.bobPhase=0;h.tick(8);
    h.lumiere.bobPhase=Math.PI;h.tick();
    assert.ok(h.lumiere.previousPoseKey);
    h.lumiere.stageOffsetY=3.25;
    for(let frame=1;frame<=7;frame++) {
      const start=h.drawDetails.length;h.tick();
      const calls=h.drawDetails.slice(start).filter(c=>c.args[0]?.url?.includes('lumiere_'));
      if(frame===6) assert.ok(calls.length===1||calls.length===2);
      else assert.equal(calls.length,frame<6?2:1);
      assert.ok(Math.abs(calls.reduce((n,c)=>n+c.alpha,0)-1)<1e-8);
      for(const {args,alpha} of calls) {
        assert.ok(alpha>0&&alpha<=1);
        const key=args[0].url.match(/lumiere_(idle|hover_down|hover_up|hover-back)\.webp$/)[1].replace('-','_');
        const pose=lumiereManifest.poses[key], ratio=args[8]/pose.height;
        assert.ok(Math.abs(args[5]+pose.center_x*ratio-h.lumiere.x)<1e-8);
        assert.ok(Math.abs(args[6]+pose.baseline_y*ratio-(h.lumiere.y-2.7+h.lumiere.bobOffsetY+3.25))<1e-8);
        assert.ok(Math.abs((pose.baseline_y-pose.body_top)*ratio-63.984375)<1e-8);
      }
      const current=calls.at(-1);
      assert.ok(Math.abs(current.alpha-Math.min(1,frame/6))<1e-8);
    }
    h.lumiere.dir='left';const start=h.drawDetails.length;h.tick();
    const left=h.drawDetails.slice(start).filter(c=>c.args[0]?.url?.includes('lumiere_'));
    assert.equal(left.length,1);assert.equal(left[0].alpha,1);
    assert.ok(left[0].args[0].url.endsWith('hover_left.webp'));
    assert.equal(h.lumiere.previousPoseKey,null);
    h.window.__gardenReset();assert.equal(h.lumiere.previousPoseKey,null);
  }
});

test('Lumiere hysteresis holds both states inside the deadband and has independent comparison switches', async () => {
  const h=await boot(), step=2*Math.PI/(5.2*60);
  for(const rising of [false,true]) for(const velocity of [-.149,0,.149]) {
    h.lumiere.bobRising=rising;h.lumiere.bobPhase=Math.acos(velocity)-step;h.tick();
    assert.equal(h.lumiere.bobRising,rising);
  }
  for(const [velocity,rising] of [[-.151,true],[.151,false]]) {
    h.lumiere.bobPhase=Math.acos(velocity)-step;h.tick();assert.equal(h.lumiere.bobRising,rising);
  }
  const legacy=await boot({search:'?from=landing&navDebug=1&lumiereEffects=before'});
  legacy.lumiere.bobRising=false;legacy.lumiere.bobPhase=Math.acos(-.01)-step;legacy.tick();
  assert.equal(legacy.lumiere.bobRising,true);assert.equal(legacy.lumiere.previousPoseKey,null);
  assert.equal(legacy.surfaceCalls.length,0);
  const off=await boot({search:'?from=landing&navDebug=1&lumiereCrossfade=0&lumiereOutline=0&lumiereShadow=0'});
  off.lumiere.bobPhase=Math.PI;off.tick();assert.equal(off.lumiere.previousPoseKey,null);
  assert.equal(off.surfaceCalls.length,0);
});

test('Lumiere cached exterior mask leaves source alpha and enclosed holes untouched', async () => {
  const h=await boot(), width=9, pixels=new Uint8ClampedArray(9*9*4);
  // Hollow 5x5 ring: its central transparent area must not receive rim colour.
  for(let y=2;y<=6;y++)for(let x=2;x<=6;x++)if(x===2||x===6||y===2||y===6)pixels[(y*width+x)*4+3]=255;
  const rim=h.window.__outlineMask(pixels,9,9,1);
  assert.equal(rim[(4*width+4)*4+3],0);
  assert.equal(rim[(3*width+3)*4+3],0);
  assert.equal(rim[(2*width+2)*4+3],0);
  assert.ok(rim[(1*width+4)*4+3]>0);
  assert.deepEqual(Array.from(rim.slice((1*width+4)*4,(1*width+4)*4+3)),[55,48,94]);
  assert.equal(rim[(0*width+4)*4+3],0);
  assert.equal(pixels[(2*width+2)*4+3],255,'source remains intact');
});

test('Lumiere ground shadow stays at logical Y+5 through bob and stage visual offsets', async () => {
  const h=await boot(), generated=h.surfaceCalls.length;
  for(const phase of [0,Math.PI/2,Math.PI,3*Math.PI/2]) {
    h.lumiere.bobPhase=phase;h.lumiere.stageOffsetY=10;
    const start=h.drawCalls.length;h.tick();
    const shadow=h.drawCalls.slice(start).find(c=>c[0]?.width===80&&c[0]?.height===32);
    assert.ok(shadow);assert.equal(shadow[1],h.lumiere.x-20);
    assert.equal(shadow[2]+shadow[4]/2,h.lumiere.y+5);
  }
  assert.equal(h.surfaceCalls.length,generated);
});
test('Garden pointer payload is accepted by the production controls contract', async () => {
  const h = await boot();
  const controls = h.window.TarotControls.createControls(
    h.collision,
    h.window.TarotNavigation.createNavigator(
      h.collision,
      { cell: 16 },
    ),
  );
  const before = h.state();
  const p = h.safeTarget({ x: 810, y: 700 });
  const x = (p.x - before.origin.x) * before.camera.zoom;
  const y = (p.y - before.origin.y) * before.camera.zoom;
  const payload = { id: 1, x, y, time: 3000, width: before.cssWidth, primary: true, button: 0, world: { x: p.x, y: p.y } };
  assert.equal(controls.pointerDown(payload), true);
  assert.equal(controls.state.gesture.id, 1);
  const action = controls.pointerEnd({ id: 1, x, y, time: 3080, cancelled: false }, { x: before.player.x, y: before.player.y });
  assert.ok(action);
  assert.ok(controls.state.requested);
});

test('Garden registered pointerdown handler accepts the same browser-like event directly', async () => {
  const h = await boot();
  const handler = h.elements.game.listeners.get('pointerdown')?.[0];
  assert.equal(typeof handler, 'function');
  const before = h.state();
  const p = h.safeTarget({ x: 810, y: 700 });
  const x = (p.x - before.origin.x) * before.camera.zoom;
  const y = (p.y - before.origin.y) * before.camera.zoom;
  const event = {
    type: 'pointerdown',
    pointerId: 1,
    clientX: 34 + x,
    clientY: 20 + y,
    button: 0,
    isPrimary: true,
    timeStamp: 3000,
    preventDefault() { this.defaultPrevented = true; },
  };
  handler(event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(h.captured.has(1), true, 'registered game.js pointerdown handler rejected an otherwise valid pointer');
});

test('Garden registered pointerup handler completes the accepted gesture', async () => {
  const h = await boot();
  const downHandler = h.elements.game.listeners.get('pointerdown')?.[0];
  const upHandler = h.elements.game.listeners.get('pointerup')?.[0];
  assert.equal(typeof downHandler, 'function');
  assert.equal(typeof upHandler, 'function');
  const before = h.state();
  const p = h.safeTarget({ x: 810, y: 700 });
  const x = (p.x - before.origin.x) * before.camera.zoom;
  const y = (p.y - before.origin.y) * before.camera.zoom;
  const down = { type: 'pointerdown', pointerId: 1, clientX: 34 + x, clientY: 20 + y, button: 0, isPrimary: true, timeStamp: 3000, preventDefault() {} };
  downHandler(down);
  assert.equal(h.captured.has(1), true);
  assert.ok(h.controls.state.gesture, 'production Controls lost gesture immediately after pointerdown');
  const gesture = { ...h.controls.state.gesture, world: { ...h.controls.state.gesture.world } };
  const up = { type: 'pointerup', pointerId: 1, clientX: 34 + x, clientY: 20 + y, button: 0, isPrimary: true, timeStamp: 3080, preventDefault() {} };
  upHandler(up);
  const controlsAfterUp = {
    gesture: h.controls.state.gesture,
    requested: h.controls.state.requested,
    routeLength: h.controls.state.route.length,
    reason: h.controls.state.cancelReason,
    suspended: h.controls.state.suspended,
  };
  h.tick(); // controls state is exposed through nav-status during draw().
  const after = h.state();
  assert.ok(h.controls.state.requested, `production pointerEnd rejected gesture=${JSON.stringify(gesture)} after=${JSON.stringify(controlsAfterUp)} event=${JSON.stringify({pointerId:up.pointerId,timeStamp:up.timeStamp,type:up.type,clientX:up.clientX,clientY:up.clientY})}`);
  assert.equal(h.controls.state.requested.x, p.x);
  assert.equal(h.controls.state.requested.y, p.y);
  assert.equal(h.captured.size, 0);
});

test('canvas tap uses camera/zoom/element offset and does not jump the camera to the destination', async () => {
  const h = await boot(), before = h.state(); const p = { x: 790, y: 330 }; const trace = h.tapWorld(p.x, p.y); const after = h.state();
  assert.equal(trace.afterDown.suspended, false, `tap down suspended; before=${JSON.stringify(before)} down=${JSON.stringify(trace.afterDown)}`);
  assert.ok(trace.afterUp.controls.requested, `pointerup did not reach controls.tap; trace=${JSON.stringify({sx:trace.sx,sy:trace.sy,before,down:trace.afterDown,up:trace.afterUp,input:h.inputTrace})}`);
  assert.ok(h.controls.state.route.length); assert.ok(h.controls.state.requested); const expected = { x: 790, y: 330 }; assert.ok(Math.abs(h.controls.state.requested.x - expected.x) < 0.01); assert.ok(Math.abs(h.controls.state.requested.y - expected.y) < 0.01);
  assert.ok(Math.abs(after.camera.y - before.camera.y) < 8); h.tick(); assert.ok(h.state().player.moving);
  assert.equal(h.elements.joystick.hidden, true); assert.equal(h.captured.size, 0);
  h.tick(700); const arrived = h.state();
  assert.equal(arrived.route.length, 0); assert.equal(arrived.player.moving, false);
  assert.equal(arrived.reason, 'arrived');
  assert.ok(Math.hypot(arrived.player.x-p.x,arrived.player.y-p.y) < 8, 'tap must reach the selected destination within the production 8px arrival radius');
  const idleDirection = arrived.player.dir; h.tick(120); assert.equal(h.state().player.dir, idleDirection);
});
test('real drag/keyboard bindings cancel movement and production reset clears held input', async () => {
  const h = await boot(); (() => { const p = h.safeTarget({ x: 810, y: 700 }); h.tapWorld(p.x, p.y); })();
  h.pointer('pointerdown', 110, 600); h.pointer('pointermove', 135, 600); h.tick();
  assert.equal(h.controls.state.route.length, 0); assert.equal(h.controls.state.stick.active, true, `drag did not activate production stick; controls=${JSON.stringify({gesture:h.controls.state.gesture,stick:h.controls.state.stick,reason:h.controls.state.cancelReason})}`); assert.equal(h.elements.joystick.hidden, false);
  assert.doesNotMatch(fs.readFileSync('index.html', 'utf8'), /id="reset"/);
  h.window.emit('keydown', { key: 'w' });
  assert.equal(h.controls.state.keys.size, 1);
  h.window.__gardenReset(); h.tick();
  assert.equal(h.controls.state.stick.active, false);
  assert.equal(h.controls.state.keys.size, 0);
  assert.equal(h.controls.state.gesture, null);
  assert.equal(h.controls.state.route.length, 0);
  assert.equal(h.state().player.moving, false);
  assert.equal(h.collision.isWalkable(h.state().player.x, h.state().player.y), true);
  assert.equal(h.elements.joystick.hidden, true); assert.ok(h.state().collisionVersion >= 6);
  assert.ok(Number.isFinite(h.state().player.x)); assert.ok(Number.isFinite(h.state().player.y));
  assert.ok(h.collision.isWalkable(h.state().shiopon.homeRef.x, h.state().shiopon.homeRef.y));
  h.pointer('pointerup', 135, 600); (() => { const p = h.safeTarget({ x: 810, y: 700 }); h.tapWorld(p.x, p.y); })();
  h.window.emit('keydown', { key: 'w' }); h.tick(); assert.equal(h.state().route.length, 0);
  h.window.emit('keyup', { key: 'w' }); h.tick(); assert.equal(h.state().player.moving, false);
});
test('four directions use all four Shion walk frames then the matching idle frame', async () => {
  const h = await boot();
  // Independently reviewed 80px cardinal segments on current gate stairs.
  // Stage skip positions the actor exactly, without changing collision/input.
  for (const [key, dir, idleIndex, x, y, dx, dy] of [
    ['d', 'right', 3, 740, 330, 80, 0], ['w', 'up', 1, 810, 365, 0, -80],
    ['a', 'left', 2, 830, 330, -80, 0], ['s', 'down', 0, 810, 290, 0, 80],
  ]) {
    const center = { x, y };
    assert.ok(h.collision.segmentClear(center, { x: x + dx, y: y + dy }));
    h.window.emit('tarot-breaker:interaction-start');
    const position = h.window.TarotStage.perform({type:'move',actor:'shion',target:{x,y},duration:300});
    position.finish();await position.promise;h.tick();
    assert.equal(h.state().player.x,x);assert.equal(h.state().player.y,y);
    h.window.emit('tarot-breaker:interaction-end');
    const frames = new Set(); const drawStart = h.drawCalls.length; h.window.emit('keydown', { key });
    for (let i = 0; i < 25; i++) { h.tick(); frames.add(h.state().player.frame); assert.equal(h.state().player.dir, dir); assert.equal(h.state().player.moving, true); }
    assert.equal(frames.size, 4, JSON.stringify({dir, player:h.state().player}));
    const walkingCalls = h.drawCalls.slice(drawStart).filter(call => call[0]?.url?.endsWith(`shion_walk_${dir}.png`));
    assert.ok(walkingCalls.length > 0);
    h.window.emit('keyup', { key }); const idleStart = h.drawCalls.length; h.tick();
    assert.equal(h.state().player.dir, dir); assert.equal(h.state().player.moving, false);
    const idleCalls = h.drawCalls.slice(idleStart).filter(call => call[0]?.url?.endsWith('shion_idle.png'));
    assert.ok(idleCalls.length > 0); assert.equal(idleCalls.at(-1)[1], idleIndex * 384);
  }
});
test('pointercancel, lost capture, blur and hidden page prevent stuck movement', async () => {
  for (const event of ['pointercancel', 'lostpointercapture', 'blur', 'visibilitychange', 'pagehide']) {
    const h = await boot(); (() => { const p = h.safeTarget({ x: 810, y: 700 }); h.tapWorld(p.x, p.y); })(); h.pointer('pointerdown', 110, 600); h.pointer('pointermove', 150, 600);
    if (event.startsWith('pointer') || event === 'lostpointercapture') h.pointer(event, 150, 600);
    else if (event === 'visibilitychange') { h.document.hidden = true; h.document.emit(event); }
    else h.window.emit(event);
    h.tick(); assert.equal(h.state().route.length, 0); assert.equal(h.elements.joystick.hidden, true); assert.equal(h.state().player.moving, false);
  }
});
test('future interaction lifecycle cancels and suspends player movement', async () => {
  const h = await boot(); (() => { const p = h.safeTarget({ x: 810, y: 700 }); h.tapWorld(p.x, p.y); })(); h.window.emit('tarot-breaker:interaction-start'); h.tick();
  assert.equal(h.state().route.length, 0); assert.equal(h.state().suspended, true); assert.equal(h.state().shiopon.moving, false);
  h.tapWorld(810, 600); assert.equal(h.state().route.length, 0);
  h.window.emit('tarot-breaker:interaction-end'); (() => { const p = h.safeTarget({ x: 810, y: 700 }); h.tapWorld(p.x, p.y); })(); assert.ok(h.state().route.length);
});
test('stage commands face actors, animate safe steps and expose a skip-to-end handle', async () => {
  const h = await boot();
  h.window.emit('tarot-breaker:interaction-start');
  await h.window.TarotStage.perform({ type: 'face', actor: 'shiopon', target: 'flower' }).promise;
  h.tick();
  assert.equal(h.state().shiopon.dir, 'right');

  const lumiereDrawStart = h.drawCalls.length;
  await h.window.TarotStage.perform({ type: 'face', actor: 'lumiere', target: 'gate' }).promise;
  h.tick();
  assert.equal(h.state().lumiere.dir, 'up');
  assert.ok(
    h.drawCalls.slice(lumiereDrawStart).some(call =>
      call[0]?.url?.endsWith(h.state().lumiere.bobRising?'lumiere_hover-back.webp':'lumiere_hover_up.webp')),
  );

  const before = h.state().player;
  const step = h.window.TarotStage.perform({
    type: 'step', actor: 'shion', direction: 'up', distance: 12, duration: 300,
  });
  h.tick(3);
  assert.equal(h.state().stage.shion.kind, 'move');
  assert.equal(h.state().player.moving, true);
  step.finish();
  await step.promise;
  h.tick();
  const after = h.state();
  assert.equal(after.stage.shion, null);
  assert.equal(after.player.moving, false);
  assert.ok(Math.abs(after.player.y - (before.y - 12)) < 0.01);
  h.window.emit('tarot-breaker:interaction-end');
});
test('Shiopon bounce is visible mid-action and returns to its exact baseline', async () => {
  const h = await boot();
  h.window.emit('tarot-breaker:interaction-start');
  const bounce = h.window.TarotStage.perform({
    type: 'bounce', actor: 'shiopon', height: 7, duration: 320,
  });
  h.tick(6);
  assert.equal(h.state().stage.shiopon.kind, 'bounce');
  assert.ok(h.state().shiopon.stageOffsetY < -1);
  bounce.finish();
  await bounce.promise;
  h.tick();
  assert.equal(h.state().shiopon.stageOffsetY, 0);
  assert.equal(h.state().stage.shiopon, null);
  h.window.emit('tarot-breaker:interaction-end');
});
test('desktop click uses the same input at camera zoom 1.22', async () => {
  const h = await boot({ width: 1280, height: 900 }); (() => { const p = h.safeTarget({ x: 810, y: 700 }); h.tapWorld(p.x, p.y); })();
  assert.equal(h.state().camera.zoom, 1.22); const requested = h.controls.state.requested; const expected = h.safeTarget({ x: 810, y: 700 }); assert.ok(requested); assert.ok(Math.abs(requested.x - expected.x) < 0.01); assert.ok(Math.abs(requested.y - expected.y) < 0.01);
  assert.ok(h.controls.state.route.length);
});
test('preview asset configuration loads the same game and rejects invalid collision data', async () => {
  const h = await boot({ spriteBase: '/sprites/', collisionUrl: '/official-collision.json' });
  assert.ok(h.fetched.includes('/sprites/shion_sprite_manifest.json')); assert.ok(h.fetched.includes('/official-collision.json'));
  assert.equal(h.errors.length, 0);
  const bad = await boot({ badCollision: true }); assert.equal(bad.elements.start.disabled, true); assert.equal(bad.errors.length, 1);
});
