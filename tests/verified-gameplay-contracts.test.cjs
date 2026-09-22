const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

function read(path) { return fs.readFileSync(path, "utf8"); }

test("verified gameplay contract registry exists and forbids weakening active contracts", () => {
  const registry = read("docs/VERIFIED_GAMEPLAY_CONTRACTS.md");
  assert.match(registry, /A PR that fails a verified gameplay contract is BLOCKED/);
  assert.match(registry, /Contract VGC-001 — Star Gate unfinished-event suppression/);
  assert.match(registry, /Status: ACTIVE/);
});

test("VGC-001: unfinished Star Gate interaction is absent from normal main route", () => {
  const html = read("index.html");
  assert.doesNotMatch(html, /star-gate-interaction\.js/);
  assert.doesNotMatch(html, /star-gate-anomaly\.js/);
  assert.doesNotMatch(html, /star-gate-interaction\.css/);
  assert.doesNotMatch(html, /star-gate-anomaly\.css/);
  assert.doesNotMatch(html, /star-gate-interaction-choice/);
});

test("VGC-001 records the explicit completion gate before Star Gate UI can be enabled", () => {
  const registry = read("docs/VERIFIED_GAMEPLAY_CONTRACTS.md");
  assert.match(registry, /does NOT display the "星門を調べる \/ 離れる" choice UI/);
  assert.match(registry, /explicit product decision that the full event is complete/);
  assert.match(registry, /same reviewed PR that enables the completed event/);
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
