/* Dev-only compatibility adapter for the historical Star Gate anomaly runtime.
 * Loaded only by ?dev=garden-resume-after-lumiere. No durable Progress writes.
 */
(() => {
  "use strict";
  if (new URLSearchParams(location.search).get("dev") !== "garden-resume-after-lumiere") return;

  const original = window.TarotCinematicCamera;
  if (!original) return;

  function state() {
    const s = original.getState?.() || {};
    const actors = window.TarotStage?.getState?.()?.actors || {};
    const viewport = { width: innerWidth, height: innerHeight };
    const scale = s.scale || {x:1,y:1};
    const camera = s.camera || {zoom:s.zoom || 1};
    const origin = s.origin || {x:s.x || 0,y:s.y || 0};
    return {...s, actors, viewport, scale, camera, origin, player:actors.shion};
  }
  window.TarotCinematicCamera = Object.freeze({
    ...original,
    getState: state,
  });
})();