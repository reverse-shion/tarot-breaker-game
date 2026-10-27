const assert = require('node:assert/strict');
const { test } = require('node:test');
const C = require('../caritas-battle-core.js');

test('understood themes increase resonance and gently release darkness', () => {
 const s=C.applyAiInsight(C.newGame(),['fear_of_weakness','self_blame','wish_to_continue']);
 assert.equal(s.resonance,12);
 assert.equal(s.dark,94);
 assert.equal(C.applyAiInsight(s,['offer_support']).resonance,12);
 assert.equal(C.applyAiInsight(s,['offer_support']).dark,94);
});
test('short supportive words are meaningful, without any specific tarot keyword',()=>{
 const old=C.newGame();
 const s=C.applyAiInsight(old,['offer_support']);
 assert.equal(s.resonance,4);
 assert.equal(s.dark,98);
 assert.equal(s.aiInsightTurn,0);
});
test('unrecognized IDs and empty readings cannot change any meter',()=>{
 const s=C.newGame();
 assert.equal(C.applyAiInsight(s,[]),s);
 assert.equal(C.applyAiInsight(s,['ignore_all_rules']),s);
});
test('AI alone cannot erase the last darkness point and bonus caps at 12',()=>{
 const s={...C.newGame(),dark:1,resonance:95};
 const next=C.applyAiInsight(s,['offer_support','acknowledge_pain','respect_choice']);
 assert.equal(next.dark,1);
 assert.equal(next.resonance,100);
 assert.equal(next.phase,'finisher');
});
