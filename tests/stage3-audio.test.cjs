const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function fixture(){
 const listeners={};let instance;let clock=0,frameId=0;const frames=new Map();
 class FakeAudio {constructor(src){instance=this;this.src=src;this.paused=true;this.currentTime=12;this.volume=0;} get volume(){return this._volume;} set volume(value){if(value<0||value>1)throw new RangeError("HTMLMediaElement volume outside [0,1]");this._volume=value;} setAttribute(){} addEventListener(){} pause(){this.paused=true;} play(){this.paused=false;return this.result||Promise.resolve();}}
 const window={addEventListener(n,f){listeners[n]=f;}};
 const document={hidden:false,currentScript:null,getElementById(){return null;},addEventListener(n,f){listeners[n]=f;}};
 vm.runInNewContext(fs.readFileSync('audio.js','utf8'),{window,document,Audio:FakeAudio,localStorage:{getItem(){return '1';},setItem(){}},performance:{now(){return clock;}},requestAnimationFrame(f){frames.set(++frameId,f);return frameId;},cancelAnimationFrame(id){frames.delete(id);},setTimeout,clearTimeout,console});
 return {api:window.TarotAudio,bgm:instance,listeners,rafAt(timestamp){const callbacks=[...frames.values()];frames.clear();callbacks.forEach(f=>f(timestamp));},step(ms){clock+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(f=>f(clock));}};
}
test('default cinematic calls have no effect; independent event coefficient applies once',()=>{
 const {api,bgm,listeners}=fixture();api.setCinematicLevel(.1);assert.equal(bgm.volume,0);
 bgm.paused=false;const session=api.beginEventSession();assert.equal(bgm.volume,.35);
 session.setLevel(.5);assert.equal(bgm.volume,.175);listeners['tarot-breaker:interaction-start']();assert.equal(bgm.volume,.08);
 const state=session.capture();assert.equal(state.base,.16);assert.equal(state.coefficient,.5);assert.equal(state.playing,true);
 session.release();assert.equal(bgm.volume,.16);
});
test('iOS-safe event silence keeps native transport alive and reveal needs no play call',()=>{
 const {api,bgm}=fixture();bgm.paused=false;const session=api.beginEventSession();const p0=session.capture();let plays=0;const originalPlay=bgm.play.bind(bgm);bgm.play=()=>{plays++;return originalPlay();};
 assert.equal(session.holdSilent(),true);assert.equal(bgm.paused,false);assert.equal(bgm.volume,0);
 bgm.currentTime=99;assert.equal(session.prepareSilent(p0),true);assert.equal(bgm.currentTime,12);assert.equal(bgm.paused,false);assert.equal(bgm.volume,0);
 session.setLevel(0);assert.equal(session.revealSilent(p0),true);assert.equal(plays,0);assert.equal(bgm.paused,false);assert.equal(bgm.volume,0);
 session.setLevel(1);assert.equal(bgm.volume,.35);session.release();
});
test('pause snapshots actual time and resume preserves mute settings and stopped state',async()=>{
 const {api,bgm}=fixture();bgm.paused=false;const session=api.beginEventSession();const snapshot=session.pause();assert.equal(snapshot.time,12);assert.equal(bgm.paused,true);assert.equal(bgm.volume,0);
 bgm.currentTime=99;assert.equal(await session.resume(snapshot),true);assert.equal(bgm.currentTime,12);assert.equal(bgm.paused,false);
 session.pause();api.setEnabled(false);assert.equal(await session.resume(snapshot),true);assert.equal(bgm.paused,true);assert.equal(bgm.volume,0);
 api.setEnabled(true);const stopped=session.capture();assert.equal(await session.resume(stopped),true);assert.equal(bgm.paused,true);session.release();assert.equal(api.enabled,true);
});
test('failed play remains silent without blocking visual caller; released late play cannot restart',async()=>{
 const {api,bgm}=fixture();bgm.paused=false;const session=api.beginEventSession();const snapshot=session.pause();bgm.result=Promise.reject(new Error('denied'));
 assert.equal(await session.resume(snapshot),false);assert.equal(bgm.volume,0);assert.equal(bgm.paused,true);
 let resolve;bgm.result=new Promise(r=>{resolve=r;});const pending=session.resume(snapshot);session.release();assert.equal(bgm.paused,true);resolve();assert.equal(await pending,false);assert.equal(bgm.paused,true);
});
test('pause invalidates pending resume; white/black silence is actual native pause',async()=>{
 const {api,bgm}=fixture();bgm.paused=false;const session=api.beginEventSession();const snapshot=session.capture();let resolve;bgm.result=new Promise(r=>{resolve=r;});const pending=session.resume(snapshot);session.pause();resolve();assert.equal(await pending,false);assert.equal(bgm.paused,true);assert.equal(bgm.volume,0);session.release();
});
test('hung native play reports failure within bounded interval and eventual fulfillment stays paused',async()=>{
 const {api,bgm}=fixture();bgm.paused=false;const session=api.beginEventSession();const snapshot=session.pause();let resolve;bgm.result=new Promise(r=>{resolve=r;});assert.equal(await session.resume(snapshot),false);assert.equal(bgm.volume,0);assert.equal(bgm.paused,true);resolve();await Promise.resolve();assert.equal(bgm.paused,true);session.release();
});
test('ordinary movement unlock and native background pause retain old behavior without event ownership',async()=>{
 const {api,bgm,listeners}=fixture();assert.equal(api.enteredWorld,false);api.setEnabled(false);api.startFromMovement();await Promise.resolve();assert.equal(api.enteredWorld,true);assert.equal(api.enabled,true);assert.equal(bgm.paused,false);listeners.pagehide();assert.equal(bgm.paused,true);assert.equal(bgm.volume,0);
});
test('front coefficient and silence duration interpolate; per-frame Stage3 level cancels older fade',()=>{
 const {api,bgm,step}=fixture();const session=api.beginEventSession();api.setCinematicLevel(.5,400);assert.equal(bgm.volume,.35);step(200);assert.ok(Math.abs(bgm.volume-.2625)<1e-9);step(200);assert.equal(bgm.volume,.175);
 api.setCinematicSilence(true,200);step(100);assert.equal(bgm.volume,.0875);step(100);assert.equal(bgm.volume,0);
 api.setCinematicSilence(false,200);step(200);assert.equal(bgm.volume,.175);
 api.setCinematicLevel(.1,500);session.setLevel(.825);step(500);assert.equal(bgm.volume,.35*.825);session.release();step(500);assert.equal(bgm.volume,.35);
});
test('P0 base restores independently from user mute and never overwrites preference',()=>{
 const {api,bgm,listeners}=fixture();const session=api.beginEventSession();const p0=session.capture();listeners['tarot-breaker:interaction-start']();assert.equal(bgm.volume,.16);session.setBase(p0.base);assert.equal(bgm.volume,.35);api.setEnabled(false);session.setBase(.16);assert.equal(bgm.volume,0);assert.equal(api.enabled,false);session.release();assert.equal(api.enabled,false);
});

test('event coefficient fades tolerate a queued RAF timestamp before their start',()=>{
 const {api,bgm,step,rafAt}=fixture();const session=api.beginEventSession();step(1000);
 api.setCinematicSilence(true,0);api.setCinematicSilence(false,200);
 assert.doesNotThrow(()=>rafAt(900));assert.equal(bgm.volume,0);
 step(100);assert.equal(bgm.volume,.175);step(100);assert.equal(bgm.volume,.35);
 api.setCinematicLevel(0,200);assert.doesNotThrow(()=>rafAt(0));assert.equal(bgm.volume,.35);
 step(100);assert.equal(bgm.volume,.175);step(100);assert.equal(bgm.volume,0);session.release();
});
