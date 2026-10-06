const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const LINES=[
  ["lumiere", "シ……オンさま……\nシオンさま！"],
  ["shion", "……リュミエール？"],
  ["shiopon", "シオンさま、大丈夫ぴょん？\nずっと呼んでたぴょん……"],
  ["shion", "今のは……\n……いや。今は、それより――"],
  ["shiopon", "……初めて、食べられたの。"],
  ["shiopon", "星の声が……食べられたの。"],
  ["shion", "食べられた？"],
  ["lumiere", "……私にも、初めての事で。"],
  ["lumiere", "少なくとも、安全を確かめるまでは星門は使わない方がよさそうです。"],
  ["lumiere", "アリエット様なら、きっと原因がわかるかもしれません。"],
  ["shion", "……そうだな。\nアリエットに相談しよう。"],
  ["lumiere", "では、私は先に星砂の準備をしてきます。\nお二人は、東側から来てください。"],
  ["shion", "分かった。頼む。"],
  ["shiopon", "リュミエール、またあとでね。"]
];
function harness({dev=true,restoreFails=false,unlockFails=false,inputRemains=false,followLost=false,blockReturn=false,overlap=false,npcRemains=false}={}){
 const handlers={},docHandlers={},nodes={},calls=[],waits=[],motions=[],shown=[];const facing={};let focused=false;let time=0,owner=null,departed=false,ui,returnResolve,holds=0;
 const actors={shion:{x:810,y:145},shiopon:overlap?{x:810,y:202}:{x:805,y:170},lumiere:{x:815,y:212}};
 const visibility={shion:1,shiopon:0,lumiere:0};
 function node(){return {hidden:false,children:[],classList:{items:new Set(),add(c){this.items.add(c)},contains(c){return this.items.has(c)},toggle(c,v){v?this.items.add(c):this.items.delete(c)}},listeners:{},append(...a){this.children.push(...a);for(const n of a)if(n.id)nodes[n.id]=n},setAttribute(){},addEventListener(n,f){this.listeners[n]=f},remove(){this.removed=true}};}
 const shell=node();nodes['game-shell']=shell;
 const state=()=>({actors:JSON.parse(JSON.stringify(actors)),visibility:{...visibility},lumiereRect:{left:actors.lumiere.x-780,right:actors.lumiere.x-700},viewport:{width:390,height:844},owner,inputSuspended:!!owner||inputRemains,npcSuspended:!!owner||npcRemains,following:!followLost,lumiereEnabled:!departed});
 const scene={capture(){calls.push('capture');return {actors:JSON.parse(JSON.stringify(actors)),visibility:{...visibility},departed,following:true}},lock(o){owner=o;calls.push('lock')},unlock(o){calls.push('unlock');if(unlockFails||owner!==o)return false;owner=null;return true},clearInput(){calls.push('clear')},getState:state,setActorVisibility(actor,value){visibility[actor]=value;calls.push('visibility:'+actor+':'+value);return true},face(actor,target){facing[actor]=target},gameplayCamera(){focused=false;calls.push('camera')},focusGate(){focused=true;calls.push('focus')},moveAway:()=>Promise.resolve(),perform(c){motions.push(c);actors[c.actor]={...c.target};return {promise:Promise.resolve()}},flightPose(p){actors.lumiere={...p}},setLumiereDeparted(v){departed=v},pause(){},async restore(a){if(restoreFails)throw Error('restore');Object.assign(actors,a.actors);if(a.visibility)Object.assign(visibility,a.visibility);departed=a.departed;calls.push('restore')},verify:()=>({completed:!restoreFails&&!!owner})};
 const window={__TAROT_DEV_STAGE3__:dev,TarotAftermathScene:scene,TarotFutureStage3:{createClock(signal){return {now:()=>time,assert(){if(signal.aborted)throw Error('abort')},wait(ms){if(signal.aborted)return Promise.reject(Error('abort'));waits.push(ms);if(ms===300&&++holds===3&&blockReturn)return new Promise(resolve=>{returnResolve=()=>{time+=ms;resolve()}});time+=ms;return Promise.resolve()},dispose(){}}}},TarotDialogueUI:{create(o){ui={show(line){ui.line=line;shown.push({text:line.text,facing:{...facing},focused});calls.push('box:'+owner)},hide(){},destroy(){},elements:{layer:node()},advance:o.onAdvance};return ui}},addEventListener(n,f){(handlers[n]??=[]).push(f)},removeEventListener(n,f){handlers[n]=(handlers[n]||[]).filter(v=>v!==f)},dispatchEvent(e){for(const f of handlers[e.type]||[])f(e)}};
 const document={hidden:false,getElementById:id=>nodes[id],querySelector:()=>null,createElement:node,addEventListener(n,f){(docHandlers[n]??=[]).push(f)},removeEventListener(n,f){docHandlers[n]=(docHandlers[n]||[]).filter(v=>v!==f)}};
 vm.runInNewContext(fs.readFileSync('star-gate-aftermath.js','utf8'),{window,document,AbortController,CustomEvent:class{constructor(type,{detail}={}){this.type=type;this.detail=detail}}});
 return {window,calls,waits,motions,shown,nodes,state,hidden(v){document.hidden=v;for(const f of [...(docHandlers.visibilitychange||[])])f()},ui:()=>ui,releaseReturn:()=>returnResolve?.(),notify:(overrides={})=>window.dispatchEvent({type:'tarot-breaker:stage3-session-ended',detail:{id:9,completed:true,restored:true,running:false,scene:{},...overrides}})};
}
async function flush(){for(let i=0;i<40;i++)await Promise.resolve();}
async function start(h){h.notify();await flush();assert.equal(h.window.TarotStarGateAftermath.getState().line,1);}
async function boxes(h,count=14){for(let i=0;i<count;i++){h.ui().advance();await flush();}for(let i=0;i<100&&!['COMPLETED','CANCELLED','RESTORE_FAILED','RETURN_HOLD'].includes(h.window.TarotStarGateAftermath.getState().state);i++)await flush();}
test('Aftermath is absent from ordinary routes',()=>{const h=harness({dev:false});h.notify();assert.equal(h.window.TarotStarGateAftermath,undefined);assert.deepEqual(h.calls,[])});
test('Stage3 handoff stays Shion-only until Aftermath introduction reveals both companions',async()=>{const h=harness();h.notify();assert.deepEqual(h.state().visibility,{shion:1,shiopon:0,lumiere:0});await flush();assert.equal(h.window.TarotStarGateAftermath.getState().line,1);assert.deepEqual(h.state().visibility,{shion:1,shiopon:1,lumiere:1});assert.ok(h.calls.indexOf('visibility:lumiere:1')<h.calls.indexOf('box:aftermath:9'));assert.ok(h.calls.indexOf('visibility:shiopon:1')<h.calls.indexOf('box:aftermath:9'));await h.window.TarotStarGateAftermath.cancel();});
test('only clean normal restored Stage3 reports start, and duplicate notification does not acquire again',async()=>{
 for(const override of [{completed:false},{restored:false},{reason:'background'},{error:'cancel'},{recoveryError:'restore'},{running:true},{scene:{owner:2}},{scene:{vision:true}}]){const h=harness();h.notify(override);assert.deepEqual(h.calls,[]);}
 const h=harness();h.notify();h.notify();assert.equal(h.calls.filter(c=>c==='capture').length,1);assert.ok(h.calls.indexOf('capture')<h.calls.indexOf('lock'));await h.window.TarotStarGateAftermath.cancel();
});
test('14 exact Boxes run continuously under one owner without Interact or normal status UI; success retains departure and weak light',async()=>{
 const h=harness();let notifications=0;h.window.addEventListener('tarot-breaker:aftermath-ended',()=>notifications++);await start(h);
 for(let i=0;i<14;i++){assert.equal(h.state().owner,'aftermath:9');assert.equal(h.state().inputSuspended,true);assert.equal(h.window.TarotStarGateAftermath.getState().line,i+1);h.ui().advance();await flush();}
 for(let i=0;i<100&&!h.window.TarotStarGateAftermath.getState().completed;i++)await flush();const result=h.window.TarotStarGateAftermath.getState();
 assert.equal(result.completed,true);assert.deepEqual(JSON.parse(JSON.stringify(result.dialogues.map(d=>[d.actor,d.text]))),LINES);assert.equal(h.state().lumiereEnabled,false);assert.ok(result.flight.rect.left>390);assert.equal(h.state().owner,null);assert.equal(h.state().inputSuspended,false);assert.ok(h.nodes['game-shell'].classList.contains('aftermath-weak-light'));assert.equal(h.calls.includes('restore'),false);
 assert.equal(h.calls.filter(c=>c==='lock').length,1);assert.equal(h.calls.filter(c=>c==='unlock').length,1);assert.equal(h.nodes['aftermath-inspect'],undefined);assert.equal(h.nodes['aftermath-status'],undefined);assert.equal(result.states.some(s=>s.name==='GATE_WAIT'),false);assert.equal(notifications,1);h.notify();assert.equal(h.calls.filter(c=>c==='capture').length,1);
 assert.equal(result.dialogues[0].time,300);assert.equal(result.dialogues[1].time-result.dialogues[0].time,300);assert.equal(result.dialogues[4].time-result.dialogues[3].time,1250);const end=result.states.at(-1).time,exit=result.states.find(s=>s.name==='RETURN_HOLD').time;assert.equal(end-exit,300);
});
test('cancellation restores A0 without restart; restore failure retains lock and visible reload notice',async()=>{
 for(const restoreFails of [false,true]){const h=harness({restoreFails});await start(h);await h.window.TarotStarGateAftermath.cancel();const result=h.window.TarotStarGateAftermath.getState();assert.equal(result.completed,false);assert.equal(result.restored,!restoreFails);assert.equal(!!h.state().owner,restoreFails);assert.equal(h.nodes['aftermath-status'].hidden,false);assert.match(h.nodes['aftermath-status'].children[1].textContent,/再読み込み/);h.ui().advance();h.notify();await flush();assert.equal(h.calls.filter(c=>c==='capture').length,1);assert.equal(h.state().lumiereEnabled,true);}
});
test('cancel during continuous observation keeps owned restoration and only then unlocks',async()=>{const h=harness();await start(h);for(let i=0;i<6;i++){h.ui().advance();await flush();}assert.equal(h.state().owner,'aftermath:9');await h.window.TarotStarGateAftermath.cancel();assert.equal(h.window.TarotStarGateAftermath.getState().restored,true);assert.equal(h.state().owner,null);const restore=h.calls.lastIndexOf('restore');assert.equal(h.calls[restore-1],'lock');});
test('a wait resolved just before backgrounding cannot advance the Box until visible; hidden cancellation never waits for visibility',async()=>{
 const h=harness();await start(h);h.ui().advance();h.hidden(true);await flush();assert.equal(h.window.TarotStarGateAftermath.getState().line,1);assert.equal(h.window.TarotStarGateAftermath.getState().dialogues.length,1);
 h.hidden(false);await flush();assert.equal(h.window.TarotStarGateAftermath.getState().line,2);h.ui().advance();h.hidden(true);await flush();assert.equal(h.window.TarotStarGateAftermath.getState().line,2);
 await h.window.TarotStarGateAftermath.cancel();assert.equal(h.window.TarotStarGateAftermath.getState().restored,true);assert.equal(h.state().owner,null);h.hidden(false);await flush();assert.equal(h.window.TarotStarGateAftermath.getState().dialogues.length,2);assert.equal(h.window.TarotStarGateAftermath.getState().state,'CANCELLED');
});
test('final visible 300ms retains lock and supports hidden cancellation after full departure, without stale completion',async()=>{
 const h=harness({blockReturn:true});await start(h);await boxes(h);assert.equal(h.window.TarotStarGateAftermath.getState().state,'RETURN_HOLD');assert.equal(h.state().owner,'aftermath:9');assert.equal(h.state().lumiereEnabled,false);h.hidden(true);await h.window.TarotStarGateAftermath.cancel();assert.equal(h.state().lumiereEnabled,true);assert.equal(h.state().owner,null);h.releaseReturn();h.hidden(false);await flush();assert.equal(h.window.TarotStarGateAftermath.getState().completed,false);assert.equal(h.window.TarotStarGateAftermath.getState().state,'CANCELLED');
});
test('unlock failure, retained input or missing Follow never reports successful completion',async()=>{
 for(const fault of [{unlockFails:true},{inputRemains:true},{followLost:true},{npcRemains:true}]){const h=harness(fault);await start(h);await boxes(h);await flush();const r=h.window.TarotStarGateAftermath.getState();assert.equal(r.completed,false);assert.equal(r.state,'RESTORE_FAILED');assert.ok(h.state().owner);assert.equal(h.nodes['aftermath-status'].hidden,false);assert.match(h.nodes['aftermath-status'].children[1].textContent,/再読み込み/);}
});

