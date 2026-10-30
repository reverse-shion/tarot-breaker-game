"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const path=require("node:path");
const game=fs.readFileSync(path.join(__dirname,"../hoshisuna-main-game.js"),"utf8");

function harness(){
  const calls=[],composites=[];
  let surfaces=0;
  const document={createElement(){surfaces++;const g={clearRect(){},drawImage(...args){composites.push({op:this.globalCompositeOperation,alpha:this.globalAlpha,args});}};return {getContext:()=>g};}};
  const stack=[];
  const ctx={fillRect(){},translate(){},scale(){},beginPath(){},arc(){},stroke(){},globalAlpha:1,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},
    drawImage(...args){calls.push({kind:"atlas",alpha:this.globalAlpha,args});}};
  const scope={ctx,Math,caritasOwnerTransformationAtlas:{},CARITAS_OWNER_TILE:160,
    CARITAS_OWNER_FRAME_TIMES_MS:[800,500,500,500,230,230,240,350,370,380,600,800],
    CARITAS_MANIFESTATION_DURATION_MS:5500,window:{},document,caritasOwnerBlendSurface:null,caritasOwnerStarAtlas:null,viewportOrigin:()=>({y:0}),
    caritasOwnerMapScale:{shioponHeight:265*76/512,shionHeight:420*78/512,shioponFootOffset:0},
    SHIOPON_DRAW_HEIGHT:76,shioponImages:{},ACTOR_OUTLINES:{shiopon:{}},
    drawActor(...args){calls.push({kind:"native",alpha:ctx.globalAlpha,args});}};
  vm.createContext(scope);
  vm.runInContext(game.slice(game.indexOf("  const caritasOwnerSmooth ="),
    game.indexOf("  function drawCaritasInvocation(actor)")),scope);
  const actor={x:120,y:300,stageOffsetY:3,visualOffsetY:-2,rotation:0};
  return {calls,composites,surfaces:()=>surfaces,scope,actor,draw(ms,phase="charging"){
    calls.length=0;assert.equal(scope.drawCaritasOwnerTransformation(actor,phase,ms/5500),true);
    assert.equal(ctx.globalAlpha,1,"canvas alpha must not leak to Shion/other actors");
    return calls;
  }};
}

test("opening keeps the actual map sprite at its native size, never the generated fox",()=>{
  const h=harness();
  for(const ms of [0,350,700,850,2099]){
    const calls=h.draw(ms),native=calls.find(c=>c.kind==="native");
    assert.ok(native,"native sprite must remain visible until light covers it");
    assert.equal(native.alpha,1);
    assert.equal(native.args[2],76);
    assert.equal(native.args[4].visualOffsetY,1,"one stage offset only");
    for(const c of calls.filter(c=>c.kind==="atlas")){
      assert.equal(c.args[1],0);assert.equal(c.args[2],160,"only opaque cocoon frame 4 during opening");
    }
  }
  assert.deepEqual(h.draw(0).map(c=>c.kind),["native"]);
  assert.equal(h.draw(2200).find(c=>c.kind==="native").alpha,.5);
  assert.equal(h.draw(2300).some(c=>c.kind==="native"),false);
});

test("revealed Shioriel body matches Shion independently of horn, ears and wings",()=>{
  const h=harness();
  const render=h.draw(5500,"revealed").find(c=>c.kind==="atlas");
  const [,sx,sy,sw,sh,left,top,width,height]=render.args;
  assert.deepEqual([sx,sy,sw,sh],[480,320,160,160]);
  assert.ok(Math.abs(height*113/160-420*78/512)<1e-9);
  assert.ok(Math.abs(top+145*height/160-301)<1e-9,"sole remains at actor foot anchor");
  assert.ok(Math.abs(left+79.5*width/160-120)<1e-9);
  assert.ok(height>90,"avoid previous 77px tile which counted adornments as body height");
});

test("light handoff and final hold preserve dimensions on pause or stage boundary",()=>{
  const h=harness();
  const at=ms=>h.draw(ms).find(c=>c.kind==="atlas");
  for(const ms of [1901,2150,2300,2400,2800,3300,5499]){
    const a=at(ms),b=at(ms);
    assert.deepEqual(a,b,"same suspended clock must paint same frame and placement");
    assert.ok(a.args.slice(5).every(Number.isFinite));
  }
  const before=at(2299).args.slice(5),after=at(2300).args.slice(5);
  assert.deepEqual(before,after,"no geometry snap on cocoon handoff");
  assert.deepEqual(at(5500).args,h.draw(5500,"revealed")[0].args);
});

test("all reveal frames keep final body geometry and the event waits for the full quiet hold",()=>{
  const h=harness(),final=h.draw(5500,"revealed")[0].args.slice(5);
  for(let ms=4700;ms<=5500;ms+=20){
    const calls=h.draw(ms);assert.equal(calls.length,1);
    assert.equal(calls[0].alpha,1);
    assert.deepEqual(calls[0].args,h.draw(5500,"revealed")[0].args,"entire 800ms hold must use only final frame11");
  }
  for(let ms=3000;ms<=5500;ms+=17){
    const calls=h.draw(ms);
    assert.equal(calls.some(c=>c.kind==="native"),false);
    for(const c of calls)assert.deepEqual(c.args.slice(5),final,
      "no body growth, centre drift or foot slip while the face is visible");
  }
  const durations=JSON.parse(game.match(/CARITAS_OWNER_FRAME_TIMES_MS = Object\.freeze\((\[[^\]]+\])/)[1]);
  assert.equal(durations.reduce((a,b)=>a+b,0),5500);
  assert.equal(durations.slice(0,7).reduce((a,b)=>a+b,0),3000,"no face before cocoon resize finishes");
  assert.equal(durations.at(-1),800,"quiet final hold");
  const event=fs.readFileSync(path.join(__dirname,"../caritas-battle-event.js"),"utf8");
  assert.match(event,/stage\("manifestation",5500,/);
  assert.match(game,/const CARITAS_MANIFESTATION_DURATION_MS = 5500/);
});

test("adjacent light frames composite on a reusable transparent buffer without opacity dip",()=>{
  const h=harness();
  const calls=h.draw(3140); // halfway through the 280ms cocoon-to-face dissolve
  assert.equal(calls.length,1,"only the precomposited surface is painted over the map");
  assert.deepEqual(h.composites.map(c=>[c.op,c.alpha]),[["source-over",.5],["lighter",.5]]);
  assert.equal(h.composites.reduce((sum,c)=>sum+c.alpha,0),1,"opaque overlapping light retains full coverage");
  h.draw(3150);h.draw(4210);h.draw(4500);
  assert.equal(h.surfaces(),1,"no per-frame canvas allocation");
});
