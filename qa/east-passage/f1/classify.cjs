'use strict';
function tapSummary(text){
 const entries=[...text.matchAll(/^(not ok|ok) \d+ - (.+)$/gm)];
 const tests=entries.map((m,i)=>({name:m[2],pass:m[1]==='ok',details:text.slice(m.index,entries[i+1]?.index??text.length)}));
 const summary={};
 for(const field of ['tests','pass','fail','skipped','cancelled'])summary[field]=Number(new RegExp('^# '+field+' (\\d+)$','m').exec(text)?.[1]??NaN);
 return {tests,summary};
}
function minimal({engine,observation,rawExit,tap}){
 const bad=reason=>({verdict:'INCONCLUSIVE_FAILURE',reason,rawExit,summary:tap.summary});
 if(!observation)return bad('no worker observation; launch/tooling failure is not reproduction');
 const e=observation.events||[],trace=observation.trace||[],has=type=>e.some(x=>x.type===type);
 const actual=observation.engine?.version;
 const expected=engine==='old'?'26.0':'27.2';
 if(observation.playwright!==(engine==='old'?'1.56.1':'1.64.1')||actual!==expected)return bad('actual engine version mismatch');
 const tapIndex=e.findIndex(x=>x.type==='tap-success'),playIndex=e.findIndex(x=>x.type==='playback-confirmed'),reloadIndex=e.findIndex(x=>x.type==='reload-call');
 const play=e[playIndex];
 if(!(tapIndex>=0&&playIndex>tapIndex&&reloadIndex>playIndex&&play.playing===true&&play.paused===false&&play.currentTime>0))return bad('touch and advancing playback were not established before reload');
 if(has('page-crash')||has('page-error')||has('browser-launch-failed'))return bad('page/launch failure, not native pause stall');
 const start=trace.findIndex(x=>x.event==='reload-start');
 if(start<0)return bad('fixed fixture never recorded reload start');
 const after=trace.slice(start),hide=after.findIndex(x=>x.event==='pagehide'),enter=after.findIndex(x=>x.message?.includes('[QA media] pause-enter'));
 if(!(hide>=0&&enter>hide))return bad('pagehide then native pause-enter not established');
 const returned=after.some(x=>x.message?.includes('[QA media] pause-return'));
 const newDocument=after.some(x=>x.event==='new-document');
 const summary=tap.summary;
 if(summary.tests!==1||summary.skipped!==0||summary.cancelled!==0)return bad('unexpected fixed-fixture test accounting');
 const timeout=e.find(x=>x.type==='reload-error');
 if(engine==='old'&&rawExit===1&&summary.fail===1&&!returned&&!newDocument&&timeout?.name==='TimeoutError'&&/^page\.reload: Timeout 45000ms exceeded\./.test(timeout.message))
  return {verdict:'EXPECTED_OLD_ENGINE_STALL',rawTestResult:'FAIL',rawExit,summary,playback:play,timeout,phase:'page.reload / domcontentloaded; after native pause-enter, before pause-return/new-document'};
 if(rawExit===0&&summary.pass===1&&returned&&newDocument&&has('reload-return'))
  return {verdict:engine==='new'?'PASS_NEW_ENGINE':'NOT_REPRODUCED',rawTestResult:'PASS',rawExit,summary,playback:play,phase:'pause-return and new document committed'};
 return bad('failure signature differs from the requested pause stall');
}
const originalNames=[
 'WebKit mobile viewport: known preview and production hosts cannot enable QA seeding or overwrite storage',
 'WebKit mobile viewport: pending Aftermath Continue and browser reload never create a route unlock',
 'WebKit mobile viewport: legacy save migrates in real Garden Continue; isolated origins share no progress',
 'WebKit negative control: missing Garden collision JSON prevents scene readiness',
];
function originalFour({engine,rawExit,tap}){
 const names=tap.tests.map(x=>x.name);
 const bad=reason=>({verdict:'UNVERIFIED_ORIGINAL_FOUR',reason,rawExit,summary:tap.summary});
 if(names.length!==4||!originalNames.every((name,i)=>name===names[i])||tap.summary.tests!==4||tap.summary.skipped!==0||tap.summary.cancelled!==0)return bad('missing, skipped or changed original scenarios');
 if(rawExit===0&&tap.summary.pass===4)return {verdict:engine==='new'?'PASS_NEW_UNWRAPPED_FOUR':'OLD_UNWRAPPED_FOUR_PASS',rawExit,summary:tap.summary};
 const failed=tap.tests.filter(x=>!x.pass);
 if(engine==='old'&&rawExit===1&&tap.summary.pass===2&&tap.summary.fail===2&&failed.length===2&&
    failed.every((x,i)=>x.name===originalNames[i+1]&&/page\.waitForURL: Timeout 45000ms exceeded\./.test(x.details)))
  return {verdict:'EXPECTED_OLD_UNWRAPPED_RELOAD_FAILURES',rawTestResult:'2 PASS / 2 FAIL',rawExit,summary:tap.summary,
   failures:failed.map(x=>({name:x.name,phase:'page.waitForURL(/index.html$/, domcontentloaded), timeout 45000ms'}))};
 return bad('raw unwrapped failures do not match the two known reload timeouts');
}
module.exports={tapSummary,minimal,originalFour};
