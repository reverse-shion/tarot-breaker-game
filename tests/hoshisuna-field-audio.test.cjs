const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const base = path.join(__dirname, '..');
function fixture() {
  const listeners = new EventTarget();
  const calls = [];
  const timers = new Map();
  let nextTimer = 0;
  const audio = {
    beginEventSession() {
      const session = {
        fade: [],
        hold: 0,
        releases: 0,
        tweenCoefficient(...args) { this.fade.push(args); },
        holdSilent() { this.hold++; },
        release() { this.releases++; }
      };
      calls.push(session);
      return session;
    }
  };
  const window = {
    addEventListener: listeners.addEventListener.bind(listeners),
    TarotAudio: audio
  };
  vm.runInNewContext(fs.readFileSync(path.join(base, 'hoshisuna-field-audio.js'), 'utf8'), {
    window,
    console,
    setTimeout(fn, duration) { const id = ++nextTimer; timers.set(id, {fn, duration}); return id; },
    clearTimeout(id) { timers.delete(id); }
  });
  function emit(name, source) {
    const event = new Event(name);
    if (source !== undefined) Object.defineProperty(event, 'detail', {value: {source}});
    listeners.dispatchEvent(event);
  }
  function runTimers() {
    const tasks = [...timers.values()];
    timers.clear();
    for (const task of tasks) task.fn();
  }
  return {emit, calls, timers, runTimers};
}

test('approach and prebattle dialogue stay audible; only combat transition fades', () => {
  const f = fixture();
  f.emit('tarot-breaker:interaction-start', 'hoshisuna_caritas_prompt');
  assert.equal(f.calls.length, 0, 'opening Caritas dialogue must not mute the field');
  f.emit('tarot-breaker:hoshisuna-battle-start');
  assert.equal(f.calls.length, 1);
  assert.deepEqual(Array.from(f.calls[0].fade[0]), [0, 650, false]);
  assert.equal(f.timers.size, 1);
  f.runTimers();
  assert.equal(f.calls[0].hold, 1, 'combat silence uses iOS-native mute');
  f.emit('tarot-breaker:interaction-end', 'hoshisuna_caritas_prompt');
  assert.equal(f.calls[0].releases, 1, 'map return releases audio for normal playback');
});

test('duplicate battle signal and unrelated events cannot steal BGM', () => {
  const f = fixture();
  f.emit('tarot-breaker:hoshisuna-battle-start');
  assert.equal(f.calls.length, 0);
  f.emit('tarot-breaker:interaction-start', 'different_event');
  f.emit('tarot-breaker:hoshisuna-battle-start');
  assert.equal(f.calls.length, 0);
  f.emit('tarot-breaker:interaction-start', 'hoshisuna_caritas_prompt');
  f.emit('tarot-breaker:hoshisuna-battle-start');
  f.emit('tarot-breaker:hoshisuna-battle-start');
  assert.equal(f.calls.length, 1);
  f.emit('tarot-breaker:interaction-end', 'different_event');
  assert.equal(f.calls[0].releases, 0);
  f.emit('tarot-breaker:interaction-end', 'hoshisuna_caritas_prompt');
  assert.equal(f.calls[0].releases, 1);
});

test('cancellation before battle and pagehide never leave lingering mute', () => {
  const f = fixture();
  f.emit('tarot-breaker:interaction-start', 'hoshisuna_caritas_prompt');
  f.emit('tarot-breaker:interaction-end', 'hoshisuna_caritas_prompt');
  assert.equal(f.calls.length, 0, 'inspection cancel does not manipulate native audio');
  f.emit('tarot-breaker:interaction-start', 'hoshisuna_caritas_prompt');
  f.emit('tarot-breaker:hoshisuna-battle-start');
  assert.equal(f.calls.length, 1);
  f.emit('pagehide');
  assert.equal(f.calls[0].releases, 1);
  assert.equal(f.timers.size, 0);
  f.runTimers();
  assert.equal(f.calls[0].hold, 0, 'no late hard mute after pagehide');
});

test('both fresh and restored combat signal the handoff, and field BGM path is canonical', () => {
  const event = fs.readFileSync(path.join(base, 'caritas-battle-event.js'), 'utf8');
  const html = fs.readFileSync(path.join(base, 'hoshisuna-main.html'), 'utf8');
  const signal = 'window.dispatchEvent(new Event("tarot-breaker:hoshisuna-battle-start"));';
  assert.equal(event.split(signal).length - 1, 2);
  assert.match(event, /function beginBattle\(\)[\s\S]*?tarot-breaker:hoshisuna-battle-start/);
  assert.match(event, /function restoreCheckpoint\(\)[\s\S]*?tarot-breaker:hoshisuna-battle-start/);
  assert.match(html, /data-bgm-url="\.\/assets\/audio\/bgm\/hoshisuna-star-memory-time-prayer\.mp3"/);
  const audio = fs.readFileSync(path.join(base, 'assets/audio/bgm/hoshisuna-star-memory-time-prayer.mp3'));
  assert.equal(audio.toString('ascii', 0, 3), 'ID3');
});
