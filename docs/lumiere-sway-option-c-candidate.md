# TAROT BREAKER — Lumiere natural terminal sway, candidate C

Status: IMPLEMENTED / CI TARGET / iPhone DEVICE PENDING / DO NOT MERGE MAIN
Date: 2026-10-10
PR: #130
Runtime: `8e7b89b7afa479e2a66a6c8487b10a65ab1dcb4c`
Verification controls: `0678414be424d0995a4d206d1d6f13cd94bc9b9b`
Frozen preview: `docs/lumiere-hover-evidence/lumiere-sway-8e7b89b.html?dev=garden-resume-after-lumiere`

## What was wrong
The iPhone screenshot showed "hair 0.4px / hem 0.25px" because the prior verification controls literally hardcoded legacy amplitudes. It **did not** establish that the loaded game module was old. The actual Option B runtime was 0.85px / 0.55px: still tiny at a ~64px body reference and not reliably visible. Old local-region tests proved mathematical movement inside bounding rectangles, not perceptible hair/cloth motion.

## Current implementation
- Same four decoded WebP sources, native sizes, anchors, body, face, eyes, feet, wings, actor shadow and camera. No change to Garden routes, save, events or the rest of the game.
- Hover remains 2.4px amplitude / 5.2-second period. No separate clock.
- Candidate C nominal hair tip lateral amplitude **2.2 reference px**, hem tip **1.35 reference px**; subtle correlated vertical follow-through ratio -0.13 hair / +0.12 hem, lag 0.34s hair / 0.58s hem.
- Smooth attachment: exact zero at all four region boundaries; upper root damped; approximately maximal sway toward the lower free-tip portion. Sinusoidal horizontal profile avoids steep-side foldover.
- Every independently bounded region further clamps displacement to `0.8*(cacheWidth-1)/pi` to guarantee a conservative horizontal inverse-map gradient. Therefore particularly narrow side curls have lower *effective* maximum than the advertised nominal value. Diagnostic data exposes each effective maximum.
- Precomputed 33 subpixel samples per region, one fixed atlas per direction, unchanged cache densities and output canvas sizes, at most 8 draws per cached frame, one final world-actor draw. No per-frame allocation, image readback, or per-pixel processing.
- Cache-time diagnostics count changed RGBA pixels and changed alpha silhouette pixels for every hair/hem region using the actual decoded artwork. In the dev panel, the runtime module now supplies both configuration and diagnosis; the former misleading numeric string has been removed.
- The dev panel stays bottom-docked, initially folded, and folds after successful positioning. It never loads on normal production pages.

## Verification
- Source digests from 40 files, exact pinned module, dev preview embedded script compilation, 4-direction local regions, root/perimeter and wave phase tests, conservative mesh gradient bound, and 334+ baseline tests.
- **Do not substitute historical Phase-2 pixel evidence for candidate C**. Runtime diagnostics indicate actual selected image pixels moving but do not prove smooth appearance, anatomical correctness, Safari FPS or visual acceptance.
- iPhone Safari Device Gate: each of front/rear/left/right two full 5.2s cycles ON then OFF, review visible tip/hem movement, fixed face/body/legs/wings, no cracks/seams/double image/smear, movement/occlusion, camera, reload and low-power mode.
- If image-region `changed = 0` or `silhouette = 0`, mark BLOCKED; inspect real source regions before raising amplitude further.
- Save screenshots/video and record exact commit/runtime and iPhone model/browser version for the device registry. Keep PR Draft and production/main unchanged until reviewed.

## Reproduction
Frozen preview:
`https://raw.githack.com/reverse-shion/tarot-breaker-game/8aa2c6090368dfdf67b61b91363ffb2b2df88565/docs/lumiere-hover-evidence/lumiere-sway-8e7b89b.html?dev=garden-resume-after-lumiere`

Open bottom verification panel → move to inspection position → verify each direction 10.4s → compare sway ON/OFF. If the panel reads 0.4/0.25 or does not say candidate C, the wrong page was opened; do not report a false device test.

## CI verification status — 2026-10-10

On GitHub Actions Validate TAROT BREAKER 2D, commit `459548629747797138a860bea675fadc297a24e0` passed 335/335 automated tests, with zero new regression-baseline failures. The immutable candidate C preview and 40 current source-file digests are checked in CI. A follow-up documentation-only commit follows the synchronized PR-body runtime SHA to let the guarded workflow evaluate the final candidate. A merge gate requiring Device registry evidence must remain BLOCKED until a real iPhone verification record is provided.
