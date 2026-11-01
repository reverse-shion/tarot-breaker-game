/* Isolated real Starroad event-flow regression: no production storage/main writes. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const Core=require('../caritas-battle-core.js');
class El{
 constructor(t){this.naturalWidth=100;this.tagName=t;this.children=[];this.hidden=false;this.dataset={};this.style={};this.listeners={};this.attributes={};this.textContent='';this.className='';this.id='';const values=new Set();this.classList={add:k=>values.add(k),remove:k=>values.delete(k),contains:k=>values.has(k)}}
 append(...v){for(const c of v)c.parentElement=this;this.children.push(...v)}
 appendChild(x){x.parentElement=this;this.children.push(x);return x}
 replaceChildren(...v){for(const c of v)c.parentElement=this;this.children=v}
 addEventListener(n,f){this.listeners[n]=f}
 setAttribute(k,v){this.attributes[k]=v}
 getBoundingClientRect(){return this.rect||{left:16,top:650,width:358,height:168};}
 focus(){this.focusCalls=(this.focusCalls||0)+1}
 blur(){}
 scrollIntoView(){}
 click(){return this.listeners.click?.({preventDefault(){},stopPropagation(){}})}
 flatten(){return [this,...this.children.flatMap(c=>c.flatten())]}
 querySelector(q){return this.flatten().find(e=>q[0]==='#'?e.id===q.slice(1):e.className?.split(' ').includes(q.slice(1)))||null}
}
function fixture({reduced=false,persistentStore=new Map(),fetchReply,storageFails=false,imageMode='failed',waapi=false,realDialogue=false}={}){
 const shell=new El('main'),creature=new El('div'),body=new El('body');body.classList.add('scene-ready');
 const layer=new El('section'),advance=new El('button'),speaker=new El('span'),speechText=new El('span'),next=new El('span');
 layer.id='dialogue-layer';layer.className='tb-dialogue-layer';layer.hidden=true;
 advance.id='dialogue-advance';advance.className='tb-dialogue-window';
 speaker.id='dialogue-speaker';speaker.className='tb-dialogue-speaker';
 speechText.id='dialogue-text';speechText.className='tb-dialogue-text';
 next.id='dialogue-next';next.className='tb-dialogue-next';
 advance.append(speaker,speechText,next);layer.append(advance);shell.append(layer);
 const documentListeners={},windowListeners={},animations=[];
 const create=t=>{const el=new El(t);if(waapi)el.animate=(frames,options)=>{let resolve;const a={options,finished:new Promise(r=>{resolve=r}),finish:()=>resolve(),pause(){this.paused=true},play(){this.paused=false},cancel(){this.cancelled=true}};animations.push(a);return a;};return el;};
 const doc={createDocumentFragment:()=>new El('fragment'),readyState:'complete',hidden:false,body,createElement:create,getElementById:k=>k==='game-shell'?shell:k==='hoshisuna-caritas'?new El('img'):shell.querySelector('#'+k),querySelector:k=>k==='.hoshi-caritas'?creature:null,addEventListener:(n,f)=>documentListeners[n]=f};
 const lines=[],events=[],intervals=[],saved=new Map(),pointer={actor:{x:100,y:500},companion:{x:950,y:305},advance:null,colliding:true,dialogueOptions:null};
 const window={innerHeight:844,TAROBRE_CARITAS_API_URL:'https://test.example/api/caritas-interpret',CaritasBattleCore:Core,CaritasSpecialState:require('../caritas-special-state.js'),TarotStage:{getState:()=>({actors:{shion:pointer.actor,shiopon:pointer.companion}}),perform:command=>{(pointer.stageCommands??=[]).push(command);return {promise:Promise.resolve({completed:true})}}},TarotHoshisunaManifestation:{prepareLeft(){pointer.leftPrepared=(pointer.leftPrepared||0)+1;return Promise.resolve({completed:true})},deployCards(){pointer.cards=true;return true},
   startChant(){pointer.chant="rising";(pointer.chantHistory??=[]).push("rising");return true},
   sealChant(){pointer.chant="sealed";(pointer.chantHistory??=[]).push("sealed");return true},
   moveForward(){pointer.walks=(pointer.walks||0)+1;return Promise.resolve({completed:true})},faceFront(){pointer.front=true;return true},begin(){pointer.mapPhase="charging";pointer.chant="idle";return true},reveal(){pointer.mapPhase="revealed";return true},clear(){pointer.cards=false;pointer.mapPhase="idle";pointer.chant="idle";pointer.clears=(pointer.clears||0)+1;return true},pause(){pointer.paused=true},resume(){pointer.paused=false}},TarotHoshisunaCollision:{setActive:v=>{pointer.colliding=v}},
  TarotHoshisunaAbyss:{setPhase:p=>{(pointer.abyssPhases??=[]).push(p);pointer.abyss=p;return true}},
  TarotDialogueUI:{bind:o=>{pointer.advance=o.onAdvance;pointer.dialogueOptions=o;return{show:p=>lines.push(p),hide(){},elements:{layer:o.layer,button:o.button}}}},dispatchEvent:e=>events.push(e.type),addEventListener:(n,f)=>windowListeners[n]=f,matchMedia:()=>({matches:reduced})};
 class MockEvent{constructor(type){this.type=type}}
 let now=0,id=0;const tasks=new Map(),requests=[];
 class ClockDate extends Date{static now(){return now;}}
 class TestImage extends El{constructor(){super('img');this.naturalWidth=100;}set src(value){this.url=value;if(imageMode==='timeout')return;if(imageMode==='error')this.onerror?.();else this.onload?.();}decode(){return imageMode==='decode-error'?Promise.reject(Error('decode')):Promise.resolve();}}
 const sandbox={...(imageMode==='failed'?{}:{Image:TestImage}),window,document:doc,location:{pathname:'/hoshisuna-main.html',search:'?dev=hoshisuna'},CustomEvent:MockEvent,Event:MockEvent,
  Date:ClockDate,AbortController,fetch:async(url,options)=>{requests.push({url,...options});if(!fetchReply)throw Error('unexpected fetch');return fetchReply(url,options);},
  sessionStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},
  localStorage:{getItem:k=>persistentStore.get(k)||null,setItem:(k,v)=>{if(storageFails)throw Error("quota");persistentStore.set(k,v)},removeItem:k=>persistentStore.delete(k)},setInterval:cb=>(intervals.push(cb),intervals.length),
  requestAnimationFrame:fn=>{fn();return 1},clearInterval(){},setTimeout:(cb,ms)=>{tasks.set(++id,{cb,at:now+ms});return id},clearTimeout:n=>tasks.delete(n),performance:{now:()=>now},URLSearchParams,console};
 const js=fs.readFileSync(path.join(__dirname,'../caritas-battle-event.js'),'utf8');
 if(realDialogue){delete window.TarotDialogueUI;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../shared-dialogue.js'),'utf8'),sandbox);}
 vm.runInNewContext(js,sandbox,{timeout:5000});
 const advanceTime=ms=>{const target=now+ms;for(;;){const due=[...tasks].filter(([,v])=>v.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;tasks.delete(due[0]);due[1].cb();}now=target};
 return {shell,body,creature,lines,events,intervals,animations,pointer,window,advanceTime,requests,persistentStore,windowListeners,
  visibility:hidden=>{doc.hidden=hidden;documentListeners.visibilitychange?.()},
  page:n=>windowListeners[n]?.({persisted:true}),
  storage:raw=>windowListeners.storage?.({key:CHECKPOINT_KEY,newValue:raw}),
  tick:()=>intervals.at(-1)(),state:()=>window.CaritasEncounterDebug.getState(),
  button:(root,text)=>root.flatten().find(e=>{
   if(e.tagName!=='button')return false;
   if(e.textContent===text)return true;
   // The redesign adds a visible reward badge inside each old action button.
   // Resolve by its rendered label; all original gameplay assertions remain.
   const display=text==='この言葉を届ける'?'解釈をそのまま届ける':text;
   return e.children.some(child=>child.className?.split(' ').includes('cb-way-title')&&child.textContent===display);
  })};
}
function assertShionSideFacing(f,side=-1){
 const last=f.pointer.stageCommands.at(-1);
 assert.equal(last.type,'face');
 assert.equal(last.actor,'shion');
 assert.equal(last.target.x,f.pointer.actor.x+side*64,'Shion must face left/right toward Shiopon');
 assert.equal(last.target.y,f.pointer.actor.y,'sideways means a horizontal facing vector');
}
function assertShionWatchingCaritas(f){
 const last=f.pointer.stageCommands.at(-1);
 assert.equal(last.type,'face');
 assert.equal(last.actor,'shion');
 assert.equal(last.target.x,1013);
 assert.equal(last.target.y,210);
}
test('prebattle conversation turns Shion sideways to Shiopon without moving actors',async()=>{
 const f=fixture();
 f.pointer.actor={x:1013,y:305};
 f.pointer.companion={x:950,y:500}; // Vertical offset must not cause an up/down facing.
 f.tick();
 assertShionSideFacing(f);
 f.pointer.advance();assertShionWatchingCaritas(f);
 f.pointer.advance();assertShionWatchingCaritas(f);
 f.pointer.advance();
 f.button(f.shell,'調べる').click();
 assertShionWatchingCaritas(f);
 f.pointer.advance(); // Shion: "言葉が話せるぞ、しおぽん。"
 assertShionSideFacing(f);
 f.pointer.advance(); // Shiopon: "ほんとなの！？"
 assertShionSideFacing(f);
 f.pointer.advance(); // Caritas interrupts
 assertShionWatchingCaritas(f);
 for(let i=0;i<4;i++)f.pointer.advance(); // To Shiopon's first observation
 assertShionWatchingCaritas(f);
 f.pointer.advance(); // Shiopon: "シオンさん。あの子、なんだか苦しそうなの。"
 assertShionSideFacing(f);
 f.pointer.advance(); // Shiopon: "……助けなきゃ。"
 assertShionSideFacing(f);
 f.pointer.advance(); // Shion's warning
 assertShionSideFacing(f);
 f.pointer.advance(); // Shiopon's explanation
 assertShionSideFacing(f);
 f.pointer.advance(); // "確かめてくるの！"
 assertShionSideFacing(f);
 f.pointer.advance(); // Shion: "……しおぽん！"
 assertShionSideFacing(f);
 assert.equal(f.pointer.leftPrepared,undefined,'direction alone never starts movement');
 f.pointer.advance(); // Shiopon moves only after the warning
 assert.equal(f.pointer.leftPrepared,1);
 await new Promise(resolve=>setImmediate(resolve));
 assertShionWatchingCaritas(f); // Abyss swells
 f.pointer.advance();assertShionWatchingCaritas(f);
 f.pointer.advance();assertShionWatchingCaritas(f);
 f.pointer.advance();assertShionWatchingCaritas(f); // Tarot deployment
 f.pointer.advance();
 f.advanceTime(650);
 assertShionSideFacing(f); // "いくぞ、しおぽん。"
 f.pointer.advance();
 assertShionSideFacing(f); // "はい、シオンさん。"
 f.pointer.advance();await new Promise(resolve=>setImmediate(resolve));
 assertShionWatchingCaritas(f); // Invocation
 f.pointer.advance();assertShionWatchingCaritas(f);
 f.pointer.advance();assertShionWatchingCaritas(f); // Transformation
});
test('Shion faces right when Shiopon stands to the right',()=>{
 const f=fixture();f.pointer.actor={x:1013,y:305};f.pointer.companion={x:1100,y:180};
 f.tick();assertShionSideFacing(f,1);
 f.pointer.advance();assertShionWatchingCaritas(f);
});

function advanceNotice(f){
 for(const t of ['……しおぽん、待て。星獣がいる。','滅多に星の国に来ないのに……何か様子がおかしい。','黒紫の靄が……体を覆っている。']){
  assert.equal(f.state().story,'notice');
  assert.equal(f.lines.at(-1).speaker,'シオン');
  assert.equal(f.lines.at(-1).text,t);
  f.pointer.advance();
 }
 assert.equal(f.state().story,'choice');
}
async function advanceScoutToTarot(f){
 const introduction=[
  ['カリタス','く、苦しい……アビスが体を侵蝕するなぞとは……'],
  ['シオン','あの星獣、言葉が話せるぞ、しおぽん。'],
  ['しおぽん','ほんとなの！？'],
  ['カリタス','アビス……どうしてだ……この世の理が崩れたとでもいうのか。'],
  ['カリタス','まさか……'],
  ['カリタス','二人とも近づくでない。'],
  ['カリタス','今の私は何をするか分からんぞ！']
 ];
 const decision=[
  ['しおぽん','アビスが喰べてる？ そんな事って……'],
  ['しおぽん','シオンさん。あの子、なんだか苦しそうなの。'],
  ['しおぽん','……助けなきゃ。'],
  ['シオン','待て、しおぽん。あの黒い靄……危険だ。近づくな。'],
  ['しおぽん','でも……あの子、喰べられて声が消えちゃいそうなの。'],
  ['しおぽん','確かめてくるの！'],
  ['シオン','……しおぽん！']
 ];
 for(const [speaker,t] of [...introduction,...decision]){
  assert.equal(f.lines.at(-1).speaker,speaker);
  assert.equal(f.lines.at(-1).text,t);
  assert.equal(f.pointer.leftPrepared,undefined,'Shiopon must not move during dialogue');
  f.pointer.advance();
 }
 assert.equal(f.pointer.leftPrepared,1,'scouting begins after his own decision and Shion warning');
 assert.equal(f.pointer.abyss,'surge');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.pointer.abyss,'engulfed');
 assert.ok(f.pointer.stageCommands.some(command=>command.actor==='shiopon'&&command.target?.y===210),
   'Shiopon must look at Caritas before reporting the Abyss');
 assertShionWatchingCaritas(f);
 const reaction=[
  ['しおぽん','……っ！闇が広がる！'],
  ['シオン','まずい……このままじゃ、あの星獣が呑まれる。'],
  ['シオン','……何とか助けないと。']
 ];
 for(const [speaker,t] of reaction){
  assert.equal(f.lines.at(-1).speaker,speaker);
  assert.equal(f.lines.at(-1).text,t);
  f.pointer.advance();
 }
 assert.equal(f.lines.at(-1).text,'タロット展開！！');
 assert.equal(f.pointer.cards,undefined);
 f.pointer.advance();
}
async function enter(f){
 f.pointer.actor={x:1013,y:305};f.tick();
 assertShionSideFacing(f);
 advanceNotice(f);
 f.button(f.shell.querySelector('#star-gate-interaction-choice'),'調べる').click();
 await advanceScoutToTarot(f);
 assert.equal(f.state().story,'tarot-deploy');assert.equal(f.pointer.cards,true);
 f.advanceTime(649);assert.equal(f.lines.at(-1).text,'タロット展開！！');
 f.advanceTime(1);assert.equal(f.lines.at(-1).text,'いくぞ、しおぽん。');
 assert.equal(f.pointer.walks,undefined);
 f.pointer.advance();
 assert.equal(f.state().story,'intro');
 assert.equal(f.lines.at(-1).speaker,'しおぽん');
 assert.equal(f.lines.at(-1).text,'はい、シオンさん。');
 assert.equal(f.pointer.walks,1);
 f.pointer.advance();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.state().story,'invocation');
 assert.equal(f.pointer.front,true);
 assert.equal(f.pointer.stageCommands.at(-1).target.y,210);
 assert.equal(f.pointer.stageCommands.filter(x=>x.actor==="shion"&&x.target==="shiopon").length,0);
 assert.equal(f.lines.at(-1).text,'言の葉は鍵、星の光は道しるべ。');
 assert.equal(f.pointer.chant,'rising','shared resonance must begin on the first invocation line');
 const root=f.shell.querySelector('#caritas-event');
 assert.equal(root.hidden,true);
 f.pointer.advance();
 assert.equal(f.lines.at(-1).text,'ステラン、ステラン、ステランーーー 来臨せよ、汝ーーシオリエル！');
 assert.equal(f.pointer.chant,'sealed','the single synchronization crest is before transformation');
 assert.deepEqual(f.pointer.chantHistory,['rising','sealed']);
 assert.equal(f.state().story,'invocation');
 f.pointer.advance();
 assert.equal(f.state().story,'manifestation');
 assert.equal(f.pointer.mapPhase,'charging');
 assert.equal(f.pointer.chant,'idle','5.5s transformation begins only after chant is sealed');
 assert.equal(f.pointer.stageCommands.at(-1).target.y,210);
 f.advanceTime(5499);assert.equal(f.state().story,'manifestation');
 f.advanceTime(1);assert.equal(f.state().story,'manifested');
 assert.equal(f.pointer.mapPhase,'revealed');
 assert.equal(f.lines.at(-1).speaker,'シオリエル');
 assert.equal(f.lines.at(-1).text,'シオン。星獣が完全に喰べられる前に、闇から解き放つ。');
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
 advanceNotice(f);
 f.button(f.shell,'離れる').click();
 assert.equal(f.state().story,'idle');assert.equal(f.state().armed,false);
 f.pointer.actor={x:90,y:100};f.tick();
 assert.equal(f.state().armed,true);
});
test('first Shion speech uses shared main dialogue; choices use main official panel',()=>{
 const f=fixture();f.pointer.actor={x:1013,y:305};f.tick();
 const options=f.pointer.dialogueOptions;
 assert.equal(f.lines.at(-1).speaker,'シオン');
 assert.equal(f.shell.querySelector('#dialogue-advance').focusCalls||0,0,'first Shion speech must not trigger visible focus outline');
 const count=f.lines.length;
  advanceNotice(f);
  const choice=f.shell.querySelector('#star-gate-interaction-choice');
 assert.equal(f.shell.querySelector('#dialogue-advance').focusCalls||0,0,'conversation does not force focus');
 assert.equal(choice.querySelector('#caritas-interaction-inspect').focusCalls||0,0,'original main choice does not force focus');
 assert.equal(f.pointer.dialogueOptions,options,'original shared controller throughout');
 assert.equal(f.lines.length,count+2,'three notice lines before choice');
 assert.match(choice.querySelector('#star-gate-interaction-text').textContent,/調べてみるか/);
 assert.equal(choice.style.left,undefined,'main stylesheet owns all choice positioning');
 assert.equal(choice.style.width,undefined);
 assert.equal(choice.style.bottom,undefined);
 f.pointer.advance();f.pointer.advance();
 assert.equal(f.state().story,'choice');assert.equal(f.lines.length,count+2,'dialogue taps cannot auto-select inspection');
 f.button(choice,'離れる').click();
 assert.equal(f.state().dialogueBusy,false);assert.equal(choice.hidden,true);
 f.pointer.actor={x:90,y:100};f.tick();f.pointer.actor={x:1013,y:305};f.tick();
 assert.equal(f.state().story,'choice');
 assert.match(choice.querySelector('#star-gate-interaction-text').textContent,/調べてみるか/);
 f.button(choice,'調べる').click();
 assert.equal(choice.hidden,true);assert.equal(f.lines.at(-1).speaker,'カリタス');
 assert.equal(f.shell.querySelector('#dialogue-advance').focusCalls||0,0,'subsequent lines do not force focus either');
});
test('real shared dialogue remains hidden during native main choice activation',()=>{
 for(const key of ['Enter',' ','Spacebar'])for(const label of ['調べる','離れる']){
  const f=fixture({reduced:true,realDialogue:true});f.pointer.actor={x:1013,y:305};f.tick();
  for(let i=0;i<3;i++)f.shell.querySelector('#dialogue-advance').click();
   assert.equal(f.state().story,'choice');
  const choice=f.shell.querySelector('#star-gate-interaction-choice');
  assert.equal(choice.querySelector('.star-gate-interaction-actions').listeners.keydown,undefined,'no custom choice key handler');
  let prevented=false;
  f.windowListeners.keydown({key,preventDefault(){prevented=true;},stopPropagation(){}});
  assert.equal(prevented,false,'hidden shared controller cannot intercept native choice');
  f.button(choice,label).click();
  assert.equal(f.state().story,label==='調べる'?'intro':'idle');
  assert.equal(choice.hidden,true);
 }
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
 assert.equal(darknessText(),'100%');
 f.advanceTime(1050);assert.equal(f.lines.at(-1).speaker,'カリタス');
 assert.equal(darknessText(),'80%');
 assert.equal(resonanceText(),'27/100');
 assert.equal(hpText(),'100/100');
 assert.match(f.lines.at(-1).text,/怖いのか/);
 f.pointer.advance();assert.equal(f.state().story,'enemy-turn');
 assert.equal(hpText(),'100/100');
 f.advanceTime(1050);assert.equal(f.state().battle.turn,1);
 assert.equal(hpText(),'91/100','HP loss appears only after Caritas actually strikes');
});
function commitSpecial(f,root,name='月'){
 f.button(root,'必殺技').click();assert.equal(f.state().story,'selecting');
 const selector=root.querySelector('.cb-special-selection');
 const btn=selector.flatten().find(e=>e.className==='cb-special-card'&&e.children.at(-1).textContent===name);assert.ok(btn);btn.click();
 f.button(root,'このカードの言葉を届ける').click();assert.equal(f.state().special.phase,'SHION_LINE');
}
function finishSpecial(f){
 f.pointer.advance();f.pointer.advance();f.pointer.advance();
 assert.equal(f.state().special.phase,'ART_PLAYBACK');f.advanceTime(2601);
 assert.equal(f.state().special.phase,'PURIFICATION');f.advanceTime(1100);
 assert.equal(f.state().special.phase,'CARITAS_REPLY');f.pointer.advance();f.pointer.advance();
 assert.equal(f.state().special.phase,'RETURNING');f.advanceTime(900);
}
test('ordinary tarot MAX opens all three choices, commits A, resolves B and retains DONE',async()=>{
 const f=fixture(),root=await enter(f);
 for(let i=0;i<12&&f.state().battle.phase==='read';i++)read(f,root,i===0?['不安','忍耐','癒し']:null);
 assert.equal(f.state().battle.phase,'finisher');assert.equal(f.state().battle.resonance,100);
 const before=f.state().battle.dark;
 commitSpecial(f,root);assert.equal(f.state().battle.dark,before);assert.equal(f.state().battle.used,false);
 assert.equal(f.lines.at(-1).speaker,'シオン');
 root.querySelector('.cb-read').click();assert.equal(f.state().battle.dark,before);
 finishSpecial(f);
 assert.equal(f.state().battle.phase,'complete');assert.equal(f.state().special.phase,'DONE');
 assert.equal(root.hidden,true);assert.equal(f.pointer.colliding,false);assert.equal(f.creature.hidden,true);
 assert.equal(f.lines.filter(l=>l.text==='……世話になった。').length,1);
 assert.equal(f.events.filter(x=>x==='tarot-breaker:interaction-end').length,1);
 const resumed=fixture({persistentStore:f.persistentStore});assert.equal(resumed.state().done,true);assert.equal(resumed.creature.hidden,true);assert.equal(resumed.pointer.colliding,false);assert.equal(resumed.pointer.mapPhase,'idle');
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
test('visibility and BFCache pause art and purification without applying B early',async()=>{
 const f=fixture(),root=await enter(f);
 for(let i=0;i<12&&f.state().battle.phase==='read';i++)read(f,root,i===0?['不安','忍耐','癒し']:null);
 commitSpecial(f,root);f.pointer.advance();f.pointer.advance();f.pointer.advance();f.advanceTime(501);
 f.visibility(true);f.page('pagehide');f.advanceTime(15000);assert.equal(f.state().special.phase,'ART_PLAYBACK');
 f.visibility(false);f.page('pageshow');f.advanceTime(2100);assert.equal(f.state().special.phase,'PURIFICATION');
 assert.equal(f.state().battle.phase,'finisher');f.advanceTime(300);f.page('pagehide');f.advanceTime(15000);
 assert.equal(f.state().special.resolutionApplied,false);f.page('pageshow');f.advanceTime(800);
 assert.equal(f.state().special.phase,'CARITAS_REPLY');assert.equal(f.state().battle.dark,0);
});
test('original Alenon/main markup is used without any Caritas dialogue CSS',()=>{
 const a=fs.readFileSync(path.join(__dirname,'../alenon.html'),'utf8');
 const b=fs.readFileSync(path.join(__dirname,'../hoshisuna-main.html'),'utf8');
 const section=(s,id)=>{
  const start=s.indexOf('<section id="'+id+'" class="tb-dialogue-layer"');
  assert.notEqual(start,-1);
  const end=s.indexOf('</section>',start);
  assert.notEqual(end,-1);
  return s.slice(start,end+10);
 };
 const expected=section(a,'prologue-dialogue-layer')
  .replaceAll('prologue-dialogue-layer','dialogue-layer')
  .replaceAll('prologue-dialogue','dialogue-advance')
  .replaceAll('prologue-speaker','dialogue-speaker')
  .replaceAll('prologue-line','dialogue-text');
 const actual=section(b,'dialogue-layer');
 const compact=s=>s.replace(/\s+/g,' ').trim();
 assert.equal(compact(actual),compact(expected),'original dialogue markup matches main');
 const css=fs.readFileSync(path.join(__dirname,'../caritas-battle-event.css'),'utf8');
 assert.ok(!css.includes('.tb-dialogue')&&!css.includes('#dialogue-'),'event cannot style main dialogue');
});
test('shared main dialogue IDs, nonproduction isolation and styling are unchanged',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../hoshisuna-main.html'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../caritas-battle-event.css'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'../caritas-battle-event.js'),'utf8');
 const f=fixture();
 assert.ok(html.indexOf('shared-dialogue.js')<html.indexOf('caritas-battle-event.js'));
 assert.ok(html.indexOf('caritas-special-state.js')<html.indexOf('caritas-battle-event.js'));
 assert.ok(fs.readFileSync(path.join(__dirname,'../dev-checkpoints.js'),'utf8').includes('caritas-special-state.js'));
 assert.equal(f.pointer.dialogueOptions.layer,f.shell.querySelector('#dialogue-layer'));
 assert.equal(f.pointer.dialogueOptions.button,f.shell.querySelector('#dialogue-advance'));
 assert.equal(f.pointer.dialogueOptions.speaker,f.shell.querySelector('#dialogue-speaker'));
 assert.equal(f.pointer.dialogueOptions.text,f.shell.querySelector('#dialogue-text'));
 assert.equal(f.pointer.dialogueOptions.next,f.shell.querySelector('#dialogue-next'));
 assert.equal(f.shell.flatten().filter(el=>el.className==='tb-dialogue-layer').length,1,'exactly one canonical main layer');
 assert.doesNotMatch(css,/\.tb-dialogue|#dialogue-|--speaker-|caritas-dialogue|#star-gate-interaction-choice|\.star-gate-interaction-actions/);
  assert.match(html,/star-gate-interaction\.css\?v=main-official-choice/,'official main choice stylesheet');
 assert.ok(css.includes("#caritas-event{position:fixed;inset:0;z-index:2200"));
 assert.doesNotMatch(js,/dialogue\.elements\.button\.focus\(|prompt\.querySelector\("#caritas-interaction-inspect"\)\?\.focus\(/,'no programmatic focus ring on dialogue or choice');
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

test('completed special retains first-delivery receipt and prevents a new encounter on reload',async()=>{
 const f=fixture({fetchReply:()=>aiReply([])}),root=await enter(f);
 await openWritten(f,root).click();completeWritten(f);f.advanceTime(1400);
 for(let i=0;i<12&&f.state().battle.phase==='read';i++)read(f,root,i===0?['不安','忍耐','癒し']:null);
 commitSpecial(f,root);finishSpecial(f);
 assert.equal(saved(f).special.completed,true);assert.equal(saved(f).firstWrittenDelivered,true);
 const again=fixture({persistentStore:f.persistentStore});assert.equal(again.state().done,true);assert.equal(again.state().story,'complete');
});

test('failed reward storage leaves meters and first reward unclaimed and preserves draft',async()=>{
 const store=new Map();let fail=false;
 const set=store.set.bind(store);store.set=(k,v)=>{if(fail)throw Error('quota');return set(k,v)};
 const f=fixture({persistentStore:store,fetchReply:()=>aiReply([])}),root=await enter(f);
 fail=true;
 await openWritten(f,root,'大丈夫').click();completeWritten(f);
 assert.equal(f.state().battle.resonance,0);
 assert.equal(f.state().saveBlocked,true);
 assert.equal(root.querySelector('.cb-ai-input').value,'大丈夫');
 assert.match(root.querySelector('.cb-save-problem').children[0].textContent,/保存できません/);
 fail=false;
 f.button(root,'再試行').click();
 assert.equal(f.state().battle.resonance,50);
 assert.equal(saved(f).aiConfirmedCalls,1);
 assert.equal(saved(f).firstWrittenDelivered,true);
});

const S=require('../caritas-special-state.js');
function savedFixture(phase='NONE',options={}){
 let r=S.create({...Core.newGame(),phase:'finisher',resonance:100,dark:42},'qa-run');
 if(phase!=='NONE'){r=S.commit(r,'18-the-moon');while(r.special.phase!==phase)r=S.transition(r,S.PHASES[S.PHASES.indexOf(r.special.phase)+1]);}
 const persistentStore=new Map([[CHECKPOINT_KEY,JSON.stringify(r)]]);
 return fixture({persistentStore,...options});
}
test('every committed phase restores same page, B boundary and locked map',()=>{
 for(const phase of S.PHASES){
  const f=savedFixture(phase);assert.equal(f.state().special.phase,phase);
  assert.equal(f.state().battle.dark,S.PHASES.indexOf(phase)<5?42:0);
  assert.equal(f.state().owned,phase!=='DONE');assert.equal(f.state().done,phase==='DONE');
  if(phase==='DUAL_INCANTATION'){assert.equal(f.lines.at(-1).actor,'shion-shioriel');assert.equal(f.lines.at(-1).speaker,'シオン＆シオリエル');}
  if(phase==='PURIFICATION'){f.advanceTime(1099);assert.equal(f.state().battle.dark,42);f.advanceTime(1);assert.equal(f.state().battle.dark,0);}
  if(phase==='RETURNING'){f.advanceTime(900);assert.equal(saved(f).special.phase,'DONE');assert.equal(saved(f).revision,1);f.page('pageshow');assert.equal(saved(f).revision,1);}
 }
});
test('selection cancel has no writes or consumption; selection reload returns to finisher',()=>{
 const f=savedFixture(),root=f.shell.querySelector('#caritas-event'),raw=f.persistentStore.get(CHECKPOINT_KEY);
 f.button(root,'必殺技').click();assert.equal(root.querySelector('.cb-special-selection').children[1].children.length,3);
 f.button(root,'戻る').click();assert.equal(f.persistentStore.get(CHECKPOINT_KEY),raw);assert.equal(f.state().battle.dark,42);
 f.button(root,'必殺技').click();const g=fixture({persistentStore:f.persistentStore});assert.equal(g.state().story,'battle');assert.equal(g.state().special.committed,false);
});
test('all cards use exact solo dialogue and one dual page before art, then distinct Caritas reply',()=>{
 const chants=['星幻迷宮──アストラル・ミラージュ！！','星獣咆哮──アストラル・ブレイヴ！！','星望祈願──アストラル・グリモワール！！'];
 for(const [i,c] of Core.CARDS.entries()){
  const f=savedFixture(),root=f.shell.querySelector('#caritas-event');commitSpecial(f,root,c.name);
  assert.equal(f.lines.at(-1).actor,'shion');assert.doesNotMatch(f.lines.at(-1).text,/アストラル/);
  f.pointer.advance();assert.equal(f.lines.at(-1).actor,'shioriel');f.pointer.advance();assert.equal(f.lines.at(-1).text,chants[i]);assert.equal(f.lines.at(-1).actor,'shion-shioriel');
  f.pointer.advance();assert.equal(f.state().dialogueBusy,false);f.advanceTime(2601+1100);assert.equal(f.lines.at(-1).actor,'caritas');assert.notEqual(f.lines.at(-1).text,'……世話になった。');
 }
});
test('purification save failure stays at A, retry commits B once without replaying AI or consumption',()=>{
 const f=savedFixture('PURIFICATION'),root=f.shell.querySelector('#caritas-event');
 const store=f.persistentStore,set=store.set.bind(store);let fail=true;store.set=(k,v)=>{if(fail)throw Error('quota');return set(k,v);};
 f.advanceTime(1100);assert.equal(f.state().special.phase,'PURIFICATION');assert.equal(f.state().battle.dark,42);assert.equal(f.state().saveBlocked,true);
 fail=false;const retry=f.button(root,'再試行');retry.click();retry.click();assert.equal(f.state().battle.dark,0);assert.equal(f.state().special.phase,'CARITAS_REPLY');assert.equal(saved(f).revision,1);
 f.pointer.advance();assert.equal(saved(f).revision,2);
});
test('corrupt saves remain byte-identical, only reload/title actions are offered',()=>{
 for(const raw of ['{broken',JSON.stringify({version:15,battle:{}})]){
  const store=new Map([[CHECKPOINT_KEY,raw]]),f=fixture({persistentStore:store});assert.equal(f.state().recovery,true);assert.equal(store.get(CHECKPOINT_KEY),raw);assert.equal(f.state().owned,true);
  const panel=f.shell.querySelector('.cb-save-problem');assert.deepEqual(panel.children.filter(e=>e.tagName==='button').map(e=>e.textContent),['もう一度読み込む','タイトルへ戻る']);
 }
});
test('stale revision and storage notification block older tab without overwriting newer save',()=>{
 const f=savedFixture('SHION_LINE');const updated={...saved(f),revision:8};f.persistentStore.set(CHECKPOINT_KEY,JSON.stringify(updated));
 f.pointer.advance();assert.equal(f.state().recovery,true);assert.equal(saved(f).revision,8);
 const g=savedFixture();g.storage('other');assert.equal(g.state().recovery,true);
});
test('art success (including reduced motion) alone marks seen; all failure modes stay unseen',async()=>{
 for(const imageMode of ['ready','error','decode-error','timeout'])for(const reduced of [false,true]){
  const f=savedFixture('ART_PLAYBACK',{imageMode,reduced});await flush();f.advanceTime(imageMode==='timeout'?3800:2601);
  assert.equal(f.state().special.phase,'PURIFICATION',imageMode);assert.equal(saved(f).seenTechniques['18-the-moon']===true,imageMode==='ready');
  const root=f.shell.querySelector('#caritas-event');assert.equal(root.querySelector('.cb-special-foreground').hidden,imageMode!=='ready');
 }
});
test('only seen card admits short mode; durations remain 120/600/450 and dialogue is never skipped',()=>{
 const f=savedFixture();let r=saved(f);r.seenTechniques['18-the-moon']=true;f.persistentStore.set(CHECKPOINT_KEY,JSON.stringify(r));
 const g=fixture({persistentStore:f.persistentStore}),root=g.shell.querySelector('#caritas-event');
 g.button(root,'必殺技').click();root.querySelector('.cb-special-cards').children[0].click();
 const input=root.querySelector('.cb-special-short').children[0];input.checked=true;input.listeners.change();
 g.button(root,'このカードの言葉を届ける').click();assert.equal(saved(g).special.playbackMode,'short');
 g.advanceTime(120);assert.equal(g.state().special.phase,'SHION_LINE');g.pointer.advance();g.pointer.advance();g.pointer.advance();
 g.advanceTime(600);assert.equal(g.state().special.phase,'ART_PLAYBACK');g.advanceTime(1);assert.equal(g.state().special.phase,'PURIFICATION');
 g.advanceTime(449);assert.equal(g.state().special.phase,'PURIFICATION');g.advanceTime(1);assert.equal(g.state().special.phase,'CARITAS_REPLY');
});

test('ordinary read and dialogue release do not advance on failed storage',async()=>{
 const f=fixture(),root=await enter(f);choose(f,root,['不安','忍耐','癒し']);
 const set=f.persistentStore.set.bind(f.persistentStore);let fail=true;f.persistentStore.set=(k,v)=>{if(fail)throw Error('quota');return set(k,v);};
 f.button(root,'この言葉を届ける').click();f.pointer.advance();f.pointer.advance();f.pointer.advance();
 assert.equal(f.state().battle.turn,0);assert.equal(f.state().story,'battle');assert.equal(f.state().saveBlocked,true);
 fail=false;f.button(root,'再試行').click();assert.equal(f.state().battle.turn,1);assert.equal(f.state().story,'word-strike');
 const g=savedFixture(),r=g.shell.querySelector('#caritas-event');g.persistentStore.set=()=>{throw Error('quota');};
 g.button(r,'対話で解放').click();assert.equal(g.state().battle.phase,'finisher');assert.equal(g.state().battle.dark,42);assert.equal(g.state().dialogueBusy,false);assert.equal(g.state().saveBlocked,true);
});

test('WAAPI missing finished event uses visible watchdog and rejects stale generation callbacks',async()=>{
 const f=savedFixture('SHION_LINE',{waapi:true}),root=f.shell.querySelector('#caritas-event');const old=f.animations.at(-1);
 f.pointer.advance();assert.equal(f.state().special.phase,'SHIORIEL_LINE');old.finish();await flush();assert.equal(f.state().special.phase,'SHIORIEL_LINE');
 f.pointer.advance();f.pointer.advance();f.advanceTime(1);const art=f.animations.at(-1);assert.equal(art.options.duration,2600);
 f.advanceTime(500);f.visibility(true);f.page('pagehide');f.advanceTime(15000);assert.equal(f.state().special.phase,'ART_PLAYBACK');assert.equal(art.paused,true);
 f.visibility(false);f.page('pageshow');f.advanceTime(2260);assert.equal(f.state().special.phase,'PURIFICATION');
 art.finish();await flush();assert.equal(f.state().special.phase,'PURIFICATION');assert.equal(f.state().battle.dark,42);
 f.advanceTime(1260);assert.equal(f.state().special.phase,'CARITAS_REPLY');assert.equal(f.state().battle.dark,0);
});

test('dialogue-only release keeps legacy farewell, with visible retry before exposing map',()=>{
 const f=savedFixture(),root=f.shell.querySelector('#caritas-event');
 f.button(root,'対話で解放').click();assert.equal(f.state().special.committed,false);assert.equal(f.state().battle.dark,0);
 f.pointer.advance();f.advanceTime(2600+1100);assert.equal(f.lines.at(-1).text,'……世話になった。');
 f.pointer.advance();const set=f.persistentStore.set.bind(f.persistentStore);let fail=true;f.persistentStore.set=(k,v)=>{if(fail)throw Error('quota');return set(k,v);};
 f.advanceTime(900);assert.equal(root.hidden,false);assert.equal(f.state().done,false);assert.equal(f.state().owned,true);assert.equal(f.pointer.colliding,true);assert.equal(root.dataset.saveError,'true');
 fail=false;f.button(root,'再試行').click();assert.equal(f.state().done,true);assert.equal(root.hidden,true);assert.equal(f.pointer.colliding,false);
 assert.equal(f.lines.filter(l=>l.actor==='caritas').length,1,'special card replies never leak into dialogue route');
});

test('tarot deployment finishes before the separate buddy call and pauses across background/BFCache',async()=>{
 const f=fixture();f.pointer.actor={x:1013,y:305};f.tick();advanceNotice(f);
  f.button(f.shell,'調べる').click();
 await advanceScoutToTarot(f);
 assert.equal(f.state().story,'tarot-deploy');assert.equal(f.pointer.cards,true);
 f.advanceTime(300);f.visibility(true);f.page('pagehide');f.advanceTime(5000);
 f.pointer.advance();assert.equal(f.lines.at(-1).text,'タロット展開！！');assert.equal(f.pointer.walks,undefined);
 f.visibility(false);f.advanceTime(5000);assert.equal(f.lines.at(-1).text,'タロット展開！！');
 f.page('pageshow');f.advanceTime(349);assert.equal(f.lines.at(-1).text,'タロット展開！！');
 f.advanceTime(1);assert.equal(f.lines.at(-1).text,'いくぞ、しおぽん。');
 assert.equal(f.lines.filter(l=>l.text==='いくぞ、しおぽん。').length,1);
 f.pointer.advance();assert.equal(f.lines.at(-1).speaker,'しおぽん');assert.equal(f.pointer.walks,1);
});
test('unavailable card deployment recovers the prompt without advancing to chant or leaving cards',async()=>{
 const f=fixture();f.window.TarotHoshisunaManifestation.deployCards=()=>false;
 f.pointer.actor={x:1013,y:305};f.tick();advanceNotice(f);f.button(f.shell,'調べる').click();
 await advanceScoutToTarot(f);
 assert.equal(f.state().story,'choice');assert.equal(f.pointer.cards,false);assert.equal(f.pointer.walks,undefined);
 assert.equal(f.lines.some(l=>l.text.includes('来臨せよ')),false);
});
