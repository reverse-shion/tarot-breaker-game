'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('star-gate-anomaly.js','utf8');
const lifecycle=source.slice(source.indexOf('async function recoverPresent('),source.indexOf('function releasePresentation('));
const reporting=source.slice(source.indexOf('function report(current)'),source.indexOf('window.addEventListener("tarot-breaker:star-gate-investigate"'));
const {coveredRestore}=require('../future-stage3.js');
async function flush(){for(let i=0;i<80;i++)await Promise.resolve();}
function harness({normal=false,restoreFails=false}={}){
 const docHandlers={},handlers={},nodes=[],reports=[],calls=[];
 const c={running:false,session:null,sessionId:0,lastResult:null,resolveAdvance:null,ui:{hide(){}},innerWidth:390,innerHeight:844,AbortController,CustomEvent:class{constructor(type,{detail}={}){this.type=type;this.detail=detail}},console:{warn(){}},failRestore:restoreFails};
 function node(){const n={style:{},className:'',disabled:false,listeners:{},children:[],classList:{add(){}},querySelector(){return null},setAttribute(){},append(...v){this.children.push(...v)},addEventListener(n,f){this.listeners[n]=f},remove(){this.removed=true}};nodes.push(n);return n;}
 const root=node();c.root=root;
 c.document={hidden:false,body:{append(){}},createElement:node,querySelector(sel){return sel==='.sga-v192-black'?nodes.find(n=>n.className==='sga-v192-black'&&!n.removed):null},querySelectorAll:()=>[],addEventListener(n,f,o){(docHandlers[n]??=[]).push({f,once:o?.once})},removeEventListener(n,f){docHandlers[n]=(docHandlers[n]||[]).filter(v=>v.f!==f)}};
 let owner=null,following=true,inputSuspended=false;
 const p0={audio:{base:.35,coefficient:1,playing:true},following:true};
 const scene={capture:()=>p0,lock(id){owner=id;inputSuspended=true;following=false;calls.push('lock')},unlock(id){if(id!==owner)return false;owner=null;inputSuspended=false;calls.push('unlock');return true},freezeCamera(){calls.push('freeze')},async restore(){calls.push('restore');if(c.failRestore)throw Error('P0 restore failed');following=p0.following},verify:()=>({completed:!c.failRestore}),async waitDraw(){calls.push('paint')},getState:()=>({presentPrepared:true,owner,vision:!!owner,absorption:false,following,inputSuspended})};
 const audio={capture:()=>p0.audio,setBase(){},setLevel(){},holdSilent(){calls.push('mute')},prepareSilent(){calls.push('prepare');return true},revealSilent(){calls.push('reveal');return true},tweenCoefficient(){calls.push('fade')},release(){calls.push('audio-release')},pause(){}};
 const clock=signal=>({assert(){if(signal?.aborted){const e=Error('Stage 3 interrupted');e.name='AbortError';throw e}},time:0,now(){return this.time},async wait(ms){this.assert();this.time+=ms;await Promise.resolve();this.assert()},async tween(ms,step){this.assert();step(0);this.time+=ms;await Promise.resolve();this.assert();step(1)},dispose(){calls.push('dispose')}});
 c.window={TarotStage3Scene:scene,TarotStage:{cancelAll(){calls.push('cancel-motions')}},TarotAudio:{beginEventSession:()=>audio},TarotFutureStage3:{createClock:clock,coveredRestore},TarotCinematicCamera:{release(){calls.push('camera-release')}},addEventListener(n,f){(handlers[n]??=[]).push(f)},removeEventListener(n,f){handlers[n]=(handlers[n]||[]).filter(v=>v!==f)},dispatchEvent(e){reports.push(e.detail);for(const f of handlers[e.type]||[])f(e)}};
 c.createGateSfx=()=>({prepare(){},dispose(){calls.push('sfx-dispose')}});c.preload=async()=>{};c.mount=()=>{};
 c.resonance=async()=>{if(normal)return;await new Promise((resolve,reject)=>{c.session.controller.signal.addEventListener('abort',()=>{const e=Error('Stage 3 interrupted');e.name='AbortError';reject(e)},{once:true})})};
 c.futureFixationStage1=async()=>{};c.futureFixationStage2=async()=>{};c.futureFixationStage3=async()=>{c.session.restored=true};
 c.releasePresentation=()=>{calls.push('presentation-release');for(const n of nodes)if(n.className==='sga-v192-black')n.remove()};c.showReturnDiagnostic=()=>{};
 vm.createContext(c);vm.runInContext(lifecycle+reporting,c);
 return {c,calls,reports,scene,nodes,run:()=>c.run(),visibility(hidden){c.document.hidden=hidden;for(const v of [...docHandlers.visibilitychange||[]]){if(v.once)c.document.removeEventListener('visibilitychange',v.f);v.f()}},retry:()=>nodes.findLast(n=>n.type==='button'&&!n.disabled)?.listeners.click()};
}
test('real Stage3 visibility abort waits hidden, restores movement/follow, releases audio then emits incomplete result',async()=>{
 const h=harness();const p=h.run();await flush();assert.equal(h.c.running,true);assert.equal(h.scene.getState().inputSuspended,true);
 h.visibility(true);await flush();assert.equal(h.reports.length,0);assert.equal(h.calls.includes('restore'),false);
 h.visibility(false);await p;const r=h.reports[0];
 assert.equal(r.reason,'background');assert.equal(r.completed,false);assert.equal(r.restored,true);assert.equal(r.audioReleased,true);assert.equal(r.running,false);
 assert.equal(r.scene.owner,null);assert.equal(r.scene.inputSuspended,false);assert.equal(r.scene.following,true);
 assert.ok(h.calls.indexOf('prepare')<h.calls.indexOf('reveal'));assert.ok(h.calls.indexOf('paint')<h.calls.indexOf('reveal'));
 assert.ok(h.calls.indexOf('unlock')<h.calls.indexOf('audio-release'));assert.equal(h.calls.filter(x=>x==='audio-release').length,1);
});
test('real restoration failure retains controls and audio lease; manual recovery clears error without auto start',async()=>{
 const h=harness({restoreFails:true});const p=h.run();await flush();h.visibility(true);await flush();h.visibility(false);await p;
 const failed=h.reports[0];assert.equal(failed.restored,false);assert.equal(failed.audioReleased,false);assert.match(failed.recoveryError,/P0 restore failed/);
 assert.equal(h.scene.getState().inputSuspended,true);assert.equal(h.calls.includes('unlock'),false);assert.equal(h.calls.includes('audio-release'),false);
 await h.run();assert.equal(h.c.sessionId,1);assert.equal(h.reports.length,1);
 h.c.failRestore=false;const retry=h.nodes.find(n=>n.type==='button');const recovering=retry.listeners.click();await retry.listeners.click();await recovering;
 const recovered=h.reports[1];assert.equal(recovered.restored,true);assert.equal(recovered.completed,false);assert.equal(recovered.recoveryError,null);assert.equal(recovered.audioReleased,true);
 assert.equal(h.scene.getState().inputSuspended,false);assert.equal(h.scene.getState().following,true);assert.equal(h.c.sessionId,1);
 assert.equal(h.calls.filter(x=>x==='audio-release').length,1);
});
test('real run rejects double launch; a restored abort allows fresh session and ignores obsolete recovery button',async()=>{
 const h=harness({restoreFails:true});const p=h.run();await flush();await h.run();assert.equal(h.c.sessionId,1);
 h.visibility(true);await flush();h.visibility(false);await p;h.c.failRestore=false;
 const oldRetry=h.nodes.find(n=>n.type==='button');await oldRetry.listeners.click();
 const p2=h.run();await flush();assert.equal(h.c.sessionId,2);const restores=h.calls.filter(x=>x==='restore').length;
 oldRetry.disabled=false;await oldRetry.listeners.click();assert.equal(h.calls.filter(x=>x==='restore').length,restores);
 h.visibility(true);await flush();h.visibility(false);await p2;
 assert.deepEqual(h.reports.map(r=>r.id),[1,1,2]);assert.equal(h.reports.at(-1).restored,true);
});
test('normal real finalizer reports clean completed/restored session with audio released',async()=>{
 const h=harness({normal:true});await h.run();const r=h.reports[0];assert.equal(r.completed,true);assert.equal(r.restored,true);assert.equal(r.audioReleased,true);
 assert.equal(r.error,undefined);assert.equal(r.reason,undefined);assert.equal(r.scene.owner,null);
});
