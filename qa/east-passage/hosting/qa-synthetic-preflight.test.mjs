import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyFixtureMapping,preflight,verifyLockedSource} from './qa-synthetic-preflight.mjs';

test('8765 pending & 8766 legacy fixture schemas are valid and B-line stays blocked',()=>{
  const result=verifyFixtureMapping('curly-space-happiness-69xx76qrr6wjc55r4');
  assert.deepEqual(result.map(x=>[x.port,x.fixture,x.browserSaveWrites]),[
    [8765,'pending-aftermath',0],[8766,'legacy-completed',0],
  ]);
});
test('production domains, URLs and unvalidated hostnames cannot acquire synthetic fixtures',()=>{
  for(const name of ['reverse-shion.github.io','raw.githack.com','qa-a/../x','http://github.com',''])
    assert.throws(()=>verifyFixtureMapping(name));
});
test('checked-in QA origin remains intentionally empty',async()=>{
  await verifyLockedSource();
});
test('both local and private HTTPS gates must succeed, no saved data is read',async()=>{
  const calls=[];
  const result=await preflight({
    codespaceName:'fixture-qa',
    branchVerifier:()=>{calls.push('branch');},
    guardVerifier:async()=>{calls.push('guard');},
    localVerifier:async()=>({verdict:'LOCAL_BYTES_MATCH',
      results:[8765,8766].map(port=>({port,verdict:'LOCAL_BYTES_MATCH',matched:15,checked:15}))}),
    privateVerifier:async ({name})=>{
      calls.push(name);
      return {verdict:'PRIVATE_HTTPS_BYTES_MATCH',
        reports:[8765,8766].map(port=>({port,verdict:'CORE_BYTES_MATCH',matched:15,total:15}))};
    }
  });
  assert.equal(result.verdict,'READ_ONLY_PREFLIGHT_PASS');
  assert.equal(result.browserStorage.startsWith('NOT_READ'),true);
  assert.equal(result.committedOrigin,'LOCKED');
  assert.deepEqual(calls,['branch','guard','fixture-qa']);
});
test('a single failed gate rejects an otherwise plausible activation',async()=>{
  const base={
    codespaceName:'fixture-qa',
    branchVerifier:()=>{},guardVerifier:async()=>{},
    localVerifier:async()=>({verdict:'LOCAL_BYTES_MATCH',
      results:[8765,8766].map(port=>({port,verdict:'LOCAL_BYTES_MATCH',matched:15,checked:15}))}),
    privateVerifier:async()=>({verdict:'STOP',reports:[]}),
  };
  await assert.rejects(preflight(base),/private HTTPS selected file bytes/);
  await assert.rejects(preflight({...base,localVerifier:async()=>({verdict:'STOP',results:[]})}),
    /local selected file bytes/);
  await assert.rejects(preflight({...base,branchVerifier:()=>{throw Error('STOP: dirty checkout')}}),
    /dirty checkout/);
});
