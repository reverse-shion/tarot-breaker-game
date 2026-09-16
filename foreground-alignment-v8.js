(function (root) {
  "use strict";

  const layout = root.TarotSceneLayout;
  if (!layout) return;

  // Preview 53 / foreground v8
  // The approved foreground is authored on the 1448x1086 reference canvas,
  // but its visual artwork is intentionally aligned 15 reference pixels left
  // of the zero-origin ground layer. Keep scale at 1.0 and move the visual,
  // occlusion and foreground-derived collision data together.
  const FOREGROUND_X = -15;
  const FOREGROUND_Y = 0;
  const REFERENCE = layout.referenceSize;

  const shiftPoints = (points, dx, dy) =>
    (points || []).map(([x, y]) => [x + dx, y + dy]);

  const shiftShape = (shape, dx, dy) => {
    if (!shape) return shape;
    if (shape.type === "ellipse") {
      return { ...shape, cx: shape.cx + dx, cy: shape.cy + dy };
    }
    return { ...shape, points: shiftPoints(shape.points, dx, dy) };
  };

  // scene-preview41-fix.js currently normalizes foreground helpers to x=0.
  // Restore the authored -15px alignment to every foreground-derived occluder.
  for (const area of layout.occluders || []) {
    if (area.source !== "foreground") continue;
    if (Array.isArray(area.bounds)) {
      area.bounds[0] += FOREGROUND_X;
      area.bounds[1] += FOREGROUND_Y;
    }
    area.baseline += FOREGROUND_Y;
    area.footArea = shiftShape(area.footArea, FOREGROUND_X, FOREGROUND_Y);
    area.points = shiftPoints(area.points, FOREGROUND_X, FOREGROUND_Y);
  }

  // Restore the four authored foreground physical footprints that the v6 fix
  // moved back to zero-origin, and shift any generated foreground depth solids.
  const zeroOriginForegroundCenters = new Set([
    "584,452",
    "1025,452",
    "242,438",
    "1238,528",
  ]);

  for (const shape of layout.solidBases || []) {
    if (shape.type !== "ellipse") continue;
    if (shape.depthFix || zeroOriginForegroundCenters.has(`${shape.cx},${shape.cy}`)) {
      shape.cx += FOREGROUND_X;
      shape.cy += FOREGROUND_Y;
    }
  }

  layout.foregroundOffset = Object.freeze({
    x: FOREGROUND_X,
    y: FOREGROUND_Y,
  });

  // Native-size render: no resize, no recentering, only the authored offset.
  layout.paintForeground = function paintForeground(ctx, foreground) {
    const w = REFERENCE.width;
    const h = REFERENCE.height;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(foreground, FOREGROUND_X, FOREGROUND_Y, w, h);

    layout.latestForegroundPlacement = Object.freeze({
      sourceW: foreground.naturalWidth || w,
      sourceH: foreground.naturalHeight || h,
      drawX: FOREGROUND_X,
      drawY: FOREGROUND_Y,
      drawW: w,
      drawH: h,
      scale: 1,
      mode: "native-reference-authored-offset",
    });
  };

  layout.artworkPlacement = Object.freeze({
    ...(layout.artworkPlacement || {}),
    foreground: Object.freeze({
      mode: "native-reference-authored-offset",
      x: FOREGROUND_X,
      y: FOREGROUND_Y,
      w: REFERENCE.width,
      h: REFERENCE.height,
      scale: 1,
    }),
  });

  layout.depthModelVersion = "preview-53-foreground-aligned";
  layout.artworkModelVersion = "foreground-alignment-v8";
})(window);
