import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {makeHandler} from './codespaces-host.mjs';
import {checkLocalPort} from './verify-local-live.mjs';

test('live loopback mirror matches the same 15 actual source files without any save writes',async()=>{
  const server=createServer(makeHandler());
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const report=await checkLocalPort(server.address().port);
    assert.equal(report.checked,15);
    assert.equal(report.matched,15);
    assert.equal(report.verdict,'LOCAL_BYTES_MATCH');
    assert.deepEqual(report.failures,[]);
  }finally{await new Promise(resolve=>server.close(resolve));}
});

test('incorrect/missing file bytes STOP rather than returning a false PASS',async()=>{
  const server=createServer((req,res)=>{
    res.writeHead(200,{'content-type':'text/plain'});
    res.end('incorrect QA bytes');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const report=await checkLocalPort(server.address().port);
    assert.equal(report.verdict,'STOP');
    assert.equal(report.matched,0);
    assert.equal(report.failures.length,15);
  }finally{await new Promise(resolve=>server.close(resolve));}
});

test('loopback port is required, remote arbitrary port strings are rejected',async()=>{
  await assert.rejects(checkLocalPort('https://example.com'),/invalid loopback port/);
  await assert.rejects(checkLocalPort(-1),/invalid loopback port/);
});
