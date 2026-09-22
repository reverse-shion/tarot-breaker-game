/* Isolated Star Gate Anomaly device harness.
 * Enabled only by ?dev=star-gate-anomaly. Never writes Progress/localStorage.
 */
(() => {
  "use strict";
  const params = new URLSearchParams(location.search);
  if (params.get("dev") !== "star-gate-anomaly") return;
  window.__TAROT_DEV_STAR_GATE_ANOMALY__ = true;
  document.documentElement.dataset.devHarness = "star-gate-anomaly";
  // Legacy story state is session-only. This makes the garden runtime render
  // its normal post-Lumiere cast without touching durable Progress.
  window.TarotJourney?.set("gardenStory", {
    shioponDone: true,
    lumiereDone: true,
    joined: true,
  });
})();