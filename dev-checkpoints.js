/* Registered developer entries. Importing this registry performs no browser operations. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TarotDevCheckpoints = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const allEvents = Object.freeze(["alenon_prologue", "landing_devil_memory", "garden_shiopon_meet", "garden_lumiere_gate"]);
  const definitions = {};

  function register(id, definition) {
    definitions[id] = Object.freeze({ id, ...definition });
  }

  const alenonScenarios = [
    ["intro-incomplete", "intro", [], "not_joined"],
    ["intro-complete", "intro", ["alenon_prologue"], "not_joined"],
    ["pad-return", "pad_return", ["alenon_prologue"], "not_joined"],
    ["pad-return-waiting", "pad_return", allEvents, "waiting_at_landing"],
  ];
  for (const [suffix, spawnId, events, companion] of alenonScenarios) {
    const id = "alenon-resume-" + suffix;
    const fixture = Object.freeze({ version: 1, checkpoint: Object.freeze({mapId: "alenon", spawnId}),
      completedEvents: Object.freeze([...events]), companion });
    register(id, { event: "alenon-resume", segment: "alenon-resume-entry", map: "alenon",
      spawn: spawnId, temporaryState: fixture, requiredRuntime: Object.freeze(["alenon.html", "progress.js", "progress-resume.js", "alenon-resume.js"]),
      entryAction: "registered ?dev=" + id, emittedSignal: "tarot-breaker:alenon-resume-ready",
      receivingRuntime: "real Alenon strict Continue boot", expectedFirstRuntimeState: "locked until decoded assets, valid collision and authored safe ground spawn",
      durableWritePolicy: "production writes forbidden; checkpoint-specific dev session only at authored prologue completion" });
  }

  for (const [suffix, spawnId, events, companion] of alenonScenarios) {
    const id = "public-continue-alenon-" + suffix;
    register(id, {event:"public-continue", segment:"public-continue-alenon", map:"alenon", spawn:spawnId,
      temporaryState:Object.freeze({version:1, checkpoint:Object.freeze({mapId:"alenon", spawnId}), completedEvents:Object.freeze([...events]), companion}),
      requiredRuntime:Object.freeze(["alenon.html", "public-continue.js", "alenon-public-continue.js", "progress.js", "progress-resume.js", "alenon-resume.js"]),
      entryAction:"registered ?dev=" + id, emittedSignal:"tarot-breaker:alenon-resume-ready",
      receivingRuntime:"real Alenon Public adapter with injected session-only Progress backend",
      expectedFirstRuntimeState:"locked until decoded assets, valid collision and authored safe ground spawn",
      durableWritePolicy:"production writes forbidden; injected checkpoint-specific session backend; cross-map departure contained"});
  }

  const landingScenarios = [
    ["landing-resume-arrival", ["alenon_prologue"], "not_joined"],
    ["landing-resume-memory-complete", ["alenon_prologue", "landing_devil_memory"], "not_joined"],
    ["landing-resume-waiting", ["alenon_prologue", "landing_devil_memory", "garden_shiopon_meet"], "waiting_at_landing"],
  ];
  for (const [id, events, companion] of landingScenarios) {
    const fixture = Object.freeze({ version: 1,
      checkpoint: Object.freeze({mapId: "star_country_landing", spawnId: "pad_ground"}),
      completedEvents: Object.freeze([...events]), companion });
    register(id, { event: "garden-landing-continue-recovery", segment: "landing-resume-entry", map: "star_country_landing",
      spawn: "pad_ground", temporaryState: fixture,
      requiredRuntime: Object.freeze(["star-country-landing.html", "progress.js", "progress-resume.js", "landing-resume.js"]),
      entryAction: "registered ?dev=" + id, emittedSignal: "tarot-breaker:landing-resume-ready",
      receivingRuntime: "real Landing strict Continue boot",
      expectedFirstRuntimeState: "locked until decoded assets, strict collision and authored pad_ground spawn",
      durableWritePolicy: "production writes forbidden; checkpoint-specific dev session only at authored event completion" });
  }

  const gardenScenarios = [
    ["garden-resume-before-shiopon", ["alenon_prologue", "landing_devil_memory"], "not_joined"],
    ["garden-resume-after-shiopon", ["alenon_prologue", "landing_devil_memory", "garden_shiopon_meet"], "joined_with_shion"],
    ["garden-resume-after-lumiere", allEvents, "joined_with_shion"],
  ];
  for (const [id, events, companion] of gardenScenarios) {
    const fixture = Object.freeze({ version: 1,
      checkpoint: Object.freeze({mapId: "star_gate_garden", spawnId: "south_gate"}),
      completedEvents: Object.freeze([...events]), companion });
    register(id, { event: "garden-landing-continue-recovery", segment: "garden-resume-entry", map: "star_gate_garden",
      spawn: "south_gate", temporaryState: fixture,
      requiredRuntime: Object.freeze(["index.html", "progress.js", "progress-resume.js", "garden-resume.js"]),
      entryAction: "registered ?dev=" + id, emittedSignal: "tarot-breaker:garden-resume-ready",
      receivingRuntime: "real Garden strict Continue boot",
      expectedFirstRuntimeState: "locked until decoded assets, strict collision and authored south_gate spawn",
      durableWritePolicy: "production writes forbidden; checkpoint-specific dev session only at authored event completion" });
  }

  register("star-gate-full", {event:"star-gate-anomaly",segment:"future-fixation-stage3",map:"star_gate_garden",spawn:"gate approach (810,177)",
    temporaryState:Object.freeze({completedEvents:allEvents,companion:"joined_with_shion"}),
    requiredRuntime:Object.freeze(["game.js","stage3-dev-bootstrap.js","star-gate-interaction.js","future-stage3.js","star-gate-anomaly.js","star-gate-aftermath.js"]),
    entryAction:"approach gate, choose investigation or leave",emittedSignal:"tarot-breaker:star-gate-investigate",
    receivingRuntime:"star-gate-anomaly.js real resonance -> Stage1 -> Stage2 -> Stage3 -> star-gate-aftermath.js",
    expectedFirstRuntimeState:"decoded present Garden gate-approach fixture, original choice then real resonance",
    durableWritePolicy:"FORBIDDEN; in-memory fixture and Journey only"});
  Object.freeze(definitions);
  function get(id) { return Object.prototype.hasOwnProperty.call(definitions, id) ? definitions[id] : null; }
  function list() { return Object.values(definitions); }
  function isDevRequest(search) { return new URLSearchParams(search || "").has("dev"); }
  function resolve(search) { return get(new URLSearchParams(search || "").get("dev")); }
  return Object.freeze({definitions, get, list, resolve, isDevRequest});
});
