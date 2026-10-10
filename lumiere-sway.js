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
  const AMPLITUDE = Object.freeze({ hair: 2.2, hem: 1.35 });
  const FOLLOW_LAG = Object.freeze({ hair: 0.34, hem: 0.58 });
  const diagnostics = Object.create(null);

  function smooth01(value) {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
  }
  function weight(u, v) {
    if (u <= 0 || u >= 1 || v <= 0 || v >= 1) return 0;
    // The old central sine mask barely moved recognizable hair/hem tips.
    // Anchor the upper/root section, then let the terminal part follow while
    // fading to zero at the tile's one-pixel safety perimeter.
    return smooth01(u / 0.18) * smooth01((1-u) / 0.18) *
      smooth01(v / 0.43) * smooth01((1-v) / 0.10);
  }
  function motion(kind, phase) {
    if (!Number.isFinite(phase)) throw new Error("Invalid Lumiere sway phase");
    const lag = FOLLOW_LAG[kind];
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
      // Measured in reference pixels, before the fixed 3x local cache.
      // Increased enough to read at character scale, not enough to shift
      // the attachment or any protected body/wing pixel.
      const amplitude = AMPLITUDE[kind] * density;
      const verticalRatio = kind === "hair" ? -0.13 : 0.12;
      return { x,y,w,h,kind,amplitude,verticalRatio };
    });
    // Pack all displacement samples into one atlas per direction. Hundreds of
    // tiny Canvas contexts would add unnecessary Safari backing-store overhead.
    const atlas = surface(Math.max(...geometry.map(t => t.w)) * (STEPS+1),
      geometry.reduce((n,t) => n+t.h,0));
    let atlasY = 0;
    const tiles = geometry.map(({x,y,w,h,kind,amplitude,verticalRatio}) => {
      let foreground = 0;
      let changed = 0;
      let silhouette = 0;
      const sampleY = atlasY;
      atlasY += h;
      for (let step = 0; step <= STEPS; step++) {
        const amount = (step * 2 / STEPS - 1) * amplitude;
        const pixels = atlas.ctx.createImageData(w, h);
        for (let row = 0; row < h; row++) {
          for (let col = 0; col < w; col++) {
            // Inverse 2D deformation. The tiny vertical follow-through
            // shares the tile's delayed phase; no extra animation clock or
            // per-frame resampling is introduced. Borders remain identity.
            let sourceX = col, sourceY = row;
            for (let iteration = 0; iteration < 8; iteration++) {
              const influence = weight(sourceX / (w-1), sourceY / (h-1));
              sourceX = col - amount * influence;
              sourceY = row - amount * verticalRatio * influence;
            }
            sourceX = Math.max(0, Math.min(w-1, sourceX));
            sourceY = Math.max(0, Math.min(h-1, sourceY));
            const x0 = Math.floor(sourceX), x1 = Math.min(w-1, x0+1);
            const y0 = Math.floor(sourceY), y1 = Math.min(h-1, y0+1);
            const fx = sourceX - x0, fy = sourceY - y0;
            // Four bilinear neighbors with no per-pixel temporary arrays.
            const i00 = ((y+y0)*width+x+x0)*4;
            const i10 = ((y+y0)*width+x+x1)*4;
            const i01 = ((y+y1)*width+x+x0)*4;
            const i11 = ((y+y1)*width+x+x1)*4;
            const a00 = original[i00+3]*(1-fx)*(1-fy);
            const a10 = original[i10+3]*fx*(1-fy);
            const a01 = original[i01+3]*(1-fx)*fy;
            const a11 = original[i11+3]*fx*fy;
            const alpha = a00+a10+a01+a11;
            const target = (row*w+col)*4;
            pixels.data[target+3] = alpha;
            if (step === STEPS) {
              const reference = ((y+row)*width+x+col)*4;
              if (original[reference+3] > 32) foreground++;
              const alphaDelta = Math.abs(alpha-original[reference+3]);
              if (alphaDelta > 12) silhouette++;
              if (alphaDelta > 12 ||
                  Math.abs((alpha > 0 ? 
                    (original[i00]*a00 + original[i10]*a10 +
                     original[i01]*a01 + original[i11]*a11) / alpha : 0) -
                    original[reference]) > 10) changed++;
            }
            if (alpha > 0) {
              for (let channel=0; channel<3; channel++)
                pixels.data[target+channel] =
                  (original[i00+channel]*a00 + original[i10+channel]*a10 +
                   original[i01+channel]*a01 + original[i11+channel]*a11) / alpha;
            }
          }
        }
        atlas.ctx.putImageData(pixels, step*w, sampleY);
      }
      return { x,y,w,h,kind,sampleY,foreground,changed,silhouette };
    });
    diagnostics[pose.actual_direction] = Object.freeze({
      direction: pose.actual_direction,
      foreground: tiles.reduce((sum,t) => sum + t.foreground, 0),
      changed: tiles.reduce((sum,t) => sum + t.changed, 0),
      silhouette: tiles.reduce((sum,t) => sum + t.silhouette, 0),
      regions: Object.freeze(tiles.map(t => Object.freeze({
        kind: t.kind, foreground: t.foreground,
        changed: t.changed, silhouette: t.silhouette,
      }))),
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
        // Adjacent precomputed samples are smoothly interpolated each frame. Additive premultiplied RGBA
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
    getDiagnostics: direction => diagnostics[direction] || null,
    config: Object.freeze({ amplitude: AMPLITUDE, lag: FOLLOW_LAG,
      bobPeriod: PERIOD, candidate: "C" }),
    setEnabled: value => { enabled = Boolean(value); },
    isEnabled: () => enabled,
    density: DENSITY, steps: STEPS,
  });
})(window);
