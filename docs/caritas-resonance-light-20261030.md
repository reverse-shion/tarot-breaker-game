# Caritas transformation: Shion resonance and broad heavenly light

SCOPE: EVENT_SANDBOX / caritas-heart-resonance
RISK: HIGH (isolated visual rendering)
DEVICE_GATE_REQUIRED: YES
DEVICE_RESULT: PENDING
MAIN_MERGE: PROHIBITED

Baseline main: 6e05dabe164e3e2bac27faf8a4a91d323f3f8939 (536 tests passed at this unchanged SHA).
Immediate parent: 2e22650f27724fdc483f3aecbd6d8718c1b4862d (663 tests passed).
Branch: fix/caritas-transformation-scale-20261030. Event preflight PASS.

Owner: thin light lacks impact; make transformation onset clear and illuminate Shion because the transformation is their resonance.

WORKING: invocation-only atmospheric light, Shion and native Shiopon sprite illumination, broader sky-star trails, map script cache key, focused tests. No new story decision. Shion leads at120ms, Shiopon responds at480ms, both share a slow light swell. Original800ms sky anticipation remains. Soft broad curtains descend800–1450ms and fade2350–2850ms. Illumination uses the exact current native sprite alpha at unchanged geometry; face/detail remains visible. Map dims by at most30% behind both characters. All added light ends by4700ms, preserving the800ms quiet pose and5500ms event/audio timing. No CSS animation or generated replacement character art.

LOCKED: main, camera/zoom, actual movement/companion following, collision, routes, dialogue, shared/local audio, event progression, battle, save/Progress, original image bytes, preview isolation, verified gameplay/device records. Existing Shiopon/Shioriel size and sole alignment preserved. Atmospheric curtains render in the world pass rather than an actor-sized foreground mask; tinted silhouettes remain in their actor mask.

Acceptance: Shion visibly initiates, Shiopon responds; sky light has volume rather than narrow lines; no camera/actor movement or size change; no full-screen white flash; exact shared pause clock; no effect in idle/revealed/ordinary map; no per-frame canvas allocation; cache reset with invocation cleanup; reduced motion keeps gradual glow without pulsation or traveling curtains. Relevant targeted/full regression, raster QA and independent review required. Physical iPhone visual acceptance remains pending; no main merge.

Validation: final668/668 full regression PASS, no failures/skips, with scratch external-network denial preload (no live API calls); targeted26/26 reviewer run PASS. Rasterized331 frames with original assets and inspected contact sheet; corrected an overly bright silhouette halo before final validation. Cached script assertions updated to the exact new v7 key, with no contract/test removed or relaxed. Existing geometry harness isolates the newly separately tested tint helper. Syntax and diff check PASS. Independent reviewer found no remaining code blocker; physical device gate remains PENDING. These are local/raster results, not physical Safari evidence.
