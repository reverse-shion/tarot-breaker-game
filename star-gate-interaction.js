(() => {
  "use strict";

  const GATE = Object.freeze({ x: 810, y: 105 });
  const ACTIVE_RADIUS = 46;
  const progress = window.TarotProgressCore?.createProgress?.();
  let active = false;
  let completed = false;
  let prompt = null;
  let armed = true;
  let promptLock = false;

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
      hidePrompt();
    });
    return prompt;
  }
  function canInteract() {
    const state = window.TarotDialogue?.getState?.();
    const stage = window.TarotStage?.getState?.();
    const shion = stage?.actors?.shion;
    if (shion && distance(shion, GATE) >= 96) armed = true;
    return Boolean(progressReady() && !state?.active && shion && armed && distance(shion, GATE) <= ACTIVE_RADIUS);
  }
  function lockPrompt() {
    if (promptLock) return;
    promptLock = true;
    window.dispatchEvent(new CustomEvent("tarot-breaker:interaction-start", {
      detail: Object.freeze({ source: "garden_star_gate_prompt" })
    }));
  }
  function unlockPrompt() {
    if (!promptLock) return;
    promptLock = false;
    window.dispatchEvent(new CustomEvent("tarot-breaker:interaction-end", {
      detail: Object.freeze({ source: "garden_star_gate_prompt" })
    }));
  }
  function hidePrompt({ unlock = true } = {}) {
    const el = ensurePrompt();
    active = false;
    el.classList.remove("visible");
    window.setTimeout(() => { if (!el.classList.contains("visible")) el.hidden = true; }, 220);
    if (unlock) unlockPrompt();
  }
  function render() {
    const el = ensurePrompt();
    const shouldShow = canInteract();
    if (shouldShow && !active) {
      active = true;
      el.hidden = false;
      el.classList.add("visible");
      lockPrompt();
      return;
    }
    if (!shouldShow && active) hidePrompt();
  }
  function start(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!canInteract()) return false;
    armed = false;
    hidePrompt({ unlock: false });
    // Transfer the existing prompt lock directly into the anomaly runtime.
    // No interaction-end is emitted here, so controls cannot move between choice and event.
    window.dispatchEvent(new CustomEvent("tarot-breaker:star-gate-investigate", {
      detail: Object.freeze({ source: "garden_star_gate_interaction" })
    }));
    return true;
  }
  window.addEventListener("tarot-breaker:interaction-start", render);
  window.addEventListener("tarot-breaker:interaction-end", () => setTimeout(render, 0));
  window.addEventListener("tarot-breaker:star-gate-anomaly-complete", () => {
    completed = true;
    promptLock = false; // anomaly runtime owns and releases the shared interaction lock
    render();
  });
  window.addEventListener("tarot-breaker:star-gate-anomaly-abort", () => {
    promptLock = false;
    render();
  });
  window.setInterval(render, 180);
  window.TarotStarGateInteraction = Object.freeze({ canInteract, start, getState: () => ({ active, completed, armed, promptLock }) });
  ensurePrompt();
  render();
})();