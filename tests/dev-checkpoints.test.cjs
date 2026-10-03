const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
test("checkpoint registry cannot write production progress",()=>{const src=fs.readFileSync("dev-checkpoints.js","utf8");assert.doesNotMatch(src,/localStorage\s*\./);assert.doesNotMatch(src,/TarotProgressCore/);});
test("unreleased Star Gate has no fake healthy checkpoint",()=>{const api=require("../dev-checkpoints.js");for(const id of ["star-gate-choice","star-gate-camera","star-gate-normal-resonance","star-gate-reverse-flow","star-gate-aftermath"])assert.equal(api.get(id),null);});
test("normal route does not load checkpoint registry",()=>{const html=fs.readFileSync("index.html","utf8");assert.doesNotMatch(html,/dev-checkpoints\.js/);});
test("Phase 2A-5c checkpoints resolve to registered event segments",()=>{
  const contracts=JSON.parse(fs.readFileSync("event-contracts.json","utf8")).events;
  const checkpoints=require("../dev-checkpoints.js");
  const ids=[
    "landing-resume-arrival","landing-resume-memory-complete","landing-resume-waiting",
    "garden-resume-before-shiopon","garden-resume-after-shiopon","garden-resume-after-lumiere",
  ];
  for(const id of ids){
    const checkpoint=checkpoints.get(id);
    assert.ok(checkpoint,id);
    assert.equal(checkpoint.event,"garden-landing-continue-recovery",id);
    assert.ok(contracts[checkpoint.event],checkpoint.event);
    assert.ok(Object.hasOwn(contracts[checkpoint.event].segments,checkpoint.segment),checkpoint.segment);
    for(const runtime of checkpoint.requiredRuntime)
      assert.equal(fs.existsSync(runtime),true,`${id}: missing ${runtime}`);
  }
});
test("Garden direct Continue bootstrap writes its real receiver after shared dependencies",()=>{
  const writes=[];
  vm.runInNewContext(fs.readFileSync("garden-dev-bootstrap.js","utf8"),{
    URLSearchParams,
    location:{search:"?dev=garden-resume-after-shiopon"},
    document:{write(value){writes.push(value);}},
  });
  assert.deepEqual(writes,[
    '<script src="./dev-checkpoints.js?v=phase-2a-5c-1"></script>',
    '<script src="./progress-resume.js?v=phase-2a-6c-garden"></script>',
    '<script src="./garden-resume.js?v=phase-2a-5c-1"></script>',
  ]);
});
test("Garden dev bootstrap writes executable script end tags in dependency order",()=>{
  const writes=[];
  vm.runInNewContext(fs.readFileSync("garden-dev-bootstrap.js","utf8"),{
    URLSearchParams,
    location:{search:"?from=landing&dev=landing-resume-arrival"},
    document:{write(value){writes.push(value);}},
  });
  assert.deepEqual(writes,[
    '<script src="./dev-checkpoints.js?v=phase-2a-5c-1"></script>',
    '<script src="./progress-resume.js?v=phase-2a-6c-garden"></script>',
    '<script src="./landing-resume.js?v=phase-2a-5c-2"></script>',
  ]);
  for(const output of writes){
    assert.match(output,/<\/script>$/);
    assert.equal(output.includes("<\\/script>"),false);
  }
});
