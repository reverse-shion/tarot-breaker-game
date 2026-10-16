'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');

function selectAttempts(root,env=process.env){
 const files=[];
 function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   const p=path.join(dir,entry.name);
   if(entry.isDirectory())walk(p);
   else if(entry.name==='result.json')files.push(p);
  }
 }
 walk(root);
 assert.ok(files.length>=2,'both engine results are required');
 const grouped={old:[],new:[]};
 const ci=Boolean(env.GITHUB_RUN_ID);
 for(const file of files){
  const relative=path.relative(root,file).split(path.sep);
  assert.equal(relative.length,2,'result.json must be directly inside its artifact directory');
  const name=relative[0];
  const found=/^f1-(old|new)-(\d+)-(\d+)$/.exec(name);
  const local=/^f1-(old|new)$/.exec(name);
  assert.ok(ci?found:(found||local),'unrecognized or untrusted result artifact: '+name);
  const engine=(found||local)[1],runId=found?.[2]||null,attempt=Number(found?.[3]||0);
  if(ci){
   assert.equal(runId,String(env.GITHUB_RUN_ID),'foreign run artifact rejected');
   assert.ok(Number.isSafeInteger(attempt)&&attempt>=1,'invalid recorded attempt');
   if(env.GITHUB_RUN_ATTEMPT)assert.ok(attempt<=Number(env.GITHUB_RUN_ATTEMPT),'future run attempt rejected');
  }
  const result=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(result.engine,engine,'artifact name and JSON engine disagree');
  assert.ok(result.identity,'result missing identity');
  if(ci){
   assert.equal(String(result.identity.actions?.attempt),String(attempt),'artifact attempt metadata mismatch');
   assert.equal(result.identity.actions?.runURL,
    'https://github.com/'+env.GITHUB_REPOSITORY+'/actions/runs/'+runId,'artifact run URL mismatch');
  }
  grouped[engine].push({attempt,name,result});
 }
 const history={},selected={};
 for(const engine of ['old','new']){
  const list=grouped[engine].sort((a,b)=>a.attempt-b.attempt);
  assert.ok(list.length,'no '+engine+' engine artifact found');
  for(let i=1;i<list.length;i++)assert.notEqual(list[i].attempt,list[i-1].attempt,'duplicate '+engine+' attempt');
  history[engine]=list.map(x=>({attempt:x.attempt,artifact:x.name,
   evidenceAccepted:x.result.comparisonEvidenceAccepted===true,nativeVerdict:x.result.native?.verdict,
   originalFourVerdict:x.result.unwrapped?.verdict}));
  selected[engine]=list.at(-1);
 }
 return {old:selected.old.result,current:selected.new.result,
  provenance:{old:selected.old.name,new:selected.new.name,history,attempts:{
   old:selected.old.attempt,new:selected.new.attempt},sameAttempt:selected.old.attempt===selected.new.attempt}};
}
module.exports={selectAttempts};
