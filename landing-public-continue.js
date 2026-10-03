/* Production Landing Continue adapter. Import has no browser/storage/navigation effects. */
(function(root, factory) {
  const common = typeof module === "object" && module.exports;
  const api = factory(
    common ? require("./progress.js") : root.TarotProgressCore,
    common ? require("./progress-resume.js") : root.TarotProgressResume,
    common ? require("./public-continue.js") : root.TarotPublicContinue,
    common ? require("./landing-resume.js") : root.TarotLandingResume
  );
  if (common) module.exports = api;
  else root.TarotLandingPublicContinue = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(core, resume, publicContinue, landingResume) {
  "use strict";

  const MAP_ID = "star_country_landing";
  const SPAWNS = Object.freeze(["pad_ground", "garden_entrance"]);
  const JOURNEY_KEY = "tarot-breaker:map-journey-v1";
  const copy = value => JSON.parse(JSON.stringify(value));

  function receive({search, storage, diagnostic} = {}) {
    if (!publicContinue?.validateEntry?.(search || "")) {
      return Object.freeze({ok:false, reason:"invalid-public-entry"});
    }
    const progress = core.createProgress({storage, diagnostic});
    const resolved = resume.resolveContinue(progress.load());
    if (!resolved.ok) return resolved;
    const context = resolved.context;
    if (context.mapId !== MAP_ID || !SPAWNS.includes(context.spawnId)) {
      return Object.freeze({ok:false, reason:"not-landing"});
    }
    const projected = landingResume.projectResolved(resolved);
    if (!projected.ok) return projected;
    return Object.freeze({
      ...projected,
      progress,
      returningFromGarden: context.spawnId === "garden_entrance",
      returningFromAlenon: context.spawnId === "pad_ground" && context.companion === "waiting_at_landing",
      definition: Object.freeze({id:"public-continue-landing"}),
    });
  }

  function sameContext(a, b) {
    if (!a || !b) return false;
    return a.mapId === b.mapId && a.spawnId === b.spawnId &&
      a.companion === b.companion &&
      JSON.stringify(a.completedEvents) === JSON.stringify(b.completedEvents);
  }

  function revalidate(session, options = {}) {
    if (!session?.ok) return Object.freeze({ok:false, reason:"missing-public-session"});
    const fresh = receive(options);
    if (!fresh.ok) return fresh;
    if (!sameContext(session.context, fresh.context)) {
      return Object.freeze({ok:false, reason:"stale-save"});
    }
    return fresh;
  }

  function projectJourney(session, {journey, storage} = {}) {
    if (!session?.ok || !journey || typeof journey.set !== "function" ||
        !storage || typeof storage.getItem !== "function") {
      return Object.freeze({ok:false, reason:"journey-unavailable"});
    }
    const projection = session.projection;
    try {
      journey.set("landingMemoryDone", projection.landingMemoryDone === true);
      journey.set("gardenStory", copy(projection.gardenStory));
      journey.set("companion", projection.companion ? copy(projection.companion) : null);
      const raw = storage.getItem(JOURNEY_KEY);
      if (raw === null) return Object.freeze({ok:false, reason:"journey-write-unavailable"});
      const restored = JSON.parse(raw);
      const expected = {
        landingMemoryDone: projection.landingMemoryDone === true,
        gardenStory: projection.gardenStory,
        companion: projection.companion || null,
      };
      if (restored?.landingMemoryDone !== expected.landingMemoryDone ||
          JSON.stringify(restored?.gardenStory) !== JSON.stringify(expected.gardenStory) ||
          JSON.stringify(restored?.companion ?? null) !== JSON.stringify(expected.companion)) {
        return Object.freeze({ok:false, reason:"journey-restore-mismatch"});
      }
      return Object.freeze({ok:true});
    } catch (_) {
      return Object.freeze({ok:false, reason:"journey-write-unavailable"});
    }
  }

  return Object.freeze({MAP_ID, SPAWNS, receive, revalidate, projectJourney, sameContext});
});
