'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {selectAttempts}=require('./select-attempts.cjs');
const env={GITHUB_RUN_ID:'38892991421',GITHUB_RUN_ATTEMPT:'3',GITHUB_REPOSITORY:'reverse-shion/tarot-breaker-game'};
function scenario(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'f1-pair-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 function add(engine,attempt,accepted=true,override={}){
  const name='f1-'+engine+'-'+env.GITHUB_RUN_ID+'-'+attempt,loc=path.join(dir,name);
  fs.mkdirSync(loc);
  const result={engine,identity:{executionHead:'91ce2839a95d7a4983ff7aa6a749d5026406966b',
   actions:{attempt:String(attempt),runURL:'https://github.com/'+env.GITHUB_REPOSITORY+'/actions/runs/'+env.GITHUB_RUN_ID}},
   comparisonEvidenceAccepted:accepted,native:{verdict:accepted?'EXPECTED_OLD_ENGINE_STALL':'INCONCLUSIVE_FAILURE'},
   unwrapped:{verdict:'EXPECTED_OLD_UNWRAPPED_RELOAD_FAILURES'},...override};
  fs.writeFileSync(path.join(loc,'result.json'),JSON.stringify(result));
  return loc;
 }
 return {dir,add};
}
test('select latest old attempt and retain historical failure; use prior green new attempt',t=>{
 const f=scenario(t);f.add('old',1,false);f.add('old',2,true);f.add('new',1,true);
 const {old,current,provenance}=selectAttempts(f.dir,env);
 assert.equal(old.comparisonEvidenceAccepted,true);assert.equal(current.comparisonEvidenceAccepted,true);
 assert.deepEqual(provenance.attempts,{old:2,new:1});
 assert.equal(provenance.sameAttempt,false);
 assert.deepEqual(provenance.history.old.map(x=>x.evidenceAccepted),[false,true]);
});
test('latest failure is never silently replaced by prior success',t=>{
 const f=scenario(t);f.add('old',1,true);f.add('old',2,false);f.add('new',1,true);
 const {old,provenance}=selectAttempts(f.dir,env);
 assert.equal(old.comparisonEvidenceAccepted,false);assert.equal(provenance.attempts.old,2);
});
test('reject a foreign run even when its JSON claims a valid source HEAD',t=>{
 const f=scenario(t);f.add('old',1);f.add('new',1);
 const original=path.join(f.dir,'f1-old-'+env.GITHUB_RUN_ID+'-1');
 fs.renameSync(original,path.join(f.dir,'f1-old-38892991422-1'));
 assert.throws(()=>selectAttempts(f.dir,env),/foreign run artifact/);
});
test('reject forged attempt metadata',t=>{
 const f=scenario(t);f.add('old',1,true,{identity:{actions:{attempt:'2',runURL:'https://github.com/'+env.GITHUB_REPOSITORY+'/actions/runs/'+env.GITHUB_RUN_ID}}});f.add('new',1);
 assert.throws(()=>selectAttempts(f.dir,env),/artifact attempt metadata mismatch/);
});
test('refuse absent latest counterpart or future-attempt artifact',t=>{
 const f=scenario(t);f.add('old',1);
 assert.throws(()=>selectAttempts(f.dir,env),/both engine results are required/);
 f.add('new',4);
 assert.throws(()=>selectAttempts(f.dir,env),/future run attempt rejected/);
});
