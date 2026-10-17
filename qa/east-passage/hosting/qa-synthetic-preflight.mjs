/** Non-mutating QA synthetic-save release preflight. Never unlocks origins or writes browser storage. */
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {privateCodespaceOrigins,verifyPrivateCodespace} from './verify-private-https.mjs';
import {FILES} from './verify-host.mjs';
import {checkBothPorts} from './verify-local-live.mjs';

const require=createRequire(import.meta.url);
const safety=require('../qa-safety.js');
const progress=require('../../../progress.js');
const passage=require('../../../garden-east-passage.js');
export const FIXTURE_PORTS=Object.freeze({
  8765:'pending-aftermath',
  8766:'legacy-completed',
});
const KEY=progress.STORAGE_KEY;
const assert=(ok,message)=>{if(!ok)throw Error('STOP: '+message)};

function fakeStorage(value=null){
  let saved=value;
  let writes=0;
  return {
    getItem(key){assert(key===KEY,'wrong progress key');return saved;},
    setItem(key,record){assert(key===KEY,'wrong progress key');writes+=1;saved=record;},
    get saved(){return saved;},
    get writes(){return writes;},
  };
}

/** Validate actual progress schema and refuse a fixture/port swap; test memory only. */
export function verifyFixtureMapping(codespaceName){
  const origins=privateCodespaceOrigins(codespaceName);
  const checks=[];
  for(const {port,origin} of origins){
    const kind=FIXTURE_PORTS[port];
    assert(kind,'unexpected QA port');
    const empty=fakeStorage();
    const result=safety.prepare({
      actualOrigin:origin,approvedOrigin:origin,storage:empty,core:progress,kind,
    });
    assert(result.ok,'invalid '+kind+' fixture: '+result.reason);
    const decoded=JSON.parse(result.record);
    assert(decoded.checkpoint.mapId==='star_gate_garden','wrong checkpoint');
    assert(decoded.completedEvents.includes('garden_lumiere_gate'),'missing common prerequisites');
    assert(!decoded.completedEvents.includes('garden_star_sand_route_known'),'route knowledge prematurely granted');
    assert(decoded.completedEvents.includes('garden_star_gate_anomaly')===(port===8766),'anomaly scenario is on wrong port');
    assert(passage.routeKnown(fakeStorage(result.record))===false,'B-line must start BLOCKED in both synthetic cases');
    assert(empty.writes===0,'dry-run fixture validation wrote storage');

    // An incorrect Codespaces port origin must not be able to use this origin's approval.
    const other=origins.find(entry=>entry.port!==port).origin;
    const incorrect=safety.seed({
      actualOrigin:other,approvedOrigin:origin,storage:empty,core:progress,kind,
    });
    assert(incorrect.ok===false && empty.writes===0,'cross-origin seed was possible');

    const marked=fakeStorage('EXISTING-SAVE-MARKER');
    const refused=safety.seed({
      actualOrigin:origin,approvedOrigin:origin,storage:marked,core:progress,kind,
    });
    assert(refused.ok===false && refused.reason==='existing-qa-progress-refuse-overwrite' &&
      marked.saved==='EXISTING-SAVE-MARKER'&&marked.writes===0,
      'existing save overwrite was not refused');

    checks.push({port,fixture:kind,checks:'VALIDATED',browserSaveWrites:0});
  }
  return checks;
}

export async function preflight({
  codespaceName=process.env.CODESPACE_NAME,
  approvedHead=process.env.QA_APPROVED_HEAD,
  privateVerifier=verifyPrivateCodespace,
  localVerifier=checkBothPorts,
  branchVerifier=verifyLocalGit,
  guardVerifier=verifyLockedSource,
}={}){
  branchVerifier({approvedHead});
  await guardVerifier();
  const fixtures=verifyFixtureMapping(codespaceName);
  const local=await localVerifier();
  assert(local.verdict==='LOCAL_BYTES_MATCH' &&
    local.results?.length===2 && local.results.every(r=>r.matched===15 && r.checked===15 && r.verdict==='LOCAL_BYTES_MATCH'),
    'local selected file bytes not verified for both ports');
  const remote=await privateVerifier({name:codespaceName});
  assert(remote.verdict==='PRIVATE_HTTPS_BYTES_MATCH' &&
    remote.reports?.length===2 && remote.reports.every(r=>r.matched===15&&r.total===15&&r.verdict==='CORE_BYTES_MATCH'),
    'private HTTPS selected file bytes not verified for both ports');
  return {verdict:'READ_ONLY_PREFLIGHT_PASS',fixtures,
    committedOrigin:'LOCKED',browserStorage:'NOT_READ; MUST BE CHECKED ON ACTUAL SAFARI BEFORE CONSENT',
    next:'INDEPENDENT_REVIEW_REQUIRED; NO QA SEED PERMITTED'};
}

export function verifyLocalGit({root=process.cwd(),approvedHead=process.env.QA_APPROVED_HEAD}={}){
  assert(typeof approvedHead==='string' && /^[0-9a-f]{40}$/.test(approvedHead),'explicit audited QA_APPROVED_HEAD required');
  const directory=resolve(root);
  const head=execFileSync('git',['rev-parse','HEAD'],{cwd:directory,encoding:'utf8'}).trim();
  assert(head===approvedHead,'HEAD differs from externally approved audited HEAD');
  const branch=execFileSync('git',['branch','--show-current'],{cwd:directory,encoding:'utf8'}).trim();
  assert(branch==='qa/east-passage-device-host-v1','wrong active Git branch');
  const changes=execFileSync('git',['status','--porcelain'],{cwd:directory,encoding:'utf8'}).trim();
  assert(changes==='','uncommitted or untracked files present; will not proceed');
  for(const file of FILES){
    const expected=execFileSync('git',['rev-parse',`HEAD:${file}`],{cwd:directory,encoding:'utf8'}).trim();
    const actual=execFileSync('git',['hash-object','--',file],{cwd:directory,encoding:'utf8'}).trim();
    assert(actual===expected,'selected source file differs from HEAD: '+file);
  }
  return {head,branch};
}
export async function verifyLockedSource({root=process.cwd()}={}){
  const source=await readFile(resolve(root,'qa/east-passage/approved-origin.js'),'utf8');
  assert(/TarotEastPassageQAApprovedOrigin\s*=\s*""\s*;/.test(source),'tracked approval is not locked');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(process.argv.length!==2){
    console.error('STOP: this is READ-ONLY. No --activate, --approve or --seed option exists.');
    process.exitCode=2;
  }else preflight().then(result=>{
    for(const f of result.fixtures)console.log('QA '+f.port+': '+f.fixture+' SAFE_DRY_RUN');
    console.log('LIVE LOCAL+PRIVATE HTTPS BYTES=15/15 EACH');
    console.log('BROWSER_SAVE_STATE=UNVERIFIED; NO BROWSER DATA TOUCHED');
    console.log('FINAL='+result.verdict);
    console.log(result.next);
  }).catch(error=>{
    console.error(String(error?.message||error));
    process.exitCode=1;
  });
}