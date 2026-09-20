const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const Core = require('../progress.js');
const Registry = require('../route-registry.js');
const Guard = require('../progress-legacy-guard.js');

const initial = () => ({
  version: 1, checkpoint: { mapId: 'alenon', spawnId: 'intro' },
  completedEvents: [], companion: 'not_joined',
});
const landing = () => ({
  ...initial(), checkpoint: { mapId: 'star_country_landing', spawnId: 'pad_ground' },
  completedEvents: ['alenon_prologue'],
});
const oldJourney = {
  gardenStory: { shioponDone: true, lumiereDone: true, joined: true },
  landingMemoryDone: true,
  companion: { mode: 'waiting', x: 200, y: 300 },
};
function store(entries = {}) {
  const data = new Map(Object.entries(entries));
  const calls = [];
  return {
    data, calls,
    getItem(key) { calls.push(['get',key]); return data.has(key) ? data.get(key) : null; },
    setItem(key,value) { calls.push(['set',key]); data.set(key,value); },
    removeItem(key) { calls.push(['remove',key]); data.delete(key); },
    clear() { calls.push(['clear']); data.clear(); },
  };
}
function setup({ save, legacy } = {}) {
  const local = store(save === undefined ? {} : { [Core.STORAGE_KEY]: save });
  const session = store(legacy === undefined ? {} : { [Guard.LEGACY_KEY]: legacy });
  const diagnostics = [];
  const progress = Core.createProgress({ storage: local, diagnostic: item => diagnostics.push(item) });
  const guard = Guard.createLegacyGuard({ progress, storage: session, diagnostic: item => diagnostics.push(item) });
  return { local, session, diagnostics, progress, guard };
}
const status = (fixture) => fixture.guard.resolveAuthority();
function noMutation(fixture, expectedLocal, expectedLegacy) {
  assert.equal(fixture.local.data.get(Core.STORAGE_KEY), expectedLocal);
  assert.equal(fixture.session.data.get(Guard.LEGACY_KEY), expectedLegacy);
  for (const backend of [fixture.local, fixture.session]) {
    assert.equal(backend.calls.some(([method]) => method !== 'get'), false);
  }
}

test('legacy inspection is read-only and distinguishes absence, object, malformed, and nonobject JSON', () => {
  assert.equal(Guard.LEGACY_KEY, 'tarot-breaker:map-journey-v1');
  assert.equal(Object.isFrozen(Guard.LEGACY_STATUSES), true);
  const cases = [
    [undefined, 'legacy_absent'],
    ['{}', 'legacy_present_parseable'],
    [JSON.stringify(oldJourney), 'legacy_present_parseable'],
    ['{broken-json', 'legacy_present_malformed'],
    ['null', 'legacy_present_nonobject'],
    ['true', 'legacy_present_nonobject'],
    ['7', 'legacy_present_nonobject'],
    ['"text"', 'legacy_present_nonobject'],
    ['[]', 'legacy_present_nonobject'],
  ];
  for (const [raw, expected] of cases) {
    const fixture = setup({ legacy: raw });
    assert.deepEqual(fixture.guard.inspect(), {status:expected});
    assert.deepEqual(fixture.guard.inspect(), {status:expected});
    assert.equal(fixture.session.calls.length, 2);
    noMutation(fixture, undefined, raw);
  }
});

test('unavailable session storage and read exceptions never suppress valid Progress authority', () => {
  const save = JSON.stringify(landing());
  const fixture = setup({ save });
  fixture.session.getItem = () => { throw new Error('private mode'); };
  assert.deepEqual(fixture.guard.inspect(), {status:'legacy_unavailable'});
  assert.deepEqual(status(fixture), {
    authority:'progress_v1',canContinue:true,legacy:'legacy_unavailable',
  });
  assert.deepEqual(fixture.diagnostics.at(-1), {failureClass:'legacy-storage',code:'read-unavailable'});
  noMutation(fixture, save, undefined);

  const missing = Guard.createLegacyGuard({
    progress: fixture.progress, storage: null, diagnostic: () => {},
  });
  assert.equal(missing.inspect().status, 'legacy_unavailable');
  assert.equal(missing.resolveAuthority().authority, 'progress_v1');
});

test('old completion fields, companion mode, and pixel coordinates never create Progress v1', () => {
  const variants = [
    {gardenStory:{shioponDone:true}},
    {gardenStory:{lumiereDone:true}},
    {landingMemoryDone:true},
    {companion:{mode:'following'}},
    {companion:{mode:'waiting',x:701,y:408}},
    oldJourney,
  ];
  for (const legacy of variants) {
    const raw = JSON.stringify(legacy);
    const fixture = setup({legacy:raw});
    assert.deepEqual(status(fixture), {
      authority:'none',canContinue:false,legacy:'legacy_present_parseable',
    });
    assert.equal(fixture.progress.getCheckpoint(), null);
    assert.equal(fixture.progress.getCurrentState(), null);
    for (const id of Object.keys(Registry.events))
      assert.equal(fixture.progress.isEventCompleted(id), false);
    assert.equal(fixture.local.data.has(Core.STORAGE_KEY), false);
    noMutation(fixture, undefined, raw);
  }
});

