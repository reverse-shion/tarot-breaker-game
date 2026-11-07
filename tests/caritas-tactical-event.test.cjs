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
  root.flatten().filter(e=>e.className==='cb-card-button')[i].click();
  assert.match(root.querySelector('.cb-modal-title').textContent,i===1?/トリガー.*2択/:i===0?/コンパス.*3択/:/ルート.*3択/);
  assert.equal(root.querySelector('.cb-modal-words').children.length,i===1?2:3);
  root.querySelector('.cb-modal-close').click();
 }
});
test('third selection opens assembled reading without spending a turn; edit and explicit send are safe',()=>{
 const {f,root}=setup();f.button(root,'選んで届ける').click();
 const select=(index,choice)=>{root.flatten().filter(e=>e.className==='cb-card-button')[index].click();root.querySelector('.cb-modal-words').children[choice].click();};
 select(0,0);select(1,0);
 assert.equal(root.querySelector('.cb-completion').hidden,true);
 select(2,0);
 assert.equal(root.querySelector('.cb-completion').hidden,false);
 assert.equal(f.state().battle.turn,0);assert.equal(f.state().battle.hp,100);
 assert.equal(root.querySelector('.cb-completion-words').children.length,3);
 assert.equal(root.querySelector('.cb-completion-cards').children.length,3);
 root.querySelector('.cb-completion-edit').click();
 assert.equal(root.querySelector('.cb-completion').hidden,true);
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

test('observation panels separate visible signs from advice and update only after delivered effects',async()=>{
 const {f,root}=setup();
 const panel=root.querySelector('.cb-tactical-observation');
 assert.equal(panel.dataset.situation,'closed');
 assert.match(panel.querySelector('.cb-observation-state').textContent,/拒んで/);
 assert.match(panel.querySelector('.cb-observation-sign').textContent,/爪/);
 assert.match(panel.querySelector('.cb-observation-advice').children[1].textContent,/維持力/);
 await write(f,root,'怖ければ、ここで待つよ').click();
 assert.equal(panel.dataset.situation,'closed','no premature outcome during delivery dialogue');
 settle(f);
 assert.equal(panel.dataset.situation,'storm');
 assert.match(panel.querySelector('.cb-observation-state').textContent,/声が遮られ/);
 assert.match(panel.querySelector('.cb-observation-advice').children[1].textContent,/一歩踏み込む/);
 await write(f,root,'声が聞こえる。一緒に進もう').click();settle(f);
 assert.equal(panel.dataset.situation,'wavering');
 assert.match(panel.querySelector('.cb-observation-advice').children[1].textContent,/どちらも届く/);
 await write(f,root,'声が聞こえる。一緒に進もう').click();settle(f);
 assert.equal(f.state().battle.phase,'finisher');
 assert.equal(panel.dataset.situation,'ready');
 assert.match(panel.querySelector('.cb-observation-state').textContent,/共鳴解放できる/);
 assert.match(panel.querySelector('.cb-observation-advice').children[1].textContent,/下の「共鳴解放」/);
});
