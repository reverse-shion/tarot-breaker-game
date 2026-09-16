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

function orientation(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function properIntersection(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

function isSimplePolygon(points) {
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    for (let j = i + 1; j < points.length; j++) {
      if (j === i || (j + 1) % points.length === i || (i + 1) % points.length === j) continue;
      const c = points[j];
      const d = points[(j + 1) % points.length];
      if (properIntersection(a, b, c, d)) return false;
    }
  }
  return true;
}

test('official collision v5 keeps only the authored central route, fountain plaza and gate stairs', () => {
  assert.equal(data.version, 5);
  assert.equal(data.walkAreas.length, 3);
  for (const area of data.walkAreas) {
    assert.equal(area.type, 'poly');
    assert.equal(isSimplePolygon(area.points), true, 'walk polygon must not self-intersect');
  }
});

test('spawn and required character locations stay walkable', () => {
  assert.equal(collision.isWalkable(724, 1015), true, 'Shion spawn');
  assert.equal(collision.isWalkable(810, 800), true, 'Shiopon home');
  assert.equal(collision.isWalkable(810, 212), true, 'Lumiere home');
});

test('fountain, flowerbeds and lateral map edges remain blocked', () => {
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
