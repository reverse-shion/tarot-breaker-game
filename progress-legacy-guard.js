/* Phase 2A-3: dormant, read-only legacy isolation. No game page imports this file. */
(function (root, factory) {
  const core = typeof module === "object" && module.exports
    ? require("./progress.js") : root.TarotProgressCore;
  const api = factory(core);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TarotLegacyGuard = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (core) {
  "use strict";

  if (!core) throw new Error("TarotProgressCore must load before Legacy Guard");
  const LEGACY_KEY = "tarot-breaker:map-journey-v1";
  const LEGACY_STATUSES = Object.freeze([
    "legacy_absent", "legacy_present_parseable", "legacy_present_malformed",
    "legacy_present_nonobject", "legacy_unavailable",
  ]);

  function createLegacyGuard({ progress, storage, diagnostic } = {}) {
    const progressCore = progress === undefined ? core.createProgress() : progress;
    if (!progressCore || typeof progressCore.load !== "function")
      throw new TypeError("Legacy Guard requires a Progress Core instance");

    function note(failureClass, code) {
      try {
        if (typeof diagnostic === "function") diagnostic({ failureClass, code });
        else if (typeof console !== "undefined") console.warn("[Legacy Guard]", { failureClass, code });
      } catch (_) { /* Diagnostics cannot prevent authority resolution. */ }
    }
    function inspect() {
      let raw;
      try {
        const backend = storage === undefined ? globalThis.sessionStorage : storage;
        if (!backend || typeof backend.getItem !== "function") throw new Error("storage unavailable");
        raw = backend.getItem(LEGACY_KEY);
      } catch (_) {
        note("legacy-storage", "read-unavailable");
        return Object.freeze({ status: "legacy_unavailable" });
      }
      if (raw === null) return Object.freeze({ status: "legacy_absent" });
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch (_) {
        note("legacy-data", "malformed-json");
        return Object.freeze({ status: "legacy_present_malformed" });
      }
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
        return Object.freeze({ status: "legacy_present_nonobject" });
      return Object.freeze({ status: "legacy_present_parseable" });
    }
    function resolveAuthority() {
      // Read the real durable v1 key through Progress Core; caller-supplied legacy, URL,
      // or handoff data can never fabricate a Progress.load() result.
      let loaded;
      try { loaded = progressCore.load(); }
      catch (_) {
        note("progress", "load-exception");
        loaded = { status: "unavailable" };
      }
      let authority;
      if (loaded?.status === "valid") {
        // Defend against an improperly implemented or substituted Progress loader.
        authority = core.validateRecord(loaded.state).ok ? "progress_v1" : "invalid_progress";
      } else if (loaded?.status === "invalid") {
        authority = "invalid_progress";
      } else if (loaded?.status === "unsupported") {
        authority = "unsupported_progress";
      } else if (loaded?.status === "none") {
        authority = "none";
      } else if (loaded?.status === "unavailable") {
        authority = "unavailable_progress";
      } else {
        note("progress", "unknown-load-result");
        authority = "invalid_progress";
      }
      // Inspection is diagnostic only and never alters the authority decision.
      const legacy = inspect().status;
      return Object.freeze({ authority, canContinue: authority === "progress_v1", legacy });
    }
    return Object.freeze({ inspect, resolveAuthority });
  }

  return Object.freeze({ LEGACY_KEY, LEGACY_STATUSES, createLegacyGuard });
});
