import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {makeHandler,singleByteRange,assertPortBoundApproval} from './codespaces-host.mjs';
import {readFile} from 'node:fs/promises';

const root=process.cwd();
async function probe(path,method='GET',origin='',headers={}){
  const server=createServer(makeHandler({root,approvedOrigin:origin}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const response=await fetch('http://127.0.0.1:'+server.address().port+path,{method,redirect:'manual',headers});
    const bytes=Buffer.from(await response.arrayBuffer());
    return {status:response.status,body:bytes.toString('utf8'),bytes,headers:response.headers};
  }finally{await new Promise(resolve=>server.close(resolve));}
}
test('serves real game root with no redirection and no-store',async()=>{
  const res=await probe('/');assert.equal(res.status,200);
  assert.match(res.body,/<html/);assert.equal(res.headers.get('cache-control'),'no-store');
});
test('QA seeding is disabled without verified owner activation',async()=>{
  const res=await probe('/qa/east-passage/approved-origin.js');
  assert.equal(res.status,200);assert.match(res.body,/TarotEastPassageQAApprovedOrigin = "";/);
});
test('private internals and repository metadata are forbidden',async()=>{
  for(const path of ['/.git/config','/.github/workflows/validate.yml',
    '/qa/east-passage/hosting/codespaces-host.mjs',
    '/qa/east-passage/tests/webkit-smoke.test.cjs',
    '/%2e%2e%2f.git%2fconfig',
    '/docs/DEVICE_VERIFICATION_REGISTRY.md'])
    assert.notEqual((await probe(path)).status,200,path);
});
test('not an open writable HTTP service',async()=>{
  assert.equal((await probe('/', 'POST')).status,405);
});
test('only exact Github Codespaces port origins enable isolated QA declaration',async()=>{
  const allowed='https://demo-8765.app.github.dev';
  const res=await probe('/qa/east-passage/approved-origin.js','GET',allowed);
  assert.equal(res.status,200);assert.match(res.body,/demo-8765\.app\.github\.dev/);
  assert.doesNotMatch((await probe('/qa/east-passage/approved-origin.js')).body,/demo-8765\.app\.github\.dev/);
  assert.throws(()=>makeHandler({root,approvedOrigin:'https://reverse-shion.github.io'}));
  assert.throws(()=>makeHandler({root,approvedOrigin:'https://qa.example.net'}));
});
test('supports precise audio-compatible single ranges including Safari suffix, HEAD and 416',async()=>{
  const path='/assets/maps/star-country-gate-garden-transparent.webp';
  const original=await readFile(root+path);
  const total=original.length;
  assert.ok(total>1024);
  const full=await probe(path);
  assert.equal(full.status,200);
  assert.equal(full.headers.get('accept-ranges'),'bytes');
  assert.deepEqual(full.bytes,original);
  const early=await probe(path,'GET','',{'Range':'bytes=0-31'});
  assert.equal(early.status,206);
  assert.equal(early.headers.get('content-range'),`bytes 0-31/${total}`);
  assert.equal(early.headers.get('content-length'),'32');
  assert.deepEqual(early.bytes,original.subarray(0,32));
  const suffix=await probe(path,'GET','',{'Range':'bytes=-64'});
  assert.equal(suffix.status,206);
  assert.deepEqual(suffix.bytes,original.subarray(total-64));
  const openEnded=await probe(path,'GET','',{'Range':`bytes=${total-16}-`});
  assert.equal(openEnded.status,206);
  assert.deepEqual(openEnded.bytes,original.subarray(total-16));
  const head=await probe(path,'HEAD','',{'Range':'bytes=0-31'});
  assert.equal(head.status,206);
  assert.equal(head.bytes.length,0);
  assert.equal(head.headers.get('content-length'),'32');
  const invalid=await probe(path,'GET','',{'Range':`bytes=${total}-`});
  assert.equal(invalid.status,416);
  assert.equal(invalid.headers.get('content-range'),`bytes */${total}`);
  const multi=await probe(path,'GET','',{'Range':'bytes=0-1,6-7'});
  assert.equal(multi.status,416);
  const ifRange=await probe(path,'GET','',{'Range':'bytes=0-31','If-Range':'"stale"'});
  assert.equal(ifRange.status,200);
  assert.deepEqual(ifRange.bytes,original);
});
test('real game MP3 supports byte-range audio streaming for iPhone-oriented QA',async()=>{
  const path='/assets/audio/ambience/alenon-orb-resonance.mp3';
  const original=await readFile(root+path);
  assert.ok(original.length>128000,'expected actual audio media fixture');
  const audio=await probe(path,'GET','',{'Range':'bytes=0-1023'});
  assert.equal(audio.status,206);
  assert.equal(audio.headers.get('content-type'),'audio/mpeg');
  assert.equal(audio.headers.get('accept-ranges'),'bytes');
  assert.equal(audio.headers.get('content-range'),`bytes 0-1023/${original.length}`);
  assert.deepEqual(audio.bytes,original.subarray(0,1024));
  const late=await probe(path,'GET','',{'Range':`bytes=${original.length-128}-`});
  assert.equal(late.status,206);
  assert.deepEqual(late.bytes,original.subarray(original.length-128));
});
test('pure range accounting rejects malformed or unsafe offsets',()=>{
  assert.deepEqual(singleByteRange(undefined,100),{status:200,start:0,end:99});
  assert.deepEqual(singleByteRange('bytes=0-0',100),{status:206,start:0,end:0});
  assert.deepEqual(singleByteRange('bytes=99-',100),{status:206,start:99,end:99});
  for(const value of ['bytes=99-2','bytes=-0','bytes=','bytes=0-1,4-5','items=0-1','bytes=9999999999999999999999-'])
    assert.equal(singleByteRange(value,100).status,416,value);
});

test('QA activation origin bound to exact Codespace and selected port only',()=>{
  const name='curly-space-happiness-69xx76qrr6wjc55r4';
  const a='https://'+name+'-8765.app.github.dev';
  const b='https://'+name+'-8766.app.github.dev';
  assert.equal(assertPortBoundApproval({approved:a,port:8765,codespaceName:name}),a);
  assert.equal(assertPortBoundApproval({approved:b,port:8766,codespaceName:name}),b);
  assert.throws(()=>assertPortBoundApproval({approved:a,port:8766,codespaceName:name}));
  assert.throws(()=>assertPortBoundApproval({approved:b,port:8765,codespaceName:name}));
  assert.throws(()=>assertPortBoundApproval({approved:a,port:8765,codespaceName:'some-other-codespace'}));
  assert.throws(()=>assertPortBoundApproval({approved:a,port:8767,codespaceName:name}));
  assert.throws(()=>assertPortBoundApproval({approved:a,port:8765,codespaceName:''}));
  assert.throws(()=>makeHandler({qaPort:8765,approvedOrigin:b,codespaceName:name}));
  assert.doesNotThrow(()=>makeHandler({qaPort:8765,approvedOrigin:a,codespaceName:name}));
});
