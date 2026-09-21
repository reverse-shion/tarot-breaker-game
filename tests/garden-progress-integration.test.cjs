"use strict";
const fs=require("node:fs"),path=require("node:path"),test=require("node:test"),assert=require("node:assert/strict");
const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
const observer=fs.readFileSync(path.join(__dirname,"..","garden-progress-observer.js"),"utf8");
const dialogue=fs.readFileSync(path.join(__dirname,"..","dialogue.js"),"utf8");

test("Garden loads Progress bridge before authored dialogue runtime",()=>{
  const registry=html.indexOf("./route-registry.js?v=20260921-progress-v1");
  const progress=html.indexOf("./progress.js?v=20260921-progress-v1");
  const bridge=html.indexOf("./garden-progress-observer.js?v=phase-2a-4c-1");
  const authored=html.indexOf("./dialogue.js?v=20260920-dialogue-ui-v3");
  assert.ok(registry>=0 && progress>registry && bridge>progress && authored>bridge);
});

test("authored completion emits semantic fact after legacy save and before interaction release",()=>{
  for(const token of ['"garden_shiopon_meet"','"garden_lumiere_gate"']) assert.ok(dialogue.includes(token),token);
  const save=dialogue.indexOf("saveStory();",dialogue.indexOf("function finishEvent"));
  const signal=dialogue.indexOf('"tarot-breaker:story-event-complete"',save);
  const release=dialogue.indexOf('"tarot-breaker:interaction-end"',signal);
  assert.ok(save>=0 && signal>save && release>signal);
  assert.match(dialogue,/story\.shioponDone = true;/);
  assert.match(dialogue,/story\.lumiereDone = true;/);
});

test("Garden bridge persists only explicit allow-listed completion facts",()=>{
  assert.match(observer,/addEventListener\("tarot-breaker:story-event-complete"/);
  assert.match(observer,/garden_shiopon_meet:[\s\S]*mapId: "star_gate_garden"/);
  assert.match(observer,/garden_lumiere_gate:[\s\S]*mapId: "star_gate_garden"/);
  assert.match(observer,/progress\.completeEvent\(eventId, checkpoint\)/);
  assert.doesNotMatch(observer,/addEventListener\("tarot-breaker:interaction-end"/);
  assert.doesNotMatch(observer,/TarotGardenDialogue/);
});

test("Progress durable facts restore legacy Garden true flags before dialogue initialization",()=>{
  const restoreShiopon=observer.indexOf('progress.isEventCompleted("garden_shiopon_meet")');
  const restoreLumiere=observer.indexOf('progress.isEventCompleted("garden_lumiere_gate")');
  const write=observer.indexOf('TarotJourney?.set("gardenStory", restored)');
  assert.ok(restoreShiopon>=0 && restoreLumiere>=0 && write>restoreShiopon && write>restoreLumiere);
  assert.ok(observer.includes("saved.shioponDone === true ||"));
  assert.ok(observer.includes("saved.lumiereDone === true ||"));
});

test("Garden bridge never starts or suppresses authored events and preserves Landing arrival",()=>{
  assert.doesNotMatch(observer,/\.startEvent\(|\.start\("shioponMeet"|\.start\("lumiereGate"/);
  assert.doesNotMatch(observer,/shioponDone\s*=\s*false|lumiereDone\s*=\s*false/);
  assert.match(observer,/reason: "gate_to_garden"/);
});
