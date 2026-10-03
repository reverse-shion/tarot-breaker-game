/* Isolated Garden Continue receiver. Importing it never touches production storage or navigation. */
(function (root, factory) {
  const common = typeof module === "object" && module.exports;
  const api = factory(common ? require("./progress.js") : root.TarotProgressCore,
    common ? require("./progress-resume.js") : root.TarotProgressResume,
    common ? require("./dev-checkpoints.js") : root.TarotDevCheckpoints);
  if (common) module.exports = api;
  else root.TarotGardenResume = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (core, resume, checkpoints) {
  "use strict";
  const MAP_ID = "star_gate_garden";
  const SPAWN_ID = "south_gate";
  const DEV_PREFIX = "garden-resume-";

  function openDevProgress(definition, storage, diagnostic) {
    const key = "tarot-breaker:dev:garden-resume:v1:" + definition.id;
    const fallback = JSON.stringify(definition.temporaryState);
    const backend = Object.freeze({
      getItem(requested) {
        if (requested !== core.STORAGE_KEY || !storage) throw new Error("dev-storage-unavailable");
        const bytes = storage.getItem(key);
        return bytes === null ? fallback : bytes;
      },
      setItem(requested, bytes) {
        if (requested !== core.STORAGE_KEY || !storage) throw new Error("dev-storage-unavailable");
        storage.setItem(key, bytes);
      },
    });
    return {key, progress: core.createProgress({storage: backend, diagnostic})};
  }

  function createSession({search, storage, diagnostic} = {}) {
    const params = new URLSearchParams(search || "");
    const definition = checkpoints.resolve(search);
    if (!definition || !definition.id.startsWith(DEV_PREFIX) || definition.map !== MAP_ID ||
        definition.event !== "garden-landing-continue-recovery" || definition.segment !== "garden-resume-entry" ||
        params.getAll("dev").length !== 1 || params.has("from") ||
        ["padEdit", "debug", "collision", "passage", "edit", "objects"].some(key => params.has(key)))
      return Object.freeze({ok:false, reason:"invalid-development-entry"});
    const opened = openDevProgress(definition, storage, diagnostic);
    const resolved = resume.resolveContinue(opened.progress.load());
    if (!resolved.ok) return resolved;
    const context = resolved.context;
    if (context.mapId !== MAP_ID || context.spawnId !== SPAWN_ID)
      return Object.freeze({ok:false, reason:"not-garden"});
    const has = id => context.completedEvents.includes(id);
    const projection = Object.freeze({
      gardenStory: Object.freeze({
        shioponDone: has("garden_shiopon_meet"),
        lumiereDone: has("garden_lumiere_gate"),
        joined: context.companion === "joined_with_shion",
      }),
    });
    return Object.freeze({ok:true, context, projection, progress:opened.progress,
      definition, key:opened.key, spawn:Object.freeze({x:724,y:944})});
  }

  return Object.freeze({createSession});
});
