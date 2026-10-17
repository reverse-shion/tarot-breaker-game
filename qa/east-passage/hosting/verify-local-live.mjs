/** Read-only live Codespaces local-port proof. No storage, token or hosted-origin activation. */
import {readFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {FILES} from './verify-host.mjs';

function sha256(bytes){return createHash('sha256').update(bytes).digest('hex')}
export async function checkLocalPort(port,{root=process.cwd(),fetcher=fetch,files=FILES}={}){
  if(!Number.isSafeInteger(port)||port<1024||port>65535)throw Error('invalid loopback port');
  const origin='http://127.0.0.1:'+port;
  const result={port,checked:files.length,matched:0,verdict:'STOP',failures:[]};
  const source=await readFile(join(resolve(root),'qa/east-passage/approved-origin.js'),'utf8');
  if(!/TarotEastPassageQAApprovedOrigin\s*=\s*""\s*;/.test(source)){
    result.failures.push({file:'qa/east-passage/approved-origin.js',reason:'committed safety lock not empty'});
    return result;
  }
  for(const file of files){
    if(!/^[a-zA-Z0-9_./-]+$/.test(file)||file.startsWith('/')||file.split('/').includes('..')){
      result.failures.push({file,reason:'invalid verification path'});continue;
    }
    try{
      const expected=await readFile(join(resolve(root),file));
      const response=await fetcher(origin+'/'+file,{
        redirect:'manual',signal:AbortSignal.timeout(10000),
        headers:{'cache-control':'no-cache'},
      });
      if(response.status!==200||!response.url||new URL(response.url).origin!==origin){
        throw Error('HTTP status or redirect mismatch: '+response.status);
      }
      const received=Buffer.from(await response.arrayBuffer());
      if(sha256(expected)!==sha256(received))throw Error('SHA256 mismatch');
      result.matched+=1;
    }catch(error){result.failures.push({file,reason:String(error?.message||error)});}
  }
  result.verdict=result.failures.length===0&&result.matched===result.checked?'LOCAL_BYTES_MATCH':'STOP';
  return result;
}

export async function checkBothPorts(opts={}){
  const results=[];
  for(const port of [8765,8766])results.push(await checkLocalPort(port,opts));
  return {verdict:results.every(r=>r.verdict==='LOCAL_BYTES_MATCH')?'LOCAL_BYTES_MATCH':'STOP',
    results,note:'Codespaces loopback byte check only. External private HTTPS access and iPhone scenario gates remain distinct.'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  checkBothPorts().then(report=>{
    for(const r of report.results){
      console.log('PORT '+r.port+': '+r.verdict+' '+r.matched+'/'+r.checked);
      for(const f of r.failures)console.error('STOP '+r.port+'/'+f.file+': '+f.reason);
    }
    console.log('FINAL='+report.verdict);
    if(report.verdict!=='LOCAL_BYTES_MATCH')process.exitCode=1;
  }).catch(error=>{console.error('STOP: '+error.message);process.exitCode=1});
}