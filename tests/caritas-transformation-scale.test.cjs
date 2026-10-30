"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const path=require("node:path");
const game=fs.readFileSync(path.join(__dirname,"../hoshisuna-main-game.js"),"utf8");

function harness(){
  const calls=[];
  const stack=[];
  const ctx={globalAlpha:1,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},
    drawImage(...args){calls.push({kind:"atlas",alpha:this.globalAlpha,args});}};
  const scope={ctx,Math,caritasOwnerTransformationAtlas:{},CARITAS_OWNER_TILE:160,
    CARITAS_OWNER_FRAME_TIMES_MS:[700,150,140,150,160,220,200,150,160,160,220,1500],
    caritasOwnerMapScale:{shioponHeight:265*76/512,shionHeight:420*78/512,shioponFootOffset:0},
    SHIOPON_DRAW_HEIGHT:76,shioponImages:{},ACTOR_OUTLINES:{shiopon:{}},
    drawActor(...args){calls.push({kind:"native",alpha:ctx.globalAlpha,args});}};
  vm.createContext(scope);
  vm.runInContext(game.slice(game.indexOf("  function drawCaritasOwnerTransformation("),
    game.indexOf("  function drawCaritasInvocation(actor)")),scope);
  const actor={x:120,y:300,stageOffsetY:3,visualOffsetY:-2,rotation:0};
  return {calls,scope,actor,draw(ms,phase="charging"){
    calls.length=0;assert.equal(scope.drawCaritasOwnerTransformation(actor,phase,ms/3900),true);
    assert.equal(ctx.globalAlpha,1,"canvas alpha must not leak to Shion/other actors");
    return calls;
  }};
}

test("opening keeps the actual map sprite at its native size, never the generated fox",()=>{
  const h=harness();
  for(const ms of [0,350,700,850,990]){
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
  assert.equal(h.draw(1100).find(c=>c.kind==="native").alpha,1-100/140);
  assert.equal(h.draw(1140).some(c=>c.kind==="native"),false);
});

test("revealed Shioriel body matches Shion independently of horn, ears and wings",()=>{
  const h=harness();
  const render=h.draw(3900,"revealed").find(c=>c.kind==="atlas");
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
  for(const ms of [701,1050,1140,1500,1900,2400,3899]){
    const a=at(ms),b=at(ms);
    assert.deepEqual(a,b,"same suspended clock must paint same frame and placement");
    assert.ok(a.args.slice(5).every(Number.isFinite));
  }
  const before=at(1139).args.slice(5),after=at(1140).args.slice(5);
  assert.deepEqual(before,after,"no geometry snap on cocoon handoff");
  assert.deepEqual(at(3900).args,h.draw(3900,"revealed")[0].args);
});
