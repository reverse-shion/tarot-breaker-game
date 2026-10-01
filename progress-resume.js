/* Phase 2A-5a: dormant resume foundation. No production page imports this module. */
(function (root, factory) {
  const common = typeof module === "object" && module.exports;
  const api = factory(common ? require("./route-registry.js") : root.TarotRouteRegistry,
    common ? require("./progress.js") : root.TarotProgressCore);
  if (common) module.exports = api;
  else root.TarotProgressResume = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (registry, core) {
  "use strict";
  const HANDOFF_KEY = "tarot-breaker:arrival-handoff-v1";
  const HANDOFF_TTL_MS = 10 * 60 * 1000;
  const READINESS_KEYS = Object.freeze(["assetsReady", "collisionReady", "spawnResolved",
    "historyRestored", "companionPlaced", "arrivalSettled"]);
  const EDGE_KEYS = ["sourceMapId", "destinationMapId", "spawnId", "reason"];
  const ENVELOPE_KEYS = ["version", "token", "usedTokens", "phase", "issuedAt", "expiresAt", "edge", "sourceState"];
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const plain = value => value !== null && typeof value === "object" && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  const exact = (value, keys) => plain(value) && Object.keys(value).length === keys.length && keys.every(key => own(value, key));
  const copy = value => JSON.parse(JSON.stringify(value));
  function freeze(value) {
    if (value && typeof value === "object") {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  const result = value => freeze(copy(value));
  const fail = reason => result({ ok: false, reason });
  const tokenValid = token => typeof token === "string" && token.length > 0 && token.length <= 128;
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const validate = state => core.validateRecord(state);
  function resolveContinue(loadResult) {
    try {
      if (!plain(loadResult) || loadResult.status !== "valid") return fail("save-not-valid");
      const checked = validate(loadResult.state);
      if (!checked.ok) return fail(checked.reason);
      const state = checked.value;
      return result({ ok: true, context: { entryKind: "continue", ...state.checkpoint,
        entryFile: registry.maps[state.checkpoint.mapId].entryFile,
        completedEvents: state.completedEvents, companion: state.companion } });
    } catch (_) { return fail("validation-unavailable"); }
  }
  function routeStates(edge, state) {
    if (!exact(edge, EDGE_KEYS) || edge.sourceMapId === "title") return fail("invalid-edge");
    const checked = validate(state);
    if (!checked.ok) return fail(checked.reason);
    const match = registry.validateRoute(edge, checked.value.completedEvents);
    if (!match.ok) return fail(match.reason);
    if (checked.value.checkpoint.mapId !== edge.sourceMapId) return fail("route-source-mismatch");
    const destination = validate({ ...checked.value,
      checkpoint: { mapId: edge.destinationMapId, spawnId: edge.spawnId } });
    if (!destination.ok) return fail(destination.reason);
    return { ok: true, source: checked.value, destination: destination.value };
  }
  function createHandoffStore({ storage, now, createToken } = {}) {
    function read() {
      if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function" ||
          typeof now !== "function" || typeof createToken !== "function") return fail("dependencies-unavailable");
      const time = now();
      if (!Number.isFinite(time)) return fail("invalid-clock");
      const raw = storage.getItem(HANDOFF_KEY);
      if (raw === null) return { ok: true, time, envelope: null };
      let envelope;
      try { envelope = JSON.parse(raw); } catch (_) { return fail("corrupt-handoff"); }
      if (!exact(envelope, ENVELOPE_KEYS) || envelope.version !== 1 || !tokenValid(envelope.token) ||
          !Array.isArray(envelope.usedTokens) || envelope.usedTokens.some(token => !tokenValid(token)) ||
          new Set(envelope.usedTokens).size !== envelope.usedTokens.length ||
          !envelope.usedTokens.includes(envelope.token) ||
          !["pending", "claimed", "committed"].includes(envelope.phase) ||
          !Number.isFinite(envelope.issuedAt) || !Number.isFinite(envelope.expiresAt) ||
          envelope.expiresAt !== envelope.issuedAt + HANDOFF_TTL_MS || time < envelope.issuedAt)
        return fail("corrupt-handoff");
      const states = routeStates(envelope.edge, envelope.sourceState);
      if (!states.ok) return fail("corrupt-handoff");
      return { ok: true, time, envelope: { ...envelope, sourceState: states.source },
        destination: states.destination, expired: time >= envelope.expiresAt };
    }
    function write(envelope) {
      storage.setItem(HANDOFF_KEY, JSON.stringify(envelope));
    }
    function matching(input, loaded) {
      if (!loaded.ok) return loaded;
      if (!loaded.envelope) return fail("missing-handoff");
      if (loaded.expired) return fail("expired-handoff");
      if (input.token !== loaded.envelope.token || !tokenValid(input.token)) return fail("token-mismatch");
      if (input.destinationMapId !== loaded.envelope.edge.destinationMapId ||
          input.spawnId !== loaded.envelope.edge.spawnId) return fail("destination-mismatch");
      return { ok: true };
    }
    function safe(operation) {
      return function (input = {}) {
        try { return operation(input); }
        catch (_) { return fail("dependency-failure"); }
      };
    }
    const issue = safe(input => {
      const states = routeStates(input.edge, input.state);
      if (!states.ok) return states;
      const loaded = read();
      if (!loaded.ok) return loaded;
      if (loaded.envelope && !loaded.expired && loaded.envelope.phase !== "committed") return fail("handoff-in-flight");
      const token = createToken();
      if (!tokenValid(token)) return fail("invalid-token");
      const usedTokens = loaded.envelope ? loaded.envelope.usedTokens : [];
      if (usedTokens.includes(token)) return fail("token-reused");
      const envelope = { version: 1, token, usedTokens: [...usedTokens, token], phase: "pending", issuedAt: loaded.time,
        expiresAt: loaded.time + HANDOFF_TTL_MS, edge: copy(input.edge), sourceState: states.source };
      if (!Number.isFinite(envelope.expiresAt) || envelope.expiresAt - loaded.time !== HANDOFF_TTL_MS)
        return fail("invalid-clock");
      write(envelope);
      return result({ ok: true, receipt: envelope });
    });
    const claim = safe(input => {
      const loaded = read();
      const match = matching(input, loaded);
      if (!match.ok) return match;
      const checked = validate(input.state);
      if (!checked.ok) return fail(checked.reason);
      const atSource = equal(checked.value, loaded.envelope.sourceState);
      const atDestination = equal(checked.value, loaded.destination);
      if (loaded.envelope.phase === "committed") {
        if (!atDestination) return fail("state-mismatch");
        return result({ ok: true, alreadyCommitted: true, receipt: loaded.envelope });
      }
      if (!atSource && !(loaded.envelope.phase === "claimed" && atDestination)) return fail("state-mismatch");
      if (loaded.envelope.phase === "pending") {
        loaded.envelope.phase = "claimed";
        write(loaded.envelope);
      }
      return result({ ok: true, receipt: loaded.envelope });
    });
    const commit = safe(input => {
      const loaded = read();
      const match = matching(input, loaded);
      if (!match.ok) return match;
      if (loaded.envelope.phase === "pending") return fail("handoff-not-claimed");
      if (!plain(input.readiness) || READINESS_KEYS.some(key => !own(input.readiness, key) || input.readiness[key] !== true))
        return fail("not-ready");
      const progress = input.progress;
      if (!progress || typeof progress.getCurrentState !== "function" || typeof progress.commitArrival !== "function")
        return fail("progress-unavailable");
      // Integration must refresh durable evidence before calling; cached Progress cannot enforce cross-tab atomicity.
      const current = progress.getCurrentState();
      if (!current || current.persisted !== true) return fail("persistence-retry-required");
      const checked = validate(current.state);
      if (!checked.ok) return fail(checked.reason);
      const atDestination = equal(checked.value, loaded.destination);
      if (loaded.envelope.phase === "committed") {
        if (!atDestination) return fail("state-mismatch");
        return result({ ok: true, persisted: true, receiptPersisted: true, alreadyCommitted: true });
      }
      if (!atDestination && !equal(checked.value, loaded.envelope.sourceState)) return fail("state-mismatch");
      if (!atDestination) {
        const outcome = progress.commitArrival(loaded.envelope.edge);
        if (!outcome || outcome.persisted !== true) return result({ ok: false, persisted: false,
          reason: "arrival-not-persisted", receiptPersisted: false });
        const arrived = validate(outcome.state);
        const after = progress.getCurrentState();
        const confirmed = after?.persisted === true ? validate(after.state) : { ok: false };
        if (!arrived.ok || !equal(arrived.value, loaded.destination) || !confirmed.ok || !equal(confirmed.value, loaded.destination))
          return fail("arrival-state-mismatch");
      }
      loaded.envelope.phase = "committed";
      try { write(loaded.envelope); }
      catch (_) { return result({ ok: false, persisted: true, receiptPersisted: false, reason: "receipt-write-failed" }); }
      return result({ ok: true, persisted: true, receiptPersisted: true, recovered: atDestination });
    });
    return Object.freeze({ issue, claim, commit });
  }
  return Object.freeze({ HANDOFF_KEY, HANDOFF_TTL_MS, READINESS_KEYS, resolveContinue, createHandoffStore });
});
