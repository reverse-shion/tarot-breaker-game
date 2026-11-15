const { test } = require('node:test');
const assert = require('node:assert/strict');
const { newBattle, mood, isValidWriting, applyTurn, resolveStatus, finishBattle } = require('../caritas-first-turn-preview.js');

const writing = '待ってる';
const claws = '爪';
const mouth = '口元';
const patience = '忍耐';
const courage = '勇気';
const hope = '希望';
const healing = '癒し';
const wish = '願い';

function turn(battle, moon, strength, star, message = null) {
  return applyTurn(battle, { moon, strength, star, writing: message });
}

function gauges(state) {
  return [state.dark, state.maintenance, state.resonance];
}

function values(last) {
  const { dark, maintenance, preset, written } = last.row;
  return [dark, maintenance, preset, written];
}

const firstRows = [
  [claws, patience, hope,    [-14, -6, 8, 32], 'ask-path', 'notice'],
  [claws, patience, healing, [-9, -2, 8, 32], null, 'notice'],
  [claws, patience, wish,    [-7, -4, 12, 36], null, 'hesitate'],
  [claws, courage, hope,     [8, -20, 0, 3], 'distance', 'guarded'],
  [claws, courage, healing, [-16, -14, 18, 42], null, 'notice'],
  [claws, courage, wish,    [-15, -14, 22, 46], null, 'notice'],
  [mouth, patience, hope,   [-12, -6, 8, 32], null, 'notice'],
  [mouth, patience, healing, [-8, -2, 8, 32], null, 'hesitate'],
  [mouth, patience, wish,   [-7, -4, 12, 36], 'ask-fear', 'hesitate'],
  [mouth, courage, hope,    [-20, -14, 18, 42], null, 'hesitate'],
  [mouth, courage, healing,  [8, -20, 0, 3], 'speak', 'hesitate'],
  [mouth, courage, wish,    [-17, -14, 22, 46], null, 'hesitate']
];

for (const [moon, strength, star, expected, next, pose] of firstRows) {
  test(`preview first row: ${moon} × ${strength} × ${star}`, () => {
    const [dark, maintenance, preset, written] = expected;
    const a = turn(newBattle(), moon, strength, star);
    const b = turn(newBattle(), moon, strength, star, writing);
    assert.deepEqual(values(a.last), expected);
    assert.deepEqual(gauges(a), [84 + dark, 100 + maintenance, preset]);
    assert.deepEqual(gauges(b), [84 + dark, 100 + maintenance, written]);
    assert.equal(a.last.row.next, next);
    assert.equal(a.last.row.pose, pose);
    assert.equal(a.last.row.kind, dark > 0 ? 'refused' : 'heard');
    assert.equal(b.last.glance, dark > 0);
    assert.ok(a.last.row.clue);
  });
}

const distanceRefusal = () => turn(newBattle(), claws, courage, hope, writing);
const speechRefusal = () => turn(newBattle(), mouth, courage, healing, writing);

for (const moon of [claws, mouth]) {
  for (const [strength, star, expected, next, reply] of [
    [patience, hope, [-4, -6, 0, 3], 'distance', '……そこで待ってくれ。今は、私の話を聞いてほしい。'],
    [patience, healing, [-2, -4, 4, 16], 'distance', '……聞こえている。今は、そこにいてくれ。私も、話したいことがある。'],
    [patience, wish, [moon === claws ? -12 : -7, -4, 12, 36], null, '……そこからなら、話せる'],
    [courage, hope, [8, -20, 0, 3], 'distance', '……まだ近い。先の話は、私が話し終えてからにしてくれ。'],
    [courage, healing, [8, -20, 0, 3], 'distance', '……下がってくれと言った。今は、そこから聞いてくれ。'],
    [courage, wish, [8, -20, 0, 3], 'distance', '……下がってくれと言った。今は、そこから聞いてくれ。']
  ]) {
    test(`preview distance override: ${moon} × ${strength} × ${star}`, () => {
      const result = turn(distanceRefusal(), moon, strength, star, writing);
      assert.deepEqual(values(result.last), expected);
      assert.equal(result.last.row.next, next);
      assert.equal(result.last.row.reply, reply);
      assert.equal(result.last.glance, strength === courage);
    });
  }
}

