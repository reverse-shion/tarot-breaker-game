"use strict";
const fs=require("node:fs"),path=require("node:path"),test=require("node:test"),assert=require("node:assert/strict");
const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
const observer=fs.readFileSync(path.join(__dirname,"..","garden-progress-observer.js"),"utf8");
const dialogue=fs.readFileSync(path.join(__dirname,"..","dialogue.js"),"utf8");

test("Garden loads Progress bridge without editing story ownership",()=>{
  const registry=html.indexOf("./route-registry.js?v=20260921-progress-v1");
  const progress=html.indexOf("./progress.js?v=20260921-progress-v1");
  const bridge=html.indexOf("./garden-progress-observer.js?v=phase-2a-4c-1");
  assert.ok(registry>=0 && progress>registry && bridge>progress);
  assert.match(dialogue,/story\.shioponDone = true;/);
  assert.match(dialogue,/story\.lumiereDone = true;/);
  assert.match(dialogue,/saveStory\(\);\s*window\.dispatchEvent\(new Event\("tarot-breaker:interaction-end"\)\)/);
});

test("Garden Progress observer cannot start or suppress authored events",()=>{
  assert.doesNotMatch(observer,/\.startEvent\(|\.start\("shioponMeet"|\.start\("lumiereGate"/);
  assert.doesNotMatch(observer,/shioponDone\s*=|lumiereDone\s*=/);
  assert.match(observer,/addEventListener\("tarot-breaker:interaction-end"/);
});

test("Garden records only existing completion facts and unchanged Landing arrival",()=>{
  assert.match(observer,/reason: "gate_to_garden"/);
  assert.match(observer,/completeEvent\("garden_shiopon_meet"/);
  assert.match(observer,/completeEvent\("garden_lumiere_gate"/);
});
