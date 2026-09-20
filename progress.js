/* Phase 2A-2: dormant, dependency-free Progress v1 core. No map imports this file. */
(function (root, factory) {
  const registry = typeof module === "object" && module.exports
    ? require("./route-registry.js") : root.TarotRouteRegistry;
  const api = factory(registry);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TarotProgressCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (registry) {
  "use strict";

  if (!registry) throw new Error("TarotRouteRegistry must load before Progress Core");
  const STORAGE_KEY = "tarot-breaker:progress-v1";
  const VERSION = 1;
  const INITIAL = Object.freeze({
    version: VERSION,
    checkpoint: Object.freeze({ mapId: "alenon", spawnId: "intro" }),
    completedEvents: Object.freeze([]),
    companion: "not_joined",
  });
  const OWN = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const copy = value => JSON.parse(JSON.stringify(value));
  const plain = value => value !== null && typeof value === "object" &&
    !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype ||
    Object.getPrototypeOf(value) === null);
  const exactKeys = (value, keys) => plain(value) &&
    Object.keys(value).length === keys.length && keys.every(key => OWN(value, key));

  class ProgressValidationError extends Error {
    constructor(code) {
      super("Invalid Progress operation: " + code);
      this.name = "ProgressValidationError";
      this.code = code;
    }
  }
  function validCheckpoint(checkpoint) {
    return exactKeys(checkpoint, ["mapId", "spawnId"]) && registry.isCheckpoint(checkpoint);
  }
  function validateRecord(value) {
    if (!plain(value)) return { ok: false, reason: "invalid-record" };
    if (!OWN(value, "version")) return { ok: false, reason: "missing-version" };
    if (!Number.isInteger(value.version) || value.version !== VERSION)
      return { ok: false, reason: "unsupported-version", version: Number.isInteger(value.version) ? value.version : undefined };
    if (!exactKeys(value, ["version", "checkpoint", "completedEvents", "companion"]))
      return { ok: false, reason: "invalid-fields" };
    if (!exactKeys(value.checkpoint, ["mapId", "spawnId"]))
      return { ok: false, reason: "invalid-checkpoint" };
    if (!registry.isMapId(value.checkpoint.mapId))
      return { ok: false, reason: "unknown-map" };
    if (!validCheckpoint(value.checkpoint))
      return { ok: false, reason: "unknown-spawn" };
    if (!Array.isArray(value.completedEvents))
      return { ok: false, reason: "invalid-events" };
    if (value.completedEvents.some(id => !registry.isEventId(id)))
      return { ok: false, reason: "unknown-event" };
    // Duplicate known event IDs have one meaning; normalization does not write to storage.
    const completedEvents = [...new Set(value.completedEvents)];
    if (completedEvents.some(id => registry.events[id].requires.some(required => !completedEvents.includes(required))))
      return { ok: false, reason: "missing-prerequisite" };
    if (!registry.companionStates.includes(value.companion))
      return { ok: false, reason: "invalid-companion" };
    const met = completedEvents.includes("garden_shiopon_meet");
    if ((value.companion === "not_joined") !== !met)
      return { ok: false, reason: "companion-history-mismatch" };
    const mapId = value.checkpoint.mapId;
    if (mapId !== "alenon" && !completedEvents.includes("alenon_prologue"))
      return { ok: false, reason: "checkpoint-prerequisite" };
    if (mapId === "star_gate_garden" && !completedEvents.includes("landing_devil_memory"))
      return { ok: false, reason: "checkpoint-prerequisite" };
    // Return-only spawns cannot be obtained before their incoming route unlocks.
    if (mapId === "alenon" && value.checkpoint.spawnId === "pad_return" &&
        !completedEvents.includes("alenon_prologue"))
      return { ok: false, reason: "checkpoint-prerequisite" };
    if (mapId === "star_country_landing" && value.checkpoint.spawnId === "garden_entrance" &&
        !completedEvents.includes("landing_devil_memory"))
      return { ok: false, reason: "checkpoint-prerequisite" };
    if (mapId === "alenon" && value.companion === "joined_with_shion")
      return { ok: false, reason: "companion-location-mismatch" };
    if (mapId === "star_gate_garden" && value.companion === "waiting_at_landing")
      return { ok: false, reason: "companion-location-mismatch" };
    return {
      ok: true,
      normalized: completedEvents.length !== value.completedEvents.length,
      value: {
        version: VERSION,
        checkpoint: { mapId, spawnId: value.checkpoint.spawnId },
        completedEvents,
        companion: value.companion,
      },
    };
  }

  function createProgress({ storage, diagnostic } = {}) {
    let confirmed = null; // Last successfully read or written durable v1 record only.
    function note(failureClass, code, details) {
      const safe = { failureClass, code };
      if (Number.isInteger(details?.version)) safe.version = details.version;
      if (registry.isMapId(details?.mapId)) safe.mapId = details.mapId;
      if (registry.isEventId(details?.eventId)) safe.eventId = details.eventId;
      try {
        if (typeof diagnostic === "function") diagnostic(safe);
        else if (typeof console !== "undefined") console.warn("[Progress Core]", safe);
      } catch (_) { /* Diagnostics must never stop the game. */ }
    }
    function backend() {
      // Access itself can throw in private/restricted browsers. No global read at import time.
      return storage === undefined ? globalThis.localStorage : storage;
    }
    function load() {
      confirmed = null;
      let raw;
      try {
        const store = backend();
        if (!store || typeof store.getItem !== "function") throw new Error("storage unavailable");
        raw = store.getItem(STORAGE_KEY);
      } catch (_) {
        note("storage", "read-unavailable");
        return { status: "unavailable", reason: "read-unavailable" };
      }
      if (raw === null) return { status: "none" };
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch (_) {
        note("save", "malformed-json");
        return { status: "invalid", reason: "malformed-json" };
      }
      const result = validateRecord(parsed);
      if (!result.ok) {
        note("save", result.reason, result);
        return { status: result.reason === "unsupported-version" ? "unsupported" : "invalid", reason: result.reason };
      }
      confirmed = result.value;
      return { status: "valid", state: copy(confirmed), normalized: result.normalized };
    }
    function persist(candidate) {
      const result = validateRecord(candidate);
      if (!result.ok) throw new ProgressValidationError(result.reason);
      let reason;
      try {
        const store = backend();
        if (!store || typeof store.setItem !== "function") throw new Error("storage unavailable");
        store.setItem(STORAGE_KEY, JSON.stringify(result.value)); // One complete replacement.
      } catch (error) {
        reason = error?.name === "QuotaExceededError" || error?.code === 22 || error?.code === 1014
          ? "quota-exceeded" : "write-unavailable";
        note("storage", reason);
        // Candidate is a volatile result for the caller; confirmed remains unchanged.
        return { persisted: false, reason, candidate: copy(result.value) };
      }
      confirmed = result.value;
      return { persisted: true, state: copy(confirmed) };
    }
    function requireConfirmed() {
      if (!confirmed) throw new ProgressValidationError("no-confirmed-progress");
      return confirmed;
    }
    function getCheckpoint() {
      return confirmed ? { ...confirmed.checkpoint } : null;
    }
    function isEventCompleted(eventId) {
      if (!registry.isEventId(eventId)) throw new ProgressValidationError("unknown-event");
      return confirmed ? confirmed.completedEvents.includes(eventId) : false;
    }
    function completeEvent(eventId, checkpoint) {
      if (!registry.isEventId(eventId)) throw new ProgressValidationError("unknown-event");
      const current = requireConfirmed();
      if (current.completedEvents.includes(eventId))
        return { completed: true, persisted: true, alreadyCompleted: true, state: copy(current) };
      const event = registry.events[eventId];
      if (!validCheckpoint(checkpoint) || checkpoint.mapId !== event.mapId ||
          checkpoint.spawnId !== event.checkpointSpawnId)
        throw new ProgressValidationError("invalid-event-checkpoint");
      if (event.requires.some(required => !current.completedEvents.includes(required)))
        throw new ProgressValidationError("missing-prerequisite");
      if (current.checkpoint.mapId !== event.mapId)
        throw new ProgressValidationError("event-map-mismatch");
      const candidate = {
        ...current, checkpoint: { ...checkpoint },
        completedEvents: [...current.completedEvents, eventId],
        companion: event.joinsCompanion ? "joined_with_shion" : current.companion,
      };
      const outcome = persist(candidate);
      return { completed: outcome.persisted, ...outcome };
    }
    function commitArrival(edge) {
      const current = requireConfirmed();
      const match = registry.validateRoute(edge, current.completedEvents);
      if (!match.ok) throw new ProgressValidationError(match.reason);
      const route = match.route;
      if (route.sourceMapId === "title") {
        if (current.checkpoint.mapId !== "alenon" || current.checkpoint.spawnId !== "intro" ||
            current.completedEvents.length || current.companion !== "not_joined")
          throw new ProgressValidationError("title-start-requires-new-game");
      } else if (route.sourceMapId !== current.checkpoint.mapId) {
        throw new ProgressValidationError("route-source-mismatch");
      }
      const destination = { mapId: route.destinationMapId, spawnId: route.spawnId };
      if (current.checkpoint.mapId === destination.mapId &&
          current.checkpoint.spawnId === destination.spawnId)
        return { committed: true, persisted: true, alreadyCommitted: true, state: copy(current) };
      const outcome = persist({ ...current, checkpoint: destination });
      return { committed: outcome.persisted, ...outcome };
    }
    function setCompanion(status, checkpoint, reason) {
      const current = requireConfirmed();
      if (!registry.companionStates.includes(status))
        throw new ProgressValidationError("invalid-companion");
      if (status === current.companion)
        return { committed: true, persisted: true, alreadyCommitted: true, state: copy(current) };
      const transition = registry.matchCompanionTransition(current.companion, status, reason, checkpoint);
      if (!transition || current.checkpoint.mapId !== transition.mapId ||
          !current.completedEvents.includes("garden_shiopon_meet"))
        throw new ProgressValidationError("unapproved-companion-transition");
      const outcome = persist({ ...current, companion: status, checkpoint: { ...checkpoint } });
      return { committed: outcome.persisted, ...outcome };
    }
    function resetGame() {
      const outcome = persist(INITIAL);
      return { started: outcome.persisted, ...outcome };
    }
    return Object.freeze({
      load, getCheckpoint, isEventCompleted, completeEvent, commitArrival, setCompanion, resetGame,
    });
  }

  return Object.freeze({ STORAGE_KEY, VERSION, createProgress, validateRecord, ProgressValidationError });
});
