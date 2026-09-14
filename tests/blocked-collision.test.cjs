const test = require('node:test');
const assert = require('node:assert/strict');
const { createCollision, createNavigator, validateCollision } = require('../blocked-collision.js');

const rect = (x, y, w, h) => ({
  type: 'poly',
  points: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]],
});

const baseData = {
  version: 2,
  map: 'star-country-gate-garden',
  referenceSize: { width: 1448, height: 1086 },
  walkAreas: [rect(0, 0, 300, 220)],
  blockedAreas: [rect(120, 70, 60, 80)],
};

test('blockedAreas subtract from walkAreas including their boundary', () => {
  const collision = createCollision(baseData);
  assert.equal(collision.isWalkable(50, 50), true);
  assert.equal(collision.isWalkable(150, 100), false);
  assert.equal(collision.isWalkable(120, 100), false, 'blocked boundary is not walkable');
  assert.equal(collision.isWalkable(181, 100), true);
});

test('segmentClear and A* never cut through a blocked area', () => {
  const collision = createCollision(baseData);
  const nav = createNavigator(collision, 16);
  const start = { x: 40, y: 110 };
  const target = { x: 260, y: 110 };
  assert.equal(collision.segmentClear(start, target), false);
  const route = nav.findPath(start, target);
  assert.ok(route);
  assert.ok(route.points.length > 2);
  for (let i = 1; i < route.points.length; i++) {
    assert.equal(collision.segmentClear(route.points[i - 1], route.points[i]), true);
  }
});

test('tapping inside a blocked area projects to a nearby legal point', () => {
  const collision = createCollision(baseData);
  const requested = { x: 150, y: 110 };
  const target = collision.nearestWalkable(requested);
  assert.ok(target);
  assert.equal(collision.isWalkable(target.x, target.y), true);
  assert.ok(Math.hypot(target.x - requested.x, target.y - requested.y) > 0);
});

test('legacy collision JSON without blockedAreas remains compatible', () => {
  const legacy = { ...baseData };
  delete legacy.blockedAreas;
  legacy.version = 1;
  const collision = createCollision(legacy);
  assert.equal(collision.isWalkable(150, 100), true);
  assert.deepEqual(validateCollision(legacy).blockedAreas, []);
});

test('invalid blocked areas are rejected instead of silently ignored', () => {
  assert.throws(() => createCollision({ ...baseData, blockedAreas: {} }));
  assert.throws(() => createCollision({ ...baseData, blockedAreas: [{ type: 'poly', points: [[0, 0], [10, 10]] }] }));
});
