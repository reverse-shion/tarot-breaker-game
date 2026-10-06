'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync('star-gate-anomaly.js','utf8');
const functionSource=source.slice(source.indexOf('const ARCANA_DETAIL_REGISTRATION='),source.indexOf('function makeUi(){'));
function harness({abortAt=null,decoded=true}={}){
 let time=0,attached=[],waits=[],frames=[],switches=[];
 const makeImage=(width,height)=>({naturalWidth:decoded?width:0,naturalHeight:height,cloneNode(){return {style:{}}}});
 const clock={now:()=>time,assert(){},async wait(ms){waits.push(ms);if(time===abortAt)throw new Error('cancelled');time+=ms;},async tween(ms,step){waits.push(ms);step(0);time+=ms/2;step(.5);frames.push({time,normal:{...attached[0].children[0].children[0].style},re:{...attached[0].children[0].children[1].style}});if(time-ms/2===abortAt)throw new Error('cancelled');time+=ms/2;step(1);}};
 const session={clock};const main={set src(value){switches.push({time,value});}};
 const context={session,innerWidth:390,innerHeight:844,root:{querySelector:()=>main},preparedImages:new Map([['detail.png',makeImage(853,1280)],['normal.webp',makeImage(1024,1536)],['pose.webp',makeImage(512,512)]]),ASSETS:{cardDetail:'detail.png',cardNormal:'normal.webp',shionCheckRe:'pose.webp'},document:{createElement(){return{style:{},children:[],setAttribute(){},appendChild(card){this.children.push(card)},remove(){attached=attached.filter(n=>n!==this)}}},body:{appendChild(layer){attached.push(layer)}}}};
 vm.createContext(context);vm.runInContext(functionSource+';this.show=showArcanaDetail;',context);
 return {run:()=>context.show(),session,waits,frames,switches,attached:()=>attached};
}
test('existing detail cut transforms once in2950ms and changes pose only at transform completion',async()=>{
 const h=harness();await h.run();assert.deepEqual(h.waits,[800,350,800,1000]);assert.equal(h.session.cardDetail.source,'detail.png');assert.equal(h.session.cardDetail.endedAt-h.session.cardDetail.startedAt,2950);assert.deepEqual(h.switches,[{time:1950,value:'pose.webp'}]);assert.deepEqual(Array.from(h.session.cardDetail.phases,p=>[p.name,p.time]),[['NORMAL_HOLD',0],['NORMAL_SETTLE',800],['TRANSFORM',1150],['RE_HOLD',1950]]);assert.equal(h.attached().length,0);
 assert.equal(h.frames[1].normal.opacity,'0.5');assert.equal(h.frames[1].re.opacity,'0.5');assert.equal(h.frames[1].re.filter,undefined);
});
test('two detail cards preserve aspect ratios and equal painted height/center without scaling during transformation',async()=>{
 const h=harness();await h.run();const {normal,re}=h.frames[0],n=parseFloat(normal.width)/1024,r=parseFloat(re.width)/853;
 assert.ok(Math.abs(parseFloat(normal.height)/1536-n)<1e-8);assert.ok(Math.abs(parseFloat(re.height)/1280-r)<1e-8);assert.ok(Math.abs(1412*n-1221*r)<1e-8);
 assert.ok(Math.abs(parseFloat(normal.left)+509*n-(parseFloat(re.left)+426.5*r))<1e-8);assert.ok(Math.abs(parseFloat(normal.top)+752*n-(parseFloat(re.top)+636.5*r))<1e-8);
 for(const key of ['width','height','left','top'])assert.equal(h.frames[0].normal[key],h.frames[1].normal[key]);
});
test('each cancelled card phase releases overlay and never advances pose after cancellation',async()=>{
 for(const abortAt of [0,800,1150,1950]){const h=harness({abortAt});await assert.rejects(h.run(),/cancelled/);assert.equal(h.attached().length,0);assert.equal(h.switches.length,abortAt===1950?1:0);}
});
test('detail refuses an unprepared image before mounting or advancing',async()=>{
 const h=harness({decoded:false});await assert.rejects(h.run(),/not decoded/);assert.equal(h.attached().length,0);assert.deepEqual(h.waits,[]);assert.deepEqual(h.switches,[]);
});
test('R0 explicitly prepares and restores red03 while initial03 stays on normal path',()=>{
 assert.match(source,/setShion\(3\);await pause\(560\);\s*session\.r0=\{pose:3,source:ASSETS\.shionCheckRe/);assert.match(source,/main\.src=current\.r0\.source/);assert.match(source,/Object\.values\(ASSETS\)\.flat\(\)/);
});
