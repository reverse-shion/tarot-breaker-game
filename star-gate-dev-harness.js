/* Isolated Star Gate Anomaly device harness.
 * Enabled by ?dev=star-gate-anomaly or ?dev=star-gate-full. Never writes Progress/localStorage.
 */
(() => {
  "use strict";
  const params = new URLSearchParams(location.search);
  if (!["star-gate-anomaly", "star-gate-full"].includes(params.get("dev"))) return;
  window.__TAROT_DEV_STAR_GATE_ANOMALY__ = true;
  document.documentElement.dataset.devHarness = params.get("dev");
  // Legacy story state is session-only. This makes the garden runtime render
  // its normal post-Lumiere cast without touching durable Progress.
  window.TarotJourney?.set("gardenStory", {
    shioponDone: true,
    lumiereDone: true,
    joined: true,
  });
})();