(() => {
  "use strict";
  if (window.TarotJourney) return;
  const KEY = "tarot-breaker:map-journey-v1";
  let state = {};
  try { state = JSON.parse(sessionStorage.getItem(KEY) || "{}") || {}; } catch (_) {}
  function save() {
    try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
  }
  window.TarotJourney = Object.freeze({
    get: (key) => state[key],
    set(key, value) { state[key] = value; save(); },
    reset() { state = {}; save(); },
  });
})();
