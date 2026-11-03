/* Starroad field BGM: dialogue and manifestation stay audible.
 * Native hard mute occurs SYNCHRONOUSLY at the first abyss stain frame.
 * The user-started transport stays silent through combat, then returns during
 * the post-purification reply, BEFORE the map is revealed (iOS autoplay-safe). */
(() => {
  'use strict';
  const OWNER = 'hoshisuna_caritas_prompt';
  let encounterActive = false;
  let fieldReturned = false;
  let encounterSession = null;

  function release() {
    const session = encounterSession;
    encounterSession = null;
    session?.release();
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

  // The final post-purification battle reply is spoken while the battle UI
  // still covers the map. Stop combat music first, then unmute the original
  // already-running field transport so it leads into the map reveal.
  window.addEventListener('tarot-breaker:hoshisuna-field-return-cue', event => {
    if (event.detail?.source !== OWNER || !encounterActive || fieldReturned) return;
    fieldReturned = true;
    release();
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
