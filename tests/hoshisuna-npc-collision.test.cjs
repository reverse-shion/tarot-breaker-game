const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../hoshisuna-map-clean.html'),'utf8');
function source(name,next){const a=html.indexOf('function '+name+'(');const b=html.indexOf(next,a);assert(a>=0&&b>a);return html.slice(a,b);}
const code=html.match(/const ACTOR_COLLISION_DISTANCE=32[^\n]*/)?.[0]+'\n'+html.slice(html.indexOf('const CARITAS='),html.indexOf('function resetFollower'));
const ctx={Math};vm.createContext(ctx);vm.runInContext(code+';this.probe={clearCaritas,separation,CARITAS,ACTOR_COLLISION_DISTANCE};',ctx);
const {clearCaritas,separation,CARITAS,ACTOR_COLLISION_DISTANCE}=ctx.probe;
test('Caritas center and edge block player movement',()=>{assert.equal(clearCaritas({x:900,y:253},{x:1100,y:253}),false);assert.equal(clearCaritas({x:1013,y:253},{x:1013,y:253}),false);assert.equal(clearCaritas({x:900,y:350},{x:1100,y:350}),true);assert.deepEqual({...CARITAS},{x:1013,y:253,width:125,height:96});assert.equal(clearCaritas({x:950,y:165},{x:1070,y:165}),false);});
test('companion must start behind Shion, never ahead',()=>{assert.match(html,/const player=\{x:108,y:488,dir:'right'/);assert.match(html,/const behind=\{up:/);assert.match(html,/for\(const gap of \[FOLLOW_LAG,FOLLOW_LAG\+8,FOLLOW_LAG-8\]\)/);assert.match(html,/resetFollower\(\);/);assert.match(html,/const lastFoot=footprints\[footprints\.length-1\]/);assert.match(html,/const FOLLOW_LAG=56/);});
test('Shion and Shiopon are physically separated',()=>{assert.equal(ACTOR_COLLISION_DISTANCE,32);assert.match(html,/separation\(next,companion\)>=ACTOR_COLLISION_DISTANCE/);assert.match(html,/if\(!allowed\)\{controls\.cancel\('npc-collision'\)/);assert.match(html,/separation\(candidate,player\)>=ACTOR_COLLISION_DISTANCE/);});
test('Caritas remains lying in place',()=>{assert.match(html,/left:1013px;top:253px/);assert.match(html,/sg_rise_01\.webp/);assert.doesNotMatch(html,/function\s+riseCaritas\(/);});

test('no instant Shiopon reposition from historic footprints during movement',()=> {
  const step=source('step','async function boot()');
  assert.doesNotMatch(step,/footprints\.find\(/);
  assert.doesNotMatch(step,/Object\.assign\(companion/);
  assert.match(step,/Math\.min\(distance,speed\*dt\)/);assert.match(step,/FOLLOW_SPRINT_SPEED/);
  assert.match(step,/trailingPoint\(footprints,FOLLOW_LAG\)/);
});
const trailCode=html.slice(html.indexOf('function trailingPoint('),html.indexOf('function movingIntoActor('));
const trailContext={Math};vm.createContext(trailContext);
vm.runInContext(trailCode+';this.trail={trailingPoint,trimFootprints};',trailContext);
test('trailing point stays 56px behind around a corner',()=> {
  const f=trailContext.trail.trailingPoint;
  const point=f([{x:0,y:0},{x:100,y:0},{x:100,y:100}],56);
  assert.ok(Math.abs(point.x-100)<.01&&Math.abs(point.y-44)<.01);
  const straight=f([{x:0,y:0},{x:120,y:0}],56);
  assert.ok(Math.abs(straight.x-64)<.01&&Math.abs(straight.y)<.01);
});
test('trail movement is continuous and bounded at normal 210px/s',()=>{
  const f=trailContext.trail.trailingPoint,prune=trailContext.trail.trimFootprints;
  const trail=[{x:0,y:0},{x:56,y:0}];let companion={x:0,y:0},previous={...companion};
  for(let n=1;n<=140;n++){
    const player={x:56+n*2.5,y:0};trail.push(player);prune(trail);
    const target=f(trail,56),d=Math.hypot(target.x-companion.x,target.y-companion.y);
    const amount=Math.min(d,210/60);
    if(d)companion={x:companion.x+(target.x-companion.x)*amount/d,y:companion.y+(target.y-companion.y)*amount/d};
    assert.ok(Math.hypot(companion.x-previous.x,companion.y-previous.y)<=210/60+.0001,'unexpected jump');
    assert.ok(Math.hypot(player.x-companion.x,player.y-companion.y)<65,'too far behind');
    previous={...companion};
  }
});
