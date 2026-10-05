const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
function harness(dev=true){
 const handlers={};let player={x:810,y:165};const emitted=[];let interval;
 const buttons={};const prompt={hidden:true,classList:{visible:false,add(){this.visible=true},remove(){this.visible=false},contains(){return this.visible}},setAttribute(){},querySelector(sel){return buttons[sel]??={addEventListener(){}}}};
 const window={__TAROT_DEV_STAGE3__:dev,TarotStage:{getState:()=>({actors:{shion:player}})},TarotDialogue:{getState:()=>({active:false})},TarotStarGateAnomaly:{getState:()=>({running:false})},addEventListener(n,f){(handlers[n]??=[]).push(f)},dispatchEvent(e){emitted.push(e.type);for(const f of handlers[e.type]||[])f(e)},setInterval(f){interval=f},setTimeout(f){f()},TarotAudio:{startFromMovement(){emitted.push('audio-unlock')}}};
 const context={window,document:{createElement:()=>prompt,getElementById:()=>({appendChild(){}})},CustomEvent:class{constructor(type,{detail}={}){this.type=type;this.detail=detail}},setTimeout(f){f()}};
 vm.runInNewContext(fs.readFileSync('star-gate-interaction.js','utf8'),context);
 return{window,emitted,prompt,move(x,y){player={x,y};interval?.()},tick(){interval?.()}};
}
test('integration approach offers choice; leaving releases input and requires spatial exit/reentry',()=>{
 const h=harness();assert.equal(h.window.TarotStarGateInteraction.getState().active,false);
 h.move(810,145);assert.equal(h.window.TarotStarGateInteraction.getState().active,true);
 h.window.TarotStarGateInteraction.leave();assert.equal(h.window.TarotStarGateInteraction.getState().promptLock,false);
 h.tick();assert.equal(h.window.TarotStarGateInteraction.getState().active,false);assert.equal(h.emitted.includes('tarot-breaker:star-gate-investigate'),false);
 h.move(810,205);h.move(810,145);assert.equal(h.window.TarotStarGateInteraction.getState().active,true);
});
test('prompt releases its lock before P0 event dispatch and completed/interrupted attempts never autoreplay',()=>{
 for(const restored of [true,false]){const h=harness();h.move(810,145);h.window.TarotStarGateInteraction.start();
 assert.ok(h.emitted.indexOf('tarot-breaker:interaction-end')<h.emitted.indexOf('tarot-breaker:star-gate-investigate'));
 h.window.dispatchEvent({type:'tarot-breaker:stage3-session-ended',detail:{restored}});h.move(810,205);h.move(810,145);
 assert.equal(h.window.TarotStarGateInteraction.getState().completed,true);assert.equal(h.window.TarotStarGateInteraction.getState().active,false);
 }
});
test('ordinary routes install no interaction or Production backend',()=>{const h=harness(false);assert.equal(h.window.TarotStarGateInteraction,undefined);assert.deepEqual(h.emitted,[])});
test('A inner light geometry restored only for dev, ordinary geometry preserved',()=>{
 function layout(dev){const window={__TAROT_DEV_STAGE3__:dev};const document={querySelector:()=>null,head:{appendChild(){}},createElement:()=>({dataset:{}})};const c=vm.createContext({window,document});for(const file of ['scene-layout.js','scene-preview41-fix.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);return window.TarotSceneLayout.gateAssembly.innerLight;}
 const approved=layout(true),normal=layout(false);assert.equal(approved.w,230.86);assert.ok(Math.abs(approved.x-684.57)<1e-10);assert.equal(approved.y+approved.h,210);assert.equal(normal.w,190);assert.equal(normal.x+normal.w/2,800);assert.equal(normal.y+normal.h,210);
});
