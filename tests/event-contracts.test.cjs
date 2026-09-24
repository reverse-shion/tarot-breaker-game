const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const registry=()=>JSON.parse(fs.readFileSync("event-contracts.json","utf8"));
const docs=()=>fs.readFileSync("docs/EVENT_CONTRACTS.md","utf8");
const SHA40=/^[0-9a-f]{40}$/;

test("event registry is the machine-readable Source of Truth",()=>{
  const j=registry();
  assert.equal(j.contractSchema?.sourceOfTruth,"event-contracts.json");
  assert.deepEqual(j.contractSchema?.allowedStatuses,["NOT TESTED","PARTIALLY DEVICE VERIFIED","DEVICE VERIFIED"]);
});

test("event status is derived consistently from segment verification",()=>{
  const j=registry();
  const allowed=new Set(j.contractSchema.allowedStatuses);
  for(const [id,e] of Object.entries(j.events)){
    assert.ok(allowed.has(e.status),id+" has an unsupported event status");
    const values=Object.values(e.segments||{});
    assert.ok(values.length>0,id+" must declare segments");
    for(const status of values)assert.ok(["NOT TESTED","DEVICE VERIFIED"].includes(status),id+" has an unsupported segment status");
    const verified=values.filter(status=>status==="DEVICE VERIFIED").length;
    if(verified===0)assert.equal(e.status,"NOT TESTED",id+" status must match zero verified segments");
    else if(verified===values.length)assert.equal(e.status,"DEVICE VERIFIED",id+" status must match all verified segments");
    else assert.equal(e.status,"PARTIALLY DEVICE VERIFIED",id+" status must match mixed segment verification");
    if(verified>0)assert.match(e.verifiedBaseline||"",SHA40,id+" verified scope requires a commit baseline");
  }
});

test("human contract mirrors the registry without pinning historical progress",()=>{
  const j=registry(),d=docs();
  assert.match(d,/Machine-readable Source of Truth: `event-contracts\.json`/);
  for(const [id,e] of Object.entries(j.events)){
    assert.ok(d.includes("event_id: "+id),id+" missing from human contract");
    assert.ok(d.includes("status: "+e.status+" / unreleased"),id+" human status is stale");
    for(const [segment,status] of Object.entries(e.segments))assert.ok(d.includes("- "+segment+" — "+status),segment+" human status is stale");
    if(e.verifiedBaseline)assert.ok(d.includes(e.verifiedBaseline),id+" verified baseline missing from human contract");
  }
});

test("production release remains explicitly gated",()=>{
  const j=registry();
  for(const [id,e] of Object.entries(j.events))assert.equal(e.productionEnabled,false,id+" must remain unreleased until explicit approval");
});

test("machine registry does not invent locked Star Gate segments",()=>{
  const j=registry();
  for(const s of Object.values(j.events["star-gate-anomaly"].segments))assert.notEqual(s,"CONTRACT LOCKED");
});
