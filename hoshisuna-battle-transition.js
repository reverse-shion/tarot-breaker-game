/* Isolated Starroad battle transition. Cosmetic only: never controls battle,
 * checkpoints, navigation, player position, dialogue or music. */
(() => {
  'use strict';
  const OWNER = 'hoshisuna_caritas_prompt';
  const SOURCE = './assets/events/hoshisuna/battle/abyss-encroachment.svg';
  const DURATION_MS = 1000;
  const REVEAL_MS = 670;
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
    const viewportW = window.innerWidth || document.documentElement.clientWidth || 390;
    const viewportH = window.innerHeight || document.documentElement.clientHeight || 844;
    const x = rect?.width > 0 ? rect.left + rect.width / 2 : viewportW * .53;
    const y = rect?.height > 0 ? rect.top + rect.height * .83 : viewportH * .43;
    return {
      x: Math.min(viewportW - 8, Math.max(8, x)),
      y: Math.min(viewportH - 8, Math.max(8, y)),
      viewportW, viewportH
    };
  }

  function start(event) {
    if (event.detail?.source !== OWNER || active) return;
    const battle = document.getElementById('caritas-event');
    if (!battle) return; // Missing overlay must never prevent the original battle.
    const lowMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const { x, y, viewportW, viewportH } = origin();
    const farthest = Math.max(...[
      Math.hypot(x,y),Math.hypot(viewportW-x,y),
      Math.hypot(x,viewportH-y),Math.hypot(viewportW-x,viewportH-y)
    ]);
    const inkBaseSize = Math.max(180, Math.min(360, Math.min(viewportW,viewportH) * .38));
    const scale = Math.max(8, Math.ceil(farthest * 1.45 / (inkBaseSize * .36)));

    const overlay = document.createElement('div');
    overlay.className = 'abyss-transition';
    overlay.setAttribute('aria-hidden','true');
    overlay.style.setProperty('--abyss-x',x+'px');
    overlay.style.setProperty('--abyss-y',y+'px');
    overlay.style.setProperty('--abyss-max-scale',String(scale));

    const fallback = document.createElement('div');
    fallback.className = 'abyss-transition__fallback';
    const ink = document.createElement('img');
    ink.className = 'abyss-transition__mass';
    ink.alt = '';
    ink.decoding = 'async';
    ink.setAttribute('aria-hidden','true');
    ink.addEventListener('error',() => { ink.hidden = true; },{once:true});
    ink.src = SOURCE;
    const veil = document.createElement('div');
    veil.className = 'abyss-transition__veil';
    overlay.append(fallback,ink,veil);
    document.body.append(overlay);

    const state = active = {overlay,battle,timers:[]};
    // Prebattle animation is already running for 2600ms. Never extend that
    // duration, and never hide the arena beyond this decorative curtain.
    if (!lowMotion) {
      battle.dataset.abyssTransition = 'covering';
      state.timers.push(setTimeout(() => {
        if (active === state) battle.dataset.abyssTransition = 'revealing';
      }, REVEAL_MS));
    }
    state.timers.push(setTimeout(() => {
      if (active === state) clear();
    }, lowMotion ? 160 : DURATION_MS));
  }

  window.addEventListener('tarot-breaker:hoshisuna-transition-start',start);
  window.addEventListener('pagehide',clear);
  window.addEventListener('tarot-breaker:interaction-end', event => {
    if (event.detail?.source === OWNER) clear();
  });
  document.addEventListener('visibilitychange',() => {
    if (document.hidden) clear();
  });
})();
