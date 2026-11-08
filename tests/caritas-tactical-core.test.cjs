'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const Base=require('../caritas-battle-core.js'),C=require('../caritas-tactical-core.js')(Base),S=require('../caritas-special-state.js');
const action=(s,trigger,compass='不安',route='癒し')=>C.read({...s,words:[compass,trigger,route]});
test('tactical entry is opt-in and legacy core is not mutated',()=>{
 const src=fs.readFileSync(require.resolve('../caritas-tactical-core.js'),'utf8');
 for(const search of ['?dev=hoshisuna','?dev=hoshisuna&battle=tactical','?battle=tactical']){
  const window={CaritasBattleCore:Base};vm.runInNewContext(src,{window,location:{pathname:'/hoshisuna-main.html',search},URLSearchParams});
  assert.equal(window.CaritasBattleCore.RULES==='tactical-v1',search.includes('dev=hoshisuna&battle=tactical'));
 }
 assert.equal(Base.newGame().rules,undefined);assert.equal(C.newGame().rules,'tactical-v1');
 assert.deepEqual(C.optionsFor(C.CARDS[1]),['忍耐','勇気']);assert.equal(C.predict({...C.newGame(),words:['不安','自制','癒し']}),null);
});
test('visible state reverses the value of support and reach, with no universal safe farm',()=>{
 const initial=C.newGame(),safe=action(initial,'忍耐'),rash=action(initial,'勇気');
 assert.ok(safe.dark<rash.dark);assert.ok(safe.hp>rash.hp);
 const waiting=action(safe,'忍耐'),reach=action(safe,'勇気','秘密');
 assert.equal(waiting.dark,safe.dark);assert.equal(waiting.resonance,safe.resonance);
 assert.ok(reach.dark<safe.dark);assert.ok(reach.resonance>safe.resonance);
 let s=initial;for(let i=0;i<30&&s.phase==='read';i++)s=action(s,'忍耐');
 assert.equal(s.phase,'defeat');
});
test('two rejected reaches withdraw; one mistake can be recovered without a reset',()=>{
 const first=action(C.newGame(),'勇気');assert.equal(first.hp,50);assert.equal(first.resonance,0);
 assert.equal(action(first,'勇気').phase,'defeat');
 let s=action(first,'忍耐');s=action(s,'勇気','秘密');s=action(s,'勇気','無意識');
 assert.equal(s.phase,'finisher');assert.ok(s.hp>0);assert.ok(s.dark<=25);
});
test('three good readings open the special, resonance alone cannot skip darkness',()=>{
 let s=action(C.newGame(),'忍耐');s=action(s,'勇気','秘密');s=action(s,'勇気','無意識');
 assert.equal(s.turn,3);assert.equal(s.phase,'finisher');assert.equal(s.resonance,100);assert.ok(s.dark>0);
 assert.equal(C.canSkill({...s,dark:80}),false);
 const waiting={...C.newGame(),resonance:100,dark:70,words:['秘密','忍耐','願い']};
 assert.equal(C.read(waiting).phase,'read');
});
test('Moon focus and Star route have distinct observable effects',()=>{
 const start=C.newGame();
 const a=C.predict({...start,words:['不安','忍耐','癒し']}),b=C.predict({...start,words:['秘密','忍耐','癒し']});
 assert.ok(a.dark>b.dark);
 const hope=C.predict({...start,words:['不安','忍耐','希望']}),space=C.predict({...start,words:['不安','忍耐','願い']});
 assert.ok(hope.dark>a.dark);assert.ok(hope.damage>a.damage);assert.ok(space.resonance>a.resonance);
 assert.equal(C.observation({...start,dark:70}),C.observation({...start,dark:70,turn:10}));
});
test('writing and selection settle through the same deterministic action, not an input bonus',()=>{
 const initial=C.newGame(),selected=C.fromText(initial,'怖いなら、ここで待つよ');
 const next=C.read(selected);assert.equal(next.turn,1);assert.equal(next.lastEffect.approach,'support');
 assert.deepEqual(next,C.read({...initial,words:[...selected.words]}));
 assert.equal(next.lastWrittenReward,undefined);
 const repeated=C.read(C.fromText(next,'怖いなら、ここで待つよ'));
 assert.equal(repeated.resonance,next.resonance);assert.equal(repeated.dark,next.dark);assert.ok(repeated.hp<next.hp);
 let s=C.read(C.fromText(initial,'怖いなら、ここで待つよ'));
 s=C.read(C.fromText(s,'声が聞こえる。一緒に進もう'));
 s=C.read(C.fromText(s,'声が聞こえる。一緒に進もう'));
 assert.equal(s.phase,'finisher');assert.equal(s.turn,3);
 for(const text of ['進まないで','今は踏み出さなくていい','一緒に進もうとは言わない','意味はまだ分からない','今は手を取ってはいけない。距離を保とう。','手を取ってほしくないなら、待つよ。','今は手を取ってはならぬ','一緒に進もうと思うな'])
  assert.equal(C.fromText(initial,text).words[1],'忍耐',text);
});
test('all three existing special transactions accept tactical saves and resolve only once',()=>{
 let s=action(C.newGame(),'忍耐');s=action(s,'勇気','秘密');s=action(s,'勇気','無意識');
 for(const card of C.CARDS){let r=S.commit(S.create(s,'run'),card.id);for(const phase of S.PHASES.slice(1)){r=S.transition(r,phase,{imageDisplayed:true});S.validate(JSON.parse(JSON.stringify(r)));}assert.equal(r.battle.dark,0);assert.equal(r.special.completed,true);assert.throws(()=>S.transition(r,'CARITAS_REPLY'));}
});

