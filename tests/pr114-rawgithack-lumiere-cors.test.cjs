// PR114 RawGitHack Lumiere Canvas CORS candidate
// This is a source-contract test, not a browser / iPhone CORS PASS.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('Lumiere images use anonymous CORS before src is assigned', () => {
  const code = fs.readFileSync(require('node:path').join(__dirname, '../game.js'), 'utf8');
  const start = code.indexOf('  function loadImage(src) {');
  const end = code.indexOf('\n  function waitForMap()', start);
  assert.ok(start >= 0 && end > start, 'loadImage function exists');
  const source = code.slice(start, end);
  assert.match(source, /Object\.values\(lumiereFiles\)\.includes\(src\)/);
  assert.match(source, /image\.crossOrigin\s*=\s*"anonymous"/);
  assert.ok(source.indexOf('image.crossOrigin') < source.indexOf('image.src = src'),
    'CORS must be configured before src');
  const images = {
    down: './assets/sprites/lumiere/lumiere_idle.webp',
  };
  const events = [];
  function Image() {
    const self = this;
    Object.defineProperty(self, 'crossOrigin', {set(value) {events.push(['crossOrigin', value]);}});
    Object.defineProperty(self, 'src', {set(value) {events.push(['src', value]);}});
  }
  const context = {Image, lumiereFiles: images, window: {TarotSceneEffects: {waitImage: () => true}}};
  vm.runInNewContext(source + '\nthis.loadImage = loadImage;', context);
  context.loadImage('./assets/sprites/lumiere/lumiere_idle.webp');
  assert.deepEqual(events, [
    ['crossOrigin','anonymous'],
    ['src','./assets/sprites/lumiere/lumiere_idle.webp'],
  ]);
  events.length = 0;
  context.loadImage('./assets/sprites/shion/shion_idle.png');
  assert.deepEqual(events, [['src','./assets/sprites/shion/shion_idle.png']]);
});
