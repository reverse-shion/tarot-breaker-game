/* Starroad Abyss / live-map corruption. Cosmetic overlay only:
 * never changes movement, map sprites, dialogue, battle state or save timing. */
(() => {
  'use strict';
  const OWNER = 'hoshisuna_caritas_prompt';
  const SOURCE = './assets/events/hoshisuna/battle/abyss-encroachment.webp';
  const DURATION_MS = 1650;
  const REVEAL_MS = 1240;
  let active = null;

  function clear() {
    if (!active) return;
    const state = active;
    active = null;
    for (const id of state.timers) clearTimeout(id);
    state.overlay.remove();
    if (state.battle?.dataset.abyssTransition) delete state.battle.dataset.abyssTransition;
  }

  function origin() {
    const caritas = document.querySelector('.hoshi-caritas');
    const rect = caritas?.getBoundingClientRect?.();
    const vw = window.innerWidth || document.documentElement.clientWidth || 390;
    const vh = window.innerHeight || document.documentElement.clientHeight || 844;
    const x = rect?.width > 0 ? rect.left + rect.width / 2 : vw * .53;
    const y = rect?.height > 0 ? rect.top + rect.height * .83 : vh * .43;
    return {
      x: Math.min(vw - 8, Math.max(8, x)),
      y: Math.min(vh - 8, Math.max(8, y)), vw, vh,
    };
  }

  function start(event) {
    if (event.detail?.source !== OWNER || active) return;
    const battle = document.getElementById('caritas-event');
    if (!battle) return;
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const {x,y,vw,vh} = origin();
    const reach = Math.max(
      Math.hypot(x,y),Math.hypot(vw-x,y),
      Math.hypot(x,vh-y),Math.hypot(vw-x,vh-y)
    );
    const base = Math.min(460,Math.max(230,Math.min(vw,vh)*.74));
    // The blur layer is a bounded compositor surface which scales outward;
    // we do not blur or clone the full-page DOM/canvas every frame.
    const spread = Math.max(2.4,Math.min(5.8,reach*1.65/(base*.65)));

    const overlay = document.createElement('div');
    overlay.className = 'abyss-transition';
    overlay.setAttribute('aria-hidden','true');
    overlay.style.setProperty('--abyss-x',x+'px');
    overlay.style.setProperty('--abyss-y',y+'px');
    overlay.style.setProperty('--abyss-spread',String(spread));

    const bleed = document.createElement('div');
    bleed.className = 'abyss-transition__bleed';
    const stain = document.createElement('div');
    stain.className = 'abyss-transition__stain';
    const ink = document.createElement('img');
    ink.className = 'abyss-transition__mass';
    ink.alt = '';
    ink.decoding = 'async';
    ink.setAttribute('aria-hidden','true');
    ink.addEventListener('error',() => { ink.hidden = true; },{once:true});
    ink.src = SOURCE;
    const veil = document.createElement('div');
    veil.className = 'abyss-transition__veil';
    overlay.append(bleed,stain,ink,veil);
    document.body.append(overlay);

    const state = active = {overlay,battle,timers:[]};
    // The 2600ms engulfing stage continues unchanged underneath this overlay.
    if (!reduced) {
      battle.dataset.abyssTransition = 'covering';
      state.timers.push(setTimeout(() => {
        if (active === state) battle.dataset.abyssTransition = 'revealing';
      },REVEAL_MS));
    }
    state.timers.push(setTimeout(() => {
      if (active === state) clear();
    },reduced ? 160 : DURATION_MS));
  }

  window.addEventListener('tarot-breaker:hoshisuna-transition-start',start);
  window.addEventListener('pagehide',clear);
  window.addEventListener('tarot-breaker:interaction-end',event => {
    if (event.detail?.source === OWNER) clear();
  });
  document.addEventListener('visibilitychange',() => {
    if (document.hidden) clear();
  });
})();
