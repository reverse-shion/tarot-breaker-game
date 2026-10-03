"use strict";
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),test=require("node:test"),assert=require("node:assert/strict");
const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
const observer=fs.readFileSync(path.join(__dirname,"..","garden-progress-observer.js"),"utf8");
const dialogue=fs.readFileSync(path.join(__dirname,"..","dialogue.js"),"utf8");

test("Garden Progress observer remains valid JavaScript",()=>{
  assert.doesNotThrow(()=>new Function(observer));
});

test("Garden loads Progress bridge without editing story ownership",()=>{
  const registry=html.indexOf("./route-registry.js?v=20260921-progress-v1");
  const progress=html.indexOf("./progress.js?v=20260921-progress-v1");
  const bridge=html.indexOf("./garden-progress-observer.js?v=phase-2a-5c-transit-1");
  assert.ok(registry>=0 && progress>registry && bridge>progress);
  assert.match(dialogue,/story\.shioponDone = true;/);
  assert.match(dialogue,/story\.lumiereDone = true;/);
  assert.match(dialogue,/saveStory\(\);\s*window\.dispatchEvent\(new Event\("tarot-breaker:interaction-end"\)\)/);
});

test("Garden Progress observer cannot start or suppress authored events",()=>{
  assert.doesNotMatch(observer,/\.startEvent\(|\.start\("shioponMeet"|\.start\("lumiereGate"/);
  assert.doesNotMatch(observer,/state\.shioponDone\s*=(?!=)|state\.lumiereDone\s*=(?!=)/);
  assert.match(observer,/addEventListener\("tarot-breaker:interaction-end"/);
});

test("Garden records only existing completion facts and unchanged Landing arrival",()=>{
  assert.match(observer,/reason: "gate_to_garden"/);
  assert.match(observer,/completeEvent\("garden_shiopon_meet"/);
  assert.match(observer,/completeEvent\("garden_lumiere_gate"/);
});


test("Landing Continue Garden transit uses isolated Progress instead of production Progress",()=>{
  assert.match(observer,/TarotLandingResume\?\.createGardenTransitSession/);
  assert.match(observer,/storage: root\.sessionStorage/);
  assert.match(observer,/root\.TarotGardenDevTransit = transit/);
  assert.match(dialogue,/const devTransit = window\.TarotGardenDevTransit\?\.ok/);
  assert.match(dialogue,/if \(devTransit\) return;/);
});


test("waiting_at_landing is absent from Garden and cannot restart Shiopon meeting",()=>{
  const game=fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
  assert.match(game,/hidden: window\.TarotGardenDevTransit\?\.context\?\.companion === "waiting_at_landing"/);
  assert.match(game,/if \(shiopon\.hidden\) return;/);
  assert.match(game,/entry\.actor !== shiopon \|\| !shiopon\.hidden/);
  assert.match(dialogue,/savedStory = publicTransit\?\.projection\?\.gardenStory \|\| devTransit\?\.projection\?\.gardenStory/);
});


test("normal Landing to Garden refreshes session story from durable Progress",()=>{
  let durable={
    version:1,
    checkpoint:{mapId:"star_country_landing",spawnId:"pad_ground"},
    completedEvents:["alenon_prologue","landing_devil_memory","garden_shiopon_meet"],
    companion:"joined_with_shion",
  };
  const projected={};
  const listeners={};
  const progress={
    load:()=>({status:"valid",state:durable}),
    commitArrival:edge=>{
      assert.equal(edge.reason,"gate_to_garden");
      durable={...durable,checkpoint:{mapId:"star_gate_garden",spawnId:"south_gate"}};
      return {persisted:true,state:durable};
    },
    getCurrentState:()=>({state:JSON.parse(JSON.stringify(durable)),persisted:true}),
    isEventCompleted:id=>durable.completedEvents.includes(id),
    completeEvent(){throw new Error("completion must not run during arrival");},
  };
  const sandbox={
    URLSearchParams,
    console,
    location:{search:"?from=landing"},
    TarotProgressCore:{createProgress:()=>progress},
    TarotJourney:{set:(key,value)=>{projected[key]=value;}},
    addEventListener:(type,fn)=>{listeners[type]=fn;},
  };
  sandbox.globalThis=sandbox;
  sandbox.window=sandbox;
  vm.createContext(sandbox);
  vm.runInContext(observer,sandbox,{filename:"garden-progress-observer.js"});

  assert.equal(projected.landingMemoryDone,true);
  assert.deepEqual(JSON.parse(JSON.stringify(projected.gardenStory)),{
    shioponDone:true,
    lumiereDone:false,
    joined:true,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(projected.companion)),{mode:"following"});
  assert.deepEqual(durable.checkpoint,{mapId:"star_gate_garden",spawnId:"south_gate"});
  assert.equal(typeof listeners["tarot-breaker:interaction-end"],"function");
});
