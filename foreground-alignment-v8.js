(function (root) {
  "use strict";

  const layout = root.TarotSceneLayout;
  if (!layout) return;

  // Approved foreground transform from on-device calibration.
  // Keep the source WebP unchanged; transform visual, occlusion and collision
  // geometry together in the 1448x1086 reference coordinate system.
  const FOREGROUND_X = -47;
  const FOREGROUND_Y = -220;
  const FOREGROUND_SCALE = 1.43;
  const REFERENCE = layout.referenceSize;

  const transformPoint = ([x, y]) => [
    FOREGROUND_X + x * FOREGROUND_SCALE,
    FOREGROUND_Y + y * FOREGROUND_SCALE,
  ];

  const transformPoints = (points) => (points || []).map(transformPoint);

  const transformShape = (shape) => {
    if (!shape) return shape;
    if (shape.type === "ellipse") {
      return {
        ...shape,
        cx: FOREGROUND_X + shape.cx * FOREGROUND_SCALE,
        cy: FOREGROUND_Y + shape.cy * FOREGROUND_SCALE,
        rx: shape.rx * FOREGROUND_SCALE,
        ry: shape.ry * FOREGROUND_SCALE,
      };
    }
    return { ...shape, points: transformPoints(shape.points) };
  };

  // scene-preview41-fix.js has already normalised foreground-derived helpers
  // to the zero-origin. Apply the approved affine transform once here.
  for (const area of layout.occluders || []) {
    if (area.source !== "foreground") continue;

    if (Array.isArray(area.bounds)) {
      const [x, y, w, h] = area.bounds;
      area.bounds[0] = FOREGROUND_X + x * FOREGROUND_SCALE;
      area.bounds[1] = FOREGROUND_Y + y * FOREGROUND_SCALE;
      area.bounds[2] = w * FOREGROUND_SCALE;
      area.bounds[3] = h * FOREGROUND_SCALE;
    }

    area.baseline = FOREGROUND_Y + area.baseline * FOREGROUND_SCALE;
    area.footArea = transformShape(area.footArea);
    area.points = transformPoints(area.points);
    if (Number.isFinite(area.rearInset)) area.rearInset *= FOREGROUND_SCALE;
  }

  // Only the four authored foreground footprints and generated depth-fix
  // footprints belong to this image. Fountain/gate solids remain unchanged.
  const zeroOriginForegroundCenters = new Set([
    "584,452",
    "1025,452",
    "242,438",
    "1238,528",
  ]);

  for (const shape of layout.solidBases || []) {
    if (shape.type !== "ellipse") continue;
    if (!(shape.depthFix || zeroOriginForegroundCenters.has(`${shape.cx},${shape.cy}`))) continue;

    shape.cx = FOREGROUND_X + shape.cx * FOREGROUND_SCALE;
    shape.cy = FOREGROUND_Y + shape.cy * FOREGROUND_SCALE;
    shape.rx *= FOREGROUND_SCALE;
    shape.ry *= FOREGROUND_SCALE;
  }

  layout.foregroundOffset = Object.freeze({ x: FOREGROUND_X, y: FOREGROUND_Y });
  layout.foregroundScale = FOREGROUND_SCALE;

  layout.paintForeground = function paintForeground(ctx, foreground) {
    const w = REFERENCE.width;
    const h = REFERENCE.height;
    const drawW = w * FOREGROUND_SCALE;
    const drawH = h * FOREGROUND_SCALE;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(foreground, FOREGROUND_X, FOREGROUND_Y, drawW, drawH);

    layout.latestForegroundPlacement = Object.freeze({
      sourceW: foreground.naturalWidth || w,
      sourceH: foreground.naturalHeight || h,
      drawX: FOREGROUND_X,
      drawY: FOREGROUND_Y,
      drawW,
      drawH,
      scale: FOREGROUND_SCALE,
      mode: "approved-fixed-transform-v11",
    });
  };

  layout.artworkPlacement = Object.freeze({
    ...(layout.artworkPlacement || {}),
    foreground: Object.freeze({
      mode: "approved-fixed-transform-v11",
      x: FOREGROUND_X,
      y: FOREGROUND_Y,
      w: REFERENCE.width * FOREGROUND_SCALE,
      h: REFERENCE.height * FOREGROUND_SCALE,
      scale: FOREGROUND_SCALE,
    }),
  });

  layout.depthModelVersion = "preview-54-foreground-fixed";
  layout.artworkModelVersion = "foreground-fixed-v11";

  // Optional on-device calibration mode remains available for later fine tuning.
  if (new URLSearchParams(location.search).get("fgAlign") === "1") {
    setTimeout(() => {
      if (document.querySelector('script[data-fg-calibrator="v10"]')) return;
      const script = document.createElement("script");
      script.src = "./foreground-calibrator-v10.js?v=20260916-v11";
      script.dataset.fgCalibrator = "v10";
      document.head.appendChild(script);
    }, 0);
  }
})(window);
