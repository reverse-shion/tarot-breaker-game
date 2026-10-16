'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]);
const files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(entry.name==='result.json')files.push(p)}}walk(root);
const results=files.map(p=>JSON.parse(fs.readFileSync(p))),old=results.find(x=>x.engine==='old'),current=results.find(x=>x.engine==='new');
assert.equal(results.length,2,'exactly two matrix results required');assert.ok(old&&current);
for(const key of ['baseline','executionHead','htmlSHA256','inlineJavaScriptSHA256','observationHookSHA256','node','platform','arch'])assert.deepEqual(old.identity[key],current.identity[key],key+' differs');
assert.deepEqual(old.identity.files,current.identity.files,'fixed input files differ');
assert.equal(old.native.verdict,'EXPECTED_OLD_ENGINE_STALL');assert.equal(old.native.rawTestResult,'FAIL');assert.equal(old.native.rawExit,1);
assert.equal(old.unwrapped.verdict,'EXPECTED_OLD_UNWRAPPED_RELOAD_FAILURES');
assert.equal(current.native.verdict,'PASS_NEW_ENGINE');assert.equal(current.unwrapped.verdict,'PASS_NEW_UNWRAPPED_FOUR');assert.equal(current.existing.summary.pass,11);
assert.ok(old.comparisonEvidenceAccepted&&current.comparisonEvidenceAccepted);
const report={verdict:'F1_EVIDENCE_COMPLETE_ASTRA_DECISION_PENDING',identity:old.identity,
 old:{native:old.native,unwrapped:old.unwrapped},new:{native:current.native,unwrapped:current.unwrapped,existingEleven:current.existing},
 equalFixtureAndObservationBytes:true,http:'NOT_RUN; no current HTTP reproduction claim',normalOldEngineCIPass:false};
fs.writeFileSync(path.join(root,'comparison.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
