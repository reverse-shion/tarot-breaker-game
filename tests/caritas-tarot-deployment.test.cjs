"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../hoshisuna-main-game.js"),"utf8");
function fixture(){
  let now=0;const draws=[],stack=[];
  const scope={Math,performance:{now:()=>now},document:{hidden:false},window:{},ready:true,running:true,
    caritasTarotBack:{naturalWidth:1024,naturalHeight:1536},caritasTarotSpread:{active:false,elapsed:0,since:0,paused:false},
    caritasInvocation:{phase:"idle",locked:false,elapsed:0,since:0,paused:false,fx:null},
    CARITAS_MANIFESTATION_DURATION_MS:5500,caritasInvocationProgress:()=>scope.progress,
    hoshisunaIsolated:true,FRAME:{w:384,h:512,baseline:480},DRAW_HEIGHT:78,camera:{zoom:1},
    player:{x:200,y:250,stageOffsetY:3},shiopon:{},draw(){},faceShioponTowardPlayer(){},
    caritasOwnerBlendSurface:null,caritasOwnerStarAtlas:null,caritasResonanceSprites:null,
    ctx:{globalAlpha:.8,shadowBlur:0,save(){stack.push([this.globalAlpha,this.shadowBlur]);},restore(){[this.globalAlpha,this.shadowBlur]=stack.pop();},
      drawImage(...args){draws.push({alpha:this.globalAlpha,args});}}};
  vm.createContext(scope);
  vm.runInContext(source.slice(source.indexOf("  function caritasTarotElapsed()"),source.indexOf("  // Invocation-only light:"))+
    source.slice(source.indexOf("  const caritasOwnerSmooth ="),source.indexOf("  // The small sprite atlas"))+
    source.slice(source.indexOf("  if (hoshisunaIsolated) window.TarotHoshisunaManifestation="),source.indexOf("  window.TarotStage = Object.freeze")),scope);
  return {s:scope,api:scope.window.TarotHoshisunaManifestation,draws,at(ms){now=ms;draws.length=0;}};
}
test("three portrait cards form a triangle outside Shion's complete native sprite at varied scales",()=>{
  const {s}=fixture();
  for(const height of [60,78,110])for(const aspect of [2/3,.58]){
    const actor={x:140,y:260,stageOffsetY:4},cards=s.caritasTarotLayout(actor,height,aspect);
    assert.equal(cards.length,3);const fullWidth=384*height/512;
    for(const c of cards){
      assert.equal(c.height,height*.34);assert.equal(c.width/c.height,aspect);
      assert.ok(c.x+c.width/2<=actor.x-fullWidth/2-8+1e-9||c.x-c.width/2>=actor.x+fullWidth/2+8-1e-9,
        "full card, not only opaque centre, clears Shion by at least8 world px");
    }
    const [a,b,c]=cards;assert.ok(Math.abs((b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y))>height*height/2);
    for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){
      assert.ok(Math.abs(cards[i].x-cards[j].x)>(cards[i].width+cards[j].width)/2||Math.abs(cards[i].y-cards[j].y)>(cards[i].height+cards[j].height)/2);
    }
  }
});
test("deployment uses exactly the provided back three times, retains aspect/alpha and obeys pause before charging",()=>{
  const f=fixture(),s=f.s;assert.equal(f.api.deployCards(),true);assert.equal(f.api.deployCards(),false);
  s.paintCaritasTarotSpread();assert.equal(f.draws.length,0);
  f.at(225);s.paintCaritasTarotSpread();assert.equal(f.draws.length,3);
  for(const d of f.draws){assert.equal(d.args[0],s.caritasTarotBack);assert.equal(d.alpha,.4);assert.equal(d.args[3]/d.args[4],2/3);}
  const before=JSON.stringify(f.draws);f.api.pause();f.at(9000);s.paintCaritasTarotSpread();
  assert.equal(JSON.stringify(f.draws),before,"background time cannot skip deployment");
  s.document.hidden=true;f.api.resume();assert.equal(s.caritasTarotSpread.paused,true);
  s.document.hidden=false;f.api.resume();f.at(9225);s.paintCaritasTarotSpread();
  assert.equal(f.draws.length,3);assert.ok(f.draws.every(d=>d.alpha===.8));
  assert.equal(s.ctx.globalAlpha,.8);assert.equal(s.ctx.shadowBlur,0);
});
test("cards stay through the chant, fade before quiet hold, and disappear on reveal/recovery/map return",()=>{
  const f=fixture(),s=f.s;f.api.deployCards();f.at(10000);s.paintCaritasTarotSpread();assert.equal(f.draws.length,3);
  s.caritasInvocation.phase="charging";s.progress=4400/5500;f.at(10100);s.paintCaritasTarotSpread();assert.ok(f.draws.every(d=>Math.abs(d.alpha-.4)<1e-9));
  s.progress=4700/5500;f.at(10200);s.paintCaritasTarotSpread();assert.equal(f.draws.length,0);
  s.caritasInvocation.phase="revealed";f.at(10300);s.paintCaritasTarotSpread();assert.equal(f.draws.length,0);
  f.api.clear();assert.equal(s.caritasTarotSpread.active,false);assert.equal(s.caritasTarotSpread.elapsed,0);
  assert.equal(s.caritasTarotSpread.paused,false);s.paintCaritasTarotSpread();assert.equal(f.draws.length,0);
  assert.equal(f.api.deployCards(),true,"clear permits a clean retry");
});
test("reduced motion keeps card positions fixed and guards prevent missing-art or normal-map effects",()=>{
  const f=fixture(),s=f.s;s.window.matchMedia=()=>({matches:true});f.api.deployCards();
  f.at(100);s.paintCaritasTarotSpread();const first=f.draws.map(d=>d.args.slice(1));
  f.at(450);s.paintCaritasTarotSpread();assert.deepEqual(f.draws.map(d=>d.args.slice(1)),first);
  s.hoshisunaIsolated=false;f.at(500);s.paintCaritasTarotSpread();assert.equal(f.draws.length,0);
  const missing=fixture();missing.s.caritasTarotBack=null;assert.equal(missing.api.deployCards(),false);
  assert.equal(missing.s.caritasTarotSpread.active,false);
  assert.match(source,/loadImage\("\.\/assets\/tarot\/backs\/tarot-card-back\.webp"\)/);
});
