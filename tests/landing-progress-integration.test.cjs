"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const source = fs.readFileSync(path.join(__dirname, "..", "star-country-landing.html"), "utf8");

test("Landing Progress contract keeps arrival before memory completion", () => {
  const registry = source.indexOf('<script src="./route-registry.js?v=20260921-progress-v1"></script>');
  const progress = source.indexOf('<script src="./progress.js?v=20260921-progress-v1"></script>');
  const alenonArrival = source.indexOf('sourceMapId: "alenon"');
  const landingDestination = source.indexOf('destinationMapId: "star_country_landing"', alenonArrival);
  const memoryRead = source.indexOf('landingProgress.isEventCompleted("landing_devil_memory")');
  const memoryWrite = source.indexOf('landingProgress.completeEvent("landing_devil_memory"');
  assert.ok(registry >= 0 && progress > registry);
  assert.ok(alenonArrival >= 0 && landingDestination > alenonArrival);
  assert.ok(landingDestination < memoryRead);
  assert.ok(memoryRead < memoryWrite);
  assert.ok(source.includes('reason: "pad_to_landing"'));
  assert.ok(source.includes('spawnId: "pad_ground"'));
});

test("Landing memory write stays after the authored final line", () => {
  const finalLine = source.indexOf('await showStoryLine("今は……星門が先だ")');
  const memoryWrite = source.indexOf('landingProgress.completeEvent("landing_devil_memory"');
  assert.ok(finalLine >= 0 && memoryWrite > finalLine);
  assert.equal(source.match(/completeEvent\("landing_devil_memory"/g)?.length, 1);
});

test("Landing protected gameplay constants and gate transition stay unchanged", () => {
  for (const token of [
    "const GARDEN_EXIT_Y = 215;",
    "const DEVIL_EVENT_Y = 355;",
    "const GARDEN_EXIT_X_MIN = 540;",
    "const GARDEN_EXIT_X_MAX = 908;",
    "const transitionMs = 1800;",
    "starGateAudio.volume = .45;",
    'location.href = "./index.html?from=landing";',
  ]) assert.ok(source.includes(token), token);
});
