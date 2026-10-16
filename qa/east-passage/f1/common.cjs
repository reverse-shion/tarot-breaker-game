'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const BASE='56a30d64958df19b9befd647e0c6ff3c4a856e31';
const ORIGINAL='30f1973a85d8ed46a481ab9bd07347da1d138009';
const ROOT=path.resolve(__dirname,'../../..');
const FIXTURE='qa/east-passage/tests/webkit-media-reload.test.cjs';
const HELPER='qa/east-passage/tests/reload-diagnostics.cjs';
const MP3='assets/audio/bgm/hoshi-no-kioku_toki-no-inori.mp3';
const SMOKE='qa/east-passage/tests/webkit-smoke.test.cjs';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function git(...args){return execFileSync('git',args,{cwd:ROOT,maxBuffer:16*1024*1024})}
function identities(){
 // Fail before testing unless the checked-out commit is the exact audited PR head.
 const expectedHead=process.env.F1_EXPECTED_HEAD;
 const executionHead=git('rev-parse','HEAD').toString().trim();
 if(!expectedHead||!/^[0-9a-f]{40}$/.test(expectedHead)||executionHead!==expectedHead)
  throw Error('F1 exact-head mismatch: expected '+String(expectedHead)+' but running '+executionHead);
 const files={};
 for(const file of [FIXTURE,HELPER,MP3,SMOKE]){
  const bytes=fs.readFileSync(path.join(ROOT,file));
  if(!bytes.equals(git('show',BASE+':'+file)))throw Error('Protected baseline bytes changed: '+file);
  files[file]={sha256:sha(bytes),gitBlob:git('rev-parse','HEAD:'+file).toString().trim(),bytes:bytes.length};
 }
 const source=fs.readFileSync(path.join(ROOT,FIXTURE),'utf8');
 const match=/body:`([^`]+)`/.exec(source);if(!match)throw Error('Fixed HTML literal not found');
 const html=match[1],script=/<script>([\s\S]*)<\/script>/.exec(html)?.[1];
 if(!script)throw Error('Fixed inline JavaScript not found');
 return {baseline:BASE,executionHead,expectedHead,node:process.version,platform:process.platform,arch:process.arch,
  files,htmlSHA256:sha(html),inlineJavaScriptSHA256:sha(script),
  observationHookSHA256:sha(fs.readFileSync(path.join(__dirname,'observe-fixed.cjs'))),
  actions:{runURL:process.env.GITHUB_RUN_ID?`https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`:null,attempt:process.env.GITHUB_RUN_ATTEMPT||null}};
}
function originalFour(){
 // Original PR156 test bytes, with the single caller adjustment required by
 // the independently-reading passage API on BASE. No diagnostic import/init,
 // media wrapper, Runtime Entry response injection, or assertion is added.
 let source=git('show',ORIGINAL+':'+SMOKE).toString();
 const anchor='const known=passage?.routeKnown(state);';
 if(source.split(anchor).length!==2)throw Error('Original-four API anchor changed');
 source=source.replace(anchor,'const known=passage?.routeKnown();');
 if(/reload-diagnostics|__qaLifecycle|HTMLMediaElement\.prototype|instrumentRuntime|addInitScript/.test(source))throw Error('Wrapper present in original four');
 const file=path.join(ROOT,'qa/east-passage/tests/f1-original4.generated.cjs');
 fs.writeFileSync(file,source);
 return {file,source,sourceCommit:ORIGINAL,sourceSHA256:sha(git('show',ORIGINAL+':'+SMOKE)),executionSHA256:sha(source),adaptation:'routeKnown(state) -> routeKnown() only',diagnosticWrappers:false};
}
module.exports={BASE,ROOT,FIXTURE,HELPER,MP3,sha,identities,originalFour};
