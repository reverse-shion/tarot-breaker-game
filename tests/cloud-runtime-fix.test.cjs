const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const fountainCss = fs.readFileSync('fountain-polish.css', 'utf8');
const cloudCss = fs.readFileSync('cloud-motion-fix.css', 'utf8');

test('cloud runtime guard is loaded after the base cloud rules', () => {
  assert.match(fountainCss, /@import url\("\.\/cloud-motion-fix\.css\?v=1\.0\.0"\)/);
  assert.match(cloudCss, /cloud-runtime-scroll-left/);
  assert.match(cloudCss, /scene-cloud-far-track[\s\S]*?90s linear infinite/);
  assert.match(cloudCss, /scene-cloud-near-track[\s\S]*?54s linear infinite/);
  assert.match(cloudCss, /animation-play-state:\s*running\s*!important/);
});

test('reduced motion still preserves slow one-way cloud movement', () => {
  assert.match(cloudCss, /prefers-reduced-motion:\s*reduce/);
  assert.match(cloudCss, /scene-cloud-far-track[\s\S]*?150s/);
  assert.match(cloudCss, /scene-cloud-near-track[\s\S]*?96s/);
  assert.doesNotMatch(cloudCss, /scene-cloud-far-track[\s\S]{0,180}?animation:\s*none/);
  assert.match(cloudCss, /scene-cloud-near \.scene-cloud-copy[\s\S]*?animation:\s*none/);
});
