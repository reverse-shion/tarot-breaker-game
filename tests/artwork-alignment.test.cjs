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
    createElement: (tag) => {
      if (tag !== 'link') throw new Error('replacement artwork must not create an edge-copy canvas');
      return { dataset: {} };
    },
    head: { appendChild() {} },
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
  assert.match(html, /star-country-world-islands\.webp\?asset=34856728cf2b/);
  assert.match(html, /star-country-gate-garden-foreground\.webp\?v=bffada4ffedbc317/);
  assert.match(html, /scene-preview41-fix\.js\?v=1\.5\.0/);
  assert.match(html, /game\.js\?v=1\.5\.0/);
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

test('replacement foreground restores authored scale, keeps the approved +4px nudge and is drawn only once', () => {
  const { layout } = bootArtworkLayout();
  const context = recordingContext();
  const image = { naturalWidth: 1672, naturalHeight: 941 };

  layout.paintForeground(context, image);

  const draws = context.calls.filter((call) => call.operation === 'drawImage');
  assert.equal(draws.length, 1);
  const [, x, y, width, height] = draws[0].args;
  assert.equal(x, 0);
  assert.equal(y, 0);
  assert.equal(width, 1448);
  assert.equal(height, 1086);
  assert.equal(layout.artworkPlacement.foreground.repeat, false);
  assert.equal(layout.artworkModelVersion, 'foreground-native-reference-1to1');
});
