"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "star-country-landing.html"), "utf8");

test("Landing observes Garden return without replacing legacy companion runtime", () => {
  assert.match(source, /returningFromGarden/);
  assert.match(source, /sourceMapId: "star_gate_garden"[\s\S]*destinationMapId: "star_country_landing"[\s\S]*reason: "garden_to_landing"/);
  assert.match(source, /const savedCompanion = window\.TarotJourney\?\.get\("companion"\)/);
});

test("existing Journey wait fact is written before Progress observes board_pad", () => {
  const legacy = source.indexOf('TarotJourney?.set("companion", {mode: "waiting"');
  const progress = source.indexOf('"waiting_at_landing"', legacy);
  assert.ok(legacy >= 0 && progress > legacy);
  assert.match(source.slice(legacy, progress + 400), /"board_pad"/);
});

test("existing Journey follow fact is written before Progress observes rejoin", () => {
  const legacy = source.indexOf('TarotJourney?.set("companion", {mode: "following"})');
  const progress = source.indexOf('"joined_with_shion"', legacy);
  assert.ok(legacy >= 0 && progress > legacy);
  assert.match(source.slice(legacy, progress + 400), /"rejoin_after_arrival"/);
});

test("Progress observation never assigns companion runtime flags", () => {
  assert.doesNotMatch(source, /landingProgress[^\n]*\.following\s*=/);
  assert.doesNotMatch(source, /landingProgress[^\n]*\.visible\s*=/);
});
