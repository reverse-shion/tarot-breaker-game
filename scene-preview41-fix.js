(function (root) {
  "use strict";
  const layout = root.TarotSceneLayout;
  if (!layout) return;

  // Preview 54 debug isolation: temporarily hide the legacy Gate Garden
  // ground/foreground plates so the newly uploaded world-islands artwork can
  // be checked by itself. This is intentionally temporary and does not delete
  // any assets.
  for (const selector of [".scene-ground", ".scene-foreground"]) {
    const layer = document.querySelector(selector);
    if (layer) layer.hidden = true;
  }

  // Use the current world-islands artwork exactly as supplied.
  layout.paintBackground = function paintBackground(ctx, background) {
    ctx.clearRect(0, 0, layout.referenceSize.width, layout.referenceSize.height);
    ctx.drawImage(background, 0, 0, layout.referenceSize.width, layout.referenceSize.height);
  };

  // Foreground is temporarily disabled. Keep its canvas transparent as well so
  // hidden legacy pixels cannot still mask actors through the depth compositor.
  layout.paintForeground = function paintForeground(ctx) {
    const w = layout.referenceSize.width;
    const h = layout.referenceSize.height;
    ctx.clearRect(0, 0, w, h);
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
  layout.artworkModelVersion = "preview-54-front-layers-hidden";
})(window);
