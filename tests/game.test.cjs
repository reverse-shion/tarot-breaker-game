// Execute the real scripts and event bindings with a deterministic DOM/canvas
// harness. Browser rendering and physical Safari are separate checks.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const collisionData = require('../assets/maps/star-country-gate-garden-collision.json');
const collisionLib = require('../blocked-collision.js');
const manifest = require('../assets/sprites/shion/shion_sprite_manifest.json');
const sceneLayout = require('../scene-layout.js');

async function boot({ width = 390, height = 844, spriteBase, shioponBase, lumiereBase, collisionUrl, badCollision = false } = {}) {
  let raf, now = 1000;
  const drawCalls = [], surfaceCalls = [], errors = [], captured = new Set(), inputTrace = [];
  class Element {
    constructor() { this.listeners = new Map(); this.style = {}; this.dataset = {}; this.hidden = false; }
    addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(fn); }
    emit(type, values = {}) {
      const event = { type, timeStamp: now, ...values, preventDefault() { this.defaultPrevented = true; } };
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
  const context = new Proxy({}, { get(_, key) {
    if (key === 'drawImage') return (...args) => drawCalls.push(args);
    if (key === 'createRadialGradient') return () => ({ addColorStop() {} });
    return () => {};
  }, set() { return true; } });
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
      element.url = 'lumiere_composite';
      element.getContext = () => new Proxy({}, {
        get: (_, operation) => (...args) => surfaceCalls.push({ element, operation, args }),
        set: () => true,
      });
    }
    return element;
  };
  const window = new Element(); window.devicePixelRatio = 3;
  window.dispatchEvent = event => window.emit(event.type, event);
  window.TarotSceneLayout = sceneLayout;
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
        this.naturalWidth = 2172;
        this.naturalHeight = 724;
      }
      queueMicrotask(() => this.onload?.());
    }
  }
  const fetched = [];
  const deterministicMath = Object.create(Math);
  deterministicMath.random = () => 0.5;
  const CustomEvent = class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
  window.CustomEvent = CustomEvent;
  const sandbox = vm.createContext({ window, document, Image, URLSearchParams, CustomEvent, location: { search: '?from=landing&navDebug=1' },
    performance: { now: () => now }, requestAnimationFrame: fn => { raf = fn; }, setTimeout() { return 1; }, clearTimeout() {},
    fetch: async url => { fetched.push(url); return { ok: true, json: async () => url.includes('manifest') ? manifest : badCollision ? { ...collisionData, walkAreas: [] } : collisionData }; },
    Math: deterministicMath,
    console: { error: e => errors.push(e), warn() {}, log() {} } });
  for (const name of ['navigation.js', 'blocked-collision.js', 'controls.js', 'game.js']) vm.runInContext(fs.readFileSync(name, 'utf8'), sandbox, { filename: name });
  for (let i = 0; i < 20 && !document.body.classList.contains('scene-ready'); i++) {
    await new Promise(setImmediate);
    if (raf) { now += 1000 / 60; const fn = raf; raf = null; fn(now); }
  }
  if (!badCollision) assert.equal(document.body.classList.contains('scene-ready'), true, `Garden boot did not reach scene-ready; errors=${errors.map(String).join(' | ')}`);
  const tick = (frames = 1) => { for (let i = 0; i < frames; i++) { now += 1000 / 60; const fn = raf; if (fn) fn(now); } };
  const state = () => JSON.parse(elements['nav-status'].dataset.state);
  const runtimeCollision = collisionLib.createCollision({ ...collisionData, blockedAreas: [...(collisionData.blockedAreas || []), ...sceneLayout.solidBases] });
  const safeTarget = wanted => runtimeCollision.nearestWalkable(wanted) || wanted;
  const pointer = (type, x, y, extra = {}) => elements.game.emit(type, { pointerId: 1, clientX: 34 + x, clientY: 20 + y, button: 0, isPrimary: true, ...extra });
  const tapWorld = (x, y) => {
    const s = state(), sx = (x - s.origin.x) * s.camera.zoom, sy = (y - s.origin.y) * s.camera.zoom;
    const down = pointer('pointerdown', sx, sy);
    const afterDown = state();
    now += 80;
    const up = pointer('pointerup', sx, sy, { timeStamp: now });
    const afterUp = state();
    return { sx, sy, down, up, afterDown, afterUp };
  };
  // Landing entry auto-starts the real Garden runtime. Do not click Start again:
  // a second begin() is intentionally ignored once running.
  tick(120);
  // The production game suppresses pointer input while dialogue is active.
  // This harness does not load the dialogue runtime, so provide its inactive contract.
  window.TarotDialogue ??= { getState: () => ({ active: false }) };
  return { elements, window, document, state, tick, tapWorld, pointer, fetched, errors, drawCalls, surfaceCalls, captured, safeTarget, inputTrace };
}

