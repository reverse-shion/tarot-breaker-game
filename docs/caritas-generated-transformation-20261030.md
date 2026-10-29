# Generated on-map Shiopon transformation

## Implementation contract

- Main baseline inspected: `6e05dabe164e3e2bac27faf8a4a91d323f3f8939`.
- User-selected source: `4e8daf3db33d5bb2547746491109afaee623dad1`.
- Dedicated branch: `feature/caritas-generated-transform-20261030`.
- Risk: HIGH (mobile on-map visual rendering). Device result: PENDING.
- Target: EC-006 `hoshisuna-caritas` / `caritas-heart-resonance`, NOT TESTED, production disabled.
- WORKING: replace the existing procedural transformation with the user's generated 12-frame transparent pixel sheet, preload it, and update the isolated page cache version and visual contract tests.
- LOCKED: dialogue/UI, encounter triggers, walking/facing/pathfinding, battle/API/cut-ins, audio, Save/Progress, routes and VGC-001–007. No main merge authorized.
- Product decisions: the user explicitly requested this generated transformation at the exact source URL; no further product choice is required for this replacement.

## Rendering

The supplied PNG is copied byte-for-byte into `assets/events/hoshisuna/effects/shiopon-to-shioriel-12frames.png`: 1448×1086 RGBA, 4 columns × 3 rows, 362×362 cells. It is preloaded and dimension-validated before scene readiness.

The existing 3900ms active-clock lifecycle drives a single pass. The approved animated preview's frame durations (3910ms total) are proportionally mapped to this unchanged event window. The same world actor, camera and depth-mask path draw one cell with image smoothing disabled. A constant 96px cell size and cell foot y=344 retain the previous approximately 90px Shioriel body height and foot y+4. Cell 11 is held through the reveal dialogue and battle cover; no looping animated-image element or second character renderer is used. The existing `clear()` restores ordinary Shiopon before the returning overlay disappears.

## Automated evidence

- Entry preflight: `node scripts/event-preflight.cjs --target caritas-heart-resonance` PASS.
- Main: 536/536 tests PASS.
- User-selected source: 644/644 tests PASS.
- Candidate: 645/645 tests PASS, zero failures/skips.
- Targeted manifestation + real encounter harness: 33/33 PASS.
- JavaScript syntax, asset/background/audio validators and `git diff --check`: PASS.
- Replacement visual tests exercise all 12 source cells, final-frame clamping, world-foot registration, no image smoothing, paused-clock freeze, resume, idle/unloaded fallback. Existing encounter/walk/dialogue/3900ms/reset/return contracts remain covered.
- Source differs from main by the previously developed isolated Caritas feature. This task does not merge or rework that inherited feature.

## Remaining device evidence

No human device PASS is claimed. Use the new fixed-SHA `hoshisuna-main.html?dev=hoshisuna` URL, approach Caritas and choose 調べる. Verify the existing conversation and forward walk lead to one complete transformation, that the reveal dialogue holds the final form without clipping or a size jump, Home/background return resumes safely, and battle return restores ordinary Shiopon without an afterimage. Main merge remains unauthorized and pending applicable isolated/integration device gates.
