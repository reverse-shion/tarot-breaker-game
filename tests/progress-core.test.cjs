const test = require('node:test');
const assert = require('node:assert/strict');
const Registry = require('../route-registry.js');
const { STORAGE_KEY, VERSION, createProgress, validateRecord, ProgressValidationError } = require('../progress.js');

const initial = () => ({
  version: 1,
  checkpoint: { mapId: 'alenon', spawnId: 'intro' },
  completedEvents: [],
  companion: 'not_joined',
});
const withHistory = (mapId, spawnId, events, companion = 'not_joined') => ({
  version: 1, checkpoint: { mapId, spawnId }, completedEvents: events, companion,
});
const alenon = ['alenon_prologue'];
const memory = [...alenon, 'landing_devil_memory'];
const met = [...memory, 'garden_shiopon_meet'];
const all = [...met, 'garden_lumiere_gate'];

function harness(raw) {
  const map = new Map();
  if (raw !== undefined) map.set(STORAGE_KEY, raw);
  let writes = 0;
  const diagnostics = [];
  const storage = {
    getItem: key => map.get(key) ?? null,
    setItem(key, value) { writes++; map.set(key, value); },
    removeItem: key => map.delete(key),
  };
  return {
    map, storage, diagnostics,
    get writes() { return writes; },
    create() { return createProgress({ storage, diagnostic: d => diagnostics.push(d) }); },
    raw() { return map.get(STORAGE_KEY); },
  };
}
const JSONOf = record => JSON.stringify(record);
const invalid = (record, reason) => {
  const h = harness(JSONOf(record));
  const p = h.create();
  assert.deepEqual(p.load(), { status: 'invalid', reason });
  assert.equal(h.writes, 0);
  assert.equal(h.raw(), JSONOf(record));
  assert.equal(p.getCheckpoint(), null);
};
const fails = (fn, code) => assert.throws(fn, error =>
  error instanceof ProgressValidationError && error.code === code);

test('v1 registry contains exactly the contracted semantic IDs and immutable metadata', () => {
  assert.equal(VERSION, 1);
  assert.equal(STORAGE_KEY, 'tarot-breaker:progress-v1');
  assert.deepEqual(Object.keys(Registry.maps), ['alenon', 'star_country_landing', 'star_gate_garden']);
  assert.deepEqual(Object.keys(Registry.events), [
    'alenon_prologue', 'landing_devil_memory', 'garden_shiopon_meet', 'garden_lumiere_gate',
    'garden_star_gate_anomaly',
  ]);
  assert.deepEqual(Registry.events.garden_star_gate_anomaly, {
    eventId: 'garden_star_gate_anomaly',
    mapId: 'star_gate_garden',
    checkpointSpawnId: 'south_gate',
    requires: ['garden_lumiere_gate'],
  });
  assert.deepEqual(Registry.companionStates, ['not_joined', 'joined_with_shion', 'waiting_at_landing']);
  assert.deepEqual(Registry.maps.alenon.spawnIds, ['intro', 'pad_return']);
  assert.deepEqual(Registry.maps.star_country_landing.spawnIds, ['pad_ground', 'garden_entrance']);
  assert.deepEqual(Registry.maps.star_gate_garden.spawnIds, ['south_gate']);
  assert.equal(Registry.routes.length, 5);
  for (const map of Object.values(Registry.maps)) {
    assert.ok(map.spawnIds.includes(map.defaultSpawnId));
    assert.equal('x' in map, false);
    assert.equal(Object.isFrozen(map.spawnIds), true);
  }
  for (const unwanted of ['orb_inspection', 'shiopon_farewell', 'return_greeting'])
    assert.equal(Registry.isEventId(unwanted), false);
});

test('valid initial, landing and garden checkpoints remain independent of map event completion', () => {
  const cases = [
    initial(),
    withHistory('alenon', 'pad_return', alenon),
    withHistory('star_country_landing', 'pad_ground', alenon),
    withHistory('star_country_landing', 'garden_entrance', memory),
    withHistory('star_gate_garden', 'south_gate', memory), // meet is not implied
    withHistory('star_gate_garden', 'south_gate', all, 'joined_with_shion'),
    withHistory('alenon', 'pad_return', met, 'waiting_at_landing'),
  ];
  for (const record of cases) assert.deepEqual(validateRecord(record).value, record);
  const h = harness(JSONOf(cases[4]));
  const progress = h.create();
  assert.equal(progress.load().status, 'valid');
  assert.equal(progress.isEventCompleted('garden_shiopon_meet'), false);
  const cp = progress.getCheckpoint();
  cp.mapId = 'alenon';
  assert.deepEqual(progress.getCheckpoint(), { mapId: 'star_gate_garden', spawnId: 'south_gate' });
  assert.equal(h.writes, 0);
});

