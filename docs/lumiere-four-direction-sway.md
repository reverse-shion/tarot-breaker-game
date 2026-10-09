# Lumiere local hair / garment sway — Phase 2 integration

Status: IMPLEMENTED / DEVICE PENDING / NOT RELEASED
Risk: HIGH
Baseline main: `cf9e8363575e6d96f458d870cbbdefbd96ef197f`
Phase 1 basis: `c524021` (four-direction fixed-pose rendering)

## Scope

The approved Phase 2 adds continuous terminal hair and hem sway inside explicitly inspected source-coordinate regions. Four fixed source images, person scale, anatomical anchors, whole-body bob, logical positions and existing shadow stay unchanged. No whole-body warp, pose fade, wings, face/body/leg movement, particles, new glow, route/event/save/camera changes.

`lumiere-sway.js` owns inspected regions, zero-displacement perimeter/root, local warp, motion amplitudes/phase lag, fixed-capacity compositors and its own pixel proof. This integration loads the module before game.js, creates exactly one compositor per direction after image decode/dimension validation, and composes the current bobPhase into that cache. The cached image is drawn once using its own source dimensions and the unchanged full-source destination rectangle/anchors. No per-frame compositor creation or source-image decoding is added to game.js.

Module API: `window.TarotLumiereSway.create(image, pose)` returns `{canvas,width,height,draw(phase)}`. canvas capacity is fixed and width/height must agree with it. Missing module, thrown creation or malformed cache causes the existing visible boot error before scene-ready. The module's A/B control is transient and never saved. Manifest phase=2 and localized_sway=true identify the required dependency.

## Evidence boundary

Runtime harnesses verify four one-time cache creations, one final whole-body draw per frame, current bobPhase delivered to the compositor, unchanged directional body scale/anchors, two continuous hover periods per direction, face/stage offset phase continuity, reset and module/create failures failing closed. Existing readiness delay/decode tests remain. Module pixel tests separately prove source-region/root restrictions; harness stubs do not prove pixel quality.

Required Device Gate remains iPhone Safari: all four directions, two periods each, sway A/B, direction change, camera/foreground clipping, existing event movement, tab restoration/reload and normal/low-power. Confirm stable face/body/legs/wings, no dark/missing seams or halo, no double image, no sudden stretching or phase discontinuity. CI PASS is not device evidence. No main merge or production release is authorized by this file.

## Preservation

No historical Device record, event contract, checkpoint registry or regression policy is changed. Phase 1 artifact remains a historical contract; this document records its explicit Phase 2 dependency. Unadopted eight pose candidates and legacy PNG files remain untouched.

## Motion and source-region contract

Hair-tip displacement is at most 0.4 reference px, hem-tip at most 0.25px, with 0.22s / 0.35s lag relative to the same bobPhase. Motion is horizontal and tapers smoothly to zero at all source-region boundaries. No separate animation clock. Tip-attached ornaments move with their hair/cloth; unrelated accessories stay fixed. Upper/interior hair overlapping face/body/wings is intentionally not animated. A near-leg left hem candidate was excluded.

| Direction | Terminal hair regions (x,y,w,h) | Terminal hem regions (x,y,w,h) |
|---|---|---|
| Front | 160,790,150,220; 940,790,160,220 | 350,1040,150,175; 750,1040,150,175 |
| Rear | 175,790,145,190; 950,790,145,190 | 350,1060,175,160; 725,1060,175,160 |
| Left | 958,720,110,166 | 877,1040,155,160 |
| Right | 160,770,130,160 | 340,1060,105,165; 735,1015,90,140 |

The four original WebP bitmaps are unchanged. Region coordinates use those full 1254-square sources. Cache-bound rounding is outward; the final one-cache-pixel perimeter remains byte-identical to the fixed baseline. A bijective local inverse warp resamples only terminal regions, so no concealed body/wing background is invented.

33 displacement samples per region are packed into one atlas per direction. Each frame interpolates only neighboring terminal displacement samples (maximum separation 0.025 reference px for hair), using weighted additive premultiplied RGBA in a cleared inner region. This is not a whole-character pose-opacity transition: face/body/legs/wings are copied unchanged and never blended. Final character shadow is applied once. Small 8-bit rounding in moving pixels is not claimed to be exact color identity; Safari edge quality remains pending.

Cache density is at least 3 pixels per reference px, above effective maximum 2×1.22. Four directions require 12 Canvas objects total (fixed base/composition/atlas per direction). RGBA capacity is 3,224,928 additional bytes (~3.08 MiB), excluding browser/GPU overhead and the existing 24 MiB decoded sources. Runtime is one base copy plus at most eight tiny tile draws, then one final actor draw. Init does CPU readback/resampling once; runtime never allocates canvases or reads/writes pixel arrays. A malformed anchor that would exceed 256-square cache capacity fails visibly before scene-ready.

## Local evidence

Full regression: main 326/326, Phase 1 327/327, Phase 2 330/330 PASS. Independent Reviewer repeated Phase 2 suite, validators and pixel checks. Software-Canvas pixel proof covers 34 phases per direction including both hair extrema: changed pixels outside selected cache regions = 0; roots/perimeter changes = 0; sway-OFF image equals same-density source rendering; motion exists inside allowed regions; per-frame allocations/readbacks/pixel writes = 0. See `lumiere-hover-evidence/sway-pixel-proof/metrics.json` and `contact.png`.

`node scripts/check-lumiere-sway-pixels.cjs` reproduces the software proof when the analysis environment supplies @napi-rs/canvas. It is a development-only tool, no production/CI dependency or package change. Node's dependency-free tests cover bounds, roots, periodicity, cache reuse, anatomical exclusions and malformed capacity. These checks do not measure Safari FPS, color management or perceived smoothness.

The exact-source verification page exposes transient 「揺れ：ON/OFF」 alongside four-direction controls, only at existing G3 checkpoint. Compare each direction for two 5.2s cycles. A/B keeps the same density and body hover phase; no save or production state is changed. Device status remains PENDING. Draft PR only; no main merge or Production deployment.

## Exact runtime handoff

DEVICE_RUNTIME_SHA: 5e60732c5d94de1519a30bf7cd39ebf3746b85ff
DEVICE_RESULT: PENDING

The GitHub runtime tree `b2d7bb8f011bb8bb80c37dbf8adf08af3af5a799` equals the locally reviewed runtime tree exactly. Fixed dev preview: `lumiere-hover-evidence/lumiere-sway-5e60732.html?dev=garden-resume-after-lumiere`. Generated page has 32 syntactically valid scripts and 40 source hashes checked against that exact runtime. Transient G3-only ON/OFF control passed isolated admission/toggle tests; this is not a browser/device test.

After opening, choose 「確認位置へ」, then 正面／背面／左／右 and 「揺れ：ON/OFF」. Keep each direction visible for about 10.4 seconds. OFF retains the same continuous whole-body hover and same rendering density; ON adds only localized terminal motion. Independent Reviewer found no technical blocker for Draft/device review. Final integration remains STOP/PENDING until required exact-build human evidence exists.

## GitHub validation handoff

GitHub Validate TAROT BREAKER 2D passed on the Phase 2 candidate. The first merge-gate run captured the old Phase 1 PR-body runtime SHA before metadata was updated, and correctly rejected changed runtime files. PR #130 now declares the Phase 2 runtime SHA above; this evidence-only follow-up triggers a fresh gate with synchronized metadata. Required real-device evidence is still absent and must keep the merge gate blocked. No guard, registry, historical PASS or production file is changed to bypass it.

