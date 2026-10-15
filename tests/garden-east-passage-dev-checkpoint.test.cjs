'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const registry=require('../dev-checkpoints.js');
const receiver=require('../garden-resume.js');
const passage=require('../garden-east-passage.js');
const {gardenRuntime}=require('./helpers/garden-runtime.cjs');
const {createControls}=require('../controls.js');
const {createNavigator}=require('../blocked-collision.js');
const LOCKED='garden-resume-east-passage-locked';
const OPEN='garden-resume-east-passage-open';
function sessionStorage(){
  const map=new Map(),writes=[];
  return {writes, map, getItem(k){return map.get(k)??null;},
    setItem(k,v){writes.push(k);map.set(k,v);}};
}

test('registered B-line checkpoints use the real Garden runtime, independent session-only Progress',()=>{
 const store=sessionStorage(), definitions=[registry.get(LOCKED),registry.get(OPEN)];
 for(const def of definitions){
  assert.ok(def);
  assert.equal(def.event,'garden-east-passage');
  assert.equal(def.segment,'east-passage-b-line');
  assert.equal(def.map,'star_gate_garden');
  assert.equal(def.durableWritePolicy.includes('production writes forbidden'),true);
  for(const path of def.requiredRuntime)assert.equal(fs.existsSync(path),true,path);
 }
 const before=receiver.createSession({search:'?dev='+LOCKED,storage:store});
 const after=receiver.createSession({search:'?dev='+OPEN,storage:store});
 assert.equal(before.ok,true); assert.equal(after.ok,true);
 assert.notEqual(before.key,after.key);
 assert.equal(before.context.mapId,'star_gate_garden');
 assert.equal(after.context.mapId,'star_gate_garden');
 assert.deepEqual(before.spawn,{x:724,y:944});
 assert.deepEqual(after.spawn,{x:724,y:944});
 assert.equal(before.progress.getCurrentState().persisted,true);
 assert.equal(after.progress.getCurrentState().persisted,true);
 assert.equal(passage.routeKnown(before.progress),false);
 assert.equal(passage.routeKnown(after.progress),true);
 assert.equal(store.writes.length,0,'merely booting fixture cannot write real or dev storage');
 assert.equal(store.map.size,0);
});

test('actual Garden movement with both real Progress checkpoint authorities locks and opens B',()=>{
 const base=gardenRuntime().collision;
 const before=receiver.createSession({search:'?dev='+LOCKED,storage:sessionStorage()});
 const after=receiver.createSession({search:'?dev='+OPEN,storage:sessionStorage()});
 const source={x:1393,y:800},far={x:1410,y:800};
 for(const [session,shouldCross] of [[before,false],[after,true]]){
  const adapted={...base,segmentClear:(a,b)=>base.segmentClear(a,b)&&
   !passage.wouldBlock(a,b,passage.B_LINE,passage.routeKnown(session.progress))};
  const controls=createControls(adapted,createNavigator(base,16));
  assert.ok(controls.tap(far,source));
  const step=controls.step(source,0.05,155);
  assert.equal(step.x>passage.B_LINE.a.x,shouldCross,session.definition.id);
 }
});

test('only valid exact B-line dev entry is accepted; conflicting / spoofed entries fail closed',()=>{
 const store=sessionStorage();
 for(const search of [
  '?dev=garden-resume-east-passage-open&dev=garden-resume-east-passage-locked',
  '?dev='+OPEN+'&from=landing',
  '?dev='+OPEN+'&debug=1',
  '?dev='+OPEN+'&passage=1',
  '?dev=garden-resume-east-passage-fake',
  '?entry=continue&dev='+OPEN
 ]) assert.equal(receiver.createSession({search,storage:store}).ok,false,search);
 assert.equal(store.writes.length,0);
});

test('dev boot injects registered Garden receiver but does not turn on public Star Gate or main storage',()=>{
 for(const id of [LOCKED,OPEN]){
  const writes=[];
  vm.runInNewContext(fs.readFileSync('garden-dev-bootstrap.js','utf8'),
    {URLSearchParams,location:{search:'?dev='+id},document:{write:s=>writes.push(s)}});
  assert.equal(writes.length,3);
  assert.ok(writes[0].includes('dev-checkpoints.js'));
  assert.ok(writes[1].includes('progress-resume.js'));
  assert.ok(writes[2].includes('garden-resume.js'));
  const observer=fs.readFileSync('garden-progress-observer.js','utf8');
  const game=fs.readFileSync('game.js','utf8');
  assert.match(observer,/east-passage-locked\|east-passage-open/);
  assert.match(game,/east-passage-locked\|east-passage-open/);
  assert.match(game,/bLineDev && !window\.__TAROT_PUBLIC_STAR_GATE__/);
  assert.match(game,/window\.TarotGardenDevTransit\?\.progress/);
  assert.match(game,/: window\.TarotStarGateProgress;/);
  assert.match(game,/controls = createControls\(playerCollision, navigation\)/);
  assert.doesNotMatch(fs.readFileSync('garden-resume.js','utf8'),/localStorage/);
 }
});
