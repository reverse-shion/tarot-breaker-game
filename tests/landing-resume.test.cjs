"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const receiver=require("../landing-resume.js");
const checkpoints=require("../dev-checkpoints.js");

function storage(seed={}) {
  const values=new Map(Object.entries(seed));
  return {
    reads:[],writes:[],
    getItem(key){this.reads.push(key);return values.has(key)?values.get(key):null;},
    setItem(key,value){this.writes.push([key,value]);values.set(key,value);},
  };
}

test("Landing checkpoints are registered with frozen exact pad_ground fixtures",()=>{
  const expected={
    "landing-resume-arrival":[["alenon_prologue"],"not_joined"],
    "landing-resume-memory-complete":[["alenon_prologue","landing_devil_memory"],"not_joined"],
    "landing-resume-waiting":[["alenon_prologue","landing_devil_memory","garden_shiopon_meet"],"waiting_at_landing"],
  };
  for(const [id,[events,companion]] of Object.entries(expected)){
    const d=checkpoints.get(id);
    assert.ok(d,id);
    assert.equal(d.map,"star_country_landing");
    assert.equal(d.spawn,"pad_ground");
    assert.deepEqual(d.temporaryState.completedEvents,events);
    assert.equal(d.temporaryState.companion,companion);
  }
});

test("Landing receiver projects completed history without inventing it",()=>{
  const cases=[
    ["landing-resume-arrival",false,null],
    ["landing-resume-memory-complete",true,null],
    ["landing-resume-waiting",true,"waiting"],
  ];
  for(const [id,memory,mode] of cases){
    const s=receiver.createSession({search:"?dev="+id,storage:storage()});
    assert.equal(s.ok,true,id);
    assert.equal(s.context.mapId,"star_country_landing");
    assert.equal(s.context.spawnId,"pad_ground");
    assert.equal(s.projection.landingMemoryDone,memory);
    assert.equal(s.projection.companion?.mode||null,mode);
  }
});

test("Landing dev session reads only its remapped session key and never production Progress",()=>{
  const s=storage();
  const session=receiver.createSession({search:"?dev=landing-resume-arrival",storage:s});
  assert.equal(session.ok,true);
  assert.deepEqual(s.reads,[session.key]);
  assert.equal(s.writes.length,0);
  assert.match(session.key,/^tarot-breaker:dev:landing-resume:v1:/);
  assert.notEqual(session.key,"tarot-breaker:progress:v1");
});

test("Landing receiver rejects wrong or ambiguous development entries",()=>{
  for(const search of [
    "?dev=garden-resume-before-shiopon",
    "?dev=alenon-resume-intro-complete",
    "?dev=landing-resume-arrival&dev=landing-resume-memory-complete",
    "?dev=landing-resume-arrival&from=alenon",
    "?dev=landing-resume-arrival&padEdit=1",
    "?dev=landing-resume-arrival&debug=1",
  ]) assert.equal(receiver.createSession({search,storage:storage()}).ok,false,search);
});

test("Landing collision validator is strict and rejects malformed fallback candidates",()=>{
  const good=JSON.parse(fs.readFileSync("assets/maps/star-landing/collision.json","utf8"));
  const areas=receiver.validateCollision(good);
  assert.ok(areas.length>0);
  assert.throws(()=>receiver.validateCollision({...good,map:"wrong"}),/invalid-continue-collision/);
  assert.throws(()=>receiver.validateCollision({...good,walkAreas:[]}),/invalid-continue-collision/);
  const degenerate={...good,walkAreas:[{type:"poly",points:[[0,0],[1,1],[2,2]]}]};
  assert.throws(()=>receiver.validateCollision(degenerate),/degenerate-continue-collision/);
});

test("Landing HTML wires Continue separately from the normal arrival route",()=>{
  const html=fs.readFileSync("star-country-landing.html","utf8");
  assert.match(html,/landing-resume\.js/);
  assert.match(html,/TarotLandingResume/);
  assert.match(html,/const continueDevRequest = params\.has\("dev"\)/);
  assert.match(html,/continueReady/);
  assert.match(html,/725/);
  assert.match(html,/PAD_DISMOUNT_OFFSET_Y/);
  assert.match(html,/tarot-breaker:landing-resume-ready/);
  assert.doesNotMatch(fs.readFileSync("landing-resume.js","utf8"),/localStorage\s*\./);
});


test("authored Landing Continue actor points are exact, walkable and trigger-safe",()=>{
  const Nav=require("../navigation.js");
  const data=JSON.parse(fs.readFileSync("assets/maps/star-landing/collision.json","utf8"));
  const collision=Nav.createCollision(data);
  const shion={x:725,y:716},waiting={x:725,y:660};
  assert.equal(collision.isWalkable(shion.x,shion.y),true);
  assert.equal(collision.isWalkable(waiting.x,waiting.y),true);
  assert.ok(Math.hypot(waiting.x-shion.x,waiting.y-shion.y)>=44);
  assert.ok(shion.y>355,"Devil Memory must not auto-trigger at Continue spawn");
  assert.ok(shion.y>245,"Garden exit must not auto-trigger at Continue spawn");
  assert.ok(Math.hypot(shion.x-725,shion.y-788)>66,"PAD must not auto-board at Continue spawn");
});

test("Landing image readiness rejects load and decode failures",async(t)=>{
  const Original=global.Image;
  t.after(()=>{ if(Original===undefined) delete global.Image; else global.Image=Original; });
  global.Image=class {
    constructor(){this.naturalWidth=1;this.naturalHeight=1;}
    set src(value){this._src=value;queueMicrotask(()=>this.onerror?.());}
  };
  await assert.rejects(receiver.loadImage("bad.webp"),/continue-image-failed/);
  global.Image=class {
    constructor(){this.naturalWidth=1;this.naturalHeight=1;}
    decode(){return Promise.reject(new Error("decode"));}
    set src(value){this._src=value;queueMicrotask(()=>this.onload?.());}
  };
  await assert.rejects(receiver.loadImage("decode.webp"),/continue-image-decode-failed/);
});

test("Landing Continue readiness guards input, loop triggers and production Journey writes",()=>{
  const html=fs.readFileSync("star-country-landing.html","utf8");
  assert.match(html,/viewport\.addEventListener\("pointerdown",[\s\S]*if \(continueDevRequest && !continueReady\) return;/);
  assert.match(html,/addEventListener\("keydown",[\s\S]*if \(continueDevRequest && !continueReady\) return;/);
  assert.match(html,/function loop\(now\)[\s\S]*if \(continueDevRequest && !continueReady\)[\s\S]*requestAnimationFrame\(loop\);[\s\S]*return;/);
  const writes=[...html.matchAll(/TarotJourney\?\.set\(/g)];
  const guarded=[...html.matchAll(/if \(!continueDevRequest\) window\.TarotJourney\?\.set\(/g)];
  assert.equal(writes.length,4);
  assert.equal(guarded.length,4);
  const boot=html.slice(html.indexOf("async function bootLandingContinue"),html.indexOf("async function boot()",html.indexOf("async function bootLandingContinue")));
  assert.match(boot,/player\.x = 725;[\s\S]*player\.y = 716;/);
  assert.doesNotMatch(boot,/nearestGroundPoint|nearestWalkable|findNearestSpawnRef/);
});
