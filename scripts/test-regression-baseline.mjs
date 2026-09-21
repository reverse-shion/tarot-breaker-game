import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const baseline = JSON.parse(fs.readFileSync('tests/known-failures.json', 'utf8'));
if (baseline.version !== 1 || !Array.isArray(baseline.failures)) {
  throw new Error('Invalid known-failures baseline');
}

const testFiles = fs.readdirSync('tests')
  .filter(file => file.endsWith('.test.cjs'))
  .sort()
  .map(file => `tests/${file}`);

const result = spawnSync(process.execPath, ['--test', ...testFiles], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});

if (result.error) throw result.error;
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

const output = `${result.stdout || ''}\n${result.stderr || ''}`;
const testsMatch = output.match(/^# tests (\d+)$/m);
const failMatch = output.match(/^# fail (\d+)$/m);
if (!testsMatch || !failMatch) {
  console.error('[Regression baseline] Could not read Node test summary.');
  process.exit(1);
}

const testCount = Number(testsMatch[1]);
const failCount = Number(failMatch[1]);
const failures = [...output.matchAll(/^\s*not ok \d+ - (.+)$/gm)].map(match => match[1].trim());

if (failures.length !== failCount) {
  console.error(`[Regression baseline] Parsed ${failures.length} failures but Node reported ${failCount}.`);
  process.exit(1);
}

if (testCount < baseline.expectedMinimumTestCount) {
  console.error(
    `[Regression baseline] Test count dropped to ${testCount}; baseline minimum is ${baseline.expectedMinimumTestCount}.`,
  );
  process.exit(1);
}

const known = new Set(baseline.failures);
const current = new Set(failures);
const newFailures = failures.filter(name => !known.has(name));
const resolvedFailures = baseline.failures.filter(name => !current.has(name));

console.log(
  `[Regression baseline] tests=${testCount} known-current=${failures.length - newFailures.length} new=${newFailures.length} resolved=${resolvedFailures.length}`,
);

if (resolvedFailures.length) {
  console.log('[Regression baseline] Resolved known failures:');
  for (const name of resolvedFailures) console.log(`  - ${name}`);
}

if (newFailures.length) {
  console.error('[Regression baseline] NEW FAILURES DETECTED:');
  for (const name of newFailures) console.error(`  - ${name}`);
  process.exit(1);
}

if (result.status !== 0 && failCount === 0) {
  console.error(`[Regression baseline] Node test process exited ${result.status} without named test failures.`);
  process.exit(1);
}

console.log('[Regression baseline] PASS — no failures outside the approved current-main baseline.');
