'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const core=require('../progress.js'),EVENT='garden_star_gate_anomaly';
const history=['alenon_prologue','landing_devil_memory','garden_shiopon_meet','garden_lumiere_gate'];
function harness({completed=false,missingMeeting=false,writeFailure=false,readbackFailure=false}={}){
 let bytes=JSON.stringify({version:1,checkpoint:{mapId:'star_gate_garden',spawnId:'south_gate'},completedEvents:completed?[...history,EVENT]:missingMeeting?history.slice(0,3):history,companion:'joined_with_shion'}),writes=0;
 const storage={getItem:()=>bytes,setItem(k,v){writes++;if(writeFailure)throw Error('storage blocked');if(!readbackFailure)bytes=v;}};
 const progress=core.createProgress({storage});assert.equal(progress.load().status,'valid');
 const listeners={},scene={owner:null,inputSuspended:false,npcSuspended:false,lumiereEnabled:true,following:true},story={shioponDone:true,lumiereDone:!missingMeeting,joined:true,active:false};
 let report={id:1,state:'NOT_STARTED',completed:false,cancelled:false},stage={id:1,running:false,completed:true,restored:true,audioReleased:true,scene:{owner:null,vision:false,absorption:false}};
 const window={__TAROT_PUBLIC_STAR_GATE__:true,TarotStarGateProgress:{getCurrentState:()=>progress.getCurrentState(),completeEvent:(id,checkpoint)=>progress.completeEvent(id,JSON.parse(JSON.stringify(checkpoint)))},
  TarotProgressCore:{createProgress:()=>core.createProgress({storage})},TarotDialogue:{getState:()=>story},
  TarotStarGateAftermath:{getState:()=>report},TarotStarGateAnomaly:{getState:()=>stage,restoreCompletedGate(){scene.gateRestored=true;return true}},
  TarotAftermathScene:{getState:()=>scene,setLumiereDeparted(){scene.lumiereEnabled=false}},TarotCinematicCamera:{getState:()=>({owned:false})},
  addEventListener(n,f){(listeners[n]??=[]).push(f)}};
 const c={window,console:{warn(){}},Image:class{naturalWidth=100;naturalHeight=100;set src(s){queueMicrotask(()=>this.onload())}decode(){return Promise.resolve()}},setTimeout,clearTimeout};
 vm.runInNewContext(fs.readFileSync('star-gate-public.js','utf8'),c);
 return {window,scene,story,progress,api:window.TarotStarGatePublic,writes:()=>writes,bytes:()=>bytes,
  notify(value){(listeners['tarot-breaker:aftermath-ended']||[]).forEach(f=>f({detail:value||report}));},
  finish(overrides={}){report={id:1,state:'COMPLETED',completed:true,cancelled:false,...overrides};scene.lumiereEnabled=false;return report;},
  setStage(value){stage={...stage,...value}}};
}
function bootstrap(search,{resume=false,rejected=false}={}){
 const writes=[],image={src:''},sky={classList:{add(){}},querySelector:()=>image},gate={querySelector:()=>({classList:{add(){}}}),append(){}};
 const shell={querySelector:s=>s==='.scene-farthest-sky'?sky:gate,insertAdjacentHTML(){}};
 const window={__tarotRuntimeEntryRejected:rejected,TarotGardenContinueTransit:resume?{ok:true}:undefined};
 const c={window,document:{getElementById:()=>shell,createElement:()=>({}),write:s=>writes.push(s)},location:{search},URLSearchParams};
 vm.runInNewContext(fs.readFileSync('star-gate-public-bootstrap.js','utf8'),c);return {window,writes};
}
test('public bootstrap admits only actual ordinary Garden arrival or validated Continue, no fixture/Journey writes',()=>{
 for(const [search,resume] of [['?from=landing',false],['?entry=continue',true]]){
  const h=bootstrap(search,{resume});assert.equal(h.window.__TAROT_PUBLIC_STAR_GATE__,true);
  assert.equal(h.window.__TAROT_DEV_STAGE3__,undefined);assert.equal(h.window.TarotStage3DevFixture,undefined);assert.equal(h.window.TarotJourney,undefined);
  for(const file of ['future-stage3.js','future-vision-audio.js','star-gate-anomaly.js','star-gate-interaction.js','star-gate-aftermath.js','star-gate-public.js'])assert.equal(h.writes.filter(s=>s.includes(file)).length,1,file);
  assert.equal(h.writes.some(s=>s.includes('dev-checkpoints.js')),false);
 }
 for(const search of ['?from=landing','?entry=continue']){const h=bootstrap(search,{resume:true,rejected:true});assert.equal(h.window.__TAROT_PUBLIC_STAR_GATE__,undefined);assert.deepEqual(h.writes,[]);}
 for(const search of ['', '?entry=continue','?from=landing&entry=continue','?from=landing&from=landing','?from=landing&dev=star-gate-full','?from=landing&fountainEditor=1','?from=landing&mapEditor=1','?from=landing&collisionEditor=1','?from=landing&depthEditor=1','?from=landing&padEdit=1','?entry=continue&entry=continue','?from=title','?dev=star-gate-from-lumiere'])assert.equal(bootstrap(search).window.__TAROT_PUBLIC_STAR_GATE__,undefined,search);
});
test('normal prerequisite requires both live authored completion and current Progress with joined companion',()=>{
 const h=harness();assert.equal(h.api.canInvestigate(),true);h.story.active=true;assert.equal(h.api.canInvestigate(),false);h.story.active=false;h.story.joined=false;assert.equal(h.api.canInvestigate(),false);
 const missing=harness({missingMeeting:true});missing.story.lumiereDone=true;assert.equal(missing.api.canInvestigate(),false);
 h.window.TarotStarGateProgress=undefined;assert.equal(h.api.canInvestigate(),false);
});
test('Stage3 success and spoofed/stale or unfinished Aftermath never persist completion',()=>{
 const h=harness();h.notify({id:1,state:'COMPLETED',completed:true,cancelled:false});assert.equal(h.writes(),0);
 h.finish();h.notify({id:2,state:'COMPLETED',completed:true,cancelled:false});assert.equal(h.writes(),0);
 h.scene.inputSuspended=true;h.notify();assert.equal(h.writes(),0);h.scene.inputSuspended=false;
 h.setStage({audioReleased:false});h.notify();assert.equal(h.writes(),0);assert.equal(h.api.getState().completed,false);
});
test('final actual Aftermath saves exactly once, validates readback and suppresses subsequent investigation',()=>{
 const h=harness();h.finish();h.notify();assert.equal(h.writes(),1);assert.equal(h.api.getState().persisted,true);assert.equal(h.api.canInvestigate(),false);
 h.notify();assert.equal(h.writes(),1);const saved=JSON.parse(h.bytes());assert.ok(saved.completedEvents.includes(EVENT));assert.equal(saved.companion,'joined_with_shion');assert.equal(saved.version,1);
});
test('storage write or lying readback failure retains page consumption without claiming durable success or ownership',()=>{
 for(const options of [{writeFailure:true},{readbackFailure:true}]){
  const h=harness(options);h.finish();h.notify();assert.equal(h.api.getState().completed,true);assert.equal(h.api.getState().persisted,false);assert.ok(h.api.getState().error);assert.equal(h.scene.owner,null);assert.equal(h.scene.inputSuspended,false);assert.equal(h.api.canInvestigate(),false);
  assert.equal(JSON.parse(h.bytes()).completedEvents.includes(EVENT),false);h.notify();assert.equal(h.writes(),1);
 }
});
test('old pre-event saves remain valid; completed reload restores gate and departure and never enables a new event',async()=>{
 const old=harness();assert.equal(old.api.canInvestigate(),true);assert.equal(old.api.restoreCompleted(),false);
 const h=harness({completed:true});await h.api.prepareRestoration();assert.equal(h.api.canInvestigate(),false);assert.equal(h.api.restoreCompleted(),true);assert.equal(h.scene.gateRestored,true);assert.equal(h.scene.lumiereEnabled,false);assert.equal(h.scene.following,true);assert.equal(h.api.restoreCompleted(),false);assert.equal(h.writes(),0);
});
test('completion survives actual Progress route roundtrip and resolver without replay or lost companion',()=>{
 const h=harness();h.finish();h.notify();
 h.progress.commitArrival({sourceMapId:'star_gate_garden',destinationMapId:'star_country_landing',spawnId:'garden_entrance',reason:'garden_to_landing'});
 h.progress.commitArrival({sourceMapId:'star_country_landing',destinationMapId:'star_gate_garden',spawnId:'south_gate',reason:'gate_to_garden'});
 assert.equal(h.progress.isEventCompleted(EVENT),true);assert.equal(h.progress.getCurrentState().state.companion,'joined_with_shion');
 const resumed=require('../progress-resume.js').resolveContinue(core.createProgress({storage:{getItem:()=>h.bytes()}}).load());assert.equal(resumed.ok,true);assert.ok(resumed.context.completedEvents.includes(EVENT));
});
test('actual game exports public Scene/P0/Aftermath/camera without a developer fixture and retains normal exit',async()=>{
 const file=fs.readFileSync('tests/game.test.cjs','utf8'),f={require,__dirname,URLSearchParams,queueMicrotask,setImmediate};vm.runInNewContext(file.slice(0,file.indexOf("test('")),f);
 const h=await f.boot({dialogueState:{active:false,shioponDone:true,lumiereDone:true,joined:true},configure({window,sandbox}){
  const p=core.createProgress({storage:{getItem:()=>JSON.stringify({version:1,checkpoint:{mapId:"star_gate_garden",spawnId:"south_gate"},completedEvents:history,companion:"joined_with_shion"})}});p.load();window.TarotStarGateProgress=p;
  window.__TAROT_PUBLIC_STAR_GATE__=true;window.TarotJourney={get:key=>key==='gardenStory'?{shioponDone:true,lumiereDone:true,joined:true}:null,set(){}};
  vm.runInContext(fs.readFileSync("star-gate-public.js","utf8"),sandbox);
 }});
 assert.equal(h.window.TarotStage3DevFixture,undefined);assert.equal(h.window.TarotStage3Scene.getState().presentPrepared,true);
 const p0=h.window.TarotStage3Scene.capture();assert.equal(p0.npcLogical.companion,'joined_with_shion');assert.equal(p0.npcLogical.story.lumiereDone,true);
 assert.equal(h.window.TarotAftermathScene.getState().following,true);assert.equal(h.window.TarotCinematicCamera.getState().owned,false);
 h.window.TarotAftermathScene.setLumiereDeparted(true);h.tick();assert.equal(h.window.TarotAftermathScene.getState().lumiereEnabled,false);
 assert.equal(h.errors.length,0);
});

