const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Core=require('../progress.js'),Controller=require('../public-continue.js'),Adapter=require('../alenon-public-continue.js'),Registry=require('../dev-checkpoints.js');
const page=require('./helpers/alenon-page-runtime.cjs');
const initial=()=>({version:1,checkpoint:{mapId:"alenon",spawnId:"intro"},completedEvents:[],companion:"not_joined"});
function storage(state){let raw=typeof state==='string'?state:state===null?null:JSON.stringify(state);const writes=[];return {getItem:key=>{assert.equal(key,Core.STORAGE_KEY);return raw},setItem:(key,value)=>{writes.push([key,value]);raw=value},writes,change:value=>{raw=value===null?null:JSON.stringify(value)},bytes:()=>raw};}
function production(state){return new Map([[Core.STORAGE_KEY,JSON.stringify(state)]]);}
function noWrites(t){assert.equal(t.accesses.filter(([op])=>op!=='read').length,0);}

test('Title durable status validation is read only including unsupported map/version and unavailable',()=>{
 for(const [state,status] of [[null,'none'],['bad','invalid'],[{...initial(),version:9},'unsupported'],[initial(),'valid'],[{...initial(),checkpoint:{mapId:'star_gate_garden',spawnId:'south_gate'},completedEvents:['alenon_prologue','landing_devil_memory']},'preparing']]){
  const store=storage(state),bytes=store.bytes(),controller=Controller.createController({storage:store,diagnostic(){}});
  assert.equal(controller.inspect().status,status);assert.equal(store.bytes(),bytes);assert.equal(store.writes.length,0);
 }
 assert.equal(Controller.createController({storage:{getItem(){throw Error('denied')}},diagnostic(){}}).inspect().status,'unavailable');
 assert.equal(Controller.assess({status:'volatile',state:initial()}).ok,false);
});
test('click reloads stale save, launches registry destination once and permits navigation failure retry',()=>{
 const store=storage(initial()),urls=[],controller=Controller.createController({storage:store,navigate:url=>urls.push(url),diagnostic(){}});
 assert.equal(controller.inspect().ok,true);store.change(null);assert.equal(controller.launch().ok,false);assert.deepEqual(urls,[]);
 store.change(initial());assert.equal(controller.launch().ok,true);assert.equal(controller.launch().status,'busy');assert.deepEqual(urls,['./alenon.html?entry=continue']);assert.equal(store.writes.length,0);
 let calls=0;const retry=Controller.createController({storage:store,navigate(){if(++calls===1)throw Error('failed')},diagnostic(){}});
 assert.equal(retry.launch().status,'navigation-failed');assert.equal(retry.launch().ok,true);
});
test('receiver rejects all conflicting markers, wrong map, malformed and unreadable saves preserving bytes',()=>{
 const store=storage(initial()),bytes=store.bytes();
 for(const search of ['','?entry=x','?entry=continue&entry=continue',...Controller.conflicting.map(key=>'?entry=continue&'+key+'=1')])assert.equal(Adapter.receive({search,storage:store}).ok,false,search);
 assert.equal(Adapter.receive({search:'?entry=continue',storage:store}).ok,true);
 store.change({...initial(),checkpoint:{mapId:'star_country_landing',spawnId:'pad_ground'},completedEvents:['alenon_prologue']});const changed=store.bytes();
 assert.equal(Adapter.receive({search:'?entry=continue',storage:store}).reason,'not-alenon');assert.equal(store.bytes(),changed);assert.equal(store.writes.length,0);
 assert.equal(Adapter.receive({search:'?entry=continue',storage:{getItem(){throw Error('denied')}},diagnostic(){}}).ok,false);
 assert.ok(bytes);
});
test('real Public bootstrap restores exact spawn/history only after strict readiness; PAD production departure remains normal',async()=>{
 const state={...initial(),checkpoint:{mapId:'alenon',spawnId:'pad_return'},completedEvents:['alenon_prologue','landing_devil_memory','garden_shiopon_meet'],companion:'waiting_at_landing'};
 const t=page('?entry=continue',{production:production(state),allowProductionWrites:true,deferImages:true,deferCollision:true});const m=t.h.testAlenon;
 await t.flush();assert.equal(m.ready,false);assert.equal(m.story.locked,true);assert.equal(t.e('viewport').listeners.pointerdown,undefined);noWrites(t);
 t.releaseImages();await t.flush();assert.equal(m.ready,false);noWrites(t);t.releaseCollision();await t.flush();
 assert.equal(m.ready,true);assert.deepEqual([m.player.x,m.player.y],[730.9,789.3]);assert.equal(m.story.started,false);assert.equal(m.story.completed,true);
 const journey=JSON.parse(t.session.get('tarot-breaker:map-journey-v1'));assert.equal(journey.companion.mode,'waiting');assert.equal(journey.companion.x,undefined);assert.equal(journey.gardenStory.shioponDone,true);assert.equal(journey.gardenStory.lumiereDone,false);
 assert.equal(t.accesses.filter(([op,label])=>op!=='read'&&label==='production').length,0);
 m.ride.mode='flying';m.beginPadExit();assert.equal(m.ride.exitStarted,true);assert.equal(m.ride.mode,'exiting');assert.equal(m.story.locked,true);
});
test('real Public failure and stale-during-readiness leave input locked and Progress bytes untouched; retry works',async()=>{
 for(const error of ['imageError','decodeError','fetchError']){
  const state={...initial(),completedEvents:['alenon_prologue']},options={[error]:true,production:production(state),allowProductionWrites:true},t=page('?entry=continue',options);await t.flush();const m=t.h.testAlenon;
  assert.equal(m.ready,false);assert.equal(m.story.locked,true);noWrites(t);assert.equal(t.production.get(Core.STORAGE_KEY),JSON.stringify(state));
  options[error]=false;await m.bootAlenonContinue();assert.equal(m.ready,true);
 }
 const state={...initial(),completedEvents:['alenon_prologue']},t=page('?entry=continue',{production:production(state),allowProductionWrites:true,deferImages:true});await t.flush();
 const changed=JSON.stringify({...state,checkpoint:{mapId:'alenon',spawnId:'pad_return'}});t.production.set(Core.STORAGE_KEY,changed);t.releaseImages();await t.flush();assert.equal(t.h.testAlenon.ready,false);noWrites(t);assert.equal(t.production.get(Core.STORAGE_KEY),changed);
});
test('Public incomplete prologue persists via existing Production boundary; normal start reset policy and PAD return unchanged',async()=>{
 const t=page('?entry=continue',{production:production(initial()),allowProductionWrites:true});await t.flush();const m=t.h.testAlenon;
 assert.equal(t.accesses.filter(([op,label])=>op==='write'&&label==='production').length,0);
 m.runPrologue();for(let i=0;i<700&&!m.story.completed;i++)await t.tick();assert.equal(m.story.completed,true);
 const saved=JSON.parse(t.production.get(Core.STORAGE_KEY));assert.deepEqual(saved.completedEvents,['alenon_prologue']);assert.deepEqual(saved.checkpoint,{mapId:'alenon',spawnId:'intro'});
 const back=page('?entry=continue',{production:t.production,allowProductionWrites:true});await back.flush();assert.equal(back.h.testAlenon.story.started,false);assert.equal(back.h.testAlenon.story.completed,true);
 const game=fs.readFileSync('game.js','utf8');assert.match(game,/TarotJourney\?\.reset\(\)/);assert.doesNotMatch(game,/resetGame\(/);
 const source=fs.readFileSync('alenon.html','utf8');assert.doesNotMatch(source,/commitArrival\(/);
});
test('registered Public harness executes same adapter while preserving Production/Journey bytes and containing departure',async()=>{
 for(const def of Registry.list().filter(d=>d.segment==='public-continue-alenon')){
  const t=page('?dev='+def.id);await t.flush();const m=t.h.testAlenon;assert.equal(m.ready,true,def.id);noWrites(t);
  assert.equal(m.session.harness,true);assert.equal(t.h.TarotJourney.get('companion').x,999);m.ride.mode='flying';m.beginPadExit();assert.equal(m.ride.mode,'ground');assert.equal(t.h.location.href,'');
  assert.equal(t.accesses.filter(([op,label])=>label==='production').length,0);
 }
 const t=page('?dev=public-continue-alenon-intro-complete&entry=continue');await t.flush();assert.equal(t.h.testAlenon,undefined);noWrites(t);
});
test('new controller and adapter imports perform no storage, clock, token or navigation operations',()=>{
 const h={TarotProgressCore:Core,TarotProgressResume:require('../progress-resume.js'),TarotAlenonResume:require('../alenon-resume.js'),TarotDevCheckpoints:Registry,URLSearchParams};
 for(const key of ['localStorage','sessionStorage','location','Date','crypto'])Object.defineProperty(h,key,{get(){throw Error(key)}});
 vm.runInNewContext(fs.readFileSync('public-continue.js','utf8'),h);vm.runInNewContext(fs.readFileSync('alenon-public-continue.js','utf8'),h);assert.equal(typeof h.TarotAlenonPublicContinue.receive,'function');
});

test('Public Journey restoration preserves unrelated keys and fails closed when session writes are denied',async()=>{
 const state={...initial(),completedEvents:['alenon_prologue']};
 const session=new Map([['tarot-breaker:map-journey-v1',JSON.stringify({unrelated:'kept',landingMemoryDone:true,companion:{mode:'following',x:999},gardenStory:{joined:true}})]]);
 const t=page('?entry=continue',{production:production(state),session,allowProductionWrites:true});await t.flush();assert.equal(t.h.testAlenon.ready,true);assert.equal(JSON.parse(session.get('tarot-breaker:map-journey-v1')).unrelated,'kept');
 const denied=page('?entry=continue',{production:production(state)});await denied.flush();assert.equal(denied.h.testAlenon.ready,false);assert.equal(denied.h.testAlenon.story.locked,true);assert.equal(denied.production.get(Core.STORAGE_KEY),JSON.stringify(state));
});

test('real Title UI renders reasons, ignores Garden paths and revalidates click without normal-start fallback',()=>{
 function title(state,search=''){
  const store=storage(state),events={},button={disabled:true,handlers:{},addEventListener(type,fn){this.handlers[type]=fn}},note={textContent:''},start={disabled:false,handlers:{},addEventListener(type,fn){this.handlers[type]=fn}};
  const h={URLSearchParams,console,CustomEvent:class {constructor(type){this.type=type}},dispatchEvent(){},location:{search,href:''},localStorage:store,document:{getElementById:id=>id==='continue'?button:id==='start'?start:note},addEventListener:(type,fn)=>events[type]=fn};h.window=h;
  vm.createContext(h);for(const file of ['route-registry.js','progress.js','progress-resume.js','public-continue.js','public-continue-title.js'])vm.runInContext(fs.readFileSync(file,'utf8'),h);
  return {store,h,button,note,start,events};
 }
 for(const [state,fragment] of [[null,'保存データがありません'],['bad','確認できません'],[{...initial(),version:2},'保存形式'],[{...initial(),checkpoint:{mapId:'star_gate_garden',spawnId:'south_gate'},completedEvents:['alenon_prologue','landing_devil_memory']},'準備中']]){
  const t=title(state);assert.equal(t.button.disabled,true);assert.ok(t.note.textContent.includes(fragment));assert.equal(t.store.writes.length,0);
 }
 const t=title(initial());assert.equal(t.button.disabled,false);assert.match(t.note.textContent,/最後に保存/);t.store.change(null);t.button.handlers.click({stopPropagation(){}});assert.equal(t.h.location.href,'');assert.equal(t.button.disabled,true);
 t.store.change(initial());t.events.storage();assert.equal(t.button.disabled,false);t.button.handlers.click({stopPropagation(){}});assert.equal(t.h.location.href,'./alenon.html?entry=continue');assert.equal(t.button.disabled,true);
 assert.equal(t.start.disabled,true);t.events.pageshow();assert.equal(t.start.disabled,false);assert.equal(t.button.disabled,false);assert.equal(t.store.writes.length,0);
 const loader=title(initial());loader.start.disabled=true;loader.button.handlers.click({stopPropagation(){}});loader.events.pageshow();assert.equal(loader.start.disabled,true,'must not enable loader-disabled normal start');
 const normal=title(initial());normal.start.handlers.click();assert.equal(normal.start.disabled,false);normal.button.handlers.click({stopPropagation(){}});assert.equal(normal.h.location.href,'');assert.equal(normal.store.writes.length,0);
 const garden=title(initial(),'?from=landing');assert.deepEqual(garden.button.handlers,{});
 const html=fs.readFileSync('index.html','utf8');assert.match(html,/id="continue-note" style="display:block/);assert.doesNotMatch(html, /id="continue-note" class="title-screen__load-note"/);
});

test('Public adapter imports are explicitly allowlisted; editor redirect cannot precede Public query refusal',()=>{
 const allowed=new Set(['alenon.html','alenon-public-continue.js','public-continue.js','index.html','public-continue-title.js','dev-checkpoints.js','star-country-landing.html','landing-public-continue.js']);
 for(const file of fs.readdirSync('.').filter(file=>/\.(html|js)$/.test(file)&&!allowed.has(file))){
  const source=fs.readFileSync(file,'utf8');assert.doesNotMatch(source,/public-continue\.js|alenon-public-continue\.js|TarotAlenonPublicContinue|TarotPublicContinue/,file);
 }
 const source=fs.readFileSync('alenon.html','utf8');assert.match(source,/if \(!p\.has\("dev"\) && !p\.has\("entry"\) && p\.get\("collision"\)/);
});

test('actual normal title and ordinary PAD-return bootstrap preserve existing Progress bytes and reset policy',async()=>{
 const state={...initial(),completedEvents:['alenon_prologue']};
 for(const search of ['?from=title','?from=landing-return']){
  const t=page(search,{production:production(state),allowProductionWrites:true});await t.flush();assert.equal(t.production.get(Core.STORAGE_KEY),JSON.stringify(state));assert.equal(t.accesses.filter(([op,label])=>op!=='read'&&label==='production').length,0);
  assert.equal(t.h.testAlenon.story.started,false);assert.equal(t.h.testAlenon.story.completed,true);
  if(search.includes('landing-return'))assert.equal(t.h.testAlenon.ride.mode,'landing');
 }
});

test('Production Continue hides the whole status panel on successful readiness while dev diagnostics remain visible',async()=>{
 for(const state of [initial(),{...initial(),completedEvents:['alenon_prologue']},{...initial(),checkpoint:{mapId:'alenon',spawnId:'pad_return'},completedEvents:['alenon_prologue']}]){
  const t=page('?entry=continue',{production:production(state),allowProductionWrites:true,deferImages:true});await t.flush();
  const panel=t.e('alenon-resume-status');assert.equal(panel.hidden,false);assert.ok(panel.children.some(child=>child.href==='./index.html'),'loading panel contains controlled Title return');
  assert.equal(t.h.testAlenon.ready,false);t.releaseImages();await t.flush();assert.equal(t.h.testAlenon.ready,true);assert.equal(panel.hidden,true,'entire status panel including Title link is hidden after readiness');
  assert.equal(t.accesses.filter(([op,label])=>op==='write'&&label==='production').length,0,'banner must not introduce save writes');
 }
 const dev=page('?dev=public-continue-alenon-intro-complete');await dev.flush();assert.equal(dev.h.testAlenon.ready,true);assert.equal(dev.e('alenon-resume-status').hidden,false);assert.match(dev.e('alenon-resume-status').children[0].textContent,/public-continue-alenon-intro-complete/);
});

test('Production Continue failure retains visible retry and Title controls; successful retry clears status',async()=>{
 const options={fetchError:true,production:production({...initial(),completedEvents:['alenon_prologue']}),allowProductionWrites:true};
 const t=page('?entry=continue',options);await t.flush();const panel=t.e('alenon-resume-status');
 assert.equal(t.h.testAlenon.ready,false);assert.equal(panel.hidden,false);assert.ok(panel.children.some(child=>child.textContent==='再試行'));assert.ok(panel.children.some(child=>child.href==='./index.html'));assert.match(panel.children[0].textContent,/復元できません/);
 options.fetchError=false;await t.h.testAlenon.bootAlenonContinue();assert.equal(t.h.testAlenon.ready,true);assert.equal(panel.hidden,true);
});
