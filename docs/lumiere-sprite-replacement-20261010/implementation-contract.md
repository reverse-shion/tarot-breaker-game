# Lumiere replacement: read-only Architect implementation contract

Baseline main: aa65642bd9cfb771ea06f1a5ad3c9e6d1dbfddac
Candidate branch: fix/lumiere-official-sprites-20261010
Risk: HIGH (visible sprite layout / mobile rendering).

## FACT

The four official inputs are RGBA PNG files named .webp, all 1254×1254, with verified Git source blobs. The current renderer maps each manifest anatomical span to 63.984375 reference pixels, using each fixed body_top / baseline_y / center_x. It draws one full compositor surface; existing whole-body bob remains amplitude2.4 / period5.2. Local compositor density, allocation limits, phase, amplitudes and render mechanics are fixed.

Raw new art with old anchors changes measured crown–plantar-tip anatomy: down+3.9927%, up+2.9468%, left+1.1516%, right+.3660%. Head displacement is about -2.079,-1.823,-2.322,-.175 reference pixels respectively; foot displacement +.462,+.061,-1.589,+.058. These are anatomical ROIs, not transparent bounds. Existing anchors should remain exact; normalize artwork inside its fixed canvas instead.

Representative old wing interior alpha is252/253, input255. Hair, skin and cloth old interiors also share the same near-opaque alpha253. No evidence from these probes supports substantial selective wing translucency in the old source. Canonical new source alpha must not be replaced by invented selective translucency. Report this source characteristic honestly.

## PROPOSED minimum Scope

Replace only assets/sprites/lumiere/{lumiere_idle.webp,lumiere_hover-back.webp,lumiere_hover_left.webp,lumiere_hover_right.webp} and lumiere_sprite_manifest.json. Transform each input uniformly on a transparent1254-square canvas; preserve hue, RGB art, and alpha except documented4 isolated low-alpha artifact pixels if their removal is needed by the explicit no-stray acceptance. Do not distort individual body parts or invent alpha. Encode normalized RGBA as true lossless WebP and prove decoded output equals the normalized pre-encoding RGBA.

Source→output x'=s*x+tx; y'=s*y+ty. Proposed values and anatomy/measurement method are in horizontal-landmarks.json. Crown and lowest foot y match measured old anatomy. Down horizontal registration uses midpoint of separately measured irises; up uses crown-band axis; left/right use visible iris centroid. Scales: down.9616055846422339; up.971375807940905; left.9886148007590133; right.9963536918869644.

Expected subpixel differences in other anatomical landmarks are inherent in new artwork. Proposed foot-tip horizontal differences are -.0192,+.0097,+.5498,-.1095 reference pixels; face/crown-band vertical differences -.5862,+.0132,-.7052,-.1485. These are estimates before rasterized candidate confirmation, not an exact final PASS. Record output interpolation/reproducible transformation parameters and hashes separately from raw-source hashes.

Do not change lumiere-sway.js unless final candidate inspection proves an old region contacts a protected anatomical area or has no actual terminal hair/hem foreground/motion. Current source regions remain in terminal hair/cloth territory under the small proposed transforms; there is no demonstrated reason to change region coordinates. If needed, change only coordinate arrays; all temporal/mechanical configuration remains fixed. Do not change amplitudes, lags, density, steps, renderer, cache model or frame draw behavior.

Keep manifest files/directions, width/height, all12 anchor values, all render values, phase2, localized_sway:true exactly. Update only asset digests / decoded digests and accurate source/provenance notes. Notes must distinguish old encoded source, supplied input, normalized RGBA and final losslessWebP; no false raw RGBA identity claim.

Lumiere-specific evidence, candidate tests, fixed preview and minimal historical test fixtures are permitted. The two historical preview tests must preserve their exact embedded source hashes and source_commits. For only authorized mutable Lumiere files, compare against exact historical fixtures pinned to those digests; all other source comparisons and historical script/HTML assertions remain unchanged. Add separate strict candidate source/alignment/manifest tests. No generic fallback, omitted hash, updated old metadata or weakened assertion.

## Out of Scope / protected systems

No main merge or production deployment. No image generation. No modifications to game.js/index.html, actors other than Lumiere, unused candidate sprites/legacy PNGs, event/dialogue, route/spawn, camera, touch, movement, collision, companions, save/progress, audio, shadows, glow/outline, device registry, regression baselines or validators unrelated to this exact Lumiere work. Scope exceptions are only the permitted Lumiere evidence/tests/preview and proven-required region coordinates.

## Acceptance / QA handoff

1. Four artifacts are1254-square true lossless RGBA WebP; decoded pixels exactly match reproducible approved normalized RGBA. Source blob/commit/hash and processing ledger are retained.
2. Renderer/manifest anchors and render values match baseline exactly. Crown/foot placement and actual body height match old anatomy; confirm face/body/foot residuals below1 reference pixel at actual64px body scale. Recheck candidate anatomy after interpolation, not only mathematical transforms or transparent bounding boxes.
3. Background stays transparent; source art retains canonical RGB/alpha; no added shadows/glow/opaque fringe. Any removed stray is exact documented isolated component only. Inspect wings/cloth over contrasting backgrounds and describe near-opaque interior alpha factually.
4. All four directions, motion ON/OFF,2×5.2s periods per direction: stable face/body/legs/wings; only terminal hair/hem move, no seams/double image/phase discontinuity. Existing semantic region exclusions remain tested. Actual-source pixel proof verifies no changed pixels outside regions, fixed roots/perimeter, movement within each required hair/hem region and no per-frame allocations/readbacks/writes.
5. Run targeted Lumiere tests, existing validators, syntax, diff --check, full regression vs baseline337/337; no new failure. Independent reviewer must inspect actual diff and candidate art/evidence without repairing while reviewing.
6. Required targeted iPhone Safari visual gate: affected viewport/camera framing/foreground clipping,4 directions,2 cycles each, ON/OFF and direction changes, event movement, restoration/reload, normal/low-power. Automated desktop rendering is supporting evidence, not device PASS. No full-game replay required for this isolated asset scope. Device PENDING must remain explicit; no release or merge.

## UNKNOWN / remaining validation

Prototype registration is measured and feasible at subpixel64px character scale; final output raster and real-device perceived quality are not yet validated. Do not claim exact equality of all interior anatomy; new supplied drawing has different internal proportions. Existing source alpha255 interior is deliberate canonical input, not invented recovered transparency. No unresolved product choice remains if supplied new art is canonical and ≤1-reference-pixel placement residual is accepted as directed; a larger unexplained residual, necessary unrelated change or new regression is STOP.
