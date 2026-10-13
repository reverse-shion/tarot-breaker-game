const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function scene({realCamera=false}={}) {
  const source=fs.readFileSync(require('node:path').join(__dirname,'../game.js'),'utf8');
  const start=source.indexOf('  if (stage3Runtime) {\n    // Observe physical releases');
  const end=source.indexOf('  if (stage3Runtime) {\n  function beginCinematicPan',start);
  const actors={shion:{x:810,y:150,dir:'up',stageOffsetY:0},shiopon:{x:780,y:180,dir:'up',stageOffsetY:0,following:true,hidden:false,rotation:0,visualOffsetY:0},lumiere:{x:750,y:200,dir:'down',stageOffsetY:0,bobOffsetY:0}};
  const c={canvas:{getBoundingClientRect:()=>({left:0,top:0})},player:actors.shion,stage3Dev:true,stage3Runtime:true,ready:true,running:true,visionWorld:{active:false},absorptionSurface:null,sceneLockOwner:null,sceneLockPrior:null,npcSuspended:false,controls:{state:{suspended:false}},scale:{x:1,y:1},cssWidth:390,cssHeight:844,camera:{x:810,y:440,zoom:.63},normalCameraZoom:.63,actors,shiopon:actors.shiopon,lumiere:actors.lumiere,actorVisibility:{shion:1,shiopon:1,lumiere:1},aftermathPaused:false,aftermathFocusBaseline:null,aftermathOwner:null,aftermathLumiereEnabled:true,aftermathMotions:new Set(),returnCameraHandoff:null,heldKeys:new Set(),heldPointers:new Set(),releaseKeys:new Set(),releasePointers:new Set(),stageMotions:{},LUMIERE_DRAW_HEIGHT:78,lumiereFrame:{h:100},LUMIERE_NORMALIZED_SIZE:{w:493,h:596},LUMIERE_BOTTOM_GAP:2.7,cinematicCamera:{owned:false,generation:0},draw(){},clearInput(){},stageActor:id=>actors[id],stageActorRef:id=>({x:actors[id].x,y:actors[id].y}),playerRef:()=>({x:actors.shion.x,y:actors.shion.y}),setDirection(actor,dx,dy){actor.dir=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down')},isWalkableRef:()=>true,collision:{nearestWalkable:p=>({...p})},refDistance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),viewportOrigin:()=>({x:0,y:0}),window:{addEventListener(){}}};
  c.window.TarotStage3Scene={lock(owner){c.sceneLockPrior={suspended:c.controls.state.suspended,npcSuspended:c.npcSuspended};c.sceneLockOwner=owner;c.controls.state.suspended=true;c.npcSuspended=true;},unlock(owner){if(c.sceneLockOwner!==owner)return false;c.sceneLockOwner=null;return true;},freezeCamera(){c.cinematicCamera.owned=true;}};
  c.window.TarotCinematicCamera={release(){c.cinematicCamera.owned=false;}};
  c.lumiereManifest=require('../assets/sprites/lumiere/lumiere_sprite_manifest.json');
  c.DRAW_HEIGHT=78;c.FRAME={h:512};
  vm.runInNewContext(source.slice(start,end),c);
  if(realCamera){
    c.controls.suspend=()=>c.controls.state.suspended=true;c.controls.resume=()=>c.controls.state.suspended=false;c.outsideInteraction=false;
    const locksStart=source.indexOf('    lock(owner) {');
    const methods=vm.runInNewContext('({'+source.slice(locksStart,source.indexOf('    waitDraw(',locksStart))+'})',c);
    Object.assign(c.window.TarotStage3Scene,methods);
    c.clamp=(n,a,b)=>Math.max(a,Math.min(b,n));c.world={w:1448,h:1086};c.cameraOffsetY=()=>0;
    c.stageTargetRef=target=>typeof target==='object'?target:null;
    const cameraStart=source.indexOf('  if (stage3Runtime) {\n  function beginCinematicPan');
    vm.runInNewContext(source.slice(cameraStart,source.indexOf('  window.TarotStage = Object.freeze({',cameraStart)),c);
  }
  return {c,api:c.window.TarotAftermathScene};
}
test('Aftermath Lumiere bounds use the same four-direction manifest and body height as drawing',()=>{
  const {c,api}=scene();
  for(const dir of ['down','up','left','right']){
    c.lumiere.dir=dir;
    const rect=api.getState().lumiereRect,pose=c.lumiereManifest.poses[dir];
    const scale=63.984375/(pose.baseline_y-pose.body_top);
    const imageLeft=(c.lumiere.x-pose.center_x*scale)*c.camera.zoom;
    const imageTop=(c.lumiere.y-2.7-pose.baseline_y*scale)*c.camera.zoom;
    assert.ok(Object.values(rect).every(Number.isFinite));
    assert.ok(rect.left<=imageLeft&&rect.right>=imageLeft+pose.width*scale*c.camera.zoom);
    assert.ok(rect.top<=imageTop&&rect.bottom>=imageTop+pose.height*scale*c.camera.zoom);
    c.lumiere.y=-1000;assert.ok(api.getState().lumiereRect.bottom<0);c.lumiere.y=200;
  }
});
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
test('Aftermath return formation preserves restored Lumiere and places Shiopon beside her',()=>{
  const {c,api}=scene();const shionBefore={x:c.actors.shion.x,y:c.actors.shion.y},lumiereBefore={x:c.actors.lumiere.x,y:c.actors.lumiere.y};
  const placed=api.placeReturnFormation();
  assert.equal(placed.shion.x,shionBefore.x);assert.equal(placed.shion.y,shionBefore.y);
  assert.equal(placed.lumiere.x,lumiereBefore.x);assert.equal(placed.lumiere.y,lumiereBefore.y);
  assert.equal(placed.shiopon.x,lumiereBefore.x-62);assert.equal(placed.shiopon.y,lumiereBefore.y);
  assert.equal(placed.lumiere.x-placed.shiopon.x,62);
  assert.equal(c.actors.shiopon.followRoute.length,0);assert.equal(c.actors.shiopon.wait,Number.POSITIVE_INFINITY);
});

test('one-time panorama transfer preserves safe camera and releases an unclaimed lease',()=>{
 const {c,api}=scene();
 // The real normalCameraTarget is private to the separate cinematic block.
 // Expose it only through the cinematic API so this test catches scope errors.
 c.window.TarotCinematicCamera.getNormalTarget=()=>({x:810,y:440});
 c.cinematicCamera.allowOverscan=false;
 c.window.TarotCinematicCamera.release=()=>{c.cinematicCamera.owned=false;c.cinematicCamera.allowOverscan=false;};
 assert.equal(api.armReturnCamera(91),true);
 assert.equal(c.cinematicCamera.owned,true);
 assert.equal(c.cinematicCamera.allowOverscan,true);
 assert.equal(api.armReturnCamera(91),false);
 assert.equal(api.takeReturnCamera(92),null);
 const token=api.takeReturnCamera(91);
 assert.deepEqual(JSON.parse(JSON.stringify(token.safeCamera)),{x:810,y:440,zoom:.63});
 assert.equal(api.takeReturnCamera(91),null);
 assert.equal(api.abandonReturnCamera(91),false);
 assert.equal(api.armReturnCamera(92),true);
 assert.equal(api.abandonReturnCamera(92),true);
 assert.equal(c.cinematicCamera.owned,false);
 assert.equal(c.cinematicCamera.allowOverscan,false);
});

test('return camera arm is fail-closed if cinematic target API is missing or invalid',()=>{
 const {c,api}=scene();
 assert.equal(api.armReturnCamera(91),false);
 assert.equal(c.cinematicCamera.owned,false);
 assert.equal(c.returnCameraHandoff,null);
 c.window.TarotCinematicCamera.getNormalTarget=()=>({x:NaN,y:440});
 assert.equal(api.armReturnCamera(92),false);
 assert.equal(c.cinematicCamera.owned,false);
 assert.equal(c.returnCameraHandoff,null);
 c.window.TarotCinematicCamera.getNormalTarget=()=>({x:820,y:440});
 assert.equal(api.armReturnCamera(93),true);
 const accepted=api.takeReturnCamera(93);
 assert.equal(accepted.safeCamera.x,820);
 assert.equal(accepted.safeCamera.y,440);
});
test('armed return handoff cannot take or abandon a newer foreign scene, freeze, pan or release',async()=>{
 for(const takeover of ['scene','freeze','pan','release']){
  const {c,api}=scene({realCamera:true});assert.equal(api.armReturnCamera(91),true);const leaseGeneration=c.cinematicCamera.generation;
  let pending;
  if(takeover==='scene'){c.window.TarotStage3Scene.lock('foreign');c.window.TarotStage3Scene.freezeCamera();}
  if(takeover==='freeze')c.window.TarotStage3Scene.freezeCamera();
  if(takeover==='pan')pending=c.window.TarotCinematicCamera.panTo({x:1200,y:700},900);
  if(takeover==='release')c.window.TarotCinematicCamera.release();
  assert.ok(c.cinematicCamera.generation>leaseGeneration);
  const before={...c.cinematicCamera},cameraBefore={...c.camera};
  assert.equal(api.takeReturnCamera(91),null);assert.equal(api.abandonReturnCamera(91),false);
  assert.deepEqual(c.cinematicCamera,before);assert.deepEqual(c.camera,cameraBefore);assert.equal(c.returnCameraHandoff,null);
  if(takeover==='scene')assert.equal(c.sceneLockOwner,'foreign');
  if(pending){c.window.TarotCinematicCamera.release();assert.equal((await pending).interrupted,true);}
 }
});
test('same-generation normal handoff is consumed once; unclaimed handoff restores normal camera',()=>{
 const {c,api}=scene({realCamera:true});
 assert.equal(api.armReturnCamera(91),true);const generation=c.cinematicCamera.generation;
 assert.ok(api.takeReturnCamera(91));assert.equal(api.takeReturnCamera(91),null);assert.equal(c.cinematicCamera.generation,generation);
 c.window.TarotCinematicCamera.release();assert.equal(api.armReturnCamera(92),true);
 c.camera.zoom=.48;assert.equal(api.abandonReturnCamera(92),true);assert.equal(c.cinematicCamera.owned,false);
 assert.equal(c.camera.zoom,c.normalCameraZoom);assert.equal(api.abandonReturnCamera(92),false);
});
