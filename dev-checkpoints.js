/* Registered developer entries. Importing this registry performs no browser operations. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TarotDevCheckpoints = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const allEvents = ["alenon_prologue", "landing_devil_memory", "garden_shiopon_meet", "garden_lumiere_gate"];
  const scenarios = [
    ["intro-incomplete", "intro", [], "not_joined"],
    ["intro-complete", "intro", ["alenon_prologue"], "not_joined"],
    ["pad-return", "pad_return", ["alenon_prologue"], "not_joined"],
    ["pad-return-waiting", "pad_return", allEvents, "waiting_at_landing"],
  ];
  const definitions = Object.freeze(Object.fromEntries(scenarios.map(([suffix, spawnId, events, companion]) => {
    const id = "alenon-resume-" + suffix;
    const fixture = Object.freeze({ version: 1, checkpoint: Object.freeze({mapId: "alenon", spawnId}),
      completedEvents: Object.freeze([...events]), companion });
    return [id, Object.freeze({ id, event: "alenon-resume", segment: "alenon-resume-entry", map: "alenon",
      spawn: spawnId, temporaryState: fixture, requiredRuntime: Object.freeze(["alenon.html", "progress.js", "progress-resume.js", "alenon-resume.js"]),
      entryAction: "registered ?dev=" + id, emittedSignal: "tarot-breaker:alenon-resume-ready",
      receivingRuntime: "real Alenon strict Continue boot", expectedFirstRuntimeState: "locked until decoded assets, valid collision and authored safe ground spawn",
      durableWritePolicy: "production writes forbidden; checkpoint-specific dev session only at authored prologue completion" })];
  })));
  function get(id) { return Object.prototype.hasOwnProperty.call(definitions, id) ? definitions[id] : null; }
  function list() { return Object.values(definitions); }
  function isDevRequest(search) { return new URLSearchParams(search || "").has("dev"); }
  function resolve(search) { return get(new URLSearchParams(search || "").get("dev")); }
  return Object.freeze({definitions, get, list, resolve, isDevRequest});
});