test('missing/malformed/primitive/null/future saves are read-only failures', () => {
  const none = harness();
  assert.deepEqual(none.create().load(), { status: 'none' });
  for (const raw of ['{broken', 'null', 'false', '123', '"hello"', '[]']) {
    const h = harness(raw);
    const result = h.create().load();
    assert.equal(result.status, 'invalid', raw);
    assert.equal(h.raw(), raw);
    assert.equal(h.writes, 0);
    assert.ok(h.diagnostics.length);
    assert.equal(JSON.stringify(h.diagnostics).includes(raw), false);
  }
  invalid({ ...initial(), version: undefined }, 'missing-version'); // JSON omits undefined
  invalid({ version: 1, completedEvents: [], companion: 'not_joined' }, 'invalid-fields');
  const future = harness(JSONOf({ ...initial(), version: 2 }));
  assert.deepEqual(future.create().load(), { status: 'unsupported', reason: 'unsupported-version' });
  assert.equal(future.writes, 0);
  assert.equal(future.raw(), JSONOf({ ...initial(), version: 2 }));
});

test('unknown map/spawn and mismatched map/spawn cannot become a checkpoint', () => {
  invalid(withHistory('other', 'intro', [], 'not_joined'), 'unknown-map');
  invalid(withHistory('alenon', 'other', [], 'not_joined'), 'unknown-spawn');
  invalid(withHistory('alenon', 'south_gate', [], 'not_joined'), 'unknown-spawn');
  invalid(withHistory('star_country_landing', 'pad_ground', [], 'not_joined'), 'checkpoint-prerequisite');
  invalid(withHistory('star_gate_garden', 'south_gate', alenon), 'checkpoint-prerequisite');
  invalid(withHistory('alenon', 'pad_return', []), 'checkpoint-prerequisite');
  invalid(withHistory('star_country_landing', 'garden_entrance', alenon), 'checkpoint-prerequisite');
  invalid({ ...initial(), checkpoint: { mapId: 'alenon' } }, 'invalid-checkpoint');
  invalid({ ...initial(), extra: true }, 'invalid-fields');
});

test('unknown events and impossible prerequisites are rejected, not repaired', () => {
  invalid(withHistory('alenon', 'intro', ['unregistered_event']), 'unknown-event');
  invalid(withHistory('alenon', 'intro', ['garden_lumiere_gate']), 'missing-prerequisite');
  invalid(withHistory('star_gate_garden', 'south_gate', [
    'alenon_prologue', 'landing_devil_memory', 'garden_lumiere_gate',
  ]), 'missing-prerequisite');
  invalid(withHistory('star_country_landing', 'pad_ground', ['landing_devil_memory']), 'missing-prerequisite');
  assert.deepEqual(Registry.events.landing_devil_memory.requires, alenon);
  assert.deepEqual(Registry.events.garden_shiopon_meet.requires, memory);
  assert.deepEqual(Registry.events.garden_lumiere_gate.requires, ['garden_shiopon_meet']);
  assert.deepEqual(Registry.events.garden_star_gate_anomaly.requires, ['garden_lumiere_gate']);
});

test('known event duplicates normalize only in memory; unknown events never disappear', () => {
  const record = withHistory('star_country_landing', 'pad_ground', [
    'alenon_prologue', 'alenon_prologue', 'landing_devil_memory', 'landing_devil_memory',
  ]);
  const raw = JSONOf(record);
  const h = harness(raw);
  const p = h.create();
  const loaded = p.load();
  assert.equal(loaded.status, 'valid');
  assert.equal(loaded.normalized, true);
  assert.deepEqual(loaded.state.completedEvents, memory);
  loaded.state.completedEvents.push('garden_shiopon_meet');
  assert.equal(p.isEventCompleted('garden_shiopon_meet'), false);
  assert.equal(h.raw(), raw);
  assert.equal(h.writes, 0);
  invalid({ ...record, completedEvents: [...record.completedEvents, 'unknown'] }, 'unknown-event');
});

