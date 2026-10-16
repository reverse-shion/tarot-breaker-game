'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]);
const {selectAttempts}=require('./select-attempts.cjs');
const {old,current,provenance}=selectAttempts(root);

for(const key of ['baseline','executionHead','expectedHead','htmlSHA256','inlineJavaScriptSHA256','observationHookSHA256','node','platform','arch'])assert.deepEqual(old.identity[key],current.identity[key],key+' differs');
assert.deepEqual(old.identity.files,current.identity.files,'fixed input files differ');
assert.match(process.env.F1_EXPECTED_HEAD||'',/^[0-9a-f]{40}$/,'workflow must supply exact expected head');
assert.equal(old.identity.executionHead,process.env.F1_EXPECTED_HEAD,'old engine ran a synthetic PR merge SHA, not the selected branch HEAD');
assert.equal(current.identity.executionHead,process.env.F1_EXPECTED_HEAD,'new engine ran a synthetic PR merge SHA, not the selected branch HEAD');
assert.equal(old.native.verdict,'EXPECTED_OLD_ENGINE_STALL');assert.equal(old.native.rawTestResult,'FAIL');assert.equal(old.native.rawExit,1);
assert.equal(old.unwrapped.verdict,'EXPECTED_OLD_UNWRAPPED_RELOAD_FAILURES');
assert.equal(current.native.verdict,'PASS_NEW_ENGINE');assert.equal(current.unwrapped.verdict,'PASS_NEW_UNWRAPPED_FOUR');assert.equal(current.existing.summary.pass,11);
assert.ok(old.comparisonEvidenceAccepted&&current.comparisonEvidenceAccepted);
const report={verdict:'F1_EVIDENCE_COMPLETE_ASTRA_DECISION_PENDING',identity:old.identity,
 selection:provenance,
 old:{native:old.native,unwrapped:old.unwrapped},new:{native:current.native,unwrapped:current.unwrapped,existingEleven:current.existing},
 equalFixtureAndObservationBytes:true,http:'NOT_RUN; no current HTTP reproduction claim',normalOldEngineCIPass:false};
fs.writeFileSync(path.join(root,'comparison.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