for (const moon of [claws, mouth]) {
  test(`preview voice override and interruption: ${moon}`, () => {
    const previous = speechRefusal();
    for (const star of [hope, healing]) {
      const interrupted = turn(previous, moon, courage, star, writing);
      assert.deepEqual(values(interrupted.last), [8, -20, 0, 3]);
      assert.equal(interrupted.last.row.next, 'speak');
      assert.equal(interrupted.last.row.reply, '……また声が出せなかった。先に、私の話を聞いてくれ。');
    }
    const answer = turn(previous, moon, courage, wish, writing);
    assert.deepEqual(gauges(answer), [75, 66, 49]);
    assert.equal(answer.last.row.reply, '……今度は、私から話そう。');
    assert.equal(answer.last.row.next, null);
    assert.deepEqual(values(turn(answer, mouth, courage, healing).last), [8, -20, 0, 3]);
  });
}

test('preview voice: wait from the mouth, otherwise use one ordinary row', () => {
  const previous = speechRefusal();
  const answer = turn(previous, mouth, patience, wish, writing);
  assert.deepEqual(gauges(answer), [80, 76, 39]);
  assert.equal(answer.last.row.reply, '……今なら、言えそうだ。');
  assert.equal(answer.last.row.next, null);
  assert.deepEqual(values(turn(previous, claws, patience, wish).last), [-7, -4, 12, 36]);
  const fallback = turn(previous, claws, patience, hope);
  assert.equal(fallback.last.row.next, 'ask-path');
  assert.deepEqual(values(fallback.last), [-14, -6, 8, 32]);
});

test('preview answers the questions that Caritas initiated', () => {
  for (const [message, gain] of [[null, 9], [writing, 21]]) {
    const askedPath = turn(newBattle(), claws, patience, hope, message);
    const answeredPath = turn(askedPath, claws, courage, hope, message);
    assert.deepEqual(values(answeredPath.last), [-18, -14, 18, 42]);
    assert.equal(answeredPath.last.gain, gain);
    assert.equal(answeredPath.last.row.next, null);
    assert.equal(turn(answeredPath, claws, courage, hope).last.row.next, 'distance');
  }
  const askedFear = turn(newBattle(), mouth, patience, wish, writing);
  const answeredFear = turn(askedFear, mouth, courage, healing, writing);
  assert.deepEqual(values(answeredFear.last), [-16, -14, 18, 42]);
  assert.equal(answeredFear.last.row.next, null);
  assert.equal(turn(answeredFear, mouth, courage, healing).last.row.next, 'speak');
});

test('preview sustains distance through hope and healing before either moon can release it', () => {
  const hoped = turn(distanceRefusal(), mouth, patience, hope, writing);
  const healed = turn(hoped, claws, patience, healing, writing);
  assert.equal(hoped.last.row.next, 'distance');
  assert.equal(healed.last.row.next, 'distance');
  assert.deepEqual(gauges(healed), [86, 70, 20]);
  for (const [moon, dark] of [[claws, 74], [mouth, 79]]) {
    const freed = turn(healed, moon, patience, wish, writing);
    assert.deepEqual(gauges(freed), [dark, 66, 56]);
    assert.equal(freed.turn - 1, 3);
    assert.equal(freed.last.row.next, null);
    assert.equal(turn(freed, claws, courage, hope).last.row.next, 'distance');
  }
});

