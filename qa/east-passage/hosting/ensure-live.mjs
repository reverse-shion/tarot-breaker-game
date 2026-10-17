/** QA-only self-recovery for temporarily stopped Codespaces ports. No save I/O. */
import {spawn,execFileSync} from 'node:child_process';
import {openSync,closeSync,constants} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {checkBothPorts} from './verify-local-live.mjs';

const PORTS=Object.freeze([8765,8766]);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const lockedPath='qa/east-passage/approved-origin.js';

/** Reports UNAVAILABLE only for connection/timeout failures, never for a wrong HTTP server. */
export async function probeLockedPort(port,{fetcher=fetch,expected}={}){
  if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local QA port');
  const url='http://127.0.0.1:'+port+'/'+lockedPath;
  try{
    const response=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(1800)});
    if(response.status!==200||new URL(response.url).origin!=='http://127.0.0.1:'+port)
      return 'UNEXPECTED_SERVER';
    const bytes=Buffer.from(await response.arrayBuffer());
    if(!Buffer.from(expected).equals(bytes))return 'UNEXPECTED_SERVER';
    return 'LOCKED_READY';
  }catch(error){
    if((error?.name==='TypeError' && /fetch failed/i.test(error.message)) ||
       error?.name==='TimeoutError'||error?.name==='AbortError')
      return 'UNAVAILABLE';
    throw error;
  }
}

/** Starts the exact local QA static handler without approving any synthetic save. */
export function spawnLockedServer(port,{root=process.cwd()}={}){
  if(!PORTS.includes(port))throw Error('Not a QA port');
  const folder=resolve(root);
  const logPath=join(tmpdir(),'tarot-breaker-codespaces-'+port+'.log');
  const fd=openSync(logPath,constants.O_WRONLY|constants.O_CREAT|constants.O_APPEND,0o600);
  const env={...process.env};
  // Do not inherit accidental approvals from the terminal.
  delete env.TAROT_QA_APPROVED_ORIGIN;
  let child;
  try{
    child=spawn(process.execPath,['qa/east-passage/hosting/codespaces-host.mjs',String(port)],{
      cwd:folder,detached:true,stdio:['ignore',fd,fd],env,
    });
  }finally{closeSync(fd)}
  child.unref();
  return {pid:child.pid,logPath};
}

export async function ensureLockedServers({root=process.cwd(),prober=probeLockedPort,starter=spawnLockedServer,
  sleep=wait,ports=PORTS,attempts=25}={}){
  const source=await readFile(join(resolve(root),lockedPath));
  if(!/TarotEastPassageQAApprovedOrigin\s*=\s*""\s*;/.test(source.toString('utf8')))
    throw Error('STOP: tracked QA approval must be empty; no startup');
  const state=[];
  for(const port of ports){
    let check=await prober(port,{expected:source});
    if(check==='UNEXPECTED_SERVER')throw Error('STOP: port '+port+' is not the exact LOCKED QA server');
    if(check==='UNAVAILABLE'){
      const started=starter(port,{root});
      state.push({port,action:'RESTARTED',logPath:started.logPath});
      for(let i=0;i<attempts;i++){
        await sleep(150);
        check=await prober(port,{expected:source});
        if(check==='LOCKED_READY')break;
        if(check==='UNEXPECTED_SERVER')throw Error('STOP: port '+port+' responded with unknown server');
      }
      if(check!=='LOCKED_READY')
        throw Error('STOP: port '+port+' failed to start; check local QA server log');
    }else if(check==='LOCKED_READY')state.push({port,action:'ALREADY_READY'});
    else throw Error('STOP: unknown QA server status');
  }
  return state;
}

export function assertQaBranch({root=process.cwd()}={}){
  const branch=execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim();
  if(branch!=='qa/east-passage-device-host-v1')throw Error('STOP: unexpected branch: '+branch);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    assertQaBranch();
    const states=await ensureLockedServers();
    for(const s of states)console.log('QA '+s.port+': '+s.action+'; seed=LOCKED');
    if(!process.argv.includes('--start-only')){
      const result=await checkBothPorts();
      for(const r of result.results){
        console.log('PORT '+r.port+': '+r.verdict+' '+r.matched+'/'+r.checked);
        for(const error of r.failures)
          console.error('STOP '+r.port+'/'+error.file+': '+error.reason);
      }
      console.log('FINAL='+result.verdict);
      if(result.verdict!=='LOCAL_BYTES_MATCH')process.exitCode=1;
    }
  }catch(error){
    console.error('STOP: '+String(error?.message||error));
    process.exitCode=1;
  }
}