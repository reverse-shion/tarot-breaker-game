/** GitHub Codespaces private forwarded HTTPS read-only exact-byte gate (never saves). */
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {verifyHost} from './verify-host.mjs';

const NAME=/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
export function privateCodespaceOrigins(name) {
  if(typeof name!=='string'||name.length>120||!NAME.test(name))
    throw new Error('STOP: invalid or missing CODESPACE_NAME');
  return [8765,8766].map(port=>({
    port,origin:'https://'+name+'-'+port+'.app.github.dev'
  }));
}

export async function verifyPrivateCodespace({name=process.env.CODESPACE_NAME,
  token=process.env.GITHUB_TOKEN,verifier=verifyHost}={}) {
  const origins=privateCodespaceOrigins(name);
  if(typeof token!=='string'||!token.trim())
    throw new Error('STOP: GITHUB_TOKEN not present for private HTTPS gate');
  const reports=[];
  for(const {port,origin} of origins){
    const report=await verifier(origin,{enabled:false,githubToken:token});
    reports.push({port,verdict:report.verdict,matched:report.matched,
      total:report.count,failures:report.failures.map(f=>({file:f.filename,reason:f.reason}))});
  }
  return {verdict:reports.every(r=>r.verdict==='CORE_BYTES_MATCH'&&r.matched===15)
    ? 'PRIVATE_HTTPS_BYTES_MATCH' : 'STOP',
    reports, note:'Only actual private forwarded HTTPS selected-byte check; no save seeding or iPhone gameplay acceptance.'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  verifyPrivateCodespace().then(result=>{
    for(const r of result.reports){
      console.log('PRIVATE HTTPS '+r.port+': '+r.verdict+' '+r.matched+'/'+r.total);
      for(const f of r.failures)console.error('STOP '+r.port+'/'+f.file+': '+f.reason);
    }
    console.log('FINAL='+result.verdict);
    if(result.verdict!=='PRIVATE_HTTPS_BYTES_MATCH')process.exitCode=1;
  }).catch(error=>{
    // Never log GITHUB_TOKEN or credentials; all URLs derived from validated Codespaces name.
    console.error('STOP: '+String(error?.message||error));
    process.exitCode=1;
  });
}