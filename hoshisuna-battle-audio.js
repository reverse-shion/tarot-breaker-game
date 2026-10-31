/* RE:SONANCE BREAKER — isolated Caritas combat BGM.
 * Prime a muted native audio transport from a real gesture before the delayed
 * battle transition, so iPhone Safari does not need scripted autoplay. */
(() => {
  'use strict';
  if (typeof Audio !== 'function') return;

  const OWNER = 'hoshisuna_caritas_prompt';
  const SOURCE = './assets/battle/bgm/re-sonance-breaker.mp3';
  const VOLUME = 0.38;
  const BATTLE_FADE_MS = 650;
  const music = new Audio(SOURCE);
  music.loop = true;
  music.preload = 'auto';
  music.muted = true;
  music.volume = VOLUME;
  music.setAttribute('playsinline', '');

  let encounter = false;
  let inBattle = false;
  let revealAllowed = false;
  let playAttempt = null;
  let playGeneration = 0;
  let revealTimer = 0;

  const permitted = () => !document.hidden && window.TarotAudio?.enabled !== false;

  function cancelTimer() {
    if (revealTimer) clearTimeout(revealTimer);
    revealTimer = 0;
  }

  // This is called directly by accepted pointer/touch/key gestures.
  // The muted audio keeps its decoder/transport ready for the cinematic handoff.
  function startNative() {
    if (!encounter || !permitted() || playAttempt || !music.paused) return;
    const generation = ++playGeneration;
    let nativeResult;
    try { nativeResult = music.play(); }
    catch (error) { nativeResult = Promise.reject(error); }
    const attempt = Promise.resolve(nativeResult);
    playAttempt = attempt;
    attempt.then(() => {
      if (playGeneration !== generation) {
        if (!encounter) { music.muted = true; music.pause(); }
        return;
      }
      playAttempt = null;
      if (!encounter || !permitted()) {
        music.muted = true;
        music.pause();
        return;
      }
      music.muted = !(inBattle && revealAllowed);
    }, () => {
      if (playGeneration === generation) {
        playAttempt = null;
        music.muted = true;
      }
    });
  }

  function gesture() {
    if (!encounter || !permitted()) return;
    music.muted = !(inBattle && revealAllowed);
    startNative();
  }

  function pauseForBackground() {
    ++playGeneration;
    playAttempt = null;
    music.muted = true;
    music.pause();
  }

  function stopCombat() {
    inBattle = false;
    revealAllowed = false;
    cancelTimer();
    pauseForBackground();
    try { music.currentTime = 0; } catch (_) {}
  }

  function leaveEncounter() {
    encounter = false;
    stopCombat();
  }

  window.addEventListener('tarot-breaker:interaction-start', event => {
    if (event.detail?.source === OWNER) encounter = true;
  });

  window.addEventListener('tarot-breaker:hoshisuna-battle-start', () => {
    if (!encounter || inBattle) return;
    inBattle = true;
    revealAllowed = false;
    cancelTimer();
    // Field BGM uses the same 650ms outgoing fade. Reveal only after it ends.
    revealTimer = setTimeout(() => {
      revealTimer = 0;
      if (!encounter || !inBattle || !permitted()) return;
      revealAllowed = true;
      music.volume = VOLUME;
      if (!music.paused) music.muted = false;
      else startNative(); // Permission denial retries on the next real gesture.
    }, BATTLE_FADE_MS);
  });

  window.addEventListener('tarot-breaker:hoshisuna-battle-stop', stopCombat);
  window.addEventListener('tarot-breaker:interaction-end', event => {
    if (event.detail?.source === OWNER) leaveEncounter();
  });

  window.addEventListener('pointerdown', gesture, { capture: true, passive: true });
  window.addEventListener('touchstart', gesture, { capture: true, passive: true });
  window.addEventListener('keydown', gesture, true);
  window.addEventListener('pagehide', pauseForBackground);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseForBackground();
  });
  music.addEventListener('error', () => console.warn('[Hoshisuna] combat BGM unavailable:', SOURCE));
})();
