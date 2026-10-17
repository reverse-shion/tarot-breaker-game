import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {makeHandler} from './codespaces-host.mjs';
import {verifyHost} from './verify-host.mjs';

// Loopback-only reconstruction of private forwarded port; this is NOT real device evidence.
const ORIGIN='https://qa-fixture-8765.app.github.dev';
async function runFixture({approved,expectPass}){
  const server=createServer(makeHandler({approvedOrigin:approved?ORIGIN:''}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const local='http://127.0.0.1:'+server.address().port;
    const mockedFetch=async (url,init)=>{
      const remote=await fetch(local+url.pathname,{...init,headers:{'cache-control':'no-cache'}});
      return {status:remote.status,url:url.href,arrayBuffer:()=>remote.arrayBuffer()};
    };
    const report=await verifyHost(ORIGIN,{enabled:approved,fetcher:mockedFetch});
    assert.equal(report.count,15);
    assert.equal(report.verdict,'CORE_BYTES_MATCH');
    assert.equal(report.matched,15);
    assert.deepEqual(report.failures,[]);
    return report;
  }finally{await new Promise(resolve=>server.close(resolve))}
}
test('QA Codespaces locked state: real 15 static bytes match and approval is absent',async()=>{
  const report=await runFixture({approved:false});
  assert.equal(report.phase,'BOOTSTRAP_LOCKED');
});
test('QA Codespaces ephemeral approval: remote injected bytes match locked repository source',async()=>{
  const report=await runFixture({approved:true});
  assert.equal(report.phase,'APPROVED');
});
test('QA remote host that is not activated cannot masquerade as enabled',async()=>{
  const server=createServer(makeHandler({approvedOrigin:''}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const local='http://127.0.0.1:'+server.address().port;
    const mockedFetch=async(url,init)=>{
      const res=await fetch(local+url.pathname,init);
      return {status:res.status,url:url.href,arrayBuffer:()=>res.arrayBuffer()};
    };
    const report=await verifyHost(ORIGIN,{enabled:true,fetcher:mockedFetch});
    assert.equal(report.verdict,'STOP');
    assert.equal(report.failures.length,1);
    assert.equal(report.failures[0].filename,'qa/east-passage/approved-origin.js');
  }finally{await new Promise(resolve=>server.close(resolve))}
});
