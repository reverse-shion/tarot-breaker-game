(function (root) {
  "use strict";
  const layout = root.TarotSceneLayout;
  if (!layout) return;

  const REFERENCE = layout.referenceSize;
  const FOREGROUND_SOURCE_SCALE = 0.81;

  // The replacement island plate is 1469x1071 instead of the scene's
  // 1448x1086 reference canvas. Fit the complete artwork by width so neither
  // edge is cut off, preserve its aspect ratio and leave any remaining pixels
  // transparent for the animated sky/cloud layers underneath.
  layout.paintBackground = function paintBackground(ctx, background) {
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
  };

  // The re-uploaded foreground contains the original scene artwork reduced to
  // about 81%, followed by additional right-edge canvas. Restore that authored
  // scale around the unchanged scene origin and clip once at the world edge.
  // Drawing a second copy or an edge patch would recreate the duplicate that
  // appeared in the previous preview, so this is deliberately one draw only.
  layout.paintForeground = function paintForeground(ctx, foreground) {
    const w = REFERENCE.width;
    const h = REFERENCE.height;
    const sourceW = foreground.naturalWidth || w * FOREGROUND_SOURCE_SCALE;
    const sourceH = foreground.naturalHeight || h * FOREGROUND_SOURCE_SCALE;
    const drawW = sourceW / FOREGROUND_SOURCE_SCALE;
    const drawH = sourceH / FOREGROUND_SOURCE_SCALE;
    const dx = layout.foregroundOffset?.x || 0;
    const dy = layout.foregroundOffset?.y || 0;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(foreground, dx, dy, drawW, drawH);
  };

  // Preview 49 depth/collision fix.
  // Keep collision data intact while the visual front layers are hidden.
  const dx = layout.foregroundOffset?.x || 0;
  const dy = layout.foregroundOffset?.y || 0;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function hasNearbySolid(shape) {
    if (shape.type !== "ellipse") return false;
    return layout.solidBases.some((item) =>
      item.type === "ellipse" &&
      Math.abs(item.cx - shape.cx) < 3 &&
      Math.abs(item.cy - shape.cy) < 3,
    );
  }

  for (const area of layout.occluders) {
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

  const existingIds = new Set(layout.occluders.map((area) => area.id));
  for (const [id, minX, minY, maxX, maxY] of depthZones) {
    const fullId = `depth-${id}`;
    if (existingIds.has(fullId)) continue;

    const visualLeft = Math.max(0, minX + dx - 18);
    const visualTop = Math.max(0, minY + dy - 190);
    const visualRight = Math.min(layout.referenceSize.width, maxX + dx + 18);
    const visualBottom = Math.min(layout.referenceSize.height, maxY + dy + 12);
    const rearTop = Math.max(0, minY + dy - 48);
    const rearBottom = Math.min(layout.referenceSize.height, minY + dy + 12);
    const rearLeft = Math.max(0, minX + dx - 12);
    const rearRight = Math.min(layout.referenceSize.width, maxX + dx + 12);

    const bounds = [
      visualLeft,
      visualTop,
      Math.max(1, visualRight - visualLeft),
      Math.max(1, visualBottom - visualTop),
    ];
    const footArea = layout.rect(
      rearLeft,
      rearTop,
      Math.max(1, rearRight - rearLeft),
      Math.max(1, rearBottom - rearTop),
    );

    layout.occluders.push({
      id: fullId,
      bounds,
      baseline: minY + dy + 10,
      footArea,
      source: "foreground",
      points: layout.rect(...bounds).points,
      rearInset: 6,
      depthFix: true,
    });
  }

  layout.activeOccluders = function activeOccluders(foot, areas = layout.occluders) {
    if (!foot || !Number.isFinite(foot.x) || !Number.isFinite(foot.y)) return [];
    if (layout.solidBases.some((shape) => layout.contains(foot, shape))) return [];
    return areas.filter((area) =>
      foot.y < area.baseline - (area.rearInset ?? 4) &&
      layout.contains(foot, area.footArea),
    );
  };

  layout.depthModelVersion = "preview-49";
  layout.artworkPlacement = Object.freeze({
    islands: Object.freeze({ mode: "contain", alignX: 0.5, alignY: 0 }),
    foreground: Object.freeze({
      sourceScale: FOREGROUND_SOURCE_SCALE,
      x: dx,
      y: dy,
      repeat: false,
    }),
  });
  layout.artworkModelVersion = "preview-55-latest-artwork-aligned";
})(window);
