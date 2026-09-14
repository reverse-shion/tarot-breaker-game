const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const fountainCss = fs.readFileSync('fountain-polish.css', 'utf8');
const cloudCss = fs.readFileSync('cloud-motion-fix.css', 'utf8');

test('cloud runtime stylesheet is loaded directly after fountain polish', () => {
  const fountain = html.indexOf('./fountain-polish.css?v=1.0.0');
  const cloud = html.indexOf('./cloud-motion-fix.css?v=1.1.0');
  assert.ok(fountain >= 0 && cloud > fountain, 'cloud CSS must load directly after fountain polish');
  assert.doesNotMatch(fountainCss, /cloud-motion-fix\.css/);
  assert.match(cloudCss, /cloud-runtime-scroll-left/);
  assert.match(cloudCss, /animation-play-state:\s*running\s*!important/);
});

test('Preview 35 clouds use calm two-depth leftward drift', () => {
  assert.match(cloudCss, /scene-cloud-far-track[\s\S]*?150s linear infinite/);
  assert.match(cloudCss, /scene-cloud-near-track[\s\S]*?82s linear infinite/);
  assert.match(cloudCss, /scene-cloud-far\s*\{[\s\S]*?opacity:\s*\.16\s*!important/);
  assert.match(cloudCss, /scene-cloud-near\s*\{[\s\S]*?opacity:\s*\.30\s*!important/);
  assert.match(cloudCss, /scene-cloud-near \.scene-cloud-copy[\s\S]*?scale\(1\.035\)/);
  assert.doesNotMatch(cloudCss, /cloud-runtime-near-bob/);
  assert.doesNotMatch(cloudCss, /ease-in-out infinite/);
});

test('reduced motion keeps one-way drift but makes it slower and quieter', () => {
  assert.match(cloudCss, /prefers-reduced-motion:\s*reduce/);
  assert.match(cloudCss, /scene-cloud-far-track[\s\S]*?220s/);
  assert.match(cloudCss, /scene-cloud-near-track[\s\S]*?130s/);
  assert.doesNotMatch(cloudCss, /scene-cloud-far-track[\s\S]{0,180}?animation:\s*none/);
  assert.doesNotMatch(cloudCss, /scene-cloud-near-track[\s\S]{0,180}?animation:\s*none/);
});
