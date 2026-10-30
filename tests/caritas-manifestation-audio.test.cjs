"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../caritas-manifestation-audio.js"),"utf8");
function fixture({enabled=true,hidden=false,url="/hoshisuna-main.html",broken=false}={}){
  const contexts=[];
  const param=()=>({events:[],value:0,setValueAtTime(...a){this.events.push(["set",...a]);},linearRampToValueAtTime(...a){this.events.push(["linear",...a]);},exponentialRampToValueAtTime(...a){this.events.push(["exponential",...a]);}});
  class Context{
    constructor(){if(broken)throw Error("audio unavailable");this.currentTime=0;this.state="suspended";this.voices=[];this.gains=[];contexts.push(this);}
    createGain(){const n={gain:param(),connect(){},disconnect(){}};this.gains.push(n);return n;}
    createOscillator(){const n={frequency:param(),connect(){},disconnect(){},start(t){this.startAt=t;},stop(t){this.stopAt=t;}};this.voices.push(n);return n;}
    resume(){this.state="running";return Promise.resolve();}
    suspend(){this.state="suspended";return Promise.resolve();}
    close(){this.state="closed";return Promise.resolve();}
  }
  const window={TarotAudio:{enabled},AudioContext:Context};
  const document={hidden};
  vm.runInNewContext(source,{window,document,location:{pathname:url,search:"?dev=hoshisuna"},URLSearchParams,Promise});
  return {api:window.TarotCaritasManifestationAudio,window,document,contexts};
}
test("invocation sound has a cocoon gap, one reveal chord, and no background music writes",async()=>{
  const f=fixture();assert.equal(f.api.begin(),true);await Promise.resolve();
  const c=f.contexts[0];assert.equal(c.voices.length,5);
  assert.deepEqual(c.voices.map(v=>v.startAt),[1,1.08,3,3,3]);
  assert.ok(c.voices.slice(0,2).every(v=>v.stopAt<2.33));
  assert.ok(c.voices.slice(2).every(v=>v.stopAt<=4.17));
  assert.equal(f.window.TarotAudio.enabled,true);
  assert.equal(c.gains[0].gain.value,.09);
});
test("pause/resume suspends its own audio clock; clear and repeated begin close old contexts",async()=>{
  const f=fixture();f.api.begin();await Promise.resolve();const old=f.contexts[0];
  f.api.pause();assert.equal(old.state,"suspended");
  f.document.hidden=true;f.api.resume();assert.equal(old.state,"suspended");
  f.document.hidden=false;f.api.resume();assert.equal(old.state,"running");
  f.api.begin();assert.equal(old.state,"closed");assert.equal(old.gains[0].gain.value,0);
  const next=f.contexts[1];f.api.clear();assert.equal(next.state,"closed");
  await Promise.resolve();assert.equal(next.state,"closed","stale resume must not resurrect a cleared sound");
  assert.doesNotThrow(()=>f.api.clear());
});
test("muting, hidden start, unsupported audio and other maps fail silently without changing event state",()=>{
  for(const options of [{enabled:false},{hidden:true},{broken:true}]){
    const f=fixture(options);assert.equal(f.api.begin(),false);assert.equal(f.contexts.length,0);
  }
  const f=fixture();f.api.begin();f.window.TarotAudio.enabled=false;f.api.syncMute();
  assert.equal(f.contexts[0].state,"closed");assert.equal(f.window.TarotAudio.enabled,false);
  assert.equal(fixture({url:"/index.html"}).api,undefined);
});
