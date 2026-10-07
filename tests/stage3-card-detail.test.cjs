'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync('star-gate-anomaly.js','utf8');const css=fs.readFileSync('future-stage3.css','utf8');
const functionSource=source.slice(source.indexOf('const ARCANA_DETAIL_REGISTRATION='),source.indexOf('function makeUi(){'));
function classList(){const items=new Set();return{items,add(...v){v.forEach(x=>items.add(x))},remove(...v){v.forEach(x=>items.delete(x))},contains(v){return items.has(v)}}}
function harness({abortAt=null,decoded=true}={}){
 let time=0,attached=[],waits=[],frames=[],switches=[],audioCalls=[];const worldClasses=classList();
 const makeImage=(width,height)=>({naturalWidth:decoded?width:0,naturalHeight:height,cloneNode(){return {style:{},classList:classList()}}});
 const node=()=>({style:{},children:[],classList:classList(),setAttribute(){},appendChild(card){this.children.push(card)},remove(){attached=attached.filter(n=>n!==this)}});
 const session={clock:null,futureAudio:{
  arcanaAnomalyStart(){audioCalls.push(['micro',time])},
  arcanaPulse(index){audioCalls.push(['pulse',time,index])},
  arcanaInfectionStart(){audioCalls.push(['infection-start',time])},
  arcanaInfection(p){audioCalls.push(['infection',time,p])},
  arcanaRewrite(){audioCalls.push(['rewrite',time])}
 }};
 const snapshot=()=>{const frame=attached[0]?.children[0];if(!frame)return;frames.push({time,phase:session.cardDetail?.phase,frameTransform:frame.style.transform,normal:{...frame.children[0].style},re:{...frame.children[1].style},contamination:{...frame.children[2]?.style},classes:[...frame.classList.items]});};
 const clock={now:()=>time,assert(){},async wait(ms){waits.push(ms);if(time===abortAt)throw new Error('cancelled');time+=ms;},async tween(ms,step){waits.push(ms);step(0);time+=ms/2;step(.5);snapshot();if(time-ms/2===abortAt)throw new Error('cancelled');time+=ms/2;step(1);}};
 session.clock=clock;
 const main={set src(value){switches.push({time,value})}};
 const context={session,innerWidth:390,innerHeight:844,root:{classList:worldClasses,querySelector:()=>main},preparedImages:new Map([['detail.png',makeImage(853,1280)],['normal.webp',makeImage(1024,1536)],['pose.webp',makeImage(512,512)]]),ASSETS:{cardDetail:'detail.png',cardNormal:'normal.webp',shionCheckRe:'pose.webp'},Math,document:{createElement:node,body:{appendChild(layer){attached.push(layer)}}}};
 vm.createContext(context);vm.runInContext(functionSource+';this.show=showArcanaDetail;',context);
 return {run:()=>context.show(),session,waits,frames,switches,audioCalls,worldClasses,attached:()=>attached};
}
test('three finite Arcana pulses build full-card abnormality before Re emergence and completed hold',async()=>{
 const h=harness();await h.run();
 assert.deepEqual(h.waits,[550,300,240,340,300,430,260,1650,1800]);
 assert.equal(h.session.cardDetail.endedAt-h.session.cardDetail.startedAt,5870);
 assert.deepEqual(h.switches,[{time:4070,value:'pose.webp'}]);
 assert.deepEqual(Array.from(h.session.cardDetail.phases,p=>[p.name,p.time]),[
  ['NORMAL_HOLD',0],['MICRO_ANOMALY',550],['ABNORMAL_HOLD',2160],['RE_EMERGENCE',2420],['RE_COMPLETE',4070],['RE_HOLD',4070]
 ]);
 assert.deepEqual(Array.from(h.session.cardDetail.pulses,p=>p.number),[1,2,3]);
 const pulseFrames=h.frames.filter(f=>f.phase==='MICRO_ANOMALY');
 const pulseScales=pulseFrames.map(f=>Number(f.frameTransform.match(/scale\(([\d.]+)/)[1]));
 assert.equal(pulseScales.length,3);assert.ok(pulseScales[0]>1&&pulseScales[0]<pulseScales[1]&&pulseScales[1]<pulseScales[2]&&pulseScales[2]<1.024);
 assert.ok(Number(pulseFrames[0].contamination.opacity)<Number(pulseFrames[1].contamination.opacity));
 assert.ok(Number(pulseFrames[1].contamination.opacity)<Number(pulseFrames[2].contamination.opacity));
 const hold=h.frames.find(f=>f.phase==='ABNORMAL_HOLD');assert.ok(Number(hold.contamination.opacity)>=.225);
 assert.equal(h.attached().length,0);assert.equal(h.worldClasses.contains('sga-rewrite-world-tension'),true);
});
test('Re Arcana emerges through a whole-card black-purple stain without a directional erosion front',async()=>{
 const h=harness();await h.run();
 const micro=h.frames.find(f=>f.phase==='MICRO_ANOMALY'),emergence=h.frames.find(f=>f.phase==='RE_EMERGENCE');
 assert.equal(micro.normal.opacity,'1');assert.equal(micro.re.opacity,'0');
 assert.ok(Number(emergence.normal.opacity)>0&&Number(emergence.normal.opacity)<1);
 assert.ok(Number(emergence.re.opacity)>0&&Number(emergence.re.opacity)<1);
 assert.equal(emergence.re.maskImage,'none');
 assert.match(css,/\.sga-arcana-contamination\{/);
 assert.match(css,/inset:0/);
 assert.doesNotMatch(css,/\.sga-arcana-breach-glow/);
 assert.doesNotMatch(source,/setErosionMask|linear-gradient\(103deg|EDGE_EROSION|BREACH_GLOW/);
 assert.doesNotMatch(source,/clipPath='circle/);
 assert.doesNotMatch(source,/phase\('SEMANTIC_BREAK'\)/);
 assert.doesNotMatch(source,/arcanaBreak/);
});
test('detail cards preserve authored registration while full-card abnormality changes only rendering properties',async()=>{
 const h=harness();await h.run();const {normal,re}=h.frames[0],n=parseFloat(normal.width)/1024,r=parseFloat(re.width)/853;
 assert.ok(Math.abs(parseFloat(normal.height)/1536-n)<1e-8);assert.ok(Math.abs(parseFloat(re.height)/1280-r)<1e-8);assert.ok(Math.abs(1412*n-1221*r)<1e-8);
 assert.ok(Math.abs(parseFloat(normal.left)+509*n-(parseFloat(re.left)+426.5*r))<1e-8);assert.ok(Math.abs(parseFloat(normal.top)+752*n-(parseFloat(re.top)+636.5*r))<1e-8);
 for(const frame of h.frames)for(const key of ['width','height','left','top'])assert.equal(frame.normal[key],h.frames[0].normal[key]);
});
test('audio stays continuous: infection begins at Re emergence and rewrite follows with no silent-break cue',async()=>{
 const h=harness();await h.run();
 assert.deepEqual(h.audioCalls.map(x=>x[0]),['micro','pulse','pulse','pulse','infection-start','infection','infection','infection','rewrite']);
 assert.deepEqual(h.audioCalls.filter(x=>x[0]==='pulse').map(x=>x[2]),[1,2,3]);
 assert.equal(h.audioCalls.find(x=>x[0]==='infection-start')[1],2420);
 assert.equal(h.audioCalls.find(x=>x[0]==='rewrite')[1],4070);
 assert.doesNotMatch(source,/futureAudio\?\.arcanaBreak/);
});
test('each cancelled phase releases overlay and never rewrites early',async()=>{
 for(const abortAt of [0,550,850,1090,1430,1730,2160,2420,4070]){const h=harness({abortAt});await assert.rejects(h.run(),/cancelled/);assert.equal(h.attached().length,0);assert.equal(h.switches.length,abortAt===4070?1:0);}
});
test('detail refuses an unprepared image before mounting or advancing',async()=>{
 const h=harness({decoded:false});await assert.rejects(h.run(),/not decoded/);assert.equal(h.attached().length,0);assert.deepEqual(h.waits,[]);assert.deepEqual(h.switches,[]);
});
test('R0 explicitly prepares and restores red03 while initial03 stays on normal path',()=>{
 assert.match(source,/setShion\(3\);await pause\(560\);\s*session\.r0=\{pose:3,source:ASSETS\.shionCheckRe/);assert.match(source,/main\.src=current\.r0\.source/);assert.match(source,/Object\.values\(ASSETS\)\.flat\(\)/);
});
