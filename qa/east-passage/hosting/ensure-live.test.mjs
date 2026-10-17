import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  probeLockedPort,ensureLockedServers,spawnLockedServer,
} from './ensure-live.mjs';

test('already ready ports are reused, no extra servers spawned',async()=>{
  let starts=0;
  const state=await ensureLockedServers({
    prober:async()=> 'LOCKED_READY',
    starter:()=>{starts+=1;return {logPath:'not used'};},
    ports:[8765,8766],
  });
  assert.deepEqual(state.map(x=>x.action),['ALREADY_READY','ALREADY_READY']);
  assert.equal(starts,0);
});

test('down ports restart only the two QA servers in locked mode',async()=>{
  const calls=new Map(),started=[];
  const state=await ensureLockedServers({
    prober:async port=>{
      const n=(calls.get(port)||0)+1;calls.set(port,n);
      return n===1?'UNAVAILABLE':'LOCKED_READY';
    },
    starter:port=>{started.push(port);return {logPath:'fixture'};},
    sleep:async()=>{},
    ports:[8765,8766],
  });
  assert.deepEqual(started,[8765,8766]);
  assert.deepEqual(state.map(x=>x.action),['RESTARTED','RESTARTED']);
});

test('wrong server on an occupied port fails closed before starting anything',async()=>{
  let starts=0;
  await assert.rejects(ensureLockedServers({
    prober:async()=> 'UNEXPECTED_SERVER',
    starter:()=>{starts++;},
    ports:[8765],
  }),/STOP: port 8765/);
  assert.equal(starts,0);
});

test('timeout does not silently PASS or approve QA storage',async()=>{
  await assert.rejects(ensureLockedServers({
    prober:async()=> 'UNAVAILABLE',
    starter:()=>({logPath:'test'}),
    sleep:async()=>{},
    attempts:2,ports:[8766],
  }),/failed to start/);
});

test('probe validates exact locked approval bytes, wrong content is unsafe',async()=>{
  const expected=await readFile('qa/east-passage/approved-origin.js');
  const url='http://127.0.0.1:8765/qa/east-passage/approved-origin.js';
  const ok=async()=>({status:200,url,arrayBuffer:async()=>expected});
  assert.equal(await probeLockedPort(8765,{fetcher:ok,expected}),'LOCKED_READY');
  const bad=async()=>({status:200,url,arrayBuffer:async()=>Buffer.from('enabled')});
  assert.equal(await probeLockedPort(8765,{fetcher:bad,expected}),'UNEXPECTED_SERVER');
  const redirected=async()=>({status:302,url,arrayBuffer:async()=>expected});
  assert.equal(await probeLockedPort(8765,{fetcher:redirected,expected}),'UNEXPECTED_SERVER');
  const connectionError=async()=>{throw new TypeError('fetch failed')};
  assert.equal(await probeLockedPort(8765,{fetcher:connectionError,expected}),'UNAVAILABLE');
});

test('only the intended QA ports can be spawned',()=>{
  assert.throws(()=>spawnLockedServer(8767),/Not a QA port/);
});