test('finisher technique follows each reading: Moon, Strength and Star are all attainable',()=>{
 const moon=action(C.newGame(),'忍耐','不安','癒し');
 const strength=action({...C.newGame(),dark:70},'勇気','秘密','癒し');
 const star=action(C.newGame(),'忍耐','不安','希望');
 assert.equal(C.finisherTechnique(moon).cardId,'18-the-moon');
 assert.equal(C.finisherTechnique(strength).cardId,'08-strength');
 assert.equal(C.finisherTechnique(star).cardId,'17-the-star');
 const scores=[moon,strength,star].map(s=>C.finisherTechnique(s).scores);
 assert.ok(scores[0]['18-the-moon']>scores[0]['17-the-star']);
 assert.ok(scores[1]['08-strength']>scores[1]['18-the-moon']);
 assert.ok(scores[2]['17-the-star']>scores[2]['18-the-moon']);
});
test('all successful battle turns contribute, with last committed action breaking ties',()=>{
 let s=action(C.newGame(),'忍耐','不安','癒し');
 const first=C.finisherTechnique(s);
 assert.equal(first.cardId,'18-the-moon');
 s=action(s,'勇気','秘密','癒し');
 const second=C.finisherTechnique(s);
 assert.ok(second.scores['18-the-moon']>=first.scores['18-the-moon'],'previous reading is still counted');
 s=action(s,'勇気','無意識','願い');
 assert.equal(s.turn,3);
 assert.equal(s.phase,'finisher');
 assert.equal(C.finisherTechnique(s).cardId,'08-strength','reaching twice overcomes an earlier supportive reading');
 const before={...C.finisherTechnique(s).scores};
 const restored=S.validate(JSON.parse(JSON.stringify(S.create(s,'finisher-affinity-restore'))));
 assert.deepEqual(C.finisherTechnique(restored.battle).scores,before);
 assert.equal(C.finisherTechnique(restored.battle).cardId,'08-strength');
});
test('failed approaches cannot farm affinity and old saved readings still determine the technique',()=>{
 let s=action(C.newGame(),'勇気','不安','希望');
 assert.equal(s.lastEffect.misread,true);
 assert.deepEqual(s.finisherInfluence,{'18-the-moon':0,'08-strength':0,'17-the-star':0});
 assert.equal(C.finisherTechnique(s).cardId,'17-the-star','neutral legacy fallback stays deterministic');
 const blocked=action({...C.newGame(),dark:70},'忍耐','秘密','希望');
 assert.equal(blocked.lastEffect.blocked,true);
 assert.deepEqual(blocked.finisherInfluence,{'18-the-moon':0,'08-strength':0,'17-the-star':0});
 const good=action(C.newGame(),'忍耐','不安','癒し');
 const old={...good};delete old.finisherInfluence;
 assert.equal(C.finisherTechnique(old).cardId,'18-the-moon','old v15 battle can reuse confirmed lastReading');
 const noHistory={...C.newGame(),phase:'finisher',resonance:100,dark:20};
 assert.equal(C.finisherTechnique(noHistory).cardId,'17-the-star');
});
test('free text affects the same finisher affinities without storing raw prose',()=>{
 let s=C.read(C.fromText(C.newGame(),'怖いなら、ここで待つよ'));
 const first=C.finisherTechnique(s).scores;
 s=C.read(C.fromText(s,'声が聞こえる。一緒に進もう'));
 const second=C.finisherTechnique(s).scores;
 assert.ok(second['08-strength']>first['08-strength']);
 s=C.read(C.fromText(s,'声が聞こえる。一緒に進もう'));
 assert.equal(s.phase,'finisher');
 assert.equal(C.finisherTechnique(s).cardId,'08-strength');
 assert.equal(JSON.stringify(s).includes('一緒に進もう'),false,'raw written input is never added to the save');
});
