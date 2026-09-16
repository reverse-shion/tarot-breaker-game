(function (root) {
  "use strict";
  const layout = root.TarotSceneLayout;
  if (!layout) return;

  // Gate presentation is isolated in its own stylesheet so collision, map,
  // fountain, cloud and character logic stay untouched.
  if (!document.querySelector('link[data-gate-polish="v1"]')) {
    const gatePolish = document.createElement("link");
    gatePolish.rel = "stylesheet";
    gatePolish.href = "./gate-polish.css?v=20260916-gate-polish-v1";
    gatePolish.dataset.gatePolish = "v1";
    document.head.appendChild(gatePolish);
  }

  const REFERENCE = layout.referenceSize;
  const FOREGROUND_SOURCE_SCALE = 0.81;
  const FOREGROUND_NUDGE_X = 4;

  // Keep the current authored map placement, but remove the legacy gate baked
  // into the map. The replacement gate is rendered by independent scene layers
  // below, so moving the gate now moves the visible artwork instead of only the
  // light overlay.
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

  // One source of truth for the complete gate assembly. Future gate position
  // changes must change only these offsets so base, inner light and event FX
  // remain aligned with each other.
  const GATE_OFFSET_X = 0;
  const GATE_OFFSET_Y = 0;
  const gateParts = [
    [".scene-gate-base", 521.5469613259668, -70, 560, 420],
    [".scene-gate-inner-light", 651, 10, 299, 224],
    [".scene-gate-particle", 590, -32, 420, 320],
    [".scene-gate-event", 560, -52, 480, 350],
  ];
  for (const [selector, x, y, width, height] of gateParts) {
    const node = document.querySelector(selector);
    if (!node) continue;
    node.dataset.worldX = String(x + GATE_OFFSET_X);
    node.dataset.worldY = String(y + GATE_OFFSET_Y);
    node.dataset.worldW = String(width);
    node.dataset.worldH = String(height);
  }
  const gateBase = document.querySelector(".scene-gate-base");
  if (gateBase) gateBase.hidden = false;
  layout.gateAssembly = Object.freeze({
    offsetX: GATE_OFFSET_X,
    offsetY: GATE_OFFSET_Y,
    baseline: (layout.gate?.baseline ?? 242) + GATE_OFFSET_Y,
    version: "gate-assembly-v1",
  });

  // The current foreground upload stores the authored 1448x1086 scene at
  // roughly 81% scale inside a wider source canvas. Restore that authored
  // scale, then nudge the complete foreground 4px to the right and draw once.
  layout.paintForeground = function paintForeground(ctx, foreground) {
    const w = REFERENCE.width;
    const h = REFERENCE.height;
    const sourceW = foreground.naturalWidth || w * FOREGROUND_SOURCE_SCALE;
    const sourceH = foreground.naturalHeight || h * FOREGROUND_SOURCE_SCALE;
    const drawW = sourceW / FOREGROUND_SOURCE_SCALE;
    const drawH = sourceH / FOREGROUND_SOURCE_SCALE;
    const dx = (layout.foregroundOffset?.x || 0) + FOREGROUND_NUDGE_X;
    const dy = layout.foregroundOffset?.y || 0;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(foreground, dx, dy, drawW, drawH);
  };

  const dx = (layout.foregroundOffset?.x || 0) + FOREGROUND_NUDGE_X;
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
    const solid = { type: "ellipse", cx: x + w / 2, cy: area.baseline - 4, rx: clamp(w * 0.24, 12, 20), ry: 10, depthFix: area.id };
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
    const bounds = [visualLeft, visualTop, Math.max(1, visualRight - visualLeft), Math.max(1, visualBottom - visualTop)];
    const footArea = layout.rect(rearLeft, rearTop, Math.max(1, rearRight - rearLeft), Math.max(1, rearBottom - rearTop));
    layout.occluders.push({ id: fullId, bounds, baseline: minY + dy + 10, footArea, source: "foreground", points: layout.rect(...bounds).points, rearInset: 6, depthFix: true });
  }

  layout.activeOccluders = function activeOccluders(foot, areas = layout.occluders) {
    if (!foot || !Number.isFinite(foot.x) || !Number.isFinite(foot.y)) return [];
    if (layout.solidBases.some((shape) => layout.contains(foot, shape))) return [];
    return areas.filter((area) => foot.y < area.baseline - (area.rearInset ?? 4) && layout.contains(foot, area.footArea));
  };

  layout.depthModelVersion = "preview-49";
  layout.artworkPlacement = Object.freeze({
    islands: Object.freeze({ mode: "contain", alignX: 0.5, alignY: 0 }),
    foreground: Object.freeze({ sourceScale: FOREGROUND_SOURCE_SCALE, x: dx, y: dy, repeat: false }),
  });
  layout.artworkModelVersion = "foreground-authored-alignment-right-4px";
})(window);
