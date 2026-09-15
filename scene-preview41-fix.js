(function (root) {
  "use strict";
  const layout = root.TarotSceneLayout;
  if (!layout) return;

  const REFERENCE = layout.referenceSize;
  const FOREGROUND_SOURCE_SCALE = 0.81;
  const STAR_GATE_ASSETS = Object.freeze({
    normal: "./assets/maps/star-country-gate-garden-star-gate-inner-light.webp",
    event: "./assets/maps/star-country-gate-garden-star-gate-event-fx.webp",
    aura: "./assets/maps/star-country-gate-garden-star-gate-particle.webp",
  });

  // The gate effect files are authored in the same 1448x1086 reference space as
  // the map. They must remain full-canvas overlays. Scaling them into small
  // object rectangles changes both the gate size and its optical centre.
  const GATE_MASK_CENTER = Object.freeze({ x: 800, y: 140 });
  const GATE_MASK_EXPANSION = 1.055;

  function expandedLegacyGate(dx = 0, dy = 0) {
    return layout.legacyGate.map(([x, y]) => [
      GATE_MASK_CENTER.x + (x - GATE_MASK_CENTER.x) * GATE_MASK_EXPANSION + dx,
      GATE_MASK_CENTER.y + (y - GATE_MASK_CENTER.y) * GATE_MASK_EXPANSION + dy,
    ]);
  }

  function erasePaintedGate(ctx, dx = 0, dy = 0) {
    if (!ctx?.save || !ctx?.restore || !ctx?.beginPath || !ctx?.fill) return;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    layout.trace(ctx, expandedLegacyGate(dx, dy));
    ctx.fill();
    ctx.restore();
  }

  // The replacement island plate is 1469x1071 instead of the scene's
  // 1448x1086 reference canvas. Fit the complete artwork by width so neither
  // edge is cut off, preserve its aspect ratio and leave any remaining pixels
  // transparent for the animated sky/cloud layers underneath. Remove only the
  // baked Star Gate so the independent gate layer can occupy the exact same
  // reference-space position without double exposure.
  layout.paintBackground = function paintBackground(ctx, background) {
    const w = REFERENCE.width;
    const h = REFERENCE.height;
    const sourceW = background.naturalWidth || w;
    const sourceH = background.naturalHeight || h;
    const scale = Math.min(w / sourceW, h / sourceH);
    const drawW = sourceW * scale;
    const drawH = sourceH * scale;
    const drawX = (w - drawW) / 2;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(background, drawX, 0, drawW, drawH);
    erasePaintedGate(ctx);
  };

  // The re-uploaded foreground contains the original scene artwork reduced to
  // about 81%, followed by additional right-edge canvas. Restore that authored
  // scale around the unchanged scene origin and clip once at the world edge.
  // Drawing a second copy or an edge patch would recreate the duplicate that
  // appeared in the previous preview, so this is deliberately one draw only.
  // The old gate cutout follows this layer's existing horizontal correction.
  layout.paintForeground = function paintForeground(ctx, foreground) {
    const w = REFERENCE.width;
    const h = REFERENCE.height;
    const sourceW = foreground.naturalWidth || w * FOREGROUND_SOURCE_SCALE;
    const sourceH = foreground.naturalHeight || h * FOREGROUND_SOURCE_SCALE;
    const drawW = sourceW / FOREGROUND_SOURCE_SCALE;
    const drawH = sourceH / FOREGROUND_SOURCE_SCALE;
    const dx = layout.foregroundOffset?.x || 0;
    const dy = layout.foregroundOffset?.y || 0;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(foreground, dx, dy, drawW, drawH);
    erasePaintedGate(ctx, dx, dy);
  };

  // Preview 49 depth/collision fix.
  // Keep collision data intact while the visual front layers are hidden.
  const dx = layout.foregroundOffset?.x || 0;
  const dy = layout.foregroundOffset?.y || 0;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function hasNearbySolid(shape) {
    if (shape.type !== "ellipse") return false;
    return layout.solidBases.some((item) =>
      item.type === "ellipse" &&
      Math.abs(item.cx - shape.cx) < 3 &&
      Math.abs(item.cy - shape.cy) < 3,
    );
  }

  for (const area of layout.occluders) {
    if (!/(post|pillar)$/.test(area.id)) continue;
    const [x, , w] = area.bounds;
    const solid = {
      type: "ellipse",
      cx: x + w / 2,
      cy: area.baseline - 4,
      rx: clamp(w * 0.24, 12, 20),
      ry: 10,
      depthFix: area.id,
    };
    if (!hasNearbySolid(solid)) layout.solidBases.push(solid);
  }

  const depthZones = [
    ["east-upper-structure", 867, 217, 1215, 470],
    ["east-mid-structure", 873, 508, 1214, 697],
    ["west-upper-structure", 502, 401, 727, 460],
    ["west-mid-structure", 471, 461, 729, 698],
    ["west-gate-side", 568, 388, 614, 461],
    ["west-gate-approach", 605, 214, 775, 451],
    ["east-gate-approach", 866, 211, 932, 412],
    ["east-gate-side", 988, 367, 1082, 461],
  ];

  const existingIds = new Set(layout.occluders.map((area) => area.id));
  for (const [id, minX, minY, maxX, maxY] of depthZones) {
    const fullId = `depth-${id}`;
    if (existingIds.has(fullId)) continue;

    const visualLeft = Math.max(0, minX + dx - 18);
    const visualTop = Math.max(0, minY + dy - 190);
    const visualRight = Math.min(layout.referenceSize.width, maxX + dx + 18);
    const visualBottom = Math.min(layout.referenceSize.height, maxY + dy + 12);
    const rearTop = Math.max(0, minY + dy - 48);
    const rearBottom = Math.min(layout.referenceSize.height, minY + dy + 12);
    const rearLeft = Math.max(0, minX + dx - 12);
    const rearRight = Math.min(layout.referenceSize.width, maxX + dx + 12);

    const bounds = [
      visualLeft,
      visualTop,
      Math.max(1, visualRight - visualLeft),
      Math.max(1, visualBottom - visualTop),
    ];
    const footArea = layout.rect(
      rearLeft,
      rearTop,
      Math.max(1, rearRight - rearLeft),
      Math.max(1, rearBottom - rearTop),
    );

    layout.occluders.push({
      id: fullId,
      bounds,
      baseline: minY + dy + 10,
      footArea,
      source: "foreground",
      points: layout.rect(...bounds).points,
      rearInset: 6,
      depthFix: true,
    });
  }

  layout.activeOccluders = function activeOccluders(foot, areas = layout.occluders) {
    if (!foot || !Number.isFinite(foot.x) || !Number.isFinite(foot.y)) return [];
    if (layout.solidBases.some((shape) => layout.contains(foot, shape))) return [];
    return areas.filter((area) =>
      foot.y < area.baseline - (area.rearInset ?? 4) &&
      layout.contains(foot, area.footArea),
    );
  };

  function installStarGateComposite() {
    const document = root.document;
    if (!document?.getElementById || !document?.createElement) return;
    const shell = document.getElementById("game-shell");
    const game = document.getElementById("game");
    if (!shell || !game) return;

    // Preserve the already-resolved image URLs before removing the legacy
    // objects. Public previews rewrite these URLs to immutable raw GitHub
    // commits, while the repository build keeps relative paths. Reusing the
    // resolved sources makes the same compositor work in both environments.
    const resolvedGateAssets = {
      normal:
        shell.querySelector?.(".scene-gate-inner-light img")?.src ||
        STAR_GATE_ASSETS.normal,
      event:
        shell.querySelector?.(".scene-gate-event img")?.src ||
        STAR_GATE_ASSETS.event,
      aura:
        shell.querySelector?.(".scene-gate-particle img")?.src ||
        STAR_GATE_ASSETS.aura,
    };

    // The old implementation scales full-reference artwork into arbitrary
    // rectangles. Remove those DOM objects so no hidden/visible duplicate can
    // ever appear behind the new reference-space stack.
    shell.querySelectorAll?.(
      ".scene-gate-base,.scene-gate-inner-light,.scene-gate-particle,.scene-gate-event",
    ).forEach((node) => node.remove());

    if (!document.getElementById("star-gate-composite-style")) {
      const style = document.createElement("style");
      style.id = "star-gate-composite-style";
      style.textContent = `
        .scene-gate-composite {
          z-index: 0;
          pointer-events: none;
          opacity: 0;
          visibility: hidden;
          transition: opacity 520ms ease, visibility 0s linear 520ms;
        }
        .scene-gate-composite > img {
          width: 100%;
          height: 100%;
          object-fit: fill;
          max-width: none;
          pointer-events: none;
          user-select: none;
          -webkit-user-drag: none;
        }
        .scene-gate-normal {
          opacity: 1;
          visibility: visible;
          transition-delay: 0s;
        }
        .scene-gate-event-core,
        .scene-gate-event-aura {
          mix-blend-mode: screen;
        }
        [data-gate-state="unstable"] .scene-gate-normal > img {
          animation: star-gate-normal-unstable 3.3s ease-in-out infinite;
          transform-origin: 55.25% 12.9%;
        }
        [data-gate-state="event"] .scene-gate-normal {
          opacity: 0;
          visibility: hidden;
        }
        [data-gate-state="event"] .scene-gate-event-core {
          opacity: .96;
          visibility: visible;
          transition-delay: 0s;
        }
        [data-gate-state="event"] .scene-gate-event-aura {
          opacity: .72;
          visibility: visible;
          transition-delay: 0s;
        }
        [data-gate-state="event"] .scene-gate-event-core > img {
          animation: star-gate-event-core 4.8s ease-in-out infinite;
          transform-origin: 55.25% 13.2%;
        }
        [data-gate-state="event"] .scene-gate-event-aura > img {
          animation: star-gate-event-aura 6.6s ease-in-out infinite;
          transform-origin: 50% 18%;
        }
        @keyframes star-gate-normal-unstable {
          0%,100% { opacity: .82; filter: saturate(.96) brightness(.96); }
          50% { opacity: 1; filter: saturate(1.08) brightness(1.08); }
        }
        @keyframes star-gate-event-core {
          0%,100% { opacity: .84; transform: scale(.995); }
          50% { opacity: 1; transform: scale(1.008); }
        }
        @keyframes star-gate-event-aura {
          0%,100% { opacity: .52; transform: translate3d(0,2px,0) scale(.998); }
          50% { opacity: .82; transform: translate3d(0,-2px,0) scale(1.006); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-gate-state] .scene-gate-composite > img { animation: none !important; }
        }
      `;
      document.head?.appendChild(style);
    }

    const layers = [
      ["scene-gate-normal", resolvedGateAssets.normal],
      ["scene-gate-event-core", resolvedGateAssets.event],
      ["scene-gate-event-aura", resolvedGateAssets.aura],
    ];

    for (const [className, src] of layers) {
      if (shell.querySelector?.(`.${className}`)) continue;
      const layer = document.createElement("div");
      layer.className = `scene-world-layer scene-back scene-gate-composite ${className}`;
      layer.dataset.sceneWorld = "";
      layer.setAttribute("aria-hidden", "true");
      const image = document.createElement("img");
      image.crossOrigin = "anonymous";
      image.alt = "";
      image.draggable = false;
      image.src = src;
      layer.appendChild(image);
      game.before(layer);
    }
  }

  function dispatchGateState(state) {
    root.dispatchEvent?.(
      new CustomEvent("tarot-breaker:gate-state", { detail: { state } }),
    );
  }

  function installGateStoryBridge() {
    if (!root.addEventListener || !root.queueMicrotask) return;
    root.addEventListener("tarot-breaker:interaction-start", () => {
      root.queueMicrotask(() => {
        const story = root.TarotDialogue?.getState?.();
        if (story?.eventId === "lumiereGate") dispatchGateState("unstable");
      });
    });
    root.addEventListener("tarot-breaker:interaction-end", () => {
      root.queueMicrotask(() => {
        const story = root.TarotDialogue?.getState?.();
        dispatchGateState(story?.lumiereDone ? "event" : "normal");
      });
    });
    root.document?.getElementById?.("reset")?.addEventListener("click", () =>
      dispatchGateState("normal"),
    );
  }

  installStarGateComposite();
  installGateStoryBridge();

  layout.depthModelVersion = "preview-49";
  layout.artworkPlacement = Object.freeze({
    islands: Object.freeze({ mode: "contain", alignX: 0.5, alignY: 0 }),
    foreground: Object.freeze({
      sourceScale: FOREGROUND_SOURCE_SCALE,
      x: dx,
      y: dy,
      repeat: false,
    }),
    starGate: Object.freeze({
      mode: "reference-space-overlay",
      x: 0,
      y: 0,
      width: REFERENCE.width,
      height: REFERENCE.height,
      actorLayer: "above-gate",
      normal: STAR_GATE_ASSETS.normal,
      event: [STAR_GATE_ASSETS.event, STAR_GATE_ASSETS.aura],
    }),
  });
  layout.starGateComposite = Object.freeze({
    referenceSize: Object.freeze({ ...REFERENCE }),
    normal: STAR_GATE_ASSETS.normal,
    unstable: STAR_GATE_ASSETS.normal,
    event: Object.freeze([STAR_GATE_ASSETS.event, STAR_GATE_ASSETS.aura]),
  });
  layout.artworkModelVersion = "preview-55-latest-artwork-aligned";
  layout.starGateModelVersion = "preview-56-star-gate-composite";
})(window);
