/* Starroad BGM: keep the field melody through dialogue and manifestation.
 * Only the actual battle handoff silences the music on iOS Safari. */
(() => {
  'use strict';
  const OWNER = 'hoshisuna_caritas_prompt';
  let encounterActive = false;
  let encounterSession = null;
  let muteTimer = 0;

  function release() {
    if (muteTimer) clearTimeout(muteTimer);
    muteTimer = 0;
    const session = encounterSession;
    encounterSession = null;
    session?.release();
  }

  // The first approach and every conversation stay musical. The shared audio
  // controller already lowers its normal BGM volume for dialogue.
  window.addEventListener('tarot-breaker:interaction-start', event => {
    if (event.detail?.source === OWNER) encounterActive = true;
  });

  // The battle engine dispatches this exactly when combat becomes playable.
  // Keep the native transport alive while muted, so scripted return-to-map
  // does not require another iOS Safari user gesture.
  window.addEventListener('tarot-breaker:hoshisuna-battle-start', () => {
    if (!encounterActive || encounterSession) return;
    const audio = window.TarotAudio;
    if (!audio?.beginEventSession) return;
    try {
      const session = audio.beginEventSession();
      encounterSession = session;
      session.tweenCoefficient(0, 650, false);
      muteTimer = setTimeout(() => {
        muteTimer = 0;
        if (encounterSession === session) session.holdSilent();
      }, 650);
    } catch (error) {
      console.warn('[Hoshisuna BGM] Battle music handoff unavailable', error);
    }
  });

  window.addEventListener('tarot-breaker:interaction-end', event => {
    if (event.detail?.source !== OWNER) return;
    encounterActive = false;
    release();
  });
  // BFCache must not retain a retired event session.
  window.addEventListener('pagehide', () => {
    encounterActive = false;
    release();
  });
})();
