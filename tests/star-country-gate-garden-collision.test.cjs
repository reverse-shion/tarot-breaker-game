const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createCollision, createNavigator } = require('../blocked-collision.js');

const data = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../assets/maps/star-country-gate-garden-collision.json'),
    'utf8',
  ),
);
const collision = createCollision(data);

test('official collision v5 preserves the latest six authored walk areas', () => {
  assert.equal(data.version, 5);
  assert.equal(data.walkAreas.length, 6);
  assert.equal(data.blockedAreas.length, 9);
  for (const area of [...data.walkAreas, ...data.blockedAreas]) {
    assert.equal(area.type, 'poly');
    assert.ok(Array.isArray(area.points));
    assert.ok(area.points.length >= 3);
    assert.ok(area.points.every((point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)));
  }
});

test('spawn and required character locations stay walkable', () => {
  assert.equal(collision.isWalkable(724, 1015), true, 'Shion spawn');
  assert.equal(collision.isWalkable(810, 800), true, 'Shiopon home');
  assert.equal(collision.isWalkable(810, 212), true, 'Lumiere home');
});

test('fountain, flowerbeds and far map edges remain blocked', () => {
  assert.equal(collision.isWalkable(810, 500), false, 'fountain center');
  assert.equal(collision.isWalkable(530, 560), false, 'west flowerbed');
  assert.equal(collision.isWalkable(1030, 560), false, 'east flowerbed');
  assert.equal(collision.isWalkable(300, 420), false, 'far west side');
  assert.equal(collision.isWalkable(1300, 500), false, 'far east side');
});

test('the intended paved route remains connected from spawn to the Star Gate', () => {
  assert.equal(collision.isWalkable(600, 520), true, 'west fountain-ring path');
  assert.equal(collision.isWalkable(1040, 520), true, 'east fountain-ring path');
  assert.equal(collision.isWalkable(810, 300), true, 'central gate stairs');

  const navigation = createNavigator(collision, 16);
  const route = navigation.findPath({ x: 724, y: 1015 }, { x: 810, y: 212 });
  assert.ok(route, 'spawn must have a route to the gate');
  assert.ok(route.points.length > 1);
});
