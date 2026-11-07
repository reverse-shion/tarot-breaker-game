'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {stateFor,framing,createController}=require('../caritas-battle-camera.js');
function fixture(){
 let dimensions={width:390,height:330};const painted=[];
 const controller=createController({measure:()=>dimensions,paint:v=>painted.push(v),freeze:()=> 'matrix(1,0,0,1,-123,0)'});
 controller.resize();
 return {controller,painted,resize:value=>{dimensions=value;controller.resize();}};
}
test('camera routes reading, delivery/wait, opponent response and special without gameplay state',()=>{
 assert.equal(stateFor(), 'READING');
 for(const phase of ['word-strike','written-light','enemy-turn'])assert.equal(stateFor({phase}),'REACTION');
 assert.equal(stateFor({waiting:true}),'REACTION');
 assert.equal(stateFor({speaker:'カリタス'}),'REACTION');
 assert.equal(stateFor({speaker:'シオン'}),'READING');
 for(const phase of ['selecting','special','purifying','purified'])assert.equal(stateFor({phase,waiting:true}),'SPECIAL');
});
test('long AI waits and multi-page replies do not restart pans',()=>{
 const {controller,painted}=fixture();controller.update({waiting:true});
 const count=painted.length;
 for(let i=0;i<20;i++)controller.update({waiting:true,speaker:'カリタス'});
 assert.equal(painted.length,count);assert.equal(painted.at(-1).mode,'REACTION');
 controller.update({});assert.equal(painted.at(-1).mode,'READING');
});
test('IME locks a partially completed pan and queues reactions until blur',()=>{
 const {controller,painted}=fixture();controller.update({waiting:true});controller.focus();
 assert.equal(painted.at(-1).mode,'INPUT_LOCK');assert.equal(painted.at(-1).frozen,'matrix(1,0,0,1,-123,0)');
 const count=painted.length;controller.update({phase:'special'});controller.resize();controller.focus();
 assert.equal(painted.length,count);assert.equal(controller.getState().locked,true);
 controller.blur();assert.equal(painted.at(-1).mode,'SPECIAL');assert.equal(painted.at(-1).instant,true);
});
test('keyboard resizes never overwrite frozen dimensions; return remeasures without accumulating offsets',()=>{
 const {controller,painted,resize}=fixture();controller.focus();
 resize({width:390,height:70});assert.equal(controller.getState().height,330);
 resize({width:390,height:330});controller.blur();
 assert.equal(painted.at(-1).x,-312);assert.equal(painted.at(-1).height,330);
 for(let i=0;i<5;i++){controller.focus();controller.blur();}
 assert.equal(painted.at(-1).x,-312);
 resize({width:320,height:250});assert.equal(painted.at(-1).x,-256);
});
test('invalid hidden dimensions do not destroy the last valid composition',()=>{
 const {controller,painted,resize}=fixture();resize({width:0,height:0});
 assert.equal(painted.at(-1).width,390);assert.equal(painted.at(-1).height,330);
 controller.update({phase:'word-strike'});assert.equal(painted.at(-1).x,-11.7);
});
test('special fits the occupied world and ordinary pan is absolute rather than cumulative',()=>{
 for(const width of [320,375,390,430]){
  const normal=framing('READING',width,330),wide=framing('SPECIAL',width,330);
  assert.equal(normal.scale,1);assert.equal(normal.x,-.8*width);
  assert.ok(1.85*width*wide.scale<=width+.001);assert.equal(wide.x,0);
 }
});

