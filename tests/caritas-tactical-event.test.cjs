'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../caritas-tactical-core.js')(require('../caritas-battle-core.js')),S=require('../caritas-special-state.js');
const KEY='tb:dev:hoshisuna:caritas-tactical-v1',LEGACY='tb:dev:hoshisuna:caritas-full-reading-v1';
// Reuse only the existing isolated DOM/clock/transport fixture, not its test cases.
let fixtureSource=fs.readFileSync(path.join(__dirname,'caritas-main-interaction.test.cjs'),'utf8').split('function assertShionSideFacing')[0];
fixtureSource=fixtureSource.replace("const Core=require('../caritas-battle-core.js');","const Core=require('../caritas-tactical-core.js')(require('../caritas-battle-core.js'));").replace("search:'?dev=hoshisuna'","search:'?dev=hoshisuna&battle=tactical'");
const fixtureModule={exports:{}};
vm.runInNewContext(fixtureSource+'\nmodule.exports=fixture;',{require,__dirname,module:fixtureModule,console,setImmediate,AbortController,URLSearchParams});
const fixture=fixtureModule.exports;
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const response=()=>({ok:true,json:async()=>({shion:'俺はここにいる。',caritas:'……その声は聞こえておる。',understandingIds:['offer_support']})});
function setup(options={}){
 const initial=S.create(C.newGame(),'tactical-test');
 const persistentStore=options.persistentStore||new Map([[KEY,JSON.stringify(initial)],[LEGACY,'untouched legacy bytes']]);
 const f=fixture({persistentStore,fetchReply:response,...options}),root=f.shell.querySelector('#caritas-event');
 return {f,root,persistentStore};
}
function write(f,root,text){
 f.button(root,'自分の言葉で届ける').click();
 const input=root.querySelector('.cb-ai-input');input.value=text;input.listeners.input();
 return root.querySelector('.cb-ai-send');
}
function settle(f){
 f.pointer.advance();f.advanceTime(1050);
 while(f.state().dialogueBusy)f.pointer.advance();
 f.advanceTime(1050);
}
test('free text advances once, pressure is paid, then consecutive writing is allowed',async()=>{
 const {f,root,persistentStore}=setup();
 const send=write(f,root,'怖ければ、ここで待つよ');await send.click();
 assert.equal(f.state().battle.turn,0,'dialogue has not been delivered yet');
 settle(f);
 assert.equal(f.state().battle.turn,1);assert.ok(f.state().battle.hp<100);assert.equal(f.state().battle.resonance,35);
 assert.equal(persistentStore.get(LEGACY),'untouched legacy bytes');
 await write(f,root,'声が聞こえる。一緒に進もう').click();settle(f);
 assert.equal(f.state().battle.turn,2);assert.equal(f.state().battle.lastEffect.approach,'reach');
 await write(f,root,'声が聞こえる。一緒に進もう').click();settle(f);
 assert.equal(f.state().battle.turn,3);assert.equal(f.state().battle.phase,'finisher');
 assert.equal(JSON.parse(persistentStore.get(KEY)).aiCalls,3);
 assert.doesNotMatch(persistentStore.get(KEY),/怖ければ|一緒に進もう/,'raw input is not persisted');
});
test('repeated supportive writing cannot farm through the changed situation',async()=>{
 const {f,root}=setup();await write(f,root,'助けるよ').click();settle(f);
 const before=f.state().battle;await write(f,root,'助けるよ').click();settle(f);
 const after=f.state().battle;
 assert.equal(after.turn,before.turn+1);assert.equal(after.resonance,before.resonance);assert.equal(after.dark,before.dark);assert.ok(after.hp<before.hp);
 assert.match(f.lines.at(-1).text,/声を/);
});
test('duplicate and failed submissions do not consume an action or reward',async()=>{
 let finishRequest;const pending=new Promise(resolve=>{finishRequest=resolve;});
 const {f,root,persistentStore}=setup({fetchReply:()=>pending});
 const send=write(f,root,'助けるよ'),first=send.click();await send.click();assert.equal(f.requests.length,1);
 finishRequest({ok:false,status:503,json:async()=>({error:'ai_unavailable'})});await first;await flush();
 assert.equal(f.state().battle.turn,0);assert.equal(f.state().battle.hp,100);
 assert.equal(JSON.parse(persistentStore.get(KEY)).aiCalls,0);assert.equal(root.querySelector('.cb-ai-input').value,'助けるよ');
});
test('reload after a committed action cannot deliver its reward or cost twice',async()=>{
 const {f,root,persistentStore}=setup();await write(f,root,'助けるよ').click();f.pointer.advance();
 const committed=JSON.parse(persistentStore.get(KEY)).battle;
 const restored=setup({persistentStore}).f;
 assert.equal(restored.state().battle.turn,committed.turn);assert.equal(restored.state().battle.hp,committed.hp);assert.equal(restored.state().battle.resonance,committed.resonance);
});
test('save failure freezes the action and retains the text for safe retry',async()=>{
 const {f,root,persistentStore}=setup({storageFails:true});await write(f,root,'助けるよ').click();f.pointer.advance();
 assert.equal(f.state().saveBlocked,true);assert.equal(f.state().battle.turn,0);assert.equal(JSON.parse(persistentStore.get(KEY)).aiCalls,0);
 assert.equal(root.querySelector('.cb-ai-input').value,'助けるよ');
});
test('unmatched legacy AI cannot replace the authored tactical response',async()=>{
 const {f,root}=setup({fetchReply:()=>({ok:true,json:async()=>({shion:'俺はここにいる。',caritas:'矛盾する未検証の返答',understandingIds:[]})})});
 const send=write(f,root,'今は手を取ってはいけない。待つよ');
 assert.match(root.querySelector('.cb-writing-footer').children[0].textContent,/支える/);
 await send.click();settle(f);
 assert.equal(f.state().battle.lastEffect.approach,'support');
 assert.ok(!f.lines.some(line=>line.text.includes('未検証')));
});
test('corrupt tactical finisher receipt fails closed instead of trapping disabled actions',()=>{
 const r=S.create({...C.newGame(),phase:'finisher',resonance:100,dark:80},'corrupt');
 const persistentStore=new Map([[KEY,JSON.stringify(r)]]),before=persistentStore.get(KEY);
 const {f}=setup({persistentStore});assert.equal(f.state().recovery,true);assert.equal(persistentStore.get(KEY),before);
});
test('each card explains its role and actual choice count; Strength intentionally has two',()=>{
 const {f,root}=setup();f.button(root,'選んで届ける').click();
 for(let i=0;i<3;i++){
  root.querySelector('.cb-completion-cards').children[i].click();
  assert.match(root.querySelector('.cb-modal-title').textContent,i===1?/トリガー.*働きかけ/:i===0?/コンパス.*目を向ける/:/ルート.*届ける/);
  assert.equal(root.querySelector('.cb-modal-words').children.length,i===1?2:3);
  root.querySelector('.cb-modal-close').click();
 }
});
test('third selection opens assembled reading without spending a turn; edit and explicit send are safe',()=>{
 const {f,root}=setup();f.button(root,'選んで届ける').click();
 const select=(index,choice)=>{root.querySelector('.cb-completion-cards').children[index].click();root.querySelector('.cb-modal-words').children[choice].click();};
 select(0,0);select(1,0);
 assert.equal(root.querySelector('.cb-completion').hidden,false);
 assert.equal(root.querySelector('.cb-completion-send').hidden,true);
 select(2,0);
 assert.equal(root.querySelector('.cb-completion').hidden,false);
 assert.equal(f.state().battle.turn,0);assert.equal(f.state().battle.hp,100);
 assert.equal(root.querySelector('.cb-completion-words').children.length,3);
 assert.equal(root.querySelector('.cb-completion-cards').children.length,3);
 assert.equal(root.querySelector('.cb-completion-edit').hidden,true,'editing is done by tapping a card');
 assert.equal(f.state().battle.words.filter(Boolean).length,3);
 select(2,1);
 assert.equal(root.querySelector('.cb-completion').hidden,false);
 assert.match(root.querySelector('.cb-completion-words').children[2].textContent,/受け取るか/);
 const send=root.querySelector('.cb-completion-send');send.click();send.click();
 assert.equal(f.state().battle.turn,0,'must wait for shared dialogue');
 assert.equal(root.querySelector('.cb-completion').hidden,true);
 while(f.state().dialogueBusy)f.pointer.advance();
 f.advanceTime(1050);
 assert.equal(f.state().battle.turn,1,'only one committed reading');
});

