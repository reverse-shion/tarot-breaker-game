const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SOURCE = fs.readFileSync(path.join(__dirname, "..", "audio.js"), "utf8");

function harness() {
  const frameQueue = new Map();
  const mediaWrites = [];
  const handlers = {window: new Map(), document: new Map()};
  let clock = 10000;
  let nextFrame = 1;
  let bgm;
  let playCalls = 0;
  let pauseCalls = 0;

  class StrictBrowserAudio {
    constructor(src) {
      this.src = src;
      this.paused = true;
      this.muted = false;
      this._volume = 1;
      this.loop = false;
      this.preload = "";
      this.listeners = new Map();
      bgm = this;
    }
    get volume() { return this._volume; }
    set volume(value) {
      if (!Number.isFinite(value) || value < 0 || value > 1)
        throw new RangeError("HTMLMediaElement.volume outside [0,1]: " + value);
      this._volume = value;
      mediaWrites.push(value);
    }
    setAttribute() {}
    addEventListener(name, callback) { this.listeners.set(name, callback); }
    play() {
      playCalls++;
      this.paused = false;
      return Promise.resolve();
    }
    pause() { pauseCalls++; this.paused = true; }
  }

  const window = {
    addEventListener(name, callback) { handlers.window.set(name, callback); },
  };
  const document = {
    hidden: false,
    currentScript: { dataset: {} },
    getElementById: () => null,
    addEventListener(name, callback) { handlers.document.set(name, callback); },
  };
  const sandbox = {
    window, document, Audio: StrictBrowserAudio,
    performance: {now: () => clock},
    requestAnimationFrame(callback) {
      const id = nextFrame++;
      frameQueue.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) { frameQueue.delete(id); },
    localStorage: {getItem() {return null;}, setItem() {}},
    console: {warn() {}},
  };
  vm.runInNewContext(SOURCE, sandbox, {filename: "audio.js"});

  function deliverAt(timestamp) {
    const first = frameQueue.entries().next();
    assert.equal(first.done, false, "expected a scheduled animation frame");
    const [id, callback] = first.value;
    frameQueue.delete(id);
    callback(timestamp);
  }
  function dispatch(target, name) {
    const cb = handlers[target].get(name);
    assert.equal(typeof cb, "function", name + " listener missing");
    cb();
  }
  async function start() {
    window.TarotAudio.startFromMovement();
    // Allow the already-resolved HTMLMediaElement.play() promise to finish.
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(playCalls, 1);
    assert.equal(frameQueue.size, 1);
  }
  return {
    window, document, bgm, mediaWrites, frameQueue, start, deliverAt, dispatch,
    clock(value) {clock = value;},
    counts() {return {playCalls, pauseCalls};},
  };
}

test("BGM fade rejects neither a prior-frame timestamp nor a late frame", async () => {
  const h = harness();
  await h.start();
  // A RAF timestamp can precede performance.now() at fade creation.
  // Before the fix this writes negative media volume and throws.
  assert.doesNotThrow(() => h.deliverAt(9999));
  assert.equal(h.bgm.volume, 0, "early RAF must not start below zero");
  h.deliverAt(10000);
  assert.equal(h.bgm.volume, 0);
  h.deliverAt(10160);
  assert(h.bgm.volume > 0 && h.bgm.volume < 0.35);
  h.deliverAt(10320);
  assert.equal(h.bgm.volume, 0.35);
  assert.equal(h.frameQueue.size, 0);
});

test("interaction fades retain original target levels, timing and bounds", async () => {
  const h = harness();
  await h.start();
  h.deliverAt(10320);
  h.clock(12000);
  h.dispatch("window", "tarot-breaker:interaction-start");
  assert.doesNotThrow(() => h.deliverAt(10900), "stale RAF cannot make downward fade exceed 1");
  assert.equal(h.bgm.volume, 0.35, "stale RAF must not overshoot start");
  h.deliverAt(12160);
  assert(h.bgm.volume > 0.16 && h.bgm.volume < 0.35);
  h.deliverAt(12320);
  assert.equal(h.bgm.volume, 0.16);
  h.clock(12500);
  h.dispatch("window", "tarot-breaker:interaction-end");
  assert.doesNotThrow(() => h.deliverAt(12499));
  assert.equal(h.bgm.volume, 0.16);
  h.deliverAt(12820);
  assert.equal(h.bgm.volume, 0.35);
  assert(h.mediaWrites.every(v => v >= 0 && v <= 1));
});

