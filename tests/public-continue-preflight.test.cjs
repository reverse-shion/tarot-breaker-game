const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawnSync} = require('node:child_process');

const segments = ['public-continue-title', 'public-continue-alenon',
  'public-continue-landing', 'public-continue-garden', 'public-continue-integration'];
const run = (target, cwd = process.cwd()) => spawnSync(process.execPath,
  [path.resolve('scripts/event-preflight.cjs'), '--target', target], {cwd, encoding:'utf8'});

test('Public Continue target and segments are preflightable without claiming device verification or release', () => {
  const registry = JSON.parse(fs.readFileSync('event-contracts.json', 'utf8'));
  const entry = registry.events['public-continue'];
  assert.equal(entry.status, 'NOT TESTED');
  assert.equal(entry.productionEnabled, false);
  assert.deepEqual(Object.keys(entry.segments), segments);
  for (const target of ['public-continue', ...segments]) {
    const result = run(target);
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.event, 'public-continue');
    assert.equal(output.target, target);
    assert.equal(output.status, 'NOT TESTED');
    assert.equal(output.productionEnabled, false);
    assert.equal(output.changeAuthorized, true);
  }
  const contracts = fs.readFileSync('docs/EVENT_CONTRACTS.md', 'utf8');
  assert.match(contracts, /NOT TESTED \/ Alenon candidate runtime \/ unreleased/);
  assert.match(contracts, /Landing\/Garden Public runtime remains unavailable/);
  assert.match(contracts, /Preflight PASS proves target registration only/);
});

test('unknown Public Continue targets remain blocked', () => {
  const result = run('public-continue-unregistered');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /target is not registered/);
});

test('registering Public Continue does not bypass locked event or segment refusal', t => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'public-continue-preflight-'));
  t.after(() => fs.rmSync(cwd, {recursive:true, force:true}));
  for (const file of ['AGENTS.md', 'docs/EVENT_DEVELOPMENT_SYSTEM.md',
    'docs/VERIFIED_GAMEPLAY_CONTRACTS.md', 'docs/EVENT_CONTRACTS.md',
    'docs/DEVICE_VERIFICATION_REGISTRY.md', 'docs/AI_CHANGE_SAFETY.md', 'dev-checkpoints.js']) {
    const destination = path.join(cwd, file);
    fs.mkdirSync(path.dirname(destination), {recursive:true});
    fs.copyFileSync(file, destination);
  }
  const registry = JSON.parse(fs.readFileSync('event-contracts.json', 'utf8'));
  for (const status of ['DEVICE VERIFIED', 'CONTRACT LOCKED', 'MAIN VERIFIED']) {
    registry.events['public-continue'].status = status;
    registry.events['public-continue'].segments['public-continue-title'] = status;
    fs.writeFileSync(path.join(cwd, 'event-contracts.json'), JSON.stringify(registry));
    for (const target of ['public-continue', 'public-continue-title']) {
      const result = run(target, cwd);
      assert.equal(result.status, 3, result.stderr);
      assert.equal(JSON.parse(result.stdout).changeAuthorized, false);
    }
  }
});