test('first-play tactical UI separates goal from modes and offers impact estimates',()=>{
 const {f,root}=setup();
 const goal=root.querySelector('.cb-tactical-goal'),detail=root.querySelector('.cb-tactical-goal-detail');
 assert.equal(goal.textContent,'闇を払え');
 assert.equal(detail.textContent,'共鳴をMAXにして、想いを伝えるんだ。');
 assert.equal(root.querySelector('.cb-command-prompt').textContent,'届け方を選ぶ');
 assert.equal(goal.hidden,false);
 f.button(root,'選んで届ける').click();
 assert.equal(goal.hidden,true,'large goal is not repeated over tarot cards');
 assert.equal(detail.hidden,true);
 assert.match(root.querySelector('.cb-completion-subtitle').textContent,/カードをタップして意味を選ぼう/);
 const first=root.querySelector('.cb-completion-cards').children[0];
 assert.equal(first.dataset.next,'true','initial first card is visually invited');
 first.click();
 assert.match(root.querySelector('.cb-modal-selected').textContent,/闇侵蝕−3/,'Moon guidance appears once above the choices');
 assert.equal(root.querySelector('.cb-modal-words').children.length,3);
 assert.equal(root.querySelector('.cb-modal-impact'),null,'do not repeat the same impact notice inside every Moon choice');
 assert.equal(root.querySelector('.cb-modal-word-desc').textContent,C.READING_OPTIONS['不安'].text,'authored descriptions remain unchanged in textContent');
 root.querySelector('.cb-modal-close').click();
 root.flatten().filter(e=>e.className==='cb-card-button')[1].click();
 assert.ok(root.querySelector('.cb-modal-impact'),'Strength displays distinct risks for each option');
 assert.equal(root.querySelector('.cb-modal-words').children.length,2);
 assert.notEqual(
  root.querySelector('.cb-modal-words').children[0].children.at(-1).textContent,
  root.querySelector('.cb-modal-words').children[1].children.at(-1).textContent,
  'strength options have different benefits and costs'
 );
});

