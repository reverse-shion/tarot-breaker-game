"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const event=fs.readFileSync(path.join(root,"caritas-battle-event.js"),"utf8");
const css=fs.readFileSync(path.join(root,"caritas-battle-event.css"),"utf8");
const game=fs.readFileSync(path.join(root,"hoshisuna-main-game.js"),"utf8");
const html=fs.readFileSync(path.join(root,"hoshisuna-main.html"),"utf8");
test("actual map follower steps ahead, faces camera and then manifests before combat",()=>{
 const start=event.slice(event.indexOf("function start(){"),event.indexOf("function setText("));
 const seq=['saySequence(attempts>0?INTRO.slice(-1):INTRO,()=>','saySequence(SHIOPON_REPLY,()=>','manifestation.moveForward()', 'manifestation.faceFront()','saySequence(INVOCATION,()=>','manifestation.begin()','stage("manifestation",3900','manifestation.reveal()','saySequence(REVEAL,()=>','root.hidden=false','stage("engulfing",2600,beginBattle)'];
 // Walking is started while Shiopon's spoken reply is visible (parallel actions).
 assert.ok(start.includes(seq[0]));
 assert.ok(start.includes(seq[1]));
 assert.ok(start.includes(seq[2]));
 for(const v of seq.slice(3))assert.ok(start.includes(v),"missing ordered step "+v);
 assert.match(event,/const SHIOPON_REPLY=\[\["しおぽん","はい、シオンさん。"\]\]/);
 assert.match(event,/タロット展開。いくぞ、しおぽん。/);
 assert.match(event,/speaker==="しおぽん"\?"shiopon"/);
 assert.ok(start.indexOf("saySequence(INVOCATION,()=>")<start.indexOf("stage(\"manifestation\",3900"));
 assert.ok(start.indexOf("saySequence(REVEAL,()=>")<start.indexOf("root.hidden=false"));
});
test("one real world actor preloads the approved transformation sheet",()=>{
 assert.match(game,/TarotHoshisunaManifestation=Object\.freeze/);
 assert.match(game,/caritasTransformationSheet=image/);
 assert.match(game,/\.\/assets\/events\/hoshisuna\/effects\/shiopon-to-shioriel-12frames\.png/);
 assert.match(game,/image\.naturalWidth!==1448\|\|image\.naturalHeight!==1086/);
 assert.match(game,/drawCaritasInvocation\(entry\.actor\)/);
 assert.match(game,/if\s*\(hoshisunaIsolated\s*&&\s*caritasInvocation\.locked\)/);
 assert.match(game,/performStageCommand\(\{type:"move",actor:"shiopon",target:spot,duration:780\}\)/);
 assert.match(game,/shiopon\.dir="down"/);
 assert.match(game,/if\(!collision\.isWalkable\(candidate\.x,candidate\.y\)/);
 const asset=path.join(root,"assets/events/hoshisuna/effects/shiopon-to-shioriel-12frames.png");
 assert.ok(fs.existsSync(asset),"Approved official sprite atlas must be copied into branch");
 const b=fs.readFileSync(asset);
 assert.equal(b.subarray(1,4).toString(),"PNG");
 assert.equal(b.readUInt32BE(16),1448);assert.equal(b.readUInt32BE(20),1086);
 assert.equal(b[25],6,"RGBA transparency must be preserved");
 assert.doesNotMatch(event,/cb-manifest-fox|cb-manifest-shioriel/);
 assert.doesNotMatch(css,/cb-manifest-fox|cb-manifest-shioriel/);
});
function rendererFixture(){
 const calls=[];let now=0;
 const ctx={save(){},restore(){},drawImage(...args){calls.push({args,smoothing:this.imageSmoothingEnabled})}};
 const sandbox={ctx,performance:{now:()=>now}};
 const declarations=game.slice(game.indexOf('  let caritasTransformationSheet ='),game.indexOf('  const lumiereImages ='));
 const draw=game.slice(game.indexOf('  function drawCaritasInvocation(actor)'),game.indexOf('  function drawActors()'));
 vm.runInNewContext(declarations+draw+`;globalThis.api={
   frame:caritasTransformationFrame,draw:drawCaritasInvocation,state:caritasInvocation,
   load(){caritasTransformationSheet={asset:"approved-sheet"}}};`,sandbox);
 return {api:sandbox.api,calls,clock:value=>{now=value}};
}
test("all twelve cells play once and clamp to final form without redrawing characters",()=>{
 const f=rendererFixture();f.api.load();f.api.state.phase="charging";
 const ends=[700,850,990,1140,1300,1520,1720,1870,2030,2190,2410,3910];
 let previous=0;
 for(let i=0;i<12;i++){
   const progress=((previous+ends[i])/2)/3910;
   assert.equal(f.api.frame(progress),i);
   f.clock(progress*3900);assert.equal(f.api.draw({x:250,y:300,stageOffsetY:0}),true);
   const c=f.calls.at(-1);
   assert.equal(c.smoothing,false);
   assert.deepEqual(c.args.slice(1,5),[(i%4)*362,Math.floor(i/4)*362,362,362]);
   assert.deepEqual(c.args.slice(5),[202,304-344*96/362,96,96]);
   previous=ends[i];
 }
 for(const p of [1,2,100])assert.equal(f.api.frame(p),11);
 assert.equal(f.api.frame(-1),0);
 f.api.state.phase="revealed";f.clock(90000);f.api.draw({x:250,y:300,stageOffsetY:0});
 assert.deepEqual(f.calls.at(-1).args.slice(1,5),[1086,724,362,362]);
 const draw=game.slice(game.indexOf("function drawCaritasInvocation(actor)"),game.indexOf("function drawActors()"));
 assert.doesNotMatch(draw,/createRadialGradient|shadowBlur|ellipse|drawActor\(/,
   "only the approved pixel sheet replaces the actor; no smooth glow or duplicate character");
});
test("paused active clock freezes the cell; idle or unloaded sheets leave ordinary follower rendering",()=>{
 const f=rendererFixture(),actor={x:50,y:80,stageOffsetY:3};
 f.api.state.phase="charging";
 assert.equal(f.api.draw(actor),false);assert.equal(f.calls.length,0);
 f.api.load();f.api.state.elapsed=1300;f.api.state.paused=true;
 f.clock(5000);f.api.draw(actor);const first=f.calls.at(-1).args;
 f.clock(60000);f.api.draw(actor);assert.deepEqual(f.calls.at(-1).args,first);
 f.api.state.since=60000;f.api.state.paused=false;
 f.clock(60700);f.api.draw(actor);assert.notDeepEqual(f.calls.at(-1).args.slice(1,3),first.slice(1,3));
 f.api.state.phase="idle";const count=f.calls.length;
 assert.equal(f.api.draw(actor),false);assert.equal(f.calls.length,count);
});
test("returning fade resets Shiopon BEFORE the battle overlay is hidden",()=>{
 const ending=event.slice(event.indexOf("function beginEnding()"),event.indexOf("const newEl="));
 assert.match(ending,/TarotHoshisunaManifestation\?\.clear\?\.\(\);\s*stage\("returning",900,finish\)/);
 const finish=event.slice(event.indexOf("function finish(){"),event.indexOf("function init(){"));
 assert.ok(finish.indexOf("TarotHoshisunaManifestation?.clear?.()")>=0);
 assert.ok(finish.indexOf("TarotHoshisunaManifestation?.clear?.()")<finish.indexOf("root.hidden=true"),
  "must restore actor before revealing the original map canvas");
 const clear=game.slice(game.indexOf('    clear(){'),game.indexOf('    getState:()=>({phase:caritasInvocation.phase'));
 for(const reset of [
  'caritasInvocation.phase="idle"',
  'caritasInvocation.locked=false',
  'caritasInvocation.elapsed=0',
  'caritasInvocation.paused=false',
  'caritasInvocation.since=0',
  'shiopon.frame=0',
  'shiopon.followRoute=[]'
 ])assert.ok(clear.includes(reset),"incomplete return reset: "+reset);
 assert.match(clear,/faceShioponTowardPlayer\(\)/);
});
test("isolated main dialogue, combat and device cache retained",()=>{
 assert.match(event,/window\.TarotDialogueUI\.create/);
 assert.match(event,/ids:\{layer:"dialogue-layer",advance:"dialogue-advance",speaker:"dialogue-speaker",text:"dialogue-text"\}/);
 assert.match(event,/if\(!location\.pathname\.endsWith\("\/hoshisuna-main\.html"\)\|\|params\.get\("dev"\)!=="hoshisuna"\)return;/);
 assert.match(html,/caritas-battle-event\.css\?v=resonance-special-v15/);
 assert.match(html,/hoshisuna-main-game\.js\?v=caritas-pixel-sheet-v01-20261030/);
 assert.match(html,/caritas-battle-core\.js\?v=written-reward-v1-20261029/);
 assert.match(html,/caritas-battle-event\.js\?v=resonance-special-v15/);
 const contract=JSON.parse(fs.readFileSync(path.join(root,"event-contracts.json"),"utf8"));
 assert.equal(contract.events["hoshisuna-caritas"].segments["caritas-heart-resonance"],"NOT TESTED");
});
