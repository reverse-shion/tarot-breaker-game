const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../caritas-battle-core.js');

test('first delivered personal reading earns 50, later deliveries earn 25, even without themes',()=>{
 const old=C.newGame();
 const first=C.applyWrittenReading(old,[],true);
 assert.equal(first.resonance,50);
 assert.equal(first.dark,100);
 assert.equal(first.hp,100);
 assert.equal(first.turn,0);
 assert.equal(first.aiInsightTurn,0);
 assert.deepEqual(first.lastWrittenReward,{bonus:50,requestedBonus:50,insight:0,firstDelivery:true});
 assert.equal(old.resonance,0,'the input state is immutable');
 const later=C.applyWrittenReading(old,[]);
 assert.equal(later.resonance,25);
 assert.deepEqual(later.lastWrittenReward,{bonus:25,requestedBonus:25,insight:0,firstDelivery:false});
});

test('fixed participation reward is equal regardless of recognized theme count',()=>{
 for(const ids of [[],['offer_support'],['offer_support','acknowledge_pain','respect_choice'],['unknown'],null]){
  const old=C.newGame();
  const expectedInsight=C.applyAiInsight(old,ids||[]);
  const rewarded=C.applyWrittenReading(old,ids);
  assert.equal(rewarded.lastWrittenReward.bonus,25);
  assert.equal(rewarded.lastWrittenReward.requestedBonus,25);
  assert.equal(rewarded.resonance,expectedInsight.resonance+25);
  assert.equal(rewarded.dark,expectedInsight.dark);
  assert.equal(rewarded.hp,old.hp);
 }
});

test('a successful delivery with zero themes cannot be repeated in the same turn',()=>{
 const delivered=C.applyWrittenReading(C.newGame(),[],true);
 assert.equal(C.applyWrittenReading(delivered,[],true),delivered);
 assert.equal(C.applyWrittenReading(delivered,['offer_support']),delivered);
 assert.equal(C.applyAiInsight(delivered,['offer_support']),delivered);
 const restored=JSON.parse(JSON.stringify(delivered));
 assert.equal(C.applyWrittenReading(restored,['offer_support'],true),restored);
});

test('an already consumed AI opportunity cannot also receive a second written reward',()=>{
 const consumed=C.applyAiInsight(C.newGame(),['offer_support']);
 assert.equal(C.applyWrittenReading(consumed,[],true),consumed);
});

test('fixed and insight rewards cap exactly at 100 and unlock the existing finisher',()=>{
 const base={...C.newGame(),resonance:90,dark:1};
 const result=C.applyWrittenReading(base,['offer_support']);
 assert.equal(result.resonance,100);
 assert.equal(result.dark,1,'writing never bypasses the remaining darkness/finisher');
 assert.equal(result.phase,'finisher');
 assert.equal(result.lastWrittenReward.insight,4);
 assert.equal(result.lastWrittenReward.bonus,6);
 assert.equal(result.lastWrittenReward.requestedBonus,25);
 assert.equal(C.canSkill(result),true);
 const fullInsight=C.applyWrittenReading({...base,resonance:98},['offer_support'],true);
 assert.equal(fullInsight.resonance,100);
 assert.equal(fullInsight.lastWrittenReward.bonus,0);
 assert.equal(fullInsight.lastWrittenReward.insight,2);
 assert.equal(fullInsight.aiInsightTurn,base.turn);
});

test('terminal phases cannot earn writing rewards or mutate meters',()=>{
 for(const phase of ['finisher','ending','defeat','complete']){
  const state={...C.newGame(),phase};
  assert.equal(C.applyWrittenReading(state,['offer_support'],true),state);
 }
});

test('next card-reading turn admits one further written delivery without altering choice math',()=>{
 const select=s=>['不安','忍耐','癒し'].reduce((v,w,i)=>C.select(v,i,w),s);
 const baseline=C.read(select(C.newGame()));
 assert.equal(baseline.resonance,27);
 assert.equal(baseline.dark,80);
 assert.equal(baseline.hp,91);
 const first=C.applyWrittenReading(C.newGame(),[],true);
 const chosen=select(first);
 const prediction=C.predict(chosen);
 assert.equal(prediction.resonance,27);
 assert.equal(prediction.dark,20);
 assert.equal(prediction.damage,9);
 const next=C.read(chosen);
 assert.equal(next.turn,1);
 assert.equal(next.resonance,77);
 const reward=C.applyWrittenReading(next,[]);
 assert.equal(reward.resonance,100);
 assert.equal(reward.lastWrittenReward.bonus,23);
 assert.equal(reward.aiInsightTurn,1);
 assert.equal(reward.hp,91,'the side-action grants no HP and takes no counterattack');
 assert.equal(reward.phase,'finisher');
});
