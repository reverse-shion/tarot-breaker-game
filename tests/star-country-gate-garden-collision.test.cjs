const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createNavigator } = require('../blocked-collision.js');

const data = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../assets/maps/star-country-gate-garden-collision.json'),
    'utf8',
  ),
);
const { gardenRuntime } = require('./helpers/garden-runtime.cjs');
const { collision, layout } = gardenRuntime();

test('official collision v6 preserves the seventeen authored walk areas', () => {
  assert.equal(data.version, 6);
  assert.equal(data.map, 'star-country-gate-garden');
  assert.deepEqual(data.referenceSize, { width: 1448, height: 1086 });
  assert.equal(data.walkAreas.length, 17);
  assert.equal(data.blockedAreas.length, 0);
  for (const area of [...data.walkAreas, ...data.blockedAreas]) {
    assert.equal(area.type, 'poly');
    assert.ok(Array.isArray(area.points));
    assert.ok(area.points.length >= 3);
    assert.ok(area.points.every((point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)));
  }
});

test('spawn, Shiopon and the Lumiere gate approach stay walkable', () => {
  assert.equal(collision.isWalkable(724, 1015), false, 'old raw spawn is outside current authored pavement');
  assert.equal(collision.isWalkable(724, 960), true, 'reviewed projected entrance');
  assert.equal(collision.isWalkable(724, 944), true, 'reviewed Landing arrival spawn');
  assert.ok(Math.hypot(724 - 724, 944 - 1015) <= 80);
  assert.ok(collision.segmentClear({x:724,y:944}, {x:724,y:960}));
  assert.equal(collision.isWalkable(810, 800), true, 'Shiopon home');
  assert.equal(collision.isWalkable(810, 240), true, 'Lumiere gate approach');
});

test('fountain, flowerbeds and far map edges remain blocked', () => {
  assert.equal(collision.isWalkable(800, 533), false, 'fountain center');
  assert.equal(collision.isWalkable(650, 700), false, 'west flowerbed');
  assert.equal(collision.isWalkable(920, 700), false, 'east flowerbed');
  assert.equal(collision.isWalkable(-1, 420), false, 'far west side');
  assert.equal(collision.isWalkable(1449, 500), false, 'far east side');
  assert.equal(collision.isWalkable(724, -1), false, 'north exterior');
  assert.equal(collision.isWalkable(724, 1087), false, 'south exterior');
  assert.equal(collision.segmentClear({x:800,y:620},{x:800,y:440}), false, 'manual movement cannot cross the solid fountain');
  assert.ok(layout.solidBases.length > 0);
  for (const base of layout.solidBases) {
    const point = base.type === 'ellipse' ? {x:base.cx,y:base.cy} : {x:(base.points[0][0]+base.points[2][0])/2,y:(base.points[0][1]+base.points[2][1])/2};
    assert.equal(collision.isWalkable(point.x, point.y), false, 'every placed object base remains solid');
  }
});

test('the intended paved route remains connected from spawn to the Star Gate', () => {
  assert.equal(collision.isWalkable(570, 500), true, 'west fountain-ring path');
  assert.equal(collision.isWalkable(1040, 520), true, 'east fountain-ring path');
  assert.equal(collision.isWalkable(810, 300), true, 'central gate stairs');

  const navigation = createNavigator(collision, 16);
  const waypoints = [{x:724,y:944}, {x:570,y:500}, {x:810,y:300}, {x:810,y:240}];
  for (let i = 1; i < waypoints.length; i++) {
    const route = navigation.findPath(waypoints[i-1], waypoints[i]);
    assert.ok(route, 'paved route must connect reviewed waypoints');
    assert.ok(route.points.length > 1);
    assert.deepEqual(route.target, waypoints[i]);
    for (let j = 1; j < route.points.length; j++) {
      assert.ok(collision.segmentClear(route.points[j-1],route.points[j]), 'navigation cannot shortcut through obstacles');
      for (let sample = 0; sample <= 10; sample++) {
        const t = sample / 10, a = route.points[j-1], b = route.points[j];
        assert.equal(collision.isWalkable(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t), true);
      }
    }
  }
});
