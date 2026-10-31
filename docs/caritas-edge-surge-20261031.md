# Caritas outline invasion → approach surge

SCOPE: EVENT_SANDBOX
RISK: HIGH (Canvas visuals)
DEVICE_GATE_REQUIRED: YES
DEVICE_RESULT: PENDING
MAIN_MERGE: PROHIBITED

## Implementation contract
- Main baseline: 6e05dabe164e3e2bac27faf8a4a91d323f3f8939.
- Prior preview: e55a89d228c98a347692808ce3a6c52f142455c0 (PR #200).
- Working: isolated Caritas Canvas effect, phase vocabulary and reset, preview cache tags, corresponding regression tests. The user-specified dialogue, voluntary approach, Shion warning, target-facing chant, safe paths and transformation are already implemented in the prior preview and retained.
- Locked: main, original sprites, shared dialogue UI, audio, camera/navigation/collision, production routes and Progress/Save, battle calculations, transformation sequence/assets.
- No unresolved product decision. Deliver branch preview only, no main merge.

## Behavior
- edge: cache the current Caritas blink sprite's alpha silhouette at 2x display resolution, subtract an eroded interior, paint only the remaining inner edge. Object-fit contain and exact map rectangle match the existing DOM sprite. No cloud in this phase.
- surge: begins after the voluntary-approach speech, together with the existing walk. A linear 400ms ramp darkens the silhouette and expands continuous overlapping black-violet Canvas plumes across the front.
- engulfed: retains full coverage through tarot deployment and transformation.
- cleared: removes rim and smoke immediately on victory. Recovery/retreat resets edge with zero smoke.
- Same world coordinates and camera transform as the original effect. Two blink images cache separately; no image pixel reads or original asset changes.

## Validation
- event-preflight: PASS, target caritas-heart-resonance remains NOT TESTED / productionEnabled false.
- Latest main: 536/536 regression tests PASS.
- Prior preview: 680/680 PASS. Candidate: 680/680 PASS (external fetch rejected in both via a temporary test preload; per-test mock fetches still run).
- Focused manifestation/event-flow: 44/44 PASS. Existing real-map safe-path tests retained in full suite.
- JS syntax, asset/background/audio validators and git diff --check PASS.
- Incremental diff reviewed independently; no code defect reported. Full historical sandbox is not newly certified by this correction.
- Browser visual verification unavailable: Playwright browser is absent and browser download failed (invalid ZIP response). No screenshot, browser rendering PASS or real iPhone Safari PASS is claimed.
- Device checks pending: edge readability/alignment at portrait scale, strong 0.4s change on approach, engulfing at tarot declaration, movement/facing, victory cleanup, retreat/retry.

Current-main comparison: all changed runtime files belong to the pre-existing isolated sandbox and are absent from main. Main and all existing shared files remain unchanged.
