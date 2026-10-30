"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const Nav=require("../navigation.js");
const Caritas=require("../hoshisuna-caritas-collision.js");
const game=fs.readFileSync(path.join(root,"hoshisuna-main-game.js"),"utf8");
const map=JSON.parse(fs.readFileSync(path.join(root,"assets/events/hoshisuna/map/starroad-collision.json"),"utf8"));
const actualCollision=Caritas.wrap(Nav.createCollision(map));

function scenario(){
 const player={x:1088,y:331,stageOffsetY:0};
 const scope={
   Math,collision:actualCollision,window:{TarotNavigation:Nav},
   player,playerRef:()=>({x:player.x,y:player.y}),camera:{zoom:1},
   SHIOPON_DRAW_HEIGHT:76,DRAW_HEIGHT:78,ACTOR_COLLISION_DISTANCE:26,
   shioponImages:{idle:{}},images:{idle:{}},
   caritasTarotBack:{naturalWidth:1024,naturalHeight:1536},
   caritasTarotShionBounds:{topOffset:-66,leftOffset:-16,rightOffset:16},caritasFoxBounds:null,
   caritasSafeNavigator:null,caritasSafeNavigatorKey:"",
   measureCaritasVisibleMapActor:()=>({leftOffset:-14,rightOffset:14,topOffset:-58,height:60}),
   refDistance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)
 };
 vm.createContext(scope);
 vm.runInContext(game.slice(game.indexOf("  function caritasTarotLayout("),
   game.indexOf("  function paintCaritasTarotSpread("))+"\n"+
   game.slice(game.indexOf("  function caritasSafeCollision("),
     game.indexOf("  // Invocation-only light:")),scope);
 return scope;
}

test("real Starroad path takes Shiopon safely from Shion's left to the front of Caritas",()=>{
 const s=scenario();
 const old={x:1032,y:331},left={x:1024,y:319},front={x:1024,y:301};
 assert.ok(actualCollision.isWalkable(old.x,old.y));
 assert.ok(actualCollision.isWalkable(left.x,left.y));
 assert.ok(actualCollision.isWalkable(front.x,front.y));
 const before=s.caritasSafeRoute(old,left,false);
 assert.ok(before.length,"left staging must be reachable without passing through Shion");
 let prev=old;
 for(const next of before){assert.ok(s.caritasSafeCollision(false).segmentClear(prev,next));prev=next;}
 const path=s.caritasSafeRoute(left,front,true);
 assert.ok(path.length,"front of Caritas must remain reachable when all three cards exist");
 prev=left;
 for(const next of path){
   assert.ok(s.caritasSafeCollision(true).segmentClear(prev,next),"entire walking segment avoids card, Shion and map");
   prev=next;
 }
 assert.equal(prev.y,left.y-18,"exactly one 18px step toward Caritas, never a large reposition");
 assert.equal(prev.x,left.x,"the last step stays in the established left-side lane");
});

test("same path rejects shortcut through Shion and through the left tarot card",()=>{
 const s=scenario(),blocked=s.caritasSafeCollision(true);
 const a={x:1032,y:331},b={x:1115,y:331};
 assert.equal(blocked.segmentClear(a,b),false,"Shion cannot be passed through");
 const leftCard=s.caritasTarotLayout(s.player,78,2/3)[1];
 assert.equal(blocked.isWalkable(leftCard.x,leftCard.y+37),false,
   "moving sprite would overlap the hovering card");
 // The actual Caritas footprint remains blocked by the source map wrapper.
 assert.equal(blocked.isWalkable(1013,260),false);
});
