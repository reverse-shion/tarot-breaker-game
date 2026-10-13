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
  let playAttempt = null;
  let transportAuthorized = false;
  let pageSuspended = false;
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
      // RAF's frame timestamp can precede performance.now() at fade creation.
      // Clamp both interpolation progress and the HTMLMediaElement volume.
      const progress = Math.max(0, Math.min(1, (now - startedAt) / duration));
      const eased = 1 - Math.pow(1 - progress, 3);
      bgm.volume = Math.max(0, Math.min(1, from + (to - from) * eased));
      if (progress < 1) {
        fadeFrame = requestAnimationFrame(step);
        return;
      }
      fadeFrame = 0;
      onComplete?.();
    };
    fadeFrame = requestAnimationFrame(step);
  }

  const transportAvailable = () => enabled && !document.hidden && !pageSuspended;

  function invalidatePlay() {
    playAttempt = null;
    transportAuthorized = false;
  }

  function stopTransport() {
    invalidatePlay();
    bgm.pause();
  }

  // All owners share one native play request. A retired promise may stop a
  // retired transport, but must never pause a newer authorized request.
  function playTransport() {
    if (!transportAvailable()) return Promise.resolve(false);
    if (playAttempt) return playAttempt.promise;
    transportAuthorized = true;
    if (!bgm.paused) return Promise.resolve(true);
    const attempt = {};
    playAttempt = attempt;
    let nativePlay;
    try { nativePlay = bgm.play(); }
    catch (error) { nativePlay = Promise.reject(error); }
    attempt.promise = Promise.resolve(nativePlay).then(() => {
      if (playAttempt !== attempt) {
        if (!transportAuthorized) bgm.pause();
        return false;
      }
      playAttempt = null;
      if (!transportAvailable()) {
        stopTransport();
        return false;
      }
      return true;
    }, () => {
      if (playAttempt === attempt) stopTransport();
      return false;
    });
    return attempt.promise;
  }

  async function resumeBgm() {
    if (eventSession || !enteredWorld || !transportAvailable()) return;
    // Cancel an OFF fade synchronously while an already-playing transport is
    // reused. Its queued pause must not win before the promise continuation.
    if (!bgm.paused && !playAttempt) {
      transportAuthorized = true;
      fadeTo(targetVolume);
      return;
    }
    const played = await playTransport();
    if (!played || eventSession || !transportAvailable()) return;
    fadeTo(targetVolume);
  }

  function pauseBgm(immediate = false) {
    if (immediate) {
      cancelFade();
      stopTransport();
      bgm.volume = 0;
      return;
    }
    invalidatePlay();
    fadeTo(0, 180, () => stopTransport());
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
    if (eventSession) eventSession.recoverTransport();
    else resumeBgm();
  }

  window.addEventListener("tarot-breaker:interaction-start", () => {
    targetVolume = INTERACTION_VOLUME;
    if (eventSession) eventSession.userChanged();
    else if (enteredWorld && transportAvailable()) fadeTo(targetVolume);
  });
  window.addEventListener("tarot-breaker:interaction-end", () => {
    targetVolume = NORMAL_VOLUME;
    if (eventSession) eventSession.userChanged();
    else if (enteredWorld && transportAvailable()) fadeTo(targetVolume);
  });

  function suspendTransport() {
    if (eventSession) eventSession.suspendTransport();
    else pauseBgm(true);
  }
  function recoverTransport() {
    if (eventSession) eventSession.recoverTransport();
    else resumeBgm();
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) suspendTransport();
    else recoverTransport();
  });
  window.addEventListener("pagehide", () => {
    pageSuspended = true;
    suspendTransport();
  });
  window.addEventListener("pageshow", () => {
    pageSuspended = false;
    recoverTransport();
  });

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
    let transportWanted = !bgm.paused || Boolean(playAttempt);
    let silenceFactor = 1;
    let coefficientFrame = 0;
    let coefficientToken = 0;
    const cancelCoefficientFade = () => {
      coefficientToken += 1;
      if (coefficientFrame) cancelAnimationFrame(coefficientFrame);
      coefficientFrame = 0;
    };
    const apply = () => {
      if (alive) bgm.volume = transportAvailable() && !silent && !failed ? targetVolume * level * silenceFactor : 0;
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
        transportWanted = false;
        stopTransport();
        bgm.muted = true;
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
        // iOS Safari does not reliably honor programmatic HTMLMediaElement.volume.
        // Native muted is the hard audible gate; volume/gain remains secondary.
        bgm.muted = true;
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
        bgm.muted = true;
        silent = true;
        silenceFactor = 0;
        failed = false;
        transportWanted = snapshot.playing;
        try { bgm.currentTime = snapshot.time; }
        catch { failed = true; apply(); return false; }
        apply();
        return !snapshot.playing || !bgm.paused;
      },
      // Reveal-only unmute. Never calls play(): if transport was unexpectedly
      // lost, report failure rather than silently relying on the next tap.
      revealSilent(snapshot) {
        if (!alive || snapshot?.source !== BGM_SRC) return false;
        transportWanted = snapshot.playing;
        silent = false;
        silenceFactor = 1;
        failed = snapshot.playing && (bgm.paused || !transportAvailable());
        // Only the painted present Garden is allowed to make the ordinary BGM audible again.
        // Remember that boundary even when Safari requires a later accepted gesture.
        bgm.muted = false;
        apply();
        return !failed;
      },
      async resume(snapshot) {
        if (!alive || snapshot?.source !== BGM_SRC) return false;
        const ownToken = ++token;
        transportWanted = snapshot.playing;
        bgm.muted = false;
        silent = false;
        silenceFactor = 1;
        failed = false;
        try { bgm.currentTime = snapshot.time; } catch { failed = true; apply(); return false; }
        if (!transportWanted || !transportAvailable()) { stopTransport(); apply(); return true; }
        let timeout;
        try {
          const played = await Promise.race([playTransport(), new Promise((_, reject) => {
            timeout = setTimeout(() => reject(new Error("Event BGM resume timeout")), 500);
          })]);
          if (!alive || token !== ownToken) return false;
          if (!played || !transportAvailable()) { failed = true; apply(); return false; }
          apply();
          return true;
        } catch {
          if (alive && token === ownToken) { failed = true; stopTransport(); apply(); }
          return false;
        } finally { clearTimeout(timeout); }
      },
      suspendTransport() {
        if (!alive) return;
        token += 1;
        cancelFade();
        stopTransport();
        apply();
      },
      async recoverTransport() {
        if (!alive || !transportWanted || !transportAvailable()) return;
        const ownToken = token;
        const played = await playTransport();
        if (!alive || ownToken !== token) return;
        failed = !played;
        // Recovery never changes silent/muted: blackouts stay hard-muted.
        apply();
      },
      userChanged() {
        if (!enabled) { token += 1; stopTransport(); }
        apply();
      },
      release() {
        if (!alive) return;
        token += 1;
        if (playAttempt) stopTransport();
        else invalidatePlay();
        alive = false;
        cancelCoefficientFade();
        cancelFade();
        eventSession = null;
        // Event hard-mute must never leak into normal gameplay after release.
        // Normal gameplay regains its own entered/enabled transport intent.
        bgm.muted = false;
        bgm.volume = transportAvailable() && !failed ? targetVolume : 0;
        resumeBgm();
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