test("fade cancellation ignores stale callbacks and off fade still pauses", async () => {
  const h = harness();
  await h.start();
  h.deliverAt(10320);
  h.clock(13000);
  h.dispatch("window", "tarot-breaker:interaction-start");
  const staleFrame = h.frameQueue.values().next().value;
  h.window.TarotAudio.setEnabled(false); // 180ms pause fade cancels the old token.
  assert.doesNotThrow(() => staleFrame(12500), "canceled fade must be inert");
  assert.doesNotThrow(() => h.deliverAt(12900));
  assert(h.bgm.volume >= 0 && h.bgm.volume <= 1);
  h.deliverAt(13180);
  assert.equal(h.bgm.volume, 0);
  assert.equal(h.bgm.paused, true);
  assert.equal(h.counts().pauseCalls, 1);
});

test("hidden-tab pause remains immediate; resuming still fades within range", async () => {
  const h = harness();
  await h.start();
  h.deliverAt(10320);
  h.clock(14000);
  h.document.hidden = true;
  h.dispatch("document", "visibilitychange");
  assert.equal(h.bgm.paused, true);
  assert.equal(h.bgm.volume, 0);
  assert.equal(h.frameQueue.size, 0);
  h.document.hidden = false;
  h.dispatch("document", "visibilitychange");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.counts().playCalls, 2);
  assert.doesNotThrow(() => h.deliverAt(13999));
  assert.equal(h.bgm.volume, 0);
  h.deliverAt(14320);
  assert.equal(h.bgm.volume, 0.35);
  h.dispatch("window", "pagehide");
  assert.equal(h.bgm.paused, true);
  assert.equal(h.bgm.volume, 0);
});

test("map return holds native silence for 1.8s and fades for three seconds", async () => {
  for (const useGraph of [false, true]) {
    const h = harness();
    const gain = {gain: {value: 1}, connect() {}};
    if (useGraph) {
      h.window.AudioContext = class {
        state = "running";
        createGain() {return gain;}
        createMediaElementSource(media) {
          assert.equal(media, h.bgm);
          return {connect() {}};
        }
      };
      h.window.TarotAudio.prepareReturnOutput();
    }
    await h.start();
    h.deliverAt(10320);
    h.clock(11000);
    const session = h.window.TarotAudio.beginEventSession();
    session.holdSilent();
    session.release({fadeIn: true});
    const audible = () => h.bgm.muted ? 0 : h.bgm.volume * gain.gain.value;
    assert.equal(audible(), 0);
    assert.equal(h.bgm.muted, true);
    h.deliverAt(12799);
    assert.equal(audible(), 0);
    h.deliverAt(14300);
    assert.equal(audible(), .175);
    h.deliverAt(15800);
    assert.equal(audible(), .35);
    assert.equal(h.bgm.muted, false);
    assert.equal(h.counts().playCalls, 1);
  }
});


test("ordinary exploration BGM starts audible and no Web Audio route is created", async () => {
  const h = harness();
  let sourceCreated = false;
  h.window.AudioContext = class {
    state = "running";
    createMediaElementSource() {sourceCreated = true; throw new Error("must not reroute normal BGM");}
  };
  h.window.TarotAudio.prepareReturnOutput();
  await h.start();
  h.deliverAt(10320);
  assert.equal(sourceCreated, false);
  assert.equal(h.bgm.paused, false);
  assert.equal(h.bgm.muted, false);
  assert.equal(h.bgm.volume, .35);
});
