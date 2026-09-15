const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const skyCss = fs.readFileSync('sky-atmosphere.css', 'utf8');

test('Preview 38 mounts a dedicated far-sky plate below all moving atmosphere', () => {
  assert.match(html, /scene-farthest-sky[\s\S]*?star-country-farthest-sky-background\.webp/);
  assert.match(html, /scene-star-sky[\s\S]*?star-country-gate-garden-star-sky\.webp/);
  assert.match(html, /scene-sun-light/);
  assert.ok(
    html.indexOf('scene-farthest-sky') < html.indexOf('scene-star-sky') &&
    html.indexOf('scene-star-sky') < html.indexOf('scene-cloud-main'),
    'sky, nebula and cloud layers should be ordered from farthest to nearest'
  );
});

test('the farthest sky itself has no authored animation', () => {
  assert.match(skyCss, /\.scene-farthest-sky[\s\S]*?z-index:\s*-4/);
  assert.match(skyCss, /\.scene-farthest-sky > img[\s\S]*?animation:\s*none\s*!important/);
  assert.match(skyCss, /\.scene-farthest-sky > img[\s\S]*?transform:\s*none\s*!important/);
});

test('nebula and stars shimmer with only sub-percent drift', () => {
  assert.match(skyCss, /star-country-nebula-drift\s+42s/);
  assert.match(skyCss, /translate3d\(-\.22%,\s*-\.12%,\s*0\)/);
  assert.match(skyCss, /translate3d\(\.22%,\s*\.16%,\s*0\)/);
  assert.match(skyCss, /star-country-twinkle\s+6\.8s/);
});

test('sun enhancement is fixed to world geometry and uses layered bloom', () => {
  assert.match(html, /scene-sun-light[\s\S]*?data-world-x="100"[\s\S]*?data-world-y="130"/);
  assert.match(skyCss, /radial-gradient\(circle/);
  assert.match(skyCss, /star-country-sun-bloom\s+7\.5s/);
  assert.match(skyCss, /linear-gradient\(90deg/);
});
