# Lumiere WebP implementation candidate

Baseline main: `b3c49fb350f256dfa3f8b80b903a3b0d1ed105ee`.
Risk: HIGH (visual layout). Required device gate: iPhone visual smoke, PENDING.

Scope: Lumiere asset encoding/orientation, references, full-pose rendering,
manifest landmarks, relevant validation/tests and cache references. No change to
Shion/Shiopon rendering or control, event/story/dialogue/audio, actor positions,
collision, navigation, routes, persistence, production hosting or main.

Facts: the five uploaded `.webp` files contain PNG pixels and are single poses.
Uploaded hover_down is back-facing; uploaded hover_up is front-facing. Canonical
down/front and up/back require swapping their contents. Convert all five losslessly
to actual WebP, verifying decoded RGBA identity; retain the supplied artwork.

Render every full image with one uniform scale; no old sheet slicing, per-frame
crop, body-core replacement or normalized composite. Use crown/toe/body-center
landmarks from each pose, excluding wing/hair/ornament extents when setting body
height. Shion's front idle crown/toe span is 420 source pixels at 78/512 scale,
so Lumiere's target body height is 63.984375 reference pixels. The image rectangle
can be wider than Shion because wings and long hair are preserved.

Front stationary uses idle; front moving uses hover_down. Back/left/right use
their directional pose in both states. Never alternate front/back as animation
frames. Retain the 2.4px amplitude, 5.2-second sine bob and 2.7px bottom gap.
No wing flapping or image deformation is added. Hair/drapery remain the supplied
pose artwork and change with pose selection.

Acceptance: correct five-pose selection, full source rectangles, intact alpha,
uniform aspect ratio, stable body-center/toe anchor across directions, matching
body heights, continuous slow bob, portrait/landscape browser smoke, existing
326-test baseline preserved. Independent review required. Browser/numeric checks
cannot establish iPhone PASS. Draft PR only; no merge or production deployment.


## Phase-synchronized front/back amendment

Amendment base: `095585a736d9551105d2b2726cc08148eca8dedf`.
The original five-pose implementation above is historical; this amendment
supersedes its stationary-front-only idle selection.

Use existing `bobPhase` velocity (`cos(phase)`) to select rising/falling artwork.
Negative canvas-Y velocity rises. Retain the previous rising flag while the
normalized derivative is within ±1e-6 of zero; no new timer is introduced.

| Facing | Rising | Falling |
| --- | --- | --- |
| Front | idle | hover_down (hair-spread pose) |
| Rear | existing hover-back | hover_up (user's original down) |
| Left/right | unchanged directional image | unchanged directional image |

The existing back image is losslessly encoded in place, not newly generated.
Its crown/toe/body-axis landmarks are y74/y1127/x628. The body span remains
63.984375px and the full-image height is 76.197917px. All prior image landmarks,
left/right selection, full-source drawing, 2.4px/5.2s trajectory and 2.7px gap
remain unchanged. No extra wing motion or image deformation is added.

Targeted tests must cover both phase directions, extrema/deadband stability,
phase switches under stationary/moving states, all four normalized body anchors,
left/right preservation, and the full existing regression suite. Chromium
portrait/landscape smoke is required; iPhone and integration PASS remain PENDING.
Update the same Draft PR #122; no merge or Production publication.