test('recap uses Compass Trigger Route as the primary card headings and keeps subtitles below',()=>{
 const {f,root}=setup();f.button(root,'選んで届ける').click();
 const select=(index,choice)=>{root.querySelector('.cb-completion-cards').children[index].click();root.querySelector('.cb-modal-words').children[choice].click();};
 select(0,0);select(1,0);select(2,0);
 const cards=root.querySelector('.cb-completion-cards').children;
 assert.equal(cards.length,3);
 for(let i=0;i<3;i++){
  assert.equal(cards[i].children[0].className,'cb-completion-role');
  assert.equal(cards[i].children[0].textContent,['コンパス','トリガー','ルート'][i]);
  assert.equal(cards[i].children[1].className,'cb-completion-question');
  assert.equal(cards[i].children[1].textContent,['何に目を向ける？','どう働きかける？','どう届ける？'][i]);
  assert.equal(cards[i].children[3].className,'cb-completion-choice');
 }
 assert.equal(f.state().battle.turn,0,'recap presentation must not commit a turn');
});

test('three-card constellation is the only selection screen; results appear after taps',()=>{
 const {f,root}=setup();f.button(root,'選んで届ける').click();
 const screen=root.querySelector('.cb-completion'),cards=()=>root.querySelector('.cb-completion-cards').children;
 assert.equal(screen.hidden,false,'show the constellation before any choice');
 assert.equal(root.dataset.readingComplete,'true');
 assert.equal(root.dataset.readingReady,'false');
 assert.equal(cards().length,3);
 for(const item of cards()){
  assert.equal(item.tagName,'button');
  assert.equal(item.dataset.selected,'false');
  assert.equal(item.children[3].textContent,'タップして選ぶ');
 }
 assert.equal(root.querySelector('.cb-completion-send').hidden,true);
 assert.equal(root.querySelector('.cb-completion-message').hidden,true);
 cards()[1].click();
 assert.equal(root.querySelector('.cb-card-overlay').hidden,false,'one bottom sheet opens above the constellation');
 assert.equal(screen.hidden,false,'the constellation remains underneath the picker');
 assert.match(root.querySelector('.cb-modal-title').textContent,/トリガー/);
 assert.equal(root.querySelector('.cb-modal-navigation').hidden,true);
 root.querySelector('.cb-modal-words').children[0].click();
 assert.equal(root.querySelector('.cb-card-overlay').hidden,true);
 assert.equal(screen.hidden,false);
 assert.equal(cards()[0].children[3].textContent,'タップして選ぶ');
 assert.notEqual(cards()[1].children[3].textContent,'タップして選ぶ');
 assert.equal(cards()[2].children[3].textContent,'タップして選ぶ');
 assert.equal(root.querySelector('.cb-completion-send').hidden,true);
 cards()[0].click();root.querySelector('.cb-modal-words').children[0].click();
 cards()[2].click();root.querySelector('.cb-modal-words').children[0].click();
 assert.equal(root.dataset.readingReady,'true');
 assert.equal(root.querySelector('.cb-completion-send').hidden,false);
 assert.equal(root.querySelector('.cb-completion-message').hidden,false);
 cards()[0].click();root.querySelector('.cb-modal-words').children[1].click();
 assert.equal(root.dataset.readingReady,'true','edits do not spend the turn');
 assert.equal(f.state().battle.turn,0);
 root.querySelector('.cb-completion-back').click();
 assert.equal(screen.hidden,true,'back returns to battle mode selection');
 assert.equal(f.state().battle.words.filter(Boolean).length,3,'back retains selected card meanings');
});

