"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const Core=require("../progress.js");
const Controller=require("../public-continue.js");
const Adapter=require("../garden-public-continue.js");

function garden({events=["alenon_prologue","landing_devil_memory"],companion="not_joined"}={}){
  return {version:1,checkpoint:{mapId:"star_gate_garden",spawnId:"south_gate"},completedEvents:events,companion};
}
function storage(seed){
  let raw=seed===null?null:typeof seed==="string"?seed:JSON.stringify(seed);
  const writes=[];
  return {
    getItem(key){assert.equal(key,Core.STORAGE_KEY);return raw;},
    setItem(key,value){assert.equal(key,Core.STORAGE_KEY);writes.push(value);raw=value;},
    change(value){raw=value===null?null:JSON.stringify(value);},
    bytes(){return raw;},
    writes,
  };
}
function journeyHarness(seed={unrelated:"kept"}){
  const data={...seed};
  let raw=JSON.stringify(data);
  const sessionStorage={
    getItem(key){assert.equal(key,"tarot-breaker:map-journey-v1");return raw;},
    setItem(key,value){assert.equal(key,"tarot-breaker:map-journey-v1");raw=value;},
    raw(){return raw;},
  };
  const journey={set(key,value){data[key]=value;raw=JSON.stringify(data);}};
  return {journey,sessionStorage,data};
}

test("Garden checkpoint stays Public Continue eligible on repeated title resumes",()=>{
  const saved=garden();
  const store=storage(saved);
  for(let attempt=0;attempt<3;attempt++){
    const inspected=Controller.createController({storage:store,diagnostic(){}}).inspect();
    assert.equal(inspected.ok,true);
    assert.equal(inspected.status,"valid");
    assert.equal(inspected.url,"./index.html?entry=continue");
    const received=Adapter.receive({search:"?entry=continue",storage:store,diagnostic(){}});
    assert.equal(received.ok,true);
    assert.deepEqual(received.spawn,{x:724,y:944});
    assert.equal(store.writes.length,0);
    assert.equal(store.bytes(),JSON.stringify(saved));
  }
});

test("Garden Public receiver restores G1 G2 G3 authority exactly without durable writes",()=>{
  const cases=[
    [garden(),false,false,false,"not_joined"],
    [garden({events:["alenon_prologue","landing_devil_memory","garden_shiopon_meet"],companion:"joined_with_shion"}),true,false,true,"joined_with_shion"],
    [garden({events:["alenon_prologue","landing_devil_memory","garden_shiopon_meet","garden_lumiere_gate"],companion:"joined_with_shion"}),true,true,true,"joined_with_shion"],
  ];
  for(const [saved,shiopon,lumiere,joined,companion] of cases){
    const store=storage(saved),bytes=store.bytes();
    const session=Adapter.receive({search:"?entry=continue",storage:store,diagnostic(){}});
    assert.equal(session.ok,true);
    assert.equal(session.context.mapId,"star_gate_garden");
    assert.equal(session.context.spawnId,"south_gate");
    assert.equal(session.context.companion,companion);
    assert.equal(session.projection.landingMemoryDone,true);
    assert.equal(session.projection.gardenStory.shioponDone,shiopon);
    assert.equal(session.projection.gardenStory.lumiereDone,lumiere);
    assert.equal(session.projection.gardenStory.joined,joined);
    assert.equal(session.projection.companion?.mode||null,joined?"following":null);
    assert.deepEqual(session.spawn,{x:724,y:944});
    assert.equal(store.bytes(),bytes);
    assert.equal(store.writes.length,0);
  }
});

test("Garden Public receiver rejects conflicts, wrong map, contradictory companion and stale saves",()=>{
  const store=storage(garden()),bytes=store.bytes();
  for(const search of ["","?entry=x","?entry=continue&entry=continue","?entry=continue&from=landing","?entry=continue&dev=x"]){
    assert.equal(Adapter.receive({search,storage:store,diagnostic(){}}).ok,false,search);
  }
  assert.equal(store.bytes(),bytes);assert.equal(store.writes.length,0);

  const landing={version:1,checkpoint:{mapId:"star_country_landing",spawnId:"pad_ground"},completedEvents:["alenon_prologue"],companion:"not_joined"};
  assert.equal(Adapter.receive({search:"?entry=continue",storage:storage(landing)}).reason,"not-garden");

  const contradictory=garden({events:["alenon_prologue","landing_devil_memory","garden_shiopon_meet"],companion:"waiting_at_landing"});
  assert.equal(Adapter.receive({search:"?entry=continue",storage:storage(contradictory)}).reason,"save-not-valid");

  const staleStore=storage(garden());
  const session=Adapter.receive({search:"?entry=continue",storage:staleStore});
  staleStore.change(garden({events:["alenon_prologue","landing_devil_memory","garden_shiopon_meet"],companion:"joined_with_shion"}));
  const fresh=Adapter.revalidate(session,{search:"?entry=continue",storage:staleStore});
  assert.equal(fresh.ok,false);assert.equal(fresh.reason,"stale-save");assert.equal(staleStore.writes.length,0);
});