// Mount-level viewport lifecycle, including the flags used by real CSS.
function mounted(height=844,search='?dev=hoshisuna&camera=a02'){
 const fs=require('node:fs'),vm=require('node:vm');
 const handlers={},viewportHandlers={},timers=new Map();let nextId=0;
 class Element{
  constructor(){this.dataset={};this.children=[];this.listeners={};this.style={getPropertyValue:k=>this.style[k]||'',setProperty:(k,v)=>this.style[k]=v};}
  append(...items){for(const item of items){if(item.parent)item.parent.children=item.parent.children.filter(x=>x!==item);item.parent=this;this.children.push(item);}}
  setAttribute(){} addEventListener(k,v){this.listeners[k]=v;}
  getBoundingClientRect(){return {width:390,height:330,top:0,bottom:394};}
 }
 const root=new Element(),arena=new Element(),input=new Element(),frame=new Element(),statusBand=new Element();
 const actors=Array.from({length:5},()=>new Element());arena.append(...actors);
 const win={innerHeight:height,visualViewport:{height,offsetTop:0,addEventListener:(k,v)=>viewportHandlers[k]=v},addEventListener:(k,v)=>handlers[k]=v,getComputedStyle:()=>({transform:'matrix(1,0,0,1,-312,0)'})};
 const sandbox={window:win,location:{pathname:'/hoshisuna-main.html',search},document:{createElement:()=>new Element()},URLSearchParams,clearTimeout:id=>timers.delete(id),setTimeout:fn=>{timers.set(++nextId,fn);return nextId;}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../caritas-battle-camera.js'),'utf8'),sandbox);
 const controller=win.CaritasBattleCamera.mount({root,arena,input,actors,frame,statusBand});
 return {root,arena,input,win,controller,resize:(h,top=0)=>{win.visualViewport.height=h;win.visualViewport.offsetTop=top;viewportHandlers.resize();},flush:()=>{for(const fn of [...timers.values()])fn();}};
}
test('mount moves only world actors; fixed mode and duplicate camera params are inert',()=>{
 for(const search of ['?dev=hoshisuna','?dev=hoshisuna&camera=a02&camera=a02','?camera=a02']){
  const f=mounted(844,search);assert.equal(f.controller,null);assert.equal(f.arena.children.length,5);assert.deepEqual(f.root.dataset,{});
 }
 const f=mounted();assert.equal(f.arena.children.length,1);assert.equal(f.arena.children[0].children.length,6);
 assert.equal(f.root.dataset.camera,'READING');
});
test('short hardware-keyboard viewport restores the battlefield without requiring another resize',()=>{
 const f=mounted(300);f.input.listeners.focus();assert.equal(f.root.dataset.cameraCompact,'true');
 f.input.listeners.blur();assert.equal(f.root.dataset.cameraInput,'false');assert.equal(f.root.dataset.cameraCompact,'false');assert.equal(f.root.dataset.camera,'READING');
});
test('mount keeps a stable world matrix across viewport scroll, rapid refocus, and delayed closing',()=>{
 const f=mounted();f.input.listeners.focus();const world=f.arena.children[0],frozen=world.style.transform;
 f.resize(360,75);f.controller.update({waiting:true});assert.equal(world.style.transform,frozen);
 assert.equal(f.root.style['--cb-camera-visible-top'],'75px');
 f.input.listeners.blur();assert.equal(f.root.dataset.camera,'INPUT_LOCK');
 f.input.listeners.focus();f.flush();assert.equal(f.root.dataset.camera,'INPUT_LOCK');
 f.input.listeners.blur();f.resize(844);assert.equal(f.root.dataset.camera,'REACTION');assert.equal(f.root.dataset.cameraCompact,'false');
 f.resize(844,0);assert.equal(f.root.style['--cb-camera-visible-top'],'0px');
});
test('short special playback requests an immediate wide camera without adding a delay',()=>{
 const {controller,painted}=fixture();controller.update({phase:'special',short:true});
 assert.equal(painted.at(-1).mode,'SPECIAL');assert.equal(painted.at(-1).instant,true);
});

test('repeated same-size ResizeObserver callbacks do not snap a travelling camera',()=>{
 const {controller,painted,resize}=fixture();
 controller.update({waiting:true});
 const len=painted.length;
 resize({width:390,height:330});resize({width:390,height:330});
 assert.equal(painted.length,len);
 assert.equal(painted.at(-1).instant,false);
 controller.update({});
 assert.equal(painted.at(-1).instant,false);
});
test('a real arena resize remains immediate and updates the camera viewport',()=>{
 const {painted,resize}=fixture();
 resize({width:430,height:330});
 assert.equal(painted.at(-1).width,430);
 assert.equal(painted.at(-1).instant,true);
});