test('preview repeated wish yields 46, 23, 11, 5 and survives moon and delivery changes', () => {
  let state = newBattle();
  const gains = [];
  for (let step = 0; step < 4; step++) {
    state = turn(state, mouth, courage, wish, writing);
    gains.push(state.last.gain);
  }
  assert.deepEqual(gains, [46, 23, 11, 5]);
  assert.deepEqual(gauges(state), [16, 44, 85]);
  state = turn(state, claws, patience, wish);
  assert.equal(state.last.streak, 5);
  assert.equal(state.last.gain, 0);
  state = turn(state, mouth, patience, healing);
  assert.equal(state.last.streak, 1);
  assert.equal(state.last.gain, 8);
});

test('preview repeated refusal still glances at +0, clamps at 100% and then withdraws', () => {
  let state = newBattle();
  const gains = [];
  for (let step = 0; step < 5; step++) {
    state = turn(state, step % 2 ? mouth : claws, courage, hope, writing);
    gains.push(state.last.gain);
    assert.equal(state.last.glance, true);
    assert.equal(state.last.row.next, 'distance');
    assert.equal(state.status, step === 4 ? 'defeat' : 'reading');
  }
  assert.deepEqual(gains, [3, 1, 0, 0, 0]);
  assert.deepEqual(gauges(state), [100, 0, 4]);
  assert.strictEqual(turn(state, claws, patience, wish, writing), state);
  assert.strictEqual(finishBattle(state), state);
});

test('preview alternation unlocks release after four turns and the ending is free', () => {
  let state = newBattle();
  for (const star of [hope, wish, hope, wish]) {
    assert.equal(state.status, 'reading');
    state = turn(state, mouth, courage, star, writing);
  }
  assert.deepEqual(gauges(state), [10, 44, 100]);
  assert.equal(state.status, 'release');
  assert.strictEqual(turn(state, mouth, courage, hope, writing), state);
  const won = finishBattle(state);
  assert.deepEqual(gauges(won), [0, 44, 100]);
  assert.equal(won.status, 'victory');
  assert.equal(won.turn, 4);
  assert.strictEqual(finishBattle(won), won);
});

test('preview mood, lower clamp, exact release threshold and simultaneous defeat', () => {
  assert.deepEqual([100, 71, 70, 36, 35, 1, 0].map(mood),
    ['閉ざす', '閉ざす', '荒れる', '荒れる', '揺らぐ', '揺らぐ', '解放']);
  assert.equal(resolveStatus(25, 1, 100), 'release');
  assert.equal(resolveStatus(26, 1, 100), 'reading');
  assert.equal(resolveStatus(25, 1, 99), 'reading');
  assert.equal(resolveStatus(25, 0, 100), 'defeat');
  const simultaneous = turn({ ...newBattle(), dark: 3, maintenance: 14, resonance: 99 }, mouth, courage, wish);
  assert.deepEqual(gauges(simultaneous), [1, 0, 100]);
  assert.equal(simultaneous.status, 'defeat');
  assert.equal(turn({ ...newBattle(), dark: 2 }, mouth, courage, wish).dark, 1);
});

test('preview validates trimmed Unicode writing and never spends a turn on invalid text', () => {
  for (const message of ['待ってる', '  待ってる　', '聞いている' + '。'.repeat(695), '𠮷野に来て']) {
    assert.equal(isValidWriting(message), true, message);
  }
  for (const message of ['あ', 'ああああ', '　', 'a b！？', 'あ。あ！あ、あ。', '！！？？', '聞いている' + '。'.repeat(696)]) {
    assert.equal(isValidWriting(message), false, message);
    const initial = newBattle();
    assert.strictEqual(turn(initial, claws, courage, hope, message), initial);
  }
});

test('preview creates a fresh battle after a prior choice, release or defeat', () => {
  const previous = distanceRefusal();
  const restarted = newBattle();
  assert.deepEqual(restarted, { dark: 84, maintenance: 100, resonance: 0, turn: 0, last: null, status: 'reading' });
  assert.notEqual(restarted, previous);
  assert.equal(turn(restarted, mouth, courage, hope, writing).last.gain, 42);
});
