import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {verifyHost,FILES} from './verify-host.mjs';
import {verifyLocalGit} from './qa-synthetic-preflight.mjs';
const require=createRequire(import.meta.url);
const safety=require('../qa-safety.js'),core=require('../../../progress.js'),passage=require('../../../garden-east-passage.js');

test('authenticated destinations rejected before any fetch; current ports allowed without redirects or token errors',async()=>{
 const previous=process.env.CODESPACE_NAME;
 process.env.CODESPACE_NAME='audit-space';
 try{
  for(const origin of ['https://example.org','https://other-space-8765.app.github.dev','https://audit-space-8767.app.github.dev','https://audit-space-8765.app.github.dev:444','https://audit-space-8765.app.github.dev/']){
   let calls=0;
   await assert.rejects(verifyHost(origin,{githubToken:'synthetic-secret',fetcher:async()=>{calls++;}}));
   assert.equal(calls,0);
  }
  for(const port of [8765,8766]){
   let calls=0;
   const origin=`https://audit-space-${port}.app.github.dev`;
   const report=await verifyHost(origin,{githubToken:'synthetic-secret',fetcher:async(url,init)=>{
    calls++;assert.equal(url.origin,origin);assert.equal(init.redirect,'manual');
    assert.equal(init.headers['X-Github-Token'],'synthetic-secret');
    return {status:200,url:url.href,arrayBuffer:async()=>readFileSync('.'+url.pathname)};
   }});
   assert.equal(report.verdict,'CORE_BYTES_MATCH');assert.equal(calls,15);
  }
  const destinations=[];
  const redirected=await verifyHost('https://audit-space-8765.app.github.dev',{githubToken:'synthetic-secret',fetcher:async(url,init)=>{
   destinations.push(url.origin);assert.equal(init.redirect,'manual');
   return {status:302,url:url.href,headers:new Headers({location:'https://example.org'})};
  }});
  assert.equal(redirected.verdict,'STOP');assert.equal(destinations.length,15);
  assert.ok(destinations.every(x=>x==='https://audit-space-8765.app.github.dev'));
  const leaked=await verifyHost('https://audit-space-8765.app.github.dev',{githubToken:'synthetic-secret',fetcher:async()=>{throw Error('synthetic-secret');}});
  assert.ok(!JSON.stringify(leaked).includes('synthetic-secret'));
  delete process.env.CODESPACE_NAME;
  await assert.rejects(verifyHost('https://audit-space-8765.app.github.dev',{githubToken:'synthetic-secret',fetcher:()=>assert.fail('no fetch')}));
 }finally{if(previous===undefined)delete process.env.CODESPACE_NAME;else process.env.CODESPACE_NAME=previous;}
});

test('port/fixture binding enforced by both prepare and direct seed, approval and overwrite guards preserved',()=>{
 for(const [port,kind,wrong] of [[8765,'pending-aftermath','legacy-completed'],[8766,'legacy-completed','pending-aftermath']]){
  const origin=`https://audit-space-${port}.app.github.dev`;
  let value=null,writes=0,reads=0;
  const storage={getItem(){reads++;return value;},setItem(k,v){writes++;value=v;}};
  const args={actualOrigin:origin,approvedOrigin:origin,kind,storage,core};
  assert.equal(safety.prepare(args).ok,true);assert.equal(reads,0);assert.equal(writes,0);
  for(const fn of [safety.prepare,safety.seed])assert.equal(fn({...args,kind:wrong}).reason,'fixture-port-mismatch');
  for(const approvedOrigin of ['',undefined,'https://other-space-8765.app.github.dev'])assert.equal(safety.seed({...args,approvedOrigin}).ok,false);
  assert.equal(reads,0);assert.equal(writes,0);
  assert.equal(safety.seed(args).ok,true);const saved=value;
  assert.equal(safety.seed(args).reason,'existing-qa-progress-refuse-overwrite');assert.equal(value,saved);assert.equal(writes,1);
 }
 for(const origin of ['https://example.org','https://audit-space-1234.app.github.dev','https://audit-space-8765.app.github.dev.evil.org']){
  for(const fn of [safety.prepare,safety.seed])assert.equal(fn({actualOrigin:origin,approvedOrigin:origin,kind:'pending-aftermath',storage:{getItem(){assert.fail('no storage');}},core}).ok,false);
 }
});

