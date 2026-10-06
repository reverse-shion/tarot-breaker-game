const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function scene() {
  const source=fs.readFileSync(require('node:path').join(__dirname,'../game.js'),'utf8');
  const start=source.indexOf('  if (stage3Dev) {\n    // Observe physical releases');
  const end=source.indexOf('  if (stage3Dev) {\n  function beginCinematicPan',start);
  const actors={shion:{x:810,y:150,dir:'up',stageOffsetY:0},shiopon:{x:780,y:180,dir:'up',stageOffsetY:0,following:true,hidden:false,rotation:0,visualOffsetY:0},lumiere:{x:750,y:200,dir:'down',stageOffsetY:0,bobOffsetY:0}};
  const c={canvas:{getBoundingClientRect:()=>({left:0,top:0})},stage3Dev:true,ready:true,running:true,visionWorld:{active:false},absorptionSurface:null,sceneLockOwner:null,sceneLockPrior:null,npcSuspended:false,controls:{state:{suspended:false}},scale:{x:1,y:1},cssWidth:390,cssHeight:844,camera:{x:810,y:440,zoom:.63},normalCameraZoom:.63,actors,shiopon:actors.shiopon,lumiere:actors.lumiere,actorVisibility:{shion:1,shiopon:1,lumiere:1},aftermathPaused:false,aftermathFocusBaseline:null,aftermathOwner:null,aftermathLumiereEnabled:true,aftermathMotions:new Set(),heldKeys:new Set(),heldPointers:new Set(),releaseKeys:new Set(),releasePointers:new Set(),stageMotions:{},LUMIERE_DRAW_HEIGHT:78,lumiereFrame:{h:100},LUMIERE_NORMALIZED_SIZE:{w:493,h:596},LUMIERE_BOTTOM_GAP:2.7,cinematicCamera:{owned:false},draw(){},clearInput(){},stageActor:id=>actors[id],stageActorRef:id=>({x:actors[id].x,y:actors[id].y}),playerRef:()=>({x:actors.shion.x,y:actors.shion.y}),refDistance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),viewportOrigin:()=>({x:0,y:0}),window:{addEventListener(){}}};
  c.window.TarotStage3Scene={lock(owner){c.sceneLockPrior={suspended:c.controls.state.suspended,npcSuspended:c.npcSuspended};c.sceneLockOwner=owner;c.controls.state.suspended=true;c.npcSuspended=true;},unlock(owner){if(c.sceneLockOwner!==owner)return false;c.sceneLockOwner=null;return true;},freezeCamera(){c.cinematicCamera.owned=true;}};
  c.window.TarotCinematicCamera={release(){c.cinematicCamera.owned=false;}};
  vm.runInNewContext(source.slice(start,end),c);
  return {c,api:c.window.TarotAftermathScene};
}
test('Aftermath focus reflows from a stable world baseline without repeated drift',()=>{
  const {c,api}=scene();api.focusGate();const y=c.camera.y;
  for(let i=0;i<10;i++)api.focusGate();assert.equal(c.camera.y,y);
  c.cssWidth=844;c.cssHeight=390;c.normalCameraZoom=.70;api.focusGate();const rotated=c.camera.y;
  api.focusGate();assert.equal(c.camera.y,rotated);assert.equal(c.camera.zoom,.70);
  assert.ok(Math.abs(c.camera.y-440)<=36);
});
test('Aftermath rotated A0 restoration verifies owned input, camera and actor display state',async()=>{
  const {c,api}=scene();const a0=api.capture();api.lock('af-test');
  c.cssWidth=844;c.cssHeight=390;c.normalCameraZoom=.70;c.camera.y=999;c.actors.lumiere.x=2000;api.setLumiereDeparted();
  assert.equal((await api.restore(a0)).completed,true);assert.equal(c.camera.y,440);assert.equal(c.camera.zoom,.70);
  c.camera.y++;assert.equal(api.verify(a0).completed,false);c.camera.y--;
  c.shiopon.rotation=.2;assert.equal(api.verify(a0).completed,false);c.shiopon.rotation=0;
  c.controls.state.suspended=false;assert.equal(api.verify(a0).completed,false);
});

test('Aftermath actor hit test targets Shiopon/Lumiere directly without UI geometry',()=>{
  const {api}=scene();
  assert.equal(api.hitTestActor(780*.63,(180-41)*.63),'shiopon');
  assert.equal(api.hitTestActor(750*.63,(200-44)*.63),'lumiere');
  assert.equal(api.hitTestActor(20,20),null);
});
