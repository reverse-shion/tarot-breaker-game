const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const css = fs.readFileSync('star-gate-anomaly.css', 'utf8');
const bootstrap = fs.readFileSync('stage3-dev-bootstrap.js', 'utf8');

function initialize(approved) {
  const inserted = [];
  const skyImage = { src: '' };
  const sky = { classList: { add() {} }, querySelector: () => skyImage };
  const normal = { classList: { add() {} } };
  const gate = { querySelector: () => normal, append() {} };
  const inner = {
    firstChild: {},
    querySelector: () => null,
    insertBefore: (node, before) => inserted.push({ node, before })
  };
  const shell = {
    querySelector: selector => selector === '.scene-farthest-sky' ? sky :
      selector === '.scene-star-gate' ? gate :
      selector === '.scene-gate-inner-light' ? inner : null,
    insertAdjacentHTML() {}
  };
  const document = {
    body: { dataset: {} },
    documentElement: { dataset: {} },
    getElementById: () => shell,
    createElement: tag => ({ tagName: tag, setAttribute(name, value) { this[name] = value; } }),
    write() {}
  };
  const window = { addEventListener() {} };
  const query = approved ? '?dev=star-gate-full' : '';
  vm.runInNewContext(bootstrap, { URLSearchParams, location: { search: query }, document, window });
  return { inserted, window };
}

test('only dev fixture mounts one invisible internal field beneath source image', () => {
  const disabled = initialize(false);
  const enabled = initialize(true);
  assert.equal(disabled.inserted.length, 0);
  assert.equal(enabled.inserted.length, 1);
  assert.equal(enabled.inserted[0].node.className, 'sga-corrupted-inner-field');
  assert.equal(enabled.inserted[0].node['aria-hidden'], 'true');
  assert.ok(enabled.inserted[0].before);
});

test('Normal interior, authored URL and map geometry remain unchanged', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /scene-gate-inner-light.*?star-country-gate-garden-star-gate-inner-light\.webp/);
  assert.match(css, /#game-shell \.scene-gate-inner-light \{ overflow: visible !important; clip-path: none !important; \}/);
  assert.doesNotMatch(css, /#game-shell\.sga-normal-flow [^\{]*sga-corrupted-inner-field/);
  assert.match(css, /#game-shell \.scene-gate-inner-light > \.sga-corrupted-inner-field\{[\s\S]*?opacity:0;[\s\S]*?visibility:hidden;/);
});

test('only final anomaly rest turns on shape-masked textured field', () => {
  assert.match(css, /#game-shell\.sga-anomaly-rest \.scene-gate-inner-light > \.sga-corrupted-inner-field\{\s*opacity:1!important;\s*visibility:visible!important;\s*animation:none!important;/);
  assert.match(css, /-webkit-mask-image:url\("\.\/assets\/maps\/star-country-gate-garden-star-gate-inner-light\.webp\?v=20260916-native-foreground-v6"\)/);
  assert.match(css, /mask-image:url\("\.\/assets\/maps\/star-country-gate-garden-star-gate-inner-light\.webp\?v=20260916-native-foreground-v6"\)/);
  assert.match(css, /repeating-conic-gradient/);
  assert.match(css, /radial-gradient/);
  assert.doesNotMatch(css, /sga-corrupted-inner-field[^}]*background:(?:#000|black|rgba\(0,\s*0,\s*0,\s*1\))/);
});

test('rest is a fixed fully opaque state; no breathing keyframes remain on it', () => {
  const tail = css.substring(css.lastIndexOf('#game-shell.sga-anomaly-rest .scene-gate-inner-light>img{'));
  assert.match(tail, /animation:none!important;/);
  assert.match(tail, /transition:none!important;/);
  assert.match(tail, /opacity:1!important;/);
  assert.match(tail, /filter:brightness\(\.18\) saturate\(1\.35\) hue-rotate\(28deg\) contrast\(1\.18\)!important;/);
  assert.doesNotMatch(css, /#game-shell\.sga-anomaly-rest \.scene-gate-inner-light > img\s*\{\s*animation:\s*sgaAnomalyBreathe/);
  const source = fs.readFileSync('star-gate-anomaly.js', 'utf8');
  assert.match(source, /cleanupGateState\(\{preserveGateAnomaly:/);
  assert.match(source, /if\(preserveFinal\)shell\.classList\.add\("sga-anomaly-rest"\)/);
});

test('Dark Energy is hidden at rest and anomaly outer gate stays active', () => {
  assert.match(css, /#game-shell\.sga-anomaly-rest \.scene-dark-energy-rise,\s*#game-shell\.sga-anomaly-rest \.scene-dark-energy-rise \*\{[\s\S]*?opacity:0!important;[\s\S]*?visibility:hidden!important;/);
  assert.match(css, /#game-shell\.sga-anomaly-rest \.scene-star-gate-normal\{[\s\S]*?opacity:0!important;/);
  assert.match(css, /#game-shell\.sga-anomaly-rest \.scene-star-gate-anomaly\{[\s\S]*?opacity:1!important;/);
});
