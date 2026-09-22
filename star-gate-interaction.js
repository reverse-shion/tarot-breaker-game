(() => {
  "use strict";

  const GATE = Object.freeze({ x: 810, y: 105 });
  const ACTIVE_RADIUS = 46;
  const TAP_RADIUS = 150;
  const REARM_RADIUS = 96;
  const DEV_HARNESS = window.__TAROT_DEV_STAR_GATE_ANOMALY__ === true;
  const progress = DEV_HARNESS ? null : window.TarotProgressCore?.createProgress?.();
  let completed = false;
  let armed = true;
  let interactionOwned = false;

  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function progressReady() {
    if (DEV_HARNESS) { completed = false; return true; }
    if (!progress) return false;
    try {
      const loaded = progress.load();
      if (loaded.status !== "valid") return false;
      completed = progress.isEventCompleted("garden_star_gate_anomaly");
      return progress.isEventCompleted("garden_lumiere_gate") && !completed;
    } catch { return false; }
  }

  function player() {
    return window.TarotStage?.getState?.()?.actors?.shion || null;
  }

  function refreshArm() {
    const shion = player();
    if (shion && distance(shion, GATE) >= REARM_RADIUS) armed = true;
  }

  function canInteract() {
    const state = window.TarotDialogue?.getState?.();
    const shion = player();
    refreshArm();
    return Boolean(
      progressReady() &&
      !state?.active &&
      shion &&
      armed &&
      distance(shion, GATE) <= ACTIVE_RADIUS
    );
  }

  function tappedGate(point) {
    return Boolean(point && distance(point, GATE) <= TAP_RADIUS);
  }

  function releaseInteraction() {
    if (!interactionOwned) return;
    interactionOwned = false;
    window.dispatchEvent(new CustomEvent("tarot-breaker:interaction-end", {
      detail: Object.freeze({ source: "garden_star_gate_direct" })
    }));
  }

  function start(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!canInteract()) return false;
    armed = false;
    interactionOwned = true;
    window.dispatchEvent(new CustomEvent("tarot-breaker:interaction-start", {
      detail: Object.freeze({ source: "garden_star_gate_direct" })
    }));
    window.dispatchEvent(new CustomEvent("tarot-breaker:star-gate-investigate", {
      detail: Object.freeze({ source: "garden_star_gate_interaction" })
    }));
    return true;
  }

  function onWorldTap(event) {
    const point = event?.detail?.point;
    if (!tappedGate(point)) return;
    start(event);
  }

  window.addEventListener("tarot-breaker:world-tap", onWorldTap);
  window.addEventListener("tarot-breaker:star-gate-anomaly-complete", () => {
    completed = true;
    releaseInteraction();
  });
  window.addEventListener("tarot-breaker:star-gate-anomaly-abort", releaseInteraction);
  window.setInterval(refreshArm, 180);

  window.TarotStarGateInteraction = Object.freeze({
    canInteract,
    start,
    tappedGate,
    getState: () => ({ active: false, completed, armed, promptLock: interactionOwned })
  });
})();