# Caritas special presentation adjustment — 2026-10-29

Implementation contract: main `6e05dabe164e3e2bac27faf8a4a91d323f3f8939`,
starting special branch `1742c4a4d4885a656baf01c613e1ff5f926ee2c5`.
Candidate: `fix/caritas-special-framing-20261029`. Risk: HIGH (visual layout).
Preflight: caritas-heart-resonance PASS / NOT TESTED / productionEnabled false.

WORKING: encounter cut-in name overlays, full-screen special art sizing/motion,
art title overlay removal, isolated HTML cache versions, focused browser
verification and this report.
LOCKED: original image bytes, shared main dialogue engine/styles/speaker names,
chant text, event phase order/timing, combat/save arithmetic, navigation,
movement, audio, Production Progress, other events and historical device records.
No main merge, auto-merge or production deployment is authorized.

Acceptance: solo Shion → solo Shioriel → dual chant → full-size art without
title → purification → card-specific reply → farewell → normal map. Verify all
three cards, initial and later art geometry, full image containment, no cut-in
name overlays, no art text, reduced motion and map return. Run full regression,
asset validators and independent diff review. Physical iPhone Safari remains a
separate PENDING gate; automation must not be reported as device PASS.

## Changes

- Inspected both original cut-in WebPs: neither contains a baked-in name. The
  names came from `.cb-cut-name` span elements. Removed those generated spans
  and their unused CSS. No crop/mask or asset editing is necessary; the complete
  original images remain visible. Shared dialogue speaker names are unchanged.
- Foreground art width/height: 88% → 100% of the safe-area-aware full-screen
  container. `object-fit: contain` preserves the entire person, wings and book;
  the existing blurred background fills any aspect-ratio margins.
- Art WAAPI frames now hold opacity 1 rather than scale 1 → 1.06. The first
  decoded frame has its final size, with the existing hold duration, background
  pause/resume, watchdog and reduced-motion behavior retained.
- Removed `ui.artTitle` construction, text assignment and insertion, plus title
  CSS, including the missing-image fallback. Technique names remain in the
  unchanged simultaneous chant (and the existing card selection UI).

## Validation

- Current main full regression: **536/536 PASS**, no approved-baseline failures.
- Candidate full regression: **644/644 PASS**, no approved-baseline failures.
- Caritas targeted suite: **77/77 PASS**. Special state + event suite: **34/34 PASS**.
- Asset, background and audio validators, JS syntax and `git diff --check`: PASS.
- All five image Git blob IDs match current main; shared dialogue JS/CSS,
  dialogue JS/CSS, game.js, controls.js, navigation.js and audio.js have no diff
  to current main.
- Chromium: **6/6 PASS** (Moon/Strength/Star × 390×844 and 844×390). Star also
  uses reduced motion. Every case decodes the actual 864×1536 image, records the
  initial frame at 100% of the viewport, samples unchanged bounds and no scale,
  verifies `contain`, no cut-in name element/art text, and the complete phase
  order through DONE, normal map return and DONE reload. Zero page errors.
- Inspected all three portrait art screenshots and the landscape art framing:
  complete person, wings and book remain within the image; aspect-ratio margins
  use the existing blur layer. No text overlays on the art.
- Linux WebKit 26.5: **6/6 PASS** on the same three cards, portrait/landscape,
  initial-frame geometry, text removal and full sequence/return/reload assertions;
  zero page errors. Inspected WebKit portrait art/dual cut-in and landscape art.
  Physical iPhone Safari: **PENDING / 実機未検証**. Safe-area insets and the real
  Safari browser chrome/dynamic viewport require physical-device confirmation.
- Independent review: no introduced code findings. **34/34** targeted and **9/9**
  decoded-art lifecycle checks passed independently (all cards; normal finish,
  background watchdog, stale callback/cancellation).
- The first expanded browser run hit the existing helper's check/reveal/advance
  timing race. The helper now waits for the shared ready-to-advance marker and
  clicks once; the full fresh Chromium run above passes. No game dialogue engine
  or typing/tap behavior was changed to accommodate the test.

Reproduce with Playwright and a local static server on port 8765:
`node tests/caritas-special-browser.cjs`. Set `CARITAS_QA_BROWSER=webkit` for
WebKit, and `CARITAS_QA_OUTPUT` to a disposable artifact directory. Fixtures use
new browser contexts and seed only the existing Caritas dev key. No Production
save is written by the harness. Local Linux WebKit is not physical iPhone Safari.

REGRESSION LOCK: no protected-system diff or new automated failure.
Device/release gates remain PENDING; no main merge or production deployment.
