'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{minimal}=require('./classify.cjs');
function old(){return {engine:'old',rawExit:1,tap:{summary:{tests:1,pass:0,fail:1,skipped:0,cancelled:0}},observation:{playwright:'1.56.1',engine:{version:'26.0'},events:[{type:'tap-success'},{type:'playback-confirmed',playing:true,paused:false,currentTime:0.1},{type:'reload-call'},{type:'reload-error',name:'TimeoutError',message:'page.reload: Timeout 45000ms exceeded.'}],trace:[{event:'reload-start'},{event:'pagehide'},{event:'console:debug',message:'[QA media] pause-enter /bgm.mp3'}]}}}
test('only the gated old native-pause timeout is an expected failure; raw FAIL remains explicit',()=>{
 const result=minimal(old());assert.equal(result.verdict,'EXPECTED_OLD_ENGINE_STALL');assert.equal(result.rawTestResult,'FAIL');assert.equal(result.rawExit,1);
});
test('tap, playback, launch and tooling failures never qualify as native reproduction',()=>{
 for(const mutate of [x=>{x.observation=null},x=>{x.rawExit=null},x=>{x.observation.events.shift()},x=>{x.observation.events[1].currentTime=0},x=>{x.observation.events[1].paused=true},x=>{x.observation.events.push({type:'browser-launch-failed'})}]){
  const x=old();mutate(x);assert.equal(minimal(x).verdict,'INCONCLUSIVE_FAILURE');
 }
});
test('a timeout after pause returned, a new document, a crash, wrong engine, or wrong wait cannot be mislabeled',()=>{
 for(const mutate of [x=>x.observation.trace.push({event:'console:debug',message:'[QA media] pause-return /bgm.mp3'}),x=>x.observation.trace.push({event:'new-document'}),x=>x.observation.events.push({type:'page-crash'}),x=>{x.observation.engine.version='27.2'},x=>{x.observation.events[3].message='page.waitForURL: Timeout 45000ms exceeded.'},x=>x.observation.trace.splice(1,1)]){
  const x=old();mutate(x);assert.equal(minimal(x).verdict,'INCONCLUSIVE_FAILURE');
 }
});
test('if old engine passes, report NOT_REPRODUCED rather than expected stall',()=>{
 const x=old();x.rawExit=0;x.tap.summary.pass=1;x.tap.summary.fail=0;x.observation.events.pop();x.observation.events.push({type:'reload-return'});x.observation.trace.push({event:'console:debug',message:'[QA media] pause-return /bgm.mp3'},{event:'new-document'});
 assert.equal(minimal(x).verdict,'NOT_REPRODUCED');
});
test('new engine requires playback and successful pause-return plus document commit',()=>{
 const x=old();x.engine='new';x.observation.playwright='1.64.1';x.observation.engine.version='27.2';x.rawExit=0;x.tap.summary.pass=1;x.tap.summary.fail=0;x.observation.events.pop();x.observation.events.push({type:'reload-return'});x.observation.trace.push({event:'console:debug',message:'[QA media] pause-return /bgm.mp3'},{event:'new-document'});
 assert.equal(minimal(x).verdict,'PASS_NEW_ENGINE');x.observation.trace.pop();assert.equal(minimal(x).verdict,'INCONCLUSIVE_FAILURE');
});
