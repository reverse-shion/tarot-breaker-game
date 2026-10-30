# First manifestation pacing — 2026-10-30

SCOPE: EVENT_SANDBOX / caritas-heart-resonance
RISK: HIGH (visual timing and isolated invocation sound)
DEVICE_GATE_REQUIRED: YES
DEVICE_RESULT: PENDING
MAIN_MERGE: PROHIBITED

## Approved contract

Current main: `6e05dabe164e3e2bac27faf8a4a91d323f3f8939`.
Parent: PR #200 `ff5b6fe93ac2286559e1eeb773aca88de673faf9`.
Branch: `fix/caritas-transformation-scale-20261030` (existing unmerged PR #200).
User explicitly requested implementing the proposed 4.6-second first manifestation, including gathering, opaque cocoon, deliberate reveal, settling and quiet hold.

WORKING: owner-atlas draw/timing, invocation-only audio lifecycle, event wait, script cache keys, focused tests and this document. Source images remain byte-identical. Existing preflight target is NOT TESTED / productionEnabled false; no verified contract is reopened.
LOCKED: main, shared audio.js and dialogue, camera, movement/collision, scene transitions, routes, battle mechanics, save/progress, dev preview storage isolation, all original assets and historical device evidence. VGC-001..007 unchanged. No unresolved product decision.

| Time | Treatment |
| --- | --- |
| 0–500ms | Exact native map Shiopon and original size |
| 500–1400ms | Gold/violet stars converge; cocoon fades in; native actor fades only at 1200–1400ms |
| 1400–2100ms | Cocoon closed; all size/centre interpolation finishes by 2050ms |
| 2100–3200ms | Face and body emerge across atlas frames 7–9, with smooth light transitions and fixed body size/feet |
| 3200–3800ms | Light settles, sparse particles drift down and one foot ring expands |
| 3800–4600ms | Quiet final pose, no extra moving particles; original Shioriel line begins only after the full wait |

The 12 original image cells are retained; the generated fox cells are never displayed. Source spans remain Shiopon 109px, Shioriel crown-to-sole 113px excluding horn/ears/wings. Adjacent frames dissolve over 140–280ms rather than stretching low-frame-rate poses. No face/body size interpolation after appearance. Reduced-motion mode limits added particle displacement; no screen flash/shake/zoom.

Audio: dedicated optional Web Audio context only for this invocation. Low harmonic gathering at 0.5–1.4s, an intentional gap, one bell chord at 2.1s decaying by 3.27s; silent afterward. Respects shared BGM-enabled preference without changing it or the shared audio implementation. Called from the existing dialogue gesture, gracefully optional if context is unavailable. Invocation pause/resume suspends its own audio clock; clear/reveal closes it and disconnects resources. Live mute closes the effect. No shared audio ownership, durable writes, new network asset or timer.

Acceptance: full 4600ms before dialogue, same clock under visibility/BFCache, native fox unchanged, no generated fox, opaque size adjustment, final body matches Shion, fixed feet and stable final geometry, no canvas alpha leak, audio pause/mute/unavailable/cleanup safe. Targeted runtime tests, full baseline suite, syntax and existing validators; independent review; raster render of real draw function at 60Hz. Physical iPhone Safari and actual listening are PENDING and required before merge. No automated render/CI result is a device PASS.

## Validation and review

- Current main baseline remains 536/536 PASS; immediate parent 654/654 PASS; final candidate 659/659 PASS, zero failures/skips.
- Targeted event, timing, geometry and sound lifecycle: 47/47 PASS. Assertions cover native sprite until light, Shion-equivalent body, all reveal-frame geometry fixed, final frame/source/alpha unchanged for every20ms of the800ms hold, synchronized total4600ms, offscreen composition without opacity dip, reusable buffer, audio gap/chord, suspend/resume/mute/clear and unavailable audio.
- Actual draw function rasterized with original images and map at60Hz:277 frames, no render exception or canvas alpha leak. Contact-sheet inspection performed. This is raster QA, not browser/device evidence.
- Independent read-only review found two visual issues (midpoint opacity dip and shortened final hold). Both repaired and re-reviewed: transparent160px premultiplied compositor, final dissolve3540–3800ms, static frame11 through4600ms. No remaining code blocker. Physical iPhone visual/audio gate remains PENDING.
- JavaScript syntax, existing assets/background/audio validators and diff checks PASS. Original assets unchanged. No main merge.
