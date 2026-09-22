(function (root) {
  "use strict";
  const layout = root.TarotSceneLayout;
  if (!layout) return;

  if (!document.querySelector('link[data-gate-polish="v2"]')) {
    const gatePolish = document.createElement("link");
    gatePolish.rel = "stylesheet";
    gatePolish.href = "./gate-polish.css?v=20260916-gate-polish-v2";
    gatePolish.dataset.gatePolish = "v2";
    document.head.appendChild(gatePolish);
  }

  const REFERENCE = layout.referenceSize;
  const STAIR_TOP_Y = layout.gate?.baseline ?? 242;
  const GATE_CENTER_X = layout.gate?.openingX ?? 800;
  const GATE_LIFT = 32;

  // The approved foreground is authored at the same 1448x1086 reference size
  // as the game map. Draw it 1:1. Do not rescale or re-center it.
  const previousForegroundOffset = {
    x: layout.foregroundOffset?.x || 0,
    y: layout.foregroundOffset?.y || 0,
  };
  const correctionX = -previousForegroundOffset.x;
  const correctionY = -previousForegroundOffset.y;

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

  // scene-layout.js still defines the older -15px foreground offset. Move only
  // its foreground-derived depth/collision helpers back to the zero-origin.
  for (const area of layout.occluders || []) {
    if (area.source !== "foreground") continue;
    if (Array.isArray(area.bounds)) area.bounds[0] += correctionX;
    area.baseline += correctionY;
    area.footArea = shiftShape(area.footArea, correctionX, correctionY);
    area.points = shiftPoints(area.points, correctionX, correctionY);
  }

  const oldForegroundSolidCenters = new Set(["569,452", "1010,452", "227,438", "1223,528"]);
  for (const shape of layout.solidBases || []) {
    if (shape.type !== "ellipse") continue;
    if (oldForegroundSolidCenters.has(`${shape.cx},${shape.cy}`)) {
      shape.cx += correctionX;
      shape.cy += correctionY;
    }
  }

  layout.foregroundOffset = Object.freeze({ x: 0, y: 0 });
  layout.paintForeground = function paintForeground(ctx, foreground) {
    const w = REFERENCE.width;
    const h = REFERENCE.height;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(foreground, 0, 0, w, h);
    layout.latestForegroundPlacement = Object.freeze({
      sourceW: foreground.naturalWidth || w,
      sourceH: foreground.naturalHeight || h,
      drawX: 0,
      drawY: 0,
      drawW: w,
      drawH: h,
      mode: "native-reference-1to1",
    });
  };

  // Preserve the cleaned map/background pipeline underneath the transparent
  // foreground so transparent openings reveal the world rather than a cover.
  layout.paintBackground = function paintBackground(ctx, background, sky) {
    const w = REFERENCE.width;
    const h = REFERENCE.height;
    const sourceW = background.naturalWidth || w;
    const sourceH = background.naturalHeight || h;
    const scale = Math.min(w / sourceW, h / sourceH);
    const drawW = sourceW * scale;
    const drawH = sourceH * scale;
    const drawX = (w - drawW) / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(background, drawX, 0, drawW, drawH);

    if (!sky || !Array.isArray(layout.legacyGate) || !layout.legacyGate.length) return;
    const fill = ctx.createLinearGradient(0, 0, 0, 290);
    fill.addColorStop(0, "#263b76");
    fill.addColorStop(1, "#9b95ce");
    for (let band = 16; band >= 0; band -= 2) {
      const points = layout.legacyGate.map(([x, y]) => [
        800 + (x - 800) * (1 + band / 175),
        140 + (y - 140) * (1 + band / 175),
      ]);
      ctx.save();
      layout.trace(ctx, points);
      ctx.clip();
      ctx.globalAlpha = band === 0 ? 1 : 0.2;
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(sky, 0, 0, w, h);
      ctx.restore();
    }
  };

  // Gate and inner light share one centre axis and stay 32px above the older
  // stair-top placement.
  const STAR_GATE_W = 560;
  const STAR_GATE_H = STAR_GATE_W * (1024 / 1536);
  const STAR_GATE_X = GATE_CENTER_X - STAR_GATE_W / 2;
  const STAR_GATE_Y = STAIR_TOP_Y - STAR_GATE_H - GATE_LIFT;

  const INNER_LIGHT_W = 190;
  const INNER_LIGHT_H = INNER_LIGHT_W * (1535 / 1024) * 1.5; // 427.998px, height only
  const INNER_LIGHT_X = GATE_CENTER_X - INNER_LIGHT_W / 2;
  const INNER_LIGHT_Y = STAIR_TOP_Y - (INNER_LIGHT_W * (1535 / 1024)) - GATE_LIFT; // keep original Y fixed

  function placeObject(selector, x, y, width, height) {
    const node = document.querySelector(selector);
    if (!node) return;
    node.dataset.worldX = String(x);
    node.dataset.worldY = String(y);
    node.dataset.worldW = String(width);
    node.dataset.worldH = String(height);
  }

  placeObject(".scene-star-gate", STAR_GATE_X, STAR_GATE_Y, STAR_GATE_W, STAR_GATE_H);
  placeObject(".scene-gate-inner-light", INNER_LIGHT_X, INNER_LIGHT_Y, INNER_LIGHT_W, INNER_LIGHT_H);
  placeObject(".scene-gate-particle", GATE_CENTER_X - 210, STAIR_TOP_Y - 320 - GATE_LIFT, 420, 320);
  placeObject(".scene-gate-event", GATE_CENTER_X - 240, STAIR_TOP_Y - 350 - GATE_LIFT, 480, 350);

  const gateBase = document.querySelector(".scene-gate-base");
  if (gateBase) gateBase.hidden = true;

  layout.gateAssembly = Object.freeze({
    centerX: GATE_CENTER_X,
    baseline: STAIR_TOP_Y,
    lift: GATE_LIFT,
    starGate: Object.freeze({ x: STAR_GATE_X, y: STAR_GATE_Y, w: STAR_GATE_W, h: STAR_GATE_H }),
    innerLight: Object.freeze({ x: INNER_LIGHT_X, y: INNER_LIGHT_Y, w: INNER_LIGHT_W, h: INNER_LIGHT_H }),
    version: "native-foreground-v6",
  });

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function hasNearbySolid(shape) {
    if (shape.type !== "ellipse") return false;
    return (layout.solidBases || []).some((item) =>
      item.type === "ellipse" &&
      Math.abs(item.cx - shape.cx) < 3 &&
      Math.abs(item.cy - shape.cy) < 3,
    );
  }

  for (const area of layout.occluders || []) {
    if (!/(post|pillar)$/.test(area.id)) continue;
    const [x, , w] = area.bounds;
    const solid = {
      type: "ellipse",
      cx: x + w / 2,
      cy: area.baseline - 4,
      rx: clamp(w * 0.24, 12, 20),
      ry: 10,
      depthFix: area.id,
    };
    if (!hasNearbySolid(solid)) layout.solidBases.push(solid);
  }

  const depthZones = [
    ["east-upper-structure", 867, 217, 1215, 470],
    ["east-mid-structure", 873, 508, 1214, 697],
    ["west-upper-structure", 502, 401, 727, 460],
    ["west-mid-structure", 471, 461, 729, 698],
    ["west-gate-side", 568, 388, 614, 461],
    ["west-gate-approach", 605, 214, 775, 451],
    ["east-gate-approach", 866, 211, 932, 412],
    ["east-gate-side", 988, 367, 1082, 461],
  ];
  const existingIds = new Set((layout.occluders || []).map((area) => area.id));
  for (const [id, minX, minY, maxX, maxY] of depthZones) {
    const fullId = `depth-${id}`;
    if (existingIds.has(fullId)) continue;
    const visualLeft = Math.max(0, minX - 18);
    const visualTop = Math.max(0, minY - 190);
    const visualRight = Math.min(REFERENCE.width, maxX + 18);
    const visualBottom = Math.min(REFERENCE.height, maxY + 12);
    const rearTop = Math.max(0, minY - 48);
    const rearBottom = Math.min(REFERENCE.height, minY + 12);
    const rearLeft = Math.max(0, minX - 12);
    const rearRight = Math.min(REFERENCE.width, maxX + 12);
    const bounds = [visualLeft, visualTop, visualRight - visualLeft, visualBottom - visualTop];
    const footArea = layout.rect(rearLeft, rearTop, rearRight - rearLeft, rearBottom - rearTop);
    layout.occluders.push({
      id: fullId,
      bounds,
      baseline: minY + 10,
      footArea,
      source: "foreground",
      points: layout.rect(...bounds).points,
      rearInset: 6,
      depthFix: true,
    });
  }

  layout.activeOccluders = function activeOccluders(foot, areas = layout.occluders) {
    if (!foot || !Number.isFinite(foot.x) || !Number.isFinite(foot.y)) return [];
    if ((layout.solidBases || []).some((shape) => layout.contains(foot, shape))) return [];
    return areas.filter((area) =>
      foot.y < area.baseline - (area.rearInset ?? 4) && layout.contains(foot, area.footArea),
    );
  };

  layout.depthModelVersion = "preview-52-native-foreground";
  layout.artworkPlacement = Object.freeze({
    islands: Object.freeze({ mode: "contain", alignX: 0.5, alignY: 0 }),
    foreground: Object.freeze({ mode: "native-reference-1to1", x: 0, y: 0, w: REFERENCE.width, h: REFERENCE.height }),
    gate: layout.gateAssembly,
  });
  layout.artworkModelVersion = "native-foreground-v6";
})(window);
