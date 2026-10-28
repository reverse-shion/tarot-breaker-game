/* Isolated real Starroad event-flow regression: no production storage/main writes. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const Core=require('../caritas-battle-core.js');
class El{
 constructor(t){this.tagName=t;this.children=[];this.hidden=false;this.dataset={};this.style={};this.listeners={};this.attributes={};this.textContent='';this.className='';this.id='';const values=new Set();this.classList={add:k=>values.add(k),remove:k=>values.delete(k),contains:k=>values.has(k)}}
 append(...v){for(const c of v)c.parentElement=this;this.children.push(...v)}
 appendChild(x){x.parentElement=this;this.children.push(x);return x}
 replaceChildren(...v){for(const c of v)c.parentElement=this;this.children=v}
 addEventListener(n,f){this.listeners[n]=f}
 setAttribute(k,v){this.attributes[k]=v}
 focus(){}
 blur(){}
 scrollIntoView(){}
 click(){return this.listeners.click?.({preventDefault(){},stopPropagation(){}})}
 flatten(){return [this,...this.children.flatMap(c=>c.flatten())]}
 querySelector(q){return this.flatten().find(e=>q[0]==='#'?e.id===q.slice(1):e.className?.split(' ').includes(q.slice(1)))||null}
}
function fixture({reduced=false,persistentStore=new Map(),fetchReply,storageFails=false}={}){
 const shell=new El('main'),creature=new El('div'),body=new El('body');body.classList.add('scene-ready');
 const documentListeners={},windowListeners={};
 const doc={readyState:'complete',hidden:false,body,createElement:t=>new El(t),getElementById:k=>k==='game-shell'?shell:k==='hoshisuna-caritas'?new El('img'):null,querySelector:k=>k==='.hoshi-caritas'?creature:null,addEventListener:(n,f)=>documentListeners[n]=f};
 const lines=[],events=[],intervals=[],saved=new Map(),pointer={actor:{x:100,y:500},advance:null,colliding:true,dialogueOptions:null};
 const window={TAROBRE_CARITAS_API_URL:'https://test.example/api/caritas-interpret',CaritasBattleCore:Core,TarotStage:{getState:()=>({actors:{shion:pointer.actor}}),perform:command=>{(pointer.stageCommands??=[]).push(command);return {promise:Promise.resolve({completed:true})}}},TarotHoshisunaManifestation:{moveForward(){pointer.walks=(pointer.walks||0)+1;return Promise.resolve({completed:true})},faceFront(){pointer.front=true;return true},begin(){pointer.mapPhase="charging";return true},reveal(){pointer.mapPhase="revealed";return true},clear(){pointer.mapPhase="idle";pointer.clears=(pointer.clears||0)+1;return true},pause(){pointer.paused=true},resume(){pointer.paused=false}},TarotHoshisunaCollision:{setActive:v=>{pointer.colliding=v}},
  TarotDialogueUI:{create:o=>{pointer.advance=o.onAdvance;pointer.dialogueOptions=o;return{show:p=>lines.push(p),hide(){},elements:{layer:new El('section'),button:new El('button')}}}},dispatchEvent:e=>events.push(e.type),addEventListener:(n,f)=>windowListeners[n]=f,matchMedia:()=>({matches:reduced})};
 class MockEvent{constructor(type){this.type=type}}
 let now=0,id=0;const tasks=new Map(),requests=[];
 class ClockDate extends Date{static now(){return now;}}
 const sandbox={window,document:doc,location:{pathname:'/hoshisuna-main.html',search:'?dev=hoshisuna'},CustomEvent:MockEvent,Event:MockEvent,
  Date:ClockDate,AbortController,fetch:async(url,options)=>{requests.push({url,...options});if(!fetchReply)throw Error('unexpected fetch');return fetchReply(url,options);},
  sessionStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},
  localStorage:{getItem:k=>persistentStore.get(k)||null,setItem:(k,v)=>{if(storageFails)throw Error("quota");persistentStore.set(k,v)},removeItem:k=>persistentStore.delete(k)},setInterval:cb=>(intervals.push(cb),intervals.length),
  clearInterval(){},setTimeout:(cb,ms)=>{tasks.set(++id,{cb,at:now+ms});return id},clearTimeout:n=>tasks.delete(n),performance:{now:()=>now},URLSearchParams,console};
 const js=fs.readFileSync(path.join(__dirname,'../caritas-battle-event.js'),'utf8');
 vm.runInNewContext(js,sandbox,{timeout:5000});
 const advanceTime=ms=>{const target=now+ms;for(;;){const due=[...tasks].filter(([,v])=>v.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;tasks.delete(due[0]);due[1].cb();}now=target};
 return {shell,body,creature,lines,events,intervals,pointer,window,advanceTime,requests,persistentStore,
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
 const hero=root.flatten().find(e=>e.className==='cb-hud hero');
 const enemy=root.flatten().find(e=>e.className==='cb-hud enemy');
 const hpText=()=>hero.children[1].children[1].textContent;
 const resonanceText=()=>hero.children[3].children[1].textContent;
 const darknessText=()=>enemy.children[1].children[1].textContent;
 assert.equal(hpText(),'100/100','HP is not lost before the counterattack');
 assert.equal(resonanceText(),'0/100','meters wait for the attack impact');
 assert.equal(darknessText(),'100/100');
 f.advanceTime(1050);assert.equal(f.lines.at(-1).speaker,'カリタス');
 assert.equal(darknessText(),'80/100');
 assert.equal(resonanceText(),'27/100');
 assert.equal(hpText(),'100/100');
 assert.match(f.lines.at(-1).text,/怖いのか/);
 f.pointer.advance();assert.equal(f.state().story,'enemy-turn');
 assert.equal(hpText(),'100/100');
 f.advanceTime(1050);assert.equal(f.state().battle.turn,1);
 assert.equal(hpText(),'91/100','HP loss appears only after Caritas actually strikes');
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


// Real event entry + mocked transport: these tests exercise delivery, not just core arithmetic.
const CHECKPOINT_KEY='tb:dev:hoshisuna:caritas-full-reading-v1';
const aiReply=(ids=[])=>({ok:true,json:async()=>({shion:'俺も、ここにいる。',caritas:'……その言葉は、聞こえた。',understandingIds:ids,previewOnly:true})});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function openWritten(f,root,text='大丈夫'){
 if(!f.state().readingOpen)f.button(root,'リーディングを始める').click();
 const input=root.querySelector('.cb-ai-input');input.value=text;input.listeners.input?.();
 return root.querySelector('.cb-ai-send');
}
function completeWritten(f){f.pointer.advance();f.pointer.advance();}
function saved(f){return JSON.parse(f.persistentStore.get(CHECKPOINT_KEY));}
function meter(root){return root.flatten().find(e=>e.className==='cb-hud hero').children[3].children[1].textContent;}

test('written delivery commits once only after both shared dialogue pages, then reveals reward',async()=>{
 let resolveReply;
 const f=fixture({fetchReply:()=>new Promise(resolve=>{resolveReply=resolve})}),root=await enter(f);
 const send=openWritten(f,root,'  大丈夫  ');
 const pending=send.click();send.click();
 assert.equal(f.requests.length,1,'double click cannot duplicate request');
 assert.equal(JSON.parse(f.requests[0].body).reading,'大丈夫');
 resolveReply(aiReply([]));await pending;
 assert.equal(f.state().battle.resonance,0,'usable reply alone is not a delivered reading');
 assert.equal(f.lines.at(-1).speaker,'シオン');
 f.pointer.advance();assert.equal(f.lines.at(-1).speaker,'カリタス');
 assert.equal(f.state().battle.resonance,0);
 f.pointer.advance();
 assert.equal(f.state().story,'written-light');
 assert.equal(f.state().battle.resonance,50);
 assert.equal(saved(f).firstWrittenDelivered,true);
 assert.equal(saved(f).aiConfirmedCalls,1);
 assert.equal(meter(root),'0/100','meter waits for the light reaching its destination');
 send.click();assert.equal(f.requests.length,1);
 f.advanceTime(1400);
 assert.equal(f.state().story,'battle');assert.equal(meter(root),'50/100');
 assert.equal(f.state().battle.aiInsightTurn,0,'no recognized themes still consumes this opportunity');
 openWritten(f,root,'別の言葉').click();assert.equal(f.requests.length,1);
 assert.doesNotMatch(f.persistentStore.get(CHECKPOINT_KEY),/大丈夫|俺も/,'do not persist private free text');
});

test('later written opportunity earns +25 and reload cannot replay the first +50',async()=>{
 const f=fixture({fetchReply:()=>aiReply([])}),root=await enter(f);
 await openWritten(f,root).click();completeWritten(f);f.advanceTime(1400);
 const restored=fixture({persistentStore:f.persistentStore,fetchReply:()=>aiReply([])});
 const rr=restored.shell.querySelector('#caritas-event');
 assert.equal(restored.state().battle.resonance,50);
 openWritten(restored,rr).click();assert.equal(restored.requests.length,0);
 read(restored,rr,['秘密','勇気','希望']);
 const before=restored.state().battle.resonance;
 await openWritten(restored,rr,'一緒に進もう').click();completeWritten(restored);restored.advanceTime(1400);
 assert.equal(restored.state().battle.resonance,Math.min(100,before+25));
 assert.equal(saved(restored).aiConfirmedCalls,2);
});

test('reward animation pauses in background and final +25 caps at finisher without counterattack',async()=>{
 const battle={...Core.newGame(),resonance:90};
 const persistentStore=new Map([[CHECKPOINT_KEY,JSON.stringify({version:14,battle,aiConfirmedCalls:0,firstWrittenDelivered:true})]]);
 const f=fixture({persistentStore,fetchReply:()=>aiReply([])}),root=f.shell.querySelector('#caritas-event');
 await openWritten(f,root).click();completeWritten(f);
 assert.equal(f.state().battle.phase,'finisher');assert.equal(f.state().battle.resonance,100);
 const hp=f.state().battle.hp;
 f.advanceTime(400);f.visibility(true);f.advanceTime(5000);
 assert.equal(f.state().story,'written-light');assert.equal(meter(root),'90/100');
 f.visibility(false);f.advanceTime(1000);
 assert.equal(f.state().story,'battle');assert.equal(meter(root),'100/100');
 assert.equal(f.state().battle.hp,hp);assert.equal(f.button(root,'必殺技').disabled,false);
});

test('failed response keeps draft, allowance and first reward; successful retry grants once',async()=>{
 let calls=0;
 const f=fixture({fetchReply:()=>++calls===1?{ok:false,status:429,json:async()=>({error:'ai_upstream_quota'})}:aiReply([])}),root=await enter(f);
 const input=root.querySelector('.cb-ai-input');
 await openWritten(f,root,'大丈夫').click();
 assert.equal(input.value,'大丈夫');assert.equal(f.state().battle.resonance,0);
 assert.equal(saved(f).aiConfirmedCalls,0);assert.notEqual(saved(f).firstWrittenDelivered,true);
 f.advanceTime(8100);
 await root.querySelector('.cb-ai-send').click();completeWritten(f);f.advanceTime(1400);
 assert.equal(f.state().battle.resonance,50);assert.equal(saved(f).aiConfirmedCalls,1);
});

test('whitespace, oversized text and background sends cannot reach transport',async()=>{
 const f=fixture({fetchReply:()=>aiReply([])}),root=await enter(f);
 await openWritten(f,root,' 　\n ').click();
 await openWritten(f,root,'あ'.repeat(701)).click();
 assert.equal(f.requests.length,0);
 const send=openWritten(f,root,'うん');f.visibility(true);await send.click();assert.equal(f.requests.length,0);
 f.visibility(false);await send.click();assert.equal(f.requests.length,1);
 completeWritten(f);f.advanceTime(1400);assert.equal(f.state().battle.resonance,50);
});

test('malformed or empty usable-dialogue response never grants or consumes a first reward',async()=>{
 const f=fixture({fetchReply:()=>({ok:true,json:async()=>({shion:'',caritas:'……',understandingIds:[]})})}),root=await enter(f);
 await openWritten(f,root).click();
 assert.equal(f.state().battle.resonance,0);assert.equal(saved(f).aiConfirmedCalls,0);
 assert.notEqual(saved(f).firstWrittenDelivered,true);assert.equal(f.state().dialogueBusy,false);
});

test('completed battle retains first-delivery receipt after its checkpoint is cleared',async()=>{
 const f=fixture({fetchReply:()=>aiReply([])}),root=await enter(f);
 await openWritten(f,root).click();completeWritten(f);f.advanceTime(1400);
 for(let i=0;i<12&&f.state().battle.phase==='read';i++)read(f,root,i===0?['不安','忍耐','癒し']:null);
 f.button(root,'必殺技').click();f.advanceTime(1700+1500+2600+1100);f.pointer.advance();f.advanceTime(900);
 assert.equal(f.state().story,'complete');assert.equal(saved(f).battle,null);assert.equal(saved(f).firstWrittenDelivered,true);
 const again=fixture({persistentStore:f.persistentStore,fetchReply:()=>aiReply([])}),rr=await enter(again);
 await openWritten(again,rr).click();completeWritten(again);again.advanceTime(1400);
 assert.equal(again.state().battle.resonance,25,'first-ever bonus survives a new encounter');
});
