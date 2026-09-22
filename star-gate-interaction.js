(() => {
  "use strict";

  const GATE = Object.freeze({ x: 810, y: 105 });
  const ACTIVE_RADIUS = 46;
  const REARM_RADIUS = 96;
  const DEV_HARNESS = window.__TAROT_DEV_STAR_GATE_ANOMALY__ === true || window.__TAROT_DEV_STAR_GATE_CHOICE__ === true;
  const progress = DEV_HARNESS ? null : window.TarotProgressCore?.createProgress?.();
  let active = false;
  let completed = false;
  let prompt = null;
  let armed = true;
  let promptLock = false;

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

  function ensurePrompt() {
    if (prompt) return prompt;
    prompt = document.createElement("aside");
    prompt.id = "star-gate-interaction-choice";
    prompt.hidden = true;
    prompt.setAttribute("aria-label", "星門の選択");
    prompt.innerHTML =
      '<div id="star-gate-interaction-text">星門の共鳴が揺らいでいる。</div>' +
      '<div class="star-gate-interaction-actions">' +
      '<button id="star-gate-interaction-inspect" type="button">星門を調べる</button>' +
      '<button id="star-gate-interaction-leave" type="button">離れる</button>' +
      '</div>';
    document.getElementById("game-shell")?.appendChild(prompt);
    prompt.querySelector("#star-gate-interaction-inspect")?.addEventListener("click", start);
    prompt.querySelector("#star-gate-interaction-leave")?.addEventListener("click", leave);
    return prompt;
  }

  function canOfferChoice() {
    const state = window.TarotDialogue?.getState?.();
    const shion = player();
    if (shion && distance(shion, GATE) >= REARM_RADIUS) armed = true;
    return Boolean(
      progressReady() &&
      !state?.active &&
      shion &&
      armed &&
      distance(shion, GATE) <= ACTIVE_RADIUS
    );
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

  function showPrompt() {
    const el = ensurePrompt();
    if (active) return;
    active = true;
    el.hidden = false;
    el.classList.add("visible");
    lockPrompt();
  }

  function hidePrompt({ unlock = true } = {}) {
    const el = ensurePrompt();
    active = false;
    el.classList.remove("visible");
    window.setTimeout(() => {
      if (!el.classList.contains("visible")) el.hidden = true;
    }, 220);
    if (unlock) unlockPrompt();
  }

  function leave(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    armed = false;
    hidePrompt();
    return true;
  }

  function render() {
    const shouldShow = canOfferChoice();
    if (shouldShow && !active) {
      showPrompt();
      return;
    }
    if (!shouldShow && active) hidePrompt();
  }

  function start(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    // Once the prompt is visible it already owns the interaction lock.
    // Do not re-run canOfferChoice() here: interaction-start intentionally
    // suspends gameplay while the choice is on screen.
    if (!active || !promptLock || !progressReady()) return false;

    armed = false;
    hidePrompt({ unlock: false });
    window.dispatchEvent(new CustomEvent("tarot-breaker:star-gate-investigate", {
      detail: Object.freeze({ source: "garden_star_gate_interaction" })
    }));
    return true;
  }

  window.addEventListener("tarot-breaker:interaction-start", render);
  window.addEventListener("tarot-breaker:interaction-end", () => setTimeout(render, 0));
  window.addEventListener("tarot-breaker:star-gate-anomaly-complete", () => {
    completed = true;
    promptLock = false;
    active = false;
    render();
  });
  window.addEventListener("tarot-breaker:star-gate-anomaly-abort", () => {
    promptLock = false;
    active = false;
    render();
  });

  window.setInterval(render, 180);
  window.TarotStarGateInteraction = Object.freeze({
    canInteract: canOfferChoice,
    start,
    leave,
    getState: () => ({ active, completed, armed, promptLock })
  });

  ensurePrompt();
  render();
})();