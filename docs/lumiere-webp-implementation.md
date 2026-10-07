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
