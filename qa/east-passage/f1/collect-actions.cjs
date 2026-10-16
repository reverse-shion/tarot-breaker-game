'use strict';
// Read-only API snapshot. No artifact/result file is used to infer which jobs ran.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
function collect(env=process.env,api=route=>[JSON.parse(execFileSync('gh',['api',route],{encoding:'utf8',maxBuffer:32*1024*1024}))]){
 const {GITHUB_REPOSITORY:repository,GITHUB_RUN_ID:runID,GITHUB_RUN_ATTEMPT:attempt,F1_EXPECTED_HEAD:expectedHead}=env;
 if(!/^[\w.-]+\/[\w.-]+$/.test(repository||'')||!/^\d+$/.test(runID||'')||!/^\d+$/.test(attempt||'')||!Number.isSafeInteger(Number(attempt))||Number(attempt)<1||!/^[a-f0-9]{40}$/.test(expectedHead||''))throw Error('STOP: missing Actions identity');
 const base=`repos/${repository}/actions/runs/${runID}`;
 const one=route=>{const pages=api(route);if(pages.length!==1)throw Error('unexpected metadata pagination');return pages[0]};
 const many=(route,key)=>{
  const rows=[];let total;
  for(let page=1;page<=1000;page++){
   const data=one(`${route}?per_page=100&page=${page}`);
   if(!Number.isSafeInteger(data.total_count)||data.total_count<0||!Array.isArray(data[key])||(total!==undefined&&total!==data.total_count))throw Error('inconsistent API pagination: '+route);
   total=data.total_count;rows.push(...data[key]);
   if(rows.length===total)return rows;
   if(rows.length>total||data[key].length===0)break;
  }
  throw Error('incomplete API pagination: '+route);
 };
 const run=one(base),attempts=[];
 for(let n=1;n<=Number(attempt);n++)attempts.push({run:one(`${base}/attempts/${n}`),jobs:many(`${base}/attempts/${n}/jobs`,'jobs')});
 const artifacts=many(base+'/artifacts','artifacts'),after=one(base);
 if(run.id!==after.id||run.run_attempt!==Number(attempt)||after.run_attempt!==Number(attempt)||run.head_sha!==after.head_sha)throw Error('run changed while collecting API history');
 return {schema:1,repository,runID,expectedHead,currentAttempt:Number(attempt),collectedAt:new Date().toISOString(),run,attempts,artifacts};
}
if(require.main===module){
 const root=path.resolve(process.argv[2]);fs.mkdirSync(root,{recursive:true});
 try{fs.writeFileSync(path.join(root,'actions-history.json'),JSON.stringify(collect(),null,2))}
 catch(error){fs.writeFileSync(path.join(root,'actions-history.json'),JSON.stringify({collectionError:error.message},null,2));console.error(error.message);process.exitCode=1}
}
module.exports={collect};
