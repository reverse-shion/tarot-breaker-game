/* Isolated Alenon Continue receiver. No storage, clock or navigation access on import. */
(function (root, factory) {
  const common = typeof module === "object" && module.exports;
  const api = factory(common ? require("./progress.js") : root.TarotProgressCore,
    common ? require("./progress-resume.js") : root.TarotProgressResume,
    common ? require("./dev-checkpoints.js") : root.TarotDevCheckpoints);
  if (common) module.exports = api;
  else root.TarotAlenonResume = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (core, resume, checkpoints) {
  "use strict";
  function receive(loadResult) {
    const resolved = resume.resolveContinue(loadResult);
    if (!resolved.ok) return resolved;
    const context = resolved.context;
    if (context.mapId !== "alenon" || !["intro", "pad_return"].includes(context.spawnId))
      return Object.freeze({ok: false, reason: "not-alenon"});
    const has = id => context.completedEvents.includes(id);
    const projection = Object.freeze({landingMemoryDone: has("landing_devil_memory"),
      gardenStory: Object.freeze({shioponDone: has("garden_shiopon_meet"), lumiereDone: has("garden_lumiere_gate"), joined: has("garden_shiopon_meet")}),
      companion: context.companion === "waiting_at_landing" ? Object.freeze({mode: "waiting"}) : null});
    return Object.freeze({ok: true, context, projection, completed: has("alenon_prologue")});
  }
  function createSession({search, storage, diagnostic} = {}) {
    const params = new URLSearchParams(search || "");
    const definition = checkpoints.resolve(search);
    if (!definition || params.getAll("dev").length !== 1 ||
        ["from", "skipPrologue", "edit", "objects", "collision", "legacyCollision"].some(key => params.has(key)))
      return {ok: false, reason: "invalid-development-entry"};
    const key = "tarot-breaker:dev:alenon-resume:v1:" + definition.id;
    const fallback = JSON.stringify(definition.temporaryState);
    // Only this exact remapped key may be accessed. A failed read never falls back to production.
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
    const progress = core.createProgress({storage: backend, diagnostic});
    const load = progress.load();
    const received = receive(load);
    return received.ok ? Object.freeze({...received, progress, definition, key}) : received;
  }
  function validateCollision(data) {
    if (data?.map !== "alenon" || data?.referenceSize?.width !== 1448 || data?.referenceSize?.height !== 1086 ||
        !Array.isArray(data.walkAreas) || !data.walkAreas.length || data.walkAreas.some(area =>
          area?.type !== "poly" || !Array.isArray(area.points) || area.points.length < 3 ||
          area.points.some(point => !Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite))))
      throw new Error("invalid-continue-collision");
    if (data.walkAreas.some(area => {
      const points = area.points;
      const twiceArea = points.reduce((sum, point, index) => {
        const next = points[(index + 1) % points.length];
        return sum + point[0] * next[1] - next[0] * point[1];
      }, 0);
      return !Number.isFinite(twiceArea) || Math.abs(twiceArea) < 0.001;
    })) throw new Error("degenerate-continue-collision");
    return data.walkAreas;
  }
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onerror = () => reject(new Error("continue-image-failed: " + src));
      image.onload = async () => {
        try {
          if (!image.naturalWidth || !image.naturalHeight) throw new Error("empty-image");
          if (typeof image.decode === "function") await image.decode();
          resolve();
        } catch (_) { reject(new Error("continue-image-decode-failed: " + src)); }
      };
      image.src = src;
    });
  }
  return Object.freeze({receive, createSession, validateCollision, loadImage});
});
