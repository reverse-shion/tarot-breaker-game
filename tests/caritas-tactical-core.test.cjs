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
