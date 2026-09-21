"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const source = fs.readFileSync(path.join(__dirname, "..", "star-country-landing.html"), "utf8");

test("Landing loads Route Registry before Progress Core", () => {
  const registry = source.indexOf('<script src="./route-registry.js?v=20260921-progress-v1"></script>');
  const progress = source.indexOf('<script src="./progress.js?v=20260921-progress-v1"></script>');
  assert.ok(registry >= 0);
  assert.ok(progress > registry);
});


test("real Alenon arrival is committed before Landing event completion can run", () => {
  const arrival = source.indexOf('landingProgress.commitArrival({');
  const memoryRead = source.indexOf('landingProgress.isEventCompleted("landing_devil_memory")');
  const completion = source.indexOf('landingProgress.completeEvent("landing_devil_memory"');
  assert.ok(arrival >= 0);
  assert.ok(arrival < memoryRead);
  assert.ok(memoryRead < completion);
  const arrivalBlock = source.slice(arrival, memoryRead);
  assert.match(arrivalBlock, /sourceMapId: "alenon"/);
  assert.match(arrivalBlock, /destinationMapId: "star_country_landing"/);
  assert.match(arrivalBlock, /spawnId: "pad_ground"/);
  assert.match(arrivalBlock, /reason: "pad_to_landing"/);
});

test("valid Progress v1 is authoritative for landing memory completion", () => {
  assert.match(source, /const landingProgressValid = landingProgressLoad\?\.status === "valid";/);
  assert.match(source, /landingProgress\.isEventCompleted\("landing_devil_memory"\)/);
  assert.match(source, /let devilEventStarted = landingProgressValid\s*\? landingMemoryCompleted\s*:\s*window\.TarotJourney\?\.get\("landingMemoryDone"\) === true;/s);
});

test("legacy Landing memory cannot create Progress completion by itself", () => {
  assert.equal(source.match(/completeEvent\("landing_devil_memory"/g)?.length, 1);
  assert.match(source, /if \(landingProgressValid\) \{\s*try \{\s*landingProgress\.completeEvent/s);
  assert.doesNotMatch(source, /resetGame\(/);
});

test("Landing memory persists only after the existing final authored line", () => {
  const eventStart = source.indexOf("async function runDevilMemoryEvent()");
  const finalLine = source.indexOf('await showStoryLine("今は……星門が先だ")', eventStart);
  const legacyMark = source.indexOf('window.TarotJourney?.set("landingMemoryDone", true);', finalLine);
  const progressMark = source.indexOf('landingProgress.completeEvent("landing_devil_memory"', legacyMark);
  assert.ok(eventStart >= 0 && finalLine > eventStart);
  assert.ok(legacyMark > finalLine);
  assert.ok(progressMark > legacyMark);
});

test("garden route commits semantic arrival without changing existing navigation", () => {
  assert.match(source, /landingProgress\.commitArrival\(\{\s*sourceMapId: "star_country_landing",\s*destinationMapId: "star_gate_garden",\s*spawnId: "south_gate",\s*reason: "gate_to_garden"/s);
  assert.match(source, /location\.href = "\.\/index\.html\?from=landing";/);
  assert.match(source, /const transitionMs = 1800;/);
  assert.match(source, /starGateAudio\.volume = \.45;/);
});

test("protected Landing trigger coordinates remain unchanged", () => {
  assert.match(source, /const GARDEN_EXIT_Y = 215;/);
  assert.match(source, /const DEVIL_EVENT_Y = 355;/);
  assert.match(source, /const GARDEN_EXIT_X_MIN = 540;/);
  assert.match(source, /const GARDEN_EXIT_X_MAX = 908;/);
});
