const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const flush = () => new Promise(resolve => setImmediate(resolve));
const root = path.join(__dirname, '..');

function fixture() {
  const win = new EventTarget();
  const doc = new EventTarget();
  doc.hidden = false;
  const timers = new Map();
  let next = 0, plays = 0, pauses = 0, bgm;
  class NativeAudio {
    constructor(src) {
      this.src = src; this.loop = false; this.preload = 'none';
      this.muted = false; this.volume = 1; this.paused = true;
      this.currentTime = 0; this.events = {};
      bgm = this;
    }
    setAttribute() {}
    addEventListener(name, callback) { this.events[name] = callback; }
    play() { plays++; this.paused = false; return Promise.resolve(); }
    pause() { pauses++; this.paused = true; }
  }
  const window = {
    TarotAudio: {enabled: true},
    addEventListener: win.addEventListener.bind(win),
  };
  const document = {
    get hidden() {return doc.hidden;},
    addEventListener: doc.addEventListener.bind(doc)
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(root, 'hoshisuna-battle-audio.js'), 'utf8'),
    {window, document, Audio: NativeAudio, console,
      setTimeout(fn, ms) {const id=++next;timers.set(id,{fn,ms});return id;},
      clearTimeout(id) {timers.delete(id);}}
  );
  function emit(name, owner) {
    const e = new Event(name);
    if (owner) Object.defineProperty(e, 'detail', {value: {source: owner}});
    win.dispatchEvent(e);
  }
  function advance() {
    const jobs=[...timers.values()];timers.clear();
    for(const job of jobs)job.fn();
  }
  return {music:bgm, emit, advance, timers, doc, window, counts:()=>({plays,pauses})};
}
const OWNER = 'hoshisuna_caritas_prompt';

test('dialogue is field-music-only; prewarm stays muted until timed battle reveal', async()=>{
  const f=fixture();
  assert.equal(f.music.src,'./assets/battle/bgm/re-sonance-breaker.mp3');
  assert.equal(f.music.loop,true);
  f.emit('pointerdown');
  assert.equal(f.counts().plays,0,'no audio before Caritas encounter');
  f.emit('tarot-breaker:interaction-start',OWNER);
  f.emit('pointerdown');
  await flush();
  assert.equal(f.counts().plays,1);
  assert.equal(f.music.muted,true,'prewarm must be inaudible during dialogue and transformation');
  f.emit('tarot-breaker:hoshisuna-battle-start');
  assert.equal(f.music.muted,true,'field music must fade before battle music begins');
  assert.equal([...f.timers.values()][0].ms,650);
  f.advance();
  assert.equal(f.music.muted,false,'battle BGM is now audible');
  assert.equal(f.music.volume,.38);
  f.emit('tarot-breaker:hoshisuna-battle-stop');
  assert.equal(f.music.paused,true);
  assert.equal(f.music.muted,true);
  assert.equal(f.music.currentTime,0);
  f.emit('tarot-breaker:interaction-end',OWNER);
});

test('duplicate start and unrelated event never duplicate play, and cancel stops prewarm', async()=>{
  const f=fixture();
  f.emit('tarot-breaker:interaction-start','someone_else');
  f.emit('pointerdown');
  assert.equal(f.counts().plays,0);
  f.emit('tarot-breaker:interaction-start',OWNER);
  f.emit('pointerdown');f.emit('touchstart');
  await flush();
  assert.equal(f.counts().plays,1);
  f.emit('tarot-breaker:interaction-end','someone_else');
  assert.equal(f.music.paused,false);
  f.emit('tarot-breaker:interaction-end',OWNER);
  assert.equal(f.music.paused,true);
  assert.equal(f.music.muted,true);
  f.emit('tarot-breaker:hoshisuna-battle-start');
  assert.equal(f.timers.size,0);
});

test('backgrounded combat pauses safely and resumes only on a new gesture', async()=>{
  const f=fixture();
  f.emit('tarot-breaker:interaction-start',OWNER);
  f.emit('pointerdown');await flush();
  f.emit('tarot-breaker:hoshisuna-battle-start');f.advance();
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
  f.emit('tarot-breaker:interaction-end',OWNER);
});

test('unprimed restore retries at the first battle gesture, without touching the shared map BGM',async()=>{
  const f=fixture();
  f.emit('tarot-breaker:interaction-start',OWNER);
  f.emit('tarot-breaker:hoshisuna-battle-start');
  f.advance(); await flush();
  assert.equal(f.music.paused,false);
  assert.equal(f.music.muted,false);
  const html=fs.readFileSync(path.join(root,'hoshisuna-main.html'),'utf8');
  assert.match(html,/hoshisuna-battle-audio\.js\?v=1/);
  assert.match(html,/data-bgm-url="\.\/assets\/audio\/bgm\/hoshisuna-star-memory-time-prayer\.mp3"/);
  const event=fs.readFileSync(path.join(root,'caritas-battle-event.js'),'utf8');
  assert.ok((event.match(/tarot-breaker:hoshisuna-battle-stop/g)||[]).length>=2);
  const bytes=fs.readFileSync(path.join(root,'assets/battle/bgm/re-sonance-breaker.mp3'));
  assert.equal(bytes.length,2246052);
  assert.equal(bytes.toString('ascii',0,3),'ID3');
});