test('companion invariants reject false joins and impossible locations', () => {
  assert.equal(validateRecord(initial()).ok, true);
  invalid(withHistory('star_gate_garden', 'south_gate', memory, 'joined_with_shion'), 'companion-history-mismatch');
  invalid(withHistory('star_country_landing', 'pad_ground', memory, 'waiting_at_landing'), 'companion-history-mismatch');
  invalid(withHistory('star_gate_garden', 'south_gate', met, 'not_joined'), 'companion-history-mismatch');
  invalid(withHistory('alenon', 'pad_return', met, 'joined_with_shion'), 'companion-location-mismatch');
  invalid(withHistory('star_gate_garden', 'south_gate', met, 'waiting_at_landing'), 'companion-location-mismatch');
  assert.equal(validateRecord(withHistory('star_country_landing', 'pad_ground', met, 'joined_with_shion')).ok, true);
  assert.equal(validateRecord(withHistory('star_country_landing', 'pad_ground', met, 'waiting_at_landing')).ok, true);
});

test('registered event completions are one-key atomic, ordered and idempotent', () => {
  const h = harness(JSONOf(initial()));
  h.map.set('tarot-breaker:bgm-enabled', '0');
  h.map.set('tarot-breaker:map-editor-v8', 'draft');
  h.map.set('tarot-breaker:map-journey-v1', '{"gardenStory":{"shioponDone":true}}');
  const p = h.create();
  p.load();
  fails(() => p.isEventCompleted('orb_inspection'), 'unknown-event');
  fails(() => p.completeEvent('orb_inspection', initial().checkpoint), 'unknown-event');
  fails(() => p.completeEvent('landing_devil_memory', {
    mapId: 'star_country_landing', spawnId: 'pad_ground',
  }), 'missing-prerequisite'); // No current map/required history.
  assert.equal(h.writes, 0);
  const done = p.completeEvent('alenon_prologue', { mapId: 'alenon', spawnId: 'intro' });
  assert.equal(done.completed, true);
  assert.equal(done.persisted, true);
  assert.equal(h.writes, 1);
  assert.deepEqual(JSON.parse(h.raw()), withHistory('alenon', 'intro', alenon));
  const again = p.completeEvent('alenon_prologue', { mapId: 'alenon', spawnId: 'intro' });
  assert.equal(again.alreadyCompleted, true);
  assert.equal(h.writes, 1);
  fails(() => p.completeEvent('garden_lumiere_gate', {mapId: 'star_gate_garden',spawnId: 'south_gate'}), 'missing-prerequisite');
  assert.equal(h.map.get('tarot-breaker:bgm-enabled'), '0');
  assert.equal(h.map.get('tarot-breaker:map-editor-v8'), 'draft');
  assert.equal(h.map.get('tarot-breaker:map-journey-v1'), '{"gardenStory":{"shioponDone":true}}');
});

test('all five events complete only at their registered map and spawn; anomaly requires Lumiere and remains idempotent', () => {
  const h = harness(JSONOf(initial()));
  const p = h.create(); p.load();
  p.completeEvent('alenon_prologue', { mapId: 'alenon', spawnId: 'intro' });
  p.commitArrival(Registry.routes[1]);
  fails(() => p.completeEvent('landing_devil_memory', { mapId: 'alenon', spawnId: 'intro' }), 'invalid-event-checkpoint');
  p.completeEvent('landing_devil_memory', { mapId: 'star_country_landing', spawnId: 'pad_ground' });
  p.commitArrival(Registry.routes[2]);
  p.completeEvent('garden_shiopon_meet', { mapId: 'star_gate_garden', spawnId: 'south_gate' });
  assert.equal(p.isEventCompleted('garden_shiopon_meet'), true);
  assert.equal(JSON.parse(h.raw()).companion, 'joined_with_shion');
  fails(() => p.completeEvent('garden_star_gate_anomaly', { mapId: 'star_gate_garden', spawnId: 'south_gate' }), 'missing-prerequisite');
  p.completeEvent('garden_lumiere_gate', { mapId: 'star_gate_garden', spawnId: 'south_gate' });
  const anomaly = p.completeEvent('garden_star_gate_anomaly', { mapId: 'star_gate_garden', spawnId: 'south_gate' });
  assert.equal(anomaly.completed, true);
  assert.equal(p.isEventCompleted('garden_star_gate_anomaly'), true);
  assert.deepEqual(JSON.parse(h.raw()).completedEvents, [...all, 'garden_star_gate_anomaly']);
  const again = p.completeEvent('garden_star_gate_anomaly', { mapId: 'star_gate_garden', spawnId: 'south_gate' });
  assert.equal(again.alreadyCompleted, true);
  assert.equal(h.writes, 7); // Five event commits + two arrival commits; repeat is write-free.
});

