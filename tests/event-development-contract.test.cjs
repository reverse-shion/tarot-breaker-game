const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = p => fs.readFileSync(p, "utf8");

test("event development contract is repository authority", () => {
  const c = read("docs/EVENT_DEVELOPMENT_CONTRACT.md");
  assert.match(c, /MAIN BASELINE -> EVENT SANDBOX BRANCH -> DEV CHECKPOINT -> CI -> DEVICE VERIFY/);
  assert.match(c, /Developer checkpoints MUST NOT mutate production Progress\/localStorage/);
  assert.match(c, /A checkpoint is INVALID if it only renders the entry UI but cannot execute the real event runtime/);
  assert.match(c, /If a change breaks a DEVICE VERIFIED behavior:[\s\S]*STOP/);
  assert.match(c, /Passing an event in isolation is not permission to merge it to main/);
  assert.match(c, /Conversation memory is never authoritative over these repository contracts/);
});

test("device verification registry cannot confuse CI with device PASS", () => {
  const r = read("docs/DEVICE_VERIFICATION_REGISTRY.md");
  assert.match(r, /Only explicit human real-device verification may add a PASS/);
  assert.match(r, /CI PASS is not DEVICE PASS/);
  assert.match(r, /exact commit SHA/);
});

test("AI safety requires event-development repository contracts", () => {
  const s = read("docs/AI_CHANGE_SAFETY.md");
  assert.match(s, /EVENT_DEVELOPMENT_CONTRACT\.md/);
  assert.match(s, /DEVICE_VERIFICATION_REGISTRY\.md/);
  assert.match(s, /Do not continue feature work after a DEVICE VERIFIED regression/);
  assert.match(s, /Do not merge event work to main before both isolated and integration Device Gates pass/);
});
