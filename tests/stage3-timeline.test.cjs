'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {run,coveredRestore,createClock,DIALOGUE,ASSETS}=require('../future-stage3.js');
// These exercise the real sequence with simulated adapter state, not DOM/device geometry.
function harness(options={}) {
 let time=0;const controller=new AbortController();const events=[];
 const emit=(kind,...values)=>events.push({kind,values,time});
 const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
 const clock={now:()=>time,assert(){if(controller.signal.aborted){const e=new Error('cancelled');e.name='AbortError';throw e;}},
  async wait(ms){this.assert();await flush();time+=ms;this.assert();},
  async tween(ms,step){this.assert();step(0);for(const fraction of [.1,.25,.5,.75,1]){await flush();time+=ms*(fraction-(this.previousFraction||0));this.previousFraction=fraction;this.assert();step(fraction);}this.previousFraction=0;}};
 const view={rifts:{},white:0,black:0,restored:null,control:false};
 const adapter={prepare:async()=>{emit('prepare');if(options.prepareError)throw options.prepareError;},lockGeometry:()=>emit('lock'),state:(name)=>{emit('state',name);if(name===options.abortAt)controller.abort();},
  audioLevel:v=>emit('audio',v),rift:(id,opacity,scale)=>{view.rifts[id]={opacity,scale};emit('rift',id,opacity,scale);},
  async say(text){emit('say',text);await clock.wait(options.readTime||700);const close=time;emit('close',text);await clock.wait(100);return close;},
  startAbsorption:()=>emit('absorption'),absorb:v=>emit('absorb',v),white:v=>{view.white=v;emit('white',v);},black:v=>{view.black=v;emit('black',v);},
  pauseFutureAudio:()=>emit('pause'),resumeFutureAudio:()=>emit('resumeFuture'),resumePresentAudio:()=>emit('resumePresent'),presentAudioLevel:v=>emit('presentAudio',v),
  restoreFuture:async()=>{emit('restoreFuture');if(options.restoreError)throw options.restoreError;view.restored='R1';view.rifts={};},
  restorePresent:async()=>{emit('restorePresent');view.restored='P0';},draw:async()=>emit('draw',view.restored),recordHold:(name,result)=>emit('hold',name,result),
  assertPresentPrepared:()=>emit('presentPrepared'),reaction:async()=>emit('reaction'),returnControl:()=>{view.control=true;emit('control');}};
 return {clock,adapter,events,view,controller,time:()=>time};
}
const event=(h,kind,value)=>h.events.find(e=>e.kind===kind&&(value===undefined||e.values[0]===value));
const state=(h,name)=>event(h,'state',name);
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
test('T1/T33 exact registered asset paths and §78 dialogue strings',()=>{
 assert.deepEqual(ASSETS.map(a=>a.path),['01-small','02-medium','03-large','04-vortex'].map(s=>'./assets/events/gate-vision/future-fixation-rift-'+s+'.webp'));
 for(const a of ASSETS){assert.equal(a.rgbaBytes,a.width*a.height*4);assert.ok(a.anchor.x>0&&a.anchor.x<a.width&&a.anchor.y>0&&a.anchor.y<a.height);}
 assert.deepEqual(DIALOGUE,['……？','……アルカナが……？','……っ','……違う。アルカナだけじゃない……','……これが……選ばれた未来、なのか。','……私は、今……何を……？','……いや。パメラの記憶を、探さなければ。']);
});
test('T2/T3/T7/T8/T9/T12/T15/T16 timeline obeys formation and UI closure timing',async()=>{
 const h=harness();await run(h.adapter,h.clock);
 const visible=h.events.filter(e=>e.kind==='rift'&&e.values[1]>0).map(e=>e.values[0]);
 assert.deepEqual([...new Set(visible)],['small','medium','large','vortex']);
 near(event(h,'say',DIALOGUE[3]).time-state(h,'RIFT_MEDIUM').time,400);
 near(event(h,'say',DIALOGUE[4]).time-state(h,'RIFT_LARGE').time,580+350);
 near(state(h,'RIFT_LARGE').time-event(h,'close',DIALOGUE[3]).time,200);
 near(state(h,'VORTEX_EMERGENCE').time-event(h,'close',DIALOGUE[4]).time,600);
 near(state(h,'WORLD_ABSORPTION').time-state(h,'VORTEX_EMERGENCE').time,550);
 near(state(h,'FUTURE_WHITEOUT').time-state(h,'WORLD_ABSORPTION').time,1050);
 near(state(h,'FULL_WHITE').time-state(h,'FUTURE_WHITEOUT').time,340);
 near(event(h,'say',DIALOGUE[5]).time-event(h,'resumeFuture').time,350+350);
 near(event(h,'say',DIALOGUE[6]).time-event(h,'close',DIALOGUE[5]).time,550);
 near(state(h,'FUTURE_FADE').time-event(h,'close',DIALOGUE[6]).time,600);
});
test('T18 crossfade is included and scale continues after opacity reaches one',async()=>{
 const h=harness();await run(h.adapter,h.clock);
 const medium=h.events.filter(e=>e.kind==='rift'&&e.values[0]==='medium'&&e.time<=state(h,'WORLD_ANOMALY_RECOGNITION').time);
 const at100=medium.find(e=>e.time===state(h,'RIFT_MEDIUM').time+100);near(at100.values[1],1);near(at100.values[2],.985);
 near(medium.at(-1).values[2],1);assert.ok(medium.at(-1).time>at100.time);
 const large=h.events.filter(e=>e.kind==='rift'&&e.values[0]==='large'&&e.time<=state(h,'FUTURE_REALIZATION').time);
 const afterFade=large.find(e=>e.time===state(h,'RIFT_LARGE').time+145);near(afterFade.values[1],1);assert.ok(afterFade.values[2]<1);near(large.at(-1).values[2],1);
});
test('T13/T14/T17/T29 restoration under independent covers precedes dialogue/control',async()=>{
 const h=harness();await run(h.adapter,h.clock);
 assert.ok(event(h,'restoreFuture').time<event(h,'restorePresent').time);
 for(const [cover,minimum,restore] of [['white',240,'restoreFuture'],['black',180,'restorePresent']]){
  const hold=h.events.find(e=>e.kind==='hold'&&e.values[0]===cover);near(hold.values[1].elapsed,minimum);
  const full=h.events.find(e=>e.kind===cover&&e.values[0]===1);assert.ok(full.time<=event(h,restore).time);
 }
 assert.deepEqual(h.events.filter(e=>e.kind==='say').map(e=>e.values[0]),DIALOGUE.slice(3));
 assert.equal(h.view.white,0);assert.equal(h.view.black,0);assert.equal(h.view.restored,'P0');assert.equal(h.view.control,true);
 near(event(h,'reaction').time-state(h,'PRESENT_SILENCE').time,650);assert.equal(h.events.filter(e=>e.kind==='reaction').length,1);
});
test('T26 envelope values interpolate and audio pause/resume brackets covered restoration',async()=>{
 const h=harness();await run(h.adapter,h.clock);
 for(const [name,end,next] of [['RIFT_MEDIUM',.95,'WORLD_ANOMALY_RECOGNITION'],['RIFT_LARGE',.825,'FUTURE_REALIZATION'],['VORTEX_EMERGENCE',.65,'WORLD_ABSORPTION'],['FUTURE_WHITEOUT',0,'FULL_WHITE']]){
  const samples=h.events.filter(e=>e.kind==='audio'&&e.time>=state(h,name).time&&e.time<=state(h,next).time);near(samples.at(-1).values[0],end);assert.ok(samples.length>=6);
 }
 const pauses=h.events.filter(e=>e.kind==='pause');assert.equal(pauses.length,2);
 near(pauses[0].time,state(h,'FULL_WHITE').time);near(pauses[1].time,state(h,'BLACK_CUT').time);
 assert.ok(event(h,'resumeFuture').time>event(h,'restoreFuture').time);assert.ok(event(h,'resumePresent').time>event(h,'restorePresent').time);
});
test('T22 preparation and covered restoration exceptions propagate without control return',async()=>{
 for(const key of ['prepareError','restoreError']){const failure=new Error(key);const h=harness({[key]:failure});await assert.rejects(run(h.adapter,h.clock),e=>e===failure);assert.equal(h.view.control,false);assert.equal(event(h,'reaction'),undefined);if(key==='prepareError')assert.equal(event(h,'state'),undefined);}
});
test('T30 restoration deadline is separate from minimum and rejects unresolved work',async()=>{
 const h=harness();await assert.rejects(coveredRestore(h.clock,240,()=>new Promise(()=>{}),()=>{}),/covered-restore-timeout/);near(h.time(),2000);
 const next=harness();await assert.rejects(coveredRestore(next.clock,180,()=>{throw new Error('switch-failed');},()=>{}),/switch-failed/);assert.ok(next.time()<2000);
});
test('T23 cancellation prevents sequence actions and reaction/control after abort',async()=>{
 for(const abortAt of ['RIFT_SMALL','VORTEX_EMERGENCE','FUTURE_WHITEOUT','PRESENT_SILENCE']){
  const h=harness({abortAt});await assert.rejects(run(h.adapter,h.clock),{name:'AbortError'});const count=h.events.length;await Promise.resolve();assert.equal(h.events.length,count);assert.equal(h.view.control,false);assert.equal(event(h,'reaction'),undefined);
 }
});
test('createClock abort cancels queued RAF and rejects with no late tween samples',async()=>{
 let time=0,callback,id=0;const controller=new AbortController(),samples=[];
 const clock=createClock(controller.signal,{now:()=>time,raf:fn=>{callback=fn;return ++id;},cancel:()=>{callback=null;}});
 const pending=clock.tween(100,p=>samples.push(p));time=50;callback();assert.deepEqual(samples,[0,.5]);controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(callback,null);assert.deepEqual(samples,[0,.5]);
});

