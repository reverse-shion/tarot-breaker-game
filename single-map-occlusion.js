(function (root) {
  "use strict";

  const layout = root.TarotSceneLayout;
  if (!layout) return;

  const reference = layout.referenceSize || { width: 1448, height: 1086 };
  const map = document.getElementById("map-layer");
  const source = document.querySelector(".scene-foreground img");
  const groundLayer = document.querySelector(".scene-ground");
  const FOUNTAIN_SHIFT_Y = 50;
  const AUTHORITATIVE_MAP = "./assets/maps/star-country-gate-garden-transparent.webp?v=single-map-v3";
  const STAR_GATE_ASSET = "./assets/maps/star-country-gate-garden-star-gate.webp?v=single-map-gate-v3";

  let precisePolys = [];

  function shiftPoints(points, dx, dy) {
    return (points || []).map(([x, y]) => [x + dx, y + dy]);
  }

  function shiftShape(shape, dx, dy) {
    if (!shape) return shape;
    if (shape.type === "ellipse") {
      return { ...shape, cx: shape.cx + dx, cy: shape.cy + dy };
    }
    return { ...shape, points: shiftPoints(shape.points, dx, dy) };
  }

  // The transparent garden WebP is the one and only map artwork.
  if (source) {
    source.crossOrigin = "anonymous";
    source.src = AUTHORITATIVE_MAP;
  }
  if (map) {
    map.crossOrigin = "anonymous";
    map.src = AUTHORITATIVE_MAP;
  }
  if (groundLayer) groundLayer.hidden = true;

  // Move the complete fountain stack toward the camera, and keep its physical
  // footprint / front-rim occlusion aligned with the visible fountain.
  for (const selector of [
    ".scene-fountain-base",
    ".scene-fountain-water",
    ".scene-fountain-crystal",
    ".scene-fountain-glow",
    ".scene-fountain-sparkle",
  ]) {
    const node = document.querySelector(selector);
    if (!node || node.dataset.singleMapFountainShift === "1") continue;
    node.dataset.worldY = String(Number(node.dataset.worldY || 0) + FOUNTAIN_SHIFT_Y);
    node.dataset.singleMapFountainShift = "1";
  }

  if (!layout.singleMapFountainShiftApplied) {
    for (const area of layout.occluders || []) {
      if (area.source !== "fountain") continue;
      if (Array.isArray(area.bounds)) area.bounds[1] += FOUNTAIN_SHIFT_Y;
      area.baseline += FOUNTAIN_SHIFT_Y;
      area.footArea = shiftShape(area.footArea, 0, FOUNTAIN_SHIFT_Y);
      area.points = shiftPoints(area.points, 0, FOUNTAIN_SHIFT_Y);
    }
    for (const shape of layout.solidBases || []) {
      if (
        shape.type === "ellipse" &&
        Math.abs(shape.cx - 800) < 2 &&
        Math.abs(shape.cy - 533) < 2 &&
        shape.rx > 150
      ) {
        shape.cy += FOUNTAIN_SHIFT_Y;
      }
    }
    layout.singleMapFountainShiftApplied = true;
  }

  // Restore the actual Star Gate frame in normal play. The public preview used
  // to contain only the inner light node, so create the missing frame when needed.
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

  let starGate = document.querySelector(".scene-star-gate");
  if (!starGate) {
    starGate = document.createElement("div");
    starGate.className = "scene-object scene-back scene-star-gate";
    starGate.setAttribute("data-scene-object", "");
    starGate.setAttribute("aria-hidden", "true");
    const image = document.createElement("img");
    image.crossOrigin = "anonymous";
    image.alt = "";
    image.draggable = false;
    image.src = STAR_GATE_ASSET;
    image.style.cssText = "opacity:1;visibility:visible;filter:none;mix-blend-mode:normal;animation:none";
    starGate.appendChild(image);
    const anchor = document.querySelector(".scene-gate-particle") || document.getElementById("start-screen");
    anchor?.parentNode?.insertBefore(starGate, anchor);
  } else {
    const image = starGate.querySelector("img");
    if (image) image.src = STAR_GATE_ASSET;
  }
  starGate.style.opacity = "1";
  starGate.style.visibility = "visible";
  starGate.style.display = "block";
  placeObject(starGate, STAR_GATE_X, STAR_GATE_Y, STAR_GATE_W, STAR_GATE_H);

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
    version: "single-map-gate-v3",
  });

  layout.foregroundOffset = Object.freeze({ x: 0, y: 0 });
  layout.foregroundScale = 1;

  // Normal play and the editor now use the exact same behindForegroundAreas.
  // Never fall back to legacy rectangular occluders: that was the source of the
  // visible square/rectangular fragments while walking behind scenery.
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
      } catch (_) {
        // Try the other repository layout.
      }
    }
    console.warn("前景ポリゴンを読み込めませんでした。旧前景は描画しません。");
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
      mode: "single-map-depth-json-v3",
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
    background: Object.freeze({ mode: "single-map-authoritative-v3", x: 0, y: 0, w: reference.width, h: reference.height, scale: 1 }),
    foreground: Object.freeze({ mode: "single-map-depth-json-v3", x: 0, y: 0, w: reference.width, h: reference.height, scale: 1 }),
    gate: layout.gateAssembly,
  });
  layout.depthModelVersion = "single-map-depth-json-v3";
  layout.artworkModelVersion = "single-map-transparent-v3";
})(window);
