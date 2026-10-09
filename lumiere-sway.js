(function (global) {
  "use strict";
  // Only free terminal curls/hem folds are admitted. Upper hair, face, body,
  // legs and wings are outside these source-coordinate regions.
  const regions = {
    down: [[160,790,150,220,"hair"],[940,790,160,220,"hair"],
      [350,1040,150,175,"hem"],[750,1040,150,175,"hem"]],
    up: [[175,790,145,190,"hair"],[950,790,145,190,"hair"],
      [350,1060,175,160,"hem"],[725,1060,175,160,"hem"]],
    left: [[958,720,110,166,"hair"],[877,1040,155,160,"hem"]],
    right: [[160,770,130,160,"hair"],[340,1060,105,165,"hem"],
      [735,1015,90,140,"hem"]],
  };
  for (const list of Object.values(regions)) {
    for (const region of list) Object.freeze(region);
    Object.freeze(list);
  }
  Object.freeze(regions);
  const DENSITY = 3; // >= maximum effective DPR 2 * camera zoom 1.22
  const STEPS = 32;
  const PERIOD = 5.2;
  const BODY_HEIGHT = 78 * 420 / 512;
  let enabled = true;

  function weight(u, v) {
    if (u <= 0 || u >= 1 || v <= 0 || v >= 1) return 0;
    return Math.sin(Math.PI * u) ** 2 * Math.sin(Math.PI * v) ** 2;
  }
  function motion(kind, phase) {
    if (!Number.isFinite(phase)) throw new Error("Invalid Lumiere sway phase");
    const lag = kind === "hair" ? 0.22 : 0.35;
    return Math.sin(phase - lag * Math.PI * 2 / PERIOD);
  }
  function surface(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Lumiere sway Canvas2D unavailable");
    return { canvas, ctx };
  }

  function create(image, pose) {
    const list = regions[pose?.actual_direction];
    if (!list || image.naturalWidth !== pose.width || image.naturalHeight !== pose.height ||
        pose.width !== 1254 || pose.height !== 1254 ||
        !(pose.baseline_y > pose.body_top)) throw new Error("Invalid Lumiere sway source");
    const poseScale = BODY_HEIGHT / (pose.baseline_y - pose.body_top);
    const width = Math.ceil(pose.width * poseScale * DENSITY);
    const height = width;
    if (!Number.isInteger(width) || width < 128 || width > 256)
      throw new Error("Lumiere sway cache exceeds calibrated capacity");
    const sourceScale = width / pose.width;
    const density = sourceScale / poseScale;
    const base = surface(width, height);
    base.ctx.imageSmoothingEnabled = true;
    base.ctx.imageSmoothingQuality = "high";
    base.ctx.drawImage(image, 0, 0, width, height);
    // One readback at readiness, never on the animation path. Same-origin
    // production sources and anonymous-CORS fixed preview sources are required.
    const original = base.ctx.getImageData(0, 0, width, height).data;
    const output = surface(width, height);
    const geometry = list.map(([sx,sy,sw,sh,kind]) => {
      const x = Math.floor(sx * sourceScale), y = Math.floor(sy * sourceScale);
      const w = Math.ceil((sx + sw) * sourceScale) - x;
      const h = Math.ceil((sy + sh) * sourceScale) - y;
      const amplitude = (kind === "hair" ? 0.4 : 0.25) * density;
      return { x,y,w,h,kind,amplitude };
    });
    // Pack all displacement samples into one atlas per direction. Hundreds of
    // tiny Canvas contexts would add unnecessary Safari backing-store overhead.
    const atlas = surface(Math.max(...geometry.map(t => t.w)) * (STEPS+1),
      geometry.reduce((n,t) => n+t.h,0));
    let atlasY = 0;
    const tiles = geometry.map(({x,y,w,h,kind,amplitude}) => {
      const sampleY = atlasY;
      atlasY += h;
      for (let step = 0; step <= STEPS; step++) {
        const amount = (step * 2 / STEPS - 1) * amplitude;
        const pixels = atlas.ctx.createImageData(w, h);
        for (let row = 0; row < h; row++) {
          for (let col = 0; col < w; col++) {
            // Invert the smooth local warp. Mapping is identity at every edge;
            // derivative stays positive at these bounded amplitudes.
            let sourceX = col;
            for (let iteration = 0; iteration < 6; iteration++)
              sourceX = col - amount * weight(sourceX / (w-1), row / (h-1));
            sourceX = Math.max(0, Math.min(w-1, sourceX));
            const a = Math.floor(sourceX), b = Math.min(w-1, a+1);
            const mix = sourceX - a;
            const i = ((y + row) * width + x + a) * 4;
            const j = ((y + row) * width + x + b) * 4;
            const target = (row * w + col) * 4;
            const alpha = original[i+3] * (1-mix) + original[j+3] * mix;
            pixels.data[target+3] = alpha;
            for (let channel = 0; channel < 3; channel++)
              pixels.data[target+channel] = alpha > 0 ?
                (original[i+channel] * original[i+3] * (1-mix) +
                 original[j+channel] * original[j+3] * mix) / alpha : 0;
          }
        }
        atlas.ctx.putImageData(pixels, step*w, sampleY);
      }
      return { x,y,w,h,kind,sampleY };
    });
    let previousPhase;
    let previousEnabled;
    function draw(phase) {
      if (phase === previousPhase && enabled === previousEnabled) return output.canvas;
      previousPhase = phase;
      previousEnabled = enabled;
      const ctx = output.ctx;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "copy";
      ctx.drawImage(base.canvas, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      if (!enabled) return output.canvas;
      for (const tile of tiles) {
        const position = (motion(tile.kind, phase) + 1) * STEPS / 2;
        const lower = Math.floor(position), upper = Math.min(STEPS, lower + 1);
        const blend = position - lower;
        // Preserve the one-pixel attachment/perimeter exactly, including its
        // original translucent alpha; blending identical border samples can
        // otherwise introduce an 8-bit rounding change at the join.
        ctx.clearRect(tile.x+1, tile.y+1, tile.w-2, tile.h-2);
        // Interpolate adjacent subpixel displacements, NOT distinct poses.
        // Sample spacing is <=0.025 reference px. Additive premultiplied RGBA
        // in an empty tile preserves opacity (source-over fades would not).
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 1 - blend;
        ctx.drawImage(atlas.canvas, lower*tile.w+1,tile.sampleY+1,tile.w-2,tile.h-2,
          tile.x+1,tile.y+1,tile.w-2,tile.h-2);
        if (blend > 0) {
          ctx.globalAlpha = blend;
          ctx.drawImage(atlas.canvas, upper*tile.w+1,tile.sampleY+1,tile.w-2,tile.h-2,
            tile.x+1,tile.y+1,tile.w-2,tile.h-2);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      return output.canvas;
    }
    return Object.freeze({ canvas: output.canvas, width, height, draw,
      regions: Object.freeze(tiles.map(({x,y,w,h,kind}) => Object.freeze({x,y,w,h,kind}))),
      cacheBytes: (width*height*2 + atlas.canvas.width*atlas.canvas.height)*4,
    });
  }
  global.TarotLumiereSway = Object.freeze({ create, weight, motion,
    getRegions: direction => regions[direction],
    setEnabled: value => { enabled = Boolean(value); },
    isEnabled: () => enabled,
    density: DENSITY, steps: STEPS,
  });
})(window);