test('T23/T30 timed-out restoration token expires and late fulfillment cannot draw',async()=>{
 const h=harness();let resolveRestore,context,draws=0;
 const pending=coveredRestore(h.clock,240,ctx=>{context=ctx;return new Promise(resolve=>{resolveRestore=resolve;});},()=>{draws++;});
 await assert.rejects(pending,/covered-restore-timeout/);assert.equal(context.alive(),false);near(h.time(),2000);
 resolveRestore();for(let i=0;i<10;i++)await Promise.resolve();assert.equal(draws,0);
});
function browserClock(){
 const vm=require('node:vm'),fs=require('node:fs');let rawTime=0,nextID=0;const frames=new Map(),listeners=new Set();
 const document={hidden:false,addEventListener:(name,fn)=>{assert.equal(name,'visibilitychange');listeners.add(fn);},removeEventListener:(name,fn)=>listeners.delete(fn)};
 const sandbox={module:{exports:{}},document,performance:{now:()=>rawTime},requestAnimationFrame:fn=>{frames.set(++nextID,fn);return nextID;},cancelAnimationFrame:id=>frames.delete(id)};
 vm.runInNewContext(fs.readFileSync(require.resolve('../future-stage3.js'),'utf8'),sandbox);
 const controller=new AbortController(),clock=sandbox.module.exports.createClock(controller.signal);
 return {clock,controller,api:sandbox.module.exports,listeners,advance(ms){rawTime+=ms;},visibility(hidden){document.hidden=hidden;for(const fn of listeners)fn();},tick(){const work=[...frames.values()];frames.clear();for(const fn of work)fn();}};
}
const flushTasks=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
test('T23 aborted covered restore expires token and suppresses a later draw',async()=>{
 const h=browserClock();let context,resolveRestore,draws=0;
 const pending=h.api.coveredRestore(h.clock,180,ctx=>{context=ctx;return new Promise(resolve=>{resolveRestore=resolve;});},()=>{draws++;});
 await flushTasks();assert.equal(context.alive(),true);h.controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(context.alive(),false);
 resolveRestore();await flushTasks();assert.equal(draws,0);assert.equal(h.listeners.size,0);
});
test('active tween excludes hidden wall time and dispose removes visibility observer',async()=>{
 const h=browserClock(),samples=[];const pending=h.clock.tween(100,p=>samples.push(p));
 h.advance(40);h.tick();near(samples.at(-1),.4);h.visibility(true);h.advance(50000);h.tick();near(samples.at(-1),.4);near(h.clock.now(),40);
 h.visibility(false);h.advance(60);h.tick();await pending;near(samples.at(-1),1);near(h.clock.now(),100);assert.equal(h.listeners.size,1);h.clock.dispose();assert.equal(h.listeners.size,0);
});
test('T30 recovery deadline counts active execution only across hidden interval',async()=>{
 const h=browserClock();let settled=false;
 const pending=h.api.coveredRestore(h.clock,180,()=>new Promise(()=>{}),()=>{}).then(()=>{settled=true;},error=>{settled=true;throw error;});
 // Attach assertion immediately to avoid an unhandled-rejection window.
 const rejection=assert.rejects(pending,/covered-restore-timeout/);await flushTasks();
 h.advance(1000);h.tick();await flushTasks();near(h.clock.now(),1000);assert.equal(settled,false);
 h.visibility(true);h.advance(100000);h.tick();await flushTasks();near(h.clock.now(),1000);assert.equal(settled,false);
 h.visibility(false);h.advance(999);h.tick();await flushTasks();near(h.clock.now(),1999);assert.equal(settled,false);
 h.advance(1);h.tick();await rejection;near(h.clock.now(),2000);assert.equal(settled,true);h.clock.dispose();assert.equal(h.listeners.size,0);
});
