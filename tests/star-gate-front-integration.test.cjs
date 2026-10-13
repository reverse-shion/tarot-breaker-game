const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
function harness(dev=true){
 const handlers={};let player={x:810,y:165};const emitted=[];let interval;
 const scene={presentPrepared:true,owner:null,vision:false,absorption:false};
 const control={owner:null,inputSuspended:false,npcSuspended:false};
 const camera={owned:false};const dialogue={active:false};let result={running:false};let overlay=false;
 const buttons={};const prompt={hidden:true,classList:{visible:false,add(){this.visible=true},remove(){this.visible=false},contains(){return this.visible}},setAttribute(){},querySelector(sel){return buttons[sel]??={addEventListener(){}}}};
 const window={__TAROT_DEV_STAGE3__:dev,TarotStage:{getState:()=>({actors:{shion:player}})},TarotStage3Scene:{getState:()=>scene},TarotAftermathScene:{getState:()=>control},TarotCinematicCamera:{getState:()=>camera},TarotDialogue:{getState:()=>dialogue},TarotStarGateAnomaly:{getState:()=>result},addEventListener(n,f){(handlers[n]??=[]).push(f)},dispatchEvent(e){emitted.push(e.type);for(const f of handlers[e.type]||[])f(e)},setInterval(f){interval=f},setTimeout(f){f()},TarotAudio:{startFromMovement(){emitted.push('audio-unlock')}}};
 const document={hidden:false,querySelector:()=>overlay?{}:null,createElement:()=>prompt,getElementById:()=>({appendChild(){}})};
 const context={window,document,CustomEvent:class{constructor(type,{detail}={}){this.type=type;this.detail=detail}},setTimeout(f){f()}};
 vm.runInNewContext(fs.readFileSync('star-gate-interaction.js','utf8'),context);
 return{window,document,emitted,prompt,scene,control,camera,dialogue,setOverlay(v){overlay=v},setResult(v){result=v},notify(v){result=v;window.dispatchEvent({type:'tarot-breaker:stage3-session-ended',detail:v})},move(x,y){player={x,y};interval?.()},tick(){interval?.()}};
}
const ended=(overrides={})=>({id:1,running:false,completed:false,restored:true,audioReleased:true,reason:'background',error:'AbortError: cancelled',scene:{presentPrepared:true,owner:null,vision:false,absorption:false},...overrides});
const api=h=>h.window.TarotStarGateInteraction;
function attempt(h){h.move(810,145);assert.equal(api(h).start(),true);assert.equal(api(h).start(),false);}
test('integration approach offers choice; leaving releases input and requires spatial exit/reentry',()=>{
 const h=harness();assert.equal(h.window.TarotStarGateInteraction.getState().active,false);
 h.move(810,145);assert.equal(h.window.TarotStarGateInteraction.getState().active,true);
 h.window.TarotStarGateInteraction.leave();assert.equal(h.window.TarotStarGateInteraction.getState().promptLock,false);
 h.tick();assert.equal(h.window.TarotStarGateInteraction.getState().active,false);assert.equal(h.emitted.includes('tarot-breaker:star-gate-investigate'),false);
 h.move(810,205);h.move(810,145);assert.equal(h.window.TarotStarGateInteraction.getState().active,true);
});
test('prompt releases its lock before P0 event dispatch and completed/interrupted attempts never autoreplay',()=>{
 for(const completed of [true,false])for(const restored of [true,false]){const h=harness();attempt(h);
 assert.ok(h.emitted.indexOf('tarot-breaker:interaction-end')<h.emitted.indexOf('tarot-breaker:star-gate-investigate'));
 h.notify(ended({completed,restored,reason:completed?undefined:'background',error:completed?undefined:'AbortError'}));h.tick();
 assert.equal(api(h).getState().completed,completed&&restored);assert.equal(api(h).getState().active,false);
 assert.equal(h.emitted.filter(n=>n==='tarot-breaker:star-gate-investigate').length,1);
 }
});
test('completed dev event consumes once and cannot repeat after leaving/reapproaching',()=>{
 const h=harness();attempt(h);const report=ended({completed:true,reason:null,error:null});h.notify(report);
 h.move(810,205);h.move(810,145);h.notify(report);
 assert.equal(api(h).getState().completed,true);assert.equal(api(h).getState().active,false);assert.equal(api(h).start(),false);
});
test('background, viewport and explicit cancellation recover then permit only deliberate fresh retry',()=>{
 for(const reason of ['background','viewport',undefined]){const h=harness();attempt(h);h.notify(ended({reason}));
 assert.equal(api(h).getState().completed,false);assert.equal(api(h).getState().promptLock,false);
 for(let i=0;i<10;i++)h.tick();assert.equal(api(h).getState().active,false);assert.equal(api(h).start(),false);
 h.move(810,200);assert.equal(api(h).getState().armed,false);h.move(810,201);assert.equal(api(h).getState().armed,true);
 h.move(810,152);assert.equal(api(h).getState().active,false);h.move(810,151);assert.equal(api(h).getState().active,true);
 assert.equal(h.emitted.filter(n=>n==='tarot-breaker:star-gate-investigate').length,1);
 assert.equal(api(h).start(),true);assert.equal(api(h).start(),false);
 h.notify(ended({id:2,completed:true,reason:null,error:null}));h.move(810,205);h.move(810,145);
 assert.equal(api(h).getState().completed,true);assert.equal(api(h).getState().active,false);
 assert.equal(h.emitted.filter(n=>n==='tarot-breaker:star-gate-investigate').length,2);
 }
});
test('failed restoration stays STOP until a verified manual recovery of the same attempt',()=>{
 const h=harness();attempt(h);h.scene.owner=1;h.control.owner=1;h.control.inputSuspended=true;
 h.notify(ended({restored:false,audioReleased:false,recoveryError:'P0 failed'}));h.move(810,205);h.move(810,145);
 assert.equal(api(h).getState().pending,true);assert.equal(api(h).getState().completed,false);assert.equal(api(h).start(),false);
 h.notify(ended({recoveryError:null}));h.move(810,205);assert.equal(api(h).getState().armed,false);
 h.scene.owner=null;h.control.owner=null;h.control.inputSuspended=false;h.move(810,205);h.move(810,145);
 assert.equal(api(h).getState().active,true);assert.equal(api(h).start(),true);
});
test('duplicate notifications preserve a recovered choice and stale attempt cannot consume a new session',()=>{
 const h=harness();attempt(h);const first=ended();h.notify(first);h.move(810,205);h.move(810,145);h.notify(first);
 assert.equal(api(h).getState().active,true);assert.equal(api(h).start(),true);
 h.setResult(ended({id:2,running:true,restored:false}));
 h.window.dispatchEvent({type:'tarot-breaker:stage3-session-ended',detail:ended({completed:true,error:null,reason:null})});
 assert.equal(api(h).getState().completed,false);assert.equal(api(h).getState().pending,true);
});
test('malformed, partial and cancelled completion reports never unlock retry or claim success',()=>{
 for(const changes of [{id:undefined},{running:true},{restored:false},{audioReleased:false},{completed:true,reason:'background'},
 {completed:true,error:'failure'},{completed:true,recoveryError:'restore'},{completed:true,reason:null,error:null,scene:{owner:1}},
 {completed:true,reason:null,error:null,scene:null},{completed:true,reason:null,error:null,scene:{owner:null,vision:true}}]){
 const h=harness();attempt(h);h.notify(ended(changes));h.move(810,205);h.move(810,145);
 assert.equal(api(h).getState().completed,false);assert.equal(api(h).getState().active,false);assert.equal(api(h).start(),false);
 }
});
test('same-id notification cannot claim completion or recovery against the live session',()=>{
 for(const live of [ended({restored:false,audioReleased:false}),ended({recoveryError:'P0 failed'}),
 ended({completed:true,reason:null,error:null,scene:{owner:1}})]){
 const h=harness();attempt(h);h.setResult(live);
 h.window.dispatchEvent({type:'tarot-breaker:stage3-session-ended',detail:ended({completed:true,reason:null,error:null})});
 h.move(810,205);h.move(810,145);assert.equal(api(h).getState().completed,false);assert.equal(api(h).getState().active,false);
 }
});
test('rearm waits for visible prepared scene, free controls/camera, dialogue and audio lease release',()=>{
 const cases=[h=>{h.document.hidden=true;return()=>h.document.hidden=false},h=>{h.scene.presentPrepared=false;return()=>h.scene.presentPrepared=true},
 h=>{h.scene.owner=1;return()=>h.scene.owner=null},h=>{h.scene.vision=true;return()=>h.scene.vision=false},h=>{h.scene.absorption=true;return()=>h.scene.absorption=false},
 h=>{h.control.inputSuspended=true;return()=>h.control.inputSuspended=false},h=>{h.control.npcSuspended=true;return()=>h.control.npcSuspended=false},
 h=>{h.camera.owned=true;return()=>h.camera.owned=false},h=>{h.dialogue.active=true;return()=>h.dialogue.active=false},h=>{h.setOverlay(true);return()=>h.setOverlay(false)},
 h=>{h.setResult(ended({audioReleased:false}));return()=>h.setResult(ended())}];
 for(const block of cases){const h=harness();attempt(h);h.notify(ended());const unblock=block(h);h.move(810,205);h.move(810,145);
 assert.equal(api(h).getState().armed,false);assert.equal(api(h).getState().active,false);unblock();h.tick();assert.equal(api(h).getState().active,false);
 h.move(810,205);h.move(810,145);assert.equal(api(h).getState().active,true);
 }
});
test('locked initial scene does not offer choice and a dialogue lock racing inspect blocks start',()=>{
 const h=harness();h.control.inputSuspended=true;h.move(810,145);assert.equal(api(h).getState().active,false);
 h.control.inputSuspended=false;h.tick();assert.equal(api(h).getState().active,true);h.dialogue.active=true;assert.equal(api(h).start(),false);
 h.tick();assert.equal(api(h).getState().active,false);
});
test('foreign interaction hides choice without releasing the foreign owner',()=>{
 const h=harness();h.move(810,145);const before=h.emitted.filter(n=>n==='tarot-breaker:interaction-end').length;
 h.window.dispatchEvent({type:'tarot-breaker:interaction-start',detail:{source:'other-dialogue'}});
 assert.equal(api(h).getState().active,false);assert.equal(api(h).start(),false);
 assert.equal(h.emitted.filter(n=>n==='tarot-breaker:interaction-end').length,before);
 h.window.dispatchEvent({type:'tarot-breaker:interaction-end',detail:{source:'other-dialogue'}});
 assert.equal(api(h).getState().active,true);
});
test('ordinary routes install no interaction or Production backend',()=>{const h=harness(false);assert.equal(h.window.TarotStarGateInteraction,undefined);assert.deepEqual(h.emitted,[])});
test('normal and Stage3 use the same 230.86px inner light without moving the gate',()=>{
 function layout(dev){const window={__TAROT_DEV_STAGE3__:dev};const document={querySelector:()=>null,head:{appendChild(){}},createElement:()=>({dataset:{}})};const c=vm.createContext({window,document});for(const file of ['scene-layout.js','scene-preview41-fix.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);return window.TarotSceneLayout.gateAssembly;}
 const approved=layout(true),normal=layout(false);
 assert.equal(approved.innerLight.w,230.86);
 assert.equal(normal.innerLight.w,230.86);
 for(const view of [approved,normal]){
  assert.ok(Math.abs(view.innerLight.x-684.57)<1e-10);
  assert.ok(Math.abs(view.innerLight.y+view.innerLight.h-210)<1e-10);
  assert.equal(view.starGate.w,560);
  assert.ok(Math.abs(view.starGate.x+view.starGate.w/2-800)<1e-10);
 }
});

test('corrupted inner light uses opaque normal compositing and no retained dark-energy frame',()=>{
 const css=fs.readFileSync('star-gate-anomaly.css','utf8');
 const boot=fs.readFileSync('stage3-dev-bootstrap.js','utf8');
 assert.doesNotMatch(boot,/scene-gate-inner-backing/);
 assert.doesNotMatch(css,/scene-gate-inner-backing/);
 assert.match(css,/sga-anomaly-rest \.scene-gate-inner-light\{[\s\S]*opacity:1!important[\s\S]*mix-blend-mode:normal!important/);
 const restImage=css.slice(css.lastIndexOf('#game-shell.sga-anomaly-rest .scene-gate-inner-light>img{'));
 assert.match(restImage,/filter:none!important/);
 assert.match(restImage,/object-fit:cover/);
 assert.match(restImage,/clip-path:polygon\(50% 0%/);
 assert.match(restImage,/animation:none!important/);
 assert.match(css,/sga-anomaly-rest \.scene-dark-energy-rise,[\s\S]*visibility:hidden!important/);
});
