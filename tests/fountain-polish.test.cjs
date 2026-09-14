const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('fountain-polish.css', 'utf8');
const cssRulesOnly = css.replace(/\/\*[\s\S]*?\*\//g, '');

test('fountain water is reduced and centered inside the basin', () => {
  const match = html.match(/class="scene-object scene-back scene-fountain-water"[\s\S]*?data-world-x="([^"]+)"[\s\S]*?data-world-y="([^"]+)"[\s\S]*?data-world-w="([^"]+)"[\s\S]*?data-world-h="([^"]+)"/);
  assert.ok(match, 'fountain water layer exists');
  const [, x, y, w, h] = match.map(Number);
  assert.equal(x, 650);
  assert.equal(y, 419);
  assert.equal(w, 300);
  assert.equal(h, 176);
  assert.equal(x + w / 2, 800);
  assert.ok(h < 205, 'water height is tighter than Preview 31');
  assert.match(css, /clip-path:\s*ellipse\(48% 43% at 50% 52%\)/);
});

test('crystal ring is rendered behind the reconstructed crystal core', () => {
  const ring = html.indexOf('<canvas class="scene-crystal-ring"');
  const core = html.indexOf('<canvas class="scene-crystal-core"');
  assert.ok(ring >= 0 && core >= 0, 'ring and core canvases exist');
  assert.ok(ring < core, 'ring canvas is before core canvas in paint order');
  assert.match(css, /\.scene-crystal-ring\s*\{[\s\S]*?z-index:\s*0/);
  assert.match(css, /\.scene-crystal-core\s*\{[\s\S]*?z-index:\s*1/);
});

test('fountain polish is isolated and does not modify collision or scene logic', () => {
  assert.match(html, /fountain-polish\.css\?v=1\.0\.0/);
  assert.doesNotMatch(cssRulesOnly, /collision|walkArea|blockedArea|navigation/i);
  assert.doesNotMatch(cssRulesOnly, /\.scene-cloud|\.scene-waterfall|\.scene-gate|#game/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
