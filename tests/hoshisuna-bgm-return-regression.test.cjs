'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const audioSource = fs.readFileSync(path.join(root, 'audio.js'), 'utf8');
const fieldSource = fs.readFileSync(path.join(root, 'hoshisuna-field-audio.js'), 'utf8');
const OWNER = 'hoshisuna_caritas_prompt';

function harness({ delayedPlay = false } = {}) {
  const listeners = {window: new Map(), document: new Map()};
  const raf = new Map();
  let frameId = 0, now = 10000, mapTrack, resolvePending;
  const allTracks = [];
  class NativeAudio {
    constructor(src) {
      this.src = src;
      this.paused = true;
      this.muted = false;
      this._volume = 1;
      this.loop = false;
      this.preload = '';
      this.playCalls = 0;
      this.pauseCalls = 0;
      this.listeners = new Map();
      allTracks.push(this);
      mapTrack = this;
    }
    get volume() { return this._volume; }
    set volume(value) {
      assert(Number.isFinite(value) && value >= 0 && value <= 1, 'media volume must be valid');
      this._volume = value;
    }
    setAttribute() {}
    addEventListener(name, cb) { this.listeners.set(name, cb); }
    play() {
      this.playCalls++;
      if (delayedPlay && !resolvePending)
        return new Promise(resolve => { resolvePending = () => {this.paused = false; resolve();}; });
      this.paused = false;
      return Promise.resolve();
    }
    pause() { this.pauseCalls++; this.paused = true; }
  }
  function listener(target, type, callback) {
    const list = listeners[target].get(type) || [];
    list.push(callback);
    listeners[target].set(type, list);
  }
  const window = { addEventListener: (type, cb) => listener('window', type, cb) };
  const document = {
    hidden: false,
    currentScript: {dataset: {bgmUrl: './assets/audio/bgm/hoshisuna-star-memory-time-prayer.mp3'}},
    getElementById: () => null,
    addEventListener: (type, cb) => listener('document', type, cb),
  };
  const sandbox = {
    window, document, Audio: NativeAudio, console: {warn(){},error(){}},
    localStorage: {getItem(){return null;},setItem(){}},
    performance: {now:()=>now},
    requestAnimationFrame: fn => {raf.set(++frameId, fn);return frameId;},
    cancelAnimationFrame: id => raf.delete(id)
  };
  vm.runInNewContext(audioSource, sandbox, {filename:'audio.js'});
  vm.runInNewContext(fieldSource, sandbox, {filename:'hoshisuna-field-audio.js'});
  function emit(type, {source, target='window'} = {}) {
    for (const fn of listeners[target].get(type) || []) fn(source ? {type,detail:{source}}:{type});
  }
  function frame(at) {
    now = at;
    const queued = [...raf.values()];
    raf.clear();
    for (const callback of queued) callback(at);
  }
  async function flush() {await new Promise(resolve => setImmediate(resolve));}
  return {window,document,track:mapTrack,emit,frame,flush,
    clock: at=>{now=at;}, resolvePlay:()=>resolvePending?.(),
    audible:()=>!mapTrack.muted&&!mapTrack.paused?mapTrack.volume:0,
    count:()=>allTracks.length,
    queued:()=>raf.size
  };
}

test('direct preview: first movement never occurred, but battle taps prime field music silently', async () => {
  const h = harness();
  assert.equal(h.window.TarotAudio.enteredWorld, false);
  assert.equal(h.track.paused, true);
  h.emit('tarot-breaker:interaction-start', {source:OWNER});
  h.emit('tarot-breaker:hoshisuna-transition-start', {source:OWNER});
  assert.equal(h.track.muted, true);
  h.emit('pointerdown');
  await h.flush();
  assert.equal(h.window.TarotAudio.enteredWorld, true);
  assert.equal(h.track.playCalls, 1, 'user gesture starts the native map BGM');
  assert.equal(h.track.paused, false);
  assert.equal(h.audible(), 0, 'field BGM stays inaudible throughout combat');
  h.clock(20000);
  h.emit('tarot-breaker:hoshisuna-field-return-cue', {source:OWNER});
  h.emit('tarot-breaker:interaction-end', {source:OWNER});
  assert.equal(h.audible(), 0);
  h.frame(21799);
  assert.equal(h.audible(), 0, '1.8-second silence is retained');
  h.frame(23300);
  assert(Math.abs(h.audible()-.175) < 0.00001, '3-second return fade reaches midpoint');
  h.frame(24800);
  assert(Math.abs(h.audible()-.35) < 0.00001, 'ordinary map BGM is audible again');
  assert.equal(h.track.playCalls, 1, 'no second autoplay request needed at map handoff');
});

