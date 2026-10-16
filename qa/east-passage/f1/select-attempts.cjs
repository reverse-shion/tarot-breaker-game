'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ENGINES=['old','new'];
const jobName=engine=>engine+' engine — raw results plus explicit evidence classification';
const time=value=>{const ms=Date.parse(value);assert.ok(Number.isFinite(ms),'missing/invalid execution timestamp');return ms};
// GitHub rewrites job IDs and run_attempt for inherited peers. Actual execution
// times AND the complete step history must match an earlier successful execution.
const execution=job=>JSON.stringify([job.started_at,job.completed_at,job.status,job.conclusion,
 job.steps?.map(s=>[s.number,s.name,s.status,s.conclusion,s.started_at,s.completed_at])]);
class EvidenceStop extends Error{
 constructor(reasons,provenance){super('STOP: '+reasons.join('; '));this.reasons=reasons;this.provenance=provenance}
}
function selectAttempts(root,env=process.env){
 const provenance={history:{old:[],new:[]},inherited:[],attempts:{},artifacts:[]},reasons=[];
 const stop=message=>reasons.push(message);
 const guard=(fn,row)=>{try{return fn()}catch(error){stop(error.message);if(row)row.reasons.push(error.message)}};
 const ci=Boolean(env.GITHUB_RUN_ID),runID=String(env.GITHUB_RUN_ID),current=Number(env.GITHUB_RUN_ATTEMPT),head=env.F1_EXPECTED_HEAD;
 let snapshot;
 guard(()=>{
  assert.ok(ci&&Number.isSafeInteger(current)&&current>=1,'Actions run/attempt required; unauthenticated local selection forbidden');
  assert.match(head||'',/^[a-f0-9]{40}$/,'exact expected HEAD required');
  snapshot=JSON.parse(fs.readFileSync(path.join(root,'actions-history.json'),'utf8'));
  assert.ok(!snapshot.collectionError,'Actions API history unavailable: '+snapshot.collectionError);
  assert.equal(snapshot.schema,1,'unsupported API history schema');
  assert.equal(snapshot.repository,env.GITHUB_REPOSITORY,'foreign API repository');
  assert.equal(String(snapshot.runID),runID,'foreign API run');
  assert.equal(snapshot.currentAttempt,current,'API attempt mismatch');
  assert.equal(snapshot.expectedHead,head,'API expected HEAD mismatch');
  assert.equal(String(snapshot.run.id),runID,'foreign API run identity');
  assert.equal(snapshot.run.head_sha,head,'wrong HEAD in API run');
  assert.equal(snapshot.run.run_attempt,current,'API latest attempt mismatch');
  assert.equal(snapshot.attempts.length,current,'incomplete attempt history');
  assert.ok(Array.isArray(snapshot.artifacts),'artifact inventory missing');
 });
 if(reasons.length)throw new EvidenceStop(reasons,provenance);
 const rows=new Map(),starts=[];
 for(let i=0;i<current;i++)guard(()=>{
  const {run,jobs}=snapshot.attempts[i];
  assert.equal(String(run.id),runID,'foreign attempt run');assert.equal(run.head_sha,head,'wrong HEAD in attempt');
  assert.equal(run.run_attempt,i+1,'missing/forged API attempt');assert.ok(Array.isArray(jobs),'job history missing');
  const start=time(run.run_started_at);assert.ok(i===0||start>starts[i-1],'contradictory attempt start times');starts.push(start);
 });
 if(reasons.length)throw new EvidenceStop(reasons,provenance);
 for(let i=0;i<current;i++)for(const engine of ENGINES){
  const attempt=i+1,name=`f1-${engine}-${runID}-${attempt}`,list=provenance.history[engine],prior=list.at(-1);
  const row={attempt,artifact:name,state:'UNVERIFIED_EXECUTION',evidenceAccepted:false,reasons:[]};
  list.push(row);
  guard(()=>{
   const jobs=snapshot.attempts[i].jobs.filter(j=>j.name===jobName(engine));row.observedJobs=jobs;
   assert.equal(jobs.length,1,`${engine} attempt ${attempt}: missing/ambiguous API job`);
   const job=jobs[0];row.job=job;delete row.observedJobs;
   assert.equal(String(job.run_id),runID,'foreign job run');assert.equal(job.head_sha,head,'wrong HEAD in job');
   assert.equal(job.run_attempt,attempt,'job API attempt mismatch');
   assert.equal(job.status,'completed',`${engine} attempt ${attempt}: execution incomplete`);
   const conclusions=['success','failure','cancelled','skipped','neutral','timed_out','action_required','stale'];
   assert.ok(conclusions.includes(job.conclusion),'job conclusion missing/invalid');
   const start=time(job.started_at),end=time(job.completed_at);
   assert.ok(end>=start,'contradictory job times');
   assert.ok(Array.isArray(job.steps)&&job.steps.length>0,'job step history missing');
   let previousNumber=0,previousEnd=start;
   for(const step of job.steps){
    assert.ok(typeof step.name==='string'&&step.name.trim().length>0,'step name missing');
    assert.ok(Number.isSafeInteger(step.number)&&step.number>previousNumber,'step number missing/invalid/unordered');previousNumber=step.number;
    assert.equal(step.status,'completed','incomplete job step');
    assert.ok(conclusions.includes(step.conclusion),'step conclusion missing/invalid');
    if(job.conclusion==='success')assert.ok(['success','skipped'].includes(step.conclusion),'successful job contradicts failed step');
    const stepStart=time(step.started_at),stepEnd=time(step.completed_at);
    assert.ok(stepStart>=previousEnd&&stepEnd<=end&&stepEnd>=stepStart,'step execution outside job times/order');previousEnd=stepEnd;
   }
   if(start<starts[i]){
    assert.ok(prior&&job.conclusion==='success'&&prior.job?.conclusion==='success'&&execution(job)===execution(prior.job),`${engine} attempt ${attempt}: inherited execution not proven`);
    list.pop();provenance.inherited.push({engine,observedAttempt:attempt,executionAttempt:prior.attempt,job});return;
   }
   assert.ok(i+1===current||end<=starts[i+1],'execution overlaps a later attempt');
   row.state='MISSING_ARTIFACT';rows.set(name,row);
  },row);
 }
 // Enumerate directories themselves: identity-only/empty latest artifacts count.
 const directories=new Set();
 for(const entry of fs.readdirSync(root,{withFileTypes:true})){
  if(!entry.isDirectory())continue;
  if(new RegExp(`^f1-paired-${runID}-[1-9]\\d*$`).test(entry.name))continue;
  directories.add(entry.name);
 }
 const inventory=new Map();
 for(const artifact of snapshot.artifacts)guard(()=>{
  if(!/^f1-(old|new)-/.test(artifact.name))return;
  provenance.artifacts.push(artifact);
  assert.ok(!inventory.has(artifact.name),'duplicate API artifact name');inventory.set(artifact.name,artifact);
  const row=rows.get(artifact.name);assert.ok(row,'artifact without matching actual execution (foreign/forged/future): '+artifact.name);
  assert.equal(String(artifact.workflow_run?.id),runID,'foreign artifact run');assert.equal(artifact.workflow_run?.head_sha,head,'wrong HEAD in artifact');
  assert.ok(Number.isSafeInteger(artifact.id)&&artifact.id>0,'artifact ID missing');
  assert.ok(time(artifact.created_at)>=time(row.job.started_at)&&time(artifact.created_at)<=time(row.job.completed_at),'artifact time outside actual execution');
  if(artifact.expired){row.reasons.push('API artifact expired');return}
  if(!directories.has(artifact.name)){row.reasons.push('API artifact exists but downloaded directory missing');return}
  directories.delete(artifact.name);
  row.state='INCOMPLETE_ARTIFACT';
  const dir=path.join(root,artifact.name);
  let identity,result;
  try{
   identity=JSON.parse(fs.readFileSync(path.join(dir,'identity.json'),'utf8'));
   authenticate(identity,row.attempt);
   result=JSON.parse(fs.readFileSync(path.join(dir,'result.json'),'utf8'));
   assert.equal(result.engine,/^f1-(old|new)-/.exec(artifact.name)[1],'artifact engine mismatch');
   authenticate(result.identity,row.attempt);assert.deepEqual(result.identity,identity,'identity/result disagree');
  }catch(error){row.reasons.push(error.message);if(error.code!=='ENOENT')stop(artifact.name+': '+error.message);return}
  row.state=result.comparisonEvidenceAccepted===true?'COMPLETE':'FAILED';
  row.evidenceAccepted=result.comparisonEvidenceAccepted===true;
  row.nativeVerdict=result.native?.verdict;row.originalFourVerdict=result.unwrapped?.verdict;
  if(!row.evidenceAccepted){
   row.classification={native:result.native,unwrapped:result.unwrapped,existing:result.existing};
   row.reasons.push(...[result.native?.reason,result.unwrapped?.reason].filter(Boolean));
   if(!row.reasons.length)row.reasons.push('comparisonEvidenceAccepted is not true');
  }
  row.result=result;
 });
 for(const name of directories)stop('unlisted/untrusted artifact directory: '+name);
 const selected={};
 for(const engine of ENGINES){
  const list=provenance.history[engine],latest=list.at(-1);
  for(const row of list)if(!inventory.has(row.artifact))row.reasons.push('artifact absent from Actions API inventory');
  if(!latest){stop('no proven execution for '+engine);continue}
  provenance[engine]=latest.artifact;provenance.attempts[engine]=latest.attempt;
  if(latest.job?.conclusion!=='success')stop(`${engine} latest execution attempt ${latest.attempt}: job conclusion ${latest.job?.conclusion}`);
  if(latest.state!=='COMPLETE')stop(`${engine} latest execution attempt ${latest.attempt}: ${latest.state}: ${latest.reasons.join(', ')||'result evidence rejected'}`);
  selected[engine]=latest.result;
 }
 provenance.sameAttempt=provenance.attempts.old===provenance.attempts.new;
 // Result bodies are returned separately; keep audit history compact, including STOPs.
 for(const list of Object.values(provenance.history))for(const row of list)delete row.result;
 if(reasons.length)throw new EvidenceStop(reasons,provenance);
 return {old:selected.old,current:selected.new,provenance};
 function authenticate(identity,attempt){
  assert.ok(identity,'missing identity');assert.equal(identity.executionHead,head,'wrong HEAD in evidence');assert.equal(identity.expectedHead,head,'wrong expected HEAD in evidence');
  assert.equal(String(identity.actions?.attempt),String(attempt),'artifact attempt metadata mismatch');
  assert.equal(identity.actions?.runURL,`https://github.com/${env.GITHUB_REPOSITORY}/actions/runs/${runID}`,'artifact run URL mismatch');
 }
}
module.exports={selectAttempts,EvidenceStop,jobName};
