# Skyfall invocation — 2026-10-30

SCOPE: EVENT_SANDBOX / caritas-heart-resonance
RISK: HIGH (visual timing and isolated sound timing)
DEVICE_GATE_REQUIRED: YES
DEVICE_RESULT: PENDING
MAIN_MERGE: PROHIBITED

## Implementation contract

Current main: `6e05dabe164e3e2bac27faf8a4a91d323f3f8939`.
Parent PR #200: `a4f1caaf5749bec30981e71336778330df4c6c53`.
Branch: `fix/caritas-transformation-scale-20261030`.
Preflight: PASS; caritas-heart-resonance NOT TESTED / productionEnabled false.

Owner asks for a short anticipation at the start and light particles descending from the heavens onto Shiopon; no cheap CSS effect, optional sprite-sheet generation if needed.

WORKING: invocation-only skyfall rendering, source-atlas frame timings, event wait, local sound timing, cache keys, focused tests and this document. New particles are game-native Canvas sprite rendering; no CSS/DOM animation or image regeneration. A cached96x32 three-colour atlas of glowing four-point stars is rendered once in code. The existing transformation image bytes stay unchanged.
LOCKED: main, shared dialogue/audio, other maps/events, movement/collision, camera position/zoom, routes, battle/save/Progress, existing preview isolation, original image assets, historical device verification. VGC-001 through007 unchanged. No new product decision required.

| Time | Treatment |
| --- | --- |
| 0–800ms | Quiet anticipation, native Shiopon at unchanged size |
| 800–1900ms | Staggered stars descend from above the actual camera viewport, with tapered trails, converging onto Shiopon |
| 1900–2300ms | Cocoon forms as remaining stars feed it; native sprite fades only2100–2300ms |
| 2300–3000ms | Closed cocoon, size/centre interpolation finishes2950ms; last sky particles disappear by2650ms |
| 3000–4100ms | Fixed-size Shioriel appears, face readable |
| 4100–4700ms | Local light settles; final dissolve4440–4700ms |
| 4700–5500ms | Exact static final frame, then original dialogue |

Total5500ms synchronized in the map and event. Sky motion uses deterministic40 staggered paths; each starts above viewport top and travels strictly downward with its trail above it, narrowing onto the actor. No random sampling, secondary timer, CSS filter/transition or external asset fetch. Reduced motion uses stationary fading motes rather than moving trails. Cached star/blend buffers released on existing clear. Own-canvas alpha preserved. Sound timing follows rain at1.0–2.3s and reveal chord at3.0s, decaying by4.17s; existing sound lifecycle/mute handling retained.

Acceptance: anticipation visibly distinct; stars come from above, never a ground-up swirl; native Shiopon stays at original scale until hidden; final body/feet match the previously approved size correction; full800ms static hold; deterministic pause; safe camera-top adaptation in portrait/landscape; no per-frame canvas allocation or leaked alpha; no protected-system edits. Validate targeted/full baseline, actual raster frames, validators, independent review. Exact-SHA physical iPhone appearance and listening remain PENDING; no main merge.

## Evidence

- Current main SHA unchanged from prior baseline536/536 PASS; immediate parent a4f1caa has659/659 PASS from the preceding task.
- Final candidate663/663 PASS, no failures/skips; targeted51/51 PASS. Full suite ran with a scratch Node preload prohibiting external fetch/http/https (loopback fixtures allowed); API unit tests use mocked fetch and a dummy key. No external Gemini call was made or needed for this visual correction. Repository tests/validators were not changed for the preload.
- Actual original-image draw function rasterized331 frames at60Hz; contact sheet visually inspected, no render exception or leaked canvas alpha. This is raster QA, not a browser or physical-device PASS.
- Independent read-only review: no remaining code blocker. Reviewed source trajectories, layer/size continuity, alpha, cache reuse/clear, final hold, event/sound timing and isolation. One new reduced-motion test initially compared texture edge instead of star centre after increasing sprite size; corrected centre assertion and all tests pass.
- Syntax, existing image/background/audio validators, and diff-check PASS. CSS files and original image bytes unchanged. Real iPhone visual/audio check remains PENDING; main unmodified/unmerged.
