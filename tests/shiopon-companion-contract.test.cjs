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

test('companion replans a collision-safe route and accelerates when Shion gets ahead', () => {
  assert.match(game, /function planShioponFollowRoute\(/);
  assert.match(game, /navigation\?\.findPath\(current, target\)/);
  assert.match(game, /SHIOPON_FOLLOW_REPLAN_INTERVAL\s*=\s*0\.18/);
  assert.match(game, /SHIOPON_FOLLOW_CATCHUP_SPEED\s*=\s*285/);
  assert.match(game, /SHIOPON_FOLLOW_SPRINT_SPEED\s*=\s*360/);
  assert.match(game, /playerGap\s*>\s*170/);
});

test('Shiopon faces Shion when the first conversation starts', () => {
  assert.match(dialogue, /tarot-breaker:shiopon-face-player/);
  assert.match(game, /function faceShioponTowardPlayer\(/);
  assert.match(game, /playerNow\.x\s*-\s*current\.x/);
  assert.match(game, /playerNow\.y\s*-\s*current\.y/);
});

test('race dialogue drives a real run, trip and recovery animation', () => {
  assert.match(dialogue, /tarot-breaker:shiopon-race-start/);
  assert.match(dialogue, /tarot-breaker:shiopon-trip/);
  assert.match(dialogue, /tarot-breaker:shiopon-recover/);
  assert.match(game, /function startShioponRace\(/);
  assert.match(game, /function updateShioponScript\(/);
  assert.match(game, /SHIOPON_RACE_SPEED\s*=\s*235/);
  assert.match(game, /SHIOPON_TRIP_ANGLE\s*=\s*Math\.PI\s*\*\s*0\.32/);
  assert.match(game, /rotation:\s*shiopon\.rotation/);
});

test('follow-mode draw order keeps Shiopon immediately below Shion', () => {
  assert.match(
    game,
    /shiopon\.following\s*&&\s*a\.actor\s*===\s*shiopon\s*\?\s*player\.y\s*-\s*0\.01/,
  );
});
