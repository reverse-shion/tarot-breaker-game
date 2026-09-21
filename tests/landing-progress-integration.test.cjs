"use strict";
const fs=require("node:fs"),path=require("node:path"),test=require("node:test"),assert=require("node:assert/strict");
const source=fs.readFileSync(path.join(__dirname,"..","star-country-landing.html"),"utf8");

test("Landing Progress is observer-only and legacy replay guard stays authoritative",()=>{
  assert.match(source,/let devilEventStarted = window\.TarotJourney\?\.get\("landingMemoryDone"\) === true;/);
  assert.doesNotMatch(source,/devilEventStarted\s*=\s*landingProgress/);
  assert.equal(source.match(/TarotJourney\?\.set\("landingMemoryDone", true\)/g)?.length,1);
});

test("Landing records Progress only after existing memory completion",()=>{
  const legacy=source.indexOf('window.TarotJourney?.set("landingMemoryDone", true)');
  const durable=source.indexOf('landingProgress.completeEvent("landing_devil_memory"');
  assert.ok(legacy>=0 && durable>legacy);
});

test("Landing observes Alenon arrival without changing authored gate transition",()=>{
  assert.ok(source.includes('sourceMapId: "alenon"'));
  assert.ok(source.includes('destinationMapId: "star_country_landing"'));
  for(const token of ['const DEVIL_EVENT_Y = 355;','const GARDEN_EXIT_Y = 215;','starGateAudio.volume = .45;','const transitionMs = 1800;','location.href = "./index.html?from=landing";']) assert.ok(source.includes(token),token);
});