test('route registry accepts five exact edges; it never creates an event', () => {
  const histories = [[], alenon, memory, memory, alenon];
  Registry.routes.forEach((edge, i) => {
    const before = JSONOf(histories[i]);
    const result = Registry.validateRoute(edge, histories[i]);
    assert.equal(result.ok, true);
    assert.equal(JSONOf(histories[i]), before);
    result.route.requires.push('untrusted');
    assert.equal(Registry.routes[i].requires.includes('untrusted'), false);
  });
  const edge = Registry.routes[2];
  assert.deepEqual(Registry.validateRoute({ ...edge, reason: 'bad_reason' }, memory), {ok: false,reason: 'unknown-route'});
  assert.deepEqual(Registry.validateRoute({ ...edge, spawnId: 'pad_ground' }, memory), {ok: false,reason: 'unknown-route'});
  assert.deepEqual(Registry.validateRoute({ ...edge, destinationMapId: 'alenon' }, memory), {ok: false,reason: 'unknown-route'});
  assert.deepEqual(Registry.validateRoute(edge, alenon), {ok: false,reason: 'missing-prerequisite'});
  assert.deepEqual(Registry.validateRoute(edge, [...memory, 'unknown']), {ok: false,reason: 'invalid-events'});
});

test('arrival commits checkpoint only; source and Devil memory prerequisite are enforced', () => {
  const h = harness(JSONOf(withHistory('star_country_landing', 'pad_ground', alenon)));
  const p = h.create(); p.load();
  fails(() => p.commitArrival(Registry.routes[2]), 'missing-prerequisite');
  assert.equal(h.writes, 0);
  assert.deepEqual(JSON.parse(h.raw()).completedEvents, alenon);
  const ready = harness(JSONOf(withHistory('star_country_landing', 'pad_ground', memory)));
  const q = ready.create(); q.load();
  fails(() => q.commitArrival(Registry.routes[3]), 'route-source-mismatch');
  const result = q.commitArrival(Registry.routes[2]);
  assert.equal(result.committed, true);
  assert.equal(ready.writes, 1);
  assert.deepEqual(q.getCheckpoint(), { mapId: 'star_gate_garden', spawnId: 'south_gate' });
  assert.deepEqual(JSON.parse(ready.raw()).completedEvents, memory);
  assert.equal(q.isEventCompleted('garden_shiopon_meet'), false);
  const bytes = ready.raw();
  const duplicate = q.commitArrival(Registry.routes[2]);
  assert.deepEqual({committed:duplicate.committed,persisted:duplicate.persisted,alreadyCommitted:duplicate.alreadyCommitted},
    {committed:true,persisted:true,alreadyCommitted:true});
  assert.equal(ready.writes, 1);
  assert.equal(ready.raw(), bytes);
  assert.deepEqual(duplicate.state.completedEvents, memory);
  assert.equal(duplicate.state.companion, 'not_joined');
  fails(() => q.commitArrival({...Registry.routes[2], reason:'forged'}), 'unknown-route');
  const inconsistent = harness(JSONOf(withHistory('star_gate_garden','south_gate',alenon)));
  assert.equal(inconsistent.create().load().status, 'invalid');
});

