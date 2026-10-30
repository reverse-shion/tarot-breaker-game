# Caritas map transformation continuity — 2026-10-30

SCOPE: EVENT_SANDBOX / caritas-heart-resonance
RISK: HIGH (map visual layout)
DEVICE_GATE_REQUIRED: YES
DEVICE_RESULT: PENDING
MAIN_MERGE: PROHIBITED

## Implementation contract

Current main: `6e05dabe164e3e2bac27faf8a4a91d323f3f8939`.
Parent candidate: PR #199 at `68fcaf456343cf04b7f67b4db59baedf7c3ea046`.
Working branch: `fix/caritas-transformation-scale-20261030`.
Preflight: PASS, target NOT TESTED / productionEnabled false.

Goal: preserve native map Shiopon's perceived size at invocation; match Shioriel's body stature to map Shion. User authorized size correction or an alternative transition.

FACT: previous correction already matched overall visible height, but generated Shiopon differs in head/cloak silhouette. Shion source body y=60..480 is 420px; Shiopon y=215..480 is 265px. Counting Shioriel's horn/ears as body height makes its humanoid body appear smaller than Shion. Prior source span was 133px, including adornments.

WORKING: only owner-atlas manifestation draw, HTML runtime cache version, corresponding tests and this evidence. Keep native Shiopon through the opening; fade cocoon frame 4 over it from 700–1140ms, fade native actor only from 1000–1140ms. Generated fox frames 0–3 are not painted. Remaining original frame times, 3900ms event clock, original atlas bytes and final hold unchanged. Shioriel uses crown-to-sole source span y=32..145 (113px), excluding horn/ears/wings; its body matches Shion's measured visible height. This enlarges the final tile by 133/113 (17.7%) relative to parent. Foot anchor remains unchanged.

LOCKED: main, all original assets, shared map actor renderer, camera, movement, collision, dialogue, audio, story timing, battle core, save/progress, dev preview routing and historical device evidence. VGC-001 through VGC-007 remain untouched. No unresolved product decision.

Acceptance: exact native sprite/draw height until obscured; generated fox never appears; continuous cocoon geometry; Shioriel body matches Shion; fixed feet; no alpha leak; deterministic pause/resume/final hold; existing cleanup/isolation remain.

Required checks: current main and parent full regression baseline; candidate targeted and full regression; JavaScript syntax, asset/audio/background validators, diff check; independent diff review. Required device gate before merge: supplied opt-in preview, native Shiopon → cocoon → Shioriel beside Shion, no clipping or jump, final hold and map return. Real iPhone Safari remains PENDING; automated browser results are not device evidence.

## Validation evidence

- Current main baseline: 536/536 PASS; parent sandbox: 651/651 PASS; candidate: 654/654 PASS, zero failures/skips.
- Targeted manifestation/geometry checks: 15/15 PASS. Executed actual draw function with canvas-call recording: unchanged native sprite at opening, cocoon-only atlas source, fixed foot anchor, Shioriel body height, alpha restoration, deterministic suspended clock, final hold continuity.
- JS syntax, assets, background assets, audio validators and `git diff --check`: PASS.
- Independent read-only Reviewer: no code blocker found in actual incremental diff and current-main comparison; scope/offsets/alpha/geometry/tests checked. Merge review remains blocked by pending human device gate and CI. No historical device result changed.
- No automated browser or physical-device rendering PASS claimed for this correction.
