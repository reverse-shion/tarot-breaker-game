const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

function read(path) { return fs.readFileSync(path, "utf8"); }

test("verified gameplay contract registry exists and forbids weakening active contracts", () => {
  const registry = read("docs/VERIFIED_GAMEPLAY_CONTRACTS.md");
  assert.match(registry, /A PR that fails a verified gameplay contract is BLOCKED/);
  assert.match(registry, /must not be marked ACTIVE until/i);
  assert.match(registry, /may never be demoted to PENDING/i);
});

test("VGC-001 recovery contract records the complete Star Gate handoff before implementation recovery", () => {
  const registry = read("docs/VERIFIED_GAMEPLAY_CONTRACTS.md");
  assert.match(registry, /Contract VGC-001 — Star Gate interaction handoff/);
  assert.match(registry, /choice UI becomes visible/);
  assert.match(registry, /player movement is locked/);
  assert.match(registry, /tarot-breaker:star-gate-investigate is dispatched exactly once/);
  assert.match(registry, /StarGateAnomaly enters running state/);
  assert.match(registry, /Status: RECOVERY PENDING/);
});

test("AI safety requires causal regression analysis and preserves verified assertions", () => {
  const safety = read("docs/AI_CHANGE_SAFETY.md");
  assert.match(safety, /stop instead of weakening a contract/i);
  assert.match(safety, /last known-good commit and first known-bad commit/i);
});

test("Verified contracts cannot be omitted from CI workflow", () => {
  const workflow = read(".github/workflows/verified-gameplay-contracts.yml");
  assert.match(workflow, /node --test tests\/verified-gameplay-contracts\.test\.cjs/);
});
