const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('scene-preview41-fix.js', 'utf8');

test('Star Gate uses full reference-space layers below the actor canvas', () => {
  assert.match(source, /mode: "reference-space-overlay"/);
  assert.match(source, /width: REFERENCE\.width/);
  assert.match(source, /height: REFERENCE\.height/);
  assert.match(source, /scene-world-layer scene-back scene-gate-composite/);
  assert.match(source, /game\.before\(layer\)/);
  assert.match(source, /actorLayer: "above-gate"/);
});

test('normal and event gate artwork use the approved asset stack', () => {
  assert.match(source, /star-country-gate-garden-star-gate-inner-light\.webp/);
  assert.match(source, /star-country-gate-garden-star-gate-event-fx\.webp/);
  assert.match(source, /star-country-gate-garden-star-gate-particle\.webp/);
  assert.match(source, /\[data-gate-state="event"\] \.scene-gate-normal/);
  assert.match(source, /\[data-gate-state="event"\] \.scene-gate-event-core/);
  assert.match(source, /\[data-gate-state="event"\] \.scene-gate-event-aura/);
});

test('baked and legacy Star Gate render paths are removed before recomposition', () => {
  assert.match(source, /erasePaintedGate\(ctx\)/);
  assert.match(source, /erasePaintedGate\(ctx, dx, dy\)/);
  assert.match(source, /\.scene-gate-base,\.scene-gate-inner-light,\.scene-gate-particle,\.scene-gate-event/);
  assert.match(source, /\.forEach\(\(node\) => node\.remove\(\)\)/);
});

test('Lumiere gate story bridges unstable to event visual state', () => {
  assert.match(source, /story\?\.eventId === "lumiereGate"/);
  assert.match(source, /dispatchGateState\("unstable"\)/);
  assert.match(source, /story\?\.lumiereDone \? "event" : "normal"/);
  assert.match(source, /starGateModelVersion = "preview-56-star-gate-composite"/);
});
