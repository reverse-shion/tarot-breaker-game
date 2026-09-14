const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const fountainCss = fs.readFileSync('fountain-polish.css', 'utf8');
const cloudCss = fs.readFileSync('cloud-motion-fix.css', 'utf8');

test('cloud stylesheet is loaded directly and fountain CSS stays isolated', () => {
  const fountain = html.indexOf('./fountain-polish.css?v=1.0.0');
  const cloud = html.indexOf('./cloud-motion-fix.css?v=1.4.0');
  assert.ok(fountain >= 0 && cloud > fountain, 'cloud CSS must load after fountain polish');
  assert.doesNotMatch(fountainCss, /cloud-motion-fix\.css/);
});

test('Preview 38 uses exactly one duplicated dedicated cloud track', () => {
  const mainLayers = html.match(/scene-cloud-main/g) || [];
  const copies = html.match(/class="scene-cloud-copy"/g) || [];
  const worldCloudCopies = html.match(/star-country-world-clouds\.webp/g) || [];

  assert.ok(mainLayers.length >= 2, 'main cloud layer and track should both be present');
  assert.equal(copies.length, 2, 'the single cloud track must contain exactly two copies');
  assert.equal(worldCloudCopies.length, 2, 'both cloud copies must use the dedicated cloud artwork');
  assert.match(html, /id="map-layer"[\s\S]*?star-country-world-islands\.webp/);
  assert.doesNotMatch(html, /star-country-gate-garden-cloud\.webp/);
  assert.doesNotMatch(html, /scene-cloud-far/);
  assert.doesNotMatch(html, /scene-cloud-near/);
});

test('cloud artwork scrolls left continuously behind the islands at world scale', () => {
  assert.match(cloudCss, /@keyframes cloud-main-scroll-left[\s\S]*?translate3d\(-50%,\s*0,\s*0\)/);
  assert.match(cloudCss, /\.scene-cloud-main[\s\S]*?z-index:\s*-1\s*!important/);
  assert.match(cloudCss, /scene-cloud-main-track[\s\S]*?64s linear infinite/);
  assert.match(cloudCss, /scene-cloud-main-track[\s\S]*?animation-play-state:\s*running\s*!important/);
  assert.match(cloudCss, /scene-cloud-main-track[\s\S]*?width:\s*200%/);
  assert.match(cloudCss, /scene-cloud-main-track > \.scene-cloud-copy[\s\S]*?flex:\s*0 0 calc\(50% \+ 3px\)/);
});

test('cloud edges are softened instead of reading as a hard cutout', () => {
  assert.match(cloudCss, /mix-blend-mode:\s*screen/);
  assert.match(cloudCss, /blur\(\.55px\)/);
  assert.match(cloudCss, /drop-shadow\(0 0 12px/);
  assert.match(cloudCss, /margin-right:\s*-3px/);
});

test('reduced motion keeps the same one-way scroll at a gentler speed', () => {
  assert.match(cloudCss, /prefers-reduced-motion:\s*reduce/);
  assert.match(cloudCss, /scene-cloud-main-track[\s\S]*?112s/);
  assert.doesNotMatch(cloudCss, /scene-cloud-main-track[\s\S]{0,220}?animation:\s*none/);
});
