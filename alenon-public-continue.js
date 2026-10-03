/* Dedicated Public receiver; existing isolated receiver remains isolated. */
(function(root, factory) {
  const common = typeof module === "object" && module.exports;
  const api = factory(common ? require("./progress.js") : root.TarotProgressCore,
    common ? require("./public-continue.js") : root.TarotPublicContinue,
    common ? require("./alenon-resume.js") : root.TarotAlenonResume,
    common ? require("./dev-checkpoints.js") : root.TarotDevCheckpoints);
  if (common) module.exports = api; else root.TarotAlenonPublicContinue = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(core, controller, alenon, checkpoints) {
  "use strict";
  function receive({search, storage, diagnostic} = {}) {
    if (!controller.validateEntry(search)) return Object.freeze({ok:false, reason:"invalid-public-entry"});
    const progress = core.createProgress({storage, diagnostic});
    const load = progress.load();
    const received = alenon.receive(load);
    return received.ok ? Object.freeze({...received, progress, definition:Object.freeze({id:"public-continue"})}) : received;
  }
  function createHarness({search, storage, diagnostic} = {}) {
    const params = new URLSearchParams(search || "");
    const definition = checkpoints.resolve(search);
    if (params.getAll("dev").length !== 1 || !definition || definition.segment !== "public-continue-alenon" ||
        params.has("entry") || controller.conflicting.filter(key => key !== "dev").some(key => params.has(key)))
      return Object.freeze({ok:false, reason:"invalid-public-harness"});
    const key = "tarot-breaker:dev:public-continue:v1:" + definition.id;
    const backend = Object.freeze({
      getItem(requested) {
        if (requested !== core.STORAGE_KEY || !storage) throw new Error("harness-storage-unavailable");
        return storage.getItem(key) ?? JSON.stringify(definition.temporaryState);
      },
      setItem(requested, bytes) {
        if (requested !== core.STORAGE_KEY || !storage) throw new Error("harness-storage-unavailable");
        storage.setItem(key, bytes);
      }
    });
    const result = receive({search:"?entry=continue", storage:backend, diagnostic});
    return result.ok ? Object.freeze({...result, definition, harness:true}) : result;
  }
  function project(session, journey, storage) {
    if (!session?.ok || !journey || typeof journey.set !== "function") throw new Error("public-history-unavailable");
    const keys = ["landingMemoryDone", "gardenStory", "companion"];
    for (const key of keys) journey.set(key, session.projection[key]);
    // Journey's ordinary setter tolerates storage failure; Public readiness requires durable session mirrors.
    if (storage) {
      const mirror = JSON.parse(storage.getItem("tarot-breaker:map-journey-v1") || "null");
      if (!mirror || keys.some(key => JSON.stringify(mirror[key]) !== JSON.stringify(session.projection[key])))
        throw new Error("public-history-not-restored");
    }
  }
  return Object.freeze({receive, createHarness, project});
});
