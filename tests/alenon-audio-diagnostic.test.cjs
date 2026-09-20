const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('alenon.html', 'utf8');
const audioCode = html.slice(html.indexOf('      // Alenon ambience:'), html.indexOf('      tarotFront.src ='));

function harness(search = '', {
  playReject = false, resumeStaysSuspended = false, resumeReject = false, sourceThrows = false,
} = {}) {
  const panels = [], intervals = [], listeners = new Map();
  class Audio {
    constructor(src) {
      this.src = src; this.paused = true; this.volume = 1; this.muted = false;
      this.readyState = 4; this.networkState = 1; this.currentTime = 0; this.ended = false;
      this.error = null;
    }
    play() {
      if (playReject && this.src.includes('wind-ambience')) {
        return Promise.reject(Object.assign(new Error('media blocked'), { name: 'NotAllowedError' }));
      }
      this.paused = false;
      return Promise.resolve();
    }
    pause() { this.paused = true; }
  }
  class Context {
    constructor() { this.state = 'suspended'; this.destination = {}; }
    resume() {
      if (resumeReject) return Promise.reject(Object.assign(new Error('gesture denied'), { name: 'NotAllowedError' }));
      if (!resumeStaysSuspended) this.state = 'running';
      return Promise.resolve();
    }
    createMediaElementSource() {
      if (sourceThrows) throw new Error('media source failed');
      return { connect() {} };
    }
    createAnalyser() {
      return { fftSize: 0, connect() {} };
    }
    createGain() { return { gain: { value: 0 }, connect() {} }; }
  }
  const document = {
    createElement() {
      const panel = { style: {}, setAttribute() {}, textContent: '' };
      panels.push(panel);
      return panel;
    },
    body: { appendChild() {} },
  };
  const sandbox = {
    Audio, Float32Array, URLSearchParams, location: { search }, document,
    navigator: { userActivation: { isActive: false, hasBeenActive: true } },
    performance: { now: () => 0 }, requestAnimationFrame() {},
    player: { x: 716, y: 264 }, layout: { groundS: { x: 0, y: 0, scale: 1 } },
    WORLD_W: 1448, WORLD_H: 1086,
  };
  sandbox.window = sandbox;
  sandbox.AudioContext = Context;
  sandbox.setInterval = (callback, delay) => { intervals.push({ callback, delay }); return intervals.length; };
  sandbox.clearInterval = () => {};
  sandbox.addEventListener = (name, callback) => { listeners.set(name, callback); };
  vm.createContext(sandbox);
  vm.runInContext(audioCode + '\nthis.api={initAlenonAudioDiagnostic,unlockAlenonAudio,startAlenonWind,' +
    'startAlenonOrbResonance,setAlenonWindVolume,classifyAlenonAudio,ensureAlenonMix,' +
    'get debug(){return alenonAudioDiagnostic},get mix(){return alenonMix}};', sandbox);
  return { ...sandbox, api: sandbox.api, panels, intervals, listeners };
}

test('normal route creates no panel or diagnostic timer and still starts wind', async () => {
  const h = harness('');
  h.api.initAlenonAudioDiagnostic();
  await h.api.unlockAlenonAudio();
  await h.api.startAlenonWind();
  assert.equal(h.api.debug, null);
  assert.equal(h.panels.length, 0);
  assert.equal(h.intervals.length, 0);
  assert.equal(h.api.mix.context.state, 'running');
});

test('debug parameter works alongside existing route parameters and reports suspended context', async () => {
  const h = harness('?from=title&audioDebug=1', { resumeStaysSuspended: true });
  h.api.initAlenonAudioDiagnostic();
  await h.api.startAlenonWind();
  await h.api.unlockAlenonAudio();
  h.intervals[0].callback();
  assert.equal(h.panels.length, 1);
  assert.equal(h.intervals[0].delay, 400);
  assert.match(h.panels[0].textContent, /CASE A — AUDIO CONTEXT NOT RUNNING/);
  assert.match(h.panels[0].textContent, /resume attempts=1 result=fulfilled/);
  assert.match(h.panels[0].textContent, /state=suspended/);
});

test('wind play rejection is visible even when original unlock uses allSettled', async () => {
  const h = harness('?audioDebug=1', { playReject: true });
  h.api.initAlenonAudioDiagnostic();
  await h.api.unlockAlenonAudio();
  await Promise.resolve();
  h.intervals[0].callback();
  assert.match(h.panels[0].textContent, /CASE E — PLAYBACK ERROR/);
  assert.match(h.panels[0].textContent, /play=rejected \/ NotAllowedError: media blocked/);
});

test('resume rejection is visible without implying that the context is running', async () => {
  const h = harness('?audioDebug=1', { resumeReject: true });
  h.api.initAlenonAudioDiagnostic();
  await h.api.startAlenonWind();
  await h.api.unlockAlenonAudio();
  h.intervals[0].callback();
  assert.match(h.panels[0].textContent, /CASE A — AUDIO CONTEXT NOT RUNNING/);
  assert.match(h.panels[0].textContent, /result=rejected \/ NotAllowedError: gesture denied/);
});

test('graph construction error is displayed without granting a fictional route', () => {
  const h = harness('?audioDebug=1', { sourceThrows: true });
  h.api.initAlenonAudioDiagnostic();
  assert.equal(h.api.ensureAlenonMix(), null);
  h.intervals[0].callback();
  assert.match(h.panels[0].textContent, /AUDIO GRAPH SETUP ERROR/);
  assert.match(h.panels[0].textContent, /media source failed/);
  assert.match(h.panels[0].textContent, /route=NO gain=-/);
});

test('healthy-looking graph is a candidate only: panel cannot assert actual sound', async () => {
  const h = harness('?audioDebug=1');
  h.api.initAlenonAudioDiagnostic();
  await h.api.unlockAlenonAudio();
  await h.api.startAlenonWind();
  h.api.setAlenonWindVolume(0.65);
  h.intervals[0].callback();
  assert.match(h.panels[0].textContent, /CASE D CANDIDATE — IF SILENT/);
  assert.match(h.panels[0].textContent, /Wind: wanted=YES unlocked=YES/);
  assert.match(h.panels[0].textContent, /gain=0.65/);
});

test('running transport with zero wind gain is classified separately', async () => {
  const h = harness('?audioDebug=1');
  h.api.initAlenonAudioDiagnostic();
  await h.api.unlockAlenonAudio();
  await h.api.startAlenonWind();
  h.intervals[0].callback();
  assert.match(h.panels[0].textContent, /CASE C — WIND GAIN ZERO/);
});

test('title forwards audioDebug only when opt-in; normal destination remains unchanged', () => {
  const game = fs.readFileSync('game.js', 'utf8');
  const start = game.indexOf('    if (!enteringFromLanding) {', game.indexOf('  function begin(event) {'));
  const branch = game.slice(start, game.indexOf('\n    running = true;', start));
  for (const [search, expected] of [
    ['', './alenon.html?from=title&build=6bc2a38e'],
    ['?audioDebug=1', './alenon.html?from=title&build=6bc2a38e&audioDebug=1'],
  ]) {
    const sandbox = {
      enteringFromLanding: false, start: { disabled: false }, URLSearchParams,
      location: { search, href: '' }, window: { TarotJourney: { reset() {} } },
    };
    vm.runInNewContext('(function () {' + branch + '})()', sandbox);
    assert.equal(sandbox.location.href, expected);
    assert.equal(sandbox.start.disabled, true);
  }
});
