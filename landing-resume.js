/* Isolated Landing Continue receiver. No production storage, clock or navigation access on import. */
(function (root, factory) {
  const common = typeof module === "object" && module.exports;
  const api = factory(common ? require("./progress.js") : root.TarotProgressCore,
    common ? require("./progress-resume.js") : root.TarotProgressResume,
    common ? require("./dev-checkpoints.js") : root.TarotDevCheckpoints);
  if (common) module.exports = api;
  else root.TarotLandingResume = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (core, resume, checkpoints) {
  "use strict";
  const MAP_ID = "star_country_landing";
  const SPAWN_ID = "pad_ground";
  const DEV_PREFIX = "landing-resume-";
  function receive(loadResult) {
    const resolved = resume.resolveContinue(loadResult);
    if (!resolved.ok) return resolved;
    const context = resolved.context;
    if (context.mapId !== MAP_ID || context.spawnId !== SPAWN_ID)
      return Object.freeze({ok: false, reason: "not-landing"});
    const has = id => context.completedEvents.includes(id);
    const projection = Object.freeze({
      landingMemoryDone: has("landing_devil_memory"),
      gardenStory: Object.freeze({
        shioponDone: has("garden_shiopon_meet"),
        lumiereDone: has("garden_lumiere_gate"),
        joined: context.companion === "joined_with_shion",
      }),
      companion: context.companion === "waiting_at_landing" ?
        Object.freeze({mode: "waiting"}) :
        context.companion === "joined_with_shion" ? Object.freeze({mode: "following"}) : null,
    });
    return Object.freeze({ok: true, context, projection});
  }
  function openDevProgress(definition, storage, diagnostic) {
    const key = "tarot-breaker:dev:landing-resume:v1:" + definition.id;
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
  function projectResolved(resolved) {
    if (!resolved.ok) return resolved;
    const context = resolved.context;
    const has = id => context.completedEvents.includes(id);
    return Object.freeze({
      ok: true,
      context,
      projection: Object.freeze({
        landingMemoryDone: has("landing_devil_memory"),
        gardenStory: Object.freeze({
          shioponDone: has("garden_shiopon_meet"),
          lumiereDone: has("garden_lumiere_gate"),
          joined: context.companion === "joined_with_shion",
        }),
        companion: context.companion === "waiting_at_landing" ?
          Object.freeze({mode: "waiting"}) :
          context.companion === "joined_with_shion" ? Object.freeze({mode: "following"}) : null,
      }),
    });
  }
  function createSession({search, storage, diagnostic} = {}) {
    const params = new URLSearchParams(search || "");
    const definition = checkpoints.resolve(search);
    const from = params.get("from");
    const validFrom = !params.has("from") ||
      (params.getAll("from").length === 1 && ["garden", "alenon"].includes(from));
    if (!definition || !definition.id.startsWith(DEV_PREFIX) || definition.map !== MAP_ID ||
        params.getAll("dev").length !== 1 || !validFrom ||
        ["padEdit", "debug", "collision", "passage", "edit", "objects"].some(key => params.has(key)))
      return {ok: false, reason: "invalid-development-entry"};
    const opened = openDevProgress(definition, storage, diagnostic);
    let resolved = resume.resolveContinue(opened.progress.load());
    if (!resolved.ok) return resolved;
    if (from === "alenon" && resolved.context.mapId === "alenon" && resolved.context.spawnId === "pad_return") {
      try {
        opened.progress.commitArrival({
          sourceMapId: "alenon",
          destinationMapId: MAP_ID,
          spawnId: SPAWN_ID,
          reason: "pad_to_landing",
        });
      } catch (error) {
        return {ok:false, reason:error?.code || error?.message || "landing-return-rejected"};
      }
      resolved = resume.resolveContinue(opened.progress.load());
    }
    if (!resolved.ok) return resolved;
    const expectedSpawn = from === "garden" ? "garden_entrance" : SPAWN_ID;
    if (resolved.context.mapId !== MAP_ID || resolved.context.spawnId !== expectedSpawn)
      return {ok: false, reason: "not-landing"};
    const projected = projectResolved(resolved);
    return Object.freeze({...projected, progress: opened.progress, definition, key: opened.key,
      returningFromGarden: from === "garden", returningFromAlenon: from === "alenon"});
  }
  function createGardenTransitSession({search, storage, diagnostic} = {}) {
    const params = new URLSearchParams(search || "");
    const definition = checkpoints.resolve(search);
    if (!definition || !definition.id.startsWith(DEV_PREFIX) || definition.map !== MAP_ID ||
        params.getAll("dev").length !== 1 || params.getAll("from").length !== 1 || params.get("from") !== "landing")
      return {ok: false, reason: "invalid-development-entry"};
    const opened = openDevProgress(definition, storage, diagnostic);
    let resolved = resume.resolveContinue(opened.progress.load());
    if (!resolved.ok) return resolved;
    if (resolved.context.mapId === MAP_ID &&
        [SPAWN_ID, "garden_entrance"].includes(resolved.context.spawnId)) {
      try {
        opened.progress.commitArrival({
          sourceMapId: MAP_ID,
          destinationMapId: "star_gate_garden",
          spawnId: "south_gate",
          reason: "gate_to_garden",
        });
      } catch (error) {
        return {ok:false, reason:error?.code || error?.message || "garden-transit-rejected"};
      }
      resolved = resume.resolveContinue(opened.progress.load());
    }
    if (!resolved.ok || resolved.context.mapId !== "star_gate_garden" || resolved.context.spawnId !== "south_gate")
      return {ok: false, reason: "not-garden"};
    const projected = projectResolved(resolved);
    return Object.freeze({...projected, progress: opened.progress, definition, key: opened.key});
  }
  function validateCollision(data) {
    if (data?.map !== "star-landing" || data?.referenceSize?.width !== 1448 || data?.referenceSize?.height !== 1086 ||
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
    return data.walkAreas.map(area => ({type: "poly", points: area.points.map(point => [...point])}));
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
  return Object.freeze({receive, createSession, createGardenTransitSession, validateCollision, loadImage});
});
