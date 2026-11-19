'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Base=require('../caritas-battle-core.js');
const Core=require('../caritas-tactical-core.js')(Base);
const Saves=require('../caritas-special-state.js');

function choose(battle,words){
 return words.reduce((state,word,index)=>Core.select(state,index,word),battle);
}

test('the first mistaken approach is survivable but still costly',()=>{
 const reading=choose(Core.newGame(),['不安','勇気','癒し']);
 const effect=Core.predict(reading);
 assert.equal(effect.misread,true);
 assert.equal(effect.damage,18);
 const after=Core.read(reading);
 assert.equal(after.phase,'read');
 assert.equal(after.respectedRefusal,false);
});

test('delivered cards reset while the last reading and respect history remain',()=>{
 const reading=choose(Core.newGame(),['不安','忍耐','癒し']);
 const after=Core.read(reading);
 assert.deepEqual(after.words,[null,null,null]);
 assert.deepEqual(after.lastReading,['不安','忍耐','癒し']);
 assert.equal(after.respectedRefusal,true);
 assert.equal(Core.stateFor(after.dark),'storm');
 assert.doesNotThrow(()=>Saves.validate(Saves.create(after,'test-run')));
});

test('storm supports both steady and risky progress',()=>{
 const first=Core.read(choose(Core.newGame(),['不安','忍耐','癒し']));
 const support=Core.predict(choose(first,['秘密','忍耐','癒し']));
 const reach=Core.predict(choose(first,['秘密','勇気','癒し']));
 assert.ok(support.dark>0&&support.resonance>0);
 assert.ok(reach.dark>support.dark);
 assert.ok(reach.damage>support.damage);
});

test('respecting refusal changes the cost of a later approach',()=>{
 const first=Core.read(choose(Core.newGame(),['不安','忍耐','癒し']));
 const respected=Core.predict(choose(first,['秘密','勇気','癒し']));
 const disrespected=Core.predict(choose({...first,respectedRefusal:false},['秘密','勇気','癒し']));
 assert.ok(disrespected.damage>respected.damage);
});

test('each card position can change the result or reply',()=>{
 const first=Core.read(choose(Core.newGame(),['不安','忍耐','癒し']));
 const a=choose(first,['秘密','忍耐','癒し']);
 const b=choose(first,['無意識','忍耐','癒し']);
 const c=choose(first,['秘密','忍耐','希望']);
 assert.notEqual(Core.predict(a).dark,Core.predict(b).dark);
 assert.notEqual(Core.predict(a).damage,Core.predict(c).damage);
 assert.notEqual(Core.reaction(a,Core.predict(a)),Core.reaction(b,Core.predict(b)));
 assert.notEqual(Core.reaction(a,Core.predict(a)),Core.reaction(c,Core.predict(c)));
});

test('free writing allows a player to correct conservative classification',()=>{
 const state=Core.newGame(),phrase='近づかないけど、ここにいる';
 assert.equal(Core.fromText(state,phrase).words[1],'忍耐');
 assert.equal(Core.fromText(state,phrase,{approach:'reach'}).words[1],'勇気');
 assert.equal(Core.fromText(state,'一緒に進もう',{approach:'support'}).words[1],'忍耐');
});

test('patient play still reaches resonance release without a fixed courage solution',()=>{
 let state=Core.newGame();
 for(let turn=0;turn<20&&state.phase==='read';turn++){
  const mood=Core.stateFor(state.dark);
  const moon=mood==='closed'?'不安':mood==='storm'?'秘密':'無意識';
  state=Core.read(choose(state,[moon,'忍耐','願い']));
  assert.doesNotThrow(()=>Saves.validate(Saves.create(state,'test-run')));
 }
 assert.equal(state.phase,'finisher');
 assert.equal(state.resonance,100);
 assert.ok(state.dark<=25);
 assert.ok(state.hp>0);
});
