const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('alenon.html', 'utf8');
const audioCode = html.slice(html.indexOf('      // Alenon ambience:'), html.indexOf('      tarotFront.src ='));
function harness(ignoreVolume = false, search = '?audioDebug=1&orbOutput=webAudio') {
  const audios = [], frames = [], contexts = [];
  class Audio {
    constructor(src) { this.src = src; this.paused = true; this.muted = false; this._volume = 1; this.playCalls = 0; audios.push(this); }
    get volume() { return ignoreVolume ? 1 : this._volume; }
    set volume(v) { if (!ignoreVolume) this._volume = v; }
    play() { this.playCalls++; this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  class Context {
    constructor() { this.state = 'suspended'; this.destination = {}; this.sources = []; this.meters = []; contexts.push(this); }
    resume() { this.state = 'running'; return Promise.resolve(); }
    createMediaElementSource(audio) {
      assert.ok(!this.sources.some(s => s.audio === audio), 'one source per audio');
      const source = {audio, connect(node) { this.output = node; }}; this.sources.push(source); return source;
    }
    createAnalyser() { const meter = {level: 0.1, connect(node) { this.output = node; }, getFloatTimeDomainData(a) { a.fill(this.level); }}; this.meters.push(meter); return meter; }
    createGain() { return {gain: {value: 1}, connect(node) { this.output = node; }}; }
  }
  const sandbox = { Audio, Float32Array, Math, Promise, URLSearchParams, location:{search}, performance:{now:()=>0}, requestAnimationFrame:f=>frames.push(f),
    WORLD_W:1448, WORLD_H:1086, player:{x:716,y:254.1}, layout:{groundS:{x:0,y:-12,scale:.86}}, AudioContext:Context };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(audioCode + '\nthis.api={unlockAlenonAudio,startAlenonWind,stopAlenonWind,startAlenonOrbResonance,stopAlenonOrbResonance,updateAlenonOrbResonance,alenonOrbAreaLevel,setAlenonWindVolume,get mix(){return alenonMix},get volume(){return alenonOrbVolume}};', sandbox);
  const h = { ...sandbox, api:sandbox.api, audios, frames, contexts };
  h.point = (x,y) => {const g=h.layout.groundS; h.player.x=724+g.x+(x-724)*g.scale; h.player.y=543+g.y+(y-543)*g.scale;};
  h.tick = (n=60, dt=1/60) => {for(let i=0;i<n;i++) h.api.updateAlenonOrbResonance(dt);};
  h.start = async () => {await h.api.startAlenonWind();await h.api.startAlenonOrbResonance();await h.api.unlockAlenonAudio();h.api.setAlenonWindVolume(.55);};
  return h;
}

test('A-F: hall centre audible, perimeter fades, stairs/outside exactly zero, re-entry fades', async () => {
  const h=harness(); await h.start(); const orb=h.audios.find(a=>a.src.includes('orb-resonance'));
  h.point(716,264);h.tick();assert.ok(h.api.volume>.29 && h.api.volume<=.30);
  const levels=[];
  for(const r of [.2,.5,.7,.8,.9,.95,.99,1,1.2,3]) {h.point(716,264+82*r);h.tick();levels.push(h.api.volume);}
  assert.ok(levels[0]>levels[1] && levels[1]>levels[2] && levels[2]>levels[3] &&
    levels[3]>levels[4] && levels[4]>levels[5] && levels[5]>levels[6]);
  assert.deepEqual(levels.slice(7),[0,0,0]);assert.equal(orb.volume,0);assert.equal(orb.muted,true);assert.equal(orb.paused,false);
  assert.equal(h.api.mix.orb.gain.gain.value,0);
  h.point(716,264);h.tick(1);assert.ok(h.api.volume>0 && h.api.volume<.05);h.tick();assert.ok(h.api.volume>.29);
});

test('all ellipse directions and map scaling use ground coordinates; camera cannot change boundary', async () => {
  const h=harness();await h.start();
  for(const scale of [.86,1,1.5]) for(const viewport of [390,844,1448]) {
    h.layout.groundS={x:13,y:-12,scale};h.worldScale=viewport/390;
    for(let angle=0;angle<Math.PI*2;angle+=Math.PI/8) {
      h.point(716+170*Math.cos(angle)*1.001,264+82*Math.sin(angle)*1.001);h.tick(1);assert.equal(h.api.volume,0);
      h.point(716+170*Math.cos(angle)*.5,264+82*Math.sin(angle)*.5);h.tick();assert.ok(h.api.volume>.09);
    }
  }
});

test('iOS-style ignored volume writes still have exact zero output through gain + mute', async () => {
  const h=harness(true);await h.start();h.point(716,264);h.tick();assert.ok(h.api.volume>0);
  h.point(716,400);h.tick(1);assert.equal(h.api.mix.orb.gain.gain.value,0);
  assert.equal(h.audios.find(a=>a.src.includes('orb-resonance')).muted,true);
});

test('native wind does not depend on the Orb context; stopping it still silences Orb', async () => {
  const h=harness();await h.start();h.point(716,264);h.tick();
  h.api.mix.context.state='suspended';h.tick(1);
  assert.equal(h.api.volume,0);assert.equal(h.audios[0].paused,false);
  assert.equal(h.audios[0].muted,false);assert.equal(h.audios[0].volume,.55);
  h.api.mix.context.state='running';h.tick();assert.ok(h.api.volume>0);
  h.api.stopAlenonWind({fade:300});h.tick(1);assert.equal(h.api.volume,0);
  h.frames.at(-1)(300);
  assert.equal(h.audios[0].paused,true);assert.equal(h.audios[0].muted,true);
});

test('G: return outside hall resumes wind, stays silent and never duplicates sources', async () => {
  const h=harness();h.player.x=730.9;h.player.y=837.3;await h.start();h.tick();assert.equal(h.api.volume,0);assert.equal(h.audios[0].paused,false);
  for(let i=0;i<4;i++) await h.api.unlockAlenonAudio();
  assert.equal(h.contexts.length,1);assert.equal(h.api.mix.context.sources.length,1);
  assert.equal(h.api.mix.context.sources[0].audio.src.includes('orb-resonance'),true);
  assert.equal(h.audios.filter(a=>a.src.includes('orb-resonance')).length,1);
  assert.equal(h.api.mix.orb.source.output,h.api.mix.orb.meter);
  assert.equal(h.api.mix.orb.meter.output,h.api.mix.orb.gain);
});

test('seconds-based entry smoothing behaves the same at 30/60/120 fps', async () => {
  const levels=[];
  for(const fps of [30,60,120]) {const h=harness();await h.start();h.point(716,264);h.tick(fps/2,1/fps);levels.push(h.api.volume);}
  assert.ok(Math.max(...levels)-Math.min(...levels)<1e-12);
});

test('every movement-loop branch updates audio after movement before scheduling next frame', () => {
  const loop=html.slice(html.indexOf('        function loop(now)'),html.indexOf('\n        resetPlayer();',html.indexOf('        function loop(now)')));
  const branches=loop.split('requestAnimationFrame(loop);').slice(0,-1);
  assert.equal(branches.length,5);
  for(const branch of branches) assert.match(branch,/updateAlenonOrbResonance\(dt\);\s+setActorPosition\(\)/);
  assert.match(loop,/\(now - last\) \/ 1000/);
});


test('first gesture primes wind hard-muted while Orb gain remains zero', async () => {
  const h=harness();await h.api.unlockAlenonAudio();
  assert.equal(h.audios[0].paused,false);assert.equal(h.audios[0].muted,true);
  assert.equal(h.audios[0].volume,0);
  assert.equal(h.api.mix.wind,undefined);
  const orb=h.audios.find(a=>a.src.includes('orb-resonance'));
  assert.equal(orb.paused,false);assert.equal(orb.muted,true);assert.equal(h.api.mix.orb.gain.gain.value,0);
});

test('native wind stays hard-muted through prologue and restarts after scripted wind stop even if volume writes are ignored', async () => {
  const h=harness(true);
  await h.api.unlockAlenonAudio();
  const wind=h.audios[0];
  assert.equal(wind.volume,1);
  assert.equal(wind.paused,false);
  assert.equal(wind.muted,true);
  await h.api.startAlenonWind();
  assert.equal(wind.muted,false);
  h.api.stopAlenonWind({fade:300});
  h.frames.at(-1)(300);
  assert.equal(wind.paused,true);
  assert.equal(wind.muted,true);
  await h.api.startAlenonWind();
  assert.equal(wind.paused,false);
  assert.equal(wind.muted,false);
  assert.equal(h.audios.filter(a=>a.src.includes('wind-ambience')).length,1);
});

test('normal entry plays Orb natively and hard-mutes it beyond the hall', async () => {
  const h=harness(false,''); await h.start();
  const orb=h.audios.find(a=>a.src.includes('orb-resonance'));
  assert.equal(h.contexts.length,0);
  h.point(716,264);h.tick();
  assert.equal(orb.paused,false);assert.equal(orb.muted,false);
  assert.ok(orb.volume>0 && orb.volume<=.30);
  h.point(716,400);h.tick(1);
  assert.equal(orb.muted,true);assert.equal(orb.volume,0);
  assert.equal(h.audios[0].muted,false);
});
