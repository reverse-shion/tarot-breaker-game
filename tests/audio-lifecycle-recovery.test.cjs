const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const listeners={},requests=[],frames=new Map();let bgm,frame=0,plays=0,pauses=0;
 class NativeAudio {
  constructor(){bgm=this;this.paused=true;this.currentTime=12;this.volume=0;this.muted=false;}
  setAttribute(){} addEventListener(){}
  pause(){pauses++;this.paused=true;}
  play(){
   plays++;
   if(!requests.length){this.paused=false;return Promise.resolve();}
   const request=requests.shift();request.called=true;
   // A deferred native fulfillment can change media state after pause().
   return request.promise.then(()=>{this.paused=false;});
  }
 }
 const window={addEventListener(name,callback){listeners[name]=callback;}};
 const document={hidden:false,currentScript:null,getElementById(){return null;},addEventListener(name,callback){listeners[name]=callback;}};
 vm.runInNewContext(fs.readFileSync('audio.js','utf8'),{window,document,Audio:NativeAudio,localStorage:{getItem(){return '1';},setItem(){}},performance:{now(){return 0;}},requestAnimationFrame(callback){frames.set(++frame,callback);return frame;},cancelAnimationFrame(id){frames.delete(id);},setTimeout,clearTimeout,console:{warn(){}}});
 return {api:window.TarotAudio,bgm,document,listeners,counts(){return {plays,pauses};},frame(){const callbacks=[...frames.values()];frames.clear();callbacks.forEach(callback=>callback(1000));},defer(){let resolve,reject;const request={promise:new Promise((yes,no)=>{resolve=yes;reject=no;}),resolve(){resolve();},reject(){reject(new Error('NotAllowedError'));}};requests.push(request);return request;}};
}

test('pagehide suspends ordinary BGM with hidden=false and pageshow restores interaction volume',async()=>{
 const f=fixture();f.api.startFromMovement();await flush();f.frame();f.listeners['tarot-breaker:interaction-start']();f.frame();assert.equal(f.bgm.volume,.16);
 f.listeners.pagehide();assert.equal(f.document.hidden,false);assert.equal(f.bgm.paused,true);assert.equal(f.bgm.volume,0);
 f.api.startFromMovement();f.listeners.visibilitychange();await flush();assert.equal(f.counts().plays,1);assert.equal(f.bgm.volume,0);
 f.listeners.pageshow();await flush();f.frame();assert.equal(f.bgm.paused,false);assert.equal(f.bgm.volume,.16);assert.equal(f.counts().plays,2);
});

test('ordinary return denial retries once on accepted movement without overlapping requests',async()=>{
 const f=fixture();f.api.startFromMovement();await flush();f.listeners.pagehide();const denied=f.defer();f.listeners.pageshow();denied.reject();await flush();assert.equal(f.bgm.paused,true);assert.equal(f.bgm.volume,0);
 const retry=f.defer();f.api.startFromMovement();f.api.startFromMovement();assert.equal(f.counts().plays,3);retry.resolve();await flush();f.frame();assert.equal(f.bgm.paused,false);assert.equal(f.bgm.volume,.35);
});

test('event return and movement retry retain hard mute throughout blackout and healthy release reuses transport',async()=>{
 const f=fixture();f.api.startFromMovement();await flush();f.frame();const session=f.api.beginEventSession();const p0=session.capture();session.holdSilent();f.listeners.pagehide();assert.equal(f.bgm.paused,true);assert.equal(f.bgm.muted,true);
 const denied=f.defer();f.listeners.pageshow();denied.reject();await flush();assert.equal(f.bgm.volume,0);assert.equal(f.bgm.muted,true);
 const retry=f.defer();f.api.startFromMovement();f.api.startFromMovement();assert.equal(f.counts().plays,3);retry.resolve();await flush();assert.equal(f.bgm.paused,false);assert.equal(f.bgm.volume,0);assert.equal(f.bgm.muted,true);
 session.setLevel(0);assert.equal(session.revealSilent(p0),true);assert.equal(f.bgm.muted,false);session.setLevel(.5);assert.equal(f.bgm.volume,.175);const before=f.counts();session.release();await flush();assert.deepEqual(f.counts(),before);assert.equal(f.bgm.volume,.35);
});

test('lost transport at visible reveal retains gesture retry without playing at reveal',async()=>{
 const f=fixture();f.api.startFromMovement();await flush();const session=f.api.beginEventSession();const p0=session.capture();session.holdSilent();f.listeners.pagehide();const denied=f.defer();f.listeners.pageshow();denied.reject();await flush();const before=f.counts().plays;
 assert.equal(session.revealSilent(p0),false);assert.equal(f.counts().plays,before);assert.equal(f.bgm.volume,0);f.api.startFromMovement();await flush();assert.equal(f.bgm.paused,false);assert.equal(f.bgm.muted,false);assert.equal(f.bgm.volume,.35);session.release();
});

