"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const game=fs.readFileSync(path.join(__dirname,"../hoshisuna-main-game.js"),"utf8");
const block=game.slice(game.indexOf("    regroup(){"),
  game.indexOf("    // Before any card appears,"));
const effect=game.slice(game.indexOf("  function caritasRegroupAlpha(){"),
  game.indexOf("  function updateShiopon(dt) {"));
assert.ok(block.startsWith("    regroup(){"));
assert.ok(effect.includes("function updateCaritasRegroup(dt)"));

function scene({start={x:1480,y:550},walkable:predicate=()=>true,route=true}={}){
 let shion={x:1000,y:300},fox={...start},commands=[],facing=[];
 const regroup={phase:"idle",elapsed:0,target:null,resolve:null,shifted:false};
 const actor={x:fox.x,y:fox.y,dir:"down",frame:0,rotation:0,
    target:null,followTarget:null,followRoute:[],moving:false,stageOffsetY:0};
 const state={Math,Promise,console,ready:true,running:true,scale:{x:1,y:1},
    caritasInvocation:{locked:false},caritasTarotSpread:{active:false},
    caritasRegroup:regroup,shiopon:actor,
    playerRef:()=>shion,shioponRef:()=>({x:actor.x,y:actor.y}),
    refDistance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),
    collision:{isWalkable:(x,y)=>predicate({x,y})},
    ACTOR_COLLISION_DISTANCE:26,
    caritasSafeRoute:()=>route?[{x:1,y:1}]:[],
    setDirection:(_actor,dx,dy)=>{facing.push({dx,dy});},
    performStageCommand:cmd=>{
      commands.push(cmd);
      actor.x=cmd.target.x;actor.y=cmd.target.y;
      return {promise:Promise.resolve({completed:true,skipped:false})};
    }
 };
 vm.createContext(state);
 vm.runInContext("this.stage=({"+block+"});\n"+effect,state);
 return {state,actor,shion,commands,facing,regroup,run:()=>state.stage.regroup()};
}
test("near encounter: fox walks to left of Shion before dialogue",async()=>{
 const f=scene({start:{x:955,y:290}});
 const result=await f.run();
 assert.equal(result.completed,true);
 assert.equal(result.method,"walk");
 assert.equal(f.commands.length,1);
 assert.equal(f.commands[0].target.x,f.shion.x-64);
 assert.equal(f.commands[0].target.y,f.shion.y-12);
 assert.equal(f.commands[0].caritasSafe,true,"never walk through Shion or walls");
});
test("far encounter: hidden star-step settles the actual actor to the same left position",async()=>{
 const f=scene();
 const pending=f.run();
 assert.equal(f.regroup.phase,"star-step");
 f.state.updateCaritasRegroup(.36);
 assert.equal(f.state.caritasRegroupAlpha(),0);
 assert.equal(f.actor.x,1480,"fox must be invisible before relocation");
 f.state.updateCaritasRegroup(.04);
 assert.equal(f.actor.x,936,"move actual fox to left of Shion while fully concealed");
 assert.equal(f.actor.y,288);
 f.state.updateCaritasRegroup(.5);
 const result=await pending;
 assert.equal(result.completed,true);
 assert.equal(result.method,"star-step");
 assert.equal(f.regroup.phase,"idle");
 assert.equal(f.state.caritasRegroupAlpha(),1);
 assert.equal(f.commands.length,0,"far follower must not run across the scene at high speed");
});
test("blocked left position: choose only legal fallback, never force overlap",async()=>{
 const f=scene({walkable:p=>p.x>1000,route:false});
 const pending=f.run();
 assert.equal(f.regroup.phase,"star-step");
 f.state.updateCaritasRegroup(.9);
 const result=await pending;
 assert.equal(result.completed,true);
 assert.ok(f.actor.x>1000);
 assert.ok(Math.hypot(f.actor.x-f.shion.x,f.actor.y-f.shion.y)>=35);
});
test("no free position: report failure without moving or clipping the fox",async()=>{
 const f=scene({walkable:()=>false});
 const result=await f.run();
 assert.equal(result.completed,false);
 assert.equal(result.reason,"no-safe-companion-position");
 assert.equal(f.actor.x,1480);
});
test("encounter dialogue is explicitly delayed until real regroup completes",()=>{
 const event=fs.readFileSync(path.join(__dirname,"../caritas-battle-event.js"),"utf8");
 const scene=event.slice(event.indexOf("function beginRegroup("),event.indexOf("function tick()"));
 assert.match(scene,/Promise\.resolve\(\)\.then\(\(\)=>regroup\(\)\)\.then/);
 assert.ok(scene.indexOf('beginRegroup(()=>{')<scene.indexOf('saySequence(NOTICE'));
 assert.match(scene,/if\(suspended\(\)\)pendingRegroupNext=show/);
});
