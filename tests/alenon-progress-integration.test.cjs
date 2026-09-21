"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "alenon.html"), "utf8");

test("Alenon loads Route Registry before Progress Core", () => {
  const registry = source.indexOf('<script src="./route-registry.js?v=20260921-progress-v1"></script>');
  const progress = source.indexOf('<script src="./progress.js?v=20260921-progress-v1"></script>');
  assert.ok(registry >= 0);
  assert.ok(progress > registry);
});

test("normal Alenon entry uses Progress v1 without making legacy bypasses durable authority", () => {
  assert.match(source, /const legacyStoryBypass = returningFromLanding \|\| editMode \|\| objectMode \|\| collisionMode \|\| debugStoryBypass;/);
  assert.match(source, /if \(!legacyStoryBypass && alenonProgress\)/);
  assert.match(source, /alenonProgressLoad\.status === "none" \|\| alenonProgressLoad\.status === "unavailable"/);
  assert.match(source, /alenonProgress\.resetGame\("phase-2a-4a-alenon-first-play"\)/);
  assert.match(source, /alenonProgressLoad\.status === "valid"/);
  assert.match(source, /alenonProgress\.isEventCompleted\("alenon_prologue"\)/);
  assert.match(source, /checkpoint\?\.mapId === "alenon"/);
  assert.match(source, /checkpoint\?\.spawnId === "intro"/);
  assert.match(source, /const storyBypass = legacyStoryBypass \|\| progressResume;/);
});

test("prologue completion is persisted only at the authored completion boundary", () => {
  const completed = source.indexOf("story.completed = true;", source.indexOf("async function runPrologue"));
  const write = source.indexOf('alenonProgress.completeEvent("alenon_prologue", { mapId: "alenon", spawnId: "intro" });');
  const prepare = source.indexOf("function preparePrologue()");
  assert.ok(completed >= 0);
  assert.ok(write > completed);
  assert.ok(write < prepare);
  assert.equal(source.match(/completeEvent\("alenon_prologue"/g)?.length, 1);
});

test("completed resume restores existing ambience path and does not alter Orb hysteresis", () => {
  assert.match(source, /if \(returningFromLanding \|\| progressResume\)/);
  assert.match(source, /startAlenonWind\(\{ fade: 900 \}\);/);
  assert.match(source, /startAlenonOrbResonance\(\);/);
  assert.match(source, /const ORB_INTERACT_RADIUS = 118;/);
  assert.match(source, /const ORB_INTERACT_REARM_RADIUS = 154;/);
  assert.match(source, /if \(distance >= ORB_INTERACT_REARM_RADIUS\) \{\s*orbInteraction\.armed = true;/);
});

test("invalid or unsupported Progress is not rewritten by Alenon integration", () => {
  const integrationStart = source.indexOf("// Phase 2A-4a: Progress v1 is authoritative");
  const integrationEnd = source.indexOf("const storyBypass = legacyStoryBypass || progressResume;");
  const block = source.slice(integrationStart, integrationEnd);
  assert.doesNotMatch(block, /status === "invalid".*resetGame/s);
  assert.doesNotMatch(block, /status === "unsupported".*resetGame/s);
  assert.match(block, /Invalid\/unsupported bytes are deliberately left untouched/);
});
