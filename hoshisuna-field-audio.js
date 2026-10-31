/* Starroad's field BGM lifecycle. Uses the unchanged shared iOS audio engine. */
(() => {
  'use strict';
  const OWNER = 'hoshisuna_caritas_prompt';
  let encounterSession = null;
  let muteTimer = 0;

  function release() {
    if (muteTimer) clearTimeout(muteTimer);
    muteTimer = 0;
    if (!encounterSession) return;
    const session = encounterSession;
    encounterSession = null;
    session.release();
  }

  window.addEventListener('tarot-breaker:interaction-start', event => {
    if (event.detail?.source !== OWNER || encounterSession) return;
    const audio = window.TarotAudio;
    if (!audio?.beginEventSession) return;
    try {
      const session = audio.beginEventSession();
      encounterSession = session;
      // The encounter owns its quiet: map music falls away before the first line.
      // iOS needs a real media mute to enforce silence even if .volume is ignored.
      session.tweenCoefficient(0, 650, false);
      muteTimer = setTimeout(() => {
        muteTimer = 0;
        if (encounterSession === session) session.holdSilent();
      }, 650);
    } catch (error) {
      console.warn('[Hoshisuna BGM] Could not acquire encounter audio', error);
    }
  });

  window.addEventListener('tarot-breaker:interaction-end', event => {
    if (event.detail?.source === OWNER) release();
  });
  // Ensure a BFCache return never inherits a retired, muted audio session.
  window.addEventListener('pagehide', release);
})();