test('A03 only uses a short existing performer move when Shiopon is occluded; Follow ownership is preserved and cancellation restores the original position',async()=>{
 for(const overlap of [false,true]){const h=harness({overlap});await start(h);for(let i=0;i<2;i++){h.ui().advance();await flush();}assert.equal(h.window.TarotStarGateAftermath.getState().line,3);const motion=h.motions.find(m=>m.actor==='shiopon');assert.equal(!!motion,overlap);if(overlap){assert.equal(motion.type,'move');assert.deepEqual(JSON.parse(JSON.stringify(motion.target)),{x:778,y:185});assert.equal(motion.duration,400);}assert.equal(h.state().following,true);assert.equal(h.state().owner,'aftermath:9');await h.window.TarotStarGateAftermath.cancel();assert.equal(h.state().actors.shiopon.y,overlap?202:170);}
});

test('v1.6 preserves same-Box newlines, gate observation before Box 5 and gameplay framing after Box 7',async()=>{
 const h=harness();await start(h);await boxes(h);
 assert.equal(h.shown.length,14);
 for(const number of [1,3,4,11,12])assert.ok(h.shown[number-1].text.includes('\n'));
 for(let i=4;i<=9;i++){for(const actor of ['shion','shiopon','lumiere'])assert.equal(h.shown[i].facing[actor],'gate');}
 for(let i=4;i<=6;i++)assert.equal(h.shown[i].focused,true);
 for(let i=7;i<=9;i++)assert.equal(h.shown[i].focused,false);
 assert.equal(h.shown[10].facing.lumiere,'shion');
 assert.equal(h.shown[13].facing.shiopon,'lumiere');
});
