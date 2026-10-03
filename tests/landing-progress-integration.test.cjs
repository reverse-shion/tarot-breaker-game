"use strict";
const fs=require("node:fs"),path=require("node:path"),test=require("node:test"),assert=require("node:assert/strict");
const source=fs.readFileSync(path.join(__dirname,"..","star-country-landing.html"),"utf8");

test("Landing Progress is observer-only and legacy replay guard stays authoritative",()=>{
  assert.match(source,/let devilEventStarted = continueRequest \?[\s\S]*continueSession\.projection\.landingMemoryDone[\s\S]*window\.TarotJourney\?\.get\("landingMemoryDone"\) === true;/);
  assert.doesNotMatch(source,/devilEventStarted\s*=\s*landingProgress/);
  assert.equal(source.match(/TarotJourney\?\.set\("landingMemoryDone", true\)/g)?.length,1);
  assert.match(source,/if \(!continueDevRequest\) window\.TarotJourney\?\.set\("landingMemoryDone", true\)/);
});

test("Landing records Progress only after existing memory completion",()=>{
  const legacy=source.indexOf('window.TarotJourney?.set("landingMemoryDone", true)');
  const durable=source.indexOf('landingProgress.completeEvent("landing_devil_memory"');
  assert.ok(legacy>=0 && durable>legacy);
});

test("Landing observes Alenon arrival without changing authored gate transition",()=>{
  assert.ok(source.includes('sourceMapId: "alenon"'));
  assert.ok(source.includes('destinationMapId: "star_country_landing"'));
  for(const token of ['const DEVIL_EVENT_Y = 355;','const GARDEN_EXIT_Y = 215;','starGateAudio.volume = .45;','const transitionMs = 1800;']) assert.ok(source.includes(token),token);
  assert.match(source,/const target = continueDevRequest \?[\s\S]*: "\.\/index\.html\?from=landing";/);
  assert.match(source,/TarotRuntimeEntry\?\.navigate\) window\.TarotRuntimeEntry\.navigate\(target\)/);
});



test("Landing persists every real PAD departure to Alenon, not only Dev Continue",()=>{
  const start=source.indexOf("      function leaveForAlenon()");
  const end=source.indexOf("      function leaveForGarden()",start);
  const fn=source.slice(start,end);
  assert.match(fn,/if \(landingProgressValid\)/);
  assert.match(fn,/landingProgress\.commitArrival\(\{[\s\S]*sourceMapId: "star_country_landing",[\s\S]*destinationMapId: "alenon",[\s\S]*spawnId: "pad_return",[\s\S]*reason: "pad_to_alenon"/);
  assert.doesNotMatch(fn,/if \(continueDevRequest\) \{[\s\S]*commitArrival/);
  assert.match(fn,/if \(!saved\?\.persisted\)[\s\S]*return;/);
});
