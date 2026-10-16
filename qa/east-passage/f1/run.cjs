'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {ROOT,FIXTURE,sha,identities,originalFour:prepareOriginal}=require('./common.cjs');
const {tapSummary,minimal,originalFour}=require('./classify.cjs');
const engine=process.argv[2];if(!['old','new'].includes(engine))throw Error('usage: node qa/east-passage/f1/run.cjs old|new');
const out=path.resolve(process.env.F1_EVIDENCE_DIR||path.join(ROOT,'f1-evidence',engine));fs.mkdirSync(out,{recursive:true});
const json=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2));
const identity=identities();json('identity.json',identity);
const env={...process.env,QA_DIAGNOSTIC_DIR:path.join(out,'native-diagnostics'),F1_OBSERVATION_FILE:path.join(out,'native-observation.json')};
function run(name,args,extraEnv,timeout){
 const result=spawnSync(process.execPath,args,{cwd:ROOT,env:extraEnv,encoding:'utf8',timeout,maxBuffer:64*1024*1024});
 const log=(result.stdout||'')+(result.stderr||'');fs.writeFileSync(path.join(out,name+'.tap.log'),log);
 const value={exit:result.status,signal:result.signal,error:result.error?{name:result.error.name,code:result.error.code,message:result.error.message}:null,tap:tapSummary(log)};
 json(name+'-raw.json',value);console.log(name,JSON.stringify({exit:value.exit,summary:value.tap.summary,error:value.error}));return value;
}
const fixed=run('native-fixed',['--require',path.join(__dirname,'observe-fixed.cjs'),'--test','--test-reporter=tap',FIXTURE],env,180000);
const observation=fs.existsSync(env.F1_OBSERVATION_FILE)?JSON.parse(fs.readFileSync(env.F1_OBSERVATION_FILE)):null;
const native=minimal({engine,observation,rawExit:fixed.exit,tap:fixed.tap});json('native-classification.json',native);
const original=prepareOriginal();json('unwrapped-source.json',{...original,file:path.relative(ROOT,original.file),source:undefined});
fs.writeFileSync(path.join(out,'unwrapped-original4.cjs'),original.source);
let raw;
try{
 const plain={...process.env};delete plain.NODE_OPTIONS;delete plain.QA_DIAGNOSTIC_DIR;delete plain.F1_OBSERVATION_FILE;
 raw=run('unwrapped-original4',['--test','--test-reporter=tap',original.file],plain,360000);
}finally{fs.unlinkSync(original.file)}
const unwrapped=originalFour({engine,rawExit:raw.exit,tap:raw.tap});json('unwrapped-classification.json',unwrapped);
let existing=null;
if(engine==='new'){
 const result=run('existing-eleven',['--test','--test-concurrency=1','--test-reporter=tap','qa/east-passage/tests/webkit-media-reload.test.cjs','qa/east-passage/tests/webkit-smoke.test.cjs'],{...process.env,QA_DIAGNOSTIC_DIR:path.join(out,'existing-eleven-diagnostics')},720000);
 existing={rawExit:result.exit,summary:result.tap.summary};
}
const accepted=engine==='old'?native.verdict==='EXPECTED_OLD_ENGINE_STALL'&&unwrapped.verdict==='EXPECTED_OLD_UNWRAPPED_RELOAD_FAILURES':native.verdict==='PASS_NEW_ENGINE'&&unwrapped.verdict==='PASS_NEW_UNWRAPPED_FOUR'&&existing?.rawExit===0&&existing.summary.tests===11&&existing.summary.pass===11&&existing.summary.skipped===0;
const result={identity,engine,native,unwrapped,existing,comparisonEvidenceAccepted:accepted,
 classificationMeaning:engine==='old'?'Evidence gate only: native raw FAIL and original raw 2/4 remain failures. No normal browser-test PASS is claimed.':'New engine must pass fixed native, unwrapped original 4, and unchanged existing 11.',
 httpComparison:'NOT_RUN: README claim restricted to current synthetic HTTPS evidence'};
json('result.json',result);console.log(JSON.stringify(result,null,2));
json('hashes.json',Object.fromEntries(fs.readdirSync(out).filter(x=>fs.statSync(path.join(out,x)).isFile()).map(x=>[x,sha(fs.readFileSync(path.join(out,x)))])));
if(!accepted)process.exitCode=1;
