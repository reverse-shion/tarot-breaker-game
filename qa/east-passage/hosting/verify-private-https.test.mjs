import test from 'node:test';
import assert from 'node:assert/strict';
import {privateCodespaceOrigins,verifyPrivateCodespace} from './verify-private-https.mjs';

test('Codespace name yields two separate exact GitHub private forwarded origins',()=>{
  assert.deepEqual(privateCodespaceOrigins('curly-space-happiness-69xx76qrr6wjc55r4'),[
    {port:8765,origin:'https://curly-space-happiness-69xx76qrr6wjc55r4-8765.app.github.dev'},
    {port:8766,origin:'https://curly-space-happiness-69xx76qrr6wjc55r4-8766.app.github.dev'},
  ]);
});
test('does not allow arbitrary endpoints or URLs to receive GitHub credential',()=>{
  for(const name of ['', '../evil','evil.example.com','foo/','foo@bar','foo--bar','a\nb',null])
    assert.throws(()=>privateCodespaceOrigins(name));
});
test('without private token, verification fails before a remote request',async()=>{
  let called=false;
  await assert.rejects(verifyPrivateCodespace({name:'private-codespace-abc',token:'',
    verifier:async()=>{called=true;}}),/GITHUB_TOKEN/);
  assert.equal(called,false);
});
test('each private origin must pass all 15 files and no enabled storage',async()=>{
  const got=[];
  const result=await verifyPrivateCodespace({name:'private-codespace-abc',token:'not-a-real-token',
    verifier:async(url,options)=>{
      got.push({url,enabled:options.enabled,token:options.githubToken});
      return {verdict:'CORE_BYTES_MATCH',matched:15,count:15,failures:[]};
    }});
  assert.equal(result.verdict,'PRIVATE_HTTPS_BYTES_MATCH');
  assert.equal(got.length,2);
  assert.ok(got.every(g=>g.enabled===false&&g.token==='not-a-real-token'));
  assert.notEqual(got[0].url,got[1].url);
});
test('partial match or HTTP failures never become a PASS',async()=>{
  const result=await verifyPrivateCodespace({name:'private-codespace-abc',token:'dummy',
    verifier:async(url)=>{
      if(url.includes('-8765.'))return {verdict:'CORE_BYTES_MATCH',matched:15,count:15,failures:[]};
      return {verdict:'STOP',matched:0,count:15,failures:[{filename:'index.html',reason:'HTTP 302'}]};
    }});
  assert.equal(result.verdict,'STOP');
  assert.equal(result.reports[1].port,8766);
});
