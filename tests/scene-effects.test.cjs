const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const layout=require('../scene-layout.js');
const {createCollision,createNavigator}=require('../blocked-collision.js');
const data=require('../assets/maps/star-country-gate-garden-collision.json');
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('game.css','utf8');

test('gate opening aligns with stair centre; one base and no full foreground over actors',()=>{
 assert.equal(layout.gate.x+720*layout.gate.w/1448,800);
 assert.equal((html.match(/class="scene-object scene-back scene-gate-base"/g)||[]).length,1);
 assert.doesNotMatch(html,/scene-front scene-foreground/);
 assert.match(html,/scene-back scene-foreground/);
 for(const p of [{x:810,y:25},{x:693,y:175},{x:932,y:175},{x:811,y:230}]) assert.ok(layout.contains(p,{type:'poly',points:layout.legacyGate}));
});
test('foot baseline is strict, local to the object and independent for each actor',()=>{
 const ids=p=>layout.activeOccluders(p).map(o=>o.id);
 assert.ok(ids({x:584,y:438}).includes('west-court-post'));
 assert.ok(!ids({x:584,y:463}).includes('west-court-post'));
 assert.ok(!ids({x:584,y:510}).includes('west-court-post'));
 assert.ok(!ids({x:810,y:438}).includes('west-court-post'));
 assert.equal(ids({x:810,y:800}).length,0);
 assert.equal(ids({x:800,y:910}).length,0);
 assert.equal(ids({x:NaN,y:0}).length,0);
});
test('local physical bases remain solid for manual movement and pathfinding without editing authored areas',()=>{
 const c=createCollision({...data,blockedAreas:[...data.blockedAreas,...layout.solidBases]});
 const nav=createNavigator(c,16),spawn={x:729,y:1015};
 assert.equal(c.isWalkable(800,533),false);
 assert.equal(c.isWalkable(760,240),false);
 assert.equal(c.segmentClear({x:800,y:620},{x:800,y:440}),false);
 for(const target of [{x:810,y:800},{x:570,y:500},{x:1030,y:500},{x:810,y:350},{x:810,y:250},{x:490,y:427},{x:1190,y:490},{x:1380,y:590}]) {
  const path=nav.findPath(spawn,target);assert.ok(path,JSON.stringify(target));
  for(let i=1;i<path.points.length;i++) assert.ok(c.segmentClear(path.points[i-1],path.points[i]));
 }
 assert.deepEqual(data.blockedAreas,[]);
});
function bootScene(){
 const calls=[];let surfaces=0;
 const makeContext=tag=>new Proxy({},{get:(_,key)=>(...args)=>{calls.push({tag,key,args});},set:()=>true});
 const foreground={getContext:()=>makeContext('foreground')},background={getContext:()=>makeContext('background')};
 const image={complete:true,naturalWidth:1448,src:'/asset.webp'};
 const gate={dataset:{worldX:layout.gate.x,worldY:layout.gate.y,worldW:layout.gate.w,worldH:layout.gate.h},style:{},querySelector:()=>image};
 const fountain={dataset:{worldX:625,worldY:388,worldW:350,worldH:245},style:{},querySelector:()=>image};
 const layer={style:{},getBoundingClientRect(){throw new Error('per-frame layout read');}};
 const shell={dataset:{},classList:{add(){}},appendChild(){}};
 const document={getElementById:id=>id==='game-shell'?shell:image,
  querySelectorAll:s=>s==='[data-scene-world]'?[layer]:s==='[data-scene-object]'?[gate,fountain]:s.includes(' img')?[image]:[],
  querySelector:s=>s==='.scene-background canvas'?background:s==='.scene-foreground canvas'?foreground:s==='.scene-gate-base'?gate:s==='.scene-fountain-base'?fountain:s.includes('scene-crystal-')?foreground:image,
  createElement:()=>({width:0,height:0,getContext:()=>makeContext('tile-'+surfaces++)})};
 const window={TarotSceneLayout:{...layout,paintBackground(){},paintForeground(){},splitCrystal(){}},addEventListener(){},dispatchEvent(){}};
 vm.runInNewContext(fs.readFileSync('scene-effects.js','utf8'),{window,document,location:{search:''},URLSearchParams,CustomEvent:class{},console});
 return {api:window.TarotSceneEffects,calls,shell,layer,gate};
}
test('rear actor is alpha-masked in an isolated surface; front actor draws directly',async()=>{
 const {api,calls}=bootScene();await api.ready;
 const main={drawImage(...args){calls.push({tag:'main',key:'drawImage',args});}};
 const targets=[];api.drawMaskedActor(main,{x:584,y:438},{x:1,y:1},2,p=>targets.push(p));
 assert.notEqual(targets[0],main);
 api.drawMaskedActor(main,{x:584,y:470},{x:1,y:1},2,p=>targets.push(p));
 assert.equal(targets[1],main);
 assert.equal(calls.filter(c=>c.tag==='main'&&c.key==='drawImage').length,1);
 api.drawMaskedActor(main,{x:1168,y:876},{x:2,y:2},1,p=>targets.push(p));
 assert.notEqual(targets[2],main);
});
test('scene and actors share the current camera; event FX is opt-in',async()=>{
 const {api,shell,layer,gate}=bootScene();await api.ready;
 assert.equal(api.getGateState(),'normal');assert.equal(shell.dataset.sceneReady,'true');
 api.syncCamera({world:{w:1448,h:1086},origin:{x:610,y:280},zoom:1.22});
 assert.equal(layer.style.transform,'translate3d(-744.1999999999999px,-341.59999999999997px,0) scale(1.22)');
 assert.ok(gate.style.transform.endsWith('scale(1.22)'));
 assert.equal(api.setGateState('event'),'event');assert.equal(api.setGateState('normal'),'normal');
 assert.equal(api.setGateState('unknown'),'normal');
 assert.match(css,/\.scene-gate-event\s*\{\s*visibility:hidden; opacity:0/);
});
test('motion uses independent cycles; Preview 31 clouds scroll one-way and reduced motion is restrained',()=>{
 for(const t of ['4.4s','3.1s','24s','4.7s','2.6s','90s','54s','180s','5s']) assert.ok(css.includes(t),t);
 assert.equal((html.match(/class="scene-cloud-copy"/g)||[]).length,4);
 assert.match(html,/scene-cloud-far-track/);
 assert.match(html,/scene-cloud-near-track/);
 assert.match(css,/@keyframes cloud-scroll-left[\s\S]*?translate3d\(-50%, 0, 0\)/);
 assert.match(css,/\.scene-cloud-far-track\s*\{[\s\S]*?90s linear infinite/);
 assert.match(css,/\.scene-cloud-near-track\s*\{[\s\S]*?54s linear infinite/);
 assert.doesNotMatch(css,/cloud-(?:far-)?drift/);
 assert.doesNotMatch(css,/alternate/);
 assert.match(css,/@keyframes cloud-near-bob[\s\S]*?1\.5px[\s\S]*?1\.5px/);
 assert.match(css,/@keyframes waterfall-flow[\s\S]*?100% \{ transform:translate3d\(0,8px,0\); opacity:0/);
 assert.match(css,/prefers-reduced-motion: reduce/);
 assert.match(css,/scene-cloud-far-track[\s\S]*?animation: none/);
 assert.match(css,/scene-cloud-near-track[\s\S]*?animation-duration: 180s/);
 assert.match(css,/scene-waterfall canvas \{ animation-duration:5s/);
 assert.match(css,/scene-fountain-glow img \{ animation-duration:5.2s/);
});
