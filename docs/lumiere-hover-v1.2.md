# Lumiere hover / visibility v1.2

## Investigation and implementation contract (before runtime edits)

- Candidate base: `306fb4a1500a16b19478e6f1aa3623540a7f1847`.
- Latest main inspected via GitHub and local git objects:
  `b3c49fb350f256dfa3f8b80b903a3b0d1ed105ee`. Detached baseline only;
  no main changes, merge or Production deployment. Update existing Draft #122.
- Risk: HIGH (visual layout / iOS Safari). WORKING: Lumiere rendering,
  its pose state, cached effects, relevant tests and evidence.
- LOCKED: Shion, Shiopon, movement, collision, navigation, Save/Continue,
  map transitions, dialogue, audio, Star Gate and Future Fixation Vision.
- Preserve all assets, pose mappings, 63.984375px body height, amplitude 2.4px,
  period 5.2s, manifest centers/baselines and logical actor coordinates.

### P1 — no floating-coordinate rounding

`updateLumiere` assigns `sin(bobPhase) * 2.4 * scale.y` directly. The hover
branch of `drawActor` passes
`actor.y - 2.7 * scale.y - pose.baseline_y * ratio + visualOffsetY` to
`drawImage`; `visualOffsetY = bobOffsetY + stageOffsetY`. Actor/world coordinates,
camera origin, translation and zoom are fractional. World is canonical 1448×1086,
scale = 1. Canvas backing dimensions use `Math.round(cssSize * dpr)`;
`scene-effects.js` uses `Math.ceil` for occlusion surface dimensions only,
with fractional transforms and destination bounds. Neither snaps bob Y.
No bitwise/integer conversion or final-coordinate snap found. Consequently
the conditional subpixel fix is unnecessary; no empty fix commit is created.

### P2 — rendered background measurement

Chromium portrait 390×844, DPR2, zoom1; actor canvas and debug overlay hidden
after the actual composite background loaded. Sample: 84×77 reference-pixel
rectangle centered at actor X, Y−75 through Y+2. Convert screenshot sRGB to
linear RGB, then relative luminance `0.2126 R + 0.7152 G + 0.0722 B`.

| Scenario | World foot | Mean | Median | P10 / P90 | Classification |
| --- | --- | --- | --- | --- | --- |
| Normal home | (810,212) | 0.4833 | 0.4981 | 0.0810 / 0.8860 | medium / bright mixed |
| Main Shion conversation | (810,212) | 0.4833 | 0.4981 | 0.0810 / 0.8860 | medium / bright mixed |
| Gate departure / upper step | (810,204) | 0.4486 | 0.4278 | 0.0782 / 0.8638 | medium / bright mixed |

The first two scenarios intentionally share coordinates: dialogue changes facing,
not Lumiere's home position. The final authored `step up 8` gives the third.
This is the other actual event position; it is a difficult hair/wing backdrop,
but an objective global “most buried” ranking remains a device visual judgement.
Primary residence is (810,212): use one dark purple-grey exterior outline,
not black and not a dual rim. A bright aura is unnecessary on this backdrop.

### P3 — Canvas2D

Game actor rendering is Canvas2D; background is DOM/canvas layers. Existing
occlusion renders actors to a temporary Canvas2D. No `ctx.filter` will be added.
Existing hover body uses a per-draw shadowBlur; replace it with the cached rim.
The legacy `lumiere-outline.js` patch targets PNG/sheet composites and does not
match the current full-source WebP poses.

### P4 — phase and mapping

`updateLumiere`: `bobPhase += dt * 2π / 5.2`, sine bob; cosine derivative.
Existing state threshold is ±1e−6. `drawActors → drawMaskedActor → drawActor`
is the final path. Canvas Y increases downwards, so negative cosine is rising.

| Facing | Rising | Falling |
| --- | --- | --- |
| front/down | idle.webp | hover_down.webp |
| back/up | hover-back.webp | hover_up.webp |
| left | hover_left.webp | same |
| right | hover_right.webp | same |

### Ordered implementation / acceptance

1. Investigation record (this commit).
2. Subpixel action: unnecessary, preserve existing fractional path.
3. Hysteresis ±0.15, independent debug switch.
4. Crossfade 100ms, only same-facing two-pose transitions, opacity only;
   both use current actor/bob and manifest anchors. Switchable for device ghosts.
5. One-time exterior alpha dilation per pose, excluding enclosed transparent
   holes; cache at display resolution with density2. No frame-time generation.
6. Dedicated thin blue-purple-grey shadow at logical Y+5, never bob/stage offset.
7. Aura: omit unless evidence justifies it; preserve independent aura flag.
8. Mechanical tests, main/base comparison, portrait/landscape evidence,
   independent repository-required review, CI validate and SHA-fixed dev link.

Baseline automated suite: main 326/326, base candidate 329/329; no failures.
Network-capable execution is required by subprocess tests in this sandbox.
Device Gate = PENDING. Ghost judgement, perceived smoothness, silhouette
readability and same-iPhone normal/low-power fps comparison require human device
evidence. No intermediate images will be created or added.
