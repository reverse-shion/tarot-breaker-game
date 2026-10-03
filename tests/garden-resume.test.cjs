"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const receiver=require("../garden-resume.js");

function storage(seed={}){
  const values=new Map(Object.entries(seed));
  return {reads:[],writes:[],getItem(key){this.reads.push(key);return values.has(key)?values.get(key):null;},
    setItem(key,value){this.writes.push([key,value]);values.set(key,value);}};
}

test("Garden direct Continue restores all three exact checkpoint projections",()=>{
  const cases=[
    ["garden-resume-before-shiopon",false,false,false,"not_joined"],
    ["garden-resume-after-shiopon",true,false,true,"joined_with_shion"],
    ["garden-resume-after-lumiere",true,true,true,"joined_with_shion"],
  ];
  for(const [id,shioponDone,lumiereDone,joined,companion] of cases){
    const backend=storage();
    const session=receiver.createSession({search:"?dev="+id,storage:backend});
    assert.equal(session.ok,true,id);
    assert.deepEqual(session.spawn,{x:724,y:944});
    assert.equal(session.context.mapId,"star_gate_garden");
    assert.equal(session.context.spawnId,"south_gate");
    assert.equal(session.context.companion,companion);
    assert.deepEqual(session.projection.gardenStory,{shioponDone,lumiereDone,joined});
    assert.equal(backend.writes.length,0,id);
    assert.deepEqual(backend.reads,[session.key],id);
  }
});

test("Garden direct Continue rejects non-Garden, ambiguous, routed and malformed authority",()=>{
  for(const search of ["?dev=landing-resume-arrival","?dev=garden-resume-after-shiopon&from=landing",
    "?dev=garden-resume-after-shiopon&dev=garden-resume-after-lumiere","?dev=garden-resume-after-shiopon&debug=1"])
    assert.equal(receiver.createSession({search,storage:storage()}).ok,false,search);
  const definition=require("../dev-checkpoints.js").get("garden-resume-after-shiopon");
  const key="tarot-breaker:dev:garden-resume:v1:"+definition.id;
  const malformed=storage({[key]:"{"});
  assert.equal(receiver.createSession({search:"?dev="+definition.id,storage:malformed}).ok,false);
  assert.equal(malformed.writes.length,0);
});

test("Garden direct Continue is wired into strict real Garden boot without fallback or production writes",()=>{
  const game=fs.readFileSync("game.js","utf8"),observer=fs.readFileSync("garden-progress-observer.js","utf8");
  assert.match(observer,/TarotGardenResume\?\.createSession/);
  assert.match(game,/gardenResumeDev[\s\S]*session\.spawn\?\.x !== 724[\s\S]*session\.spawn\?\.y !== 944/);
  assert.match(game,/!collision\.isWalkable\(session\.spawn\.x, session\.spawn\.y\)/);
  const direct=game.slice(game.indexOf("if (gardenResumeDev)"),game.indexOf("} else {",game.indexOf("if (gardenResumeDev)")));
  assert.doesNotMatch(direct,/findNearestSpawnRef|nearestWalkable/);
  assert.doesNotMatch(fs.readFileSync("garden-resume.js","utf8"),/localStorage|TarotJourney/);
});
