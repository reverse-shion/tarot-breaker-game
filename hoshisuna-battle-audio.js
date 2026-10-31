/* RE:SONANCE BREAKER — Caritas battle BGM.
 * The field BGM hard-mutes at the first Abyss stain. A 650ms dramatic silence
 * follows, then the battle song begins WHILE the map is dissolving: 1950ms
 * before the existing 2600ms battle-stage handoff. A real user gesture during
 * dialogue primes the muted audio so iPhone Safari need not autoplay later.
 * Battle-start remains a failsafe for restored checkpoints and interruptions. */
(() => {
  'use strict';
  if (typeof Audio !== 'function') return;

  const OWNER = 'hoshisuna_caritas_prompt';
  const SOURCE = './assets/battle/bgm/re-sonance-breaker.mp3';
  const VOLUME = 0.38;
  const ABYSS_MUSIC_CUE_MS = 650;
  // Actual MP3 silence_end at -45 dB: 0.222146s; preserve the first chime.
  const FIRST_SOUND_SEC = 0.25;
  const music = new Audio(SOURCE);
  music.loop = true;
  music.preload = 'auto';
  music.muted = true;
  music.volume = VOLUME;
  music.setAttribute('playsinline', '');

  let encounter = false;
  let inBattle = false;
  let playAttempt = null;
  let playGeneration = 0;
  let cuePending = false;
  let cueTimer = 0;

  function cancelCue() {
    if (cueTimer) clearTimeout(cueTimer);
    cueTimer = 0;
  }

  const permitted = () => !document.hidden && window.TarotAudio?.enabled !== false;

  // A prewarmed muted transport may already be several seconds into the file
  // after dialogue. Always seek back to the exact first audible phrase.
  function cueOpening() {
    if (!inBattle) return false;
    if (Number.isFinite(music.readyState) && music.readyState < 1) {
      cuePending = true;
      return false;
    }
    try {
      music.currentTime = FIRST_SOUND_SEC;
      cuePending = false;
      return true;
    } catch (_) {
      cuePending = true;
      return false;
    }
  }

  function reveal() {
    if (!encounter || !inBattle || !permitted()) return;
    if (cuePending && !cueOpening()) return;
    // Do not unmute a still-pending play promise. The resolved callback
    // reveals it without a separate timer.
    if (playAttempt || music.paused) return;
    music.volume = VOLUME;
    music.muted = false;
  }

  // Called from a genuine pointer/touch/key gesture during conversation.
  // Prewarming is inaudible; it never starts the battle song over the map.
  function startNative() {
    if (!encounter || !permitted() || playAttempt || !music.paused) return;
    const generation = ++playGeneration;
    let result;
    try { result = music.play(); }
    catch (error) { result = Promise.reject(error); }
    const attempt = Promise.resolve(result);
    playAttempt = attempt;
    attempt.then(() => {
      if (playGeneration !== generation) return;
      playAttempt = null;
      if (!encounter || !permitted()) {
        music.muted = true;
        music.pause();
        return;
      }
      reveal();
    }, () => {
      if (playGeneration !== generation) return;
      playAttempt = null;
      music.muted = true;
      // Re-attempt only on the next real user gesture (iPhone autoplay gate).
    });
  }

  function gesture() {
    if (!encounter || !permitted()) return;
    if (!inBattle) {
      music.muted = true;
      startNative();
      return;
    }
    if (!music.paused) reveal();
    else startNative();
  }

  function pauseForBackground() {
    ++playGeneration;
    playAttempt = null;
    music.muted = true;
    music.pause();
  }

  function stopCombat() {
    cancelCue();
    inBattle = false;
    cuePending = false;
    pauseForBackground();
    try { music.currentTime = 0; } catch (_) {}
  }

  function leaveEncounter() {
    encounter = false;
    stopCombat();
  }

  // Metadata can arrive after the fight UI appears on a slow network.
  // Seek before revealing audio; never play from the file's silent head.
  music.addEventListener('loadedmetadata', () => {
    if (cuePending && cueOpening()) reveal();
  });
  music.addEventListener('canplay', () => {
    if (cuePending && cueOpening()) reveal();
  });

  window.addEventListener('tarot-breaker:interaction-start', event => {
    if (event.detail?.source === OWNER) encounter = true;
  });

  function activateBattleMusic() {
    cancelCue();
    if (!encounter || inBattle) return;
    inBattle = true;
    cueOpening(); // Reset any elapsed muted-prewarm time to the first chime.
    reveal();
    if (music.paused) startNative();
  }

  window.addEventListener('tarot-breaker:hoshisuna-transition-start', event => {
    if (event.detail?.source !== OWNER || !encounter || inBattle || cueTimer) return;
    // The field-music listener runs synchronously on this same event and
    // hard-mutes before the timer begins. Music starts while ink is spreading.
    cueTimer = setTimeout(activateBattleMusic, ABYSS_MUSIC_CUE_MS);
  });

  // The existing battle DOM event is a fallback for restored checkpoints,
  // missed timers and devices that suspended the transition.
  window.addEventListener('tarot-breaker:hoshisuna-battle-start', activateBattleMusic);

  window.addEventListener('tarot-breaker:hoshisuna-battle-stop', stopCombat);
  window.addEventListener('tarot-breaker:interaction-end', event => {
    if (event.detail?.source === OWNER) leaveEncounter();
  });

  window.addEventListener('pointerdown', gesture, {capture:true, passive:true});
  window.addEventListener('touchstart', gesture, {capture:true, passive:true});
  window.addEventListener('keydown', gesture, true);
  window.addEventListener('pagehide', () => {cancelCue(); pauseForBackground();});
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {cancelCue(); pauseForBackground();}
  });
  music.addEventListener('error', () => console.warn('[Hoshisuna] combat BGM unavailable:', SOURCE));
})();
