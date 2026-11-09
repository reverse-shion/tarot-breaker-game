/* Keep the field transport silent through combat and fade it in at map reveal. */
(() => {
  'use strict';
  const OWNER = 'hoshisuna_caritas_prompt';
  let encounterActive = false;
  let fieldReturned = false;
  let encounterSession = null;

  function primeReturnOutput() {
    if (encounterActive) window.TarotAudio?.prepareReturnOutput?.();
  }
  window.addEventListener('pointerdown', primeReturnOutput, { capture:true, passive:true });
  window.addEventListener('touchstart', primeReturnOutput, { capture:true, passive:true });
  window.addEventListener('keydown', primeReturnOutput, true);

  function release(fadeIn = false) {
    const session = encounterSession;
    encounterSession = null;
    session?.release({ fadeIn });
  }

  function hardSilence() {
    if (!encounterActive || fieldReturned) return;
    if (encounterSession) {
      encounterSession.holdSilent();
      return;
    }
    const audio = window.TarotAudio;
    if (!audio?.beginEventSession) {
      console.warn('[Hoshisuna BGM] Native silence controller unavailable');
      return;
    }
    try {
      const session = audio.beginEventSession();
      encounterSession = session;
      // No fade and no timer: HTMLMediaElement.muted is applied on THIS call.
      // Volume-only fades are unreliable on iPhone Safari.
      session.holdSilent();
    } catch (error) {
      console.error('[Hoshisuna BGM] Immediate hard mute failed', error);
    }
  }

  window.addEventListener('tarot-breaker:interaction-start', event => {
    if (event.detail?.source === OWNER) {
      encounterActive = true;
      fieldReturned = false;
    }
  });

  // First ink on map is also the exact frame when exploration music stops.
  window.addEventListener('tarot-breaker:hoshisuna-transition-start', event => {
    if (event.detail?.source === OWNER) hardSilence();
  });
  // Resume from an in-progress battle without replaying the transition.
  window.addEventListener('tarot-breaker:hoshisuna-battle-start', hardSilence);

  window.addEventListener('tarot-breaker:hoshisuna-field-return-cue', event => {
    if (event.detail?.source !== OWNER || !encounterActive || fieldReturned) return;
    fieldReturned = true;
    release(true);
  });

  window.addEventListener('tarot-breaker:interaction-end', event => {
    if (event.detail?.source !== OWNER) return;
    encounterActive = false;
    fieldReturned = false;
    release();
  });
  window.addEventListener('pagehide', () => {
    encounterActive = false;
    release();
  });
})();
