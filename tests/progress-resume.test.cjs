const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Registry = require('../route-registry.js');
const Core = require('../progress.js');
const Resume = require('../progress-resume.js');
const clone = value => JSON.parse(JSON.stringify(value));
const history = ['alenon_prologue', 'landing_devil_memory'];
const edge = route => Object.fromEntries(['sourceMapId', 'destinationMapId', 'spawnId', 'reason'].map(k => [k, route[k]]));
const record = (mapId = 'alenon', spawnId = 'intro', events = history, companion = 'not_joined') =>
  ({version: 1, checkpoint: {mapId, spawnId}, completedEvents: [...events], companion});
function storage(raw, key = Core.STORAGE_KEY) {
  const bytes = new Map(raw === undefined ? [] : [[key, raw]]);
  return {bytes, writes: 0, throwRead: false, throwWrite: false,
    getItem(key) { if (this.throwRead) throw Error('blocked'); return this.bytes.get(key) ?? null; },
    setItem(key, value) { if (this.throwWrite) throw Error('quota'); this.writes++; this.bytes.set(key, value); }};
}
const ready = () => Object.fromEntries(Resume.READINESS_KEYS.map(key => [key, true]));
function harness(route = Registry.routes[1], state = record()) {
  const durable = storage(JSON.stringify(state));
  const session = storage();
  let time = 1000, token = 'attempt-1';
  const dependencies = {storage: session, now: () => time, createToken: () => token};
  const handoff = Resume.createHandoffStore(dependencies);
  const progress = Core.createProgress({storage: durable, diagnostic() {}});
  progress.load();
  const input = {token, destinationMapId: route.destinationMapId, spawnId: route.spawnId};
  return {durable, session, dependencies, handoff, progress, input, state, route: edge(route),
    setTime(value) { time = value; }, setToken(value) { token = value; },
    issue() { return handoff.issue({edge: edge(route), state}); },
    claim() { return handoff.claim({...input, state: progress.getCurrentState().state}); },
    commit(overrides = {}) { return handoff.commit({...input, progress, readiness: ready(), ...overrides}); },
    envelope() { return JSON.parse(session.getItem(Resume.HANDOFF_KEY)); },
    reload() { const p = Core.createProgress({storage: durable, diagnostic() {}}); p.load(); return p; }};
}

test('Continue resolves every checkpoint and companion with detached frozen normalized facts, no writes', () => {
  const states = [record('alenon', 'intro', []), record('alenon', 'pad_return'),
    record('star_country_landing', 'pad_ground'), record('star_country_landing', 'garden_entrance'),
    record('star_gate_garden', 'south_gate'),
    record('star_gate_garden', 'south_gate', [...history, 'garden_shiopon_meet'], 'joined_with_shion'),
    record('alenon', 'pad_return', [...history, 'garden_shiopon_meet'], 'waiting_at_landing')];
  for (const state of states) {
    const store = storage(JSON.stringify(state));
    const p = Core.createProgress({storage: store});
    const load = p.load(); const got = Resume.resolveContinue(load);
    assert.equal(got.ok, true); assert.equal(got.context.entryKind, 'continue');
    assert.equal(got.context.entryFile, Registry.maps[state.checkpoint.mapId].entryFile);
    assert.equal(got.context.mapId, state.checkpoint.mapId);
    assert.equal(got.context.spawnId, state.checkpoint.spawnId);
    assert.equal(got.context.companion, state.companion);
    assert(Object.isFrozen(got.context)); assert(Object.isFrozen(got.context.completedEvents));
    load.state.completedEvents.push('fake'); assert.deepEqual(got.context.completedEvents, state.completedEvents);
    assert.equal(store.writes, 0); assert.equal(store.getItem(Core.STORAGE_KEY), JSON.stringify(state));
  }
  const duplicate = record(); duplicate.completedEvents.push('alenon_prologue');
  assert.deepEqual(Resume.resolveContinue({status:'valid', state: duplicate}).context.completedEvents, history);
});

test('Continue fails closed on status labels, invalid history/location, extra fields and legacy/URL input', () => {
  for (const status of ['none', 'invalid', 'unsupported', 'unavailable', 'unknown'])
    assert.equal(Resume.resolveContinue({status, state: record()}).ok, false);
  const bad = [null, {journey:{}}, '?resume=1', {...record(), extra: 1},
    record('star_gate_garden','south_gate', ['landing_devil_memory']),
    record('alenon','intro',history,'joined_with_shion'), record('alenon','unknown')];
  for (const state of bad) assert.equal(Resume.resolveContinue({status:'valid',state}).ok, false);
});

