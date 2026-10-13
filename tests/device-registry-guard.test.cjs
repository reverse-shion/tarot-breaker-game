const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const vm=require("node:vm");
const verifiedSha="a".repeat(40);
function runGuard(result, options={}) {
 const messages=[],calls=[];
 const exitSignal={};
 const body=options.body ?? ["SCOPE: EVENT_SANDBOX","DEVICE_GATE_REQUIRED: YES","DEVICE_RUNTIME_SHA: "+verifiedSha,result].join("\n");
 let status=0;
 const childProcess={execFileSync(command,args){
  assert.equal(command,"git"); calls.push(args);
  if(args[0]==="fetch") return "";
  if(args[0]==="merge-base") {if(options.notAncestor) throw Error("not ancestor"); return "";}
  if(args[0]==="diff" && args[2].endsWith("...HEAD")) return "game.js\ndocs/DEVICE_VERIFICATION_REGISTRY.md\n";
  if(args[0]==="diff" && args[2]===verifiedSha+"..HEAD") return options.runtimeChanged ? "game.js\n" : "";
  throw Error("Unexpected git invocation: "+JSON.stringify(args));
 }};
 const mockFs={readFileSync(path){assert.equal(path,"docs/DEVICE_VERIFICATION_REGISTRY.md"); return options.noRegistry ? "" : verifiedSha;}};
 try {
  vm.runInNewContext(fs.readFileSync("scripts/device-registry-guard.cjs","utf8"),{
   require(name){if(name==="node:fs")return mockFs;if(name==="node:child_process")return childProcess;throw Error(name);},
   process:{env:{GITHUB_EVENT_NAME:"pull_request",GITHUB_BASE_REF:"main",PR_BODY:body},exit(code){status=code;throw exitSignal;}},
   console:{log(...args){messages.push(args.join(" "));},error(...args){messages.push(args.join(" "));}}
  });
 }catch(error){if(error!==exitSignal)throw error;}
 return {status,output:messages.join("\n"),calls};
}
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
test("device registry guard accepts exactly one standalone PASS with verified immutable runtime",()=>{
 const run=runGuard("DEVICE_RESULT: PASS");
 assert.equal(run.status,0);assert.match(run.output,/DEVICE REGISTRY GUARD: PASS/);
 assert.ok(run.calls.some(args=>args[0]==="merge-base" && args[1]==="--is-ancestor" && args[2]===verifiedSha));
 assert.ok(run.calls.some(args=>args[0]==="diff" && args[2]===verifiedSha+"..HEAD"));
});
test("device registry guard rejects PENDING and STOP even with quoted or fenced PASS examples",()=>{
 for(const result of ["PENDING","STOP"]){
  for(const example of ["> DEVICE_RESULT: PASS","```text\nDEVICE_RESULT: PASS\n```","~~~\nDEVICE_RESULT: PASS\n~~~"]){
   const run=runGuard("DEVICE_RESULT: "+result+"\n\n"+example);
   assert.equal(run.status,1,result+" with "+example);assert.match(run.output,/does not declare DEVICE_RESULT: PASS/);
  }
 }
});
test("device registry guard rejects missing, quoted-only, fenced-only and ambiguous device results",()=>{
 for(const result of ["","> DEVICE_RESULT: PASS","```\nDEVICE_RESULT: PASS\n```","~~~text\nDEVICE_RESULT: PASS\n~~~","DEVICE_RESULT: PASS\nDEVICE_RESULT: PENDING","DEVICE_RESULT: PASS\ndevice_result: PASS"]){
  const run=runGuard(result);assert.equal(run.status,1,result);assert.match(run.output,/exactly one DEVICE_RESULT line/);
 }
});
test("device registry guard accepts actual PASS while ignoring fenced or quoted alternatives",()=>{
 for(const example of ["> DEVICE_RESULT: STOP","```\nDEVICE_RESULT: PENDING\n```","~~~~\n~~~\nDEVICE_RESULT: STOP\n~~~~"]){
  assert.equal(runGuard("DEVICE_RESULT: PASS\n"+example).status,0,example);
 }
});
test("device registry guard rejects PASS prefixes, inline mentions and multiline values",()=>{
 for(const result of ["DEVICE_RESULT: PASSING","DEVICE_RESULT: PASS (reported)","Evidence: DEVICE_RESULT: PASS","DEVICE_RESULT:\nPASS"]){
  assert.equal(runGuard(result).status,1,result);
 }
});
test("device registry guard excludes Markdown indented-code metadata examples",()=>{
 for(const example of ["    DEVICE_RESULT: PASS","\tDEVICE_RESULT: PASS"," \tDEVICE_RESULT: PASS"]){
  const missing=runGuard(example);assert.equal(missing.status,1,example);assert.match(missing.output,/exactly one DEVICE_RESULT line/);
  assert.equal(runGuard("DEVICE_RESULT: PENDING\n"+example).status,1,example);
  assert.equal(runGuard("DEVICE_RESULT: PASS\n"+example).status,0,example);
 }
 for(const indentation of [""," ","  ","   "]){
  assert.equal(runGuard(indentation+"DEVICE_RESULT: PASS").status,0,JSON.stringify(indentation));
 }
});
test("device registry guard still rejects unverified ancestry, changed runtime and missing registry",()=>{
 for(const [options,message] of [[{notAncestor:true},/not an ancestor/],[{runtimeChanged:true},/Production\/runtime files changed/],[{noRegistry:true},/not recorded/]]){
  const run=runGuard("DEVICE_RESULT: PASS",options);assert.equal(run.status,1);assert.match(run.output,message);
 }
});