test('event release resumes entered enabled normal BGM after return denial',async()=>{
 const f=fixture();f.api.startFromMovement();await flush();const session=f.api.beginEventSession();session.holdSilent();f.listeners.pagehide();const denied=f.defer();f.listeners.pageshow();denied.reject();await flush();session.release();await flush();f.frame();assert.equal(f.bgm.paused,false);assert.equal(f.bgm.muted,false);assert.equal(f.bgm.volume,.35);assert.equal(f.counts().plays,3);
});

test('hidden event release waits for foreground and respects disabled preference',async()=>{
 const f=fixture();f.api.startFromMovement();await flush();const session=f.api.beginEventSession();session.holdSilent();f.listeners.pagehide();session.release();await flush();assert.equal(f.counts().plays,1);assert.equal(f.bgm.paused,true);assert.equal(f.bgm.volume,0);
 f.api.setEnabled(false);f.listeners.pageshow();await flush();assert.equal(f.counts().plays,1);f.api.startFromMovement();await flush();assert.equal(f.counts().plays,1);f.api.setEnabled(true);await flush();f.frame();assert.equal(f.bgm.paused,false);assert.equal(f.bgm.volume,.35);
});

test('an ordinary late fulfillment cannot pause a newer foreground playback',async()=>{
 const f=fixture();const old=f.defer();f.api.startFromMovement();f.listeners.pagehide();const fresh=f.defer();f.listeners.pageshow();fresh.resolve();await flush();f.frame();const pauses=f.counts().pauses;old.resolve();await flush();assert.equal(f.bgm.paused,false);assert.equal(f.bgm.volume,.35);assert.equal(f.counts().pauses,pauses);assert.equal(f.counts().plays,2);
});

test('an event late fulfillment cannot pause newer normal playback after release',async()=>{
 const f=fixture();f.api.startFromMovement();await flush();const session=f.api.beginEventSession();const p0=session.pause();const old=f.defer();const pending=session.resume(p0);const fresh=f.defer();session.release();fresh.resolve();await flush();f.frame();const pauses=f.counts().pauses;old.resolve();assert.equal(await pending,false);await flush();assert.equal(f.bgm.paused,false);assert.equal(f.bgm.muted,false);assert.equal(f.bgm.volume,.35);assert.equal(f.counts().pauses,pauses);
});

test('a retired native rejection cannot stop newer ordinary playback',async()=>{
 const f=fixture();const old=f.defer();f.api.startFromMovement();f.listeners.pagehide();f.listeners.pageshow();await flush();f.frame();const pauses=f.counts().pauses;old.reject();await flush();assert.equal(f.bgm.paused,false);assert.equal(f.bgm.volume,.35);assert.equal(f.counts().pauses,pauses);
});

test('late ordinary completion while pagehidden is stopped and stays inaudible',async()=>{
 const f=fixture();const old=f.defer();f.api.startFromMovement();f.listeners.pagehide();old.resolve();await flush();assert.equal(f.bgm.paused,true);assert.equal(f.bgm.volume,0);assert.equal(f.counts().plays,1);
});

test('event timeout retires native play and gesture retry survives its eventual fulfillment',async()=>{
 const f=fixture();f.api.startFromMovement();await flush();const session=f.api.beginEventSession();const p0=session.pause();const old=f.defer();assert.equal(await session.resume(p0),false);assert.equal(f.bgm.paused,true);assert.equal(f.bgm.volume,0);
 const retry=f.defer();f.api.startFromMovement();retry.resolve();await flush();assert.equal(f.bgm.paused,false);assert.equal(f.bgm.volume,.35);const pauses=f.counts().pauses;old.resolve();await flush();assert.equal(f.bgm.paused,false);assert.equal(f.counts().pauses,pauses);session.release();
});

test('explicit event pause stays stopped on pageshow until normal session release',async()=>{
 const f=fixture();f.api.startFromMovement();await flush();const session=f.api.beginEventSession();session.pause();f.listeners.pagehide();f.listeners.pageshow();f.api.startFromMovement();await flush();assert.equal(f.counts().plays,1);assert.equal(f.bgm.paused,true);assert.equal(f.bgm.muted,true);session.release();await flush();assert.equal(f.bgm.paused,false);
});

test('turning normal audio back on cancels a queued OFF pause synchronously',async()=>{
 const f=fixture();f.api.startFromMovement();await flush();f.frame();f.api.setEnabled(false);f.api.setEnabled(true);f.frame();assert.equal(f.bgm.paused,false);assert.equal(f.bgm.volume,.35);assert.equal(f.counts().plays,1);
});