for (const route of Registry.routes.slice(1)) test(`durable arrival and replay: ${route.reason}`, () => {
  const sourceSpawn = Registry.maps[route.sourceMapId].defaultSpawnId;
  const h = harness(route, record(route.sourceMapId, sourceSpawn));
  const issued = h.issue(); assert.equal(issued.ok, true); assert(Object.isFrozen(issued.receipt.sourceState.checkpoint));
  assert.equal(h.claim().ok, true); assert.equal(h.envelope().phase, 'claimed');
  const reloaded = Resume.createHandoffStore(h.dependencies);
  assert.equal(reloaded.claim({...h.input,state:h.state}).ok, true);
  const got = h.commit(); assert.equal(got.ok, true); assert.equal(h.envelope().phase,'committed');
  assert.deepEqual(h.progress.getCheckpoint(), {mapId:route.destinationMapId,spawnId:route.spawnId});
  const counts = [h.durable.writes,h.session.writes];
  assert.equal(h.commit().alreadyCommitted, true);
  assert.equal(h.claim().alreadyCommitted, true);
  assert.deepEqual([h.durable.writes,h.session.writes], counts);
});

test('issue rejects title, malformed edge, wrong source/prerequisite and incompatible companion destination', () => {
  const h = harness();
  const cases = [edge(Registry.routes[0]), {...h.route, extra:1}, {...h.route, spawnId:'wrong'}, {...h.route,reason:'fake'}];
  for(const e of cases) assert.equal(h.handoff.issue({edge:e,state:h.state}).ok,false);
  assert.equal(h.handoff.issue({edge:h.route,state:record('star_country_landing','pad_ground')}).ok,false);
  assert.equal(h.handoff.issue({edge:h.route,state:record('alenon','intro',[])}).ok,false);
  const joined = [...history,'garden_shiopon_meet'];
  assert.equal(h.handoff.issue({edge:edge(Registry.routes[4]),state:record('star_country_landing','pad_ground',joined,'joined_with_shion')}).ok,false);
  assert.equal(h.handoff.issue({edge:edge(Registry.routes[2]),state:record('star_country_landing','pad_ground',joined,'waiting_at_landing')}).ok,false);
  assert.equal(h.session.writes,0); assert.equal(h.durable.writes,0);
});

test('claim requires exact token, destination and current independently validated durable state', () => {
  const h = harness(); h.issue();
  for (const override of [{token:'other'},{destinationMapId:'alenon'},{spawnId:'wrong'},
    {state:{...h.state,extra:1}}, {state:record('alenon','pad_return')}])
    assert.equal(h.handoff.claim({...h.input,state:h.state,...override}).ok,false);
  assert.equal(h.envelope().phase,'pending'); assert.equal(h.durable.writes,0);
  assert.equal(h.commit().reason,'handoff-not-claimed');
});

test('one live slot, TTL, invalid clocks and distinct token replacement', () => {
  const h = harness(); h.issue(); assert.equal(h.issue().reason,'handoff-in-flight');
  h.setTime(1000 + Resume.HANDOFF_TTL_MS);
  assert.equal(h.claim().reason,'expired-handoff'); assert.equal(h.issue().reason,'token-reused');
  h.setToken('attempt-2'); assert.equal(h.issue().ok,true);
  h.setTime(0); assert.equal(h.claim().ok,false);
  h.setTime(NaN); assert.equal(h.issue().reason,'invalid-clock');
  for(const token of ['', 'x'.repeat(129), undefined]) { const x=harness(); x.setToken(token); assert.equal(x.issue().reason,'invalid-token'); }
});

test('corrupt/unreadable evidence is never automatically overwritten', () => {
  for(const change of [e=>({...e,extra:1}), e=>({...e,version:2}),e=>({...e,phase:'fake'}),
    e=>({...e,expiresAt:e.expiresAt+1}),e=>({...e,sourceState:{...e.sourceState,companion:'fake'}}),
    e=>({...e,edge:{...e.edge,extra:1}})]) {
    const h = harness(); h.issue(); h.session.bytes.set(Resume.HANDOFF_KEY,JSON.stringify(change(h.envelope())));
    const bytes=h.session.getItem(Resume.HANDOFF_KEY); assert.equal(h.claim().ok,false); assert.equal(h.issue().ok,false);
    assert.equal(h.session.getItem(Resume.HANDOFF_KEY),bytes);
  }
  const h=harness(); h.session.bytes.set(Resume.HANDOFF_KEY,'{'); assert.equal(h.issue().reason,'corrupt-handoff');
  h.session.throwRead=true; assert.equal(h.issue().reason,'dependency-failure');
});

