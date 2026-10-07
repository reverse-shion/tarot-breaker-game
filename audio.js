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
  let eventSession = null;

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
    if (eventSession || !enteredWorld || !enabled || document.hidden || playPending || !bgm.paused) return;
    playPending = true;
    try {
      const playResult = bgm.play();
      if (playResult?.then) await playResult;
      if (eventSession) return;
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

  function setEnabled(nextEnabled) {
    enabled = Boolean(nextEnabled);
    savePreference();
    renderToggle();
    if (eventSession) {
      eventSession.userChanged();
      return;
    }
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
    if (eventSession) eventSession.userChanged();
    else if (enteredWorld && enabled) fadeTo(targetVolume);
  });
  window.addEventListener("tarot-breaker:interaction-end", () => {
    targetVolume = NORMAL_VOLUME;
    if (eventSession) eventSession.userChanged();
    else if (enteredWorld && enabled) fadeTo(targetVolume);
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

  // Explicitly owned by the isolated dev event; ordinary callers never enter it.
  function beginEventSession() {
    if (eventSession) throw new Error("Audio event session already active");
    cancelFade();
    let alive = true;
    let level = 1;
    let silent = false;
    let token = 0;
    let failed = false;
    let pendingResumes = 0;
    let silenceFactor = 1;
    let coefficientFrame = 0;
    let coefficientToken = 0;
    const cancelCoefficientFade = () => {
      coefficientToken += 1;
      if (coefficientFrame) cancelAnimationFrame(coefficientFrame);
      coefficientFrame = 0;
    };
    const apply = () => {
      if (alive) bgm.volume = enabled && !silent && !failed ? targetVolume * level * silenceFactor : 0;
    };
    const tweenCoefficient = (value, duration, isSilence) => {
      if (!alive) return;
      cancelCoefficientFade();
      const ownToken = coefficientToken;
      const from = isSilence ? silenceFactor : level;
      const to = Math.max(0, Math.min(1, Number(value) || 0));
      const startedAt = performance.now();
      const step = (now) => {
        if (!alive || ownToken !== coefficientToken) return;
        const progress = duration > 0 ? Math.max(0, Math.min(1, (now - startedAt) / duration)) : 1;
        if (isSilence) silenceFactor = from + (to - from) * progress;
        else level = from + (to - from) * progress;
        apply();
        if (progress < 1) coefficientFrame = requestAnimationFrame(step);
        else coefficientFrame = 0;
      };
      if (duration > 0) coefficientFrame = requestAnimationFrame(step);
      else step(startedAt);
    };
    const capture = () => Object.freeze({
      source: BGM_SRC, time: bgm.currentTime, playing: !bgm.paused,
      base: targetVolume, coefficient: level,
    });
    const session = {
      capture,
      setBase(value) { if (!alive) return; targetVolume = Math.max(0, Math.min(1, Number(value) || 0)); apply(); },
      tweenCoefficient,
      setLevel(value) { if (!alive) return; cancelCoefficientFade(); level = Math.max(0, Math.min(1, Number(value) || 0)); apply(); },
      setSilence(value) { tweenCoefficient(value ? 0 : 1, 0, true); },
      pause() {
        const snapshot = capture();
        cancelCoefficientFade();
        token += 1;
        cancelFade();
        bgm.pause();
        silent = true;
        apply();
        return snapshot;
      },
      // Event-only iOS-safe silence path. Keep an already user-started media
      // transport alive at zero audible gain so a later scripted reveal does
      // not depend on a fresh play() permission.
      holdSilent() {
        if (!alive) return false;
        cancelCoefficientFade();
        token += 1;
        cancelFade();
        silent = true;
        silenceFactor = 0;
        apply();
        return !bgm.paused;
      },
      // Rewind/seek the still-running ordinary BGM while it remains inaudible.
      // This preserves the captured return position without pausing transport.
      prepareSilent(snapshot) {
        if (!alive || snapshot?.source !== BGM_SRC) return false;
        cancelCoefficientFade();
        token += 1;
        silent = true;
        silenceFactor = 0;
        failed = false;
        try { bgm.currentTime = snapshot.time; }
        catch { failed = true; apply(); return false; }
        apply();
        return !snapshot.playing || !bgm.paused;
      },
      // Reveal-only unmute. Never calls play(): if transport was unexpectedly
      // lost, report failure rather than silently relying on the next tap.
      revealSilent(snapshot) {
        if (!alive || snapshot?.source !== BGM_SRC) return false;
        if (snapshot.playing && (bgm.paused || !enabled || document.hidden)) return false;
        silent = false;
        silenceFactor = 1;
        failed = false;
        apply();
        return true;
      },
      async resume(snapshot) {
        if (!alive || snapshot?.source !== BGM_SRC) return false;
        const ownToken = ++token;
        silent = false;
        silenceFactor = 1;
        failed = false;
        try { bgm.currentTime = snapshot.time; } catch { failed = true; apply(); return false; }
        if (!snapshot.playing || !enabled || document.hidden) { bgm.pause(); apply(); return true; }
        let timeout;
        pendingResumes += 1;
        try {
          const pending = Promise.resolve(bgm.play());
          // A late native play fulfillment must never revive an invalidated run.
          pending.then(() => { if (!alive || token !== ownToken || failed || !enabled || document.hidden) bgm.pause(); }, () => {});
          await Promise.race([pending, new Promise((_, reject) => {
            timeout = setTimeout(() => reject(new Error("Event BGM resume timeout")), 500);
          })]);
          if (!alive || token !== ownToken || !enabled || document.hidden) { bgm.pause(); return false; }
          apply();
          return true;
        } catch {
          if (alive && token === ownToken) { failed = true; bgm.pause(); apply(); }
          return false;
        } finally { pendingResumes -= 1; clearTimeout(timeout); }
      },
      userChanged() { if (!enabled) { token += 1; bgm.pause(); } apply(); },
      release() {
        if (!alive) return;
        token += 1;
        if (pendingResumes) bgm.pause();
        alive = false;
        cancelCoefficientFade();
        cancelFade();
        eventSession = null;
        // Preserve restored play state; do not start a previously stopped source.
        bgm.volume = enabled && !failed ? targetVolume : 0;
      },
    };
    eventSession = session;
    apply();
    return Object.freeze(session);
  }

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
    beginEventSession,
    setCinematicLevel(value, duration = 0) { eventSession?.tweenCoefficient(value, duration, false); },
    setCinematicSilence(value, duration = 0) { eventSession?.tweenCoefficient(value ? 0 : 1, duration, true); },
  });
})();
