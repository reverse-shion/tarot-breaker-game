/* Explicit Production Continue controller. Import has no browser/storage/navigation effects. */
(function(root, factory) {
  const common = typeof module === "object" && module.exports;
  const api = factory(common ? require("./progress.js") : root.TarotProgressCore,
    common ? require("./progress-resume.js") : root.TarotProgressResume);
  if (common) module.exports = api; else root.TarotPublicContinue = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(core, resume) {
  "use strict";
  const conflicting = Object.freeze(["dev", "from", "landingDev", "skipPrologue", "edit", "objects", "collision", "legacyCollision", "spawn", "map", "resume"]);
  function validateEntry(search) {
    const params = new URLSearchParams(search || "");
    return params.getAll("entry").length === 1 && params.get("entry") === "continue" &&
      !conflicting.some(key => params.has(key));
  }
  function assess(load) {
    if (!load || load.status !== "valid") return Object.freeze({ok:false, status:load?.status || "unavailable"});
    const result = resume.resolveContinue(load);
    if (!result.ok) return Object.freeze({ok:false, status:"invalid", reason:result.reason});
    const context = result.context;
    const supported =
      (context.mapId === "alenon" && ["intro", "pad_return"].includes(context.spawnId)) ||
      (context.mapId === "star_country_landing" && ["pad_ground", "garden_entrance"].includes(context.spawnId));
    if (!supported) return Object.freeze({ok:false, status:"preparing"});
    return Object.freeze({ok:true, status:"valid", context, url:"./" + context.entryFile + "?entry=continue"});
  }
  function createController({storage, diagnostic, navigate} = {}) {
    let launching = false;
    function inspect() {
      return assess(core.createProgress({storage, diagnostic}).load());
    }
    function launch() {
      if (launching) return Object.freeze({ok:false, status:"busy"});
      const result = inspect();
      if (!result.ok) return result;
      launching = true;
      try {
        if (typeof navigate !== "function") throw new Error("navigation-unavailable");
        navigate(result.url);
        return result;
      } catch (_) { launching = false; return Object.freeze({ok:false, status:"navigation-failed"}); }
    }
    return Object.freeze({inspect, launch});
  }
  return Object.freeze({conflicting, validateEntry, assess, createController});
});
