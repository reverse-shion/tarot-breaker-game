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


test("VGC-002: Alenon prologue keeps the Devil card baseline", () => {
  const html = read("alenon.html");
  assert.match(html, /assets\/tarot\/major\/15-the-devil\.webp/);
  assert.match(html, /PROLOGUE_TAROT_CARD\s*=\s*["'][^"']*15-the-devil\.webp/);
});

test("VGC-003: Alenon keeps ORB interaction/anomaly implementation markers", () => {
  const html = read("alenon.html");
  assert.match(html, /id=["']orb-interaction-choice["']/);
  assert.match(html, /ORB_INTERACT_RADIUS/);
  assert.match(html, /orb-anomaly/);
});

test("VGC-004: Landing Devil memory remains one-time and Progress-observed", () => {
  const html = read("star-country-landing.html");
  assert.match(html, /landingMemoryDone/);
  assert.match(html, /runDevilMemoryEvent/);
  assert.match(html, /completeEvent\(["']landing_devil_memory["']/);
  assert.match(html, /returningFromGarden/);
});

test("VGC-005: Landing preserves Shiopon return state and greeting guard", () => {
  const html = read("star-country-landing.html");
  assert.match(html, /savedCompanion/);
  assert.match(html, /returnGreetingPlayed/);
  assert.match(html, /runReturnGreeting/);
  assert.match(html, /シオンさん！ おかえりなの！/);
});

test("VGC-006: Garden Progress remains observer-only for Shiopon and Lumiere", () => {
  const observer = read("garden-progress-observer.js");
  const dialogue = read("dialogue.js");
  assert.match(observer, /state\.shioponDone === true/);
  assert.match(observer, /completeEvent\(["']garden_shiopon_meet["']/);
  assert.match(observer, /state\.lumiereDone === true/);
  assert.match(observer, /completeEvent\(["']garden_lumiere_gate["']/);
  assert.match(dialogue, /shioponMeet/);
  assert.match(dialogue, /lumiereGate/);
});

test("VGC-007: Progress validates verified route prerequisites instead of owning them", () => {
  const progress = read("progress.js");
  const observer = read("garden-progress-observer.js");
  assert.match(progress, /mapId === ["']star_gate_garden["'][\s\S]{0,180}landing_devil_memory/);
  assert.match(progress, /spawnId === ["']garden_entrance["'][\s\S]{0,180}landing_devil_memory/);
  assert.match(observer, /only observes/i);
});
