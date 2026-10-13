'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('game.js','utf8');
// Include the actual optional-argument function, not an implementation imitation.
const loadStart=source.indexOf('  function loadVisionWorld(');
const actualLoader=source.slice(loadStart,source.indexOf('  function drawVisionWorld()',loadStart));
const entryStart=source.indexOf('  window.TarotVisionWorld = Object.freeze({');
const entry=source.slice(entryStart,source.indexOf('  window.TarotActorScreenAnchor = Object.freeze({',entryStart));
async function flush(){for(let i=0;i<12;i++)await Promise.resolve();}
function fixture(){
 const images=[],timers=new Map(),scenery=[];let nextTimer=0;
 class Image {
  constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;images.push(this);}
  set src(value){this._src=value;}
  get src(){return this._src;}
  async decode(){if(this.decodeWait)await this.decodeWait;if(this.decodeError)throw this.decodeError;}
 }
 const state={image:null,src:'',active:false,opacity:0,token:0};
 const c={window:{},visionWorld:state,Image,scale:{x:1,y:1},world:{w:1448,h:1086},
  setVisionScenery:value=>scenery.push(value),clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),
  setTimeout(fn,ms){timers.set(++nextTimer,{fn,ms});return nextTimer;},clearTimeout(id){timers.delete(id);}};
 vm.runInNewContext(actualLoader+entry,c);
 return {api:c.window.TarotVisionWorld,state,images,timers,scenery,
  async load(image){image.complete=true;image.naturalWidth=1024;image.naturalHeight=1536;const loaded=image.onload;assert.equal(typeof loaded,'function');await loaded();await flush();},
  expire(){const timer=[...timers.values()][0];assert.ok(timer);assert.equal(timer.ms,10000);timer.fn();}};
}
test('Vision entry reuses Stage3 decoded image without a second load and preserves normal activation',async()=>{
 const h=fixture(),prepared={complete:true,naturalWidth:1024,naturalHeight:1536};
 const controller=new AbortController();await h.api.begin('ruins',{signal:controller.signal,prepared});
 assert.equal(h.images.length,0);assert.equal(h.state.image,prepared);assert.equal(h.state.src,'ruins');assert.equal(h.state.active,true);
 assert.deepEqual(h.scenery,[true]);assert.equal(h.timers.size,0);
});
test('legacy unprepared Vision entry succeeds, caches image, and removes deadline',async()=>{
 const h=fixture(),pending=h.api.begin('ruins');await h.load(h.images[0]);await pending;
 assert.equal(h.state.active,true);assert.equal(h.timers.size,0);assert.equal(h.images[0].onload,null);
 await h.api.begin('ruins');assert.equal(h.images.length,1);assert.deepEqual(h.scenery,[true,true]);
});
test('abort while image is pending rejects without waiting for load; captured late onload cannot mutate scene',async()=>{
 const h=fixture(),controller=new AbortController();const pending=h.api.begin('old',{signal:controller.signal});
 const rejection=assert.rejects(pending,{name:'AbortError'});const image=h.images[0],late=image.onload;
 controller.abort();await rejection;assert.equal(h.timers.size,0);assert.equal(h.state.active,false);assert.equal(image.onload,null);
 const prepared={complete:true,naturalWidth:1024,naturalHeight:1536};await h.api.begin('new',{prepared});
 image.complete=true;image.naturalWidth=1024;image.naturalHeight=1536;await late();await flush();
 assert.equal(h.state.image,prepared);assert.equal(h.state.src,'new');assert.equal(h.state.active,true);assert.deepEqual(h.scenery,[true]);
});
test('abort during decode promptly rejects and late decode cannot overwrite the newer entry',async()=>{
 const h=fixture(),controller=new AbortController();const pending=h.api.begin('old',{signal:controller.signal});
 const rejection=assert.rejects(pending,{name:'AbortError'});let resolve;
 h.images[0].decodeWait=new Promise(r=>resolve=r);const loading=h.load(h.images[0]);await flush();controller.abort();await rejection;
 const prepared={complete:true,naturalWidth:1024,naturalHeight:1536};await h.api.begin('new',{prepared});resolve();await loading;
 assert.equal(h.state.src,'new');assert.equal(h.state.image,prepared);assert.deepEqual(h.scenery,[true]);assert.equal(h.timers.size,0);
});
test('load and decode deadlines reject and late fulfillment cannot reactivate the scene',async()=>{
 for(const decode of [false,true]){
  const h=fixture(),pending=h.api.begin('ruins');const rejection=assert.rejects(pending,/image\/decode deadline/);
  let resolve,loading;
  if(decode){h.images[0].decodeWait=new Promise(r=>resolve=r);loading=h.load(h.images[0]);await flush();}
  const late=h.images[0].onload;h.expire();await rejection;h.api.end();
  if(decode){resolve();await loading;}else{h.images[0].naturalWidth=1024;h.images[0].naturalHeight=1536;await late();}
  assert.equal(h.state.active,false);assert.equal(h.state.image,null);assert.equal(h.state.src,'');assert.deepEqual(h.scenery,[false]);assert.equal(h.timers.size,0);
 }
});
test('end or newer begin invalidates awaited activation even if cached/prepared loading already resolved',async()=>{
 const prepared={complete:true,naturalWidth:1024,naturalHeight:1536};
 const h=fixture(),old=h.api.begin('old',{prepared});const stopped=assert.rejects(old,{name:'AbortError'});h.api.end();await stopped;
 assert.equal(h.state.active,false);assert.deepEqual(h.scenery,[false]);
 const h2=fixture(),p=h2.api.begin('old',{prepared}),expired=assert.rejects(p,{name:'AbortError'});
 await h2.api.begin('new',{prepared});await expired;assert.equal(h2.state.src,'new');assert.deepEqual(h2.scenery,[true]);
});
test('already-aborted entry never creates an image or activates scenery',async()=>{
 const h=fixture(),controller=new AbortController();controller.abort();
 await assert.rejects(h.api.begin('ruins',{signal:controller.signal}),{name:'AbortError'});
 assert.equal(h.images.length,0);assert.equal(h.timers.size,0);assert.equal(h.state.active,false);assert.deepEqual(h.scenery,[]);
});
test('load/decode errors and invalid decoded image reject cleanly without activation',async()=>{
 for(const failure of ['load','decode','empty']){
  const h=fixture(),pending=h.api.begin('ruins');const rejected=assert.rejects(pending);
  const image=h.images[0];
  if(failure==='load')image.onerror();
  else if(failure==='decode'){image.decodeError=Error('decode failure');await h.load(image);}
  else await image.onload();
  await rejected;assert.equal(h.timers.size,0);assert.equal(h.state.active,false);assert.deepEqual(h.scenery,[]);
 }
});
