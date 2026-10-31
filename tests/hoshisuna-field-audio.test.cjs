const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const base = path.join(__dirname, '..');
const OWNER = 'hoshisuna_caritas_prompt';
function fixture({available=true}={}) {
  const listeners = new EventTarget();
  const sessions = [];
  let muted = false;
  const audio = available ? {
    beginEventSession() {
      const session = {
        hardMutes: 0,
        releases: 0,
        holdSilent() { this.hardMutes++; muted = true; },
        release() { this.releases++; muted = false; }
      };
      sessions.push(session);
      return session;
    }
  } : {};
  const window = {
    addEventListener: listeners.addEventListener.bind(listeners),
    TarotAudio: audio
  };
  vm.runInNewContext(fs.readFileSync(path.join(base,'hoshisuna-field-audio.js'),'utf8'),
    {window, console}
  );
  function emit(name,source) {
    const event = new Event(name);
    if(source !== undefined) Object.defineProperty(event,'detail',{value:{source}});
    listeners.dispatchEvent(event);
  }
  return {emit,sessions,get muted(){return muted;}};
}

test('BGM remains audible during encounter and vanishes synchronously at FIRST ink frame',()=>{
  const f=fixture();
  f.emit('tarot-breaker:interaction-start',OWNER);
  assert.equal(f.sessions.length,0);
  f.emit('tarot-breaker:hoshisuna-transition-start',OWNER);
  assert.equal(f.sessions.length,1);
  assert.equal(f.sessions[0].hardMutes,1);
  assert.equal(f.muted,true,'must be hard-muted before event dispatch returns');
  // Combat begins after the existing 2600 ms engulf, but music stays silent.
  f.emit('tarot-breaker:hoshisuna-battle-start');
  assert.equal(f.sessions.length,1);
  assert.equal(f.muted,true);
  f.emit('tarot-breaker:interaction-end',OWNER);
  assert.equal(f.sessions[0].releases,1);
  assert.equal(f.muted,false,'normal field music resumes on map return');
});

test('irrelevant events cannot mute map, duplicate transition cannot steal session',()=>{
  const f=fixture();
  f.emit('tarot-breaker:hoshisuna-transition-start',OWNER);
  assert.equal(f.sessions.length,0);
  f.emit('tarot-breaker:interaction-start','another_event');
  f.emit('tarot-breaker:hoshisuna-transition-start','another_event');
  assert.equal(f.sessions.length,0);
  f.emit('tarot-breaker:interaction-start',OWNER);
  f.emit('tarot-breaker:hoshisuna-transition-start',OWNER);
  f.emit('tarot-breaker:hoshisuna-transition-start',OWNER);
  assert.equal(f.sessions.length,1);
  assert.equal(f.muted,true);
  f.emit('tarot-breaker:interaction-end','another_event');
  assert.equal(f.sessions[0].releases,0);
  f.emit('tarot-breaker:interaction-end',OWNER);
  assert.equal(f.sessions[0].releases,1);
});

test('saved combat restores silence without replaying the ink transition',()=>{
  const f=fixture();
  f.emit('tarot-breaker:interaction-start',OWNER);
  f.emit('tarot-breaker:hoshisuna-battle-start');
  assert.equal(f.sessions.length,1);
  assert.equal(f.muted,true);
  f.emit('pagehide');
  assert.equal(f.sessions[0].releases,1);
});

test('cancellation before ink leaves music alone; if silent controller absent combat still progresses',()=>{
  const f=fixture({available:false});
  f.emit('tarot-breaker:interaction-start',OWNER);
  f.emit('tarot-breaker:interaction-end',OWNER);
  assert.equal(f.sessions.length,0);
  // Audio API is allowed to be absent (no sound), never block combat.
  f.emit('tarot-breaker:interaction-start',OWNER);
  f.emit('tarot-breaker:hoshisuna-transition-start',OWNER);
});

test('battle has both original checkpoint and new visual/audio handoff with no extra delay',()=>{
  const event=fs.readFileSync(path.join(base,'caritas-battle-event.js'),'utf8');
  const html=fs.readFileSync(path.join(base,'hoshisuna-main.html'),'utf8');
  assert.equal(event.split('tarot-breaker:hoshisuna-transition-start').length-1,1);
  assert.match(event,/stage\("engulfing",2600,beginBattle\)/);
  assert.equal(event.split('new Event("tarot-breaker:hoshisuna-battle-start")').length-1,2);
  assert.match(html,/data-bgm-url="\.\/assets\/audio\/bgm\/hoshisuna-star-memory-time-prayer\.mp3"/);
  const source=fs.readFileSync(path.join(base,'assets/audio/bgm/hoshisuna-star-memory-time-prayer.mp3'));
  assert.equal(source.toString('ascii',0,3),'ID3');
});
