'use strict';
// Targeted normal-route interruption/legacy-save safety tests. No production writes.
const fs=require('node:fs'),vm=require('node:vm'),test=require('node:test');
const assert=require('node:assert/strict');
const core=require('../progress.js'),passage=require('../garden-east-passage.js');
function publicHarness() {
  // Reuse the actual, already-covered public Garden observer fixture without modifying its historical contract.
  const source=fs.readFileSync('tests/star-gate-public.test.cjs','utf8');
  // Public fixture validates strict plain objects in the caller JS realm.
  // This test-owned fixture must share the same JS realm as Progress.
  const factory=new Function('require','__dirname',
    source.slice(0,source.indexOf("test('"))+'\nreturn harness;');
  return factory(require,__dirname);
}
function aftermathHarness(){
  const source=fs.readFileSync('tests/star-gate-aftermath.test.cjs','utf8');
  const env={require,__dirname,AbortController};
  vm.runInNewContext(source.slice(0,source.indexOf("test('")),env);
  return env;
}
function reload(h){
  const bytes=h.bytes();
  const p=core.createProgress({storage:{getItem:(key)=>key===core.STORAGE_KEY?bytes:null}});
  const result=p.load();
  assert.equal(result.status,'valid','never make a test fixture into a production save');
  return p;
}
function integratedAftermath(){
  const p=publicHarness()();
  const api=aftermathHarness();
  const h=api.harness({dev:false,publicRoute:true,interaction:true,configure(window,context){
    window.TarotStarGateProgress=p.window.TarotStarGateProgress;
    window.TarotProgressCore=p.window.TarotProgressCore;
    window.TarotDialogue={getState:()=>({active:false,shioponDone:true,lumiereDone:true,joined:true})};
    vm.runInNewContext(fs.readFileSync('star-gate-public.js','utf8'),context);
  }});
  return {h,p,drive:api.drive,begin:api.begin};
}

test('actual Aftermath CHECK_COMPANIONS interrupted before second talk cannot unlock on reload/Continue',async()=>{
  const {h,p,drive,begin}=integratedAftermath();
  await begin(h);
  assert.equal(h.window.TarotStarGateAftermath.getState().state,'CHECK_COMPANIONS');
  assert.equal(p.writes(),0);
  assert.equal(passage.routeKnown({getItem:()=>p.bytes()}),false);
  let actor=h.state().actors.shiopon;
  h.movePlayer(actor.x,actor.y+18);
  const talk=h.window.TarotStarGateAftermath.talk('shiopon');
  await drive(h,()=>h.window.TarotStarGateAftermath.getState().state==='CHECK_COMPANIONS');
  assert.equal(await talk,true);
  assert.deepEqual(Array.from(h.window.TarotStarGateAftermath.getState().checked),['shiopon']);
  assert.equal(p.writes(),0,'one conversation must not record finished Aftermath');
  await h.window.TarotStarGateAftermath.cancel();
  assert.equal(h.window.TarotStarGateAftermath.getState().state,'CANCELLED');
  assert.equal(p.writes(),0,'cancelled mid-story must not store either progression fact');
  const reloaded=reload(p);
  assert.equal(reloaded.isEventCompleted('garden_star_gate_anomaly'),false);
  assert.equal(reloaded.isEventCompleted(passage.KNOWLEDGE_EVENT),false);
  assert.equal(passage.routeKnown({getItem:()=>p.bytes()}),false);
  assert.equal(passage.wouldBlock({x:1393,y:800},{x:1410,y:800},
    passage.B_LINE,passage.routeKnown({getItem:()=>p.bytes()})),true);
});

test('story mentioning Star Sand is not itself a durable unlock before Aftermath finishes',async()=>{
  const {h,p,drive,begin}=integratedAftermath();
  await begin(h);
  let actor=h.state().actors.shiopon;
  h.movePlayer(actor.x,actor.y+18);
  const talk1=h.window.TarotStarGateAftermath.talk('shiopon');
  await drive(h,()=>h.window.TarotStarGateAftermath.getState().state==='CHECK_COMPANIONS');
  await talk1;
  actor=h.state().actors.lumiere;
  h.movePlayer(actor.x,actor.y+18);
  const talk2=h.window.TarotStarGateAftermath.talk('lumiere');
  await drive(h,()=>h.shown.some(line=>line.text.includes('星砂を使おう。')),2500);
  assert.equal(p.writes(),0,'C16 line alone must not write a premature save');
  reload(p);
  assert.equal(passage.routeKnown({getItem:()=>p.bytes()}),false,'mid-dialogue Continue stays blocked');
  await drive(h,()=>h.window.TarotStarGateAftermath.getState().completed,2500);
  assert.equal(await talk2,true);
  assert.equal(p.writes(),2,'completed validated story writes gate and independent route fact');
  reload(p);
  assert.equal(passage.routeKnown({getItem:()=>p.bytes()}),true,'only finished persisted route grants access');
});

test('older Star Gate-completed save migrates exactly once, restores gate, and retains unlock through Garden roundtrip',async()=>{
  const h=publicHarness()({completed:true});
  assert.equal(h.progress.isEventCompleted('garden_star_gate_anomaly'),true);
  assert.equal(passage.routeKnown({getItem:()=>h.bytes()}),false,'legacy save has no separate star-sand event yet');
  await h.api.prepareRestoration();
  assert.equal(h.api.restoreCompleted(),true);
  assert.equal(h.scene.gateRestored,true);
  assert.equal(h.scene.lumiereEnabled,false);
  assert.equal(h.writes(),1,'migration adds only the missing dedicated event');
  assert.equal(h.api.restoreCompleted(),false);
  assert.equal(h.writes(),1,'repeat restore must not duplicate writes');
  let bytes=h.bytes();
  const isolatedStore={getItem:(key)=>key===core.STORAGE_KEY?bytes:null,
    setItem:(key,value)=>{assert.equal(key,core.STORAGE_KEY);bytes=value;}};
  const loaded=core.createProgress({storage:isolatedStore});
  assert.equal(loaded.load().status,'valid');
  assert.equal(passage.routeKnown(isolatedStore),true);
  assert.equal(loaded.commitArrival({sourceMapId:'star_gate_garden',
    destinationMapId:'star_country_landing',spawnId:'garden_entrance',
    reason:'garden_to_landing'}).persisted,true);
  assert.equal(loaded.commitArrival({sourceMapId:'star_country_landing',
    destinationMapId:'star_gate_garden',spawnId:'south_gate',
    reason:'gate_to_garden'}).persisted,true);
  assert.equal(passage.routeKnown(isolatedStore),true);
  assert.equal(bytes.includes('garden_star_sand_route_known'),true);
});
