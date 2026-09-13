const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createCollision, createNavigator, validateCollision, distance } = require('../navigation.js');
const data = JSON.parse(fs.readFileSync('assets/maps/star-country-gate-garden-collision.json', 'utf8'));
const collision = createCollision(data), nav = createNavigator(collision);
const spawn = { x: 729, y: 1015 };
const rect = (x, y, w, h) => ({ type: 'poly', points: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]] });
const fixture = areas => ({ ...data, walkAreas: areas });

// Independent copy of the original ray-crossing rule, for dense route sampling.
function originalWalkable(p) {
  return data.walkAreas.some(area => {
    let inside = false;
    for (let i = 0, j = area.points.length - 1; i < area.points.length; j = i++) {
      const [xi, yi] = area.points[i], [xj, yj] = area.points[j];
      if ((yi > p.y) !== (yj > p.y) && p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  });
}
function checkRoute(result) {
  assert.ok(result, 'route exists');
  for (let i = 1; i < result.points.length; i++) {
    const a = result.points[i - 1], b = result.points[i];
    assert.ok(collision.segmentClear(a, b));
    const count = Math.ceil(distance(a, b) * 4);
    for (let j = 1; j < count; j++) {
      const p = { x: a.x + (b.x - a.x) * j / count, y: a.y + (b.y - a.y) * j / count };
      assert.ok(originalWalkable(p), `route leaves original JSON at ${JSON.stringify(p)}`);
    }
  }
}

test('official JSON parses: reference size, nonempty polygons and finite coordinates', () => {
  assert.equal(validateCollision(data).areas.length, 23);
  assert.ok(collision.isWalkable(spawn.x, spawn.y));
  assert.equal(nav.cellSize, 16);
});
test('invalid reference, empty areas, short polygon and NaN are rejected, not silently dropped', () => {
  for (const bad of [
    { ...data, referenceSize: { width: 100, height: 100 } }, fixture([]),
    fixture([{ type: 'poly', points: [[1, 2], [3, 4]] }]),
    fixture([rect(0, 0, 20, 20), { type: 'poly', points: [[0, 0], [10, NaN], [20, 20]] }])
  ]) assert.throws(() => createCollision(bad));
});
test('center path, both fountain sides and upper stairs remain connected', () => {
  for (const target of [{ x: 810, y: 800 }, { x: 570, y: 500 }, { x: 1030, y: 500 }, { x: 810, y: 350 }, { x: 810, y: 240 }]) {
    checkRoute(nav.findPath(spawn, target));
  }
});
test('fountain is not crossed; A* and smoothing route around it', () => {
  const a = { x: 810, y: 650 }, b = { x: 810, y: 410 };
  assert.equal(collision.segmentClear(a, b), false);
  const route = nav.findPath(a, b);
  assert.ok(route.points.length > 2);
  checkRoute(route);
});
test('flowerbed/fountain taps project to the nearest JSON boundary', () => {
  for (const point of [{ x: 680, y: 760 }, { x: 930, y: 760 }, { x: 810, y: 530 }]) {
    assert.equal(collision.isWalkable(point.x, point.y), false);
    const target = collision.nearestWalkable(point);
    assert.ok(collision.isWalkable(target.x, target.y));
    assert.ok(distance(target, point) > 0);
    assert.ok(nav.findPath(spawn, point));
  }
  const c = createCollision(fixture([rect(100, 100, 100, 100)]));
  assert.deepEqual(c.nearestWalkable({ x: 220, y: 155 }), { x: 200, y: 155 });
});
test('east passage is connected; invalid coordinates never crash', () => {
  assert.ok(collision.isWalkable(1190, 490));
  checkRoute(nav.findPath(spawn, { x: 1190, y: 490 }));
  assert.equal(nav.findPath(spawn, { x: NaN, y: 0 }), null);
  assert.equal(nav.findPath({ x: -1, y: -1 }, spawn), null);
  assert.doesNotThrow(() => nav.findPath(spawn, { x: -9999, y: 9999 }));
});
test('a sub-pixel gap and a diagonal blocked corner cannot be jumped', () => {
  const c = createCollision(fixture([rect(0, 0, 100, 100), rect(100.1, 0, 100, 100)]));
  assert.equal(c.segmentClear({ x: 99, y: 50 }, { x: 101, y: 50 }), false);
  assert.equal(createNavigator(c).findPath({ x: 50, y: 50 }, { x: 150, y: 50 }), null);
  const corner = createCollision(fixture([rect(0, 0, 100, 100), rect(100, 101, 100, 100)]));
  assert.equal(corner.segmentClear({ x: 90, y: 90 }, { x: 110, y: 110 }), false);
});
test('overlapping polygons and editor-compatible ellipse areas share continuous collision', () => {
  const c = createCollision(fixture([rect(0, 0, 100, 100), rect(90, 0, 100, 100)]));
  assert.ok(c.segmentClear({ x: 10, y: 50 }, { x: 180, y: 50 }));
  const e = createCollision(fixture([{ type: 'ellipse', cx: 400, cy: 400, rx: 80, ry: 40 }]));
  assert.ok(e.segmentClear({ x: 330, y: 400 }, { x: 470, y: 400 }));
  assert.equal(e.isWalkable(400, 450), false);
  const nearest = e.nearestWalkable({ x: 400, y: 460 });
  assert.ok(distance(nearest, { x: 400, y: 440 }) < 0.001);
});
test('updated editor polygons rebuild navigation without changing schema', () => {
  const separated = fixture([rect(20, 20, 80, 80), rect(180, 20, 80, 80)]);
  const from = { x: 50, y: 50 }, to = { x: 200, y: 50 };
  assert.equal(createNavigator(createCollision(separated)).findPath(from, to), null);
  separated.walkAreas.push(rect(90, 40, 100, 20));
  assert.ok(createNavigator(createCollision(separated)).findPath(from, to));
});
test('sampled routes stay inside the original polygons after smoothing', () => {
  let count = 0;
  for (let i = 3; i < nav.nodes.length; i += 19) {
    const result = nav.findPath(spawn, nav.nodes[i]);
    if (result) { checkRoute(result); count++; }
  }
  assert.ok(count >= 20);
});