test('actual public Aftermath emits final completion only after both talks/departure; observer then writes once',async()=>{
 const fixture=fs.readFileSync('tests/star-gate-aftermath.test.cjs','utf8'),f={require,__dirname,AbortController};
 vm.runInNewContext(fixture.slice(0,fixture.indexOf("test('")),f);
 const p=harness();
 const h=f.harness({dev:false,publicRoute:true,interaction:true,configure(window,context){
  window.TarotStarGateProgress=p.window.TarotStarGateProgress;window.TarotProgressCore=p.window.TarotProgressCore;
  window.TarotDialogue={getState:()=>({active:false,shioponDone:true,lumiereDone:true,joined:true})};
  vm.runInNewContext(fs.readFileSync('star-gate-public.js','utf8'),context);
 }});
 await f.begin(h);assert.equal(p.writes(),0);assert.equal(h.window.TarotStarGatePublic.getState().completed,false);
 let actor=h.state().actors.shiopon;h.movePlayer(actor.x,actor.y+18);const first=h.window.TarotStarGateAftermath.talk('shiopon');
 await f.drive(h,()=>h.window.TarotStarGateAftermath.getState().state==='CHECK_COMPANIONS');await first;assert.equal(p.writes(),0);
 actor=h.state().actors.lumiere;h.movePlayer(actor.x,actor.y+18);const second=h.window.TarotStarGateAftermath.talk('lumiere');
 await f.drive(h,()=>h.window.TarotStarGateAftermath.getState().completed,2500);assert.equal(await second,true);
 assert.equal(p.writes(),1);assert.equal(h.window.TarotStarGatePublic.getState().persisted,true);
 assert.equal(h.state().following,true);assert.equal(h.state().lumiereEnabled,false);assert.equal(h.state().owner,null);
});