test('valid v1 wins with absent, matching, conflicting, or malformed legacy bytes', () => {
  const save = JSON.stringify(landing()); // Devil memory and Shiopon meeting are NOT complete.
  const matching = JSON.stringify({landingMemoryDone:false,gardenStory:{shioponDone:false,joined:false}});
  for (const legacy of [undefined, matching, JSON.stringify(oldJourney), '{broken-json']) {
    const fixture = setup({save,legacy});
    const result = status(fixture);
    assert.equal(result.authority, 'progress_v1');
    assert.equal(result.canContinue, true);
    assert.equal(fixture.progress.isEventCompleted('landing_devil_memory'), false);
    assert.equal(fixture.progress.isEventCompleted('garden_shiopon_meet'), false);
    assert.equal(fixture.progress.isEventCompleted('garden_lumiere_gate'), false);
    assert.deepEqual(fixture.progress.getCheckpoint(), landing().checkpoint);
    assert.equal(Registry.validateRoute(Registry.routes[2], landing().completedEvents).ok, false);
    noMutation(fixture, save, legacy);
    assert.equal(result.legacy, legacy === undefined ? 'legacy_absent' :
      legacy === '{broken-json' ? 'legacy_present_malformed' : 'legacy_present_parseable');
  }
});

test('a purported valid load with a non-v1 record is rejected even through a substituted loader', () => {
  const legacy = JSON.stringify(oldJourney);
  const fixture = setup({legacy});
  const substituted = Guard.createLegacyGuard({
    progress: {load: () => ({status:'valid',state:oldJourney})}, storage:fixture.session,
    diagnostic:()=>{},
  });
  assert.deepEqual(substituted.resolveAuthority(), {
    authority:'invalid_progress',canContinue:false,legacy:'legacy_present_parseable',
  });
  noMutation(fixture, undefined, legacy);
});

test('corrupt and future durable records cannot fall back to plausible legacy data', () => {
  const legacy = JSON.stringify(oldJourney);
  const cases = [
    ['{broken', 'invalid_progress'],
    [JSON.stringify({...initial(),version:2}), 'unsupported_progress'],
    [JSON.stringify({...landing(),completedEvents:['garden_shiopon_meet']}), 'invalid_progress'],
  ];
  for (const [save,authority] of cases) {
    const fixture = setup({save,legacy});
    assert.deepEqual(status(fixture), {
      authority,canContinue:false,legacy:'legacy_present_parseable',
    });
    assert.equal(fixture.progress.getCheckpoint(), null);
    noMutation(fixture, save, legacy);
  }
});

test('local storage failure is distinct from legacy detection and grants no durable authority', () => {
  const legacy = JSON.stringify(oldJourney);
  const fixture = setup({legacy});
  fixture.local.getItem = () => { throw new Error('blocked'); };
  assert.deepEqual(status(fixture), {
    authority:'unavailable_progress',canContinue:false,legacy:'legacy_present_parseable',
  });
  noMutation(fixture, undefined, legacy);
});

test('route queries and skipPrologue cannot become authority or write any progress', () => {
  const source = fs.readFileSync(path.join(__dirname,'../progress-legacy-guard.js'),'utf8');
  for (const query of [
    '?from=title','?from=landing','?from=landing-return','?from=alenon',
    '?from=garden','?skipPrologue=1','?from=landing&skipPrologue=1',
  ]) {
    const legacy = JSON.stringify({...oldJourney,query});
    const fixture = setup({legacy});
    const browser = {TarotProgressCore:Core};
    Object.defineProperty(browser,'location',{get() {throw new Error('Guard read URL');}});
    vm.runInNewContext(source, browser, {filename:'progress-legacy-guard.js'});
    const browserGuard = browser.TarotLegacyGuard.createLegacyGuard({
      progress:fixture.progress, storage:fixture.session, diagnostic:()=>{},
    });
    assert.equal(browserGuard.resolveAuthority().authority, 'none', query);
    assert.equal(fixture.local.data.has(Core.STORAGE_KEY), false);
    noMutation(fixture, undefined, legacy);
  }
});

test('repeated authority checks only read storage, never create, normalize, or delete either key', () => {
  const save = JSON.stringify(landing());
  const legacy = JSON.stringify(oldJourney);
  const fixture = setup({save,legacy});
  for (let n=0;n<3;n++) assert.deepEqual(status(fixture), {
    authority:'progress_v1',canContinue:true,legacy:'legacy_present_parseable',
  });
  assert.equal(fixture.local.calls.length, 3);
  assert.equal(fixture.session.calls.length, 3);
  noMutation(fixture, save, legacy);
});