test("Garden Public projection rebuilds legacy Journey and preserves unrelated keys",()=>{
  const saved=garden({events:["alenon_prologue","landing_devil_memory","garden_shiopon_meet"],companion:"joined_with_shion"});
  const session=Adapter.receive({search:"?entry=continue",storage:storage(saved)});
  const h=journeyHarness();
  const result=Adapter.projectJourney(session,{journey:h.journey,storage:h.sessionStorage});
  assert.equal(result.ok,true);
  assert.equal(h.data.unrelated,"kept");
  assert.equal(h.data.landingMemoryDone,true);
  assert.deepEqual(h.data.gardenStory,{shioponDone:true,lumiereDone:false,joined:true});
  assert.deepEqual(h.data.companion,{mode:"following"});
});

test("Garden Public production wiring is strict, exact-spawn, stale-checked and receiver reload returns Title",()=>{
  const index=fs.readFileSync("index.html","utf8");
  const boot=fs.readFileSync("garden-dev-bootstrap.js","utf8");
  const game=fs.readFileSync("game.js","utf8");
  const observer=fs.readFileSync("garden-progress-observer.js","utf8");
  const dialogue=fs.readFileSync("dialogue.js","utf8");
  const title=fs.readFileSync("public-continue-title.js","utf8");

  assert.match(index,/publicGardenResume[\s\S]*TarotRuntimeEntry\?\.requireInternal\(\{title:"\.\/index\.html"\}\)/);
  assert.match(boot,/garden-public-continue\.js\?v=phase-2a-6c-garden/);
  assert.match(boot,/garden-public-bootstrap\.js\?v=phase-2a-6c-garden/);
  assert.match(game,/const gardenResumePublic = [\s\S]*params\.get\("entry"\) === "continue"/);
  assert.match(game,/gardenResumeDev \|\| gardenResumePublic[\s\S]*session\.spawn\?\.x !== 724[\s\S]*session\.spawn\?\.y !== 944/);
  assert.match(game,/TarotGardenPublicContinue\?\.revalidate/);
  assert.match(observer,/gardenResumePublic[\s\S]*TarotGardenContinueTransit/);
  assert.match(dialogue,/publicTransit\?\.projection\?\.gardenStory/);
  assert.match(title,/params\.has\("entry"\)\) return/);
});


test("Garden Public Continue can never execute the root New Game reset branch",()=>{
  const game=fs.readFileSync("game.js","utf8");
  const beginStart=game.indexOf("  function begin(event) {");
  const beginEnd=game.indexOf("  function pointerInfo(",beginStart);
  assert.ok(beginStart>=0&&beginEnd>beginStart);
  const begin=game.slice(beginStart,beginEnd);
  assert.match(begin,/if \(!enteringGardenRuntime\) \{[\s\S]*resetGame\("title-new-game"\)[\s\S]*TarotJourney\?\.reset\(\)[\s\S]*alenon\.html\?from=title/);
  assert.doesNotMatch(begin,/if \(!enteringFromLanding\)[\s\S]*TarotJourney\?\.reset\(\)/);
  assert.match(game,/const enteringGardenRuntime = enteringFromLanding \|\| gardenResumeDev \|\| gardenResumePublic;/);
});

test("Garden Public Continue keeps the south exit active and returns to Landing",()=>{
  const game=fs.readFileSync("game.js","utf8");
  const landing=fs.readFileSync("star-country-landing.html","utf8");
  const collision=JSON.parse(fs.readFileSync("assets/maps/star-country-gate-garden-collision.json","utf8"));
  const entranceMaxY=Math.max(...collision.walkAreas
    .flatMap(area=>area.type==="poly"?area.points:[])
    .filter(([x])=>x>=610&&x<=838)
    .map(([,y])=>y));
  assert.ok(entranceMaxY<1011,"authored south walkable edge must be above the old unreachable y=1011 trigger");
  assert.match(game,/const southExitRef = collision\.nearestWalkable\(DEFAULT_SPAWN\);/);
  assert.match(game,/gardenExitRef = \{\.\.\.southExitRef\};/);
  assert.match(game,/enteringGardenRuntime && gardenExitArmed && !leavingMap && next\.moving/);
  assert.doesNotMatch(game,/enteringFromLanding && gardenExitArmed && !leavingMap && next\.moving/);
  assert.match(game,/navigateRuntime\([^\n]*star-country-landing\.html\?from=garden/);
  assert.match(landing,/returningFromGarden[\s\S]*commitArrival\(\{[\s\S]*sourceMapId: "star_gate_garden",[\s\S]*destinationMapId: "star_country_landing",[\s\S]*spawnId: "garden_entrance"/);
});

test("Garden Public adapter browser import is inert",()=>{
  const h={
    TarotProgressCore:Core,
    TarotProgressResume:require("../progress-resume.js"),
    TarotPublicContinue:Controller,
    TarotGardenResume:require("../garden-resume.js"),
    URLSearchParams,
  };
  for(const key of ["localStorage","sessionStorage","location","Date","crypto","document"])
    Object.defineProperty(h,key,{get(){throw new Error("browser access: "+key);}});
  vm.runInNewContext(fs.readFileSync("garden-public-continue.js","utf8"),h);
  assert.equal(typeof h.TarotGardenPublicContinue.receive,"function");
});
