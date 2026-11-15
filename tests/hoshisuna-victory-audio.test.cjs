const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const OWNER='hoshisuna_caritas_prompt';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({readyState=4,deferred=false,webAudio=false,decodeFails=false}={}){
 const win=new EventTarget(),doc=new EventTarget();doc.hidden=false;
 let plays=0,pauses=0,music,now=0,frameId=0;const resolvers=[],frames=new Map();
 class NativeAudio{
  constructor(src){this.src=src;this.loop=false;this.muted=false;this.volume=1;
   this.paused=true;this.readyState=readyState;this.currentTime=0;this.events={};music=this;}
  setAttribute(){}
  addEventListener(type,cb){this.events[type]=cb;}
  fire(type){this.events[type]?.();}
  play(){plays++;this.paused=false;return deferred?new Promise(resolve=>resolvers.push(resolve)):Promise.resolve();}
  pause(){pauses++;this.paused=true;}
 }
 const window={TarotAudio:{enabled:true},addEventListener:win.addEventListener.bind(win)};
 const ramps=[],starts=[];
 let contexts=0,bufferStops=0;
 if(webAudio){
  window.navigator={platform:'iPhone'};
  window.OfflineAudioContext=class{
   decodeAudioData(){
    return decodeFails?Promise.reject(Error('unsupported decode')):Promise.resolve({duration:94});
   }
  };
  window.AudioContext=class{
   constructor(){contexts++;this.currentTime=5;this.state='suspended';this.destination={};}
   resume(){this.state='running';return Promise.resolve();}
   createGain(){return {connect(){},disconnect(){},gain:{setValueAtTime(){},
    linearRampToValueAtTime:(value,time)=>ramps.push([value,time])}};}
   createBufferSource(){
    return {connect(){},disconnect(){},start:(...args)=>starts.push(args),stop:()=>bufferStops++};
   }
   createMediaElementSource(){throw Error('The native victory track must not be rerouted');}
  };
 }
 const document={get hidden(){return doc.hidden;},addEventListener:doc.addEventListener.bind(doc)};
 vm.runInNewContext(fs.readFileSync(path.join(root,'hoshisuna-victory-audio.js'),'utf8'),
  {window,document,Audio:NativeAudio,console,performance:{now:()=>now},
   fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}),
   requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id)});
 function emit(type,source,detail={}){
  const e=new Event(type);
  if(source!==undefined)Object.defineProperty(e,'detail',{value:{source,...detail}});
  win.dispatchEvent(e);
 }
 return {emit,doc,music,ramps,starts,counts:()=>({plays,pauses,contexts,bufferStops}),
  frame(at){now=at;const callbacks=[...frames.values()];frames.clear();for(const fn of callbacks)fn(at);},
  resolve(){for(const fn of resolvers.splice(0))fn();}};
}

test('victory stays muted during encounter and combat; ordinary battle stop is not victory',async()=>{
 const f=fixture();
 assert.equal(f.music.src,'./assets/battle/bgm/Courage%20to%20Begin%20Again.m4a');
 f.emit('pointerdown');
 f.emit('tarot-breaker:interaction-start',OWNER);
 f.emit('pointerdown');
 assert.equal(f.counts().plays,0);
 f.emit('tarot-breaker:hoshisuna-battle-start');
 f.emit('pointerdown');await flush();
 assert.equal(f.counts().plays,1);
 assert.equal(f.music.muted,true);
 assert.equal(f.music.loop,true);
 f.emit('tarot-breaker:hoshisuna-battle-stop');
 assert.equal(f.music.muted,true);
});

test('purification restarts from the first note exactly once and map return stops the cue',async()=>{
 const f=fixture();
 f.emit('tarot-breaker:interaction-start',OWNER);
 f.emit('tarot-breaker:hoshisuna-battle-start');
 f.emit('pointerdown');await flush();
 f.music.currentTime=55;
 f.emit('tarot-breaker:hoshisuna-victory-start','other');
 assert.equal(f.music.muted,true);
 f.emit('tarot-breaker:hoshisuna-victory-start',OWNER);
 assert.equal(f.music.currentTime,0);
 assert.equal(f.music.loop,false);
 assert.equal(f.music.muted,false);
 assert.equal(f.music.volume,.42);
 f.emit('tarot-breaker:hoshisuna-victory-start',OWNER);
 assert.equal(f.counts().plays,1);
 f.emit('tarot-breaker:hoshisuna-victory-stop',OWNER);
 assert.equal(f.music.muted,true);
 assert.equal(f.music.paused,true);
});

