(function (root) {
  "use strict";

  const layout = root.TarotSceneLayout;
  if (!layout) return;

  const reference = layout.referenceSize || { width: 1448, height: 1086 };
  const shell = document.getElementById("game-shell");
  const map = document.getElementById("map-layer");
  const source = document.querySelector(".scene-foreground img");
  const groundLayer = document.querySelector(".scene-ground");

  const AUTHORITATIVE_MAP = "./assets/maps/star-country-gate-garden-transparent.webp?v=single-map-v6";
  const ISLANDS_ASSET = "./assets/maps/star-country-world-islands.webp?asset=34856728cf2b";
  const CLOUDS_ASSET = "./assets/maps/star-country-world-clouds.webp?asset=eaea4c9513cf";
  const WATERFALL_ASSET = "./assets/maps/star-country-gate-garden-waterfall.webp?v=single-map-v6";
  const STAR_GATE_ASSET = "./assets/maps/star-country-gate-garden-star-gate.webp?v=single-map-gate-v6";
  const WATERFALL_OFFSET_X = 5;
  const WATERFALL_OFFSET_Y = 43;
  const FOUNTAIN_ANCHOR = Object.freeze({ x: 800, y: 510.5 });
  const FOUNTAIN_OFFSET_X = -11;
  const FOUNTAIN_OFFSET_Y = 12;
  const FOUNTAIN_SCALE = 1.16;

  let precisePolys = [];

  if (!document.querySelector('link[data-layer-order="v6"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./layer-order-fix.css?v=20260917-v6";
    link.dataset.layerOrder = "v6";
    document.head.appendChild(link);
  }

  if (Array.isArray(layout.solidBases)) layout.solidBases.splice(0);
  if (Array.isArray(layout.occluders)) layout.occluders.splice(0);
  layout.activeOccluders = () => [];

  const navigation = root.TarotNavigation;
  if (navigation && !navigation.__singleMapEmptyWalkReset) {
    const originalCreateCollision = navigation.createCollision;
    navigation.createCollision = function createCollisionWithReset(data) {
      const emptyWalk =
        data?.map === "star-country-gate-garden" &&
        Array.isArray(data.walkAreas) &&
        data.walkAreas.length === 0;
      if (!emptyWalk) return originalCreateCollision(data);

      const synthetic = {
        ...data,
        walkAreas: [{
          type: "poly",
          points: [
            [0, 0],
            [reference.width, 0],
            [reference.width, reference.height],
            [0, reference.height],
          ],
        }],
        blockedAreas: [],
      };
      const collision = originalCreateCollision(synthetic);
      return {
        ...collision,
        areas: [],
        blockedAreas: [],
        version: Number(data.version) || collision.version,
      };
    };
    navigation.__singleMapEmptyWalkReset = true;
  }

  if (source) {
    source.crossOrigin = "anonymous";
    source.src = AUTHORITATIVE_MAP;
  }
  if (map) {
    map.crossOrigin = "anonymous";
    map.src = AUTHORITATIVE_MAP;
  }
  if (groundLayer) groundLayer.hidden = true;

  document.querySelectorAll(".scene-cloud-copy").forEach((image) => {
    image.crossOrigin = "anonymous";
    image.src = CLOUDS_ASSET;
  });

  let islandsLayer = document.querySelector(".scene-islands");
  if (!islandsLayer && shell) {
    islandsLayer = document.createElement("div");
    islandsLayer.className = "scene-world-layer scene-back scene-islands";
    islandsLayer.setAttribute("data-scene-world", "");
    islandsLayer.setAttribute("aria-hidden", "true");
    const image = document.createElement("img");
    image.crossOrigin = "anonymous";
    image.alt = "";
    image.draggable = false;
    islandsLayer.appendChild(image);
    const waterfall = document.querySelector(".scene-waterfall");
    if (waterfall?.parentNode) waterfall.parentNode.insertBefore(islandsLayer, waterfall);
    else shell.appendChild(islandsLayer);
  }
  const islandsImage = islandsLayer?.querySelector("img");
  if (islandsImage) islandsImage.src = ISLANDS_ASSET;

  document.querySelectorAll(".scene-waterfall img").forEach((image) => {
    image.crossOrigin = "anonymous";
    image.src = WATERFALL_ASSET;
  });
  document.querySelectorAll(".scene-waterfall").forEach((layer) => {
    layer.style.left = `${WATERFALL_OFFSET_X}px`;
    layer.style.top = `${WATERFALL_OFFSET_Y}px`;
    layer.dataset.positionRevision = "waterfall-final-v8";
  });

  const STAIR_TOP_Y = layout.gate?.baseline ?? 242;
  const GATE_CENTER_X = layout.gate?.openingX ?? 800;
  const GATE_LIFT = 32;
  const STAR_GATE_W = 560;
  const STAR_GATE_H = STAR_GATE_W * (1024 / 1536);
  const STAR_GATE_X = GATE_CENTER_X - STAR_GATE_W / 2;
  const STAR_GATE_Y = STAIR_TOP_Y - STAR_GATE_H - GATE_LIFT;
  const INNER_LIGHT_W = 190;
  const INNER_LIGHT_H = INNER_LIGHT_W * (1535 / 1024);
  const INNER_LIGHT_X = GATE_CENTER_X - INNER_LIGHT_W / 2;
  const INNER_LIGHT_Y = STAIR_TOP_Y - INNER_LIGHT_H - GATE_LIFT;

  function placeObject(node, x, y, w, h) {
    if (!node) return;
    node.dataset.worldX = String(x);
    node.dataset.worldY = String(y);
    node.dataset.worldW = String(w);
    node.dataset.worldH = String(h);
  }

  function placeFountainPart(selector, x, y, w, h) {
    const scaledX = FOUNTAIN_ANCHOR.x + FOUNTAIN_OFFSET_X + (x - FOUNTAIN_ANCHOR.x) * FOUNTAIN_SCALE;
    const scaledY = FOUNTAIN_ANCHOR.y + FOUNTAIN_OFFSET_Y + (y - FOUNTAIN_ANCHOR.y) * FOUNTAIN_SCALE;
    placeObject(document.querySelector(selector), scaledX, scaledY, w * FOUNTAIN_SCALE, h * FOUNTAIN_SCALE);
  }

  // Final approved fountain placement from the visual editor.
  // Scale all five fountain layers around one shared anchor so their alignment is preserved.
  placeFountainPart(".scene-fountain-base", 625, 388, 350, 245);
  placeFountainPart(".scene-fountain-water", 650, 409, 300, 176);
  placeFountainPart(".scene-fountain-crystal", 708, 333, 184, 230);
  placeFountainPart(".scene-fountain-glow", 650, 318, 300, 250);
  placeFountainPart(".scene-fountain-sparkle", 640, 358, 320, 220);

  let starGate = document.querySelector(".scene-star-gate");
  if (!starGate && shell) {
    starGate = document.createElement("div");
    starGate.className = "scene-object scene-back scene-star-gate";
    starGate.setAttribute("data-scene-object", "");
    starGate.setAttribute("aria-hidden", "true");
    const image = document.createElement("img");
    image.crossOrigin = "anonymous";
    image.alt = "";
    image.draggable = false;
    image.style.cssText = "opacity:1;visibility:visible;filter:none;mix-blend-mode:normal;animation:none";
    starGate.appendChild(image);
    const anchor = document.querySelector(".scene-gate-particle") || document.querySelector(".scene-background") || document.getElementById("start-screen");
    anchor?.parentNode?.insertBefore(starGate, anchor);
  }
  const starGateImage = starGate?.querySelector("img");
  if (starGateImage) starGateImage.src = STAR_GATE_ASSET;
  if (starGate) {
    starGate.style.opacity = "1";
    starGate.style.visibility = "visible";
    starGate.style.display = "block";
    placeObject(starGate, STAR_GATE_X, STAR_GATE_Y, STAR_GATE_W, STAR_GATE_H);
  }

  const innerLight = document.querySelector(".scene-gate-inner-light");
  placeObject(innerLight, INNER_LIGHT_X, INNER_LIGHT_Y, INNER_LIGHT_W, INNER_LIGHT_H);
  placeObject(document.querySelector(".scene-gate-particle"), GATE_CENTER_X - 210, STAIR_TOP_Y - 320 - GATE_LIFT, 420, 320);
  placeObject(document.querySelector(".scene-gate-event"), GATE_CENTER_X - 240, STAIR_TOP_Y - 350 - GATE_LIFT, 480, 350);

  const gateBase = document.querySelector(".scene-gate-base");
  if (gateBase) gateBase.hidden = true;

  layout.gateAssembly = Object.freeze({
    centerX: GATE_CENTER_X,
    baseline: STAIR_TOP_Y,
    lift: GATE_LIFT,
    starGate: Object.freeze({ x: STAR_GATE_X, y: STAR_GATE_Y, w: STAR_GATE_W, h: STAR_GATE_H }),
    innerLight: Object.freeze({ x: INNER_LIGHT_X, y: INNER_LIGHT_Y, w: INNER_LIGHT_W, h: INNER_LIGHT_H }),
    version: "single-map-gate-v7",
  });

  layout.foregroundOffset = Object.freeze({ x: 0, y: 0 });
  layout.foregroundScale = 1;

  async function loadPrecisePolys() {
    const candidates = [
      "./assets/maps/star-country-gate-garden-depth.json",
      "./star-country-gate-garden-depth.json",
    ];
    for (const url of candidates) {
      try {
        const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}singleMap=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) continue;
        const data = await response.json();
        if (data?.map !== "star-country-gate-garden") continue;
        const areas = Array.isArray(data.behindForegroundAreas) ? data.behindForegroundAreas : [];
        precisePolys = areas.filter((area) =>
          area?.type === "poly" &&
          Array.isArray(area.points) &&
          area.points.length >= 3 &&
          area.points.every((point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite))
        );
        repaintForeground();
        return;
      } catch (_) {}
    }
    precisePolys = [];
    repaintForeground();
  }

  layout.paintBackground = function paintBackgroundFromSingleMap(ctx, background) {
    const w = reference.width;
    const h = reference.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(background, 0, 0, w, h);
  };

  layout.paintForeground = function paintForegroundFromSingleMap(ctx, foregroundSource) {
    const w = reference.width;
    const h = reference.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    for (const area of precisePolys) {
      ctx.save();
      layout.trace(ctx, area.points);
      ctx.clip();
      ctx.drawImage(foregroundSource, 0, 0, w, h);
      ctx.restore();
    }
    layout.latestForegroundPlacement = Object.freeze({
      sourceW: foregroundSource.naturalWidth || w,
      sourceH: foregroundSource.naturalHeight || h,
      drawX: 0,
      drawY: 0,
      drawW: w,
      drawH: h,
      scale: 1,
      mode: "single-map-layer-order-v8",
      occluderCount: precisePolys.length,
    });
  };

  function repaintForeground() {
    const canvas = document.querySelector(".scene-foreground canvas");
    if (!canvas || !source || !(source.complete && source.naturalWidth)) return;
    layout.paintForeground(canvas.getContext("2d"), source);
  }

  source?.addEventListener("load", repaintForeground);
  loadPrecisePolys();

  layout.artworkPlacement = Object.freeze({
    ...(layout.artworkPlacement || {}),
    islands: Object.freeze({ mode: "world-layer-latest", asset: "34856728cf2b", x: 0, y: 0, w: reference.width, h: reference.height }),
    clouds: Object.freeze({ mode: "three-copy-latest", asset: "eaea4c9513cf", x: 0, y: 0, w: reference.width, h: reference.height }),
    waterfall: Object.freeze({ mode: "world-layer-offset-final-v8", x: WATERFALL_OFFSET_X, y: WATERFALL_OFFSET_Y, w: reference.width, h: reference.height }),
    fountain: Object.freeze({ mode: "group-offset-scale-v8", x: FOUNTAIN_OFFSET_X, y: FOUNTAIN_OFFSET_Y, scale: FOUNTAIN_SCALE, anchor: FOUNTAIN_ANCHOR }),
    background: Object.freeze({ mode: "single-map-authoritative-v6", x: 0, y: 0, w: reference.width, h: reference.height, scale: 1 }),
    foreground: Object.freeze({ mode: "single-map-layer-order-v8", x: 0, y: 0, w: reference.width, h: reference.height, scale: 1 }),
    gate: layout.gateAssembly,
  });
  layout.depthModelVersion = "single-map-layer-order-v7";
  layout.artworkModelVersion = "single-map-transparent-v8";
})(window);