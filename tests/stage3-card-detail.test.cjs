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
test('three finite Arcana pulses lead into edge erosion and completed Re hold',async()=>{
 const h=harness();await h.run();
 assert.deepEqual(h.waits,[550,210,90,230,100,260,1600,1800]);
 assert.equal(h.session.cardDetail.endedAt-h.session.cardDetail.startedAt,4840);
 assert.deepEqual(h.switches,[{time:3040,value:'pose.webp'}]);
 assert.deepEqual(Array.from(h.session.cardDetail.phases,p=>[p.name,p.time]),[
  ['NORMAL_HOLD',0],['MICRO_ANOMALY',550],['EDGE_EROSION',1440],['RE_COMPLETE',3040],['RE_HOLD',3040]
 ]);
 assert.deepEqual(Array.from(h.session.cardDetail.pulses,p=>p.number),[1,2,3]);
 const pulseFrames=h.frames.filter(f=>f.phase==='MICRO_ANOMALY');
 assert.deepEqual(pulseFrames.map(f=>Number(f.frameTransform.match(/scale\(([\d.]+)/)[1]).toFixed(3)),[1.012,1.018,1.026]);
 assert.ok(Number(pulseFrames[0].contamination.opacity)<Number(pulseFrames[1].contamination.opacity));
 assert.ok(Number(pulseFrames[1].contamination.opacity)<Number(pulseFrames[2].contamination.opacity));
 assert.equal(h.attached().length,0);assert.equal(h.worldClasses.contains('sga-rewrite-world-tension'),true);
});
test('Re Arcana eats inward from the contaminated card edge with a soft feather, never a central circular wipe',async()=>{
 const h=harness();await h.run();
 const micro=h.frames.find(f=>f.phase==='MICRO_ANOMALY'),erosion=h.frames.find(f=>f.phase==='EDGE_EROSION');
 assert.equal(micro.normal.opacity,'1');assert.equal(micro.re.opacity,'0');
 assert.equal(erosion.normal.opacity,'1');assert.equal(erosion.re.opacity,'1');
 assert.match(erosion.re.maskImage,/linear-gradient\(103deg/);
 assert.match(erosion.re.maskImage,/rgba\(0,0,0,\.72\)/);
 assert.match(erosion.re.maskImage,/rgba\(0,0,0,\.22\)/);
 assert.doesNotMatch(erosion.re.maskImage,/circle/);
 assert.ok(parseFloat(erosion.contamination.left)>-4);
 assert.match(css,/\.sga-arcana-contamination\{/);
 assert.match(css,/rgba\(37,12,48,\.42\)/);
 assert.doesNotMatch(source,/clipPath='circle/);
 assert.doesNotMatch(source,/phase\('SEMANTIC_BREAK'\)/);
 assert.doesNotMatch(source,/arcanaBreak/);
});
test('detail cards preserve authored registration while edge mask changes only rendering properties',async()=>{
 const h=harness();await h.run();const {normal,re}=h.frames[0],n=parseFloat(normal.width)/1024,r=parseFloat(re.width)/853;
 assert.ok(Math.abs(parseFloat(normal.height)/1536-n)<1e-8);assert.ok(Math.abs(parseFloat(re.height)/1280-r)<1e-8);assert.ok(Math.abs(1412*n-1221*r)<1e-8);
 assert.ok(Math.abs(parseFloat(normal.left)+509*n-(parseFloat(re.left)+426.5*r))<1e-8);assert.ok(Math.abs(parseFloat(normal.top)+752*n-(parseFloat(re.top)+636.5*r))<1e-8);
 for(const frame of h.frames)for(const key of ['width','height','left','top'])assert.equal(frame.normal[key],h.frames[0].normal[key]);
});
test('audio stays continuous: infection begins at erosion start and rewrite follows with no silent-break cue',async()=>{
 const h=harness();await h.run();
 assert.deepEqual(h.audioCalls.map(x=>x[0]),['micro','pulse','pulse','pulse','infection-start','infection','infection','infection','rewrite']);
 assert.deepEqual(h.audioCalls.filter(x=>x[0]==='pulse').map(x=>x[2]),[1,2,3]);
 assert.equal(h.audioCalls.find(x=>x[0]==='infection-start')[1],1440);
 assert.equal(h.audioCalls.find(x=>x[0]==='rewrite')[1],3040);
 assert.doesNotMatch(source,/futureAudio\?\.arcanaBreak/);
});
test('each cancelled phase releases overlay and never rewrites early',async()=>{
 for(const abortAt of [0,550,850,1180,1440,3040]){const h=harness({abortAt});await assert.rejects(h.run(),/cancelled/);assert.equal(h.attached().length,0);assert.equal(h.switches.length,abortAt===3040?1:0);}
});
test('detail refuses an unprepared image before mounting or advancing',async()=>{
 const h=harness({decoded:false});await assert.rejects(h.run(),/not decoded/);assert.equal(h.attached().length,0);assert.deepEqual(h.waits,[]);assert.deepEqual(h.switches,[]);
});
test('R0 explicitly prepares and restores red03 while initial03 stays on normal path',()=>{
 assert.match(source,/setShion\(3\);await pause\(560\);\s*session\.r0=\{pose:3,source:ASSETS\.shionCheckRe/);assert.match(source,/main\.src=current\.r0\.source/);assert.match(source,/Object\.values\(ASSETS\)\.flat\(\)/);
});
