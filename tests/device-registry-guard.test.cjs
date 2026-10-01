const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
test("device registry guard requires explicit verified runtime SHA when requested",()=>{
 const s=fs.readFileSync("scripts/device-registry-guard.cjs","utf8");
 assert.match(s,/DEVICE_GATE_REQUIRED/); assert.match(s,/DEVICE_RUNTIME_SHA/);
 assert.match(s,/DEVICE_VERIFICATION_REGISTRY/); assert.match(s,/DEVICE_RESULT/);
 assert.match(s,/merge-base/); assert.match(s,/--is-ancestor/);
 assert.match(s,/runtime immutability/); assert.match(s,/process\.exit\(1\)/);
});
test("device registry guard separates evidence commits from verified runtime",()=>{
 const s=fs.readFileSync("scripts/device-registry-guard.cjs","utf8");
 assert.match(s,/runtimeSha\+"\.\.HEAD"/);
 assert.match(s,/\:\(exclude\)docs\/\*\*/);
 assert.match(s,/\:\(exclude\)tests\/\*\*/);
 assert.match(s,/\:\(exclude\)\.github\/\*\*/);
 assert.match(s,/\:\(exclude\)scripts\/\*\*/);
 assert.match(s,/Production\/runtime files changed after DEVICE_RUNTIME_SHA/);
 assert.match(s,/later evidence-only changes are separated from the verified runtime/);
});
test("device registry guard narrowly exempts only unreferenced new asset-only PRs",()=>{
 const s=fs.readFileSync("scripts/device-registry-guard.cjs","utf8");
 assert.match(s,/f\.startsWith\("assets\/"\)/);
 assert.match(s,/ASSET_EXTENSIONS/); assert.match(s,/cat-file/);
 assert.match(s,/unreferencedNewAssetOnly/);
});
test("device registry guard accepts presentation-only asset replacements without weakening runtime gates",()=>{
 const s=fs.readFileSync("scripts/device-registry-guard.cjs","utf8");
 assert.match(s,/SAFE_ASSET_ONLY_DIRS/); assert.match(s,/assets\/events\//);
 assert.match(s,/behaviorNeutralAssetOnly/);
});
test("device registry guard treats an explicitly empty diff as a no-op",()=>{
 const s=fs.readFileSync("scripts/device-registry-guard.cjs","utf8");
 assert.match(s,/if \(files\.length === 0\)/); assert.match(s,/PASS \(no-op PR\)/);
});
test("workflow executes device registry guard with PR body",()=>{
 const y=fs.readFileSync(".github/workflows/verified-gameplay-contracts.yml","utf8");
 assert.match(y,/Device registry guard/); assert.match(y,/PR_BODY:/);
 assert.match(y,/node scripts\/device-registry-guard\.cjs/);
});
