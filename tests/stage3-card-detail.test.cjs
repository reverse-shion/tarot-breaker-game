'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync('star-gate-anomaly.js','utf8');
const functionSource=source.slice(source.indexOf('const ARCANA_DETAIL_REGISTRATION='),source.indexOf('function makeUi(){'));
function classList(){const items=new Set();return{items,add(...v){v.forEach(x=>items.add(x))},remove(...v){v.forEach(x=>items.delete(x))},contains(v){return items.has(v)}}}
function harness({abortAt=null,decoded=true}={}){
 let time=0,attached=[],waits=[],frames=[],switches=[],audioCalls=[];const worldClasses=classList();
 const makeImage=(width,height)=>({naturalWidth:decoded?width:0,naturalHeight:height,cloneNode(){return {style:{},classList:classList()}}});
 const node=()=>({style:{},children:[],classList:classList(),setAttribute(){},appendChild(card){this.children.push(card)},remove(){attached=attached.filter(n=>n!==this)}});
 const session={clock:null,futureAudio:{
  arcanaAnomalyStart(){audioCalls.push(['micro',time])},
  arcanaInfection(p){audioCalls.push(['infection',time,p])},
  arcanaBreak(){audioCalls.push(['break',time])},
  arcanaRewrite(){audioCalls.push(['rewrite',time])}
 }};
 const snapshot=()=>{const frame=attached[0]?.children[0];if(!frame)return;frames.push({time,phase:session.cardDetail?.phase,normal:{...frame.children[0].style},re:{...frame.children[1].style},classes:[...frame.classList.items]});};
 const clock={now:()=>time,assert(){},async wait(ms){waits.push(ms);if(time===abortAt)throw new Error('cancelled');time+=ms;},async tween(ms,step){waits.push(ms);step(0);time+=ms/2;step(.5);snapshot();if(time-ms/2===abortAt)throw new Error('cancelled');time+=ms/2;step(1);}};
 session.clock=clock;
 const main={set src(value){switches.push({time,value})}};
 const context={session,innerWidth:390,innerHeight:844,root:{classList:worldClasses,querySelector:()=>main},preparedImages:new Map([['detail.png',makeImage(853,1280)],['normal.webp',makeImage(1024,1536)],['pose.webp',makeImage(512,512)]]),ASSETS:{cardDetail:'detail.png',cardNormal:'normal.webp',shionCheckRe:'pose.webp'},Math,document:{createElement:node,body:{appendChild(layer){attached.push(layer)}}}};
 vm.createContext(context);vm.runInContext(functionSource+';this.show=showArcanaDetail;',context);
 return {run:()=>context.show(),session,waits,frames,switches,audioCalls,worldClasses,attached:()=>attached};
}
test('semantic erosion cut lasts2790ms and rewrites Arcana atomically after the140ms break',async()=>{
 const h=harness();await h.run();
 assert.deepEqual(h.waits,[550,650,800,140,650]);
 assert.equal(h.session.cardDetail.endedAt-h.session.cardDetail.startedAt,2790);
 assert.deepEqual(h.switches,[{time:2140,value:'pose.webp'}]);
 assert.deepEqual(Array.from(h.session.cardDetail.phases,p=>[p.name,p.time]),[
  ['NORMAL_HOLD',0],['MICRO_ANOMALY',550],['LOCAL_EROSION',1200],['SEMANTIC_BREAK',2000],['REWRITE',2140],['RE_HOLD',2140]
 ]);
 assert.equal(h.attached().length,0);assert.equal(h.worldClasses.contains('sga-rewrite-world-tension'),true);
});
test('micro anomaly and local erosion never opacity-crossfade normal and Re cards',async()=>{
 const h=harness();await h.run();
 const micro=h.frames.find(f=>f.phase==='MICRO_ANOMALY'),erosion=h.frames.find(f=>f.phase==='LOCAL_EROSION');
 assert.equal(micro.normal.opacity,'1');assert.equal(micro.re.opacity,'0');
 assert.equal(erosion.normal.opacity,'1');assert.equal(erosion.re.opacity,'1');
 assert.match(erosion.re.clipPath,/^circle\(/);assert.notEqual(erosion.re.clipPath,'none');
 assert.ok(Math.abs(parseFloat(micro.normal.transform.match(/translate\(([-\d.]+)px/)[1]))<=1.5);
 assert.doesNotMatch(source,/images\.normal\.style\.opacity=String\(1-p\)/);
 assert.doesNotMatch(source,/images\.re\.style\.opacity=String\(p\)/);
 assert.doesNotMatch(source,/phase\('TRANSFORM'\)/);
});
test('detail cards preserve authored registration while erosion changes only rendering properties',async()=>{
 const h=harness();await h.run();const {normal,re}=h.frames[0],n=parseFloat(normal.width)/1024,r=parseFloat(re.width)/853;
 assert.ok(Math.abs(parseFloat(normal.height)/1536-n)<1e-8);assert.ok(Math.abs(parseFloat(re.height)/1280-r)<1e-8);assert.ok(Math.abs(1412*n-1221*r)<1e-8);
 assert.ok(Math.abs(parseFloat(normal.left)+509*n-(parseFloat(re.left)+426.5*r))<1e-8);assert.ok(Math.abs(parseFloat(normal.top)+752*n-(parseFloat(re.top)+636.5*r))<1e-8);
 for(const frame of h.frames)for(const key of ['width','height','left','top'])assert.equal(frame.normal[key],h.frames[0].normal[key]);
});
test('audio removes the normal world sound, creates a semantic gap, then switches to fix without transform crossfade',async()=>{
 const h=harness();await h.run();
 assert.deepEqual(h.audioCalls.map(x=>x[0]),['micro','infection','infection','infection','break','rewrite']);
 assert.equal(h.audioCalls.find(x=>x[0]==='break')[1],2000);
 assert.equal(h.audioCalls.find(x=>x[0]==='rewrite')[1],2140);
 assert.doesNotMatch(source,/futureAudio\?\.transform(Start|End)?/);
});
test('each cancelled phase releases overlay and never rewrites early',async()=>{
 for(const abortAt of [0,550,1200,2000,2140]){const h=harness({abortAt});await assert.rejects(h.run(),/cancelled/);assert.equal(h.attached().length,0);assert.equal(h.switches.length,abortAt===2140?1:0);}
});
test('detail refuses an unprepared image before mounting or advancing',async()=>{
 const h=harness({decoded:false});await assert.rejects(h.run(),/not decoded/);assert.equal(h.attached().length,0);assert.deepEqual(h.waits,[]);assert.deepEqual(h.switches,[]);
});
test('R0 explicitly prepares and restores red03 while initial03 stays on normal path',()=>{
 assert.match(source,/setShion\(3\);await pause\(560\);\s*session\.r0=\{pose:3,source:ASSETS\.shionCheckRe/);assert.match(source,/main\.src=current\.r0\.source/);assert.match(source,/Object\.values\(ASSETS\)\.flat\(\)/);
});
