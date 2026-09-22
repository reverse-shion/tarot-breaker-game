const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

function read(path) { return fs.readFileSync(path, "utf8"); }

test("VGC-001: Star Gate prompt owns interaction before investigate", () => {
  const src = read("star-gate-interaction.js");
  assert.match(src, /function\s+lockPrompt\s*\(/, "prompt must have an explicit lock owner");
  assert.match(src, /tarot-breaker:interaction-start/, "opening the prompt must acquire interaction lock");
  assert.match(src, /hidePrompt\(\{\s*unlock:\s*false\s*\}\)/, "inspect must not unlock between prompt and event");
  assert.match(src, /tarot-breaker:star-gate-investigate/, "inspect must dispatch the anomaly start event");
});

test("VGC-001: gameplay runtime suspends and resumes controls through interaction ownership", () => {
  const src = read("game.js");
  assert.match(src, /tarot-breaker:interaction-start[\s\S]{0,500}controls\?\.suspend\(\)/, "interaction-start must suspend controls");
  assert.match(src, /tarot-breaker:interaction-end[\s\S]{0,500}controls\?\.resume\(\)/, "interaction-end must be the explicit resume path");
});

test("VGC-001: Star Gate anomaly listens for investigate and has an observable runtime state", () => {
  const src = read("star-gate-anomaly.js");
  assert.match(src, /addEventListener\(["']tarot-breaker:star-gate-investigate["']\s*,\s*run\)/, "investigate must start anomaly runtime");
  assert.match(src, /getState\s*:\s*\(\)\s*=>\s*\(\{\s*running/, "anomaly runtime must expose running state for regression verification");
});

test("Verified contracts cannot be omitted from CI workflow", () => {
  const workflow = read(".github/workflows/verified-gameplay-contracts.yml");
  assert.match(workflow, /node --test tests\/verified-gameplay-contracts\.test\.cjs/);
});
