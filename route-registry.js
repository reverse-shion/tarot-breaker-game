/* Stable semantic IDs only. No coordinates, browser navigation or storage. */
(function (root, factory) {
  const registry = factory();
  if (typeof module === "object" && module.exports) module.exports = registry;
  else root.TarotRouteRegistry = registry;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const maps = Object.freeze({
    alenon: Object.freeze({
      mapId: "alenon", entryFile: "alenon.html", debugName: "アレノン遺跡",
      spawnIds: Object.freeze(["intro", "pad_return"]), defaultSpawnId: "intro",
    }),
    star_country_landing: Object.freeze({
      mapId: "star_country_landing", entryFile: "star-country-landing.html", debugName: "PAD離着陸場",
      spawnIds: Object.freeze(["pad_ground", "garden_entrance"]), defaultSpawnId: "pad_ground",
    }),
    star_gate_garden: Object.freeze({
      mapId: "star_gate_garden", entryFile: "index.html", debugName: "星門庭園",
      spawnIds: Object.freeze(["south_gate"]), defaultSpawnId: "south_gate",
    }),
  });

  const events = Object.freeze({
    alenon_prologue: Object.freeze({
      eventId: "alenon_prologue", mapId: "alenon", checkpointSpawnId: "intro",
      requires: Object.freeze([]),
    }),
    landing_devil_memory: Object.freeze({
      eventId: "landing_devil_memory", mapId: "star_country_landing",
      checkpointSpawnId: "pad_ground", requires: Object.freeze(["alenon_prologue"]),
    }),
    garden_shiopon_meet: Object.freeze({
      eventId: "garden_shiopon_meet", mapId: "star_gate_garden",
      checkpointSpawnId: "south_gate",
      requires: Object.freeze(["alenon_prologue", "landing_devil_memory"]),
      joinsCompanion: true,
    }),
    garden_lumiere_gate: Object.freeze({
      eventId: "garden_lumiere_gate", mapId: "star_gate_garden",
      checkpointSpawnId: "south_gate", requires: Object.freeze(["garden_shiopon_meet"]),
    }),
  });

  const companionStates = Object.freeze([
    "not_joined", "joined_with_shion", "waiting_at_landing",
  ]);

  const routes = Object.freeze([
    Object.freeze({ sourceMapId: "title", destinationMapId: "alenon", spawnId: "intro", reason: "title_start", requires: Object.freeze([]) }),
    Object.freeze({ sourceMapId: "alenon", destinationMapId: "star_country_landing", spawnId: "pad_ground", reason: "pad_to_landing", requires: Object.freeze(["alenon_prologue"]) }),
    Object.freeze({ sourceMapId: "star_country_landing", destinationMapId: "star_gate_garden", spawnId: "south_gate", reason: "gate_to_garden", requires: Object.freeze(["alenon_prologue", "landing_devil_memory"]) }),
    Object.freeze({ sourceMapId: "star_gate_garden", destinationMapId: "star_country_landing", spawnId: "garden_entrance", reason: "garden_to_landing", requires: Object.freeze(["alenon_prologue", "landing_devil_memory"]) }),
    Object.freeze({ sourceMapId: "star_country_landing", destinationMapId: "alenon", spawnId: "pad_return", reason: "pad_to_alenon", requires: Object.freeze(["alenon_prologue"]) }),
  ]);

  const companionTransitions = Object.freeze([
    Object.freeze({ from: "joined_with_shion", to: "waiting_at_landing", reason: "board_pad", mapId: "star_country_landing", spawnId: "pad_ground" }),
    Object.freeze({ from: "waiting_at_landing", to: "joined_with_shion", reason: "rejoin_after_arrival", mapId: "star_country_landing", spawnId: "pad_ground" }),
  ]);

  function hasOwn(object, key) {
    return typeof key === "string" && Object.prototype.hasOwnProperty.call(object, key);
  }
  function isCheckpoint(checkpoint) {
    return checkpoint !== null && typeof checkpoint === "object" &&
      hasOwn(maps, checkpoint.mapId) && maps[checkpoint.mapId].spawnIds.includes(checkpoint.spawnId);
  }
  function matchRoute(edge) {
    if (!edge || typeof edge !== "object") return null;
    return routes.find(route => route.sourceMapId === edge.sourceMapId &&
      route.destinationMapId === edge.destinationMapId && route.spawnId === edge.spawnId &&
      route.reason === edge.reason) || null;
  }
  function validateRoute(edge, completedEvents) {
    const route = matchRoute(edge);
    if (!route) return { ok: false, reason: "unknown-route" };
    if (!Array.isArray(completedEvents) || completedEvents.some(id => !hasOwn(events, id)))
      return { ok: false, reason: "invalid-events" };
    if (route.requires.some(id => !completedEvents.includes(id)))
      return { ok: false, reason: "missing-prerequisite" };
    return { ok: true, route: { ...route, requires: [...route.requires] } };
  }
  function matchCompanionTransition(from, to, reason, checkpoint) {
    if (!isCheckpoint(checkpoint)) return null;
    return companionTransitions.find(transition => transition.from === from &&
      transition.to === to && transition.reason === reason &&
      transition.mapId === checkpoint.mapId && transition.spawnId === checkpoint.spawnId) || null;
  }

  return Object.freeze({
    maps, events, companionStates, routes, companionTransitions,
    isMapId: id => hasOwn(maps, id),
    isEventId: id => hasOwn(events, id),
    isCheckpoint, matchRoute, validateRoute, matchCompanionTransition,
  });
});
