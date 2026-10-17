'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../progress.js'),controller=require('../public-continue.js');
const garden=require('../garden-public-continue.js');
const route='garden_star_sand_route_known';
const history=['alenon_prologue','landing_devil_memory','garden_shiopon_meet','garden_lumiere_gate','garden_star_gate_anomaly'];

test('recovery preserves old and new v1 saves through official Continue, normal writes, reload and roundtrip; failures preserve bytes',()=>{
 for(const migrated of [false,true]){
  const initial={version:1,checkpoint:{mapId:'star_gate_garden',spawnId:'south_gate'},
   completedEvents:[...history,...(migrated?[route]:[])],companion:'joined_with_shion'};
  const memory=new Map([[core.STORAGE_KEY,JSON.stringify(initial)],['unrelated','kept']]);
  let writes=0,fail=false;
  const storage={getItem:key=>memory.get(key)??null,setItem(key,value){
   assert.equal(key,core.STORAGE_KEY);writes++;if(fail)throw Error('blocked');memory.set(key,value);
  }};
  const original=memory.get(core.STORAGE_KEY),urls=[];
  const title=controller.createController({storage,navigate:url=>urls.push(url),diagnostic(){}});
  assert.equal(title.inspect().ok,true);assert.equal(title.launch().ok,true);
  assert.deepEqual(urls,['./index.html?entry=continue']);
  const received=garden.receive({search:'?entry=continue',storage});
  assert.equal(received.ok,true);
  const fresh=garden.revalidate(received,{search:'?entry=continue',storage});
  assert.equal(fresh.ok,true);assert.equal(writes,0);assert.equal(memory.get(core.STORAGE_KEY),original);
  const p=fresh.progress;
  for(const edge of [
   {sourceMapId:'star_gate_garden',destinationMapId:'star_country_landing',spawnId:'garden_entrance',reason:'garden_to_landing'},
   {sourceMapId:'star_country_landing',destinationMapId:'star_gate_garden',spawnId:'south_gate',reason:'gate_to_garden'}]){
   assert.equal(p.commitArrival(edge).persisted,true,'normal arrival writes');
   const reloaded=core.createProgress({storage}).load();
   assert.equal(reloaded.status,'valid');assert.deepEqual(reloaded.state.completedEvents,initial.completedEvents);
  }
  assert.equal(writes,2);
  assert.deepEqual(core.createProgress({storage}).load().state,initial);
  const before=memory.get(core.STORAGE_KEY);fail=true;
  const failed=p.commitArrival({sourceMapId:'star_gate_garden',destinationMapId:'star_country_landing',spawnId:'garden_entrance',reason:'garden_to_landing'});
  assert.equal(failed.persisted,false);assert.equal(p.getCurrentState().persisted,false);
  assert.equal(memory.get(core.STORAGE_KEY),before);assert.equal(memory.get('unrelated'),'kept');
  assert.deepEqual(core.createProgress({storage}).load().state,initial);
  const preserved=JSON.parse(before);
  for(const invalid of ['{broken',JSON.stringify({...preserved,version:2}),
   JSON.stringify({...preserved,completedEvents:[...preserved.completedEvents,'unrelated_unknown_event']}),
   JSON.stringify({...preserved,companion:'not_joined'})]){
   memory.set(core.STORAGE_KEY,invalid);const count=writes;
   assert.notEqual(core.createProgress({storage,diagnostic(){}}).load().status,'valid');
   assert.equal(controller.createController({storage,diagnostic(){},navigate(){assert.fail('invalid save must not navigate')}}).launch().ok,false);
   assert.equal(writes,count);assert.equal(memory.get(core.STORAGE_KEY),invalid);
  }
 }
});
