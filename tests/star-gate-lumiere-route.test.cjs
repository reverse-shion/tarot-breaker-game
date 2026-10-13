'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const bootSource=fs.readFileSync('stage3-dev-bootstrap.js','utf8');
const routeSource=fs.readFileSync('star-gate-route.js','utf8');
async function flush(){for(let i=0;i<40;i++)await Promise.resolve();}
function bootstrap(search){
 const writes=[],mutations=[],handlers={},error={hidden:true};
 const image={src:''},sky={classList:{add(){}},querySelector:()=>image};
 const gate={querySelector:()=>({classList:{add(){}}}),append(){}};
 const shell={querySelector:sel=>sel==='.scene-farthest-sky'?sky:gate,insertAdjacentHTML(){}};
 const window={addEventListener(name,fn){(handlers[name]??=[]).push(fn)}};
 const document={body:{dataset:{},classList:{add(){}},appendChild(){}},documentElement:{dataset:{}},getElementById:id=>id==='game-shell'?shell:error,
  write:s=>writes.push(s),createElement:()=>({})};
 const storage={getItem(){mutations.push('read');throw Error('production storage')},setItem(){mutations.push('write');throw Error('production storage')}};
 const location={search,pathname:'/index.html',hash:''};
 const history={replaceState(_state,_title,url){location.search=url.slice(url.indexOf('?'));}};
 const c={window,document,location,history,URLSearchParams,localStorage:storage,sessionStorage:storage};
 vm.createContext(c);vm.runInContext(fs.readFileSync('star-gate-route-entry.js','utf8'),c);vm.runInContext(bootSource,c);
 return {c,window,document,writes,mutations,error};
}
test('registered checkpoint starts before real Lumiere and uses a safe authored approach spawn',()=>{
 const definition=require('../dev-checkpoints.js').get('star-gate-from-lumiere');
 const contracts=JSON.parse(fs.readFileSync('event-contracts.json','utf8')).events;
 assert.equal(contracts[definition.event].segments[definition.segment],'NOT TESTED');assert.equal(contracts[definition.event].productionEnabled,false);
 for(const file of definition.requiredRuntime)assert.ok(fs.existsSync(file),file);
 assert.deepEqual([...definition.temporaryState.completedEvents],['alenon_prologue','landing_devil_memory','garden_shiopon_meet']);
 const h=bootstrap('?dev=star-gate-from-lumiere');assert.equal(h.window.__TAROT_DEV_STAR_GATE_ROUTE__,true);
 assert.equal(h.window.TarotJourney.get('gardenStory').lumiereDone,false);
 const spawn=h.window.TarotStage3DevFixture.context.spawn;assert.deepEqual({...spawn},{x:810,y:400});
 assert.equal(require('./helpers/garden-runtime.cjs').gardenRuntime().collision.isWalkable(spawn.x,spawn.y),true);
 assert.equal(h.writes.filter(s=>s.includes('star-gate-route.js')).length,1);assert.deepEqual(h.mutations,[]);
});
test('old Stage3 checkpoint remains at its gate fixture and ordinary requests create nothing',()=>{
 const old=bootstrap('?dev=star-gate-full');assert.equal(old.window.TarotJourney.get('gardenStory').lumiereDone,true);
 assert.deepEqual({...old.window.TarotStage3DevFixture.context.spawn},{x:810,y:177});
 assert.equal(old.window.__TAROT_DEV_STAR_GATE_ROUTE__,undefined);assert.equal(old.writes.some(s=>s.includes('star-gate-route.js')),false);
 for(const search of ['', '?from=landing','?entry=continue','?dev=garden-resume-after-lumiere']){
  const h=bootstrap(search);assert.equal(h.window.__TAROT_DEV_STAGE3__,undefined);assert.deepEqual(h.writes,[]);assert.deepEqual(h.mutations,[]);
 }
});
test('malformed/conflicting Lumiere entry blocks game boot and storage observers without loading an event',()=>{
 for(const search of ['?dev=star-gate-from-lumiere&dev=star-gate-full','?dev=star-gate-full&dev=star-gate-from-lumiere',
  '?dev=star-gate-from-lumiere&from=landing','?dev=star-gate-from-lumiere&entry=continue','?dev=star-gate-from-lumiere&gateDebug=inner-light',
  '?dev=star-gate-from-lumiere&fountainEditor=1','?dev=star-gate-from-lumiere&waterfallEditor=1','?dev=star-gate-from-lumiere&titleEditor=1','?dev=star-gate-from-lumiere&returnDebug=1&returnDebug=1','?dev=star-gate-from-lumiere&edit=1','?dev=star-gate-from-lumiere&titlePreview=first']){
  const h=bootstrap(search);assert.equal(h.window.__TAROT_STAGE3_ENTRY_REJECTED__,true);assert.equal(h.error.hidden,false);assert.deepEqual(h.writes,[]);
  vm.runInNewContext(fs.readFileSync('game.js','utf8'),{window:h.window});
  for(const file of ['title-first-visit-preview.js','garden-dev-bootstrap.js','fountain-position-editor.js','waterfall-position-editor.js','title-layout-editor.js'])vm.runInContext(fs.readFileSync(file,'utf8'),h.c);
  h.c.__TAROT_DEV_STAGE3__=true;vm.runInContext(fs.readFileSync('garden-progress-observer.js','utf8'),h.c);
  assert.deepEqual(h.mutations,[]);assert.equal(h.window.TarotStage3Scene,undefined);
 }
});
function realRoute(){
 const fixtureSource=fs.readFileSync('tests/dialogue.test.cjs','utf8');
 const fixture={require,__dirname};vm.runInNewContext(fixtureSource.slice(0,fixtureSource.indexOf("test('")),fixture);
 let player={x:810,y:400};const facts={gardenStory:{shioponDone:true,lumiereDone:false,joined:true}},writes=[],intervals=[];
 const control={owner:null,inputSuspended:false,npcSuspended:false};let result={running:false};
 const h=fixture.bootDialogue({configure({window,document}){
  window.__TAROT_DEV_STAGE3__=true;window.__TAROT_DEV_STAR_GATE_ROUTE__=true;
  window.location={search:'?dev=star-gate-from-lumiere'};window.setInterval=f=>intervals.push(f);window.setTimeout=f=>f();
  window.TarotGardenDevTransit={ok:true,projection:{gardenStory:{...facts.gardenStory}}};
  window.TarotJourney={get:key=>facts[key],set(key,value){facts[key]=value;writes.push({key,value})}};
  window.TarotStage.getState=()=>({actors:{shion:player,shiopon:{x:754,y:400},lumiere:{x:810,y:212}}});
  window.TarotStage3Scene={getState:()=>({presentPrepared:true,owner:null,vision:false,absorption:false})};
  window.TarotAftermathScene={getState:()=>control};window.TarotCinematicCamera={getState:()=>({owned:false})};
  window.TarotStarGateAnomaly={getState:()=>result};document.hidden=false;document.querySelector=()=>null;
  window.addEventListener('tarot-breaker:interaction-start',()=>{control.inputSuspended=control.npcSuspended=true});
  window.addEventListener('tarot-breaker:interaction-end',()=>{control.inputSuspended=control.npcSuspended=false});
 }});
 Object.assign(h.sandbox,{location:h.window.location,URLSearchParams});
 vm.runInContext(routeSource,h.sandbox);vm.runInContext(fs.readFileSync('star-gate-interaction.js','utf8'),h.sandbox);
 vm.runInContext(fs.readFileSync('story-event-guard.js','utf8'),h.sandbox);
 h.controls=h.window.TarotControls.createControls();
 return {...h,facts,writes,control,route:h.window.TarotStarGateRoute,interaction:h.window.TarotStarGateInteraction,
  tick(){intervals.forEach(f=>f())},move(x,y){player={x,y};h.controls.step(player,.016,155);intervals.forEach(f=>f())},
  notify(overrides={}){result={id:1,running:false,completed:false,restored:true,audioReleased:true,reason:'background',error:'AbortError',scene:{owner:null,vision:false,absorption:false},...overrides};h.window.emit('tarot-breaker:stage3-session-ended',{detail:result});}};
}
async function finishMeeting(h){
 for(let i=0;i<600&&h.window.TarotDialogue.getState().active;i++){h.window.TarotDialogue.advance();await flush();}
 assert.equal(h.window.TarotDialogue.getState().active,false);assert.equal(h.window.TarotDialogue.getState().lumiereDone,true);
}
test('actual mandatory Lumiere dialogue gates the real choice and projects its completion without a second trigger',async()=>{
 const h=realRoute();h.move(810,400);assert.equal(h.window.TarotDialogue.getState().active,false);assert.equal(h.route.canInvestigate(),false);
 assert.equal(h.interaction.getState().active,false);h.move(810,350);await flush();
 assert.equal(h.window.TarotDialogue.getState().eventId,'lumiereGate');assert.equal(h.route.canInvestigate(),false);
 h.window.emit('tarot-breaker:interaction-end',{detail:{completed:true,lumiereDone:true}});h.tick();
 assert.equal(h.interaction.getState().active,false);assert.equal(h.facts.gardenStory.lumiereDone,false);
 await finishMeeting(h);assert.equal(h.facts.gardenStory.lumiereDone,true);assert.equal(h.route.canInvestigate(),true);
 h.move(810,145);assert.equal(h.interaction.getState().active,true);assert.equal(h.interaction.start(),true);assert.equal(h.interaction.start(),false);
 assert.equal(h.signals.filter(s=>s.type==='tarot-breaker:star-gate-investigate').length,1);
 assert.equal(h.performed.filter(c=>c.type==='approach'&&c.target==='lumiere').length,1);
 assert.deepEqual({...h.facts.gardenStory},{shioponDone:true,lumiereDone:true,joined:true});
});
test('after real Lumiere completion, leave requires exit and recovered Stage3 retries do not replay Lumiere',async()=>{
 const h=realRoute();h.move(810,350);await flush();await finishMeeting(h);h.move(810,145);
 h.interaction.leave();h.tick();assert.equal(h.interaction.getState().active,false);h.move(810,205);h.move(810,145);
 assert.equal(h.interaction.start(),true);h.notify();h.tick();assert.equal(h.interaction.getState().completed,false);assert.equal(h.interaction.getState().active,false);
 h.move(810,205);h.move(810,145);assert.equal(h.interaction.start(),true);
 h.notify({id:2,completed:true,reason:undefined,error:undefined});h.move(810,205);h.move(810,145);
 assert.equal(h.interaction.getState().completed,true);assert.equal(h.interaction.getState().active,false);
 assert.equal(h.performed.filter(c=>c.type==='approach'&&c.target==='lumiere').length,1);
 assert.equal(h.signals.filter(s=>s.type==='tarot-breaker:star-gate-investigate').length,2);
});
test('missing route receiver, active/reset dialogue or held control cannot enable the route choice',async()=>{
 const h=realRoute();h.move(810,350);await flush();await finishMeeting(h);
 h.control.inputSuspended=true;h.move(810,145);assert.equal(h.interaction.getState().active,false);h.control.inputSuspended=false;
 const route=h.window.TarotStarGateRoute;h.window.TarotStarGateRoute=undefined;h.tick();assert.equal(h.interaction.getState().active,false);
 h.window.TarotStarGateRoute=route;h.window.TarotDialogue.reset();h.tick();assert.equal(h.route.canInvestigate(),false);
 assert.equal(h.facts.gardenStory.lumiereDone,false);assert.equal(h.interaction.getState().active,false);
});
test('route receiver is inert outside its isolated entry and never accesses durable storage',()=>{
 for(const search of ['', '?dev=star-gate-full','?dev=star-gate-from-lumiere&from=landing','?dev=star-gate-from-lumiere&dev=star-gate-full']){
  const c={window:{__TAROT_DEV_STAGE3__:true,__TAROT_DEV_STAR_GATE_ROUTE__:true},location:{search},URLSearchParams};
  vm.runInNewContext(routeSource,c);assert.equal(c.window.TarotStarGateRoute,undefined);
 }
 const h=bootstrap('?dev=star-gate-from-lumiere');h.c.__TAROT_DEV_STAGE3__=true;
 vm.runInContext(fs.readFileSync('garden-progress-observer.js','utf8'),h.c);
 vm.runInContext(fs.readFileSync('map-journey.js','utf8'),h.c);assert.deepEqual(h.mutations,[]);
});

test('entry validation precedes the actual title preview and every route/editor script in index',()=>{
 const html=fs.readFileSync('index.html','utf8'),guard=html.indexOf('src="./star-gate-route-entry.js');
 assert.ok(guard>0);
 for(const file of ['map-journey.js','title-first-visit-preview.js','garden-dev-bootstrap.js','stage3-dev-bootstrap.js','fountain-position-editor.js','waterfall-position-editor.js','title-layout-editor.js'])assert.ok(guard<html.indexOf('src="./'+file),file);
 assert.ok(guard<html.indexOf('get("titlePreview")'));
 const h=bootstrap('?dev=star-gate-from-lumiere&titlePreview=first');
 assert.notEqual(new URLSearchParams(h.c.location.search).get('titlePreview'),'first');
 assert.equal(h.window.__TAROT_STAGE3_ENTRY_REJECTED__,true);
});
