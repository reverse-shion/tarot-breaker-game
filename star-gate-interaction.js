(() => {
  "use strict";

  const GATE = Object.freeze({ x: 810, y: 105 });
  const ACTIVE_RADIUS = 118;
  const progress = window.TarotProgressCore?.createProgress?.();
  let active = false;
  let completed = false;
  let prompt = null;

  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function progressReady() {
    if (!progress) return false;
    try {
      const loaded = progress.load();
      if (loaded.status !== "valid") return false;
      completed = progress.isEventCompleted("garden_star_gate_anomaly");
      return progress.isEventCompleted("garden_lumiere_gate") && !completed;
    } catch { return false; }
  }
  function ensurePrompt() {
    if (prompt) return prompt;
    prompt = document.createElement("button");
    prompt.id = "star-gate-interact";
    prompt.type = "button";
    prompt.textContent = "調べる";
    prompt.hidden = true;
    prompt.setAttribute("aria-label", "星門を調べる");
    document.getElementById("game-shell")?.appendChild(prompt);
    prompt.addEventListener("click", start);
    return prompt;
  }
  function canInteract() {
    const state = window.TarotDialogue?.getState?.();
    const stage = window.TarotStage?.getState?.();
    const shion = stage?.actors?.shion;
    return Boolean(progressReady() && state?.lumiereDone && !state.active && shion && distance(shion, GATE) <= ACTIVE_RADIUS);
  }
  function render() {
    const el = ensurePrompt();
    active = canInteract();
    el.hidden = !active;
    el.disabled = !active;
  }
  function start(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!canInteract()) return false;
    ensurePrompt().hidden = true;
    active = false;
    window.dispatchEvent(new CustomEvent("tarot-breaker:star-gate-investigate", {
      detail: Object.freeze({ source: "garden_star_gate_interaction" })
    }));
    return true;
  }
  window.addEventListener("tarot-breaker:interaction-start", render);
  window.addEventListener("tarot-breaker:interaction-end", () => setTimeout(render, 0));
  window.addEventListener("tarot-breaker:star-gate-anomaly-complete", () => {
    completed = true; render();
  });
  window.setInterval(render, 180);
  window.TarotStarGateInteraction = Object.freeze({ canInteract, start, getState: () => ({ active, completed }) });
  ensurePrompt();
  render();
})();