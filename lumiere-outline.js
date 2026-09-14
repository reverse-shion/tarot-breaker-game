(() => {
  "use strict";

  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!proto || proto.__tarotLumiereOutlineV1) return;

  const originalDrawImage = proto.drawImage;
  const LUMIERE_COMPOSITE = { w: 493, h: 596 };
  const DISPLAY_HEIGHT_MIN = 70;
  const DISPLAY_HEIGHT_MAX = 90;
  const OUTLINE_COLOR = "rgba(53,46,96,.90)";
  const OUTLINE_BLUR = 1.05;

  function isFinalLumiereDraw(image, args) {
    if (!(image instanceof HTMLCanvasElement)) return false;
    if (
      image.width !== LUMIERE_COMPOSITE.w ||
      image.height !== LUMIERE_COMPOSITE.h ||
      args.length !== 8
    ) {
      return false;
    }

    const [sx, sy, sw, sh, , , dw, dh] = args;
    return (
      sx === 0 &&
      sy === 0 &&
      sw === LUMIERE_COMPOSITE.w &&
      sh === LUMIERE_COMPOSITE.h &&
      dw >= 50 &&
      dw <= 80 &&
      dh >= DISPLAY_HEIGHT_MIN &&
      dh <= DISPLAY_HEIGHT_MAX
    );
  }

  proto.drawImage = function patchedDrawImage(image, ...args) {
    if (!isFinalLumiereDraw(image, args)) {
      return originalDrawImage.call(this, image, ...args);
    }

    // Lumiere shares the world's outline language with Shion, but keeps a
    // softer navy-violet edge so the spirit-like, luminous impression remains.
    // One final draw only: no duplicated body, no black underpaint, no broad halo.
    this.save();
    this.imageSmoothingEnabled = false;
    this.shadowColor = OUTLINE_COLOR;
    this.shadowBlur = OUTLINE_BLUR;
    this.shadowOffsetX = 0;
    this.shadowOffsetY = 0;
    const result = originalDrawImage.call(this, image, ...args);
    this.restore();
    return result;
  };

  Object.defineProperty(proto, "__tarotLumiereOutlineV1", {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });

  window.TarotLumiereOutline = Object.freeze({
    version: "1.0.0",
    color: OUTLINE_COLOR,
    blur: OUTLINE_BLUR,
  });
})();
