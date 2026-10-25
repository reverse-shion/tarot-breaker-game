/* Isolated real Starroad event-flow regression: no browser, production storage or main runtime writes. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const Core=require('../caritas-battle-core.js');
class El{
 constructor(t){this.tagName=t;this.children=[];this.hidden=false;this.dataset={};this.style={};this.listeners={};this.textContent='';this.className='';this.id='';const values=new Set();this.classList={add:k=>values.add(k),remove:k=>values.delete(k),contains:k=>values.has(k)}}
 append(...v){this.children.push(...v)}
 appendChild(x){this.children.push(x);return x}
 replaceChildren(...v){this.children=v}
 addEventListener(n,f){this.listeners[n]=f}
 setAttribute(k,v){}
 focus(){}
 click(){this.listeners.click?.({preventDefault(){},stopPropagation(){}})}
 flatten(){return [this,...this.children.flatMap(c=>c.flatten())]}
 querySelector(q){return this.flatten().find(e=>q[0]==='#'?e.id===q.slice(1):e.className?.split(' ').includes(q.slice(1)))||null}
}
function fixture(){
 const shell=new El('main'),creature=new El('div'),body=new El('body');body.classList.add('scene-ready');
 const doc={readyState:'complete',body,createElement:t=>new El(t),getElementById:k=>k==='game-shell'?shell:k==='hoshisuna-caritas'?new El('img'):null,querySelector:k=>k==='.hoshi-caritas'?creature:null};
 const lines=[],events=[],intervals=[],saved=new Map(),pointer={actor:{x:100,y:500},advance:null,colliding:true};
 const window={CaritasBattleCore:Core,TarotStage:{getState:()=>({actors:{shion:pointer.actor}})},TarotHoshisunaCollision:{setActive:v=>{pointer.colliding=v}},
  TarotDialogueUI:{create:o=>{pointer.advance=o.onAdvance;return{show:p=>lines.push(p),hide(){},elements:{layer:new El('section'),button:new El('button')}}}},dispatchEvent:e=>events.push(e.type),addEventListener(){}};
 class MockEvent{constructor(type){this.type=type}}
 const sandbox={window,document:doc,location:{pathname:'/hoshisuna-main.html',search:'?dev=hoshisuna'},CustomEvent:MockEvent,Event:MockEvent,
  sessionStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},setInterval:cb=>(intervals.push(cb),intervals.length),
  clearInterval(){},setTimeout(){return 1},clearTimeout(){},URLSearchParams,console};
 const js=fs.readFileSync(path.join(__dirname,'../caritas-battle-event.js'),'utf8');
 vm.runInNewContext(js,sandbox,{timeout:5000});
 return {shell,body,creature,lines,events,intervals,pointer,window,
  tick:()=>intervals[0](),state:()=>window.CaritasEncounterDebug.getState(),
  button:(root,text)=>root.flatten().find(e=>e.tagName==='button'&&e.textContent===text)};
}
test('Shion notices first, main-style two choices follow, leaving cannot loop',()=>{
 const f=fixture();
 assert.equal(f.state().story,'idle');
 f.pointer.actor={x:1013,y:305};f.tick();
 assert.equal(f.state().story,'notice');assert.equal(f.lines.length,1);assert.equal(f.lines[0].speaker,'シオン');
 assert.match(f.lines[0].text,/様子が妙だ/);
 assert.equal(f.events.filter(x=>x==='tarot-breaker:interaction-start').length,1);
 f.pointer.advance();
 assert.equal(f.state().story,'choice');
 const panel=f.shell.querySelector('#caritas-interaction-choice');
 assert.ok(panel);assert.ok(f.button(panel,'調べる'));
 f.button(panel,'離れる').click();
 assert.equal(f.state().story,'idle');assert.equal(f.state().armed,false);
 f.tick();assert.equal(f.state().story,'idle');
 f.pointer.actor={x:90,y:100};f.tick();assert.equal(f.state().armed,true);
 f.pointer.actor={x:1013,y:305};f.tick();
 assert.equal(f.state().story,'choice');assert.equal(f.lines.length,1,'notice must be one-time per page');
});
test('Inspect opens shared intro, three tactical readings, shared farewell then safe map unlock',()=>{
 const f=fixture();f.pointer.actor={x:1013,y:305};f.tick();f.pointer.advance();
 const panel=f.shell.querySelector('#caritas-interaction-choice');
 f.button(panel,'調べる').click();
 assert.equal(f.state().story,'intro');
 for(let i=0;i<6;i++)f.pointer.advance();
 assert.equal(f.state().story,'battle');
 const root=f.shell.querySelector('#caritas-event');
 f.button(root,'この読みを届ける').click();
 assert.equal(f.state().battle.resonance,34);
 assert.equal(f.state().dialogueBusy,true);
 f.pointer.advance();f.pointer.advance();
 f.button(root,'秘密').click();f.button(root,'自制').click();f.button(root,'この読みを届ける').click();
 assert.equal(f.state().battle.resonance,67);
 f.pointer.advance();f.pointer.advance();
 f.button(root,'無意識').click();f.button(root,'勇気').click();f.button(root,'希望').click();
 f.button(root,'この読みを届ける').click();
 assert.equal(f.state().story,'ending');assert.equal(root.hidden,true);
 assert.equal(f.pointer.colliding,true,'collisions must remain until the farewell ends');
 for(let i=0;i<Core.ENDING.length;i++)f.pointer.advance();
 assert.equal(f.state().story,'complete');assert.equal(f.state().done,true);
 assert.equal(f.pointer.colliding,false);assert.equal(f.creature.hidden,true);
 assert.equal(f.events.filter(x=>x==='tarot-breaker:interaction-end').length,1);
 assert.equal(f.lines.length,1+Core.ENDING.length+6+4);
});
test('Map uses exact main shared dialogue implementation and black-violet status in both locations',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../hoshisuna-main.html'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../caritas-battle-event.css'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'../caritas-battle-event.js'),'utf8');
 assert.ok(html.indexOf('shared-dialogue.js')<html.indexOf('caritas-battle-event.js'));
 assert.match(js,/TarotDialogueUI\.create/);
 assert.match(css,/#caritas-interaction-choice\.visible/);
 assert.match(css,/caritas-dialogue\\[data-speaker="シオン"\\]/);
 assert.match(css,/caritas-dialogue\\[data-speaker="シオリエル"\\]/);
 assert.match(css,/caritas-dialogue\\[data-speaker="カリタス"\\]/);
 assert.match(css,/color:var\\(--speaker-color\\)/);
 assert.doesNotMatch(css,/hue-rotate\\(25deg\\)|brightness\\(\\.34\\)/);
 assert.match(js,/mount:shell/);
 assert.match(js,/ids:\\{layer:"dialogue-layer",advance:"dialogue-advance"/);
 assert.doesNotMatch(js+Core.ENDING.join(''),/聖獣|正体は/);
});
