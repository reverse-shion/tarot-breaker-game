"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const game=fs.readFileSync(path.join(__dirname,"../hoshisuna-main-game.js"),"utf8");

function setup(){
  let now=800,draws=[],gradients=0,maskLayers=[];
  const stack=[];
  const ctx={
    globalAlpha:1,shadowBlur:0,fillStyle:null,strokeStyle:null,
    save(){stack.push({a:this.globalAlpha,blur:this.shadowBlur});},
    restore(){const s=stack.pop();this.globalAlpha=s.a;this.shadowBlur=s.blur;},
    drawImage(...args){draws.push({kind:"image",args});},
    fillRect(...args){draws.push({kind:"fill",args});},
    strokeRect(...args){draws.push({kind:"outline",args});},
    createRadialGradient(){gradients++;return{addColorStop(){}};}
  };
  const scope={ctx,Math,hoshisunaIsolated:true,performance:{now:()=>now},
    document:{createElement:()=>({width:0,height:0,getContext:()=>({
      clearRect(){},drawImage(){maskLayers.push("source");},
      fillRect(){maskLayers.push("tint");},globalCompositeOperation:"source-over"
    })})},
    window:{matchMedia:()=>({matches:false})},camera:{zoom:1.1},
    player:{x:800,y:350,stageOffsetY:0},
    shiopon:{x:727,y:333,stageOffsetY:0,visualOffsetY:0},
    caritasOwnerMapScale:{shionHeight:60,shioponHeight:44},
    caritasTarotSpread:{active:true,elapsed:800,since:0,paused:false},
    caritasInvocation:{phase:"idle"},
    caritasChant:{phase:"rising",elapsed:0,since:0,paused:false,sealedAt:0},
    caritasTarotBack:{naturalWidth:1024,naturalHeight:1536},
    caritasTarotLuminousMask:null,
    caritasTarotShionBounds:{topOffset:-66,leftOffset:-16,rightOffset:16},
    DRAW_HEIGHT:78,
    getCaritasSkyStarAtlas:()=>({tag:"starAtlas"}),
    caritasOwnerSmooth:p=>{p=Math.max(0,Math.min(1,p));return p*p*(3-2*p);}
  };
  vm.createContext(scope);
  const cards=game.slice(game.indexOf("  function caritasTarotElapsed(){"),game.indexOf("  // Caritas encounter only: pathfinding"));
  const light=game.slice(game.indexOf("  function caritasChantElapsed(){"),game.indexOf("  // Invocation-only light: transformation hold"));
  assert.ok(cards.startsWith("  function caritasTarotElapsed()"));
  assert.ok(light.startsWith("  function caritasChantElapsed()"));
  vm.runInContext(cards+"\n"+light,scope);
  return {scope,draws,ctx,maskLayers,at(t){now=t;draws.length=0;},gradientCount:()=>gradients};
}
test("each tarot face glows through its own alpha, never via a square outline",()=>{
 const f=setup();
 f.scope.paintCaritasTarotSpread();
 const official=f.draws.filter(d=>d.kind==="image"&&d.args[0]===f.scope.caritasTarotBack);
 const luminous=f.draws.filter(d=>d.kind==="image"&&d.args[0]===f.scope.caritasTarotLuminousMask);
 assert.equal(official.length,3,"three original backs remain visible");
 assert.equal(luminous.length,6,"each card has a silhouette halo AND a luminous painted face");
 assert.equal(f.draws.filter(d=>d.kind==="outline").length,0,"no rectangular stroke");
 assert.deepEqual(f.maskLayers,["source","tint"],"one alpha tint is cached, not scanned each frame");
 const first=f.scope.caritasTarotLuminousMask;
 f.scope.paintCaritasTarotSpread();
 assert.equal(f.scope.caritasTarotLuminousMask,first);
});
test("linked constellation paints the Shion/cards/Shiopon relationship above opaque sprites",()=>{
 const f=setup();f.scope.paintCaritasChantWorld();
 const motes=f.draws.filter(d=>d.kind==="image");
 assert.ok(motes.length>=100,"there must be clear connections AND glowing source nodes");
 assert.ok(motes.every(d=>d.args[0]?.tag==="starAtlas"),"reuse the prepared warm-white / pearl-gold star atlas");
 assert.match(game,/paintCaritasChantWorld\(\);paintCaritasRegroupStars\(\)/,
   "render foreground links after the actor drawing loop");
 assert.ok(game.indexOf('if(hoshisunaIsolated){paintCaritasChantWorld();')>
   game.indexOf('function drawActors()'),"foreground pass belongs inside actor compositor");
 f.scope.caritasChant.phase="sealed";f.at(1000);f.scope.caritasChant.sealedAt=800;
 f.scope.paintCaritasChantWorld();
 assert.ok(f.draws.some(d=>d.kind==="fill"),"the finishing line produces one focused crest");
 f.scope.caritasInvocation.phase="charging";f.at(1300);
 f.scope.paintCaritasChantWorld();assert.equal(f.draws.length,0,
   "the pre-invocation effect must stop at the existing 5.5 second transformation");
});
test("non-Caritas maps never show the resonance overlay",()=>{
 const f=setup();f.scope.hoshisunaIsolated=false;
 f.scope.paintCaritasChantWorld();f.scope.paintCaritasTarotSpread();
 assert.equal(f.draws.length,0);
});
