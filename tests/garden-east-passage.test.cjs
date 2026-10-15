'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const gate = require('../garden-east-passage.js');
const B = Object.freeze({a:{x:100,y:20},b:{x:100,y:80}});
const p = events => ({getCurrentState:()=>({persisted:true,state:{completedEvents:events}})});
test('star-sand knowledge must have its own progression event, not Star Gate completion',()=>{
  assert.equal(gate.KNOWLEDGE_EVENT,'garden_star_sand_route_known');
  assert.equal(gate.routeKnown(p([])),false);
  assert.equal(gate.routeKnown(p(['garden_star_gate_anomaly'])),false);
  assert.equal(gate.routeKnown(p([gate.KNOWLEDGE_EVENT])),true);
  assert.equal(gate.routeKnown({getCurrentState:()=>({persisted:false,state:{completedEvents:[gate.KNOWLEDGE_EVENT]}})}),false);
  assert.equal(gate.routeKnown(null),false);
  assert.equal(gate.routeKnown({getCurrentState(){throw Error('storage');}}),false);
  assert.equal(gate.routeKnown({getCurrentState:()=>({state:{completedEvents:null}})}),false);
});
test('B-line closes only the authored entrance; not the entire east garden',()=>{
  assert.equal(gate.wouldBlock({x:50,y:50},{x:150,y:50},B,false),true);
  assert.equal(gate.wouldBlock({x:150,y:50},{x:50,y:50},B,false),true);
  assert.equal(gate.wouldBlock({x:50,y:100},{x:150,y:100},B,false),false);
  assert.equal(gate.wouldBlock({x:50,y:50},{x:80,y:50},B,false),false);
  assert.equal(gate.wouldBlock({x:150,y:50},{x:180,y:50},B,false),false);
});
test('both direct movement and long-distance tap lines respect a closed boundary',()=>{
  assert.equal(gate.wouldBlock({x:99,y:50},{x:101,y:50},B,false),true);
  assert.equal(gate.wouldBlock({x:1,y:50},{x:400,y:50},B,false),true);
  assert.equal(gate.wouldBlock({x:100,y:30},{x:120,y:30},B,false),true);
  assert.equal(gate.wouldBlock({x:50,y:50},{x:150,y:50},B,true),false);
});
test('ref-space validation rejects fabricated/outside/zero-length boundaries',()=>{
  assert.equal(gate.validLine(B),true);
  for (const wrong of [null,{a:{x:1,y:1},b:{x:1,y:1}},
    {a:{x:-1,y:50},b:{x:10,y:50}},{a:{x:1,y:1},b:{x:1449,y:50}}]) {
    assert.equal(!!gate.validLine(wrong),false);
    assert.throws(()=>gate.wouldBlock({x:50,y:50},{x:150,y:50},wrong,false),TypeError);
  }
});
test('repeated button/joystick contact cannot fire dialogue every frame',()=>{
  const t=gate.createFeedbackThrottle(1500);
  assert.equal(t.permit(0),true);assert.equal(t.permit(20),false);
  assert.equal(t.permit(1499),false);assert.equal(t.permit(1500),true);
  assert.equal(t.permit(1400),false);t.reset();assert.equal(t.permit(0),true);
});

test('the photo-B candidate crosses the lower east exit but not the upper courtyard',()=>{
  const line=gate.B_LINE;
  assert.deepEqual(line,{a:{x:1398,y:740},b:{x:1398,y:844}});
  assert.equal(gate.validLine(line),true);
  assert.equal(gate.wouldBlock({x:1392,y:800},{x:1408,y:800},line,false),true);
  assert.equal(gate.wouldBlock({x:1380,y:520},{x:1410,y:520},line,false),false);
  assert.equal(gate.wouldBlock({x:1340,y:790},{x:1360,y:790},line,false),false);
  assert.equal(gate.distanceToLine({x:1394,y:800},line),4);
  assert.equal(gate.distanceToLine({x:1200,y:530},line)>200,true);
});
test('actual Garden collision + controls bar foot crossing before knowledge and permit afterwards',()=>{
  const {gardenRuntime}=require('./helpers/garden-runtime.cjs');
  const {createControls}=require('../controls.js');
  const {createNavigator}=require('../blocked-collision.js');
  const base=gardenRuntime().collision,from={x:1393,y:800},target={x:1409,y:800};
  assert.equal(base.isWalkable(from.x,from.y),true);
  assert.equal(base.isWalkable(target.x,target.y),true);
  assert.equal(base.segmentClear(from,target),true,'original authored paving is unaffected');
  let known=false;
  const guarded={...base,segmentClear:(a,b)=>base.segmentClear(a,b)&&!gate.wouldBlock(a,b,gate.B_LINE,known)};
  const controls=createControls(guarded,createNavigator(base,16));
  assert.equal(controls.keyDown('ArrowRight'),true);
  const locked=controls.step(from,0.05,155);
  assert.ok(locked.x<1398,'locked step must not pass to east side');
  known=true;
  const opened=controls.step(from,0.05,155);
  assert.ok(opened.x>1398,'same controls now crosses without navigator rebuild');
});
test('official index loads the passage guard before game, and only the player controller is wrapped',()=>{
 const fs=require('node:fs');
 const html=fs.readFileSync('index.html','utf8'),game=fs.readFileSync('game.js','utf8');
 assert.ok(html.includes('garden-east-passage.js?v=20261015-b1'));
 assert.ok(html.indexOf('garden-east-passage.js')<html.indexOf('game.js?v='));
 assert.match(game,/navigation = createNavigator\(collision, 16\);\s*controls = createControls\(playerCollision, navigation\);/);
 assert.match(game,/eastPassage\.routeKnown\(window\.TarotStarGateProgress\)/);
 assert.match(game,/eastPassageDialogue\.show\(\{actor: "shion", speaker: "シオン"/);
});
