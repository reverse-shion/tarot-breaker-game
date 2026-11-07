'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {stateFor,framing,createController}=require('../caritas-battle-camera.js');
function fixture(){
 let dimensions={width:390,height:330};const painted=[];
 const controller=createController({measure:()=>dimensions,paint:v=>painted.push(v),freeze:()=> 'matrix(1,0,0,1,-123,0)'});
 controller.resize();
 return {controller,painted,resize:value=>{dimensions=value;controller.resize();}};
}
test('camera routes reading, delivery/wait, opponent response and special without gameplay state',()=>{
 assert.equal(stateFor(), 'READING');
 for(const phase of ['word-strike','written-light','enemy-turn'])assert.equal(stateFor({phase}),'REACTION');
 assert.equal(stateFor({waiting:true}),'REACTION');
 assert.equal(stateFor({speaker:'カリタス'}),'REACTION');
 assert.equal(stateFor({speaker:'シオン'}),'READING');
 for(const phase of ['selecting','special','purifying','purified'])assert.equal(stateFor({phase,waiting:true}),'SPECIAL');
});
test('long AI waits and multi-page replies do not restart pans',()=>{
 const {controller,painted}=fixture();controller.update({waiting:true});
 const count=painted.length;
 for(let i=0;i<20;i++)controller.update({waiting:true,speaker:'カリタス'});
 assert.equal(painted.length,count);assert.equal(painted.at(-1).mode,'REACTION');
 controller.update({});assert.equal(painted.at(-1).mode,'READING');
});
test('IME locks a partially completed pan and queues reactions until blur',()=>{
 const {controller,painted}=fixture();controller.update({waiting:true});controller.focus();
 assert.equal(painted.at(-1).mode,'INPUT_LOCK');assert.equal(painted.at(-1).frozen,'matrix(1,0,0,1,-123,0)');
 const count=painted.length;controller.update({phase:'special'});controller.resize();controller.focus();
 assert.equal(painted.length,count);assert.equal(controller.getState().locked,true);
 controller.blur();assert.equal(painted.at(-1).mode,'SPECIAL');assert.equal(painted.at(-1).instant,true);
});
test('keyboard resizes never overwrite frozen dimensions; return remeasures without accumulating offsets',()=>{
 const {controller,painted,resize}=fixture();controller.focus();
 resize({width:390,height:70});assert.equal(controller.getState().height,330);
 resize({width:390,height:330});controller.blur();
 assert.equal(painted.at(-1).x,-312);assert.equal(painted.at(-1).height,330);
 for(let i=0;i<5;i++){controller.focus();controller.blur();}
 assert.equal(painted.at(-1).x,-312);
 resize({width:320,height:250});assert.equal(painted.at(-1).x,-256);
});
test('invalid hidden dimensions do not destroy the last valid composition',()=>{
 const {controller,painted,resize}=fixture();resize({width:0,height:0});
 assert.equal(painted.at(-1).width,390);assert.equal(painted.at(-1).height,330);
 controller.update({phase:'word-strike'});assert.equal(painted.at(-1).x,-11.7);
});
test('special fits the occupied world and ordinary pan is absolute rather than cumulative',()=>{
 for(const width of [320,375,390,430]){
  const normal=framing('READING',width,330),wide=framing('SPECIAL',width,330);
  assert.equal(normal.scale,1);assert.equal(normal.x,-.8*width);
  assert.ok(1.85*width*wide.scale<=width+.001);assert.equal(wide.x,0);
 }
});
