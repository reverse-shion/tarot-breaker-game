'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const gate = require('../garden-east-passage.js');
const B = Object.freeze({a:{x:100,y:20},b:{x:100,y:80}});
const p = events => ({getCurrentState:()=>({state:{completedEvents:events}})});
test('star-sand knowledge must have its own progression event, not Star Gate completion',()=>{
  assert.equal(gate.KNOWLEDGE_EVENT,'garden_star_sand_route_known');
  assert.equal(gate.routeKnown(p([])),false);
  assert.equal(gate.routeKnown(p(['garden_star_gate_anomaly'])),false);
  assert.equal(gate.routeKnown(p([gate.KNOWLEDGE_EVENT])),true);
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
