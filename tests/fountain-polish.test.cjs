const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('fountain-polish.css', 'utf8');
const cssRulesOnly = css.replace(/\/\*[\s\S]*?\*\//g, '');

test('fountain water is reduced, centered and seated farther into the basin', () => {
  const match = html.match(/class="scene-object scene-back scene-fountain-water"[\s\S]*?data-world-x="([^"]+)"[\s\S]*?data-world-y="([^"]+)"[\s\S]*?data-world-w="([^"]+)"[\s\S]*?data-world-h="([^"]+)"/);
  assert.ok(match, 'fountain water layer exists');
  const [, x, y, w, h] = match.map(Number);
  assert.equal(x, 650);
  assert.equal(y, 409);
  assert.equal(w, 300);
  assert.equal(h, 176);
  assert.equal(x + w / 2, 800);
  assert.ok(h < 205, 'water height is tighter than Preview 31');
  assert.match(css, /clip-path:\s*ellipse\(48% 43% at 50% 52%\)/);
});

test('crystal is moved farther toward the rear and detached ring is disabled', () => {
  const crystal = html.match(/class="scene-object scene-back scene-fountain-crystal"[\s\S]*?data-world-x="([^"]+)"[\s\S]*?data-world-y="([^"]+)"[\s\S]*?data-world-w="([^"]+)"[\s\S]*?data-world-h="([^"]+)"/);
  assert.ok(crystal, 'fountain crystal layer exists');
  const [, x, y, w, h] = crystal.map(Number);
  assert.equal(x, 708);
  assert.equal(y, 333);
  assert.equal(w, 184);
  assert.equal(h, 230);
  assert.match(html, /<canvas class="scene-crystal-ring"[^>]*hidden/);
  assert.match(html, /<canvas class="scene-crystal-core"/);
});

test('all always-on gate haze is removed around Lumiere', () => {
  assert.match(html, /class="scene-object scene-back scene-gate-inner-light"[\s\S]*?hidden/);
  assert.match(html, /class="scene-object scene-back scene-gate-particle"[\s\S]*?hidden/);
  assert.doesNotMatch(html, /class="scene-object scene-front scene-gate-particle"/);
});

test('fountain polish is isolated and does not modify collision or scene logic', () => {
  assert.match(html, /fountain-polish\.css\?v=1\.0\.0/);
  assert.doesNotMatch(cssRulesOnly, /collision|walkArea|blockedArea|navigation/i);
  assert.doesNotMatch(cssRulesOnly, /\.scene-cloud|\.scene-waterfall|\.scene-gate|#game/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
