(() => {
  "use strict";

  const startButton = document.getElementById("start");
  const toggleButton = document.getElementById("audio-toggle");
  if (!startButton || !toggleButton || typeof Audio !== "function") return;

  const STORAGE_KEY = "tarot-breaker:bgm-enabled";
  const NORMAL_VOLUME = 0.35;
  const INTERACTION_VOLUME = 0.16;
  const FADE_MS = 320;
  const BGM_SRC = document.currentScript?.dataset.bgmUrl || "./assets/audio/bgm/hoshi-no-kioku_toki-no-inori.mp3";

  const bgm = new Audio(BGM_SRC);
  bgm.loop = true;
  bgm.preload = "auto";
  bgm.volume = 0;
  bgm.setAttribute("playsinline", "");

  let enteredWorld = false;
  let enabled = readPreference();
  let targetVolume = NORMAL_VOLUME;
  let fadeFrame = 0;
  let fadeToken = 0;

  function readPreference() {
    try {
      return localStorage.getItem(STORAGE_KEY) !== "0";
    } catch {
      return true;
    }
  }

  function savePreference() {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch {
      // Private browsing or storage restrictions must not block the game.
    }
  }

  function renderToggle() {
    toggleButton.dataset.enabled = String(enabled);
    toggleButton.setAttribute("aria-pressed", String(enabled));
    toggleButton.setAttribute(
      "aria-label",
      enabled ? "BGMをオフにする" : "BGMをオンにする",
    );
    toggleButton.title = enabled ? "BGM ON" : "BGM OFF";
    toggleButton.textContent = enabled ? "♪" : "♪×";
  }

  function cancelFade() {
    fadeToken += 1;
    if (fadeFrame) cancelAnimationFrame(fadeFrame);
    fadeFrame = 0;
  }

  function fadeTo(nextVolume, duration = FADE_MS, onComplete) {
    cancelFade();
    const token = fadeToken;
    const from = bgm.volume;
    const to = Math.max(0, Math.min(1, nextVolume));

    if (duration <= 0 || Math.abs(from - to) < 0.001) {
      bgm.volume = to;
      onComplete?.();
      return;
    }

    const startedAt = performance.now();
    const step = (now) => {
      if (token !== fadeToken) return;
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      bgm.volume = from + (to - from) * eased;
      if (progress < 1) {
        fadeFrame = requestAnimationFrame(step);
        return;
      }
      fadeFrame = 0;
      onComplete?.();
    };
    fadeFrame = requestAnimationFrame(step);
  }

  async function resumeBgm() {
    if (!enteredWorld || !enabled || document.hidden) return;
    try {
      const playResult = bgm.play();
      if (playResult?.then) await playResult;
      if (!enabled || document.hidden) {
        bgm.pause();
        return;
      }
      fadeTo(targetVolume);
    } catch (error) {
      console.warn("BGMを再生できませんでした", error);
    }
  }

  function pauseBgm(immediate = false) {
    if (immediate) {
      cancelFade();
      bgm.pause();
      bgm.volume = 0;
      return;
    }
    fadeTo(0, 180, () => bgm.pause());
  }

  function setEnabled(nextEnabled) {
    enabled = Boolean(nextEnabled);
    savePreference();
    renderToggle();
    if (!enteredWorld) return;
    if (enabled) resumeBgm();
    else pauseBgm();
  }

  function enterWorld() {
    if (enteredWorld) return;
    enteredWorld = true;
    toggleButton.hidden = false;
    if (enabled) resumeBgm();
  }

  startButton.addEventListener("click", enterWorld, { capture: true });
  toggleButton.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  toggleButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setEnabled(!enabled);
  });

  window.addEventListener("tarot-breaker:interaction-start", () => {
    targetVolume = INTERACTION_VOLUME;
    if (enteredWorld && enabled) fadeTo(targetVolume);
  });
  window.addEventListener("tarot-breaker:interaction-end", () => {
    targetVolume = NORMAL_VOLUME;
    if (enteredWorld && enabled) fadeTo(targetVolume);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseBgm(true);
    else resumeBgm();
  });
  window.addEventListener("pagehide", () => pauseBgm(true));
  window.addEventListener("pageshow", () => resumeBgm());

  bgm.addEventListener("error", () => {
    cancelFade();
    toggleButton.disabled = true;
    toggleButton.textContent = "♪!";
    toggleButton.setAttribute("aria-label", "BGMを読み込めません");
    console.warn("BGMファイルを読み込めません", BGM_SRC);
  });

  renderToggle();

  window.TarotAudio = Object.freeze({
    get enabled() {
      return enabled;
    },
    get enteredWorld() {
      return enteredWorld;
    },
    setEnabled,
  });
})();
