const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const flush = () => new Promise(resolve => setImmediate(resolve));
const root = path.join(__dirname, '..');
const OWNER = 'hoshisuna_caritas_prompt';

function fixture({readyState=4,deferredPlay=false}={}) {
  const win = new EventTarget();
  const doc = new EventTarget();
  doc.hidden = false;
  const timers = new Map();
  const cues = [];
  let next = 0, plays = 0, pauses = 0, bgm;
  const resolvers = [];

  class NativeAudio {
    constructor(src) {
      this.src = src;
      this.loop = false; this.preload = 'none';
      this.muted = false; this.volume = 1;
      this.paused = true; this.readyState = readyState;
      this._currentTime = 0; this.events = {};
      bgm = this;
    }
    get currentTime(){return this._currentTime;}
    set currentTime(value){this._currentTime = value;cues.push(value);}
    setAttribute() {}
    addEventListener(name, callback) {this.events[name] = callback;}
    play() {
      plays++; this.paused = false;
      if (deferredPlay) return new Promise(resolve => resolvers.push(resolve));
      return Promise.resolve();
    }
    pause() { pauses++; this.paused = true; }
    fire(name) {this.events[name]?.();}
  }

  const window = {
    TarotAudio: {enabled: true},
    addEventListener: win.addEventListener.bind(win)
  };
  const document = {
    get hidden(){return doc.hidden;},
    addEventListener: doc.addEventListener.bind(doc)
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(root, 'hoshisuna-battle-audio.js'), 'utf8'),
    {window, document, Audio:NativeAudio, console,
      setTimeout(fn,ms){const id=++next;timers.set(id,{fn,ms});return id;},
      clearTimeout(id){timers.delete(id);}}
  );
  function emit(name, owner) {
    const e = new Event(name);
    if (owner) Object.defineProperty(e,'detail',{value:{source:owner}});
    win.dispatchEvent(e);
  }
  return {
    music:bgm, emit, cues, timers, doc, window,
    advance(){const jobs=[...timers.values()];timers.clear();for(const job of jobs)job.fn();},
    completePlay(){for(const resolve of resolvers.splice(0))resolve();},
    counts:()=>({plays,pauses})
  };
}

test('prewarmed music starts 650ms after ink, 1950ms before the battle UI, with leading silence skipped',async()=>{
  const f=fixture();
  assert.equal(f.music.src,'./assets/battle/bgm/re-sonance-breaker.mp3');
  assert.equal(f.music.loop,true);
  f.emit('pointerdown');
  assert.equal(f.counts().plays,0,'no audio transport before Caritas');
  f.emit('tarot-breaker:interaction-start',OWNER);
  f.emit('pointerdown');
  await flush();
  assert.equal(f.counts().plays,1);
  assert.equal(f.music.muted,true,'no battle music during dialogue, manifestation or abyss transition');
  // The muted prewarm may have progressed deep into the MP3.
  f.music.currentTime=18.7;
  f.emit('tarot-breaker:hoshisuna-transition-start',OWNER);
  assert.equal(f.music.muted,true,'first ink frame remains silent');
  assert.equal([...f.timers.values()][0]?.ms,650,'first 650ms of the Abyss must be silent');
  f.advance();
  assert.equal(f.music.muted,false,'music must start DURING ink expansion, not after battle DOM');
  f.emit('tarot-breaker:hoshisuna-battle-start');
  assert.equal(f.music.muted,false,'later combat notification must not restart the music');
  assert.equal(f.music.currentTime,0.25,'rewind to the first audible chime, not the advanced prewarm position');
  assert.equal(f.music.volume,.38);
  assert.equal(f.timers.size,0,'music cue fires once, with no post-battle delay');
  assert.equal(f.counts().plays,1,'do not restart or double play native audio');
  f.emit('tarot-breaker:hoshisuna-battle-stop');
  assert.equal(f.music.paused,true);
  assert.equal(f.music.muted,true);
  assert.equal(f.music.currentTime,0);
  f.emit('tarot-breaker:interaction-end',OWNER);
});

test('pending native play promise never leaks music before battle; reveals immediately on resolution',async()=>{
  const f=fixture({deferredPlay:true});
  f.emit('tarot-breaker:interaction-start',OWNER);
  f.emit('pointerdown');
  assert.equal(f.music.muted,true);
  f.emit('tarot-breaker:hoshisuna-battle-start');
  assert.equal(f.music.currentTime,.25);
  assert.equal(f.music.muted,true,'audio awaiting native permission cannot leak early');
  f.completePlay();
  await flush();
  assert.equal(f.music.muted,false);
  assert.equal(f.timers.size,0);
});

test('late loadedmetadata seeks before unmute on slow mobile network',async()=>{
  const f=fixture({readyState:0});
  f.emit('tarot-breaker:interaction-start',OWNER);
  f.emit('pointerdown');await flush();
  f.emit('tarot-breaker:hoshisuna-battle-start');
  assert.equal(f.music.muted,true,'no playback from a silent/unready head');
  assert.equal(f.cues.length,0);
  f.music.readyState=4;
  f.music.fire('loadedmetadata');
  assert.equal(f.music.currentTime,.25);
  assert.equal(f.music.muted,false);
});

