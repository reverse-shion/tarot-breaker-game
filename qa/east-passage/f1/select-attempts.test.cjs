'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {selectAttempts,EvidenceStop,jobName,ENGINE_STEPS}=require('./select-attempts.cjs');
const {collect}=require('./collect-actions.cjs');
const HEAD='6045b70a09ca164d30af94eebd86cd53870f5739';
function scenario(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'f1-pair-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const env={GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'2',GITHUB_REPOSITORY:'reverse-shion/tarot-breaker-game',F1_EXPECTED_HEAD:HEAD};
 const run=attempt=>({id:123,head_sha:HEAD,run_attempt:attempt,run_started_at:`2026-10-16T12:${String(attempt*10).padStart(2,'0')}:00Z`});
 const snapshot={schema:1,repository:env.GITHUB_REPOSITORY,runID:'123',expectedHead:HEAD,currentAttempt:2,run:run(2),attempts:[1,2].map(n=>({run:run(n),jobs:[]})),artifacts:[]};
 function add(engine,attempt,accepted=true,mode='complete'){
  const name=`f1-${engine}-123-${attempt}`,loc=path.join(dir,name),start=snapshot.attempts[attempt-1].run.run_started_at,end=start.replace(':00Z',':30Z');
  const job={id:100*attempt+(engine==='old'?1:2),run_id:123,head_sha:HEAD,run_attempt:attempt,name:jobName(engine),status:'completed',conclusion:'success',started_at:start,completed_at:end,
   steps:ENGINE_STEPS.map((name,i)=>({number:i+1,name,status:'completed',conclusion:'success',started_at:new Date(Date.parse(start)+i*3000).toISOString(),completed_at:new Date(Date.parse(start)+(i+1)*3000).toISOString()}))};
  snapshot.attempts[attempt-1].jobs.push(job);
  if(mode==='missing')return;
  const identity={executionHead:HEAD,expectedHead:HEAD,actions:{attempt:String(attempt),runURL:`https://github.com/${env.GITHUB_REPOSITORY}/actions/runs/123`}};
  const result={engine,identity,comparisonEvidenceAccepted:accepted,native:{verdict:accepted?'EXPECTED_OLD_ENGINE_STALL':'INCONCLUSIVE_FAILURE'},unwrapped:{verdict:'EXPECTED_OLD_UNWRAPPED_RELOAD_FAILURES'}};
  snapshot.artifacts.push({id:job.id,name,expired:false,created_at:end,workflow_run:{id:123,head_sha:HEAD}});
  fs.mkdirSync(loc);fs.writeFileSync(path.join(loc,'identity.json'),JSON.stringify(identity));
  if(mode==='complete')fs.writeFileSync(path.join(loc,'result.json'),JSON.stringify(result));
  return loc;
 }
 function inherit(engine,attempt){const prior=snapshot.attempts[attempt-2].jobs.find(j=>j.name===jobName(engine));snapshot.attempts[attempt-1].jobs.push({...structuredClone(prior),id:999+attempt,run_attempt:attempt})}
 function save(){fs.writeFileSync(path.join(dir,'actions-history.json'),JSON.stringify(snapshot))}
 function select(){save();return selectAttempts(dir,env)}
 function stop(pattern){save();try{selectAttempts(dir,env);assert.fail('expected STOP')}catch(error){assert.ok(error instanceof EvidenceStop);assert.match(error.message,pattern);return error}}
 return {dir,env,snapshot,add,inherit,save,select,stop};
}
function mixed(t,mode='complete',accepted=true,priorAccepted=false){const f=scenario(t);f.add('old',1,priorAccepted);f.add('new',1);f.add('old',2,accepted,mode);f.inherit('new',2);return f}
test('select latest old attempt and retain historical failure; use prior green new attempt',t=>{
 const f=mixed(t),{old,current,provenance}=f.select();
 assert.equal(old.comparisonEvidenceAccepted,true);assert.equal(current.comparisonEvidenceAccepted,true);
 assert.deepEqual(provenance.attempts,{old:2,new:1});assert.equal(provenance.sameAttempt,false);
 assert.deepEqual(provenance.history.old.map(x=>x.state),['FAILED','COMPLETE']);assert.equal(provenance.inherited[0].executionAttempt,1);
});
test('normal same-attempt comparison selects both latest executions',t=>{const f=mixed(t);f.snapshot.attempts[1].jobs=f.snapshot.attempts[1].jobs.filter(j=>j.name!==jobName('new'));f.add('new',2);assert.deepEqual(f.select().provenance.attempts,{old:2,new:2})});
test('latest failure is never silently replaced by prior success',t=>{const f=mixed(t,'complete',false,true);assert.equal(f.stop(/latest execution attempt 2: FAILED/).provenance.history.old[1].evidenceAccepted,false)});
test('F1-01: latest identity-only artifact STOPs rather than falling back',t=>{const f=mixed(t,'identity-only',true,true),e=f.stop(/attempt 2: INCOMPLETE_ARTIFACT/);assert.equal(e.provenance.attempts.old,2);assert.equal(e.provenance.history.old.length,2)});
test('latest API artifact itself absent STOPs even with two earlier successes',t=>{const f=mixed(t,'missing',true,true);const e=f.stop(/attempt 2: MISSING_ARTIFACT.*absent from Actions API/);assert.equal(e.provenance.history.old.length,2)});
test('artifact listed by API but not downloaded STOPs',t=>{const f=mixed(t);fs.rmSync(path.join(f.dir,'f1-old-123-2'),{recursive:true});f.stop(/downloaded directory missing/)});
test('empty latest artifact directory cannot hide latest execution',t=>{const f=mixed(t,'identity-only');fs.unlinkSync(path.join(f.dir,'f1-old-123-2/identity.json'));f.stop(/INCOMPLETE_ARTIFACT/)});
test('failed and incomplete historical attempts remain after a later success',t=>{const f=mixed(t,'identity-only');f.env.GITHUB_RUN_ATTEMPT='3';f.snapshot.currentAttempt=3;f.snapshot.run={...f.snapshot.run,run_attempt:3,run_started_at:'2026-10-16T12:30:00Z'};f.snapshot.attempts.push({run:f.snapshot.run,jobs:[]});f.add('old',3);f.inherit('new',3);assert.deepEqual(f.select().provenance.history.old.map(x=>x.state),['FAILED','INCOMPLETE_ARTIFACT','COMPLETE'])});
test('missing historical artifact remains in accepted audit history',t=>{const f=mixed(t);fs.rmSync(path.join(f.dir,'f1-old-123-1'),{recursive:true});f.snapshot.artifacts=f.snapshot.artifacts.filter(a=>a.name!=='f1-old-123-1');const row=f.select().provenance.history.old[0];assert.equal(row.state,'MISSING_ARTIFACT');assert.match(row.reasons[0],/absent from Actions API/)});
test('reject a foreign run even when its JSON claims a valid source HEAD',t=>{const f=mixed(t);fs.renameSync(path.join(f.dir,'f1-old-123-2'),path.join(f.dir,'f1-old-456-2'));f.stop(/unlisted\/untrusted artifact directory/)});
test('reject forged attempt metadata',t=>{const f=mixed(t);const p=path.join(f.dir,'f1-old-123-2/identity.json'),id=JSON.parse(fs.readFileSync(p));id.actions.attempt='1';fs.writeFileSync(p,JSON.stringify(id));f.stop(/artifact attempt metadata mismatch/)});
test('refuse absent counterpart or future-attempt artifact',t=>{const f=mixed(t);fs.mkdirSync(path.join(f.dir,'f1-old-123-3'));f.stop(/unlisted\/untrusted artifact directory/)});
test('forged API inventory attempt without real execution STOPs',t=>{const f=mixed(t);f.snapshot.artifacts[0].name='f1-old-123-3';f.stop(/without matching actual execution/)});
test('wrong evidence HEAD STOPs even for a historical artifact',t=>{const f=mixed(t);const p=path.join(f.dir,'f1-old-123-1/identity.json'),id=JSON.parse(fs.readFileSync(p));id.executionHead='a'.repeat(40);fs.writeFileSync(p,JSON.stringify(id));f.stop(/wrong HEAD in evidence/)});
test('wrong HEAD in result cannot bypass independent identity file',t=>{const f=mixed(t);const p=path.join(f.dir,'f1-old-123-2/result.json'),r=JSON.parse(fs.readFileSync(p));r.identity.executionHead='a'.repeat(40);fs.writeFileSync(p,JSON.stringify(r));f.stop(/wrong HEAD in evidence/)});
test('future API attempt is rejected',t=>{const f=mixed(t);f.snapshot.currentAttempt=3;f.stop(/API attempt mismatch/)});
test('wrong API HEAD STOPs',t=>{const f=mixed(t);f.snapshot.run.head_sha='a'.repeat(40);f.stop(/wrong HEAD in API run/)});
test('foreign API artifact run STOPs',t=>{const f=mixed(t);f.snapshot.artifacts[0].workflow_run.id=999;f.stop(/foreign artifact run/)});
test('inherited peer with differing step history STOPs',t=>{const f=mixed(t);f.snapshot.attempts[1].jobs[1].steps[0].name='changed';f.stop(/engine step sequence/)});
test('inherited failed peer is not a normal previous success',t=>{const f=mixed(t);for(const a of f.snapshot.attempts)a.jobs.find(j=>j.name===jobName('new')).conclusion='failure';f.stop(/inherited execution not proven/)});
test('new execution times force fresh artifact even with misleading created_at/run_attempt',t=>{const f=mixed(t);const j=f.snapshot.attempts[1].jobs[1];j.started_at='2026-10-16T12:21:00Z';j.completed_at='2026-10-16T12:21:30Z';for(const step of j.steps){step.started_at=new Date(Date.parse(step.started_at)+660000).toISOString();step.completed_at=new Date(Date.parse(step.completed_at)+660000).toISOString()}f.stop(/new latest execution attempt 2: MISSING_ARTIFACT/)});
test('insufficient or ambiguous attempt job history STOPs',t=>{const f=mixed(t);f.snapshot.attempts[1].jobs.push(structuredClone(f.snapshot.attempts[1].jobs[0]));f.stop(/missing\/ambiguous API job/)});
test('expired latest artifact STOPs',t=>{const f=mixed(t);f.snapshot.artifacts.at(-1).expired=true;f.stop(/API artifact expired/)});
test('latest failed job cannot be accepted using a COMPLETE result',t=>{const f=mixed(t);f.snapshot.attempts[1].jobs[0].conclusion='failure';f.stop(/job conclusion failure/)});
test('compare command persists STOP report and incomplete history',t=>{const f=mixed(t,'identity-only');f.save();const p=spawnSync(process.execPath,[path.join(__dirname,'compare.cjs'),f.dir],{env:{...process.env,...f.env},encoding:'utf8'});assert.equal(p.status,1);const report=JSON.parse(fs.readFileSync(path.join(f.dir,'comparison.json')));assert.equal(report.verdict,'STOP');assert.match(report.reasons.join(' '),/INCOMPLETE_ARTIFACT/);assert.equal(report.selection.history.old.length,2)});
test('collector retrieves every attempt and rejects an incomplete pagination response',t=>{const f=mixed(t);let count=0;function api(route){if(route.includes('/jobs?'))return [{total_count:3,jobs:[]}];if(route.includes('/attempts/'))return [f.snapshot.attempts[Number(/attempts\/(\d+)/.exec(route)[1])-1].run];count++;return [f.snapshot.run]}assert.throws(()=>collect(f.env,api),/incomplete API pagination/);assert.equal(count,1)});
test('missing API snapshot cannot fall back to directory-only success',t=>{const f=mixed(t);assert.throws(()=>selectAttempts(f.dir,f.env),/STOP:.*ENOENT/)});

