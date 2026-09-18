(() => {
  "use strict";

  const startButton = document.getElementById("start");
  const toggleButton = document.getElementById("audio-toggle");
  if (!toggleButton || typeof Audio !== "function") return;

  const STORAGE_KEY = "tarot-breaker:bgm-enabled";
  const POSITION_KEY = "tarot-breaker:bgm-position";
  const NORMAL_VOLUME = 0.35;
  const INTERACTION_VOLUME = 0.16;
  const FADE_MS = 320;
  const BGM_SRC =
    document.currentScript?.dataset.bgmUrl ||
    "./assets/audio/bgm/hoshi-no-kioku_toki-no-inori.mp3";

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
  let lastPositionSave = 0;
  let pendingResume = false;

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

  function readPosition() {
    try {
      const raw = sessionStorage.getItem(POSITION_KEY);
      const value = Number(raw);
      return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  function savePosition(force = false) {
    if (!Number.isFinite(bgm.currentTime) || bgm.currentTime < 0) return;
    const now = performance.now();
    if (!force && now - lastPositionSave < 900) return;
    lastPositionSave = now;
    try {
      sessionStorage.setItem(POSITION_KEY, String(bgm.currentTime));
    } catch {
      // Audio continuity is optional; storage failure must not block playback.
    }
  }

  function restorePosition() {
    const position = readPosition();
    if (!position) return;
    try {
      const duration = Number.isFinite(bgm.duration) && bgm.duration > 0
        ? bgm.duration
        : 0;
      bgm.currentTime = duration ? position % duration : position;
    } catch {
      // Some browsers reject currentTime until metadata is ready.
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
    if (!enteredWorld || !enabled || document.hidden) return false;
    try {
      const playResult = bgm.play();
      if (playResult?.then) await playResult;
      if (!enabled || document.hidden) {
        bgm.pause();
        return false;
      }
      pendingResume = false;
      fadeTo(targetVolume);
      return true;
    } catch (error) {
      // iOS/Safari may block playback after a page transition until the
      // next user gesture. Keep the request armed instead of treating it
      // as a permanent failure.
      pendingResume = true;
      console.warn("BGM再生待機中 — 次の操作で再開します", error);
      return false;
    }
  }

  function pauseBgm(immediate = false) {
    savePosition(true);
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
    if (!enteredWorld) {
      enteredWorld = true;
      toggleButton.hidden = false;
    }
    if (enabled) resumeBgm();
  }

  function resumeFromGesture() {
    if (!enteredWorld || !enabled) return;
    if (bgm.paused || pendingResume) resumeBgm();
  }

  if (startButton) {
    startButton.addEventListener("click", enterWorld, { capture: true });
  }

  window.addEventListener("tarot-breaker:world-enter", enterWorld);

  // Pages reached through PAD transitions do not have a start button. Try
  // immediately, then retry on the next genuine user gesture if autoplay is
  // blocked by the browser.
  if (document.body?.dataset.audioAutostart === "true") {
    enterWorld();
  }

  for (const type of ["pointerdown", "touchstart", "keydown"]) {
    window.addEventListener(type, resumeFromGesture, {
      capture: true,
      passive: true,
    });
  }

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

  bgm.addEventListener("loadedmetadata", restorePosition, { once: true });
  bgm.addEventListener("timeupdate", () => savePosition(false));

  bgm.addEventListener("error", () => {
    cancelFade();
    pendingResume = false;
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
    get pendingResume() {
      return pendingResume;
    },
    setEnabled,
    enterWorld,
    resume: resumeBgm,
  });
})();