test('unrelated events and cancellation do not start or duplicate battle playback',async()=>{
  const f=fixture();
  f.emit('tarot-breaker:interaction-start','other');
  f.emit('pointerdown');
  assert.equal(f.counts().plays,0);
  f.emit('tarot-breaker:interaction-start',OWNER);
  f.emit('pointerdown');
  f.emit('touchstart');
  await flush();
  assert.equal(f.counts().plays,1);
  f.emit('tarot-breaker:interaction-end','other');
  assert.equal(f.music.paused,false);
  f.emit('tarot-breaker:hoshisuna-battle-start');
  f.emit('tarot-breaker:hoshisuna-battle-start');
  assert.equal(f.counts().plays,1);
  f.emit('tarot-breaker:interaction-end',OWNER);
  assert.equal(f.music.paused,true);
  assert.equal(f.music.muted,true);
});

test('backgrounded combat resumes with user gesture while preserving original cue',async()=>{
  const f=fixture();
  f.emit('tarot-breaker:interaction-start',OWNER);
  f.emit('pointerdown');await flush();
  f.emit('tarot-breaker:hoshisuna-battle-start');
  assert.equal(f.music.muted,false);
  f.doc.hidden=true;
  f.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.music.paused,true);
  assert.equal(f.music.muted,true);
  f.doc.hidden=false;
  f.emit('pointerdown');await flush();
  assert.equal(f.music.paused,false);
  assert.equal(f.music.muted,false);
  f.emit('pagehide');
  assert.equal(f.music.paused,true);
});


test('transition cue is owned, ignores duplicate notifications, and cancels on retreat',async()=>{
  const f=fixture();
  f.emit('tarot-breaker:interaction-start',OWNER);
  f.emit('pointerdown');await flush();
  f.emit('tarot-breaker:hoshisuna-transition-start','another_event');
  assert.equal(f.timers.size,0,'unrelated event may not schedule combat audio');
  f.emit('tarot-breaker:hoshisuna-transition-start',OWNER);
  f.emit('tarot-breaker:hoshisuna-transition-start',OWNER);
  assert.equal(f.timers.size,1,'only one scheduled early cue');
  f.emit('tarot-breaker:hoshisuna-battle-stop');
  assert.equal(f.timers.size,0,'retreat cancels pending cue');
  f.advance();
  assert.equal(f.music.muted,true);
  assert.equal(f.music.paused,true);
});

test('lost timing callback is cancelled by the actual battle event; save restore stays audible',async()=>{
  const f=fixture();
  f.emit('tarot-breaker:interaction-start',OWNER);
  f.emit('pointerdown');await flush();
  f.emit('tarot-breaker:hoshisuna-transition-start',OWNER);
  assert.equal(f.timers.size,1);
  f.emit('tarot-breaker:hoshisuna-battle-start');
  assert.equal(f.music.muted,false,'battle-start fallback must work even if early timer is delayed');
  assert.equal(f.timers.size,0);
  assert.equal(f.music.currentTime,.25);
});

test('backgrounding before the early cue prevents music from leaking after suspension',async()=>{
  const f=fixture();
  f.emit('tarot-breaker:interaction-start',OWNER);
  f.emit('pointerdown');await flush();
  f.emit('tarot-breaker:hoshisuna-transition-start',OWNER);
  assert.equal(f.timers.size,1);
  f.doc.hidden=true;
  f.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.timers.size,0);
  f.advance();
  assert.equal(f.music.muted,true);
  assert.equal(f.music.paused,true);
});

test('battle music uses real MP3 with confirmed 0.222s leading silence and existing scene wiring',()=>{
  const html=fs.readFileSync(path.join(root,'hoshisuna-main.html'),'utf8');
  const source=fs.readFileSync(path.join(root,'hoshisuna-battle-audio.js'),'utf8');
  const event=fs.readFileSync(path.join(root,'caritas-battle-event.js'),'utf8');
  assert.match(html,/hoshisuna-battle-audio\.js\?v=3/);
  assert.match(html,/data-bgm-url="\.\/assets\/audio\/bgm\/hoshisuna-star-memory-time-prayer\.mp3"/);
  assert.match(source,/const FIRST_SOUND_SEC = 0\.25;/);
  assert.ok(!source.includes('BATTLE_FADE_MS'));
  assert.match(source,/const ABYSS_MUSIC_CUE_MS = 650;/);
  assert.ok((event.match(/tarot-breaker:hoshisuna-battle-stop/g)||[]).length>=2);
  assert.match(event,/root\.dataset\.phase="battle"[\s\S]*?tarot-breaker:hoshisuna-battle-start/);
  const bytes=fs.readFileSync(path.join(root,'assets/battle/bgm/re-sonance-breaker.mp3'));
  assert.equal(bytes.length,2246052);
  assert.equal(bytes.toString('ascii',0,3),'ID3');
});
