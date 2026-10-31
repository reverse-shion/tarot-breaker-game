const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const P=require('../caritas-battle-presentation.js');

test('all eight authored poses are reachable from battle and reply contexts',()=>{
 const examples=[
  [{dark:100},'closed'],[{dark:80},'guarded'],[{dark:60},'resist'],
  [{dark:45},'hesitate'],[{dark:25},'notice'],[{dark:10},'resolve'],
  [{dark:90,speaking:true,response:'癒し'},'accept'],
  [{dark:42,special:'PURIFICATION'},'relief']
 ];
 for(const [state,pose] of examples){
  assert.equal(P.derive(state).pose,pose);
  const bytes=fs.readFileSync(path.join(__dirname,'..',P.derive(state).src));
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
 }
 assert.equal(new Set(examples.map(([s])=>P.derive(s).src)).size,8);
});
test('visible meter controls continuous darkness; zero beats every animation and dialogue context',()=>{
 let previous=0;
 for(let dark=0;dark<=100;dark++){
  const projected=P.derive({dark});
  assert.ok(projected.darkness>=previous);previous=projected.darkness;
  assert.equal(projected.pose==='normal',dark===0);
 }
 assert.equal(P.derive({dark:100}).darkness,.94);
 for(const phase of ['battle','engulfing','word-strike','enemy-turn','written-light','purifying','purified','farewell','returning','special'])
  for(const special of ['NOT_STARTED','PURIFICATION','CARITAS_REPLY','FAREWELL','DONE']){
   assert.deepEqual(P.derive({dark:0,phase,special,speaking:true,response:'癒し',finisher:true}),{pose:'normal',src:P.images.normal,darkness:0});
  }
});
test('reaction context selects art without classifying arbitrary AI prose',()=>{
 assert.equal(P.derive({dark:75,speaking:true,response:'written'}).pose,'accept');
 assert.equal(P.derive({dark:75,speaking:true,response:'願い'}).pose,'notice');
 assert.equal(P.derive({dark:75,speaking:true,response:'希望'}).pose,'resolve');
 assert.equal(P.derive({dark:75,speaking:false,response:'癒し'}).pose,'guarded');
 assert.equal(P.derive({dark:75,phase:'enemy-turn',speaking:true,response:'癒し'}).pose,'resist');
 assert.equal(P.derive({dark:75,phase:'word-strike'}).pose,'guarded');
 assert.equal(P.derive({dark:75,finisher:true}).pose,'resolve');
});
function fixture(){
 const pending=new Map(),writes=[];
 class FakeImage{
  constructor(){this.naturalWidth=1200;}
  set src(s){pending.set(s,this);}
  decode(){return Promise.resolve();}
 }
 const style=()=>({values:{},setProperty(k,v){this.values[k]=v;}});
 const root={dataset:{},style:style()},veil={style:style()};
 let src=P.images.normal;
 const beast={get src(){return src;},set src(s){src=s;writes.push(s);}};
 const view=P.createView({root,veil,beast,ImageClass:FakeImage});
 const ready=async pose=>{await pending.get(P.images[pose]).onload();};
 return {root,veil,beast,view,pending,ready,writes};
}
test('loading never blanks an image; out-of-order decode cannot overwrite latest pose',async()=>{
 const f=fixture();
 f.view.update({dark:100});
 assert.equal(f.beast.src,P.images.normal,'retain valid original during first decode');
 await f.ready('closed');assert.equal(f.beast.src,P.images.closed);
 f.view.update({dark:45});f.view.update({dark:25});
 await f.ready('hesitate');assert.equal(f.beast.src,P.images.closed,'stale pose cannot paint');
 await f.ready('notice');assert.equal(f.beast.src,P.images.notice);
 assert.ok(f.veil.style.values['--cb-caritas-mask'].includes(P.images.notice));
});
test('zero immediately clears smoke and restores original even if corrupted decode finishes later',async()=>{
 const f=fixture();f.view.update({dark:100});await f.ready('closed');
 f.view.update({dark:42,special:'PURIFICATION'});
 f.view.update({dark:0,special:'CARITAS_REPLY'});
 assert.equal(f.beast.src,P.images.normal);
 assert.equal(f.root.style.values['--cb-darkness'],'0');
 assert.equal(f.root.dataset.darkCleared,'true');
 await f.ready('relief');await f.ready('guarded');
 assert.equal(f.beast.src,P.images.normal);
 f.view.update({dark:0,phase:'word-strike'});
 assert.equal(f.root.style.values['--cb-darkness'],'0');
 assert.equal(f.writes.at(-1),P.images.normal);
});
test('missing or undecodable assets leave the previous decoded sprite usable',async()=>{
 const f=fixture();f.view.update({dark:100});await f.ready('closed');
 f.pending.get(P.images.accept).onerror();
 f.view.update({dark:80,speaking:true,response:'written'});
 assert.equal(f.beast.src,P.images.closed);
 const bad=f.pending.get(P.images.resolve);bad.decode=()=>Promise.reject(Error('bad-webp'));
 f.view.update({dark:10});await bad.onload();
 assert.equal(f.beast.src,P.images.closed);
 f.view.update({dark:0});assert.equal(f.beast.src,P.images.normal);
});
