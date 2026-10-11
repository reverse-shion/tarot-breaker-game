'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('star-gate-anomaly.js','utf8');
function harness(){
 const original='./assets/maps/star-country-gate-garden-star-gate-inner-light.webp?v=20260916-native-foreground-v6';
 const attributes=new Map([['src',original]]),properties=new Map(),lightAttributes=new Map(),classes=new Set();let writes=0;
 const img={getAttribute:n=>attributes.get(n),setAttribute(n,v){attributes.set(n,v);writes++;},style:{setProperty:(n,v)=>properties.set(n,v),removeProperty:n=>properties.delete(n)}};
 const light={dataset:{worldX:'684.57',worldY:String(210-230.86*1535/1024),worldW:'230.86',worldH:String(230.86*1535/1024)},querySelector:()=>img,
  hasAttribute:n=>lightAttributes.has(n),getAttribute:n=>lightAttributes.get(n),setAttribute:(n,v)=>lightAttributes.set(n,v),removeAttribute:n=>lightAttributes.delete(n)};
 const frame={dataset:{worldX:'520',worldY:String(210-560*1024/1536),worldW:'560',worldH:String(560*1024/1536)}};
 const shell={querySelector:s=>s==='.scene-gate-inner-light'?light:frame,classList:{add:n=>classes.add(n),remove:(...ns)=>ns.forEach(n=>classes.delete(n))}};
 let elapsed=0;const observations=[];
 const window={__TAROT_DEV_STAGE3__:true,addEventListener(){}};
 const document={getElementById:()=>shell,querySelector:()=>({src:''})};
 const context=vm.createContext({window,document,location:{search:'?dev=star-gate-full'},URLSearchParams,setTimeout});
 // Execute the production functions; expose them only inside this test VM.
 vm.runInContext(source.replace('window.addEventListener("tarot-breaker:star-gate-investigate",run);',
  `session={clock:{wait:async ms=>{elapsed+=ms;observations.push({elapsed,src:img.getAttribute('src'),state:[...classes]});}}};window.testGate={setGateState,cleanupGateState,playDarkEnergyReverse};`),
  vm.createContext({...context,img,classes,observations,get elapsed(){return elapsed;},set elapsed(v){elapsed=v;}}));
 return {api:window.testGate,img,light,frame,properties,classes,observations,original,writes:()=>writes};
}
test('normal/corruption/rise/afterglow retain the blue-white source; only rest switches it',async()=>{
 const h=harness();h.api.setGateState(null);h.api.setGateState('sga-anomaly');h.api.setGateState('sga-reverse-gate');
 assert.equal(h.writes(),0);await h.api.playDarkEnergyReverse();
 assert.equal(h.observations.at(-1).elapsed,3670);
 assert.ok(h.observations.every(o=>o.src===h.original));
 assert.equal(h.img.getAttribute('src'),h.original);
 h.api.setGateState('sga-anomaly-rest');assert.equal(h.img.getAttribute('src'),'./assets/events/gate-vision/gate-void.webp');
});
test('return cleanup keeps one void image; recovery and replay restore the exact normal source',()=>{
 const h=harness();const frameBefore=JSON.stringify(h.frame),lightBefore=JSON.stringify(h.light.dataset);
 h.api.setGateState('sga-anomaly-rest');const writes=h.writes();h.api.cleanupGateState({preserveFinal:true});h.api.cleanupGateState({preserveFinal:true});
 assert.equal(h.writes(),writes);assert.ok(h.classes.has('sga-anomaly-rest'));
 assert.equal(h.img.getAttribute('src'),'./assets/events/gate-vision/gate-void.webp');
 assert.equal(JSON.stringify(h.frame),frameBefore);assert.equal(JSON.stringify(h.light.dataset),lightBefore);
 h.api.cleanupGateState();assert.equal(h.img.getAttribute('src'),h.original);assert.equal(h.properties.size,0);
 h.api.setGateState('sga-anomaly-rest');h.api.setGateState(null);assert.equal(h.img.getAttribute('src'),h.original);
 h.api.setGateState('sga-anomaly-rest');assert.equal(h.img.getAttribute('src'),'./assets/events/gate-vision/gate-void.webp');
});
test('void aperture remains registered inside the original frame at reference scale',()=>{
 const h=harness();h.api.setGateState('sga-anomaly-rest');
 const d=h.light.dataset,value=n=>parseFloat(h.properties.get('--sga-void-'+n))/100;
 const left=+d.worldX+value('left')*d.worldW,top=+d.worldY+value('top')*d.worldH;
 const width=value('width')*d.worldW,height=value('height')*d.worldH;
 assert.ok(Math.abs(left+width/2-800)<1e-8);
 assert.ok(Math.abs(left-746.0416666666666)<1e-8);
 assert.ok(Math.abs(top+112.29166666666666)<1e-8);
 assert.ok(Math.abs(width-107.91666666666667)<1e-8);
 assert.ok(Math.abs(height-216.92708333333334)<1e-8);
});

test('future blackout, ruins and vortex hide the retained corrupted gate with final CSS precedence',()=>{
 const css=fs.readFileSync('star-gate-anomaly.css','utf8'),html=fs.readFileSync('index.html','utf8');
 const selector='#game-shell.sga-future-world-hidden > .scene-gate-inner-light,';
 const index=css.lastIndexOf(selector);
 assert.ok(index>css.lastIndexOf('#game-shell.sga-anomaly-rest .scene-gate-inner-light>img{'),
  'the future hide rule must override anomaly-rest !important visibility rules');
 const rule=css.slice(index,css.indexOf('}',index)+1);
 assert.match(rule,/#game-shell\.sga-future-world-hidden > \.scene-gate-inner-light > img/);
 assert.match(rule,/opacity:\s*0\s*!important\s*;/);
 assert.match(rule,/visibility:\s*hidden\s*!important\s*;/);
 assert.match(html,/class="scene-object scene-back scene-gate-inner-light"/);
});
test('P0 restoration unhides the gate under full black, before revealing present, without changing the void image',()=>{
 const restoreStart=source.indexOf('async restorePresent(ctx){');
 const restoreEnd=source.indexOf('async presentVisible(){',restoreStart);
 assert.ok(restoreStart>=0&&restoreEnd>restoreStart);
 const restore=source.slice(restoreStart,restoreEnd),verify=restore.indexOf("if(!scene.verify(current.p0).completed)");
 const unhide=restore.indexOf("gateShell()?.classList.remove('sga-future-world-hidden');");
 const prepareAudio=restore.indexOf('await preparePresentAudio(current)');
 assert.ok(verify>=0&&unhide>verify&&prepareAudio>unhide,
  'P0 must verify and unhide the gate before preparing the covered present reveal');
 assert.doesNotMatch(restore,/setGateInnerLight\(false\)|cleanupGateState\(\)/);
 const stage3=fs.readFileSync('future-stage3.js','utf8');
 assert.match(stage3,/state\('BLACK_CUT'\);[\s\S]*state\('PRESENT_RESTORE'\)/);
});