test('external audited HEAD required; old clean tree, dirty tree, wrong branch and hidden file mismatch STOP',()=>{
 const root=mkdtempSync(join(tmpdir(),'tarot-head-'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 try{
  git('init','-b','qa/east-passage-device-host-v1');git('config','user.name','QA Test');git('config','user.email','qa@example.invalid');
  for(const file of FILES){mkdirSync(dirname(join(root,file)),{recursive:true});writeFileSync(join(root,file),'fixture');}
  git('add','.');git('commit','-m','audited fixture');const approvedHead=git('rev-parse','HEAD');
  assert.equal(verifyLocalGit({root,approvedHead}).head,approvedHead);
  assert.throws(()=>verifyLocalGit({root,approvedHead:''}),/QA_APPROVED_HEAD/);
  writeFileSync(join(root,'new-file'),'new');git('add','.');git('commit','-m','new audit');const newer=git('rev-parse','HEAD');
  git('checkout','--detach',approvedHead);assert.throws(()=>verifyLocalGit({root,approvedHead:newer}),/HEAD differs/);
  // CI synthetic merge/detached checkouts cannot claim the PR-head device gate.
  assert.throws(()=>verifyLocalGit({root,approvedHead}),/wrong active Git branch/);
  git('checkout','qa/east-passage-device-host-v1');
  writeFileSync(join(root,'dirty'),'dirty');assert.throws(()=>verifyLocalGit({root,approvedHead:newer}),/uncommitted/);rmSync(join(root,'dirty'));
  git('update-index','--assume-unchanged','index.html');writeFileSync(join(root,'index.html'),'tampered');
  assert.throws(()=>verifyLocalGit({root,approvedHead:newer}),/source file differs/);
 }finally{rmSync(root,{recursive:true,force:true});}
});

// Real Continue adapters and real migration/Progress/route guard; only rendering is stubbed.
for(const mode of ['success','write-failure','readback-failure'])test('QA-B actual fixture Continue migration: '+mode,()=>{
 let bytes=JSON.stringify(safety.fixture('legacy-completed')),writes=0,reads=0;
 const original=bytes;
 const storage={getItem(){reads++;if(mode==='readback-failure'&&writes)throw Error('independent read denied');return bytes;},setItem(k,v){writes++;if(mode==='write-failure')throw Error('write denied');bytes=v;}};
 assert.equal(passage.routeKnown(storage),false);
 const handlers={},scene={owner:null,lumiereEnabled:true};
 const c={location:{search:'?entry=continue'},localStorage:storage,sessionStorage:storage,URLSearchParams,console:{warn(){}},
  addEventListener(n,f){(handlers[n]??=[]).push(f);},__TAROT_PUBLIC_STAR_GATE__:true,
  TarotJourney:{set(){},get:()=>({shioponDone:true,lumiereDone:true,joined:true})},
  TarotDialogue:{getState:()=>({shioponDone:true,lumiereDone:true,joined:true,active:false})},
  TarotAftermathScene:{getState:()=>scene,setLumiereDeparted(){scene.lumiereEnabled=false;}},
  TarotStarGateAnomaly:{restoreCompletedGate:()=>true},TarotCinematicCamera:{getState:()=>({owned:false})}};
 c.window=c;vm.createContext(c);
 for(const file of ['route-registry.js','progress.js','progress-resume.js','public-continue.js','garden-resume.js','garden-public-continue.js'])vm.runInContext(readFileSync(file,'utf8'),c,{filename:file});
 c.TarotGardenContinueTransit=c.TarotGardenPublicContinue.receive({search:c.location.search,storage});assert.equal(c.TarotGardenContinueTransit.ok,true);
 vm.runInContext(readFileSync('garden-progress-observer.js','utf8'),c);
 const fresh=c.TarotGardenPublicContinue.revalidate(c.TarotGardenContinueTransit,{search:c.location.search,storage});assert.equal(fresh.ok,true);
 c.TarotGardenContinueTransit=fresh;assert.equal(c.TarotStarGateProgressAuthority.rebind(fresh.progress),true);
 vm.runInContext(readFileSync('star-gate-public.js','utf8'),c);
 assert.equal(JSON.parse(bytes).completedEvents.includes(passage.KNOWLEDGE_EVENT),false);assert.equal(writes,0);
 const before=reads;assert.equal(c.TarotStarGatePublic.restoreCompleted(),true);assert.equal(writes,1);assert.ok(reads>before);
 assert.equal(passage.routeKnown(storage),mode==='success');
 if(mode==='success'){
  const readback=core.createProgress({storage}).load();assert.equal(readback.status,'valid');assert.ok(readback.state.completedEvents.includes(passage.KNOWLEDGE_EVENT));
 }else if(mode==='write-failure'){assert.equal(bytes,original);}
 else{assert.equal(fresh.progress.getCurrentState().persisted,true);assert.equal(fresh.progress.isEventCompleted(passage.KNOWLEDGE_EVENT),true);}
});