test('companion transitions require meet, approved reason and landing checkpoint', () => {
  const h = harness(JSONOf(withHistory('star_country_landing', 'garden_entrance', met, 'joined_with_shion')));
  const p = h.create(); p.load();
  fails(() => p.setCompanion('not_joined', {mapId: 'star_country_landing',spawnId: 'pad_ground'}, 'board_pad'), 'unapproved-companion-transition');
  fails(() => p.setCompanion('waiting_at_landing', {mapId: 'star_country_landing',spawnId: 'pad_ground'}, 'wrong'), 'unapproved-companion-transition');
  assert.equal(p.setCompanion('waiting_at_landing', {mapId: 'star_country_landing',spawnId: 'pad_ground'}, 'board_pad').persisted, true);
  assert.equal(h.writes, 1);
  assert.equal(p.setCompanion('waiting_at_landing', {mapId: 'star_country_landing',spawnId: 'pad_ground'}, 'board_pad').alreadyCommitted, true);
  assert.equal(h.writes, 1);
  assert.equal(p.setCompanion('joined_with_shion', {mapId: 'star_country_landing',spawnId: 'pad_ground'}, 'rejoin_after_arrival').persisted, true);
  assert.equal(h.writes, 2);
  const noMeet = harness(JSONOf(withHistory('star_country_landing', 'pad_ground', memory)));
  const q = noMeet.create(); q.load();
  fails(() => q.setCompanion('joined_with_shion', {mapId:'star_country_landing',spawnId:'pad_ground'}, 'rejoin_after_arrival'), 'unapproved-companion-transition');
});

test('failed write preserves confirmed record and reports volatile candidate separately', () => {
  const h = harness(JSONOf(initial()));
  const p = h.create(); p.load();
  const before = h.raw();
  h.storage.setItem = () => { throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); };
  const failed = p.completeEvent('alenon_prologue', {mapId:'alenon',spawnId:'intro'});
  assert.equal(failed.persisted, false);
  assert.equal(failed.completed, false);
  assert.equal(failed.reason, 'quota-exceeded');
  assert.deepEqual(failed.candidate.completedEvents, alenon);
  assert.equal(p.isEventCompleted('alenon_prologue'), true); // current run only, not durable
  assert.equal(p.getCurrentState().persisted, false);
  assert.equal(h.raw(), before);
  assert.deepEqual(p.getCheckpoint(), initial().checkpoint);
  assert.equal(h.diagnostics.at(-1).code, 'quota-exceeded');
  h.storage.setItem = () => { throw new Error('blocked'); };
  const reset = p.resetGame('user-selected-new-game');
  assert.equal(reset.persisted, false);
  assert.equal(reset.started, true);
  assert.equal(h.raw(), before);
  assert.equal(h.diagnostics.at(-1).code, 'write-unavailable');
  assert.deepEqual(p.getCurrentState(), {state:initial(),persisted:false});
  assert.equal(p.isEventCompleted('alenon_prologue'), false);
});

test('storage read failures and unavailable storage never import legacy or crash', () => {
  const h = harness();
  h.map.set('tarot-breaker:map-journey-v1', JSONOf({gardenStory:{shioponDone:true},landingMemoryDone:true}));
  h.map.set('tarot-breaker:bgm-enabled', '0');
  h.storage.getItem = () => { throw new Error('read blocked'); };
  const p = h.create();
  assert.deepEqual(p.load(), {status:'unavailable',reason:'read-unavailable'});
  assert.deepEqual(p.getCheckpoint(), null);
  const missing = createProgress({storage:null,diagnostic:()=>{}});
  assert.equal(missing.load().status, 'unavailable');
  assert.deepEqual({started:missing.resetGame('offline-new-game').started,persisted:missing.getCurrentState().persisted},
    {started:true,persisted:false});
  assert.deepEqual(missing.getCurrentState().state, initial());
  assert.equal(h.map.has(STORAGE_KEY), false);
  assert.ok(h.map.has('tarot-breaker:map-journey-v1'));
  assert.equal(h.map.get('tarot-breaker:bgm-enabled'), '0');
});

test('reset writes the exact clean schema once and never deletes other keys', () => {
  const h = harness(JSONOf(withHistory('star_gate_garden','south_gate',all,'joined_with_shion')));
  h.map.set('tarot-breaker:bgm-enabled', '0');
  h.map.set('tarot-breaker:map-editor-v8', 'draft');
  h.map.set('tarot-breaker:map-journey-v1', 'old');
  const p = h.create(); p.load();
  const result = p.resetGame('deliberate-new-game');
  assert.equal(result.persisted, true);
  assert.equal(result.started, true);
  assert.equal(h.writes, 1);
  assert.deepEqual(JSON.parse(h.raw()), initial());
  assert.deepEqual(p.getCheckpoint(), initial().checkpoint);
  assert.equal(h.map.get('tarot-breaker:bgm-enabled'), '0');
  assert.equal(h.map.get('tarot-breaker:map-editor-v8'), 'draft');
  assert.equal(h.map.get('tarot-breaker:map-journey-v1'), 'old');
});

