(function (root) {
  "use strict";
  const layout = root.TarotSceneLayout;
  if (!layout) return;

  // Preview 41+: use the gate already painted into the authored map as the
  // visible gate body. Keep the standalone high-detail gate mask-only.
  layout.paintBackground = function paintBackground(ctx, background) {
    ctx.clearRect(0, 0, layout.referenceSize.width, layout.referenceSize.height);
    ctx.drawImage(background, 0, 0, layout.referenceSize.width, layout.referenceSize.height);
  };

  // Preview 45: the global -15px foreground alignment is still required around
  // the centre route, but drawing a 1448px plate at x=-15 leaves an uncovered
  // 15px strip at the far right. That exposed the unshifted lower plate and
  // looked like a second map was pasted on the edge. Keep the corrected centre
  // alignment, then crossfade only the far-right edge back to the authored
  // foreground position so the world boundary closes without a hard seam.
  layout.paintForeground = function paintForeground(ctx, foreground) {
    const w = layout.referenceSize.width;
    const h = layout.referenceSize.height;
    const dx = layout.foregroundOffset.x;
    const dy = layout.foregroundOffset.y;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(foreground, dx, dy, w, h);

    const gap = Math.max(0, -dx);
    if (!gap) return;

    const blendWidth = Math.max(84, gap * 6);
    const edge = document.createElement("canvas");
    edge.width = w;
    edge.height = h;
    const paint = edge.getContext("2d");

    paint.save();
    paint.beginPath();
    paint.rect(w - blendWidth, 0, blendWidth, h);
    paint.clip();
    paint.drawImage(foreground, 0, dy, w, h);
    paint.globalCompositeOperation = "destination-in";
    const fade = paint.createLinearGradient(w - blendWidth, 0, w, 0);
    fade.addColorStop(0, "rgba(0,0,0,0)");
    fade.addColorStop(0.72, "rgba(0,0,0,0.55)");
    fade.addColorStop(1, "rgba(0,0,0,1)");
    paint.fillStyle = fade;
    paint.fillRect(w - blendWidth, 0, blendWidth, h);
    paint.restore();

    ctx.drawImage(edge, 0, 0);
  };

  // Pin the latest user-uploaded transparent island plate instead of the older
  // white-backed copy that Preview 40 referenced through its feature commit.
  const transparentIslands =
    "https://raw.githubusercontent.com/reverse-shion/tarot-breaker-game/2d8b4cec9b6dbb96f5dc0c4d8412f8a44acae59f/assets/maps/star-country-world-islands.webp";
  const mapLayer = document.getElementById("map-layer");
  if (mapLayer && mapLayer.src !== transparentIslands) mapLayer.src = transparentIslands;
})(window);