test('missing/throwing dependencies yield bounded failure without global fallback', () => {
  assert.equal(Resume.createHandoffStore().issue({edge:edge(Registry.routes[1]),state:record()}).reason,'dependencies-unavailable');
  const h=harness(); h.session.throwWrite=true; assert.equal(h.issue().ok,false);
  assert.equal(h.session.bytes.has(Resume.HANDOFF_KEY),false);
  const x=Resume.createHandoffStore({...h.dependencies,now(){throw Error('clock');}});
  assert.equal(x.issue({edge:h.route,state:h.state}).reason,'dependency-failure');
});

for(const key of Resume.READINESS_KEYS) test(`arrival waits for actual ${key}`, () => {
  const h=harness(); h.issue(); h.claim(); const readiness=ready(); delete readiness[key];
  let calls=0; const progress={getCurrentState(){calls++;throw Error();},commitArrival(){calls++;}};
  assert.equal(h.commit({readiness,progress}).reason,'not-ready'); assert.equal(calls,0);
  readiness[key]=false; assert.equal(h.commit({readiness,progress}).reason,'not-ready'); assert.equal(calls,0);
  assert.equal(h.durable.writes,0); assert.equal(h.envelope().phase,'claimed');
});

test('failed durable write retains source bytes, claimed evidence, volatile retry boundary; reload retries', () => {
  const h=harness();h.issue();h.claim(); const before=h.durable.getItem(Core.STORAGE_KEY);
  h.durable.throwWrite=true; assert.equal(h.commit().reason,'arrival-not-persisted');
  assert.equal(h.durable.getItem(Core.STORAGE_KEY),before); assert.equal(h.envelope().phase,'claimed');
  h.durable.throwWrite=false; assert.equal(h.commit().reason,'persistence-retry-required'); assert.equal(h.durable.writes,0);
  const reloaded=h.reload(); assert.equal(h.commit({progress:reloaded}).ok,true); assert.equal(h.durable.writes,1);
});

test('durable success plus receipt failure recovers exact destination without repeating arrival', () => {
  const h=harness(); h.issue();h.claim(); h.session.throwWrite=true;
  const got=h.commit();assert.equal(got.persisted,true);assert.equal(got.receiptPersisted,false);
  assert.equal(got.reason,'receipt-write-failed');assert.equal(h.envelope().phase,'claimed');
  h.session.throwWrite=false; const reload=h.reload();
  assert.equal(h.handoff.claim({...h.input,state:reload.getCurrentState().state}).ok,true);
  let calls=0;const progress={getCurrentState:reload.getCurrentState,commitArrival(){calls++;throw Error('repeat');}};
  assert.equal(h.commit({progress}).recovered,true);assert.equal(calls,0);assert.equal(h.durable.writes,1);
});

test('fresh competing durable record is rejected; stale cached snapshot needs caller refresh', () => {
  const h=harness();h.issue();h.claim();h.durable.bytes.set(Core.STORAGE_KEY,JSON.stringify(record('alenon','pad_return')));
  assert.equal(h.commit({progress:h.reload()}).reason,'state-mismatch');assert.equal(h.durable.writes,0);
});

test('independent tabs cannot claim; cloned session evidence can acknowledge same logical destination', () => {
  const h=harness();h.issue();
  const isolated=Resume.createHandoffStore({...h.dependencies,storage:storage()});
  assert.equal(isolated.claim({...h.input,state:h.state}).reason,'missing-handoff');
  const copied=storage(h.session.getItem(Resume.HANDOFF_KEY),Resume.HANDOFF_KEY);
  const cloneTab=Resume.createHandoffStore({...h.dependencies,storage:copied});
  assert.equal(h.claim().ok,true);assert.equal(cloneTab.claim({...h.input,state:h.state}).ok,true);
  h.commit();const p=h.reload();
  assert.equal(cloneTab.commit({...h.input,progress:p,readiness:ready()}).recovered,true);
  assert.equal(h.durable.writes,1);
});

test('committed slots can be replaced and old tokens cannot replay a different transition', () => {
  const h=harness();h.issue();h.claim();h.commit();h.setToken('next');
  const state=h.progress.getCurrentState().state;
  assert.equal(h.handoff.issue({edge:edge(Registry.routes[4]),state}).ok,true);
  assert.equal(h.commit().reason,'token-mismatch');
  assert.equal(h.handoff.claim({...h.input,token:'next',state}).reason,'destination-mismatch');
});

