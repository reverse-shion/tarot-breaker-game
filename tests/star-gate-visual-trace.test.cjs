const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const bootSource = fs.readFileSync('stage3-dev-bootstrap.js', 'utf8');
const traceSource = fs.readFileSync('star-gate-visual-trace.js', 'utf8');

function boot(queryString) {
  const writes = [];
  const skyImage = { src: '' };
  const sky = { classList: { add() {} }, querySelector: () => skyImage };
  const normalGateImage = { classList: { add() {} } };
  const gate = { querySelector: () => normalGateImage, append() {} };
  const shell = {
    querySelector: (selector) => selector === '.scene-farthest-sky' ? sky :
      selector === '.scene-star-gate' ? gate : null,
    insertAdjacentHTML() {}
  };
  const document = {
    body: { dataset: {} },
    documentElement: { dataset: {} },
    getElementById: selector => selector === 'game-shell' ? shell : null,
    createElement: () => ({}),
    write: value => writes.push(value)
  };
  const window = { addEventListener() {} };
  const location = { search: queryString };
  vm.runInNewContext(bootSource, { URLSearchParams, window, location, document });
  return { writes, window };
}

test('visual trace and dev bootstrap parse as JavaScript', () => {
  assert.doesNotThrow(() => new vm.Script(traceSource));
  assert.doesNotThrow(() => new vm.Script(bootSource));
});

test('default star-gate-full entry does not load visual audit', () => {
  const state = boot('?dev=star-gate-full');
  assert.equal(state.window.__TAROT_DEV_STAGE3__, true);
  assert.ok(state.writes.some(value => value.includes('star-gate-anomaly.js')));
  assert.ok(state.writes.every(value => !value.includes('star-gate-visual-trace.js')));
});

test('explicit dev opt-in loads telemetry without rewriting the standard dev scripts', () => {
  const ordinary = boot('?dev=star-gate-full');
  const opted = boot('?dev=star-gate-full&gateAudit=1');
  assert.deepEqual(opted.writes.slice(0, -1), ordinary.writes);
  assert.equal(opted.writes.length, ordinary.writes.length + 1);
  assert.match(opted.writes.at(-1), /star-gate-visual-trace\.js/);
  assert.ok(opted.writes.at(-1).includes('defer'));
});

test('telemetry is inert outside the explicitly approved dev route', () => {
  for (const queryString of ['', '?gateAudit=1', '?dev=star-gate-full',
                             '?dev=star-gate-full&gateAudit=0']) {
    let touched = false;
    const document = { getElementById() { touched = true; throw new Error('DOM touched'); } };
    const context = { URLSearchParams, location: { search: queryString }, document };
    assert.doesNotThrow(() => vm.runInNewContext(traceSource, context));
    assert.equal(touched, false);
  }
});

test('telemetry only measures targeted scenes; screenshot equivalence is not asserted', () => {
  for (const phase of ['corrupted_pre_black', 'present_return', 'free_control_',
                       'aftermath_completed', 'normal']) {
    assert.ok(traceSource.includes(phase));
  }
  assert.ok(traceSource.includes('getComputedStyle'));
  assert.ok(traceSource.includes('declarationSources'));
  assert.ok(traceSource.includes('not pixel comparison'));
  assert.doesNotMatch(traceSource, /classList\.(add|remove)\(\s*['"]sga-/);
});