test('normal exploration transport is reused when it was already playing before combat', async () => {
  const h=harness();
  h.window.TarotAudio.startFromMovement();
  await h.flush();
  h.frame(10320);
  assert.equal(h.audible(),.35);
  h.emit('tarot-breaker:interaction-start',{source:OWNER});
  h.emit('tarot-breaker:hoshisuna-transition-start',{source:OWNER});
  h.emit('pointerdown');
  await h.flush();
  assert.equal(h.track.playCalls,1);
  assert.equal(h.audible(),0);
  h.clock(20000);
  h.emit('tarot-breaker:hoshisuna-field-return-cue',{source:OWNER});
  h.frame(21800);
  h.frame(24800);
  assert.equal(h.track.playCalls,1);
  assert.equal(h.audible(),.16,'dialogue ducking persists until its interaction ends');
  h.emit('tarot-breaker:interaction-end',{source:OWNER});
  h.frame(25120);
  assert.equal(h.audible(),.35);
});

test('a later farewell gesture can recover a direct preview that missed combat prewarm', async()=>{
  const h=harness();
  h.emit('tarot-breaker:interaction-start',{source:OWNER});
  h.emit('tarot-breaker:hoshisuna-transition-start',{source:OWNER});
  h.clock(20000);
  h.emit('tarot-breaker:hoshisuna-field-return-cue',{source:OWNER});
  assert.equal(h.track.playCalls,0);
  h.emit('pointerdown');
  await h.flush();
  assert.equal(h.track.playCalls,1);
  h.frame(21800);
  h.frame(24800);
  assert.equal(h.audible(),.16);
});

test('a pending native play promise is not cancelled at the return cue',async()=>{
  const h=harness({delayedPlay:true});
  h.emit('tarot-breaker:interaction-start',{source:OWNER});
  h.emit('tarot-breaker:hoshisuna-transition-start',{source:OWNER});
  h.emit('pointerdown');
  assert.equal(h.track.playCalls,1);
  assert.equal(h.track.pauseCalls,0);
  h.clock(20000);
  h.emit('tarot-breaker:hoshisuna-field-return-cue',{source:OWNER});
  assert.equal(h.track.pauseCalls,0, 'do not kill accepted pending play before it resolves');
  h.resolvePlay();
  await h.flush();
  h.frame(21800);
  h.frame(24800);
  assert.equal(h.track.playCalls,1);
  assert.equal(h.audible(),.16);
});

test('a suspended return fade never leaves native map music permanently muted',async()=>{
  const h=harness();
  h.emit('tarot-breaker:interaction-start',{source:OWNER});
  h.emit('tarot-breaker:hoshisuna-transition-start',{source:OWNER});
  h.emit('pointerdown');
  await h.flush();
  h.clock(20000);
  h.emit('tarot-breaker:hoshisuna-field-return-cue',{source:OWNER});
  h.document.hidden=true;
  h.emit('visibilitychange',{target:'document'});
  assert.equal(h.track.muted,false,'tab hide clears aborted return mute gate');
  h.document.hidden=false;
  h.emit('visibilitychange',{target:'document'});
  await h.flush();
  h.frame(20400);
  assert(h.audible()>0, 'regular music resumes rather than staying hard-muted');
});
