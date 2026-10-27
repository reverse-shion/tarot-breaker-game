const assert = require('node:assert/strict');
const { test } = require('node:test');
const C = require('../caritas-battle-core.js');
test('AI insight adds at most 12 resonance', () => {
 const s = C.applyAiInsight(C.newGame(), ['fear_of_weakness','self_blame','wish_to_continue']);
 assert.equal(s.resonance, 12);
 assert.equal(C.applyAiInsight(s, ['fear_of_weakness']).resonance, 12);
});
