/* Executes Alenon's real inline script. Scheduling, DOM and media are test doubles. */
const fs = require('node:fs'), vm = require('node:vm');
module.exports = function page(search, options = {}) {
  const elements = new Map(), audio = [], frames = [], timers = [], listeners = {}, lines = [];
  let now = 10000;
  const html = fs.readFileSync('alenon.html','utf8');
  const imageSources = [...html.matchAll(/<img[^>]*src="([^"]+)"/g)].map(match=>match[1]);
  let releaseDecode;
  const decodeWait=options.deferDecode?new Promise(resolve=>{releaseDecode=resolve;}):Promise.resolve();
  const session = options.session || new Map([['tarot-breaker:map-journey-v1', JSON.stringify({landingMemoryDone:true,gardenStory:{shioponDone:true,lumiereDone:true,joined:true},companion:{mode:'following',x:999}})]]);
  const production = options.production || new Map([['tarot-breaker:progress-v1','untouched production bytes']]);
  const accesses = [];
  function storage(bytes, label) { return {
    getItem(k) { accesses.push(['read',label,k]); if (label==='session' && k.includes(':dev:') && options.readError) throw Error('denied'); return bytes.get(k)??null; },
    setItem(k,v) { accesses.push(['write',label,k]); if ((!options.allowProductionWrites && (label==='production' || !k.includes(':dev:'))) || options.writeError) throw Error('forbidden'); bytes.set(k,v); },
    removeItem(k) { accesses.push(['remove',label,k]); throw Error('forbidden'); },
  }; }
  function e(key) {
    if (!elements.has(key)) {
      const classes = new Set();
      elements.set(key,{hidden:false,clientWidth:390,clientHeight:844,dataset:{},style:{setProperty(){}},textContent:'',children:[],listeners:{},
        classList:{add:(...xs)=>xs.forEach(x=>classes.add(x)),remove:(...xs)=>xs.forEach(x=>classes.delete(x)),contains:x=>classes.has(x),toggle:(x,v)=>v?classes.add(x):classes.delete(x)},
        setAttribute(){},getAttribute:k=>k==='src'?key:null,
        addEventListener(t,f){(this.listeners[t] ||= []).push(f);},
        appendChild(x){this.children.push(x);if(x.id)elements.set(x.id,x);},replaceChildren(...xs){this.children=xs;},querySelector:e,
        getBoundingClientRect:()=>({left:0,top:0,width:390,height:844}),
      });
    }
    return elements.get(key);
  }
  class Audio {constructor(src){this.src=src;this.paused=true;this.currentTime=0;this.duration=10;this.playCalls=0;audio.push(this);}setAttribute(){}addEventListener(){}pause(){this.paused=true;}play(){this.playCalls++;this.paused=false;return this.reject?Promise.reject(Error('gesture')):Promise.resolve();}}
  const imageQueue = [];
  class Image {
    constructor(){this.complete=true;this.naturalWidth=512;this.naturalHeight=512;}
    set src(value){this._src=value;const action=()=>options.imageError?this.onerror?.():this.onload?.(); if(options.deferImages)imageQueue.push(action);else queueMicrotask(action);}
    get src(){return this._src;}
    decode(){return options.decodeError?Promise.reject(Error('decode')):decodeWait;}
  }
  let releaseCollision;
  const collision = options.collision || JSON.parse(fs.readFileSync('assets/maps/alenon-collision.json','utf8'));
  const collisionWait = options.deferCollision ? new Promise(resolve=>{releaseCollision=resolve;}) : Promise.resolve();
  const h={console,URLSearchParams,Math,Promise,Event,CustomEvent:class extends Event {},Image,Audio,
    location:{search,href:'',reload(){}},innerWidth:390,innerHeight:844,performance:{now:()=>now},navigator:{userActivation:{isActive:true}},
    localStorage:storage(production,'production'),sessionStorage:storage(session,'session'),
    requestAnimationFrame:f=>(frames.push(f),frames.length),cancelAnimationFrame(){},
    setTimeout:f=>(timers.push(f),timers.length),clearTimeout(){},setInterval(){},clearInterval(){},
    addEventListener:(t,f)=>(listeners[t] ||= []).push(f),dispatchEvent:event=>(listeners[event.type]||[]).forEach(f=>f(event)),
    document:{body:e('body'),documentElement:e('root'),getElementById:key=>key==='alenon-resume-status'?elements.get(key):e(key),querySelector:e,
      querySelectorAll:selector=>selector==='#world img, #tarot-stage img'?imageSources.map(e):[],
      createElement:tag=>e(Symbol(tag)),addEventListener:(t,f)=>(listeners[t] ||= []).push(f)},
    fetch:async()=>{await collisionWait;if(options.fetchError)throw Error('network');return {ok:true,json:async()=>collision};},
    TarotDialogueUI:{bind:()=>({show:line=>lines.push(line),hide(){}})},
  };
  h.window=h;vm.createContext(h);
  for(const file of ['map-journey.js','route-registry.js','progress.js','dev-checkpoints.js','progress-resume.js','alenon-resume.js','public-continue.js','alenon-public-continue.js'])vm.runInContext(fs.readFileSync(file,'utf8'),h);
  const source=[...fs.readFileSync('alenon.html','utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
  const exposure=`window.testAlenon={player,story,ride,layout,orbInteraction,resetPlayer,preparePrologue,runPrologue,updateOrbInteractionRange,beginBoarding,beginPadExit,finishPadLanding,bootAlenonContinue,get ready(){return continueReady},get session(){return continueSession},get collisionReady(){return alenonCollisionReady},advance(){dialogueState.advanceResolve?.();dialogueState.advanceResolve=null;dialogueState.active=false}};`;
  vm.runInContext(source.replace('      if (continuePublicRequest) {\n        bootAlenonContinue();',exposure+'\n      if (continuePublicRequest) {\n        bootAlenonContinue();'),h);
  return {h,e,audio,lines,frames,timers,listeners,session,production,accesses,
    releaseCollision:()=>releaseCollision?.(),releaseDecode:()=>releaseDecode?.(),releaseImages:()=>imageQueue.splice(0).forEach(f=>f()),
    async flush(){for(let i=0;i<12;i++)await new Promise(setImmediate);},
    async tick(){now+=100;frames.splice(0).forEach(f=>f(now));timers.splice(0).forEach(f=>f());h.testAlenon?.advance();await this.flush();},
  };
};
