const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {createCollision,createNavigator}=require('../navigation.js');
const {BOUNDS,inside,crossesBody,wrap}=require('../hoshisuna-caritas-collision.js');
const data=require('../assets/events/hoshisuna/map/starroad-collision.json');
const original=createCollision(data);
const collision=wrap(original);

test('the actual Starroad body is walkable in shared nav but excluded in preview',()=>{
  // A bare blockedAreas property is ignored by navigation.js: this guards the real integration.
  assert.equal(original.isWalkable(1013,253),true,'fixture must be on a walkable road');
  assert.equal(collision.isWalkable(1013,253),false,'cannot stand on Caritas');
  assert.equal(collision.isWalkable(1013,272),false,'body edge must also block');
  assert.deepEqual(BOUNDS,{left:934,right:1092,top:150,bottom:272});
});

test('Caritas blocks an actual path approaching from the south',()=>{
  const outside={x:1013,y:300};
  const onBody={x:1013,y:253};
  assert.equal(original.segmentClear(outside,onBody),true,'verify this route is otherwise walkable');
  assert.equal(collision.segmentClear(outside,onBody),false);
  assert.equal(collision.isWalkable(outside.x,outside.y),true);
  assert.equal(collision.segmentClear(outside,{x:1013,y:302}),true,'nearby clear road remains traversable');
});

test('footprint prevents tunneling across an NPC even with endpoints outside',()=>{
  assert.equal(crossesBody({x:900,y:253},{x:1110,y:253}),true);
  assert.equal(crossesBody({x:900,y:300},{x:1110,y:300}),false);
  assert.equal(crossesBody({x:934,y:150},{x:900,y:120}),true);
  assert.equal(inside(BOUNDS.left,BOUNDS.top),true);
});

test('tap destinations inside Caritas are projected outside the actual obstacle',()=>{
  const target=collision.nearestWalkable({x:1013,y:253});
  assert.ok(target,'there must be a safe nearby road target');
  assert.equal(collision.isWalkable(target.x,target.y),true);
  assert.equal(collision.segmentClear(target,{x:1013,y:253}),false);
  const navigation=createNavigator(collision,16);
  const path=navigation.findPath({x:1013,y:300},{x:1013,y:253});
  assert.ok(path,'navigation remains operational with NPC exclusion');
  assert.equal(collision.isWalkable(path.target.x,path.target.y),true);
});

test('guard rejects missing dependency rather than silently disabling collision',()=>{
  assert.throws(()=>wrap({}),/Missing shared collision/);
});
