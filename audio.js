(() => {
  "use strict";

  const toggleButton = document.getElementById("audio-toggle");
  if (window.TarotAudio || typeof Audio !== "function") return;
  if (toggleButton) toggleButton.hidden = true;

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
  let playPending = false;
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
    if (!toggleButton) return;
    toggleButton.hidden = true;
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
    if (!enteredWorld || !enabled || document.hidden || playPending || !bgm.paused) return;
    playPending = true;
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
    } finally {
      playPending = false;
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

  function setCinematicSilence(active, duration = 200) {
    targetVolume = active ? 0 : INTERACTION_VOLUME;
    if (!enteredWorld || !enabled) return;
    if (active) fadeTo(0, duration);
    else { resumeBgm(); fadeTo(targetVolume, duration); }
  }

  function setEnabled(nextEnabled) {
    enabled = Boolean(nextEnabled);
    savePreference();
    renderToggle();
    if (!enteredWorld) return;
    if (enabled) resumeBgm();
    else pauseBgm();
  }

  // Called synchronously by each map's accepted movement gesture. A hidden
  // legacy toggle preference must not prevent the requested map music starting.
  function startFromMovement() {
    if (!enteredWorld) {
      enteredWorld = true;
      enabled = true;
      renderToggle();
    }
    resumeBgm();
  }

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
    if (toggleButton) {
      toggleButton.disabled = true;
      toggleButton.textContent = "♪!";
      toggleButton.setAttribute("aria-label", "BGMを読み込めません");
    }
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
    startFromMovement,
    setCinematicSilence,
  });
})();