test('collector failure cannot be ignored in favor of older files',t=>{const f=mixed(t);f.snapshot.collectionError='403 API forbidden';f.stop(/API history unavailable.*403/)});
test('collector archives complete multi-page jobs and artifacts and detects a run race',t=>{
 const f=mixed(t);let calls=0;
 function api(route){
  const attempt=/attempts\/(\d+)/.exec(route);
  if(route.includes('/jobs?'))return [{total_count:2,jobs:f.snapshot.attempts[Number(attempt[1])-1].jobs}];
  if(route.includes('/artifacts?'))return [{total_count:3,artifacts:/page=2$/.test(route)?f.snapshot.artifacts.slice(2):f.snapshot.artifacts.slice(0,2)}];
  if(attempt)return [f.snapshot.attempts[Number(attempt[1])-1].run];
  calls++;return [f.snapshot.run];
 }
 const result=collect(f.env,api);assert.equal(result.artifacts.length,3);assert.equal(result.attempts.length,2);assert.equal(calls,2);
 calls=0;assert.throws(()=>collect(f.env,route=>{const r=api(route);if(calls===2)return [{...f.snapshot.run,run_attempt:3}];return r}),/run changed/);
});
for(const field of ['name','number','conclusion'])test(`missing latest step ${field} must STOP with retained execution history`,t=>{const f=mixed(t);delete f.snapshot.attempts[1].jobs[0].steps[0][field];const e=f.stop(/step .*missing/);assert.equal(e.provenance.history.old.at(-1).state,'UNVERIFIED_EXECUTION');assert.equal(e.provenance.attempts.old,2)});
test('success job with failed step is contradictory and STOPs',t=>{const f=mixed(t);f.snapshot.attempts[1].jobs[0].steps[0].conclusion='failure';f.stop(/successful job contradicts failed or skipped step/)});
test('incomplete historical API job remains in STOP audit history',t=>{const f=mixed(t);f.snapshot.attempts[0].jobs[0].status='in_progress';const e=f.stop(/execution incomplete/);const row=e.provenance.history.old[0];assert.equal(row.attempt,1);assert.equal(row.job.status,'in_progress');assert.match(row.reasons.join(' '),/execution incomplete/)});
test('historical failure classifier reasons remain after accepted latest execution',t=>{const f=mixed(t);const p=path.join(f.dir,'f1-old-123-1/result.json'),r=JSON.parse(fs.readFileSync(p));r.native.reason='native cancellation';r.unwrapped.reason='missing original scenarios';fs.writeFileSync(p,JSON.stringify(r));const row=f.select().provenance.history.old[0];assert.deepEqual(row.reasons,['native cancellation','missing original scenarios']);assert.equal(row.classification.native.reason,'native cancellation')});

