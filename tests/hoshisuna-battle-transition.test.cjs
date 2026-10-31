const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

function fixture({reduced=false,caritas=true}={}) {
  const events = new EventTarget();
  const docEvents = new EventTarget();
  let currentId = 0;
  const timers = new Map();
  let removed = 0;
  const nodes = [];
  const parent = {
    append(node) { nodes.push(node); },
  };
  function element(tag) {
    const state = {tag,dataset:{},hidden:false,children:[],style:{props:{},setProperty(k,v){this.props[k]=v;}},events:{},
      setAttribute(){},
      addEventListener(name,fn){this.events[name]=fn;},
      append(...elems){this.children.push(...elems);},
      remove(){removed++;this.isRemoved=true;},
    };
    return state;
  }
  const battle=element('section');
  const caritasObj=caritas?{getBoundingClientRect:()=>({left:245,top:210,width:100,height:80})}:null;
  const doc={body:parent, hidden:false, documentElement:{clientWidth:390,clientHeight:844},
    createElement:element,
    getElementById(id){return id==='caritas-event'?battle:null;},
    querySelector(sel){return sel==='.hoshi-caritas'?caritasObj:null;},
    addEventListener:docEvents.addEventListener.bind(docEvents)
  };
  const win={innerWidth:390,innerHeight:844,matchMedia:()=>({matches:reduced}),
    addEventListener:events.addEventListener.bind(events)};
  vm.runInNewContext(fs.readFileSync(path.join(root,'hoshisuna-battle-transition.js'),'utf8'),{
    window:win,document:doc,console,
    setTimeout(fn,delay){const id=++currentId;timers.set(id,{fn,delay});return id;},
    clearTimeout(id){timers.delete(id);}
  });
  function emit(name,owner) {
    const event = new Event(name);
    if(owner!==undefined) Object.defineProperty(event,'detail',{value:{source:owner}});
    events.dispatchEvent(event);
  }
  function time(ms) {
    for(const [id,job] of [...timers.entries()].sort((a,b)=>a[1].delay-b[1].delay)){
      if(job.delay<=ms && timers.has(id)){timers.delete(id);job.fn();}
    }
  }
  return {emit,time,doc,battle,nodes,timers,removed:()=>removed,docEvents};
}

test('Caritas encounter adds exactly one ground-origin ink overlay within existing battle window',()=>{
  const f=fixture();
  f.emit('tarot-breaker:hoshisuna-transition-start','not-caritas');
  assert.equal(f.nodes.length,0);
  f.emit('tarot-breaker:hoshisuna-transition-start','hoshisuna_caritas_prompt');
  assert.equal(f.nodes.length,1);
  const layer=f.nodes[0];
  assert.equal(layer.className,'abyss-transition');
  assert.equal(layer.children.length,3);
  assert.equal(layer.children[1].src,'./assets/events/hoshisuna/battle/abyss-encroachment.svg');
  assert.equal(layer.style.props['--abyss-x'],'295px');
  assert.equal(layer.style.props['--abyss-y'],'276.4px');
  assert.equal(layer.children[2].className,'abyss-transition__veil');
  assert.equal(f.battle.dataset.abyssTransition,'covering');
  f.emit('tarot-breaker:hoshisuna-transition-start','hoshisuna_caritas_prompt');
  assert.equal(f.nodes.length,1,'duplicate start must be ignored');
  f.time(670);
  assert.equal(f.battle.dataset.abyssTransition,'revealing');
  f.time(1000);
  assert.equal(f.battle.dataset.abyssTransition,undefined);
  assert.equal(f.removed(),1);
  assert.equal(f.timers.size,0);
});

test('darkness fully cleans up on pagehide or encounter cancellation without controlling gameplay',()=>{
  const f=fixture();
  f.emit('tarot-breaker:hoshisuna-transition-start','hoshisuna_caritas_prompt');
  f.emit('tarot-breaker:interaction-end','another_event');
  assert.equal(f.removed(),0);
  f.emit('pagehide');
  assert.equal(f.removed(),1);
  assert.equal(f.timers.size,0);
  assert.equal(f.battle.dataset.abyssTransition,undefined);
  f.emit('tarot-breaker:hoshisuna-transition-start','hoshisuna_caritas_prompt');
  f.emit('tarot-breaker:interaction-end','hoshisuna_caritas_prompt');
  assert.equal(f.removed(),2);
});

test('reduced motion and missing Caritas DOM get safe lightweight fallback',()=>{
  const f=fixture({reduced:true,caritas:false});
  f.emit('tarot-breaker:hoshisuna-transition-start','hoshisuna_caritas_prompt');
  assert.equal(f.nodes.length,1);
  assert.equal(f.battle.dataset.abyssTransition,undefined);
  assert.equal(f.nodes[0].style.props['--abyss-x'],'206.7px');
  assert.equal(f.timers.size,1);
  f.time(160);
  assert.equal(f.removed(),1);
});

test('transition wiring does not alter battle clock, dialogue, save, map BGM or music start',()=>{
  const event=fs.readFileSync(path.join(root,'caritas-battle-event.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'hoshisuna-main.html'),'utf8');
  const css=fs.readFileSync(path.join(root,'hoshisuna-battle-transition.css'),'utf8');
  const svg=fs.readFileSync(path.join(root,'assets/events/hoshisuna/battle/abyss-encroachment.svg'),'utf8');
  assert.match(event,/tarot-breaker:hoshisuna-transition-start/);
  assert.match(event,/stage\("engulfing",2600,beginBattle\)/);
  assert.equal(event.match(/tarot-breaker:hoshisuna-transition-start/g).length,1);
  assert.match(html,/hoshisuna-battle-transition\.css\?v=abyss-transition-v1/);
  assert.match(html,/hoshisuna-battle-transition\.js\?v=abyss-transition-v1/);
  assert.match(html,/data-bgm-url="\.\/assets\/audio\/bgm\/hoshisuna-star-memory-time-prayer\.mp3"/);
  assert.match(html,/hoshisuna-battle-audio\.js\?v=1/);
  assert.ok(!/html2canvas|canvas\.toDataURL|canvas\.toBlob/.test(css+fs.readFileSync(path.join(root,'hoshisuna-battle-transition.js'),'utf8')));
  assert.match(css,/prefers-reduced-motion/);
  assert.match(css,/#160e25/);
  assert.match(svg,/<svg[\s\S]*?<path/);
  assert.equal((svg.match(/<path /g)||[]).length,3);
});
