/* Isolated real Starroad event-flow regression: no production storage/main writes. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const Core=require('../caritas-battle-core.js');
class El{
 constructor(t){this.tagName=t;this.children=[];this.hidden=false;this.dataset={};this.style={};this.listeners={};this.attributes={};this.textContent='';this.className='';this.id='';const values=new Set();this.classList={add:k=>values.add(k),remove:k=>values.delete(k),contains:k=>values.has(k)}}
 append(...v){this.children.push(...v)}
 appendChild(x){this.children.push(x);return x}
 replaceChildren(...v){this.children=v}
 addEventListener(n,f){this.listeners[n]=f}
 setAttribute(k,v){this.attributes[k]=v}
 focus(){}
 click(){this.listeners.click?.({preventDefault(){},stopPropagation(){}})}
 flatten(){return [this,...this.children.flatMap(c=>c.flatten())]}
 querySelector(q){return this.flatten().find(e=>q[0]==='#'?e.id===q.slice(1):e.className?.split(' ').includes(q.slice(1)))||null}
}
function fixture({reduced=false,persistentStore=new Map()}={}){
 const shell=new El('main'),creature=new El('div'),body=new El('body');body.classList.add('scene-ready');
 const documentListeners={},windowListeners={};
 const doc={readyState:'complete',hidden:false,body,createElement:t=>new El(t),getElementById:k=>k==='game-shell'?shell:k==='hoshisuna-caritas'?new El('img'):null,querySelector:k=>k==='.hoshi-caritas'?creature:null,addEventListener:(n,f)=>documentListeners[n]=f};
 const lines=[],events=[],intervals=[],saved=new Map(),pointer={actor:{x:100,y:500},advance:null,colliding:true,dialogueOptions:null};
 const window={CaritasBattleCore:Core,TarotStage:{getState:()=>({actors:{shion:pointer.actor}}),perform:command=>{(pointer.stageCommands??=[]).push(command);return {promise:Promise.resolve({completed:true})}}},TarotHoshisunaManifestation:{moveForward(){pointer.walks=(pointer.walks||0)+1;return Promise.resolve({completed:true})},faceFront(){pointer.front=true;return true},begin(){pointer.mapPhase="charging";return true},reveal(){pointer.mapPhase="revealed";return true},clear(){pointer.mapPhase="idle";pointer.clears=(pointer.clears||0)+1;return true},pause(){pointer.paused=true},resume(){pointer.paused=false}},TarotHoshisunaCollision:{setActive:v=>{pointer.colliding=v}},
  TarotDialogueUI:{create:o=>{pointer.advance=o.onAdvance;pointer.dialogueOptions=o;return{show:p=>lines.push(p),hide(){},elements:{layer:new El('section'),button:new El('button')}}}},dispatchEvent:e=>events.push(e.type),addEventListener:(n,f)=>windowListeners[n]=f,matchMedia:()=>({matches:reduced})};
 class MockEvent{constructor(type){this.type=type}}
 let now=0,id=0;const tasks=new Map();
 const sandbox={window,document:doc,location:{pathname:'/hoshisuna-main.html',search:'?dev=hoshisuna'},CustomEvent:MockEvent,Event:MockEvent,
  sessionStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},
  localStorage:{getItem:k=>persistentStore.get(k)||null,setItem:(k,v)=>persistentStore.set(k,v),removeItem:k=>persistentStore.delete(k)},setInterval:cb=>(intervals.push(cb),intervals.length),
  clearInterval(){},setTimeout:(cb,ms)=>{tasks.set(++id,{cb,at:now+ms});return id},clearTimeout:n=>tasks.delete(n),performance:{now:()=>now},URLSearchParams,console};
 const js=fs.readFileSync(path.join(__dirname,'../caritas-battle-event.js'),'utf8');
 vm.runInNewContext(js,sandbox,{timeout:5000});
 const advanceTime=ms=>{const target=now+ms;for(;;){const due=[...tasks].filter(([,v])=>v.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;tasks.delete(due[0]);due[1].cb();}now=target};
 return {shell,body,creature,lines,events,intervals,pointer,window,advanceTime,
  visibility:hidden=>{doc.hidden=hidden;documentListeners.visibilitychange?.()},
  page:n=>windowListeners[n]?.({persisted:true}),
  tick:()=>intervals.at(-1)(),state:()=>window.CaritasEncounterDebug.getState(),
  button:(root,text)=>root.flatten().find(e=>e.tagName==='button'&&e.textContent===text)};
}
async function enter(f){
 f.pointer.actor={x:1013,y:305};f.tick();f.pointer.advance();
 f.button(f.shell.querySelector('#caritas-interaction-choice'),'調べる').click();
 for(let i=0;i<4;i++)f.pointer.advance();
 assert.equal(f.state().story,'intro');
 assert.equal(f.lines.at(-1).speaker,'しおぽん');
 assert.equal(f.lines.at(-1).text,'はい、シオンさん。');
 assert.equal(f.pointer.walks,1);
 f.pointer.advance();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.state().story,'invocation');
 assert.equal(f.pointer.front,true);
 assert.equal(f.pointer.stageCommands.at(-1).target,'shiopon');
 assert.match(f.lines.at(-1).text,/来臨せよ、汝ーーシオリエル/);
 const root=f.shell.querySelector('#caritas-event');
 assert.equal(root.hidden,true);
 f.pointer.advance();
 assert.equal(f.state().story,'manifestation');
 assert.equal(f.pointer.mapPhase,'charging');
 f.advanceTime(3899);assert.equal(f.state().story,'manifestation');
 f.advanceTime(1);assert.equal(f.state().story,'manifested');
 assert.equal(f.pointer.mapPhase,'revealed');
 assert.equal(f.lines.at(-1).speaker,'シオリエル');
 assert.equal(root.hidden,true);
 f.pointer.advance();assert.equal(f.state().story,'engulfing');
 assert.equal(root.hidden,false);
 f.advanceTime(2599);assert.equal(f.state().story,'engulfing');
 f.advanceTime(1);assert.equal(f.state().story,'battle');
 return root;
}

function choose(f,root,words){
 if(!f.state().readingOpen)f.button(root,'リーディングを始める').click();
 const buttons=root.flatten().filter(e=>e.className==='cb-card-button');
 assert.equal(buttons.length,3);
 words.forEach((word,i)=>{
  buttons[i].click();
  assert.equal(root.querySelector('.cb-card-overlay').hidden,false);
  const title=Core.READING_OPTIONS[word].title;
  const option=root.flatten().find(e=>e.tagName==='button'&&e.attributes['aria-label']===title);
  assert.ok(option,'missing full foreground reading '+title);
  assert.ok(Core.READING_OPTIONS[word].text.length>25,'must be complete text, not keywords');
  option.click();
  assert.equal(root.querySelector('.cb-card-overlay').hidden,true);
 });
}
function read(f,root,words){
 if(!f.state().readingOpen)f.button(root,'リーディングを始める').click();
 if(words)choose(f,root,words);
 const button=f.button(root,'この言葉を届ける');assert.ok(button);button.click();
 assert.equal(f.state().dialogueBusy,true);
 const turnBefore=f.state().battle.turn;
 for(let page=0;page<3;page++){
  assert.equal(f.lines.at(-1).speaker,'シオン');
  assert.equal(f.state().battle.turn,turnBefore,'reading must finish before damage');
  f.pointer.advance();
 }
 assert.equal(f.state().story,'word-strike');
 f.advanceTime(1050); // Effects and meter updates, then Caritas response.
 assert.equal(f.lines.at(-1).speaker,'カリタス');
 f.pointer.advance();
 if(f.state().story==='enemy-turn')f.advanceTime(1050);
}
test('map notices Caritas first, uses main prompt, leaving does not re-trigger',()=>{
 const f=fixture();f.pointer.actor={x:1013,y:305};f.tick();
 assert.equal(f.state().story,'notice');
 assert.equal(f.lines[0].speaker,'シオン');f.pointer.advance();
 assert.equal(f.state().story,'choice');
 f.button(f.shell,'離れる').click();
 assert.equal(f.state().story,'idle');assert.equal(f.state().armed,false);
 f.pointer.actor={x:90,y:100};f.tick();
 assert.equal(f.state().armed,true);
});
test('manifestation remains on the real map before entering battle',async()=>{
 const f=fixture();const root=await enter(f);
 assert.equal(f.pointer.mapPhase,'revealed');
 assert.equal(root.hidden,false);assert.equal(f.state().story,'battle');
 assert.equal(f.button(root,'防御'),undefined);
 assert.equal(f.state().readingOpen,false);
 assert.ok(f.button(root,'リーディングを始める'));
 assert.equal(root.querySelector('.cb-card-overlay').hidden,true);
 assert.equal(root.querySelector('.cb-hud').className,'cb-hud enemy');
 assert.ok(root.querySelector('.cb-mood'));
 assert.equal(f.button(root,'必殺技').disabled,true);
});
test('read chooses foreground meanings, accepts input once, then shows calculated counterattack',async()=>{
 const f=fixture(),root=await enter(f);
 f.button(root,'リーディングを始める').click();
 assert.equal(f.button(root,'この言葉を届ける').disabled,true);
 choose(f,root,['不安','忍耐','癒し']);
 assert.equal(f.button(root,'この言葉を届ける').disabled,false);
 f.button(root,'この言葉を届ける').click();
 f.button(root,'この言葉を届ける').click();
 assert.equal(f.state().battle.turn,0,'no attacks before the last page');
 f.pointer.advance();f.pointer.advance();
 assert.equal(f.state().battle.turn,0);
 f.pointer.advance();
 assert.equal(f.state().battle.turn,1);assert.equal(f.state().battle.hp,91);
 assert.equal(f.state().battle.dark,80);assert.equal(f.state().battle.resonance,27);
 assert.equal(f.state().story,'word-strike');
 f.advanceTime(1050);assert.equal(f.lines.at(-1).speaker,'カリタス');
 assert.match(f.lines.at(-1).text,/怖いのか/);
 f.pointer.advance();assert.equal(f.state().story,'enemy-turn');
 f.advanceTime(1050);assert.equal(f.state().battle.turn,1);
});
test('ordinary tarot path unlocks finisher; skill cutin ends with exactly one farewell and map return',async()=>{
 const f=fixture(),root=await enter(f);
 for(let i=0;i<12&&f.state().battle.phase==='read';i++)read(f,root,i===0?['不安','忍耐','癒し']:null);
 assert.equal(f.state().battle.phase,'finisher');
 assert.ok(f.state().battle.hp>0);
 assert.equal(f.state().battle.resonance,100);
 assert.equal(f.button(root,'対話で解放').disabled,false);
 assert.equal(f.button(root,'必殺技').disabled,false);
 f.button(root,'必殺技').click();assert.equal(f.state().story,'cutin');
 const finishingTurn=f.state().battle.turn;
 f.button(root,'必殺技').click();assert.equal(f.state().battle.turn,finishingTurn);
 f.advanceTime(1700);assert.equal(f.state().story,'technique');
 f.advanceTime(1500);assert.equal(f.state().story,'purifying');
 f.advanceTime(2600);assert.equal(f.state().story,'purified');
 f.advanceTime(1100);assert.equal(f.state().story,'farewell');
 assert.equal(f.lines.at(-1).text,'……世話になった。');
 f.pointer.advance();assert.equal(f.state().story,'returning');
 assert.equal(f.pointer.mapPhase,'idle');
 f.advanceTime(900);assert.equal(f.state().story,'complete');assert.equal(root.hidden,true);
 assert.equal(f.pointer.colliding,false);assert.equal(f.creature.hidden,true);
 assert.equal(f.events.filter(x=>x==='tarot-breaker:interaction-end').length,1);
});
test('HP0 causes shared-dialogue retreat and resets follower without purifying Caritas',async()=>{
 const f=fixture(),root=await enter(f);
 for(let i=0;i<12&&f.state().battle.phase==='read';i++)read(f,root,i===0?['秘密','勇気','希望']:null);
 assert.equal(f.state().battle.phase,'defeat');assert.equal(f.state().story,'retreat');
 assert.match(f.lines.at(-1).text,/一度撤退だ/);
 f.pointer.advance();assert.equal(f.lines.at(-1).speaker,'シオリエル');
 f.pointer.advance();assert.equal(f.state().story,'returning');assert.equal(f.pointer.mapPhase,'idle');
 f.advanceTime(900);assert.equal(f.state().story,'idle');
 assert.equal(root.hidden,true);assert.equal(f.state().done,false);
 assert.equal(f.pointer.colliding,true);assert.equal(f.creature.hidden,false);
 assert.equal(f.state().owned,false);assert.equal(f.state().armed,false);
 f.advanceTime(1300);assert.equal(f.state().story,'choice');
 assert.ok(f.button(f.shell,'調べる'),'retry requires player inspection, not forced combat');
});
test('turn checkpoint restores HP, darkness and resonance without a second attack',async()=>{
 const persistentStore=new Map();
 const f=fixture({persistentStore}),root=await enter(f);
 read(f,root,['不安','忍耐','癒し']);
 assert.equal(f.state().battle.hp,91);assert.equal(f.state().battle.turn,1);
 assert.ok([...persistentStore.keys()].some(k=>k.includes('caritas-full-reading-v1')));
 const resumed=fixture({persistentStore});
 assert.equal(resumed.state().story,'battle');
 assert.equal(resumed.state().battle.turn,1);
 assert.equal(resumed.state().battle.hp,91);
 assert.equal(resumed.state().battle.dark,80);
 assert.equal(resumed.state().battle.resonance,27);
 assert.equal(resumed.shell.querySelector('#caritas-event').hidden,false);
});
test('visibility and BFCache pause cutin time without replaying finisher',async()=>{
 const f=fixture(),root=await enter(f);
 for(let i=0;i<12&&f.state().battle.phase==='read';i++)read(f,root,i===0?['不安','忍耐','癒し']:null);
 assert.equal(f.state().battle.phase,'finisher');
 f.button(root,'必殺技').click();f.advanceTime(500);
 f.visibility(true);f.advanceTime(15000);assert.equal(f.state().story,'cutin');
 f.visibility(false);f.advanceTime(1200);assert.equal(f.state().story,'technique');
 f.advanceTime(500);f.page('pagehide');f.advanceTime(15000);assert.equal(f.state().story,'technique');
 f.page('pageshow');f.advanceTime(1000);assert.equal(f.state().story,'purifying');
 assert.ok(f.state().battle.turn>0);
});
test('shared main dialogue IDs, nonproduction isolation and styling are unchanged',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../hoshisuna-main.html'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../caritas-battle-event.css'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'../caritas-battle-event.js'),'utf8');
 const f=fixture();
 assert.ok(html.indexOf('shared-dialogue.js')<html.indexOf('caritas-battle-event.js'));
 assert.equal(f.pointer.dialogueOptions.mount,f.shell);
 assert.deepEqual(JSON.parse(JSON.stringify(f.pointer.dialogueOptions.ids)),{
  layer:'dialogue-layer',advance:'dialogue-advance',speaker:'dialogue-speaker',text:'dialogue-text'
 });
 assert.doesNotMatch(css,/\\.tb-dialogue|#dialogue-|--speaker-|caritas-dialogue/);
 assert.ok(css.includes("#caritas-event{position:fixed;inset:0;z-index:2200"));
 assert.doesNotMatch(js+Core.ENDING.join(''),/聖獣|正体は/);
});