test('390x844 boots with Shion + Shiopon + Lumiere, DPR cap, corrected spawn and actor sizes', async () => {
  const h = await boot(); const s = h.state();
  assert.equal(h.errors.length, 0); assert.equal(s.cssWidth, 390); assert.equal(s.cssHeight, 844);
  assert.equal(h.elements.game.width, 780); assert.equal(h.elements.game.height, 1688);
  assert.deepEqual(s.world, { w: 1448, h: 1086 });
  assert.deepEqual(s.scale, { x: 1, y: 1 });
  assert.equal(s.player.x, 724); assert.equal(s.player.y, 1015); assert.equal(s.player.dir, 'up');
  assert.equal(s.shiopon.homeRef.x, 810); assert.equal(s.shiopon.homeRef.y, 800);
  assert.equal(s.lumiere.homeRef.x, 810); assert.equal(s.lumiere.homeRef.y, 212);
  assert.equal(s.lumiere.moving, false); assert.equal(s.lumiereCollisionDistance, 32);
  assert.equal(s.actorCollisionDistance, 26); assert.ok(s.actorGap > s.actorCollisionDistance);
  const shionDraws = h.drawCalls.filter(call => call[0]?.url?.includes('shion_'));
  const shioponDraws = h.drawCalls.filter(call => call[0]?.url?.includes('shiopon_'));
  const lumiereDraws = h.drawCalls.filter(call => call[0]?.url?.includes('lumiere_'));
  const lumiereMotionDraws = lumiereDraws;
  const lumiereCoreDraws = h.surfaceCalls.filter(call => call.operation === 'drawImage' && call.args[3] === 243);
  assert.ok(shionDraws.length > 0); assert.ok(shionDraws.every(call => call[8] === 78));
  assert.ok(shioponDraws.length > 0); assert.ok(shioponDraws.every(call => call[8] === 76));
  assert.ok(shionDraws.length >= 12); assert.ok(shioponDraws.length >= 12);
  assert.ok(lumiereMotionDraws.length > 0); assert.ok(lumiereCoreDraws.length > 0);
  assert.ok(lumiereMotionDraws.every(call => call[3] === 493));
  assert.ok(lumiereMotionDraws.every(call => call[4] === 596));
  assert.ok(lumiereMotionDraws.every(call => Math.abs(call[8] - (596 * 78) / 724) < 1e-6));
});
test('Lumiere replaces the old torso once and draws one cached silhouette per tick', async () => {
  const h = await boot();
  for (let i = 0; i < 420; i++) {
    const start = h.drawCalls.length;
    h.tick();
    const calls = h.drawCalls.slice(start).filter(call => call[0]?.url?.includes('lumiere_'));
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0].url, 'lumiere_composite');
  }
  const surfaces = new Set(h.surfaceCalls.map(call => call.element));
  assert.equal(surfaces.size, 4);
  for (const surface of surfaces) {
    const ops = h.surfaceCalls.filter(call => call.element === surface);
    assert.deepEqual(ops.map(call => call.operation), ['drawImage', 'clearRect', 'drawImage']);
    assert.deepEqual(ops[1].args, [129, 32, 243, 564]);
  }
});
test('Lumiere bobs as one body while slow wing frames change independently', async () => {
  const h = await boot(); const before = h.state().lumiere; h.tick(37); const after = h.state().lumiere;
  assert.equal(after.x, before.x); assert.equal(after.y, before.y);
  assert.deepEqual(after.homeRef, { x: 810, y: 212 }); assert.equal(after.moving, false);
  assert.notEqual(after.frame, before.frame);
  assert.notEqual(after.bobOffsetY, before.bobOffsetY);
  assert.ok(Math.abs(after.bobOffsetY) <= 2.4);
  assert.ok(after.wingHold >= 0.7 && after.wingHold <= 1.35);
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
test('Garden pointer payload is accepted by the production controls contract', async () => {
  const h = await boot();
  const controls = h.window.TarotControls.createControls(
    collisionLib.createCollision({ ...collisionData, blockedAreas: [...(collisionData.blockedAreas || []), ...sceneLayout.solidBases] }),
    h.window.TarotNavigation.createNavigator(
      collisionLib.createCollision({ ...collisionData, blockedAreas: [...(collisionData.blockedAreas || []), ...sceneLayout.solidBases] }),
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

test('canvas tap uses camera/zoom/element offset and does not jump the camera to the destination', async () => {
  const h = await boot(), before = h.state(); const p = h.safeTarget({ x: 810, y: 700 }); const trace = h.tapWorld(p.x, p.y); const after = h.state();
  assert.equal(trace.afterDown.suspended, false, `tap down suspended; before=${JSON.stringify(before)} down=${JSON.stringify(trace.afterDown)}`);
  assert.ok(trace.afterUp.requested, `pointerup did not reach controls.tap; trace=${JSON.stringify({sx:trace.sx,sy:trace.sy,before,down:trace.afterDown,up:trace.afterUp,input:h.inputTrace})}`);
  assert.ok(after.route.length); assert.ok(after.requested); const expected = h.safeTarget({ x: 810, y: 700 }); assert.ok(Math.abs(after.requested.x - expected.x) < 0.01); assert.ok(Math.abs(after.requested.y - expected.y) < 0.01);
  assert.ok(Math.abs(after.camera.y - before.camera.y) < 8); assert.ok(after.player.moving);
  assert.equal(h.elements.joystick.hidden, true); assert.equal(h.captured.size, 0);
  h.tick(350); const arrived = h.state();
  assert.equal(arrived.route.length, 0); assert.equal(arrived.player.moving, false);
  const idleDirection = arrived.player.dir; h.tick(120); assert.equal(h.state().player.dir, idleDirection);
});
test('real event bindings: drag/keyboard/reset cancel and reset clears held stick', async () => {
  const h = await boot(); (() => { const p = h.safeTarget({ x: 810, y: 700 }); h.tapWorld(p.x, p.y); })();
  h.pointer('pointerdown', 110, 600); h.pointer('pointermove', 135, 600); h.tick();
  assert.equal(h.state().route.length, 0); assert.equal(h.elements.joystick.hidden, false);
  h.elements.reset.emit('pointerdown'); h.elements.reset.emit('click'); h.tick();
  assert.equal(h.elements.joystick.hidden, true); assert.ok(h.state().collisionVersion >= 6);
  assert.ok(Number.isFinite(h.state().player.x)); assert.ok(Number.isFinite(h.state().player.y));
  assert.equal(h.state().shiopon.homeRef.x, 810); assert.equal(h.state().shiopon.homeRef.y, 800);
  h.pointer('pointerup', 135, 600); (() => { const p = h.safeTarget({ x: 810, y: 700 }); h.tapWorld(p.x, p.y); })();
  h.window.emit('keydown', { key: 'w' }); h.tick(); assert.equal(h.state().route.length, 0);
  h.window.emit('keyup', { key: 'w' }); h.tick(); assert.equal(h.state().player.moving, false);
});
test('four directions use all four Shion walk frames then the matching idle frame', async () => {
  const h = await boot(); (() => { const p = h.safeTarget({ x: 810, y: 700 }); h.tapWorld(p.x, p.y); })(); h.tick(250);
  for (const [key, dir, idleIndex] of [['d', 'right', 3], ['w', 'up', 1], ['a', 'left', 2], ['s', 'down', 0]]) {
    (() => { const p = h.safeTarget({ x: 810, y: 700 }); h.tapWorld(p.x, p.y); })(); h.tick(200);
    const frames = new Set(); const drawStart = h.drawCalls.length; h.window.emit('keydown', { key });
    for (let i = 0; i < 25; i++) { h.tick(); frames.add(h.state().player.frame); assert.equal(h.state().player.dir, dir); }
    assert.equal(frames.size, 4);
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

  const lumiereDrawStart = h.surfaceCalls.length;
  await h.window.TarotStage.perform({ type: 'face', actor: 'lumiere', target: 'gate' }).promise;
  h.tick();
  assert.equal(h.state().lumiere.dir, 'up');
  assert.ok(
    h.surfaceCalls.slice(lumiereDrawStart).some(call =>
      call.operation === 'drawImage' && call.args[0]?.url?.endsWith('lumiere_hover_up.png')),
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
  assert.equal(h.state().camera.zoom, 1.22); const requested = h.state().requested; const expected = h.safeTarget({ x: 810, y: 700 }); assert.ok(requested); assert.ok(Math.abs(requested.x - expected.x) < 0.01); assert.ok(Math.abs(requested.y - expected.y) < 0.01);
  assert.ok(h.state().route.length);
});
test('preview asset configuration loads the same game and rejects invalid collision data', async () => {
  const h = await boot({ spriteBase: '/sprites/', collisionUrl: '/official-collision.json' });
  assert.ok(h.fetched.includes('/sprites/shion_sprite_manifest.json')); assert.ok(h.fetched.includes('/official-collision.json'));
  assert.equal(h.errors.length, 0);
  const bad = await boot({ badCollision: true }); assert.equal(bad.elements.start.disabled, true); assert.equal(bad.errors.length, 1);
});
