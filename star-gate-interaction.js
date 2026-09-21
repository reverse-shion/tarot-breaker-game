(() => {
  "use strict";

  const GATE = Object.freeze({ x: 810, y: 105 });
  const ACTIVE_RADIUS = 118;
  const progress = window.TarotProgressCore?.createProgress?.();
  let active = false;
  let completed = false;
  let prompt = null;
  let armed = true;

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
    prompt = document.createElement("aside");
    prompt.id = "star-gate-interaction-choice";
    prompt.hidden = true;
    prompt.setAttribute("aria-label", "星門を調べる");
    prompt.innerHTML = '<div id="star-gate-interaction-text">星門の共鳴が揺らいでいる。</div><div class="star-gate-interaction-actions"><button id="star-gate-interaction-inspect" type="button">星門を調べる</button><button id="star-gate-interaction-leave" type="button">離れる</button></div>';
    document.getElementById("game-shell")?.appendChild(prompt);
    prompt.querySelector("#star-gate-interaction-inspect")?.addEventListener("click", start);
    prompt.querySelector("#star-gate-interaction-leave")?.addEventListener("click", () => {
      armed = false;
      active = false;
      prompt.classList.remove("visible");
      window.setTimeout(() => { if (!prompt.classList.contains("visible")) prompt.hidden = true; }, 220);
    });
    return prompt;
  }
  function canInteract() {
    const state = window.TarotDialogue?.getState?.();
    const stage = window.TarotStage?.getState?.();
    const shion = stage?.actors?.shion;
    if (shion && distance(shion, GATE) >= 154) armed = true;
    return Boolean(progressReady() && !state?.active && shion && armed && distance(shion, GATE) <= ACTIVE_RADIUS);
  }
  function render() {
    const el = ensurePrompt();
    active = canInteract();
    el.hidden = !active;
    el.classList.toggle("visible", active);
  }
  function start(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!canInteract()) return false;
    armed = false;
    ensurePrompt().classList.remove("visible");
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
  window.TarotStarGateInteraction = Object.freeze({ canInteract, start, getState: () => ({ active, completed, armed }) });
  ensurePrompt();
  render();
})();