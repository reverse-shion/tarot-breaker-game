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
    let volatile = null; // Current nonpersistent playthrough; never mistaken for a durable save.
    const resetActions = new Set(); // Action tokens are runtime-only, never added to schema v1.
    const current = () => volatile || confirmed;
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
      volatile = null;
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
        // Continue this run in memory; confirmed and the old durable bytes stay unchanged.
        volatile = result.value;
        return { persisted: false, reason, candidate: copy(result.value) };
      }
      confirmed = result.value;
      volatile = null;
      return { persisted: true, state: copy(confirmed) };
    }
    function requireCurrent() {
      if (!current()) throw new ProgressValidationError("no-current-progress");
      return current();
    }
    // Durable checkpoint only; a temporary New Game may instead have a different current state.
    function getCheckpoint() {
      return confirmed ? { ...confirmed.checkpoint } : null;
    }
    // Consumers of temporary play use this copy and must check persisted before offering Continue.
    function getCurrentState() {
      const state = current();
      return state ? { state: copy(state), persisted: !volatile } : null;
    }
    // Answers for the current playthrough, which may be explicitly nonpersistent.
    function isEventCompleted(eventId) {
      if (!registry.isEventId(eventId)) throw new ProgressValidationError("unknown-event");
      return current() ? current().completedEvents.includes(eventId) : false;
    }
    function completeEvent(eventId, checkpoint) {
      if (!registry.isEventId(eventId)) throw new ProgressValidationError("unknown-event");
      const existing = requireCurrent();
      if (existing.completedEvents.includes(eventId))
        return { completed: !volatile, persisted: !volatile, alreadyCompleted: true, state: copy(existing) };
      const event = registry.events[eventId];
      if (!validCheckpoint(checkpoint) || checkpoint.mapId !== event.mapId ||
          checkpoint.spawnId !== event.checkpointSpawnId)
        throw new ProgressValidationError("invalid-event-checkpoint");
      if (event.requires.some(required => !existing.completedEvents.includes(required)))
        throw new ProgressValidationError("missing-prerequisite");
      if (existing.checkpoint.mapId !== event.mapId)
        throw new ProgressValidationError("event-map-mismatch");
      const candidate = {
        ...existing, checkpoint: { ...checkpoint },
        completedEvents: [...existing.completedEvents, eventId],
        companion: event.joinsCompanion ? "joined_with_shion" : existing.companion,
      };
      const outcome = persist(candidate);
      return { completed: outcome.persisted, ...outcome };
    }
    function commitArrival(edge) {
      const existing = requireCurrent();
      const match = registry.validateRoute(edge, existing.completedEvents);
      if (!match.ok) throw new ProgressValidationError(match.reason);
      const route = match.route;
      const destination = { mapId: route.destinationMapId, spawnId: route.spawnId };
      if (route.sourceMapId === "title") {
        if (existing.checkpoint.mapId !== "alenon" || existing.checkpoint.spawnId !== "intro" ||
            existing.completedEvents.length || existing.companion !== "not_joined")
          throw new ProgressValidationError("title-start-requires-new-game");
      }
      // The full edge and its prerequisites were checked above. A completed destination
      // is safe to acknowledge without advancing the checkpoint or touching storage.
      if (existing.checkpoint.mapId === destination.mapId &&
          existing.checkpoint.spawnId === destination.spawnId)
        return { committed: !volatile, persisted: !volatile, alreadyCommitted: true, state: copy(existing) };
      if (route.sourceMapId !== "title" && route.sourceMapId !== existing.checkpoint.mapId) {
        throw new ProgressValidationError("route-source-mismatch");
      }
      const outcome = persist({ ...existing, checkpoint: destination });
      return { committed: outcome.persisted, ...outcome };
    }
    function setCompanion(status, checkpoint, reason) {
      const existing = requireCurrent();
      if (!registry.companionStates.includes(status))
        throw new ProgressValidationError("invalid-companion");
      if (status === existing.companion)
        return { committed: !volatile, persisted: !volatile, alreadyCommitted: true, state: copy(existing) };
      const transition = registry.matchCompanionTransition(existing.companion, status, reason, checkpoint);
      if (!transition || existing.checkpoint.mapId !== transition.mapId ||
          !existing.completedEvents.includes("garden_shiopon_meet"))
        throw new ProgressValidationError("unapproved-companion-transition");
      const outcome = persist({ ...existing, companion: status, checkpoint: { ...checkpoint } });
      return { committed: outcome.persisted, ...outcome };
    }
    // Caller supplies one opaque token per deliberate New Game action, reused on duplicate calls.
    // Tokens live only in this instance: entry/navigation policy belongs to later phases.
    function resetGame(actionToken) {
      if (typeof actionToken !== "string" || !actionToken.length || actionToken.length > 128)
        throw new ProgressValidationError("invalid-new-game-action-token");
      if (resetActions.has(actionToken)) {
        const state = requireCurrent();
        return { started: true, persisted: !volatile, alreadyStarted: true, state: copy(state) };
      }
      const outcome = persist(INITIAL);
      resetActions.add(actionToken);
      return { started: true, ...outcome };
    }
    return Object.freeze({
      load, getCheckpoint, getCurrentState, isEventCompleted, completeEvent, commitArrival, setCompanion, resetGame,
    });
  }

  return Object.freeze({ STORAGE_KEY, VERSION, createProgress, validateRecord, ProgressValidationError });
});