test('the victory handoff fades from the current gain to zero before release',async()=>{
 const f=fixture();
 f.emit('tarot-breaker:interaction-start',OWNER);
 f.emit('tarot-breaker:hoshisuna-battle-start');
 f.emit('pointerdown');await flush();
 f.emit('tarot-breaker:hoshisuna-victory-start',OWNER);
 f.emit('tarot-breaker:hoshisuna-victory-fade',OWNER,{duration:1200});
 f.frame(600);
 assert.equal(f.music.volume,.21);
 f.emit('pointerdown');await flush();
 assert.equal(f.music.volume,.21,'a gesture during fade does not restore full volume');
 f.frame(1200);
 assert.equal(f.music.volume,0);
 f.emit('tarot-breaker:hoshisuna-victory-stop',OWNER);
 assert.equal(f.music.paused,true);
 assert.equal(f.music.muted,true);
});

test('victory plays natively and only its final light transition uses the buffered tail',async()=>{
 const f=fixture({webAudio:true});
 f.emit('tarot-breaker:interaction-start',OWNER);
 f.emit('tarot-breaker:hoshisuna-battle-start');
 f.emit('pointerdown');await flush();
 f.music.currentTime=40;
 f.emit('tarot-breaker:hoshisuna-victory-start',OWNER);
 assert.equal(f.music.currentTime,0);
 assert.equal(f.music.paused,false);
 assert.equal(f.music.muted,false);
 assert.equal(f.music.volume,.42);
 assert.equal(f.counts().contexts,0,'no live audio context before the final fade');
 f.music.currentTime=8.5;
 f.emit('tarot-breaker:hoshisuna-victory-fade',OWNER,{duration:1200});
 await flush();
 assert.deepEqual(f.starts,[[5,8.5,1.2]]);
 assert.deepEqual(f.ramps,[[0,6.2]]);
 assert.equal(f.music.muted,true);
 assert.equal(f.music.paused,true);
 f.emit('tarot-breaker:hoshisuna-victory-stop',OWNER);
 assert.equal(f.counts().bufferStops,1);
});

test('failure to decode the fade buffer leaves the original victory track playing',async()=>{
 const f=fixture({webAudio:true,decodeFails:true});
 f.emit('tarot-breaker:interaction-start',OWNER);
 f.emit('tarot-breaker:hoshisuna-battle-start');
 f.emit('pointerdown');await flush();
 f.emit('tarot-breaker:hoshisuna-victory-start',OWNER);
 assert.equal(f.music.muted,false);
 f.emit('tarot-breaker:hoshisuna-victory-fade',OWNER,{duration:1200});
 await flush();f.frame(600);
 assert.equal(f.counts().contexts,0);
 assert.equal(f.music.paused,false);
 assert.equal(f.music.muted,false);
 assert.equal(f.music.volume,.21);
});

test('cancellation invalidates late native permission, and backgrounding pauses',async()=>{
 const f=fixture({deferred:true});
 f.emit('tarot-breaker:interaction-start',OWNER);
 f.emit('tarot-breaker:hoshisuna-battle-start');
 f.emit('pointerdown');
 f.emit('tarot-breaker:hoshisuna-victory-start',OWNER);
 assert.equal(f.music.muted,true);
 f.emit('tarot-breaker:hoshisuna-victory-stop',OWNER);
 f.resolve();await flush();
 assert.equal(f.music.muted,true);
 assert.equal(f.music.paused,true);
 f.emit('tarot-breaker:hoshisuna-battle-start');
 f.emit('pointerdown');f.resolve();await flush();
 f.emit('tarot-breaker:hoshisuna-victory-start',OWNER);
 f.doc.hidden=true;
 f.doc.dispatchEvent(new Event('visibilitychange'));
 assert.equal(f.music.paused,true);
 assert.equal(f.music.muted,true);
});

test('missing metadata keeps the track muted until it can seek to zero',async()=>{
 const f=fixture({readyState:0});
 f.emit('tarot-breaker:interaction-start',OWNER);
 f.emit('tarot-breaker:hoshisuna-battle-start');
 f.emit('pointerdown');await flush();
 f.emit('tarot-breaker:hoshisuna-victory-start',OWNER);
 assert.equal(f.music.muted,true);
 f.music.readyState=4;f.music.fire('loadedmetadata');
 assert.equal(f.music.currentTime,0);
 assert.equal(f.music.muted,false);
});

test('uploaded victory audio is included in the isolated Hoshisuna scene',()=>{
 const html=fs.readFileSync(path.join(root,'hoshisuna-main.html'),'utf8');
 const event=fs.readFileSync(path.join(root,'caritas-battle-event.js'),'utf8');
 const audio=fs.readFileSync(path.join(root,'assets/battle/bgm/Courage to Begin Again.m4a'));
 assert.equal(audio.length,1722538);
 assert.match(html,/hoshisuna-victory-audio\.js\?v=1/);
 assert.match(event,/if\(p==='CARITAS_REPLY'\)[\s\S]*?hoshisuna-victory-start/);
 assert.match(event,/function showFarewellOnMap\(\)[\s\S]*?hoshisuna-victory-stop[\s\S]*?hoshisuna-field-return-cue/);
});
