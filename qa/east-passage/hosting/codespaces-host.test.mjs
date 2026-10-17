import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {makeHandler} from './codespaces-host.mjs';

const root=process.cwd();
async function probe(path,method='GET',origin=''){
  const server=createServer(makeHandler({root,approvedOrigin:origin}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const response=await fetch('http://127.0.0.1:'+server.address().port+path,{method,redirect:'manual'});
    return {status:response.status,body:await response.text(),headers:response.headers};
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