'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
test('Caritas battle stage uses the approved Shion and Shioriel transparent WebP portraits', () => {
  const css = fs.readFileSync(path.join(root, 'caritas-battle-event.css'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'hoshisuna-main.html'), 'utf8');
  const actors = [
    ['.cb-shion-sprite', 'shion.webp', 'shion-battle.webp'],
    ['.cb-angel', 'shioriel.webp', 'shioriel-battle.webp']
  ];
  for (const [selector, filename, oldFilename] of actors) {
    const imagePath = './assets/battle/character/' + filename;
    const declaration = "background: url('" + imagePath + "') center bottom / contain no-repeat;";
    assert.ok(css.includes('#caritas-event ' + selector), 'battle actor selector remains: ' + selector);
    assert.ok(css.includes(declaration), 'new approved WebP is displayed: ' + filename);
    assert.ok(!css.includes("battle/" + oldFilename), 'old battle illustration is not referenced: ' + oldFilename);
    const image = fs.readFileSync(path.join(root, imagePath));
    assert.equal(image.toString('ascii', 0, 4), 'RIFF', filename + ' RIFF header');
    assert.equal(image.toString('ascii', 8, 12), 'WEBP', filename + ' WebP header');
  }
  assert.match(html, /caritas-battle-event\.css\?v=main-dialogue-choice-v17&reactions=1&art=20261104/);
  assert.match(css, /right: 2%;\s*bottom: 6\.2%;\s*width: 19%;\s*height: 26%;/);
  assert.match(css, /right: 17%;\s*bottom: 6%;\s*width: 25%;\s*height: 35%;/);
});
