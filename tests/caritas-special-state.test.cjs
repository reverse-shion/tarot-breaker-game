const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../caritas-special-state.js'),C=require('../caritas-battle-core.js');
const ready=()=>S.create({...C.newGame(),phase:'finisher',resonance:100,dark:42},'run-1');
const walk=(r,to)=>{while(r.special.phase!==to)r=S.transition(r,S.PHASES[S.PHASES.indexOf(r.special.phase)+1]);return r;};
test('all three choices preserve A meters, apply B once, and retain DONE',()=>{
 for(const c of C.CARDS){
  const r=ready(),a=S.commit(r,c.id,'short');assert.equal(a.special.playbackMode,'normal');
  assert.equal(a.battle.dark,42);assert.equal(a.battle.phase,'finisher');assert.equal(a.battle.used,false);assert.equal(r.special.committed,false);
  assert.throws(()=>S.commit(a,c.id));assert.throws(()=>S.transition(a,'CARITAS_REPLY'));
  for(const phase of S.PHASES){
   const n=walk(a,phase);assert.deepEqual(S.migrate(JSON.parse(JSON.stringify(n))),n);
   assert.equal(n.battle.dark,S.PHASES.indexOf(phase)<5?42:0);
   assert.equal(n.special.resolutionApplied,S.PHASES.indexOf(phase)>=5);
  }
  const b=walk(a,'CARITAS_REPLY');assert.throws(()=>S.transition(b,'CARITAS_REPLY'));
  const d=walk(b,'DONE');assert.equal(d.battle.phase,'complete');assert.equal(d.completedRunId,'run-1');assert.equal(d.mapCompleted,true);
 }
});
test('history and short mode require successful art boundary',()=>{
 const a=walk(S.commit(ready(),C.CARDS[0].id),'ART_PLAYBACK');
 assert.deepEqual(S.transition(a,'PURIFICATION').seenTechniques,{});
 const good=S.transition(a,'PURIFICATION',{imageDisplayed:true});assert.equal(good.seenTechniques[C.CARDS[0].id],true);
 const r=ready();r.seenTechniques=good.seenTechniques;assert.equal(S.commit(r,C.CARDS[0].id,'short').special.playbackMode,'short');
});
test('v14 read/finisher/ending migration preserves values, receipts and allowance',()=>{
 for(const phase of ['read','finisher','ending','defeat']){
  const battle=phase==='ending'?C.finish({...C.newGame(),phase:'finisher',resonance:100},'skill'):{...C.newGame(),phase,resonance:phase==='finisher'?100:0};const r=S.migrate({version:14,battle,firstWrittenDelivered:true,aiConfirmedCalls:2},'migration');
  assert.deepEqual(r.battle,battle);assert.equal(r.special.phase,'NONE');assert.equal(r.firstWrittenDelivered,true);assert.equal(r.aiCalls,2);
 }
});
test('malformed and contradictory records fail closed without touching input',()=>{
 for(const edit of [r=>delete r.special,r=>r.special.committed=false,r=>r.battle.used=true,r=>r.battle.dark=0,r=>r.special.resolutionApplied=true,r=>r.special.commitId='other']){
  const r=S.commit(ready(),C.CARDS[0].id);edit(r);assert.throws(()=>S.validate(r));
 }
 assert.throws(()=>S.migrate({version:13}));assert.throws(()=>S.migrate({version:14,battle:{}}));
});
test('quota and stale-tab writes cannot advance input; each transition is a single record write',()=>{
 let raw=null,writes=0,fail=true;const storage={getItem:()=>raw,setItem:(k,v)=>{if(fail)throw Error('quota');writes++;raw=v;}};
 const r=ready(),a=S.commit(r,C.CARDS[0].id);
 assert.throws(()=>S.write(storage,'k',null,a));assert.equal(r.special.phase,'NONE');assert.equal(raw,null);
 fail=false;const saved=S.write(storage,'k',null,a);assert.equal(writes,1);assert.equal(saved.record.revision,1);
 assert.throws(()=>S.write(storage,'k',null,r),/revision-conflict/);assert.equal(writes,1);
 const p=walk(saved.record,'PURIFICATION');const b=S.write(storage,'k',saved.raw,S.transition(p,'CARITAS_REPLY'));
 assert.equal(writes,2);assert.equal(b.record.battle.dark,0);assert.equal(b.record.special.resolutionApplied,true);
});

test('missing battle and orphan complete/used records cannot silently restart',()=>{
 for(const edit of [r=>delete r.battle,r=>r.battle.phase='complete',r=>r.battle.used=true]){const r=ready();edit(r);assert.throws(()=>S.validate(r));}
});

test('invalid null receipts, incomplete canonical cards and malformed history are rejected',()=>{
 for(const edit of [r=>r.battle=false,r=>r.battle=0,r=>r.battle='',r=>delete r.battle.cards[0].name,r=>r.battle.cards[0].words=[],r=>r.seenTechniques.unknown=true,r=>r.seenTechniques['18-the-moon']='true',r=>delete r.battle.step]){const r=ready();edit(r);assert.throws(()=>S.validate(r));}
});
