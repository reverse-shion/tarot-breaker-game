const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');
const source = fs.readFileSync('scene-preview41-fix.js', 'utf8');

function bootArtworkLayout() {
  const layers = {
    '.scene-ground': { hidden: false },
    '.scene-foreground': { hidden: false },
  };
  const layout = {
    referenceSize: { width: 1448, height: 1086 },
    foregroundOffset: { x: -15, y: 0 },
    occluders: [],
    solidBases: [],
    rect: (x, y, w, h) => ({
      type: 'poly',
      points: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]],
    }),
    contains: () => false,
  };
  const document = {
    querySelector: (selector) => layers[selector] || null,
    head: { appendChild() {} },
    createElement: tag => {
      assert.equal(tag, 'link', 'artwork must not create an edge-copy canvas');
      return { dataset: {} };
    },
  };
  const window = { TarotSceneLayout: layout };
  vm.runInNewContext(source, { window, document, Number, Math, Object });
  return { layout, layers };
}

function recordingContext() {
  const calls = [];
  return {
    calls,
    clearRect: (...args) => calls.push({ operation: 'clearRect', args }),
    drawImage: (...args) => calls.push({ operation: 'drawImage', args }),
  };
}

test('latest uploaded artwork URLs are cache-busted independently', () => {
  const islands = './assets/maps/star-country-world-islands.webp?asset=34856728cf2b';
  const foreground = './assets/maps/star-country-gate-garden-transparent.webp?v=cca8dd37b9';
  for (const url of [islands, foreground]) {
    assert.ok(html.includes(`href="${url}"`), 'official preload must match renderer');
    assert.ok(html.includes(`src="${url}"`), 'official renderer must use revised artwork');
  }
  assert.notEqual(new URL(islands, 'https://example.test').search, new URL(foreground, 'https://example.test').search);
  assert.match(html, /scene-preview41-fix\.js\?v=native-foreground-v7/);
  assert.match(html, /game\.js\?v=lumiere-hover-visual-v1-2/);
});

test('replacement islands fit completely inside the canonical scene', () => {
  const { layout, layers } = bootArtworkLayout();
  const context = recordingContext();
  const image = { naturalWidth: 1469, naturalHeight: 1071 };

  layout.paintBackground(context, image);

  const draws = context.calls.filter((call) => call.operation === 'drawImage');
  assert.equal(draws.length, 1);
  const [, x, y, width, height] = draws[0].args;
  assert.ok(Math.abs(x) < 1e-9);
  assert.equal(y, 0);
  assert.ok(Math.abs(width - 1448) < 1e-9);
  assert.ok(height < 1086 && height > 1055);
  assert.equal(layers['.scene-ground'].hidden, false);
  assert.equal(layers['.scene-foreground'].hidden, false);
});

test('native transparent foreground uses the canonical zero-origin scale and is drawn only once', () => {
  const { layout } = bootArtworkLayout();
  const context = recordingContext();
  const image = { naturalWidth: 1469, naturalHeight: 1071 };
  const raster = fs.readFileSync('assets/maps/star-country-gate-garden-transparent.webp');
  assert.equal(raster.toString('ascii',12,16),'VP8X');
  assert.ok(raster[20] & 0x10, 'official foreground must retain an alpha channel');
  assert.equal(1+raster.readUIntLE(24,3),1469);
  assert.equal(1+raster.readUIntLE(27,3),1071);

  layout.paintForeground(context, image);

  const draws = context.calls.filter((call) => call.operation === 'drawImage');
  assert.equal(draws.length, 1);
  const [, x, y, width, height] = draws[0].args;
  assert.equal(x, 0);
  assert.equal(y, 0);
  assert.equal(width, 1448);
  assert.equal(height, 1086);
  assert.equal(layout.artworkPlacement.foreground.mode, 'native-reference-1to1');
  assert.deepEqual(JSON.parse(JSON.stringify(layout.foregroundOffset)), { x: 0, y: 0 });
  assert.equal(layout.artworkModelVersion, 'native-foreground-v6');
});
