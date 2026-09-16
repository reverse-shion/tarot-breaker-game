(function (root) {
  "use strict";

  const layout = root.TarotSceneLayout;
  if (!layout) return;

  const reference = layout.referenceSize || { width: 1448, height: 1086 };
  const map = document.getElementById("map-layer");
  const source = document.querySelector(".scene-foreground img");
  const groundLayer = document.querySelector(".scene-ground");

  // Single-map mode is authoritative. The old map-layer used world-islands and
  // scene-effects repainted it into scene-background, so old artwork could show
  // through transparent pixels in the new garden image. Point the sizing/source
  // map at the exact same authored WebP used for occlusion and suppress the
  // duplicate full-map ground layer.
  if (map && source) {
    if (source.crossOrigin) map.crossOrigin = source.crossOrigin;
    map.src = source.currentSrc || source.src;
  }
  if (groundLayer) groundLayer.hidden = true;

  const authoredOccluders = () => (layout.occluders || []).filter((area) =>
    area &&
    area.source === "foreground" &&
    !area.depthFix &&
    Array.isArray(area.points) &&
    area.points.length >= 3
  );

  layout.foregroundOffset = Object.freeze({ x: 0, y: 0 });
  layout.foregroundScale = 1;

  // Visible garden background: exactly one draw of the authoritative image.
  // Sky/cloud layers remain behind it and only show through transparent pixels.
  layout.paintBackground = function paintBackgroundFromSingleMap(ctx, background) {
    const w = reference.width;
    const h = reference.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(background, 0, 0, w, h);
  };

  // Foreground/occlusion uses the exact same source pixels, clipped only to the
  // authored occlusion polygons. There is no second foreground artwork.
  layout.paintForeground = function paintForegroundFromSingleMap(ctx, foregroundSource) {
    const w = reference.width;
    const h = reference.height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);

    for (const area of authoredOccluders()) {
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
      mode: "single-map-occlusion-v2",
      occluderCount: authoredOccluders().length,
    });
  };

  layout.artworkPlacement = Object.freeze({
    ...(layout.artworkPlacement || {}),
    background: Object.freeze({
      mode: "single-map-authoritative",
      x: 0,
      y: 0,
      w: reference.width,
      h: reference.height,
      scale: 1,
    }),
    foreground: Object.freeze({
      mode: "single-map-occlusion-v2",
      x: 0,
      y: 0,
      w: reference.width,
      h: reference.height,
      scale: 1,
    }),
  });

  layout.depthModelVersion = "single-map-occlusion-v2";
  layout.artworkModelVersion = "single-map-transparent-v2";
})(window);