test('New Game token suppresses repeats without rewinding later progress; distinct token replaces it', () => {
  const h = harness(JSONOf(initial()));
  const p = h.create(); p.load();
  fails(() => p.resetGame(), 'invalid-new-game-action-token');
  fails(() => p.resetGame(''), 'invalid-new-game-action-token');
  assert.equal(h.writes, 0);
  const first = p.resetGame('new-game-action-1');
  assert.equal(first.started, true);
  assert.equal(first.persisted, true);
  assert.equal(h.writes, 1);
  p.completeEvent('alenon_prologue', initial().checkpoint);
  const bytes = h.raw();
  const duplicate = p.resetGame('new-game-action-1');
  assert.equal(duplicate.alreadyStarted, true);
  assert.equal(duplicate.persisted, true);
  assert.equal(h.writes, 2);
  assert.equal(h.raw(), bytes);
  assert.equal(p.isEventCompleted('alenon_prologue'), true);
  assert.equal(p.resetGame('new-game-action-2').persisted, true);
  assert.equal(h.writes, 3);
  assert.deepEqual(JSON.parse(h.raw()), initial());
  assert.equal(p.resetGame('new-game-action-1').alreadyStarted, true); // stale action cannot reset again
  assert.equal(h.writes, 3);
});

test('offline New Game and subsequent event/arrival remain playable without overwriting old save', () => {
  const old = withHistory('star_gate_garden','south_gate',all,'joined_with_shion');
  const h = harness(JSONOf(old));
  const p = h.create(); p.load();
  h.storage.setItem = () => { throw new Error('blocked'); };
  const reset = p.resetGame('explicit-offline-new-game');
  assert.equal(reset.started, true);
  assert.equal(reset.persisted, false);
  assert.deepEqual(p.getCheckpoint(), old.checkpoint); // last confirmed durable record
  assert.deepEqual(p.getCurrentState(), {state:initial(),persisted:false});
  assert.equal(p.resetGame('explicit-offline-new-game').alreadyStarted, true);
  const event = p.completeEvent('alenon_prologue', initial().checkpoint);
  assert.deepEqual({completed:event.completed,persisted:event.persisted}, {completed:false,persisted:false});
  assert.equal(p.isEventCompleted('alenon_prologue'), true); // current nonpersistent history
  assert.deepEqual(p.getCurrentState().state.completedEvents, alenon);
  const external = p.getCurrentState();
  external.state.completedEvents.push('garden_shiopon_meet');
  assert.deepEqual(p.getCurrentState().state.completedEvents, alenon);
  const arrival = p.commitArrival(Registry.routes[1]);
  assert.deepEqual({committed:arrival.committed,persisted:arrival.persisted}, {committed:false,persisted:false});
  assert.deepEqual(p.getCurrentState().state.checkpoint, {mapId:'star_country_landing',spawnId:'pad_ground'});
  const repeatedAction = p.resetGame('explicit-offline-new-game');
  assert.equal(repeatedAction.alreadyStarted, true);
  assert.equal(repeatedAction.persisted, false);
  assert.deepEqual(p.getCurrentState().state.checkpoint, {mapId:'star_country_landing',spawnId:'pad_ground'});
  assert.deepEqual(JSON.parse(h.raw()), old);
  assert.deepEqual(p.getCheckpoint(), old.checkpoint);
  assert.equal(p.commitArrival(Registry.routes[1]).persisted, false);
  h.storage.setItem = (key,value) => h.map.set(key,value);
  const saved = p.completeEvent('landing_devil_memory', {mapId:'star_country_landing',spawnId:'pad_ground'});
  assert.equal(saved.persisted, true); // whole volatile history saved in a single record
  assert.deepEqual(JSON.parse(h.raw()), withHistory('star_country_landing','pad_ground',memory));
  assert.equal(p.getCurrentState().persisted, true);
});
