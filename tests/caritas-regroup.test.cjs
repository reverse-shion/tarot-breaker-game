"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const game=fs.readFileSync(path.join(__dirname,"../hoshisuna-main-game.js"),"utf8");
const block=game.slice(game.indexOf("    regroup(){"),
  game.indexOf("    // Before any card appears,"));
assert.ok(block.startsWith("    regroup(){"));

function scene({start={x:1480,y:550},walkable=()=>true,route=true,interrupted=false}={}){
 const shion={x:1000,y:300},fox={...start},commands=[],facing=[],routeChecks=[];
 const actor={x:fox.x,y:fox.y,dir:"down",frame:0,rotation:0,
   target:null,followTarget:null,followRoute:[],moving:false,stageOffsetY:0};
 const state={Math,Promise,console,ready:true,running:true,scale:{x:1,y:1},
   caritasInvocation:{locked:false},caritasTarotSpread:{active:false},
   shiopon:actor,SHIOPON_FOLLOW_SPEED:210,
   playerRef:()=>shion,shioponRef:()=>({x:actor.x,y:actor.y}),
   refDistance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),
   collision:{isWalkable:(x,y)=>walkable({x,y})},
   ACTOR_COLLISION_DISTANCE:26,
   caritasSafeRoute:(from,spot,cards)=>{
     routeChecks.push({from,spot,cards});
     const reachable=typeof route==="function"?route(from,spot):route;
     return reachable?[{...spot}]:[];
   },
   setDirection:(_actor,dx,dy)=>{facing.push({dx,dy});},
   performStageCommand:cmd=>{
     commands.push(cmd);
     if(!interrupted){actor.x=cmd.target.x;actor.y=cmd.target.y;}
     return {promise:Promise.resolve({completed:!interrupted,skipped:interrupted})};
   }
 };
 vm.createContext(state);
 vm.runInContext("this.stage=({"+block+"});",state);
 return {state,actor,shion,commands,facing,routeChecks,run:()=>state.stage.regroup()};
}

test("near encounter: Shiopon visibly walks left of Shion before dialogue",async()=>{
 const f=scene({start:{x:955,y:290}});
 const result=await f.run();
 assert.equal(result.completed,true);
 assert.equal(result.method,"walk");
 assert.equal(f.commands.length,1);
 assert.equal(f.commands[0].target.x,f.shion.x-64);
 assert.equal(f.commands[0].target.y,f.shion.y-12);
 assert.equal(f.commands[0].caritasSafe,true);
 assert.ok(f.actor.x<f.shion.x);
 assert.ok(Math.hypot(f.actor.x-f.shion.x,f.actor.y-f.shion.y)>=44);
});

test("far encounter: same real fox walks the full distance, without jumping",async()=>{
 const f=scene();
 const result=await f.run();
 assert.equal(result.completed,true);
 assert.equal(result.method,"walk");
 assert.equal(f.commands.length,1);
 assert.ok(f.commands[0].duration>1400,"far walking time must not clamp to 1.4 seconds");
 assert.equal(f.commands[0].caritasSafe,true);
 assert.equal(f.actor.x,936);
 assert.equal(f.actor.y,288);
 assert.ok(f.routeChecks.length>=1);
 assert.equal(f.routeChecks[0].cards,false);
});

test("unreachable first left position: choose another reachable LEFT position",async()=>{
 const f=scene({route:(_from,spot)=>spot.y<=282});
 const result=await f.run();
 assert.equal(result.completed,true);
 assert.equal(result.method,"walk");
 assert.ok(f.routeChecks.length>1);
 assert.ok(f.commands[0].target.x<f.shion.x);
 assert.ok(f.commands[0].target.y<=282);
});

test("all routes blocked: never teleport or enter the encounter dialogue",async()=>{
 const f=scene({route:false});
 const result=await f.run();
 assert.equal(result.completed,false);
 assert.equal(result.reason,"no-safe-left-route");
 assert.equal(f.actor.x,1480);
 assert.equal(f.actor.y,550);
 assert.equal(f.commands.length,0);
});

test("no left-side walkable position: fail safely without clipping",async()=>{
 const f=scene({walkable:p=>p.x>=1000});
 const result=await f.run();
 assert.equal(result.completed,false);
 assert.equal(result.reason,"no-safe-left-route");
 assert.equal(f.commands.length,0);
 assert.equal(f.actor.x,1480);
});

test("a mid-walk interruption never snaps Shiopon to the left destination",async()=>{
 const f=scene({interrupted:true});
 const result=await f.run();
 assert.equal(result.completed,false);
 assert.equal(result.reason,"regroup-walk-interrupted");
 assert.equal(f.actor.x,1480);
 assert.equal(f.actor.y,550);
});

test("the actual stage walker checks Shion and terrain along each move",()=>{
 assert.match(game,/caritasSafeRoute\(current,requested,caritasCards\)/);
 assert.match(game,/if\(motion\.caritasSafe&&!caritasSafeCollision\(motion\.caritasCards\)\.segmentClear\(current,next\)\)/);
 assert.match(game,/refDistance\(p,shion\)>=ACTOR_COLLISION_DISTANCE\+8/);
 assert.match(game,/Math\.ceil\(refDistance\(a,b\)\/3\)/,"every corridor is sampled in small increments");
 assert.doesNotMatch(game,/caritasRegroup\.phase="star-step"/,"no star-step or hidden teleport");
});

test("encounter dialogue waits for completed regroup and aborts after failed route",()=>{
 const event=fs.readFileSync(path.join(__dirname,"../caritas-battle-event.js"),"utf8");
 const flow=event.slice(event.indexOf("function beginRegroup("),event.indexOf("function tick()"));
 assert.match(flow,/Promise\.resolve\(\)\.then\(\(\)=>regroup\(\)\)\.then/);
 assert.match(flow,/if\(out\?\.completed===false\)\{abort\(out\.reason\);return;\}/);
 assert.match(flow,/pendingRegroupNext=null;story="idle";busy=false;armed=false;unlock\(\)/);
 assert.ok(flow.indexOf('beginRegroup(()=>{')<flow.indexOf('saySequence(NOTICE'));
 assert.match(flow,/if\(suspended\(\)\)pendingRegroupNext=show/);
});
