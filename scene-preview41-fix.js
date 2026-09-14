(function (root) {
  "use strict";
  const layout = root.TarotSceneLayout;
  if (!layout) return;

  // Preview 41: use the gate already painted into the authored map as the
  // visible gate body. Preview 40 hid the standalone gate correctly, but the
  // older reconstruction code was still painting star sky over the authored
  // gate opening. Preserve both authored split plates instead of cutting the
  // legacy gate back out of them.
  layout.paintBackground = function paintBackground(ctx, background) {
    ctx.clearRect(0, 0, layout.referenceSize.width, layout.referenceSize.height);
    ctx.drawImage(background, 0, 0, layout.referenceSize.width, layout.referenceSize.height);
  };

  layout.paintForeground = function paintForeground(ctx, foreground) {
    ctx.clearRect(0, 0, layout.referenceSize.width, layout.referenceSize.height);
    ctx.drawImage(
      foreground,
      layout.foregroundOffset.x,
      layout.foregroundOffset.y,
      layout.referenceSize.width,
      layout.referenceSize.height
    );
  };

  // The user-uploaded transparent island plate lives on main at this immutable
  // commit. Pin it explicitly so the preview cannot keep showing the older
  // white-backed asset from this long-lived feature branch.
  const transparentIslands =
    "https://raw.githubusercontent.com/reverse-shion/tarot-breaker-game/2d8b4cec9b6dbb96f5dc0c4d8412f8a44acae59f/assets/maps/star-country-world-islands.webp";
  const mapLayer = document.getElementById("map-layer");
  if (mapLayer && mapLayer.src !== transparentIslands) mapLayer.src = transparentIslands;
})(window);
