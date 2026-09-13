const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const game = fs.readFileSync('game.js', 'utf8');
const dialogue = fs.readFileSync('dialogue.js', 'utf8');
const dialogueCss = fs.readFileSync('dialogue.css', 'utf8');

test('Shiopon uses the original NPC as the single companion', () => {
  assert.match(game, /following:\s*false/);
  assert.match(game, /tarot-breaker:shiopon-follow-start/);
  assert.match(game, /tarot-breaker:shiopon-follow-stop/);
  assert.match(dialogue, /tarot-breaker:shiopon-follow-start/);
  assert.doesNotMatch(dialogue, /party-shiopon/);
  assert.doesNotMatch(dialogueCss, /party-shiopon/);
});

test('companion follows behind with a protected gap and does not block Shion', () => {
  assert.match(game, /SHIOPON_FOLLOW_DISTANCE\s*=\s*56/);
  assert.match(game, /SHIOPON_FOLLOW_MIN_GAP\s*=\s*44/);
  assert.match(game, /!shiopon\.following\s*&&\s*movingIntoActor/);
  assert.match(game, /function shioponFollowTarget\(/);
  assert.match(game, /function updateShioponFollow\(/);
});

test('follow-mode draw order keeps Shiopon immediately below Shion', () => {
  assert.match(
    game,
    /shiopon\.following\s*&&\s*a\.actor\s*===\s*shiopon\s*\?\s*player\.y\s*-\s*0\.01/,
  );
});
