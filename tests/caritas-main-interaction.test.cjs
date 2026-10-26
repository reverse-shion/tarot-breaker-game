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
function fixture({reduced=false}={}){
 const shell=new El('main'),creature=new El('div'),body=new El('body');body.classList.add('scene-ready');
 const documentListeners={},windowListeners={};
 const doc={readyState:'complete',hidden:false,body,createElement:t=>new El(t),getElementById:k=>k==='game-shell'?shell:k==='hoshisuna-caritas'?new El('img'):null,querySelector:k=>k==='.hoshi-caritas'?creature:null,addEventListener:(n,f)=>documentListeners[n]=f};
 const lines=[],events=[],intervals=[],saved=new Map(),pointer={actor:{x:100,y:500},advance:null,colliding:true,dialogueOptions:null};
 const window={CaritasBattleCore:Core,TarotStage:{getState:()=>({actors:{shion:pointer.actor}}),perform:command=>{(pointer.stageCommands??=[]).push(command);return {promise:Promise.resolve({completed:true})}}},TarotHoshisunaManifestation:{moveForward(){pointer.walks=(pointer.walks||0)+1;return Promise.resolve({completed:true})},faceFront(){pointer.front=true;return true},begin(){pointer.mapPhase="charging";return true},reveal(){pointer.mapPhase="revealed";return true},clear(){pointer.mapPhase="idle";return true},pause(){pointer.paused=true},resume(){pointer.paused=false}},TarotHoshisunaCollision:{setActive:v=>{pointer.colliding=v}},
  TarotDialogueUI:{create:o=>{pointer.advance=o.onAdvance;pointer.dialogueOptions=o;return{show:p=>lines.push(p),hide(){},elements:{layer:new El('section'),button:new El('button')}}}},dispatchEvent:e=>events.push(e.type),addEventListener:(n,f)=>windowListeners[n]=f,matchMedia:()=>({matches:reduced})};
 class MockEvent{constructor(type){this.type=type}}
 let now=0,id=0;const tasks=new Map();
 const sandbox={window,document:doc,location:{pathname:'/hoshisuna-main.html',search:'?dev=hoshisuna'},CustomEvent:MockEvent,Event:MockEvent,
  sessionStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},setInterval:cb=>(intervals.push(cb),intervals.length),
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
 f.pointer.advance();await Promise.resolve();await Promise.resolve();
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
function read(f,root,words){
 for(const word of words||[])f.button(root,word).click();
 f.button(root,'この読みを届ける').click();
 if(f.state().story==='enemy-turn'){
  assert.ok(f.state().battle.hp<100,'an announced enemy turn must change HP');
  f.advanceTime(1050);
 }
 f.pointer.advance();f.pointer.advance();
}
test('Shion notices first, main-style two choices follow, leaving cannot loop',()=>{
 const f=fixture();
 assert.equal(f.state().story,'idle');
 f.pointer.actor={x:1013,y:305};f.tick();
 assert.equal(f.state().story,'notice');assert.equal(f.lines.length,1);assert.equal(f.lines[0].speaker,'シオン');
 assert.match(f.lines[0].text,/様子が妙だ/);
 assert.equal(f.events.filter(x=>x==='tarot-breaker:interaction-start').length,1);
 f.pointer.advance();assert.equal(f.state().story,'choice');
 const panel=f.shell.querySelector('#caritas-interaction-choice');assert.ok(f.button(panel,'調べる'));
 f.button(panel,'離れる').click();
 assert.equal(f.state().story,'idle');assert.equal(f.state().armed,false);
 f.tick();assert.equal(f.state().story,'idle');
 f.pointer.actor={x:90,y:100};f.tick();assert.equal(f.state().armed,true);
 f.pointer.actor={x:1013,y:305};f.tick();
 assert.equal(f.state().story,'choice');assert.equal(f.lines.length,1,'notice must be one-time per page');
});
test('Opening engulfing completes before input; final reading precedes purification, one farewell, then map unlock',async()=>{
 const f=fixture();const root=await enter(f);
 read(f,root);assert.equal(f.state().battle.resonance,34);
 read(f,root,['秘密','自制']);assert.equal(f.state().battle.resonance,67);
 for(const w of ['無意識','勇気','希望'])f.button(root,w).click();
 f.button(root,'この読みを届ける').click();
 assert.equal(f.state().battle.resonance,100);assert.equal(f.state().story,'battle');
 assert.equal(f.lines.at(-1).speaker,'シオン','final tactical reading must not be discarded');
 f.pointer.advance();assert.equal(f.lines.at(-1).speaker,'カリタス');f.pointer.advance();
 assert.equal(f.state().story,'purifying');assert.equal(root.hidden,false);assert.equal(f.pointer.colliding,true);
 const turn=f.state().battle.turn;f.button(root,'必殺技').click();f.button(root,'この読みを届ける').click();assert.equal(f.state().battle.turn,turn);
 f.advanceTime(2599);assert.equal(f.state().story,'purifying');f.advanceTime(1);assert.equal(f.state().story,'purified');
 assert.equal(f.pointer.colliding,true);assert.equal(root.hidden,false);
 const before=f.lines.length;f.advanceTime(1100);
 assert.equal(f.state().story,'farewell');assert.equal(f.lines.length,before+1);
 assert.equal(f.lines.at(-1).speaker,'カリタス');assert.equal(f.lines.at(-1).text,'……世話になった。');
 f.advanceTime(20000);assert.equal(f.state().story,'farewell','farewell waits for the player');assert.equal(f.pointer.colliding,true);
 f.pointer.advance();assert.equal(f.state().story,'returning');assert.equal(root.hidden,false);assert.equal(f.pointer.colliding,true);
 f.advanceTime(899);assert.equal(f.state().done,false);f.advanceTime(1);
 assert.equal(f.state().story,'complete');assert.equal(root.hidden,true);assert.equal(f.state().done,true);
 assert.equal(f.pointer.colliding,false);assert.equal(f.creature.hidden,true);
 assert.equal(f.events.filter(x=>x==='tarot-breaker:interaction-end').length,1);
 f.pointer.advance();f.tick();f.page('pageshow');assert.equal(f.events.filter(x=>x==='tarot-breaker:interaction-end').length,1);
});
test('Skill shows both face cutins then technique before applying its result exactly once',async()=>{
 const f=fixture();const root=await enter(f);
 read(f,root,['希望']);
 const before=f.state().battle;assert.equal(before.resonance,34);
 f.button(root,'必殺技').click();assert.equal(f.state().story,'cutin');assert.equal(f.state().battle.used,false);
 assert.ok(root.querySelector('.cb-cut-shion').querySelector('.cb-cut-face').src.endsWith('shion_card_03_check.webp'));
 assert.ok(root.querySelector('.cb-cut-shioriel').querySelector('.cb-cut-face').src.endsWith('shioriel-reference.png'));
 f.button(root,'必殺技').click();f.button(root,'この読みを届ける').click();f.button(root,'防御').click();
 assert.equal(f.state().battle.turn,before.turn);f.advanceTime(1699);assert.equal(f.state().story,'cutin');
 f.advanceTime(1);assert.equal(f.state().story,'technique');assert.equal(f.state().battle.resonance,34);
 f.advanceTime(1499);assert.equal(f.state().battle.used,false);f.advanceTime(1);
 assert.equal(f.state().battle.resonance,67);assert.equal(f.state().battle.used,true);assert.equal(f.state().battle.turn,before.turn+1);
 assert.equal(f.state().story,'enemy-turn');
 f.advanceTime(1050);
 assert.equal(f.state().dialogueBusy,true);f.pointer.advance();f.button(root,'必殺技').click();assert.equal(f.state().battle.turn,before.turn+1);
});
test('Winning skill still shows full cutin/effect, then purification and player-controlled farewell',async()=>{
 const f=fixture();const root=await enter(f);read(f,root);read(f,root,['秘密','勇気','願い']);
 f.button(root,'必殺技').click();assert.equal(f.state().story,'cutin');assert.equal(f.state().battle.resonance,67);
 f.advanceTime(3200);assert.equal(f.state().battle.resonance,100);assert.equal(f.state().dialogueBusy,true);
 f.pointer.advance();assert.equal(f.state().story,'purifying');assert.equal(root.hidden,false);
 f.advanceTime(3700);assert.equal(f.state().story,'farewell');assert.equal(f.pointer.colliding,true);
});
test('Visibility and BFCache pause cinematic time and resume remaining stages without stale completion',async()=>{
 const f=fixture();const root=await enter(f);read(f,root,['希望']);f.button(root,'必殺技').click();
 f.advanceTime(500);f.visibility(true);f.advanceTime(10000);assert.equal(f.state().story,'cutin');assert.equal(f.state().battle.used,false);
 f.visibility(false);f.advanceTime(1199);assert.equal(f.state().story,'cutin');f.advanceTime(1);assert.equal(f.state().story,'technique');
 f.advanceTime(600);f.page('pagehide');f.advanceTime(20000);assert.equal(f.state().story,'technique');
 f.page('pageshow');f.advanceTime(899);assert.equal(f.state().battle.used,false);f.advanceTime(1);assert.equal(f.state().battle.used,true);
 assert.equal(f.state().owned,true);assert.equal(root.hidden,false);assert.equal(f.events.filter(x=>x==='tarot-breaker:interaction-end').length,0);
});
test('Reduced motion keeps semantic stages and defeat retry remains operable',async()=>{
 const f=fixture({reduced:true});const root=await enter(f);
 for(let i=0;i<40&&f.state().battle.phase!=='defeat';i++){
  f.button(root,'防御').click();
  if(f.state().story==='enemy-turn')f.advanceTime(1050);
 }
 assert.equal(f.state().battle.phase,'defeat');assert.equal(f.pointer.colliding,true);
 f.button(root,'やり直す').click();assert.equal(f.state().battle.hp,100);assert.equal(f.state().story,'battle');
 read(f,root);read(f,root,['秘密','自制']);read(f,root,['無意識','勇気','希望']);
 assert.equal(f.state().story,'purifying');f.advanceTime(2600);assert.equal(f.state().story,'purified');f.advanceTime(1100);assert.equal(f.state().story,'farewell');
});
test('Map uses unmodified main dialogue mount, IDs and styles with no local override',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../hoshisuna-main.html'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../caritas-battle-event.css'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'../caritas-battle-event.js'),'utf8');
 assert.ok(html.indexOf('shared-dialogue.js')<html.indexOf('caritas-battle-event.js'));
 const f=fixture();assert.equal(f.pointer.dialogueOptions.mount,f.shell);
 assert.deepEqual(JSON.parse(JSON.stringify(f.pointer.dialogueOptions.ids)),{layer:'dialogue-layer',advance:'dialogue-advance',speaker:'dialogue-speaker',text:'dialogue-text'});
 assert.match(css,/#caritas-interaction-choice\.visible/);
 assert.doesNotMatch(css,/\.tb-dialogue|#dialogue-|--speaker-|caritas-dialogue/);
 assert.doesNotMatch(js,/classList\.add\("caritas-dialogue"\)|dialogue\.elements\.[^;]*\.style/);
 assert.match(css,/#caritas-event\{[^}]*z-index:2200/);
 assert.doesNotMatch(js+Core.ENDING.join(''),/聖獣|正体は/);
});

test('Defending visibly absorbs 75% of a forecast hit while reading/skill permit counterattacks',async()=>{
 const normal=Core.defend(Core.newGame());
 assert.equal(normal.hp,97,'normal 12 reduced by 75% is 3');
 const heavy=Core.defend({...Core.newGame(),turn:1});
 assert.equal(Core.forecast({...Core.newGame(),turn:1}),24);
 assert.equal(heavy.hp,94,'heavy 24 reduced by 75% is 6');
 const wrong=Core.read({...Core.newGame(),words:['無意識','勇気','癒し']});
 assert.equal(wrong.hp,94,'tactical healing read takes 6, not free');
 const skillReady={...Core.newGame(),resonance:34,dark:65};
 const skilled=Core.skill(skillReady);
 assert.equal(skilled.hp,88,'a non-winning skill also takes a normal hit');
 assert.equal(skilled.turn,1);
 const f=fixture(),root=await enter(f);
 f.button(root,'防御').click();
 assert.equal(f.state().story,'enemy-turn');
 assert.equal(f.state().battle.hp,97);
 assert.match(root.querySelector('.cb-enemy-turn').flatten().map(el=>el.textContent).join(' '),/75%軽減/);
 assert.equal(f.button(root,'この読みを届ける').disabled,true);
 f.advanceTime(1049);
 assert.equal(f.state().story,'enemy-turn');
 f.advanceTime(1);
 assert.equal(f.state().story,'battle');
 assert.equal(f.state().battle.hp,97);
 f.button(root,'この読みを届ける').click();
 assert.equal(f.state().story,'enemy-turn');
 assert.equal(f.state().battle.hp,85,'heavy 24 with healing-route 50% reduction costs 12 HP');
 assert.match(root.querySelector('.cb-enemy-turn').flatten().map(el=>el.textContent).join(' '),/強攻撃/);
 f.advanceTime(1050);
 assert.equal(f.state().story,'battle');
 assert.equal(f.state().dialogueBusy,true);
});
test('Attack interlude freezes on backgrounding and cannot be double-applied',async()=>{
 const f=fixture(),root=await enter(f);
 f.button(root,'防御').click();
 assert.equal(f.state().battle.hp,97);
 f.advanceTime(350);f.visibility(true);f.advanceTime(8000);
 assert.equal(f.state().story,'enemy-turn');assert.equal(f.state().battle.hp,97);
 f.visibility(false);f.advanceTime(699);assert.equal(f.state().story,'enemy-turn');
 f.advanceTime(1);assert.equal(f.state().story,'battle');assert.equal(f.state().battle.hp,97);
 f.button(root,'防御').click();assert.equal(f.state().battle.hp,91);
 f.advanceTime(1050);assert.equal(f.state().battle.hp,91);
});