test('actual Continue revalidation rebinds the real meeting observer and Star Gate to one fresh Progress authority',()=>{
 let bytes=JSON.stringify({version:1,checkpoint:{mapId:'star_gate_garden',spawnId:'south_gate'},completedEvents:history.slice(0,3),companion:'joined_with_shion'});
 const handlers={},storage={getItem:()=>bytes,setItem(k,v){bytes=v;}};
 const c={location:{search:'?entry=continue'},localStorage:storage,sessionStorage:storage,URLSearchParams,
  console:{warn(){}},addEventListener(n,f){(handlers[n]??=[]).push(f)},__TAROT_PUBLIC_STAR_GATE__:true,
  TarotJourney:{set(){},get:()=>({shioponDone:true,lumiereDone:false,joined:true})},
  TarotDialogue:{getState:()=>({shioponDone:true,lumiereDone:true,joined:true,active:false})}};
 c.window=c;vm.createContext(c);
 for(const file of ['route-registry.js','progress.js','progress-resume.js','public-continue.js','garden-resume.js','garden-public-continue.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
 c.TarotGardenContinueTransit=c.TarotGardenPublicContinue.receive({search:c.location.search,storage});assert.equal(c.TarotGardenContinueTransit.ok,true);
 vm.runInContext(fs.readFileSync('garden-progress-observer.js','utf8'),c);
 const original=c.TarotStarGateProgress,fresh=c.TarotGardenPublicContinue.revalidate(c.TarotGardenContinueTransit,{search:c.location.search,storage});
 assert.equal(fresh.ok,true);assert.notEqual(fresh.progress,original);c.TarotGardenContinueTransit=fresh;
 assert.equal(c.TarotStarGateProgressAuthority.rebind(original),false);assert.equal(c.TarotStarGateProgressAuthority.rebind(fresh.progress),true);
 vm.runInContext(fs.readFileSync('star-gate-public.js','utf8'),c);assert.equal(c.TarotStarGatePublic.canInvestigate(),false);
 (handlers['tarot-breaker:interaction-end']||[]).forEach(f=>f({}));
 assert.equal(fresh.progress.isEventCompleted('garden_lumiere_gate'),true);
 assert.equal(c.TarotStarGatePublic.canInvestigate(),true);assert.equal(JSON.parse(bytes).completedEvents.includes('garden_lumiere_gate'),true);
 assert.equal(original.isEventCompleted('garden_lumiere_gate'),false);
});
