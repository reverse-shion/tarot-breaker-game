'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const gate=require('../garden-east-passage.js');
const {createControls}=require('../controls.js');
const {createNavigator}=require('../blocked-collision.js');
const {gardenRuntime}=require('./helpers/garden-runtime.cjs');
const core=require('../progress.js');
const START={x:1393,y:800},EAST={x:1410,y:800};

function guardedPlayer(known=false) {
 const base=gardenRuntime().collision;
 const state={known};
 const collision={...base,segmentClear(a,b) {
   return base.segmentClear(a,b) &&
      !gate.wouldBlock(a,b,gate.B_LINE,state.known);
 }};
 return {base,state,controls:createControls(collision,createNavigator(base,16))};
}

test('B-line rapid tap targeting cannot sneak across and normal controls recover',()=>{
 const {base,controls}=guardedPlayer();
 assert.equal(base.segmentClear(START,EAST),true);
 for(let attempt=0;attempt<18;attempt++){
   assert.ok(controls.tap(EAST,START),'navigation must see the valid road');
   const next=controls.step(START,0.05,155);
   assert.ok(next.x<gate.B_LINE.a.x,'repeated tap must not pass a closed B line');
   assert.equal(controls.state.cancelReason,'blocked');
 }
 controls.cancel('user-cancel');
 assert.equal(controls.state.route.length,0);
 assert.equal(controls.keyDown('ArrowUp'),true);
 const escape=controls.step(START,0.05,155);
 assert.ok(escape.y<START.y,'leaving the B-line in an unaffected direction must work');
 controls.keyUp('ArrowUp');
});

test('full-strength joystick hold cannot cross B and cancelled gesture clears movement',()=>{
 const {controls}=guardedPlayer();
 assert.equal(controls.pointerDown({id:1,x:48,y:130,time:0,width:393,world:START}),true);
 assert.equal(controls.pointerMove({id:1,x:112,y:130}),true);
 assert.equal(controls.state.stick.active,true);
 for(let frame=0;frame<90;frame++){
  const result=controls.step(START,0.05,155);
  assert.ok(result.x<gate.B_LINE.a.x,'stick must remain blocked across frames');
 }
 assert.equal(controls.pointerEnd({id:1,x:112,y:130,time:1000,cancelled:true},START),null);
 assert.equal(controls.state.stick.active,false);
 const still=controls.step(START,0.05,155);
 assert.equal(still.moving,false,'cancel must remove held input');
 assert.equal(controls.keyDown('ArrowUp'),true);
 const left=controls.step(START,0.05,155);
 assert.ok(left.y<START.y,'other directions work after cancellation');
 controls.keyUp('ArrowUp');
});

test('after verified route-known fact, the same player controls cross without reconstructing map',()=>{
 const {controls,state}=guardedPlayer();
 assert.ok(controls.tap(EAST,START));
 assert.ok(controls.step(START,0.05,155).x<gate.B_LINE.a.x);
 state.known=true;
 assert.ok(controls.tap(EAST,START));
 const next=controls.step(START,0.05,155);
 assert.ok(next.x>gate.B_LINE.a.x);
 assert.equal(controls.state.cancelReason,null);
});

test('a failed persistent Progress write never turns the closed B line into an unlocked passage',()=>{
 const source=JSON.stringify({version:1,checkpoint:{mapId:'star_gate_garden',spawnId:'south_gate'},
  completedEvents:['alenon_prologue','landing_devil_memory','garden_shiopon_meet','garden_lumiere_gate'],
  companion:'joined_with_shion'});
 const storage={getItem:()=>source,setItem(){throw Error('storage unavailable')}};
 const progress=core.createProgress({storage});
 assert.equal(progress.load().status,'valid');
 assert.equal(gate.routeKnown(storage),false);
 const result=progress.completeEvent(gate.KNOWLEDGE_EVENT,{mapId:'star_gate_garden',spawnId:'south_gate'});
 assert.equal(result.persisted,false);
 assert.equal(gate.routeKnown(storage),false,'volatile/failed writes must not unlock');
 const loaded=core.createProgress({storage});
 assert.equal(loaded.load().status,'valid');
 assert.equal(gate.routeKnown(storage),false);
});
