const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
function harness({dev=true,restoreFails=false}={}){
 const handlers={},nodes={},calls=[];let time=0,near=true,owner=null,departed=false,ui;
 const actors={shion:{x:810,y:145},shiopon:{x:805,y:170},lumiere:{x:815,y:212}};
 function node(){return {hidden:false,children:[],classList:{items:new Set(),add(c){this.items.add(c)},contains(c){return this.items.has(c)},toggle(c,v){v?this.items.add(c):this.items.delete(c)}},listeners:{},append(...a){this.children.push(...a);for(const n of a)if(n.id)nodes[n.id]=n},setAttribute(){},addEventListener(n,f){this.listeners[n]=f},remove(){this.removed=true}};}
 const shell=node();nodes['game-shell']=shell;
 const state=()=>({actors:JSON.parse(JSON.stringify(actors)),lumiereRect:{left:actors.lumiere.x-780,right:actors.lumiere.x-700},viewport:{width:390,height:844},owner,following:true,lumiereEnabled:!departed});
 const scene={capture(){calls.push('capture');return {actors:JSON.parse(JSON.stringify(actors)),departed}},lock(o){owner=o;calls.push('lock')},unlock(o){if(owner===o)owner=null;calls.push('unlock')},clearInput(){calls.push('clear')},getState:state,face(){},gameplayCamera(){calls.push('camera')},focusGate(){calls.push('focus')},nearGate:()=>near,moveAway:()=>Promise.resolve(),perform(c){actors[c.actor]={...c.target};return {promise:Promise.resolve()}},flightPose(p){actors.lumiere={...p}},setLumiereDeparted(v){departed=v},pause(){},async restore(a){if(restoreFails)throw Error('restore');Object.assign(actors,a.actors);departed=a.departed;calls.push('restore')},verify:()=>({completed:!restoreFails&&!!owner})};
 const window={__TAROT_DEV_STAGE3__:dev,TarotAftermathScene:scene,TarotFutureStage3:{createClock(signal){return {now:()=>time,assert(){if(signal.aborted)throw Error('abort')},wait(ms){if(signal.aborted)return Promise.reject(Error('abort'));time+=ms;return Promise.resolve()},dispose(){}}}},TarotDialogueUI:{create(o){ui={show(line){ui.line=line},hide(){},destroy(){},elements:{layer:node()},advance:o.onAdvance};return ui}},addEventListener(n,f){(handlers[n]??=[]).push(f)},removeEventListener(n,f){handlers[n]=(handlers[n]||[]).filter(v=>v!==f)},dispatchEvent(e){for(const f of handlers[e.type]||[])f(e)}};
 const document={hidden:false,getElementById:id=>nodes[id],querySelector:()=>null,createElement:node,addEventListener(){},removeEventListener(){}};
 vm.runInNewContext(fs.readFileSync('star-gate-aftermath.js','utf8'),{window,document,AbortController,CustomEvent:class{constructor(type,{detail}={}){this.type=type;this.detail=detail}},requestAnimationFrame:()=>1,cancelAnimationFrame(){}});
 return {window,calls,nodes,state,ui:()=>ui,near:v=>near=v,notify:(overrides={})=>window.dispatchEvent({type:'tarot-breaker:stage3-session-ended',detail:{id:9,completed:true,restored:true,running:false,scene:{},...overrides}}),click(){nodes['aftermath-inspect'].listeners.click({preventDefault(){},stopPropagation(){}})}};
}
async function flush(){for(let i=0;i<30;i++)await Promise.resolve();}
test('Aftermath is absent from ordinary routes',()=>{const h=harness({dev:false});h.notify();assert.equal(h.window.TarotStarGateAftermath,undefined);assert.deepEqual(h.calls,[])});
test('only clean normal restored Stage3 reports start, and duplicate notification does not acquire again',async()=>{
 for(const override of [{completed:false},{restored:false},{reason:'background'},{error:'cancel'},{recoveryError:'restore'},{running:true},{scene:{owner:2}},{scene:{vision:true}}]){const h=harness();h.notify(override);assert.deepEqual(h.calls,[]);}
 const h=harness();h.notify();h.notify();assert.equal(h.calls.filter(c=>c==='capture').length,1);assert.ok(h.calls.indexOf('capture')<h.calls.indexOf('lock'));await h.window.TarotStarGateAftermath.cancel();
});
test('three introduction Boxes return movement, proximity alone never continues, explicit distance recheck, success retains departure and weak light',async()=>{
 const h=harness();h.notify();for(let i=0;i<3;i++){h.ui().advance();await flush();}
 assert.equal(h.window.TarotStarGateAftermath.getState().state,'GATE_WAIT');assert.equal(h.state().owner,null);
 h.near(false);h.click();await flush();assert.equal(h.window.TarotStarGateAftermath.getState().state,'GATE_WAIT');h.near(true);h.click();await flush();
 for(let i=0;i<8;i++){h.ui().advance();await flush();}
 for(let i=0;i<20;i++)await flush();const result=h.window.TarotStarGateAftermath.getState();assert.equal(result.completed,true);assert.equal(result.dialogues.length,11);assert.equal(h.state().lumiereEnabled,false);assert.ok(result.flight.rect.left>390);assert.equal(h.state().owner,null);assert.ok(h.nodes['game-shell'].classList.contains('aftermath-weak-light'));assert.equal(h.calls.includes('restore'),false);h.notify();assert.equal(h.calls.filter(c=>c==='capture').length,1);
});
test('cancellation restores A0 without restart; restore failure retains lock and never reports success',async()=>{
 for(const restoreFails of [false,true]){const h=harness({restoreFails});h.notify();await h.window.TarotStarGateAftermath.cancel();const result=h.window.TarotStarGateAftermath.getState();assert.equal(result.completed,false);assert.equal(result.restored,!restoreFails);assert.equal(!!h.state().owner,restoreFails);h.ui().advance();h.notify();await flush();assert.equal(h.calls.filter(c=>c==='capture').length,1);assert.equal(h.state().lumiereEnabled,true);}
});

test('cancel during unlocked investigation wait acquires its owner before restoring and verifying A0',async()=>{const h=harness();h.notify();for(let i=0;i<3;i++){h.ui().advance();await flush();}assert.equal(h.state().owner,null);await h.window.TarotStarGateAftermath.cancel();assert.equal(h.window.TarotStarGateAftermath.getState().restored,true);assert.equal(h.state().owner,null);const restore=h.calls.lastIndexOf('restore');assert.equal(h.calls[restore-1],'lock');});
