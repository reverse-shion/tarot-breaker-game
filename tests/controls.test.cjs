const test = require('node:test');
const assert = require('node:assert/strict');
const { createControls, stickVector } = require('../controls.js');
const { createCollision, createNavigator, distance } = require('../navigation.js');
const data = require('../assets/maps/star-country-gate-garden-collision.json');
const collision = createCollision(data), nav = createNavigator(collision);
const spawn = { x: 729, y: 1015 }, goal = { x: 810, y: 350 };
const down = (c, overrides = {}) => c.pointerDown({ id: 1, x: 100, y: 300, width: 390, time: 100, world: goal, ...overrides });

test('short tap starts navigation on release without showing the stick', () => {
  const c = createControls(collision, nav);
  down(c); assert.equal(c.state.stick.active, false); assert.equal(c.state.route.length, 0);
  const result = c.pointerEnd({ id: 1, x: 103, y: 300, time: 180 }, spawn);
  assert.ok(result.result); assert.ok(c.state.route.length); assert.equal(c.state.stick.active, false);
});
test('drag cancels immediately and cannot turn into a tap after returning to origin', () => {
  const c = createControls(collision, nav); c.tap(goal, spawn); down(c);
  c.pointerMove({ id: 1, x: 113, y: 300 });
  assert.equal(c.state.route.length, 0); assert.equal(c.state.stick.active, true);
  c.pointerMove({ id: 1, x: 100, y: 300 });
  assert.equal(c.pointerEnd({ id: 1, x: 100, y: 300, time: 190 }, spawn), null);
  assert.equal(c.state.stick.active, false);
});
test('right 32% accepts taps but cannot activate the stick', () => {
  const c = createControls(collision, nav); down(c, { x: 350 });
  c.pointerMove({ id: 1, x: 280, y: 300 });
  assert.equal(c.state.stick.active, false);
  assert.equal(c.pointerEnd({ id: 1, x: 350, y: 300, time: 190 }, spawn), null);
  down(c, { x: 350 });
  assert.ok(c.pointerEnd({ id: 1, x: 350, y: 300, time: 190 }, spawn).result);
});
test('long press, cancel, second finger and right mouse button do not create routes', () => {
  const c = createControls(collision, nav); down(c);
  assert.equal(down(c, { id: 2, primary: false }), false);
  assert.equal(c.pointerEnd({ id: 2, x: 100, y: 300, time: 150 }, spawn), null);
  assert.equal(c.pointerEnd({ id: 1, x: 100, y: 300, time: 500 }, spawn), null);
  down(c);
  c.pointerEnd({ id: 1, x: 100, y: 300, time: 150, cancelled: true }, spawn);
  assert.equal(c.state.route.length, 0); assert.equal(down(c, { button: 2 }), false);
});
test('all WASD/arrows cancel auto movement; unrelated keys do not', () => {
  const c = createControls(collision, nav);
  for (const key of ['w', 'A', 's', 'd', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']) {
    c.clearInput(); c.tap(goal, spawn); assert.equal(c.keyDown(key), true);
    assert.equal(c.state.route.length, 0); c.keyUp(key); assert.equal(c.state.keys.size, 0);
  }
  c.tap(goal, spawn); assert.equal(c.keyDown('Shift'), false); assert.ok(c.state.route.length);
});
test('new tap replaces the old route, including an unreachable new target', () => {
  const c = createControls(collision, nav); c.tap(goal, spawn);
  c.tap({ x: 800, y: 900 }, spawn); assert.deepEqual(c.state.target, { x: 800, y: 900 });
  c.tap({ x: 1190, y: 490 }, spawn); assert.equal(c.state.route.length, 0);
});
test('stick overrides keyboard; taps never queue underneath manual inputs', () => {
  const c = createControls(collision, nav), p = { x: 810, y: 800 };
  c.keyDown('w'); down(c); c.pointerMove({ id: 1, x: 164, y: 300 });
  const result = c.step(p, 1 / 60);
  assert.ok(result.x > p.x); assert.equal(result.y, p.y);
  assert.equal(c.tap(goal, p), null);
  c.pointerEnd({ id: 1, x: 164, y: 300, time: 200 }, p);
  assert.equal(c.tap(goal, p), null); c.keyUp('w'); assert.equal(c.state.route.length, 0);
});
test('15% deadzone and curved low-speed range allow precise movement', () => {
  assert.equal(stickVector(9, 0).x, 0);
  const low = stickVector(20, 0).x, medium = stickVector(40, 0).x, full = stickVector(64, 0).x;
  assert.ok(low > 0 && low < 0.15); assert.ok(medium > low && medium < 0.6); assert.equal(full, 1);
  assert.ok(Math.abs(Math.hypot(stickVector(100, 100).x, stickVector(100, 100).y) - 1) < 1e-9);
  const c = createControls(collision, nav); down(c); c.pointerMove({ id: 1, x: 120, y: 300 });
  assert.ok(c.step({ x: 810, y: 800 }, 1 / 60).moving);
});
test('route follower reaches stairs, never leaves collision, and stays still after arrival', () => {
  const c = createControls(collision, nav); c.tap(goal, spawn); let p = { ...spawn };
  for (let i = 0; i < 1500 && c.state.route.length; i++) {
    const next = c.step(p, i % 3 ? 1 / 60 : 1 / 30);
    assert.ok(collision.segmentClear(p, next)); assert.ok(distance(p, next) <= 155 / 30 + 1e-6); p = { x: next.x, y: next.y };
  }
  assert.equal(c.state.cancelReason, 'arrived'); assert.ok(distance(p, goal) <= 8);
  for (let i = 0; i < 120; i++) assert.equal(c.step(p, 1 / 60).moving, false);
});
test('manual movement cannot tunnel into the fountain even with a stalled frame', () => {
  const c = createControls(collision, nav); c.keyDown('w'); let p = { x: 810, y: 650 };
  for (let i = 0; i < 100; i++) {
    const next = c.step(p, 10); assert.ok(collision.segmentClear(p, next)); p = next;
  }
  assert.ok(p.y > 530); assert.equal(c.step(p, 10).moving, false);
});
test('reset/blur lifecycle clears keys, gestures and route; event hooks suspend until resumed', () => {
  const c = createControls(collision, nav); c.tap(goal, spawn); down(c); c.keyDown('w'); c.clearInput('reset');
  assert.equal(c.state.route.length, 0); assert.equal(c.state.keys.size, 0); assert.equal(c.state.gesture, null);
  c.tap(goal, spawn); c.suspend(); assert.equal(c.state.route.length, 0);
  assert.equal(c.tap(goal, spawn), null); assert.equal(c.keyDown('w'), false); assert.equal(down(c), false);
  assert.equal(c.step(spawn, 1 / 60).moving, false); c.resume(); assert.ok(c.tap(goal, spawn));
});
