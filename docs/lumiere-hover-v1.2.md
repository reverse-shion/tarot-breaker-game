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

## Implemented settings and validation

- Subpixel: existing fractional final Y preserved, no actor/world/collision edits.
- Hysteresis: final initial threshold ±0.15; previous state held inclusively in
  the deadband. No device adjustment has been claimed.
- Crossfade: 100ms using `performance.now()`; front pair and back pair only.
  A direction change/reset cancels the old pose. Both poses use the same current
  actor and bob offset with their existing manifest correction; body opacity is
  the only interpolated quantity. No position interpolation or second trajectory.
- Outline: exterior-connected transparent alpha mask, disk dilation followed by
  source alpha exclusion. Enclosed transparent holes are excluded by flood fill.
  RGB (55,48,94), opacity .42. Configured radius 1.25 reference px is rounded
  outward to 3 cache pixels at density2: effective display radius 1.5px at zoom1.
  Six canvases generated once after decoded/validated assets, full-source body
  draws unchanged. One rim pass per frame, excluded from crossfade; no filters.
- Shadow: cached soft elliptical radial gradient, RGB (66,59,97), center opacity
  .16, 40×16 reference px, center at logical actor foot Y+5. No bob or stage
  visual offset. Normal camera/scale path retained. Existing Shion/Shiopon shadow
  code is untouched.
- Aura: not implemented; background is medium/bright and adding white light is
  unnecessary. `aura` switch is reserved; it has no rendering effect in v1.2.
  No aura/image/intermediate-pose assets were added.

### A/B links and switches

Use the exact candidate SHA from PR #122's `DEVICE_RUNTIME_SHA` in:
`https://raw.githack.com/reverse-shion/tarot-breaker-game/<SHA>/index.html?dev=garden-resume-after-shiopon`.

Append `&lumiereEffects=before` for baseline-equivalent effects (old velocity
threshold, no crossfade/cache, original body blur/ground shadow).
Independent overrides: `lumiereHysteresis=0`, `lumiereCrossfade=0`,
`lumiereOutline=0`, `lumiereShadow=0` (or `=1`). Outline=0 retains original blur;
shadow=0 removes the new shadow; comparison-before mode retains the old shadow.
No Production UI or release configuration was added.

### Automated / Chromium evidence

- main `b3c49fb`: 326/326; pre-change `306fb4a`: 329/329;
  implementation `d6b2f84`: 333/333, no new failures.
- Full available regression suite includes Save/Continue, Garden resume,
  audio, routes, collision/navigation, dialogue, stage commands and events.
- Asset, background and audio validation PASS; JavaScript syntax and
  `git diff --check` PASS. GitHub CI result is recorded on PR #122 separately.
- Chromium portrait 390×844 and landscape 844×390, DPR2: all three contexts
  captured at identical actor positions/facing/bob phase with fixed camera.
  Page errors: 0 in each pre/post run. Existing remote main Shiopon/audio
  requests use identical local baseline bytes for reproducible comparison.
- Screenshot comparison: silhouette visible at home, conversation and gate step
  in both orientations; no clipping or body-anchor displacement observed.
  Hair/wings/shoulders/hem remain light. These are Chromium judgements only.
- Comparison boards: [portrait](lumiere-hover-evidence/portrait-comparison.png),
  [landscape](lumiere-hover-evidence/landscape-comparison.png).
  These are screenshot evidence, not new game/sprite images.
- Full screenshots and short pre/post videos are in the shared workspace
  `/workspace/lumiere-evidence`. Videos include startup and an 11s hover sample.
  Headless rAF is too slow for full wall-clock bob-cycle/ghost evaluation;
  engine dt cap .05 remains unchanged, so simulation time advances more slowly.
- Draw CPU median ms, pre → post: portrait .9 → .9, landscape .8 → 1.0.
  P95: portrait 1.3 → 3.9, landscape 2.6 → 1.4. rAF median ms:
  portrait 350 → 316.7, landscape 333.3 → 350. Recorded-video headless timings
  are noisy and are **not** same-iPhone fps evidence. See raw
  [results](lumiere-hover-evidence/chromium-results.json).

### Required device record — all PENDING

| Check | Status |
| --- | --- |
| Movement smoother than base, unchanged 2.4px/5.2s | PENDING |
| Pose switching improved / unchanged / worse | PENDING |
| Face/hair/wing/outline ghosts acceptable | PENDING |
| Hair, wings, shoulders, hem discernible at all three contexts | PENDING |
| Light lines, soft shadow, floating angel-like impression | PENDING |
| Same-iPhone normal / optional low-power fps comparison | PENDING |

Device Gate = PENDING; this is an implementation candidate, not final PASS.
If iPhone ghosts dominate, retest the exact SHA with `lumiereCrossfade=0` and
report the result. If popping persists or ghosts are worse, propose one
intermediate pose each for front/back as a separate next specification. Do not
create images or change assets in this task. Main merge / Production remain
prohibited, regardless of CI or independent technical review outcome.

## Dev-link repair after device access failure

The original raw.githack/rawcdn entry could return HTTP200 while browser startup
failed. Real browser navigation reproduced the hosting confirmation page,
aborted stylesheet/script requests and `TarotNavigation` undefined; a subsequent
retry returned the host's HTTP429 page. File-download checks were insufficient.

A dedicated `lumiere-dev-a324d10.html` now bundles the exact source from
`a324d10f4711d15c45502510969850bb5e57d6ca` for the Garden dev checkpoint. It does
not modify the original game/index/save/movement/dialogue/event files. Rebuild:
`python scripts/build-lumiere-device-preview.py <exact-source-sha>`.

Preview-specific transport changes are recorded in the embedded source metadata:
- Inline script dependencies and stylesheet bytes (retain link/data guard markers).
- Inline Garden dev dependency modules instead of CDN document.write requests.
- Pin static images/JSON and Shiopon source to the source commit on raw GitHub.
- Admit images with anonymous CORS so cached outline readback is not tainted.
- Rebase stylesheet image URLs to that same immutable asset origin.

No new asset, gameplay logic, main change, hosting workflow or Production
deployment. Local Chromium with actual external pinned assets reached
`scene-ready`, page errors0 and failed resource requests0. External-host startup
must also be checked before supplying the repaired link. This is a browser
startup validation, not an iPhone visual/fps PASS. Device Gate remains PENDING.