test('browser import performs no storage/clock/token/navigation operation and only explicitly approved Continue entry modules import it', () => {
  const source=fs.readFileSync(path.join(__dirname,'../progress-resume.js'),'utf8');
  const sandbox={TarotRouteRegistry:Registry,TarotProgressCore:Core};
  for(const key of ['localStorage','sessionStorage','location','Date','crypto'])
    Object.defineProperty(sandbox,key,{get(){throw Error('browser access: '+key);}});
  vm.runInNewContext(source,sandbox); assert.equal(typeof sandbox.TarotProgressResume.resolveContinue,'function');
  const root=path.join(__dirname,'..');
  assert.match(fs.readFileSync(path.join(root,'alenon.html'),'utf8'), /if \(continueDevRequest\) \{\s*bootAlenonContinue\(\);\s*return;/);
  assert.match(fs.readFileSync(path.join(root,'star-country-landing.html'),'utf8'), /if \(continueRequest\) bootLandingContinue\(\);\s*else boot\(\);/);
  for(const file of fs.readdirSync(root).filter(file=>/\.(html|js)$/.test(file) &&
      !['index.html','public-continue.js','alenon-public-continue.js','progress-resume.js','alenon.html','alenon-resume.js','star-country-landing.html','landing-resume.js','landing-public-continue.js','garden-resume.js','dev-checkpoints.js','garden-dev-bootstrap.js'].includes(file)))
    assert.equal(fs.readFileSync(path.join(root,file),'utf8').includes('progress-resume.js'),false,file);
});

test('persisted identity history rejects stale A after recreated A/B issue and expiry cycles', () => {
  const h=harness(); assert.equal(h.issue().ok,true);
  const first=h.envelope(); assert.deepEqual(first.usedTokens,['attempt-1']);
  h.setTime(first.expiresAt); h.setToken('attempt-2');
  const recreated=Resume.createHandoffStore(h.dependencies);
  assert.equal(recreated.issue({edge:h.route,state:h.state}).ok,true);
  assert.deepEqual(h.envelope().usedTokens,['attempt-1','attempt-2']);
  const stale=h.handoff.claim({...h.input,state:h.state}); assert.equal(stale.reason,'token-mismatch');
  assert.equal(recreated.claim({...h.input,token:'attempt-2',state:h.state}).ok,true);
  assert.deepEqual(h.envelope().usedTokens,['attempt-1','attempt-2']);
  h.setTime(h.envelope().expiresAt); h.setToken('attempt-1');
  const again=Resume.createHandoffStore(h.dependencies);
  const before=h.session.getItem(Resume.HANDOFF_KEY);
  assert.equal(again.issue({edge:h.route,state:h.state}).reason,'token-reused');
  assert.equal(h.session.getItem(Resume.HANDOFF_KEY),before);
  h.setToken('attempt-3');assert.equal(again.issue({edge:h.route,state:h.state}).ok,true);
  assert.deepEqual(h.envelope().usedTokens,['attempt-1','attempt-2','attempt-3']);
});

test('identity history survives claim, commit, recreated committed replacement and quota failure', () => {
  const h=harness();const issued=h.issue();
  assert(Object.isFrozen(issued.receipt.usedTokens));
  h.claim();assert.deepEqual(h.envelope().usedTokens,['attempt-1']);
  h.commit();assert.deepEqual(h.envelope().usedTokens,['attempt-1']);
  const state=h.progress.getCurrentState().state;
  const route=edge(Registry.routes[4]);h.setToken('attempt-2');
  const recreated=Resume.createHandoffStore(h.dependencies);
  const before=h.session.getItem(Resume.HANDOFF_KEY);
  h.session.throwWrite=true;
  assert.equal(recreated.issue({edge:route,state}).ok,false);
  assert.equal(h.session.getItem(Resume.HANDOFF_KEY),before);
  h.session.throwWrite=false;assert.equal(recreated.issue({edge:route,state}).ok,true);
  assert.deepEqual(h.envelope().usedTokens,['attempt-1','attempt-2']);
  h.setTime(h.envelope().expiresAt);h.setToken('attempt-1');
  assert.equal(Resume.createHandoffStore(h.dependencies).issue({edge:route,state}).reason,'token-reused');
});

test('corrupt identity histories fail closed without rewriting any evidence', () => {
  for(const usedTokens of [undefined, null, [], ['attempt-1','attempt-1'], ['other'], ['attempt-1',''],
    ['attempt-1',123], ['attempt-1','x'.repeat(129)], {token:'attempt-1'}]) {
    const h=harness();h.issue();const receipt=h.envelope();receipt.usedTokens=usedTokens;
    h.session.bytes.set(Resume.HANDOFF_KEY,JSON.stringify(receipt));
    const before=h.session.getItem(Resume.HANDOFF_KEY);h.setToken('fresh');
    const recreated=Resume.createHandoffStore(h.dependencies);
    assert.equal(recreated.issue({edge:h.route,state:h.state}).reason,'corrupt-handoff');
    assert.equal(recreated.claim({...h.input,state:h.state}).reason,'corrupt-handoff');
    assert.equal(recreated.commit({...h.input,progress:h.progress,readiness:ready()}).reason,'corrupt-handoff');
    assert.equal(h.session.getItem(Resume.HANDOFF_KEY),before);assert.equal(h.durable.writes,0);
  }
});
