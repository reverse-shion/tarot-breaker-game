"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../hoshisuna-main-game.js"),"utf8");
function fixture({isolated=true,phase="charging",reduced=false}={}){
  const calls=[],stack=[];let allocations=0,ms=0,sourceX=0;
  const gradient=()=>({addColorStop(){}});
  const ctx={globalAlpha:.8,globalCompositeOperation:"source-over",shadowBlur:0,
    save(){stack.push([this.globalAlpha,this.globalCompositeOperation,this.shadowBlur]);},
    restore(){[this.globalAlpha,this.globalCompositeOperation,this.shadowBlur]=stack.pop();},
    createRadialGradient:gradient,createLinearGradient:gradient,
    fillRect(...args){calls.push({kind:"fill",args});},translate(){},scale(){},rotate(){},
    beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},fill(){calls.push({kind:"curtain"});},
    drawImage(...args){calls.push({kind:"sprite",args,alpha:this.globalAlpha,op:this.globalCompositeOperation});}};
  const image={},player={x:200,y:300,stageOffsetY:2},shiopon={x:160,y:270,stageOffsetY:3,visualOffsetY:-2};
  const scope={ctx,Math,hoshisunaIsolated:isolated,caritasInvocation:{phase},
    caritasChant:{phase:"idle"},
    caritasInvocationProgress:()=>ms/5500,CARITAS_MANIFESTATION_DURATION_MS:5500,
    window:{matchMedia:()=>({matches:reduced})},viewportOrigin:()=>({x:20,y:30}),
    cssWidth:390,cssHeight:700,camera:{zoom:1.5},player,shiopon,caritasOwnerMapScale:{shionHeight:64,shioponHeight:40},
    FRAME:{w:384,h:512,baseline:480},spriteFrame:()=>({image,sourceX}),caritasResonanceSprites:null,
    document:{createElement(){allocations++;const g={imageSmoothingEnabled:false,clearRect(){},drawImage(){calls.push({kind:"cache"});},fillRect(){assert.equal(this.globalCompositeOperation,"source-in");}};return {getContext:()=>g};}}};
  vm.createContext(scope);vm.runInContext(source.slice(source.indexOf("  // Invocation-only light:"),source.indexOf("  // The small sprite atlas")),scope);
  return {scope,ctx,calls,allocations:()=>allocations,at(t){ms=t;calls.length=0;},frame(x){sourceX=x;}};
}
test("completed chant carries a restrained synchronized glow into the transformation",()=>{
  const {scope:s}=fixture();
  const first=s.caritasResonanceAt(0);
  assert.ok(first.shion>0&&first.shion<=.7);
  assert.equal(first.shion,first.shiopon,"post-chant transformation starts with shared color and strength");
  assert.equal(s.caritasResonanceAt(400).shion,s.caritasResonanceAt(400).shiopon);
  const peak=s.caritasResonanceAt(1300);assert.equal(peak.shion,peak.shiopon);assert.ok(peak.shion>0&&peak.shion<=.7);
  assert.equal(s.caritasResonanceAt(800).sky,0);assert.ok(s.caritasResonanceAt(1450).sky>.9);
  assert.equal(s.caritasResonanceAt(2850).sky,0);
  for(const ms of [0,400,1400,2200,3000,4300,4700,5500]){
    const a=s.caritasResonanceAt(ms);assert.deepEqual(a,s.caritasResonanceAt(ms));
    assert.ok(Object.values(a).every(n=>n>=0&&n<=1));
  }
  for(const ms of [4700,5500])assert.ok(Object.values(s.caritasResonanceAt(ms)).every(n=>n===0));
});
test("world light is confined to isolated charging; idle, revealed and static hold draw nothing",()=>{
  for(const options of [{isolated:false},{phase:"idle"},{phase:"revealed"}]){
    const f=fixture(options);f.at(1400);assert.equal(f.scope.caritasResonanceElapsed(),-1);
    f.scope.paintCaritasResonanceWorld();assert.equal(f.calls.length,0);
  }
  const f=fixture();f.at(1500);f.scope.paintCaritasResonanceWorld();
  assert.equal(f.calls.filter(x=>x.kind==="curtain").length,3);
  assert.deepEqual(f.calls[0].args,[20,30,260,700/1.5]);
  assert.equal(f.ctx.globalAlpha,.8);assert.equal(f.ctx.globalCompositeOperation,"source-over");
  for(const ms of [4700,5500]){f.at(ms);f.scope.paintCaritasResonanceWorld();assert.equal(f.calls.length,0);}
});
test("actor illumination follows exact source alpha, frame, foot and size, with bounded cached allocation",()=>{
  const f=fixture(),s=f.scope;
  const paint=()=>s.paintCaritasResonantActor(s.player,{},78,2,"shion",1400);
  paint();const first=f.calls.find(c=>c.kind==="sprite");
  assert.deepEqual(first.args.slice(5),[200-384*78/512/2,302-480*78/512,384*78/512,78]);
  assert.equal(first.op,"screen");assert.ok(first.alpha>0&&first.alpha<=.8*.26);
  paint();assert.equal(f.calls.filter(c=>c.kind==="cache").length,1);
  f.frame(384);paint();assert.equal(f.calls.filter(c=>c.kind==="cache").length,2);
  assert.equal(f.allocations(),1);
  s.paintCaritasResonantActor(s.shiopon,{},76,1,"shiopon",1400);assert.equal(f.allocations(),2);
  assert.equal(f.ctx.globalAlpha,.8);assert.equal(f.ctx.globalCompositeOperation,"source-over");assert.equal(f.ctx.shadowBlur,0);
  f.at(4700);s.paintCaritasResonantActor(s.player,{},78,2,"shion",4700);assert.equal(f.calls.length,0);
});
test("reduced motion keeps identical steady post-chant actor illumination",()=>{
  const {scope:s}=fixture({reduced:true});
  assert.equal(s.caritasResonanceAt(1200,true).shion,.7);
  assert.equal(s.caritasResonanceAt(2000,true).shion,.7);
  assert.equal(s.caritasResonanceAt(300,true).shion,.7);
  assert.equal(s.caritasResonanceAt(1200,true).shion,s.caritasResonanceAt(1200,true).shiopon);
});
test("real actor pass lights Shion after native sprite, keeps sky behind actors, and releases tint caches",()=>{
  const actors=source.slice(source.indexOf("  function drawActors()"),source.indexOf("  function traceRefShape"));
  assert.ok(actors.indexOf("paintCaritasResonanceWorld();")<actors.indexOf("const actors ="));
  assert.match(actors,/if\(actorId==="shion"\)paintCaritasResonantActor/);
  assert.match(source,/caritasOwnerStarAtlas=null;caritasResonanceSprites=null;/);
  assert.match(source,/paintCaritasResonantActor\(actor,shioponImages,SHIOPON_DRAW_HEIGHT,/);
});
