"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const Core=require("../progress.js");
const Controller=require("../public-continue.js");
const Adapter=require("../landing-public-continue.js");

function state({spawn="pad_ground",events=["alenon_prologue"],companion="not_joined"}={}) {
  return {version:1,checkpoint:{mapId:"star_country_landing",spawnId:spawn},completedEvents:events,companion};
}
function storage(seed) {
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
function journeyHarness(seed={unrelated:"kept"}) {
  const data={...seed};
  let raw=JSON.stringify(data);
  const sessionStorage={
    getItem(key){assert.equal(key,"tarot-breaker:map-journey-v1");return raw;},
    setItem(key,value){assert.equal(key,"tarot-breaker:map-journey-v1");raw=value;},
    raw(){return raw;},
  };
  const journey={
    set(key,value){data[key]=value;raw=JSON.stringify(data);},
  };
  return {journey,sessionStorage,data};
}

test("Title controller enables both Landing durable checkpoints while Garden remains fail-closed",()=>{
  for(const saved of [
    state(),
    state({spawn:"garden_entrance",events:["alenon_prologue","landing_devil_memory","garden_shiopon_meet"],companion:"joined_with_shion"}),
  ]) {
    const store=storage(saved);
    const inspected=Controller.createController({storage:store,diagnostic(){}}).inspect();
    assert.equal(inspected.ok,true);
    assert.equal(inspected.status,"valid");
    assert.equal(inspected.url,"./star-country-landing.html?entry=continue");
    assert.equal(store.writes.length,0);
  }
  const garden={version:1,checkpoint:{mapId:"star_gate_garden",spawnId:"south_gate"},
    completedEvents:["alenon_prologue","landing_devil_memory"],companion:"not_joined"};
  assert.equal(Controller.createController({storage:storage(garden),diagnostic(){}}).inspect().status,"preparing");
});

test("Landing Public receiver validates production entry read-only and restores exact projection",()=>{
  const cases=[
    [state(),false,false,null],
    [state({events:["alenon_prologue","landing_devil_memory"]}),true,false,null],
    [state({events:["alenon_prologue","landing_devil_memory","garden_shiopon_meet"],companion:"waiting_at_landing"}),true,true,"waiting"],
    [state({spawn:"garden_entrance",events:["alenon_prologue","landing_devil_memory","garden_shiopon_meet"],companion:"joined_with_shion"}),true,false,"following"],
  ];
  for(const [saved,memory,arriving,mode] of cases) {
    const store=storage(saved),bytes=store.bytes();
    const session=Adapter.receive({search:"?entry=continue",storage:store,diagnostic(){}});
    assert.equal(session.ok,true);
    assert.equal(session.context.mapId,"star_country_landing");
    assert.equal(session.projection.landingMemoryDone,memory);
    assert.equal(session.returningFromAlenon,arriving);
    assert.equal(session.returningFromGarden,saved.checkpoint.spawnId==="garden_entrance");
    assert.equal(session.projection.companion?.mode||null,mode);
    assert.equal(store.bytes(),bytes);
    assert.equal(store.writes.length,0);
  }
});

test("Landing Public receiver rejects conflicting query, wrong map and stale save without writes",()=>{
  const store=storage(state()),bytes=store.bytes();
  for(const search of ["","?entry=x","?entry=continue&entry=continue","?entry=continue&from=garden","?entry=continue&dev=x"]) {
    assert.equal(Adapter.receive({search,storage:store,diagnostic(){}}).ok,false,search);
  }
  assert.equal(store.bytes(),bytes);
  assert.equal(store.writes.length,0);

  const wrong={version:1,checkpoint:{mapId:"alenon",spawnId:"intro"},completedEvents:[],companion:"not_joined"};
  assert.equal(Adapter.receive({search:"?entry=continue",storage:storage(wrong),diagnostic(){}}).reason,"not-landing");

  const staleStore=storage(state());
  const session=Adapter.receive({search:"?entry=continue",storage:staleStore,diagnostic(){}});
  staleStore.change(state({events:["alenon_prologue","landing_devil_memory"]}));
  const fresh=Adapter.revalidate(session,{search:"?entry=continue",storage:staleStore,diagnostic(){}});
  assert.equal(fresh.ok,false);
  assert.equal(fresh.reason,"stale-save");
  assert.equal(staleStore.writes.length,0);
});

test("Public history projection rebuilds session Journey and preserves unrelated keys",()=>{
  const saved=state({spawn:"garden_entrance",events:["alenon_prologue","landing_devil_memory","garden_shiopon_meet"],companion:"joined_with_shion"});
  const session=Adapter.receive({search:"?entry=continue",storage:storage(saved),diagnostic(){}});
  const h=journeyHarness();
  const result=Adapter.projectJourney(session,{journey:h.journey,storage:h.sessionStorage});
  assert.equal(result.ok,true);
  const restored=JSON.parse(h.sessionStorage.raw());
  assert.equal(restored.unrelated,"kept");
  assert.equal(restored.landingMemoryDone,true);
  assert.deepEqual(restored.gardenStory,{shioponDone:true,lumiereDone:false,joined:true});
  assert.deepEqual(restored.companion,{mode:"following"});
});

test("Public history projection fails closed when session persistence cannot be verified",()=>{
  const session=Adapter.receive({search:"?entry=continue",storage:storage(state()),diagnostic(){}});
  const result=Adapter.projectJourney(session,{
    journey:{set(){}},
    storage:{getItem(){return null;}},
  });
  assert.equal(result.ok,false);
  assert.equal(result.reason,"journey-write-unavailable");
});

test("Landing page gates input until assets, stale-save check and Journey restoration finish",()=>{
  const html=fs.readFileSync("star-country-landing.html","utf8");
  assert.match(html,/public-continue\.js/);
  assert.match(html,/landing-public-continue\.js/);
  assert.match(html,/const continuePublicRequest = params\.has\("entry"\)/);
  assert.match(html,/const continueRequest = continuePublicRequest \|\| continueDevRequest/);
  assert.match(html,/TarotLandingPublicContinue\.receive/);
  assert.match(html,/TarotLandingPublicContinue\.revalidate/);
  assert.match(html,/TarotLandingPublicContinue\.projectJourney/);
  assert.match(html,/if \(continueRequest && !continueReady\) return;/);
  assert.match(html,/function loop\(now\)[\s\S]*if \(continueRequest && !continueReady\)/);
  assert.match(html,/if \(continueRequest\) bootLandingContinue\(\)/);
  assert.match(html,/if \(continuePublicRequest\) hideContinueStatus\(\)/);
  assert.match(html,/landingProgressValid && arrivingFromAlenon && !continueRequest/);
  assert.match(html,/landingProgressValid && returningFromGarden && !continueRequest/);
});

test("waiting durable state is treated as the deterministic return leg and rejoins through existing dialogue",()=>{
  const html=fs.readFileSync("star-country-landing.html","utf8");
  const saved=state({events:["alenon_prologue","landing_devil_memory","garden_shiopon_meet"],companion:"waiting_at_landing"});
  const session=Adapter.receive({search:"?entry=continue",storage:storage(saved),diagnostic(){}});
  assert.equal(session.returningFromAlenon,true);
  assert.equal(session.projection.companion.mode,"waiting");
  assert.match(html,/runReturnGreeting\(\)\.then\(rejoinCompanion\)/);
  assert.match(html,/continueSession\.context\.companion === "waiting_at_landing" && !companion\.following/);
});

test("Landing Public adapter import is inert",()=>{
  const h={
    TarotProgressCore:Core,
    TarotProgressResume:require("../progress-resume.js"),
    TarotPublicContinue:Controller,
    TarotLandingResume:require("../landing-resume.js"),
    URLSearchParams,
  };
  for(const key of ["localStorage","sessionStorage","location","Date","crypto"]) {
    Object.defineProperty(h,key,{get(){throw new Error(key);}});
  }
  vm.runInNewContext(fs.readFileSync("landing-public-continue.js","utf8"),h);
  assert.equal(typeof h.TarotLandingPublicContinue.receive,"function");
});
