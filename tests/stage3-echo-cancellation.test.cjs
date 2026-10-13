'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('star-gate-anomaly.js','utf8');
const echo=source.slice(source.indexOf('async function playFutureShionEntryEcho(){'),source.indexOf('function positionArcanaSurgeFromPose03(){'));
const entry=source.slice(source.indexOf(' setShion(1);',source.indexOf('async function futureFixationStage3(){')),source.indexOf(' const currentTurnsToFuture=',source.indexOf('async function futureFixationStage3(){')));
async function flush(){for(let i=0;i<20;i++)await Promise.resolve();}
function fixture(){
 let now=0,next=0;const frames=new Map(),controller=new AbortController(),changes=[];
 const clock=require('../future-stage3.js').createClock(controller.signal,{now:()=>now,raf:fn=>{frames.set(++next,fn);return next},cancel:id=>frames.delete(id)});
 const main={src:'pose'},ghost={classList:{add:name=>changes.push('add:'+name),remove:name=>changes.push('remove:'+name)},removeAttribute:name=>changes.push('remove-attr:'+name)};
 const c={root:{querySelector:sel=>sel==='.sga-shion-main'?main:ghost},setShion(){},alignFutureShionElement(){},pause:ms=>clock.wait(ms)};
 vm.createContext(c);vm.runInContext(echo,c);
 return {controller,changes,clock,frames,start:()=>vm.runInContext('(async()=>{'+entry+'})()',c),
  tick(ms){now+=ms;const queued=[...frames.values()];frames.clear();queued.forEach(f=>f())}};
}
test('Future Shion echo preserves 500ms echo and 760ms entry hold',async()=>{
 const h=fixture();let done=false;const p=h.start().then(()=>done=true);
 h.tick(499);await flush();assert.equal(done,false);assert.deepEqual(h.changes,['add:sga-future-entry-echo']);
 h.tick(1);await flush();assert.ok(h.changes.includes('remove:sga-future-entry-echo'));assert.equal(done,false);
 h.tick(259);await flush();assert.equal(done,false);h.tick(1);await p;assert.equal(done,true);h.clock.dispose();
});
test('abort before/after echo completion observes both promises and leaves no queued frames',async()=>{
 const unhandled=[];const listener=error=>unhandled.push(String(error));process.on('unhandledRejection',listener);
 try{
  for(const at of [0,250,499,500,759]){
   const h=fixture(),p=h.start(),rejected=assert.rejects(p,{name:'AbortError'});h.tick(at);await flush();h.controller.abort();await rejected;
   assert.equal(h.frames.size,0);h.clock.dispose();
  }
  await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(unhandled,[]);
 }finally{process.removeListener('unhandledRejection',listener);}
});
