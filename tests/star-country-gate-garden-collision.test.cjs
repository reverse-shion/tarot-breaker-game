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
const spawn = collision.nearestWalkable({ x: 724, y: 1015 });

test('official collision v6 preserves the current authored walk polygons', () => {
  assert.equal(data.version, 6);
  assert.equal(data.walkAreas.length, 17);
  assert.equal(data.blockedAreas.length, 0);
  for (const area of [...data.walkAreas, ...data.blockedAreas]) {
    assert.equal(area.type, 'poly');
    assert.ok(Array.isArray(area.points));
    assert.ok(area.points.length >= 3);
    assert.ok(area.points.every((point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)));
  }
});

test('resolved spawn, Shiopon and the Lumiere gate approach stay walkable', () => {
  assert.equal(collision.isWalkable(spawn.x, spawn.y), true, 'resolved Shion spawn');
  assert.equal(collision.isWalkable(810, 800), true, 'Shiopon home');
  assert.equal(collision.isWalkable(810, 240), true, 'Lumiere gate approach');
});

test('fountain centre and true off-route map space remain blocked', () => {
  assert.equal(collision.isWalkable(810, 500), false, 'fountain center');
  assert.equal(collision.isWalkable(450, 700), false, 'west off-route space');
  assert.equal(collision.isWalkable(1100, 700), false, 'east off-route space');
  assert.equal(collision.isWalkable(300, 500), false, 'far west off-route space');
  assert.equal(collision.isWalkable(1447, 500), false, 'far east edge');
});

test('the current authored route remains connected from resolved spawn to the Star Gate', () => {
  for (const point of [
    { x: 810, y: 800 },
    { x: 584, y: 556 },
    { x: 990, y: 537 },
    { x: 810, y: 350 },
    { x: 810, y: 240 },
  ]) assert.equal(collision.isWalkable(point.x, point.y), true, JSON.stringify(point));

  const navigation = createNavigator(collision, 16);
  const route = navigation.findPath(spawn, { x: 810, y: 240 });
  assert.ok(route, 'resolved spawn must have a route to the gate approach');
  assert.ok(route.points.length > 1);
});
