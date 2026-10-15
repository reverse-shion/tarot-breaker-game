'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const qa=require('../qa/east-passage/qa-safety.js');
const core=require('../progress.js');
const root=path.join(__dirname,'../qa/east-passage');
const safeOrigin='https://tarot-breaker-east-qa-154.pages.dev';
const existing=['https://raw.githack.com','https://reverse-shion.github.io'];
function store(){
 const m=new Map(),trace=[];
 return {m,trace,getItem(key){trace.push('read:'+key);return m.get(key)??null},
 setItem(key,val){trace.push('write:'+key);m.set(key,val)},
 removeItem(){throw Error('never permitted')},clear(){throw Error('never permitted')}};
}
test('all known production/preview origins and missing configuration fail closed before any storage I/O',()=>{
 for(const actual of [...existing,'https://github.com','https://someone.github.io','http://localhost:3000']){
  const storage=store();
  const attempt=qa.seed({actualOrigin:actual,approvedOrigin:actual,storage,core,kind:'legacy-completed'});
  assert.equal(attempt.ok,false,actual);
  assert.deepEqual(storage.trace,[],actual);
 }
 for(const approvedOrigin of ['',undefined,'not a url',
  'https://tarot-breaker-east-qa-154.pages.dev/path',
  'https://tarot-breaker-east-qa-154.pages.dev/?a=1',
  'https://raw.githack.com']){
  const storage=store(),attempt=qa.seed({
    actualOrigin:safeOrigin,approvedOrigin,storage,core,kind:'legacy-completed'});
  assert.equal(attempt.ok,false);
  assert.deepEqual(storage.trace,[]);
 }
 const denied=store();
 assert.equal(qa.seed({actualOrigin:'https://other-qa.pages.dev',approvedOrigin:safeOrigin,
  storage:denied,core,kind:'pending-aftermath'}).ok,false);
 assert.deepEqual(denied.trace,[]);
});
test('both synthetic fixtures match the actual current strict Progress schema',()=>{
 const pending=qa.fixture('pending-aftermath'),legacy=qa.fixture('legacy-completed');
 for(const f of [pending,legacy]){
  assert.equal(core.validateRecord(f).ok,true);
  assert.deepEqual(f.checkpoint,{mapId:'star_gate_garden',spawnId:'south_gate'});
  assert.equal(f.companion,'joined_with_shion');
  assert.equal(f.completedEvents.includes('garden_star_sand_route_known'),false);
 }
 assert.equal(pending.completedEvents.includes('garden_star_gate_anomaly'),false);
 assert.equal(legacy.completedEvents.includes('garden_star_gate_anomaly'),true);
 assert.throws(()=>qa.fixture('corrupt-test'),/unknown-qa-fixture/);
});
test('approved QA origin must start with empty storage and write exactly one complete v1 fixture',()=>{
 const storage=store();
 const args={actualOrigin:safeOrigin,approvedOrigin:safeOrigin,storage,core,kind:'legacy-completed'};
 const stage=qa.prepare(args);
 assert.equal(stage.ok,true);
 assert.deepEqual(storage.trace,[],'prepare never performs I/O');
 assert.equal(qa.seed(args).ok,true);
 assert.deepEqual(storage.trace,[
  'read:'+qa.PROGRESS_KEY,'write:'+qa.PROGRESS_KEY,'read:'+qa.PROGRESS_KEY]);
 const saved=JSON.parse(storage.m.get(core.STORAGE_KEY));
 assert.equal(core.validateRecord(saved).ok,true);
 assert.equal(saved.completedEvents.includes('garden_star_sand_route_known'),false);
 storage.trace.length=0;
 assert.deepEqual(qa.seed(args),{ok:false,reason:'existing-qa-progress-refuse-overwrite'});
 assert.deepEqual(storage.trace,['read:'+qa.PROGRESS_KEY]);
});
test('storage access denial and misleading write readback fail visibly with no unauthorized fallback',()=>{
 let readCount=0;
 const denied={getItem(){readCount++;throw Error('blocked')},setItem(){throw Error('blocked')}};
 const args={actualOrigin:safeOrigin,approvedOrigin:safeOrigin,storage:denied,core,kind:'pending-aftermath'};
 assert.deepEqual(qa.seed(args),{ok:false,reason:'qa-storage-write-unavailable'});
 assert.equal(readCount,1);
 let val=null;
 const liar={getItem(){return val},setItem(){/* deliberately no write */}};
 assert.deepEqual(qa.seed({...args,storage:liar}),{ok:false,reason:'qa-readback-mismatch'});
});
test('QA launcher refuses all storage writes on RawGitHack even when clicked and consent is forged',()=>{
 const markup=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const config=fs.readFileSync(path.join(root,'approved-origin.js'),'utf8');
 const launcher=fs.readFileSync(path.join(root,'launcher.js'),'utf8');
 assert.match(markup,/src="\.\/qa-safety\.js"/);
 assert.match(markup,/src="\.\/approved-origin\.js"/);
 assert.match(markup,/src="\.\/launcher\.js"/);
 assert.match(config,/TarotEastPassageQAApprovedOrigin\s*=\s*""/,'new QA launcher must be locked until independent origin is provisioned');
 assert.doesNotMatch(fs.readFileSync('index.html','utf8'),/qa\/east-passage\/launcher/);
 const ids=['status','origin','consent','start','fixture','message'];
 const nodes=Object.fromEntries(ids.map(id=>[id,{textContent:'',checked:true,disabled:false,value:'legacy-completed',listeners:{},
  addEventListener(type,fn){this.listeners[type]=fn;}}]));
 const localStorage={getItem(){throw Error('MUST NOT READ SAVE')},setItem(){throw Error('MUST NOT WRITE SAVE')}};
 const context={window:{TarotEastPassageQASafety:qa,TarotEastPassageQAApprovedOrigin:'',
  localStorage,TarotProgressCore:core},location:{origin:'https://raw.githack.com',assign(){throw Error('MUST NOT NAVIGATE')}},
  document:{getElementById(id){return nodes[id]}}};
 vm.runInNewContext(launcher,context);
 assert.equal(nodes.start.disabled,true);
 nodes.start.listeners.click();
 assert.equal(nodes.message.textContent,'');
 assert.match(nodes.status.textContent,/安全ロック/);
});
