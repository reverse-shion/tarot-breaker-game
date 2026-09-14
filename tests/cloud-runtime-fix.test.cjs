const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const fountainCss = fs.readFileSync('fountain-polish.css', 'utf8');
const cloudCss = fs.readFileSync('cloud-motion-fix.css', 'utf8');

test('cloud runtime guard is loaded after the base cloud rules', () => {
  assert.match(fountainCss, /@import url\("\.\/cloud-motion-fix\.css\?v=1\.0\.0"\)/);
  assert.match(cloudCss, /cloud-runtime-scroll-left/);
  assert.match(cloudCss, /scene-cloud-far-track[\s\S]*?48s linear infinite/);
  assert.match(cloudCss, /scene-cloud-near-track[\s\S]*?24s linear infinite/);
  assert.match(cloudCss, /animation-play-state:\s*running\s*!important/);
});

test('near cloud is visibly stronger than far cloud without becoming dominant', () => {
  assert.match(cloudCss, /scene-cloud-far\s*\{[\s\S]*?opacity:\s*\.30\s*!important/);
  assert.match(cloudCss, /scene-cloud-near\s*\{[\s\S]*?opacity:\s*\.54\s*!important/);
  assert.match(cloudCss, /cloud-runtime-near-bob[\s\S]*?2\.5px[\s\S]*?scale\(1\.04\)/);
  assert.match(cloudCss, /scene-cloud-near \.scene-cloud-copy[\s\S]*?6\.4s ease-in-out infinite/);
});

test('reduced motion preserves readable one-way movement but removes bobbing', () => {
  assert.match(cloudCss, /prefers-reduced-motion:\s*reduce/);
  assert.match(cloudCss, /scene-cloud-far-track[\s\S]*?78s/);
  assert.match(cloudCss, /scene-cloud-near-track[\s\S]*?46s/);
  assert.doesNotMatch(cloudCss, /scene-cloud-far-track[\s\S]{0,180}?animation:\s*none/);
  assert.match(cloudCss, /scene-cloud-near \.scene-cloud-copy[\s\S]*?animation:\s*none/);
});