test('identically truncated original and inherited step arrays cannot prove complete history',t=>{const f=mixed(t);for(const a of f.snapshot.attempts)a.jobs.find(j=>j.name===jobName('new')).steps.pop();f.stop(/incomplete\/changed engine step sequence/)});
test('duplicate step numbers are insufficient execution metadata',t=>{const f=mixed(t);f.snapshot.attempts[1].jobs[0].steps[1].number=1;f.stop(/step number missing\/invalid\/unordered/)});

for(const field of ['head','run','attempt','engine'])test(`historical result wrong ${field} cannot hide behind missing identity file`,t=>{
 const f=mixed(t),dir=path.join(f.dir,'f1-old-123-1'),p=path.join(dir,'result.json'),r=JSON.parse(fs.readFileSync(p));fs.unlinkSync(path.join(dir,'identity.json'));
 if(field==='head')r.identity.executionHead='a'.repeat(40);if(field==='run')r.identity.actions.runURL='https://github.com/foreign/run';if(field==='attempt')r.identity.actions.attempt='2';if(field==='engine')r.engine='new';
 fs.writeFileSync(p,JSON.stringify(r));f.stop(/wrong HEAD|run URL mismatch|attempt metadata mismatch|engine mismatch/);
});
test('valid historical result with missing identity remains incomplete history',t=>{const f=mixed(t);fs.unlinkSync(path.join(f.dir,'f1-old-123-1/identity.json'));assert.equal(f.select().provenance.history.old[0].state,'INCOMPLETE_ARTIFACT')});

for(const index of [3,4,5,6])test(`successful engine cannot skip required step ${index}`,t=>{const f=mixed(t);f.snapshot.attempts[1].jobs[0].steps[index].conclusion='skipped';f.stop(/successful job contradicts failed or skipped step/)});

for(const expired of [undefined,null,'false'])test(`artifact expiry requires explicit boolean (${String(expired)})`,t=>{const f=mixed(t);f.snapshot.artifacts.at(-1).expired=expired;f.stop(/artifact expiry metadata missing\/invalid/)});
