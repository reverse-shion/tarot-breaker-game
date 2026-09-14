const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'game.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'scene-effects.js'), 'utf8');

const requiredAssets = [
  'star-country-gate-garden-background.webp',
  'star-country-gate-garden-star-sky.webp',
  'star-country-gate-garden-cloud.webp',
  'star-country-gate-garden-waterfall.webp',
  'star-country-gate-garden-ground.webp',
  'star-country-gate-garden-foreground.webp',
  'star-country-gate-garden-fountain-base.webp',
  'star-country-gate-garden-fountain-crystal.webp',
  'star-country-gate-garden-fountain-crystal-glow.webp',
  'star-country-gate-garden-fountain-water.webp',
  'star-country-gate-garden-fountain-sparkle.webp',
  'star-country-gate-garden-star-gate-base.webp',
  'star-country-gate-garden-star-gate-inner-light.webp',
  'star-country-gate-garden-star-gate-particle.webp',
  'star-country-gate-garden-star-gate-event-fx.webp',
];

test('all official Star Gate Garden dynamic assets are wired into the scene', () => {
  for (const asset of requiredAssets) {
    assert.match(html, new RegExp(asset.replaceAll('.', '\\.')));
    assert.ok(fs.existsSync(path.join(root, 'assets', 'maps', asset)), `missing ${asset}`);
  }
});

test('scene controller exposes normal, unstable and event gate states', () => {
  assert.match(js, /TarotSceneEffects/);
  assert.match(js, /normal/);
  assert.match(js, /unstable/);
  assert.match(js, /event/);
  assert.match(js, /tarot-breaker:gate-state/);
});

test('actors remain between back scene layers and foreground FX', () => {
  assert.match(css, /#game\s*\{[^}]*z-index:\s*1/s);
  assert.match(css, /\.scene-front\s*\{[^}]*z-index:\s*2/s);
  assert.match(html, /scene-gate-base[\s\S]*<canvas id="game"[\s\S]*scene-foreground/);
});

test('fountain and environment motion contracts are present', () => {
  for (const keyframe of [
    'cloud-drift',
    'waterfall-flow',
    'fountain-crystal-float',
    'fountain-water-breathe',
    'fountain-glow-orbit',
    'gate-breathe',
  ]) {
    assert.match(css, new RegExp(`@keyframes\\s+${keyframe}`));
  }
  assert.match(css, /prefers-reduced-motion/);
});
