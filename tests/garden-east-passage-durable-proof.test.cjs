'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),core=require('../progress.js'),gate=require('../garden-east-passage.js');
const checkpoint={mapId:'star_gate_garden',spawnId:'south_gate'};
const history=['alenon_prologue','landing_devil_memory','garden_shiopon_meet','garden_lumiere_gate','garden_star_gate_anomaly'];
function saved(){return {version:1,checkpoint,completedEvents:[...history,gate.KNOWLEDGE_EVENT],companion:'joined_with_shion'}}
function store(){let bytes=JSON.stringify(saved()),reads=0;return {getItem(key){assert.equal(key,core.STORAGE_KEY);reads++;return bytes},set(value){bytes=value},reads:()=>reads}}

test('persisted flag and writer memory can never substitute for a valid independent storage read',()=>{
 assert.equal(gate.routeKnown({getCurrentState:()=>({persisted:true,state:saved()})}),false);
 assert.equal(gate.routeKnown({getItem(){throw Error('unavailable')}}),false);
 assert.equal(gate.routeKnown(null),false);
 const storage=store();assert.equal(gate.routeKnown(storage),true);assert.equal(storage.reads(),1);
});
test('revoking the persisted route immediately closes B despite previously confirmed writer memory',()=>{
 const storage=store(),writer=core.createProgress({storage});assert.equal(writer.load().status,'valid');
 assert.equal(gate.routeKnown(storage),true);
 const old=saved();old.completedEvents=history;storage.set(JSON.stringify(old));
 assert.equal(writer.getCurrentState().persisted,true);assert.equal(writer.isEventCompleted(gate.KNOWLEDGE_EVENT),true);
 assert.equal(gate.routeKnown(storage),false);
 storage.set(null);assert.equal(gate.routeKnown(storage),false);
});
test('corrupt, unsupported and contradictory persisted records fail closed without changing bytes',()=>{
 const storage=store();
 const invalid=[null,'{',JSON.stringify({...saved(),version:0}),JSON.stringify({...saved(),extra:true}),
  JSON.stringify({...saved(),completedEvents:[...history.filter(x=>x!=='garden_star_gate_anomaly'),gate.KNOWLEDGE_EVENT]}),
  JSON.stringify({...saved(),companion:'not_joined'})];
 for(const bytes of invalid){storage.set(bytes);assert.equal(gate.routeKnown(storage),false);assert.equal(storage.getItem(core.STORAGE_KEY),bytes)}
});
async function actualGuard(storage){
 const source=fs.readFileSync('tests/game.test.cjs','utf8');
 const boot=new Function('require','__dirname',source.slice(0,source.indexOf("test('"))+'\nreturn boot;')(require,__dirname);
 let guard;
 const h=await boot({configure({window}){
  window.TarotGardenEastPassage={...gate,routeKnown:()=>gate.routeKnown(storage)};
  const create=window.TarotControls.createControls;
  window.TarotControls.createControls=(collision,...args)=>{guard=collision;return create(collision,...args)};
 }});
 assert.equal(h.errors.length,0);
 return {h,guard};
}
test('actual game segmentClear reads only for collision-clear B crossings and never caches permission',async()=>{
 const storage=store(),{guard}=await actualGuard(storage),before=storage.reads();
 for(let i=0;i<1000;i++)assert.equal(guard.segmentClear({x:1390,y:800},{x:1393,y:800}),true);
 assert.equal(guard.segmentClear({x:0,y:0},{x:1410,y:800}),false,'base collision wins before permission');
 assert.equal(storage.reads(),before,'ordinary movement and failed collision do not read saves');
 assert.equal(guard.segmentClear({x:1393,y:800},{x:1410,y:800}),true);
 assert.equal(storage.reads(),before+1);
 storage.set(null);
 assert.equal(guard.segmentClear({x:1393,y:800},{x:1410,y:800}),false,'old permission must not survive revoked storage');
 assert.equal(storage.reads(),before+2);
});
test('actual game guard rejects rapid taps and held joystick after durable permission disappears',async()=>{
 const storage=store(),{h}=await actualGuard(storage),from={x:1393,y:800},to={x:1410,y:800};
 assert.equal(h.controls.keyDown('ArrowRight'),true);
 assert.ok(h.controls.step(from,0.05,155).x>1398);
 h.controls.keyUp('ArrowRight');storage.set(null);
 for(let i=0;i<18;i++){assert.ok(h.controls.tap(to,from));assert.ok(h.controls.step(from,0.05,155).x<1398)}
 h.controls.pointerDown({id:1,x:48,y:130,time:0,width:393,world:from});
 h.controls.pointerMove({id:1,x:112,y:130});
 for(let i=0;i<90;i++)assert.ok(h.controls.step(from,0.05,155).x<1398);
 h.controls.pointerEnd({id:1,x:112,y:130,time:1000,cancelled:true},from);
 assert.equal(h.controls.keyDown('ArrowUp'),true);assert.ok(h.controls.step(from,0.05,155).y<800);
});
