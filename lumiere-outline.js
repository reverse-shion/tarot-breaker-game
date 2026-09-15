(() => {
  "use strict";

  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!proto || proto.__tarotLumiereOutlineV2) return;

  const nativeDrawImage = proto.drawImage;
  const LUMIERE_COMPOSITE = { w: 493, h: 596 };
  const FRAME_COUNT = 4;
  const OUTLINE_COLOR = "rgba(53,46,96,.90)";
  const OUTLINE_BLUR = 1.05;
  const compositeFrames = new WeakMap();
  const near = (value, expected) => Math.abs(Number(value) - expected) < 0.01;

  function lumiereDirection(image) {
    const src = String(image?.currentSrc || image?.src || "");
    const match = src.match(/lumiere_hover_(down|up|left|right)\.png(?:\?|$)/);
    return match?.[1] || null;
  }

  function rememberDirectionalFrame(ctx, image, args) {
    const direction = lumiereDirection(image);
    if (!direction || direction === "down" || args.length !== 8) return;

    const [sx, sy, sw, sh, dx, dy, dw, dh] = args;
    if (
      !near(dx, 0) ||
      !near(dy, 0) ||
      !near(dw, LUMIERE_COMPOSITE.w) ||
      !near(dh, LUMIERE_COMPOSITE.h) ||
      sw < 450 ||
      sh < 520
    ) {
      return;
    }

    const surface = ctx.canvas;
    if (!(surface instanceof HTMLCanvasElement)) return;
    if (
      surface.width !== LUMIERE_COMPOSITE.w ||
      surface.height !== LUMIERE_COMPOSITE.h
    ) {
      return;
    }

    const frameW = image.naturalWidth / FRAME_COUNT;
    const frameH = image.naturalHeight;
    if (!Number.isFinite(frameW) || !Number.isFinite(frameH) || frameW <= 0 || frameH <= 0)
      return;

    const frame = Math.max(0, Math.min(FRAME_COUNT - 1, Math.floor(sx / frameW)));
    compositeFrames.set(surface, {
      image,
      direction,
      frame,
      frameW,
      frameH,
      cropX: sx - frame * frameW,
      cropY: sy,
      cropW: sw,
      cropH: sh,
    });
  }

  function isCompositeDraw(image, args) {
    return (
      image instanceof HTMLCanvasElement &&
      image.width === LUMIERE_COMPOSITE.w &&
      image.height === LUMIERE_COMPOSITE.h &&
      args.length === 8 &&
      near(args[0], 0) &&
      near(args[1], 0) &&
      near(args[2], LUMIERE_COMPOSITE.w) &&
      near(args[3], LUMIERE_COMPOSITE.h)
    );
  }

  function drawWithLumiereEdge(ctx, draw) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.shadowColor = OUTLINE_COLOR;
    ctx.shadowBlur = OUTLINE_BLUR;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    const result = draw();
    ctx.restore();
    return result;
  }

  proto.drawImage = function patchedDrawImage(image, ...args) {
    // Capture the real source frame while game.js is building its temporary
    // 493x596 Lumiere canvas. The old crop rectangles were measured from the
    // down-facing sheet and can shave pixels from the top of up/left/right.
    rememberDirectionalFrame(this, image, args);

    if (!isCompositeDraw(image, args)) {
      return nativeDrawImage.call(this, image, ...args);
    }

    const meta = compositeFrames.get(image);
    if (meta && meta.direction !== "down") {
      const [, , , , dx, dy, dw, dh] = args;
      const scaleX = dw / meta.cropW;
      const scaleY = dh / meta.cropH;

      // Draw the complete original cell instead of the cropped temporary
      // canvas. Position it so the previously visible crop lands in exactly
      // the same place. This reveals the transparent safety margin above the
      // head and prevents the top edge from being cut at the highest bob point.
      const fullDx = dx - meta.cropX * scaleX;
      const fullDy = dy - meta.cropY * scaleY;
      const fullDw = meta.frameW * scaleX;
      const fullDh = meta.frameH * scaleY;
      const sourceX = meta.frame * meta.frameW;

      return drawWithLumiereEdge(this, () =>
        nativeDrawImage.call(
          this,
          meta.image,
          sourceX,
          0,
          meta.frameW,
          meta.frameH,
          fullDx,
          fullDy,
          fullDw,
          fullDh,
        ),
      );
    }

    // Down-facing keeps the established normalized composite. It has its own
    // calibrated body correction and does not show the clipped-head symptom.
    return drawWithLumiereEdge(this, () =>
      nativeDrawImage.call(this, image, ...args),
    );
  };

  Object.defineProperty(proto, "__tarotLumiereOutlineV2", {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });

  window.TarotLumiereOutline = Object.freeze({
    version: "2.0.0",
    color: OUTLINE_COLOR,
    blur: OUTLINE_BLUR,
    fullDirectionalFrame: true,
  });
})();
