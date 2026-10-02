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
