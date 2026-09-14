(() => {
  "use strict";

  const shell = document.getElementById("game-shell");
  const map = document.getElementById("map-layer");
  if (!shell || !map) return;

  const REF = { w: 1448, h: 1086 };
  const worldLayers = [...document.querySelectorAll("[data-scene-world]")];
  const objectLayers = [...document.querySelectorAll("[data-scene-object]")];
  const validGateStates = new Set(["normal", "unstable", "event"]);
  const params = new URLSearchParams(location.search);

  let raf = 0;
  let gateState = "normal";

  function setGateState(next = "normal") {
    const state = validGateStates.has(next) ? next : "normal";
    gateState = state;
    shell.dataset.gateState = state;
    return state;
  }

  function syncWorldLayers() {
    const width = map.style.width || `${map.naturalWidth || REF.w}px`;
    const height = map.style.height || `${map.naturalHeight || REF.h}px`;
    const transform = map.style.transform || "none";

    for (const layer of worldLayers) {
      layer.style.width = width;
      layer.style.height = height;
      layer.style.transform = transform;
    }
  }

  function syncObjectLayers() {
    const mapRect = map.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    if (!mapRect.width || !mapRect.height) return;

    const sx = mapRect.width / REF.w;
    const sy = mapRect.height / REF.h;
    const offsetX = mapRect.left - shellRect.left;
    const offsetY = mapRect.top - shellRect.top;

    for (const layer of objectLayers) {
      const x = Number(layer.dataset.worldX || 0);
      const y = Number(layer.dataset.worldY || 0);
      const w = Number(layer.dataset.worldW || 0);
      const h = Number(layer.dataset.worldH || 0);
      layer.style.left = `${offsetX + x * sx}px`;
      layer.style.top = `${offsetY + y * sy}px`;
      layer.style.width = `${w * sx}px`;
      layer.style.height = `${h * sy}px`;
    }
  }

  function syncScene() {
    syncWorldLayers();
    syncObjectLayers();
    raf = requestAnimationFrame(syncScene);
  }

  window.addEventListener("tarot-breaker:gate-state", (event) => {
    const requested =
      typeof event.detail === "string" ? event.detail : event.detail?.state;
    setGateState(requested || "normal");
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !raf) syncScene();
  });

  if (params.get("sceneDebug") === "1") shell.classList.add("scene-debug");
  setGateState(params.get("gateState") || "normal");
  syncScene();

  window.TarotSceneEffects = Object.freeze({
    setGateState,
    getGateState: () => gateState,
    referenceSize: Object.freeze({ ...REF }),
  });

  window.dispatchEvent(
    new CustomEvent("tarot-breaker:scene-ready", {
      detail: { gateState },
    }),
  );
})();