test('Shion speaking state drives battlefield rim light and resets before Shioriel counter-hit',()=>{
 const {f,root}=setup();
 assert.equal(root.dataset.actorSpeaking,'none','no glow while the player is choosing');
 f.button(root,'選んで届ける').click();
 const select=(index,choice)=>{
  root.querySelector('.cb-completion-cards').children[index].click();
  root.querySelector('.cb-modal-words').children[choice].click();
 };
 select(0,0);select(1,0);select(2,0);
 const predicted=C.predict(f.state().battle);
 assert.ok(predicted.hasCounter&&predicted.damage>0,'this opening reading must trigger a real damaging counter');
 root.querySelector('.cb-completion-send').click();
 assert.equal(root.dataset.actorSpeaking,'shion','Shion must glow while he delivers a reading');
 while(f.state().dialogueBusy)f.pointer.advance();
 assert.equal(root.dataset.actorSpeaking,'none','glow stops with shared dialogue');
 f.advanceTime(1050);
 assert.equal(root.dataset.actorSpeaking,'none','Caritas speech must not light Shion');
 assert.equal(f.state().dialogueBusy,true);
 f.pointer.advance();
 assert.equal(root.dataset.actorSpeaking,'none');
 assert.equal(root.dataset.phase,'enemy-turn','only the actual damaging counter causes the red Shioriel flash');
 f.advanceTime(1050);
 assert.notEqual(root.dataset.phase,'enemy-turn','red hit ends with the counter phase');
 assert.equal(root.dataset.actorSpeaking,'none');
});

test('tactical finisher offers only a strong skill action and commits the Star technique once',()=>{
 const ready={...C.newGame(),phase:'finisher',resonance:100,dark:20,hp:70};
 const saved=S.create(ready,'tactical-auto-special');
 const persistentStore=new Map([[KEY,JSON.stringify(saved)],[LEGACY,'unchanged']]);
 const {f,root}=setup({persistentStore});
 assert.equal(f.state().battle.phase,'finisher');
 assert.equal(root.querySelector('.cb-cards').hidden,true,'three regular tarot cards must not appear at MAX');
 assert.equal(root.querySelector('.cb-actions').hidden,false);
 assert.equal(root.querySelector('.cb-delivery-methods').hidden,true);
 assert.equal(root.querySelector('.cb-special-selection').hidden,true);
 const skill=f.button(root,'共鳴解放');
 assert.ok(skill&&!skill.disabled);
 assert.ok(skill.classList.contains('cb-skill-ready'));
 assert.equal(root.dataset.finisher,'true');
 skill.click();
 assert.equal(f.state().story,'special','the only button starts the finisher without asking for another card');
 assert.equal(f.state().special.phase,'SHION_LINE');
 assert.equal(f.state().special.cardId,'17-the-star','Caritas uses the authored Star purification scene');
 assert.equal(root.querySelector('.cb-special-selection').hidden,true,'no second three-card popup');
 assert.equal(root.querySelector('.cb-special-cards'),null);
 assert.equal(persistentStore.get(LEGACY),'unchanged');
 const committed=JSON.parse(persistentStore.get(KEY));
 assert.equal(committed.special.committed,true);
 assert.equal(committed.special.cardId,'17-the-star');
 assert.equal(f.state().battle.dark,20,'purification does not resolve before its visual phase');
 skill.click();
 assert.equal(JSON.parse(persistentStore.get(KEY)).revision,committed.revision,'second click cannot duplicate the special receipt');
});
