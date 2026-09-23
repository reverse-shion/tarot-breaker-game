const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
test("device registry guard requires exact candidate SHA when requested",()=>{
 const s=fs.readFileSync("scripts/device-registry-guard.cjs","utf8");
 assert.match(s,/DEVICE_GATE_REQUIRED/); assert.match(s,/GITHUB_SHA/);
 assert.match(s,/DEVICE_VERIFICATION_REGISTRY/); assert.match(s,/DEVICE_RESULT/);
 assert.match(s,/process\.exit\(1\)/);
});
test("workflow executes device registry guard with PR body",()=>{
 const y=fs.readFileSync(".github/workflows/verified-gameplay-contracts.yml","utf8");
 assert.match(y,/Device registry guard/);
 assert.match(y,/PR_BODY:/);
 assert.match(y,/node scripts\/device-registry-guard\.cjs/);
});
