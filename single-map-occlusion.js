(function (root) {
  "use strict";

  const layout = root.TarotSceneLayout;
  if (!layout) return;

  const reference = layout.referenceSize || { width: 1448, height: 1086 };

  // Single-map mode:
  // star-country-gate-garden-transparent.webp is the only garden artwork.
  // The foreground is never a second generated asset. It is rebuilt from the
  // exact same source pixels, clipped to authored occlusion regions only.
  const authoredOccluders = () => (layout.occluders || []).filter((area) =>
    area &&
    area.source === "foreground" &&
    !area.depthFix &&
    Array.isArray(area.points) &&
    area.points.length >= 3
  );

  layout.foregroundOffset = Object.freeze({ x: 0, y: 0 });
  layout.foregroundScale = 1;

  layout.paintForeground = function paintForegroundFromSingleMap(ctx, source) {
    const w = reference.width;
    const h = reference.height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);

    for (const area of authoredOccluders()) {
      ctx.save();
      layout.trace(ctx, area.points);
      ctx.clip();
      ctx.drawImage(source, 0, 0, w, h);
      ctx.restore();
    }

    layout.latestForegroundPlacement = Object.freeze({
      sourceW: source.naturalWidth || w,
      sourceH: source.naturalHeight || h,
      drawX: 0,
      drawY: 0,
      drawW: w,
      drawH: h,
      scale: 1,
      mode: "single-map-occlusion",
      occluderCount: authoredOccluders().length,
    });
  };

  layout.artworkPlacement = Object.freeze({
    ...(layout.artworkPlacement || {}),
    foreground: Object.freeze({
      mode: "single-map-occlusion",
      x: 0,
      y: 0,
      w: reference.width,
      h: reference.height,
      scale: 1,
    }),
  });

  layout.depthModelVersion = "single-map-occlusion-v1";
  layout.artworkModelVersion = "single-map-transparent-v1";
})(window);
